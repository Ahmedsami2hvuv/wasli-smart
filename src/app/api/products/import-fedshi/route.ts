import { NextRequest, NextResponse } from 'next/server';
import { createPlatformProduct } from '@/lib/services/productService';
import { findOrCreateCategoryAndSubcategory } from '@/lib/services/categoryService';
import { publishProductToTelegramChannel } from '@/lib/telegram/vault';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      fedshiCode,
      fedshiSku,
      fedshiPrice,
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
    } = body;

    if (!name || (!fedshiPrice && !customWholesale)) {
      return NextResponse.json(
        { success: false, message: 'بيانات المنتج الأساسية (الاسم وسعر فدشي) مطلوبة.' },
        { 
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const supplierCost = Number(fedshiPrice || 0);

    // تطبيق المعادلة المالية الدقيقة لمنصة وصلي:
    // 1. ربح المنصة الثابت = 3,000 د.ع لكل منتج
    // 2. سعر جملة وصلي للمسوق = تكلفة فدشي + 3,000 د.ع
    const wholesalePrice = customWholesale 
      ? Number(customWholesale) 
      : (supplierCost > 0 ? (supplierCost + 3000) : (minSuggestedPrice ? Number(minSuggestedPrice) : 3000));

    // 3. سعر المنصة الأساسي يطابق سعر الجملة
    const platformPrice = customPlatform ? Number(customPlatform) : wholesalePrice;

    // 4. حدود بيع الزبون للمسوق:
    // الحد الأدنى المقترح: سعر الجملة + 10,000 د.ع (أو 80,000 د.ع في حال كان أعلى)
    const minPrice = customMin 
      ? Number(customMin) 
      : (minSuggestedPrice && Number(minSuggestedPrice) > wholesalePrice 
          ? Number(minSuggestedPrice) 
          : (wholesalePrice + 10000));

    // الحد الأعلى المقترح لبيع الزبون: يأتي مباشرة من فدشي، أو سعر الجملة + 20,000
    const maxPrice = customMax 
      ? Number(customMax) 
      : (maxSuggestedPrice && Number(maxSuggestedPrice) > minPrice 
          ? Number(maxSuggestedPrice) 
          : (wholesalePrice + 20000));

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

    // الصورة الرئيسية للمنتج
    const primaryImage = (images && images.length > 0) 
      ? images[0] 
      : (colors && colors.length > 0 && colors[0].image ? colors[0].image : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80');

    // حفظ المنتج في النظام
    const product = await createPlatformProduct({
      name,
      category: finalCategoryName,
      categoryId: finalCategoryId,
      subcategory: finalSubcategoryName,
      subcategoryId: finalSubcategoryId,
      description: description || promoDescription || name,
      promoDescription: promoDescription || description || name,
      specifications: specifications,
      wholesalePriceIqd: wholesalePrice,
      platformPriceIqd: platformPrice,
      minPriceIqd: minPrice,
      maxPriceIqd: maxPrice,
      supplierPriceIqd: supplierCost,
      supplierCode: fedshiCode || '',
      supplierSku: fedshiSku || '',
      supplierSource: 'fedshi',
      colors: colors,
      variants: colors.map((c: any, idx: number) => ({
        id: `variant-${idx}`,
        name: c.name,
        image: c.image,
        stock: c.stock || 20,
      })),
      videoUrl: videoUrl || '',
      stockQuantity: Number(stockQuantity) || 50,
      image: primaryImage,
      images: images,
    });

    const platformProfit = wholesalePrice - supplierCost;
    const merchantProfitRange = `${minPrice - wholesalePrice} - ${maxPrice - wholesalePrice}`;

    // نشر المنتج المستورد فوراً في قناة تيليجرام للمسوقين ككتلة صور مجمعة WebP
    let telegramResult = null;
    try {
      telegramResult = await publishProductToTelegramChannel({
        name: product.name,
        image: primaryImage,
        images: images && images.length > 0 ? images : [primaryImage],
        wholesalePriceIqd: wholesalePrice,
        minPriceIqd: minPrice,
        maxPriceIqd: maxPrice,
        promoDescription: promoDescription || description || name,
        specifications: specifications,
        supplierCode: fedshiCode || '',
        category: finalCategoryName,
        productId: product.id,
      });
    } catch (tgErr) {
      console.warn('تعذر النشر في تيليجرام:', tgErr);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'تم استيراد وحفظ منتج فدشي بنجاح في منصة وصلي',
        product,
        telegramBroadcast: telegramResult,
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
