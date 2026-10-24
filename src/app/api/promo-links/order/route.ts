import { NextRequest, NextResponse } from 'next/server';
import { recordLinkOrder } from '@/lib/services/promoLinkService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeCode, productId, orderNumber, customerName, customerPhone, customerCity, quantity, totalPrice } = body;

    if (!storeCode || !productId || !orderNumber) {
      return NextResponse.json({ success: false, message: 'بيانات الطلب غير مكتملة' }, { status: 400 });
    }

    const recorded = await recordLinkOrder({
      storeCode,
      productId,
      orderNumber,
      customerName: customerName || 'زبون',
      customerPhone: customerPhone || '',
      customerCity: customerCity || 'العراق',
      quantity: Number(quantity || 1),
      totalPrice: Number(totalPrice || 0),
    });

    return NextResponse.json({ success: true, recorded });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
