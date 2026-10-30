import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProducts,
  getProductsCount,
  getProductsLeanPaginated,
} from '@/lib/services/productService';
import { getAllStores } from '@/lib/services/storeService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

// مخزن مؤقت لأسعار منتجات المتاجر أثناء التشغيل السريع
const localStoreProductPrices: Record<string, Record<string, { sellingPrice: number; isActive: boolean }>> = {};

type CustomPrice = { sellingPrice: number; isActive: boolean };

function mergeProductWithCustomPrices(product: any, customPrices: Record<string, CustomPrice>) {
  const custom = customPrices[product.id];
  const basePlatformPrice = product.platformPriceIqd || product.priceIqd || 10000;
  const minPrice = product.minPriceIqd || (basePlatformPrice + 5000);
  const maxPrice = product.maxPriceIqd || (basePlatformPrice + 20000);

  const defaultSellingPrice = Math.min(maxPrice, Math.max(minPrice, basePlatformPrice + 10000));
  const rawSelling = custom && custom.sellingPrice ? Number(custom.sellingPrice) : defaultSellingPrice;
  const sellingPrice = Math.max(minPrice, Math.min(maxPrice, rawSelling));
  const isActive = custom && custom.isActive !== undefined ? custom.isActive : true;
  const merchantProfit = Math.max(0, sellingPrice - basePlatformPrice);

  return {
    ...product,
    priceIqd: sellingPrice,
    sellingPrice,
    defaultSellingPrice,
    platformPriceIqd: basePlatformPrice,
    minPriceIqd: minPrice,
    maxPriceIqd: maxPrice,
    merchantProfit,
    isActive,
    isCustomized: !!custom,
  };
}

function toLeanMerchantProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    image: product.image,
    platformPriceIqd: product.platformPriceIqd,
    priceIqd: product.priceIqd,
    wholesalePriceIqd: product.wholesalePriceIqd,
    minPriceIqd: product.minPriceIqd,
    maxPriceIqd: product.maxPriceIqd,
    sellingPrice: product.sellingPrice,
    defaultSellingPrice: product.defaultSellingPrice,
    merchantProfit: product.merchantProfit,
    isActive: product.isActive,
    isCustomized: product.isCustomized,
  };
}

async function loadStoreCustomPrices(
  store: { id?: string; code?: string } | null | undefined,
  identifier: string
): Promise<Record<string, CustomPrice>> {
  let customPrices: Record<string, CustomPrice> = {};
  const storeKey = store?.code || identifier;

  if (localStoreProductPrices[storeKey]) {
    customPrices = { ...localStoreProductPrices[storeKey] };
  }

  const activeSupabase =
    isSupabaseAdminConfigured && supabaseAdmin
      ? supabaseAdmin
      : isSupabaseConfigured
        ? supabase
        : null;

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

  return customPrices;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeCode = searchParams.get('storeCode');
    const storeId = searchParams.get('storeId');
    const forCustomer = searchParams.get('forCustomer') === 'true';
    const lean = searchParams.get('lean') === '1' || searchParams.get('lean') === 'true';
    const summary = searchParams.get('summary') === '1' || searchParams.get('summary') === 'true';
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || 'all') as 'all' | 'active' | 'hidden';
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const usePagination = lean || pageParam !== null || limitParam !== null || summary;

    const identifier = (storeCode || storeId || '').toLowerCase().trim();

    // بدون متجر: السلوك القديم (للوحة المدير وغيرها)
    if (!identifier) {
      if (summary) {
        const total = await getProductsCount();
        return NextResponse.json({
          success: true,
          total,
          activeCount: total,
          hiddenCount: 0,
          products: [],
        });
      }
      if (usePagination) {
        const result = await getProductsLeanPaginated({
          page: pageParam ? Number(pageParam) : 1,
          limit: limitParam ? Number(limitParam) : 12,
          search: q || undefined,
        });
        return NextResponse.json({
          success: true,
          ...result,
          products: lean ? result.products.map(toLeanMerchantProduct) : result.products,
        });
      }
      const allProducts = await getAllProducts();
      return NextResponse.json({ success: true, products: allProducts });
    }

    const stores = await getAllStores();
    const store = stores.find(
      s => s.code?.toLowerCase() === identifier || s.slug?.toLowerCase() === identifier || s.id === identifier
    );

    const customPrices = await loadStoreCustomPrices(store, identifier);
    const hiddenIds = Object.entries(customPrices)
      .filter(([, v]) => v.isActive === false)
      .map(([id]) => id);
    const hiddenCount = hiddenIds.length;

    // ملخص سريع لفتح لوحة التاجر بدون جلب المنتجات
    if (summary) {
      const total = await getProductsCount();
      return NextResponse.json({
        success: true,
        store: store ? { id: store.id, code: store.code, name: store.name } : null,
        total,
        activeCount: Math.max(0, total - hiddenCount),
        hiddenCount,
        products: [],
      });
    }

    // مسار خفيف للوحة التاجر: صفحات + حقول مختصرة فقط
    if (usePagination || lean) {
      const page = Math.max(1, Number(pageParam) || 1);
      const limit = Math.max(1, Math.min(100, Number(limitParam) || 12));

      let result;
      if (status === 'hidden') {
        if (hiddenIds.length === 0) {
          result = { products: [] as any[], total: 0, page, limit, totalPages: 1 };
        } else {
          result = await getProductsLeanPaginated({
            page,
            limit,
            search: q || undefined,
            ids: hiddenIds,
          });
        }
      } else {
        result = await getProductsLeanPaginated({
          page,
          limit,
          search: q || undefined,
        });
        if (status === 'active' && hiddenIds.length > 0) {
          const hiddenSet = new Set(hiddenIds);
          result = {
            ...result,
            products: result.products.filter(p => !hiddenSet.has(p.id)),
          };
        }
      }

      let merged = result.products.map(p => mergeProductWithCustomPrices(p, customPrices));
      if (forCustomer) {
        merged = merged.filter(p => p.isActive !== false);
      }

      const totalAll = await getProductsCount();
      const filteredTotal =
        status === 'hidden'
          ? hiddenCount
          : status === 'active'
            ? Math.max(0, totalAll - hiddenCount)
            : result.total;
      const totalPages = Math.max(1, Math.ceil(filteredTotal / limit) || result.totalPages);

      return NextResponse.json({
        success: true,
        store: store ? { id: store.id, code: store.code, name: store.name } : null,
        products: lean ? merged.map(toLeanMerchantProduct) : merged,
        page: result.page,
        limit: result.limit,
        total: filteredTotal,
        totalPages,
        totalAll,
        activeCount: Math.max(0, totalAll - hiddenCount),
        hiddenCount,
      });
    }

    // المسار الكامل (متجر الزبون / التوافق مع الطلبات القديمة)
    const allProducts = await getAllProducts();
    let mergedProducts = allProducts.map(product => mergeProductWithCustomPrices(product, customPrices));

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
