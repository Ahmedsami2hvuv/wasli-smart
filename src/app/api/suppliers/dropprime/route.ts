import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchAllDropPrimeProducts, 
  fetchDropPrimeProductDetails, 
  parseDropPrimeProduct 
} from '@/lib/services/dropPrimeService';
import { createPlatformProduct, findProductBySupplierCode } from '@/lib/services/productService';
import { findOrCreateCategoryAndSubcategory } from '@/lib/services/categoryService';
import { publishProductToTelegramChannel } from '@/lib/telegram/vault';

// جلب المنتجات المتاحة من دروب برايم
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const productId = searchParams.get('id') || searchParams.get('productId') || '';

    // إذا كان طلب منتج مفرد
    if (productId) {
      const details = await fetchDropPrimeProductDetails(productId);
      if (!details) {
        return NextResponse.json({ success: false, message: 'تعذر العثور على المنتج في دروب برايم' }, { status: 404 });
      }
      const parsed = parseDropPrimeProduct(details);
      return NextResponse.json({ success: true, product: parsed, raw: details });
    }

    // جلب قائمة المنتجات
    const all = await fetchAllDropPrimeProducts();
    let filtered = all;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = all.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.category?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    }

    const parsedList = filtered.map(parseDropPrimeProduct);

    return NextResponse.json({
      success: true,
      total: parsedList.length,
      products: parsedList,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// استيراد وحفظ المنتجات المحددة من دروب برايم دفعة واحدة
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
      const parsed = rawItem.supplierCost !== undefined 
        ? rawItem 
        : parseDropPrimeProduct(rawItem);

      const code = parsed.supplierCode;

      try {
        const existing = await findProductBySupplierCode(code);
        if (existing) {
          skipped.push({ code, name: parsed.name, reason: 'المنتج مضاف مسبقاً' });
          continue;
        }

        // ربط القسم آلياً
        let finalCatId: string | undefined = undefined;
        let finalCatName = parsed.category || 'منتجات عامة';
        try {
          const catRes = await findOrCreateCategoryAndSubcategory(finalCatName);
          finalCatId = catRes.categoryId;
          finalCatName = catRes.categoryName;
        } catch (e) {}

        // تحويل روابط الصور لروابط البروكسي الآمنة
        const safeImages = (parsed.images || [parsed.primaryImage]).map((u: string) => 
          `/api/images/proxy?url=${encodeURIComponent(u)}`
        );
        const safePrimary = safeImages[0] || `/api/images/proxy?url=${encodeURIComponent(parsed.primaryImage)}`;

        // إنشاء المنتج في المنصة
        const created = await createPlatformProduct({
          name: parsed.name,
          category: finalCatName,
          categoryId: finalCatId,
          description: parsed.specifications || parsed.name,
          shortDescription: parsed.promoDescription || '',
          promoDescription: parsed.promoDescription || '',
          specifications: parsed.specifications || '',
          wholesalePriceIqd: parsed.wholesalePrice,
          platformPriceIqd: parsed.wholesalePrice,
          minPriceIqd: parsed.minCustomerPrice,
          maxPriceIqd: parsed.maxCustomerPrice,
          supplierPriceIqd: parsed.supplierCost,
          supplierCode: code,
          supplierSku: parsed.supplierSku,
          supplierSource: 'dropprime',
          colors: (parsed.colors || []).map((c: string) => ({ name: c, image: safePrimary })),
          variants: parsed.variants || [],
          videoUrl: parsed.videoUrl || '',
          stockQuantity: parsed.stockQuantity || 50,
          image: safePrimary,
          images: safeImages,
        });

        // نشر المنتج في تيليجرام
        try {
          await publishProductToTelegramChannel({
            name: parsed.name,
            image: parsed.primaryImage,
            images: parsed.images,
            wholesalePriceIqd: parsed.wholesalePrice,
            minPriceIqd: parsed.minCustomerPrice,
            maxPriceIqd: parsed.maxCustomerPrice,
            description: parsed.specifications,
            specifications: parsed.specifications,
            promoDescription: parsed.promoDescription,
            supplierCode: code,
            category: finalCatName,
            productId: created.id,
          });
        } catch (tgErr) {
          console.warn('تنبيه أثناء نشر منتج دروب برايم في تيليجرام:', tgErr);
        }

        imported.push({ code, name: parsed.name, id: created.id });
      } catch (err: any) {
        errors.push({ code, name: parsed.name, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم استيراد ${imported.length} منتج بنجاح، وتخطي ${skipped.length} مضاف مسبقاً.`,
      summary: {
        importedCount: imported.length,
        skippedCount: skipped.length,
        errorsCount: errors.length,
        imported,
        skipped,
        errors,
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
