import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, createPlatformProduct, updatePlatformProduct, deleteOrArchiveProduct } from '@/lib/services/productService';

export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ success: true, products });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'معرف المنتج مطلوب للحذف' }, { status: 400 });
    }

    const ok = await deleteOrArchiveProduct(id);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
