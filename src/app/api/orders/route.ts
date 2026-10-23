import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getAllOrders, getStoreOrders } from '@/lib/services/orderService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createOrder(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('خطأ أثناء تقديم الطلب:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'حدث خطأ غير متوقع أثناء معالجة الطلب',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    const orders = storeId ? await getStoreOrders(storeId) : await getAllOrders();
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
