import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/services/productService';
import { getAllStores } from '@/lib/services/storeService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

// مخزن مؤقت لأسعار منتجات المتاجر أثناء التشغيل السريع
const localStoreProductPrices: Record<string, Record<string, { sellingPrice: number; isActive: boolean }>> = {};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeCode = searchParams.get('storeCode');
    const storeId = searchParams.get('storeId');
    const forCustomer = searchParams.get('forCustomer') === 'true';

    const identifier = (storeCode || storeId || '').toLowerCase().trim();
    const allProducts = await getAllProducts();

    if (!identifier) {
      return NextResponse.json({ success: true, products: allProducts });
    }

    // جلب بيانات المتجر لمعرفة إعدادات أسعاره المخصصة
    const stores = await getAllStores();
    const store = stores.find(
      s => s.code?.toLowerCase() === identifier || s.slug?.toLowerCase() === identifier || s.id === identifier
    );

    let customPrices: Record<string, { sellingPrice: number; isActive: boolean }> = {};

    // 1. فحص التخزين المحلي في الذاكرة
    const storeKey = store?.code || identifier;
    if (localStoreProductPrices[storeKey]) {
      customPrices = { ...localStoreProductPrices[storeKey] };
    }

    // 2. فحص سوبابيس إذا كان متاحاً
    const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
    if (activeSupabase && store?.id) {
      try {
        const { data: storeData } = await activeSupabase
          .from('stores')
          .select('settings')
          .eq('id', store.id)
          .maybeSingle();

        if (storeData?.settings?.custom_product_prices) {
          customPrices = {
            ...customPrices,
            ...storeData.settings.custom_product_prices,
          };
        }

        // فحص جدول store_products إن وجد
        const { data: spRows } = await activeSupabase
          .from('store_products')
          .select('product_id, selling_price, is_active')
          .eq('store_id', store.id);

        if (spRows && spRows.length > 0) {
          spRows.forEach((row: any) => {
            if (row.product_id) {
              customPrices[row.product_id] = {
                sellingPrice: Number(row.selling_price),
                isActive: row.is_active !== false,
              };
            }
          });
        }
      } catch (dbErr) {
        console.warn('تعذر قراءة أسعار المتجر من سوبابيس:', dbErr);
      }
    }

    // دمج الأسعار المخصصة مع المنتجات
    let mergedProducts = allProducts.map(product => {
      const custom = customPrices[product.id];
      const basePlatformPrice = product.platformPriceIqd || product.priceIqd || 10000;
      const minPrice = product.minPriceIqd || (basePlatformPrice + 5000);
      const maxPrice = product.maxPriceIqd || (basePlatformPrice + 20000);
      
      // سعر البيع الافتراضي لمتجر التاجر = سعر الجملة + 10,000 د.ع (ليكون ربح التاجر الافتراضي 10,000 د.ع)
      const defaultSellingPrice = Math.min(maxPrice, Math.max(minPrice, basePlatformPrice + 10000));
      const rawSelling = custom && custom.sellingPrice ? Number(custom.sellingPrice) : defaultSellingPrice;
      // التأكد من أن سعر التاجر لا يقل عن الحد الأدنى المسموح (ربح 5,000 د.ع) ولا يزيد عن الحد الأقصى
      const sellingPrice = Math.max(minPrice, Math.min(maxPrice, rawSelling));
      const isActive = custom && custom.isActive !== undefined ? custom.isActive : true;
      const merchantProfit = Math.max(0, sellingPrice - basePlatformPrice);

      return {
        ...product,
        priceIqd: sellingPrice,
        sellingPrice: sellingPrice,
        defaultSellingPrice: defaultSellingPrice,
        platformPriceIqd: basePlatformPrice,
        minPriceIqd: minPrice,
        maxPriceIqd: maxPrice,
        merchantProfit: merchantProfit,
        isActive: isActive,
        isCustomized: !!custom,
      };
    });

    // إذا كان الطلب من زبون يزور المتجر، نستبعد المنتجات غير النشطة
    if (forCustomer) {
      mergedProducts = mergedProducts.filter(p => p.isActive !== false);
    }

    return NextResponse.json({
      success: true,
      store: store ? { id: store.id, code: store.code, name: store.name } : null,
      products: mergedProducts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, storeCode, productId, sellingPrice, isActive } = body;

    const identifier = (storeCode || storeId || '').toLowerCase().trim();
    if (!identifier || !productId) {
      return NextResponse.json({ success: false, message: 'معرف المتجر والمنتج مطلوبان' }, { status: 400 });
    }

    const stores = await getAllStores();
    const store = stores.find(
      s => s.code?.toLowerCase() === identifier || s.slug?.toLowerCase() === identifier || s.id === identifier
    );

    const storeKey = store?.code || identifier;
    if (!localStoreProductPrices[storeKey]) {
      localStoreProductPrices[storeKey] = {};
    }

    const allProds = await getAllProducts();
    const targetProduct = allProds.find(p => p.id === productId);
    const minAllowed = targetProduct?.minPriceIqd || ((targetProduct?.platformPriceIqd || 10000) + 5000);
    const maxAllowed = targetProduct?.maxPriceIqd || (minAllowed + 25000);

    const prevSetting = localStoreProductPrices[storeKey][productId] || { sellingPrice: 0, isActive: true };
    let newPrice = sellingPrice !== undefined ? Number(sellingPrice) : prevSetting.sellingPrice;
    
    // ضمان عدم نزول سعر التاجر عن الحد الأدنى (ربح 5,000 د.ع على الأقل)
    if (newPrice > 0 && newPrice < minAllowed) {
      newPrice = minAllowed;
    }
    if (newPrice > maxAllowed) {
      newPrice = maxAllowed;
    }
    const newActive = isActive !== undefined ? Boolean(isActive) : prevSetting.isActive;

    localStoreProductPrices[storeKey][productId] = {
      sellingPrice: newPrice,
      isActive: newActive,
    };

    // التحديث في Supabase إن كان متاحاً
    const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
    if (activeSupabase && store?.id) {
      try {
        // جلب الإعدادات الحالية للمتجر
        const { data: currentStoreData } = await activeSupabase
          .from('stores')
          .select('settings')
          .eq('id', store.id)
          .maybeSingle();

        const currentSettings = currentStoreData?.settings || {};
        const updatedCustomPrices = {
          ...(currentSettings.custom_product_prices || {}),
          [productId]: {
            sellingPrice: newPrice,
            isActive: newActive,
          },
        };

        await activeSupabase
          .from('stores')
          .update({
            settings: {
              ...currentSettings,
              custom_product_prices: updatedCustomPrices,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', store.id);

        // محاولة التحديث في جدول store_products إن كان متوافقاً
        try {
          if (!store.id.startsWith('store-') && !productId.startsWith('mock-')) {
            await activeSupabase
              .from('store_products')
              .upsert({
                store_id: store.id,
                product_id: productId,
                selling_price: newPrice,
                is_active: newActive,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'store_id,product_id' });
          }
        } catch (spErr) {
          // تم الحفظ في settings بنجاح
        }
      } catch (dbErr) {
        console.warn('تم حفظ سعر المنتج في الذاكرة المؤقتة:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث سعر وحالة المنتج في متجرك بنجاح',
      customPrice: {
        productId,
        sellingPrice: newPrice,
        isActive: newActive,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}
