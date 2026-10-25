import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getAllOrders, getStoreOrders, deleteOrders } from '@/lib/services/orderService';

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

export async function DELETE(request: NextRequest) {
  try {
    let idsToDelete: string[] = [];
    
    // محاولة قراءة المعرفات من الرابط (Query Params)
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (idParam) {
      idsToDelete.push(idParam);
    } else if (idsParam) {
      idsToDelete = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    }

    // محاولة قراءة المعرفات من جسم الطلب (JSON Body) إن وجدت
    try {
      const body = await request.json();
      if (body && Array.isArray(body.ids)) {
        idsToDelete = [...idsToDelete, ...body.ids];
      } else if (body && Array.isArray(body.orderIds)) {
        idsToDelete = [...idsToDelete, ...body.orderIds];
      } else if (body && body.id) {
        idsToDelete.push(body.id);
      }
    } catch (e) {
      // الجسم قد يكون فارغاً إذا اعتمد على Query Params
    }

    // إزالة التكرارات
    const uniqueIds = Array.from(new Set(idsToDelete.filter(Boolean)));

    if (uniqueIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'يرجى تزويد معرف الطلب أو قائمة معرفات الطلبات المطلوب حذفها',
      }, { status: 400 });
    }

    const ok = await deleteOrders(uniqueIds);
    return NextResponse.json({
      success: ok,
      deletedCount: uniqueIds.length,
      message: ok ? `تم حذف ${uniqueIds.length} طلب بنجاح` : 'تعذر إتمام عملية الحذف',
    });

  } catch (error: any) {
    console.error('خطأ في مسار حذف الطلبات:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'حدث خطأ أثناء محاولة حذف الطلبات',
    }, { status: 500 });
  }
}
