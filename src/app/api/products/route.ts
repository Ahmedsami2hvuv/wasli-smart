import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts, createPlatformProduct } from '@/lib/services/productService';

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
      image: image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80',
      brand,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
