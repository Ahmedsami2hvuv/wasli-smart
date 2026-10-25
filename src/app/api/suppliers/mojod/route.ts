import { NextRequest, NextResponse } from 'next/server';
import { getMojodProducts, getMojodProductDetails, formatMojodImageUrl } from '@/lib/services/mojodService';
import { createPlatformProduct, findProductBySupplierCode } from '@/lib/services/productService';
import { publishProductToTelegramChannel } from '@/lib/telegram/vault';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 50;
    const search = searchParams.get('search') || '';
    const productId = searchParams.get('productId') || '';
    const fetchAll = searchParams.get('all') === 'true';

    if (productId) {
      const details = await getMojodProductDetails(productId);
      if (!details) {
        return NextResponse.json({ success: false, message: 'تعذر العثور على المنتج في سيرفر موجود' }, { status: 404 });
      }
      return NextResponse.json({ success: true, product: details });
    }

    // إذا طلب المستخدم جلب جميع المنتجات دفعة واحدة
    if (fetchAll) {
      let allProducts: any[] = [];
      let currentPage = 1;
      let totalPages = 1;
      let totalCount = 0;

      while (currentPage <= totalPages && currentPage <= 15) {
        const pageData = await getMojodProducts({ page: currentPage, limit: 100, search });
        if (!pageData || !pageData.products || pageData.products.length === 0) break;
        allProducts = allProducts.concat(pageData.products);
        totalPages = pageData.pages || 1;
        totalCount = pageData.total || allProducts.length;
        currentPage++;
      }

      return NextResponse.json({
        success: true,
        page: 1,
        limit: allProducts.length,
        total: totalCount,
        pages: 1,
        products: allProducts,
      });
    }

    const data = await getMojodProducts({ page, limit, search });
    if (!data) {
      return NextResponse.json({ success: false, message: 'تعذر الاتصال بسيرفر موجود' }, { status: 502 });
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
    const { products = [] } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ success: false, message: 'لم يتم تحديد أي منتجات للاستيراد' }, { status: 400 });
    }

    const imported: any[] = [];
    const skipped: any[] = [];
    const errors: any[] = [];

    for (const rawItem of products) {
      const code = String(rawItem._id || rawItem.id || rawItem.item_id).trim();
      if (!code) continue;

      try {
        // فحص ما إذا كان المنتج مسحوباً مسبقاً
        const existing = await findProductBySupplierCode(code);
        if (existing) {
          skipped.push({ code, name: existing.name, reason: 'مسحوب مسبقاً' });
          continue;
        }

        // جلب تفاصيل المنتج الدقيقة من سيرفر موجود الرسمي لضمان الحصول على أحدث الأسعار
        let item = rawItem;
        if (!item.lowPrice || !item.highPrice || !item.body) {
          const freshDetails = await getMojodProductDetails(code);
          if (freshDetails) item = freshDetails;
        }

        let name = (item.name || '').trim();
        if (!name && item.body) {
          const firstLine = item.body.split('\n')[0].replace(/[•\-*]/g, '').trim();
          name = firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
        }
        if (!name) name = `منتج موچود #${code}`;

        // 1. تكلفة المورد بالجملة من منصة موجود (مثال: 6000 د.ع)
        const supplierCost = Number(item.price) || 0;

        // 2. سعر جملة وصلي للتاجر = أقل سعر بيع سمحت به موجود (مثال: 12000 د.ع)
        const wholesalePrice = (item.lowPrice && Number(item.lowPrice) > supplierCost)
          ? Number(item.lowPrice)
          : (supplierCost > 0 ? supplierCost + 3000 : 10000);

        // 3. أقل سعر مسموح لبيع الزبون = سعر الجملة (12000 د.ع)
        const minPrice = wholesalePrice;

        // 4. أعلى سعر مسموح لبيع الزبون = الحد الأقصى الرسمي لمنصة موجود (مثال: 25000 د.ع)
        const maxPrice = (item.highPrice && Number(item.highPrice) >= wholesalePrice)
          ? Number(item.highPrice)
          : (wholesalePrice + 13000);

        // 5. السعر الافتراضي المقترح للزبون (في المنتصف وبشرط عدم تجاوز maxPrice إطلاقاً)
        let platformPrice = Math.round(((wholesalePrice + maxPrice) / 2) / 1000) * 1000;
        if (platformPrice > maxPrice) platformPrice = maxPrice;
        if (platformPrice < minPrice) platformPrice = minPrice;

        // تجهيز الصور بروابط كاملة
        let images: string[] = [];
        if (Array.isArray(item.img)) {
          images = item.img.map((im: string) => formatMojodImageUrl(im)).filter(Boolean);
        } else if (typeof item.img === 'string' && item.img) {
          images = [formatMojodImageUrl(item.img)];
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
          platformPriceIqd: platformPrice,
          minPriceIqd: minPrice,
          maxPriceIqd: maxPrice,
          supplierPriceIqd: supplierCost,
          supplierCode: code,
          supplierSource: 'mojod',
          stockQuantity: item.stockQuantity || 50,
          image: primaryImage,
          images: images,
        });

        // النشر التلقائي في قناة التليغرام للتجار
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
