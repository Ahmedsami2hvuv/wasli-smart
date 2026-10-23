import { NextRequest, NextResponse } from 'next/server';
import { getAllStores, createNewStore } from '@/lib/services/storeService';

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
    const { name, phone, city, description } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, message: 'اسم المتجر ورقم الهاتف مطلوبان' }, { status: 400 });
    }

    const store = await createNewStore({
      name,
      phone,
      city,
      description,
    });

    return NextResponse.json({ success: true, store }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
