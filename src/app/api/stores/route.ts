import { NextRequest, NextResponse } from 'next/server';
import { getAllStores, createNewStore, updateStore } from '@/lib/services/storeService';

export async function GET() {
  try {
    const stores = await getAllStores();
    return NextResponse.json({ success: true, stores });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, city, description, ownerName } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ success: false, message: 'اسم المتجر ورقم الهاتف مطلوبان' }, { status: 400 });
    }

    const store = await createNewStore({
      name: name.trim(),
      ownerName: ownerName?.trim() || '',
      phone: phone.trim(),
      city: city?.trim() || 'البصرة',
      description: description?.trim() || '',
    });

    return NextResponse.json({ success: true, store }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, code, ...updates } = body;

    const identifier = id || code;
    if (!identifier) {
      return NextResponse.json({ success: false, message: 'معرف المتجر أو كود المتجر مطلوب' }, { status: 400 });
    }

    const updated = await updateStore(identifier, updates);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'لم يتم العثور على المتجر المطلوب' }, { status: 404 });
    }

    return NextResponse.json({ success: true, store: updated, message: 'تم تحديث بيانات المتجر بنجاح' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'حدث خطأ أثناء تعديل المتجر' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}
