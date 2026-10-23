import { NextRequest, NextResponse } from 'next/server';
import { createPlatformProduct } from '@/lib/services/productService';

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
      categoryId,
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

    // تطبيق معادلة الأسعار والأرباح الذكية لمنصة وصلي:
    // 1. سعر الجملة لمسوق وصلي = الحد الأدنى المقترح في فدشي (أو التكلفة + 18,000 د.ع)
    const wholesalePrice = customWholesale 
      ? Number(customWholesale) 
      : (minSuggestedPrice ? Number(minSuggestedPrice) : (supplierCost + 18000));

    // 2. سعر المنصة الأساسي
    const platformPrice = customPlatform ? Number(customPlatform) : wholesalePrice;

    // 3. سعر بيع الزبون النهائي لمسوق وصلي (بين 45,000 و 55,000 د.ع أو حسب التخصيص)
    const minPrice = customMin 
      ? Number(customMin) 
      : Math.max(wholesalePrice + 10000, 45000);

    const maxPrice = customMax 
      ? Number(customMax) 
      : (maxSuggestedPrice ? Number(maxSuggestedPrice) : Math.max(minPrice + 10000, 55000));

    // الصورة الرئيسية للمنتج
    const primaryImage = (images && images.length > 0) 
      ? images[0] 
      : (colors && colors.length > 0 && colors[0].image ? colors[0].image : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80');

    // حفظ المنتج في النظام
    const product = await createPlatformProduct({
      name,
      category,
      categoryId,
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
