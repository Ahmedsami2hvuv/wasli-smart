import { NextRequest, NextResponse } from 'next/server';
import { createPlatformProduct, findProductBySupplierCode } from '@/lib/services/productService';
import { findOrCreateCategoryAndSubcategory } from '@/lib/services/categoryService';
import { publishProductToTelegramChannel, mirrorProductImageToVault } from '@/lib/telegram/vault';

// دعم طلبات CORS المسبقة للمتصفح وإضافة كروم
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// فحص ما إذا كان المنتج مسحوباً ومرفوعاً مسبقاً في منصة وصلي
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || searchParams.get('fedshiCode');

    if (!code) {
      return NextResponse.json(
        { exists: false, message: 'كود المنتج مطلوب' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          }
        }
      );
    }

    const found = await findProductBySupplierCode(code.trim());
    if (found) {
      return NextResponse.json(
        {
          exists: true,
          product: {
            id: found.id,
            name: found.name || found.title,
            wholesalePriceIqd: found.wholesalePriceIqd || found.wholesale_price,
            supplierCode: found.supplierCode || code,
          }
        },
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          }
        }
      );
    }

    return NextResponse.json(
      { exists: false },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { exists: false, error: err.message || 'حدث خطأ أثناء فحص المنتج' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        }
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      fedshiProfit,
      minSuggestedPrice,
      maxSuggestedPrice,
      wholesalePriceIqd: customWholesale,
      platformPriceIqd: customPlatform,
      minPriceIqd: customMin,
      maxPriceIqd: customMax,
      colors = [],
      images = [],
      videoUrl,
      description = '',
      promoDescription = '',
      specifications = '',
      category = 'عام',
      subcategory = '',
      categoryId,
      subcategoryId,
      stockQuantity = 50,
      supplierSource = 'fedshi',
    } = body;

    // استخراج موحد لكود المورد وتكلفته بأي تسمية مدعومة
    const actualSupplierCode = String(body.fedshiCode || body.supplierCode || body.code || '').trim();
    const actualSupplierSku = String(body.fedshiSku || body.supplierSku || body.sku || '').trim();
    const supplierCost = Number(body.fedshiPrice || body.supplierPriceIqd || body.supplierPrice || 0);

    if (!name || (!supplierCost && !customWholesale)) {
      return NextResponse.json(
        { success: false, message: 'بيانات المنتج الأساسية (الاسم وسعر المنتج) مطلوبة.' },
        { 
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // فحص ما إذا كان المنتج موجوداً مسبقاً بنفس كود المورد
    if (actualSupplierCode) {
      const existingProduct = await findProductBySupplierCode(actualSupplierCode);
      if (existingProduct) {
        // إذا كان المنتج موجوداً، نتأكد من إرساله/تحديثه في قناة تيليجرام
        const rawPrimaryImg = (images && images.length > 0) ? images[0] : (existingProduct.image || '/placeholder-product.svg');
        const rawImgsList = Array.isArray(images) && images.length > 0 ? images : [rawPrimaryImg];

        try {
          await publishProductToTelegramChannel({
            name: existingProduct.name || name,
            image: rawPrimaryImg,
            images: rawImgsList,
            wholesalePriceIqd: existingProduct.wholesalePriceIqd || customWholesale || 0,
            minPriceIqd: existingProduct.minPriceIqd || customMin || 0,
            maxPriceIqd: existingProduct.maxPriceIqd || customMax || 0,
            description: specifications || description || existingProduct.description || '',
            specifications: specifications || description || '',
            promoDescription: promoDescription || '',
            supplierCode: actualSupplierCode,
            category: category || 'عام',
            productId: existingProduct.id,
          });
        } catch (tgErr) {
          console.warn('تنبيه نشر تيليجرام للمنتج الموجود:', tgErr);
        }

        return NextResponse.json(
          {
            success: true,
            isExisting: true,
            message: 'المنتج مضاف مسبقاً وتم تحديثه ونشره بنجاح في منصة وصلي وتيليجرام',
            product: existingProduct,
            financials: {
              supplierCost: existingProduct.supplierPriceIqd || supplierCost,
              wholesalePrice: existingProduct.wholesalePriceIqd,
              minCustomerPrice: existingProduct.minPriceIqd,
              maxCustomerPrice: existingProduct.maxPriceIqd,
            }
          },
          {
            status: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        );
      }
    }

    // تطبيق المعادلة المالية المعتمدة لمنصة وصلي:
    // 1. سعر جملة وصلي للتاجر = أقل سعر بيع حددته منصة فدشي (minSuggestedPrice)
    // وبذلك يكون ربح المدير = (سعر جملة وصلي - تكلفة فدشي)
    const wholesalePrice = customWholesale 
      ? Number(customWholesale) 
      : (minSuggestedPrice ? Number(minSuggestedPrice) : (supplierCost > 0 ? supplierCost : 0));

    // 2. سعر المنصة الأساسي يطابق سعر جملة وصلي
    const platformPrice = customPlatform ? Number(customPlatform) : wholesalePrice;

    // 3. أقل سعر مسموح لبيع الزبون (حد التاجر الأدنى = سعر الجملة + 5,000 د.ع لضمان ربحه)
    const minPrice = customMin 
      ? Number(customMin) 
      : (wholesalePrice + 5000);

    // 4. الحد الأعلى المقترح لبيع الزبون (المأخوذ من فدشي)
    const maxPrice = customMax 
      ? Number(customMax) 
      : (maxSuggestedPrice && Number(maxSuggestedPrice) > minPrice 
          ? Number(maxSuggestedPrice) 
          : (wholesalePrice + 15000));

    // إنشاء أو جلب القسم والفرع تلقائياً
    let finalCategoryId = categoryId;
    let finalCategoryName = category;
    let finalSubcategoryId = subcategoryId;
    let finalSubcategoryName = subcategory;

    try {
      const catResult = await findOrCreateCategoryAndSubcategory(
        category || 'منتجات عامة',
        subcategory || undefined
      );
      finalCategoryId = catResult.categoryId;
      finalCategoryName = catResult.categoryName;
      finalSubcategoryId = catResult.subcategoryId;
      finalSubcategoryName = catResult.subcategoryName;
    } catch (catErr) {
      console.warn('تعذر إنشاء/ربط القسم آلياً:', catErr);
    }

    // الصورة الرئيسية وقائمة الصور الأولية للمنتج
    const rawPrimaryImage = (images && images.length > 0) 
      ? images[0] 
      : (colors && colors.length > 0 && colors[0].image ? colors[0].image : '/placeholder-product.svg');

    const rawImagesList = Array.isArray(images) && images.length > 0 
      ? images 
      : (rawPrimaryImage ? [rawPrimaryImage] : []);

    // 1. حفظ المنتج فوراً في النظام (فائق السرعة: 0.1 ثانية)
    const product = await createPlatformProduct({
      name,
      category: finalCategoryName,
      categoryId: finalCategoryId,
      subcategory: finalSubcategoryName,
      subcategoryId: finalSubcategoryId,
      description: specifications || description || name,
      shortDescription: promoDescription || '',
      promoDescription: promoDescription || '',
      specifications: specifications || description || '',
      wholesalePriceIqd: wholesalePrice,
      platformPriceIqd: platformPrice,
      minPriceIqd: minPrice,
      maxPriceIqd: maxPrice,
      supplierPriceIqd: supplierCost,
      supplierCode: actualSupplierCode,
      supplierSku: actualSupplierSku,
      supplierSource: supplierSource || 'fedshi',
      colors: colors,
      variants: colors.map((c: any, idx: number) => ({
        id: `variant-${idx}`,
        name: c.name,
        image: c.image,
        stock: c.stock || 20,
      })),
      videoUrl: videoUrl || '',
      stockQuantity: Number(stockQuantity) || 50,
      image: rawPrimaryImage,
      images: rawImagesList,
    });

    // 2. نشر المنتج في قناة تيليجرام وتحديث الصور بروابط المعاينة
    try {
      const telegramResult = await publishProductToTelegramChannel({
        name,
        image: rawPrimaryImage,
        images: rawImagesList,
        wholesalePriceIqd: wholesalePrice,
        minPriceIqd: minPrice,
        maxPriceIqd: maxPrice,
        description: specifications || description || '',
        specifications: specifications || description || '',
        promoDescription: promoDescription || '',
        supplierCode: actualSupplierCode || '',
        category: finalCategoryName,
        productId: product.id,
      });

      if (telegramResult && telegramResult.success && Array.isArray(telegramResult.proxyUrls) && telegramResult.proxyUrls.length > 0) {
        try {
          const { supabaseAdmin } = await import('@/lib/supabase/admin');
          if (supabaseAdmin) {
            await supabaseAdmin.from('products').update({
              images: telegramResult.proxyUrls,
              image: telegramResult.primaryProxyUrl || telegramResult.proxyUrls[0]
            }).eq('id', product.id);
          }
        } catch (updateErr) {
          console.warn('تعذر تحديث صور المنتج بروابط البروكسي:', updateErr);
        }
      }
    } catch (tgErr) {
      console.warn('تنبيه أثناء نشر تيليجرام:', tgErr);
    }

    const platformProfit = wholesalePrice - supplierCost;
    const merchantProfitRange = `${minPrice - wholesalePrice} - ${maxPrice - wholesalePrice}`;

    return NextResponse.json(
      { 
        success: true, 
        message: 'تم استيراد وحفظ منتج فدشي بنجاح في منصة وصلي',
        product,
        financials: {
          supplierCost,
          wholesalePrice,
          platformProfit,
          minCustomerPrice: minPrice,
          maxCustomerPrice: maxPrice,
          merchantProfitRange
        }
      },
      { 
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  } catch (error: any) {
    console.error('خطأ في استيراد منتج فدشي:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'حدث خطأ أثناء حفظ المنتج' },
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}
