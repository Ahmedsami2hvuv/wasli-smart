import { NextRequest, NextResponse } from 'next/server';
import { getOrderByIdOrNumber, updateOrderStatus } from '@/lib/services/orderService';
import { OrderStatus } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getOrderByIdOrNumber(params.id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'الطلب غير موجود' }, { status: 404 });
    }
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, message: 'حالة الطلب مطلوبة' }, { status: 400 });
    }

    const updated = await updateOrderStatus(params.id, status as OrderStatus);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'تعذر العثور على الطلب لتحديثه' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم تحديث حالة الطلب بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
