import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllProducts, 
  getProductsPaginated, 
  createPlatformProduct, 
  updatePlatformProduct, 
  deleteOrArchiveProduct, 
  deleteProducts,
  deleteAllProducts,
  fixLowProfitProducts,
  findDuplicateProductGroups
} from '@/lib/services/productService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const duplicates = searchParams.get('duplicates');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const search = searchParams.get('search');
    const paginated = searchParams.get('paginated');

    // إذا طلب فحص وكشف المنتجات المتشابهة والمكررة
    if (duplicates === 'true') {
      const all = await getAllProducts();
      const groups = findDuplicateProductGroups(all);
      const totalDuplicates = groups.reduce((acc, g) => acc + g.products.length, 0);
      return NextResponse.json({
        success: true,
        totalGroups: groups.length,
        totalDuplicates,
        groups,
      });
    }

    // إذا طلب تقسيم الصفحات، نجلب بالصفحة فقط (افتراضياً 20 منتج)
    if (page || limit || paginated === 'true') {
      const pageNum = parseInt(page || '1', 10) || 1;
      const limitNum = parseInt(limit || '20', 10) || 20;
      const result = await getProductsPaginated({
        page: pageNum,
        limit: limitNum,
        search: search || undefined,
      });
      return NextResponse.json({ success: true, ...result });
    }

    const products = await getAllProducts();
    return NextResponse.json({ success: true, products, total: products.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      categoryId,
      subcategory,
      subcategoryId,
      description,
      shortDescription,
      wholesalePriceIqd,
      platformPriceIqd,
      minPriceIqd,
      maxPriceIqd,
      stockQuantity,
      image,
      brand,
    } = body;

    if (!name || !wholesalePriceIqd || !platformPriceIqd || !minPriceIqd || !maxPriceIqd) {
      return NextResponse.json({ success: false, message: 'يرجى إكمال جميع حقول الأسعار والبيانات الأساسية' }, { status: 400 });
    }

    const product = await createPlatformProduct({
      name,
      category: category || 'عام',
      categoryId,
      subcategory,
      subcategoryId,
      description: description || name,
      shortDescription,
      wholesalePriceIqd: Number(wholesalePriceIqd),
      platformPriceIqd: Number(platformPriceIqd),
      minPriceIqd: Number(minPriceIqd),
      maxPriceIqd: Number(maxPriceIqd),
      stockQuantity: Number(stockQuantity || 100),
      image: image || '/placeholder-product.svg',
      brand,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // خيار معالجة وتصحيح كافة أرباح المنتجات دفعة واحدة لتصبح 3000 د.ع أو أكثر
    if (body.action === 'fix_low_profits') {
      const minProfit = Number(body.minProfit) || 3000;
      const result = await fixLowProfitProducts(minProfit);
      return NextResponse.json({ success: true, ...result });
    }

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'معرف المنتج مطلوب للتعديل' }, { status: 400 });
    }

    const updated = await updatePlatformProduct(id, updates);
    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let ids: string[] = [];
    let deleteAll = false;

    // 1. محاولة قراءة المعرفات من جسم الطلب JSON
    try {
      const body = await request.json();
      if (body.all === true || body.deleteAll === true) {
        deleteAll = true;
      } else if (Array.isArray(body.ids)) {
        ids = body.ids.map((id: any) => String(id).trim()).filter(Boolean);
      } else if (body.id) {
        ids = [String(body.id).trim()];
      }
    } catch {
      // ليس JSON أو فارغ
    }

    // 2. إذا لم تكن في البودي، نقرأ من الرابط (Query Params)
    if (!deleteAll && ids.length === 0) {
      const { searchParams } = new URL(request.url);
      if (searchParams.get('all') === 'true') {
        deleteAll = true;
      } else {
        const singleId = searchParams.get('id');
        const rawIds = searchParams.get('ids');

        if (rawIds) {
          ids = rawIds.split(',').map(s => s.trim()).filter(Boolean);
        } else if (singleId) {
          ids = [singleId.trim()];
        }
      }
    }

    if (deleteAll) {
      const ok = await deleteAllProducts();
      return NextResponse.json({ success: ok, message: 'تم حذف كافة منتجات المنصة بنجاح' });
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: 'معرف أو معرفات المنتجات مطلوبة للحذف' }, { status: 400 });
    }

    const ok = await deleteProducts(ids);
    return NextResponse.json({ success: ok, count: ids.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
