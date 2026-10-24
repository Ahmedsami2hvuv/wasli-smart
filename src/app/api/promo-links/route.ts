import { NextRequest, NextResponse } from 'next/server';
import { 
  getPromoLinksByStore, 
  getPromoLink, 
  savePromoLink 
} from '@/lib/services/promoLinkService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeCode = searchParams.get('storeCode');
    const productId = searchParams.get('productId');

    if (storeCode && productId) {
      const link = await getPromoLink(storeCode, productId);
      return NextResponse.json({ success: true, link });
    }

    if (storeCode) {
      const links = await getPromoLinksByStore(storeCode);
      return NextResponse.json({ success: true, links });
    }

    return NextResponse.json({ success: false, message: 'معرف المتجر مفقود' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeCode, storeName, productId, productName, productImage, sellingPrice, wholesalePrice, youtubeUrl } = body;

    if (!storeCode || !productId || !sellingPrice) {
      return NextResponse.json({ success: false, message: 'بيانات الرابط غير مكتملة' }, { status: 400 });
    }

    const saved = await savePromoLink({
      storeCode,
      storeName,
      productId,
      productName,
      productImage,
      sellingPrice: Number(sellingPrice),
      wholesalePrice: Number(wholesalePrice || 0),
      youtubeUrl: youtubeUrl || '',
    });

    return NextResponse.json({ success: true, link: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
