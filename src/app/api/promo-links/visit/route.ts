import { NextRequest, NextResponse } from 'next/server';
import { recordLinkVisit } from '@/lib/services/promoLinkService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeCode, productId } = body;

    if (!storeCode || !productId) {
      return NextResponse.json({ success: false, message: 'المعلومات غير مكتملة' }, { status: 400 });
    }

    const visits = await recordLinkVisit(storeCode, productId);
    return NextResponse.json({ success: true, visits });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
