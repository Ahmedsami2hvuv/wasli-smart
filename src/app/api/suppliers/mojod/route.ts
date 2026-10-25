import { NextRequest, NextResponse } from 'next/server';
import { getMojodProducts, getMojodProductDetails, DEFAULT_MOJOD_TOKEN } from '@/lib/services/mojodService';
import { createPlatformProduct, findProductBySupplierCode } from '@/lib/services/productService';
import { publishProductToTelegramChannel } from '@/lib/telegram/vault';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || DEFAULT_MOJOD_TOKEN;
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 24;
    const search = searchParams.get('search') || '';
    const productId = searchParams.get('productId') || '';

    if (productId) {
      const details = await getMojodProductDetails(productId, token);
      if (!details) {
        return NextResponse.json({ success: false, message: 'تعذر العثور على المنتج في موجود' }, { status: 404 });
      }
      return NextResponse.json({ success: true, product: details });
    }

    const data = await getMojodProducts({ token, page, limit, search });
    if (!data) {
      return NextResponse.json({ success: false, message: 'تعذر جلب المنتجات من سيرفر موجود' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      page: data.page,
      limit: data.limit,
      total: data.total,
      pages: data.pages,
      products: data.products,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products = [], token = DEFAULT_MOJOD_TOKEN } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ success: false, message: 'لم يتم تحديد أي منتجات للاستيراد' }, { status: 400 });
    }

    const imported: any[] = [];
    const skipped: any[] = [];
    const errors: any[] = [];

    for (const item of products) {
      const code = String(item._id || item.id || item.item_id).trim();
      if (!code) continue;

      try {
        // فحص ما إذا كان المنتج مسحوباً مسبقاً
        const existing = await findProductBySupplierCode(code);
        if (existing) {
          skipped.push({ code, name: existing.name, reason: 'مسحوب مسبقاً' });
          continue;
        }

        // استخراج اسم المنتج بذكاء: إذا لم يوجد اسم صريح نأخذ أول سطر من الوصف
        let name = (item.name || '').trim();
        if (!name && item.body) {
          const firstLine = item.body.split('\n')[0].replace(/[•\-*]/g, '').trim();
          name = firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
        }
        if (!name) name = `منتج رقم ${code}`;

        const rawPrice = Number(item.price) || 10000;
        
        // حساب المعادلة المالية الذكية لمنصة وصلي:
        // سعر الجملة في موجود (تكلفة المنتج على المنصة)
        const supplierCost = Math.round(rawPrice * 0.7); // تقريبي إذا كان price هو سعر بيع التاجر
        const wholesalePrice = rawPrice; // سعر جملة وصلي للتاجر
        const minPrice = wholesalePrice + 5000; // حد التاجر الأدنى للبيع
        const maxPrice = wholesalePrice + 15000; // حد البيع الأعلى المقترح

        let images: string[] = [];
        if (Array.isArray(item.img)) {
          images = item.img.filter(Boolean);
        } else if (typeof item.img === 'string' && item.img) {
          images = [item.img];
        } else if (item.image) {
          images = [item.image];
        }
        const primaryImage = images[0] || '/placeholder-product.svg';
        const description = (item.body || item.description || name).trim();
        const promoDescription = (item.post_body || item.promoDescription || '').trim();

        const created = await createPlatformProduct({
          name,
          category: 'عام',
          description: description,
          shortDescription: promoDescription || description.slice(0, 100),
          promoDescription: promoDescription,
          specifications: description,
          wholesalePriceIqd: wholesalePrice,
          platformPriceIqd: wholesalePrice,
          minPriceIqd: minPrice,
          maxPriceIqd: maxPrice,
          supplierPriceIqd: supplierCost,
          supplierCode: code,
          supplierSource: 'mojod',
          stockQuantity: 50,
          image: primaryImage,
          images: images,
        });

        // النشر التلقائي في قناة التليغرام
        try {
          await publishProductToTelegramChannel({
            name: created.name,
            image: primaryImage,
            images: images,
            wholesalePriceIqd: wholesalePrice,
            minPriceIqd: minPrice,
            maxPriceIqd: maxPrice,
            description: description,
            promoDescription: promoDescription,
            supplierCode: code,
            category: 'عام',
            productId: created.id,
          });
        } catch (tgErr) {
          console.warn('تعذر النشر في تليغرام للمنتج المستورد:', code, tgErr);
        }

        imported.push({ id: created.id, code, name: created.name });
      } catch (itemErr: any) {
        errors.push({ code, error: itemErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      errorsCount: errors.length,
      imported,
      skipped,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
