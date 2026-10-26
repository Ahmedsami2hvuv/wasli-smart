import { NextRequest, NextResponse } from 'next/server';
import { getCustomersByStore, saveOrUpdateCustomer } from '@/lib/services/customerService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || '';
    const storeCode = searchParams.get('storeCode') || '';

    const customers = await getCustomersByStore(storeId, storeCode);

    return NextResponse.json({
      success: true,
      customers,
      count: customers.length,
    });
  } catch (error: any) {
    console.error('خطأ في جلب زبائن التاجر:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء جلب قائمة الزبائن', error: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, storeCode, name, phone, phone2, governorate, city, address, notes } = body;

    if (!name || !phone || !governorate || !address) {
      return NextResponse.json(
        { success: false, message: 'يرجى إكمال جميع الحقول الإلزامية (الاسم، الهاتف، المحافظة، العنوان)' },
        { status: 400 }
      );
    }

    const result = await saveOrUpdateCustomer({
      storeId,
      storeCode,
      name,
      phone,
      phone2,
      governorate,
      city: city || governorate,
      address,
      notes,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('خطأ في حفظ بيانات الزبون:', error);
    return NextResponse.json(
      { success: false, message: 'تعذر حفظ بيانات الزبون', error: error?.message },
      { status: 500 }
    );
  }
}
