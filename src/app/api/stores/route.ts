import { NextRequest, NextResponse } from 'next/server';
import {
  getAllStores,
  createNewStore,
  updateStore,
  deleteStore,
  findStoreByPhone,
  PhoneAlreadyExistsError,
} from '@/lib/services/storeService';
import {
  getIraqiPhoneValidationMessage,
  isValidIraqiMobilePhone,
  toIraqiLocalPhone,
} from '@/lib/merchantAuth';

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
    const { name, phone, city, description, ownerName, payoutMethod, payoutDetails, loginPin } = body;

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ success: false, message: 'اسم المتجر ورقم الهاتف مطلوبان' }, { status: 400 });
    }

    if (!city?.trim()) {
      return NextResponse.json({ success: false, message: 'يرجى اختيار المحافظة' }, { status: 400 });
    }

    const phoneError = getIraqiPhoneValidationMessage(phone);
    if (phoneError || !isValidIraqiMobilePhone(phone)) {
      return NextResponse.json(
        { success: false, message: phoneError || 'يرجى إدخال رقم موبايل عراقي صحيح من 11 رقماً يبدأ بـ 07' },
        { status: 400 }
      );
    }
    const normalizedPhone = toIraqiLocalPhone(phone);

    if (!loginPin || String(loginPin).trim().length < 4) {
      return NextResponse.json(
        { success: false, message: 'يرجى إنشاء رمز دخول من 4 خانات على الأقل لحماية حسابك' },
        { status: 400 }
      );
    }

    // منع إنشاء حساب جديد برقم هاتف مسجّل مسبقاً (بكل صيغ الرقم)
    const existingByPhone = await findStoreByPhone(normalizedPhone);
    if (existingByPhone) {
      return NextResponse.json(
        {
          success: false,
          code: 'PHONE_EXISTS',
          phoneExists: true,
          message:
            'هذا الرقم مسجّل مسبقاً ولديه حساب تاجر. سجّل الدخول برقمك ورمز الدخول، أو استخدم خيار نسيت رمز الدخول إذا نسيته.',
          existingStoreName: existingByPhone.name,
        },
        { status: 409 }
      );
    }

    try {
      const store = await createNewStore({
        name: name.trim(),
        ownerName: ownerName?.trim() || '',
        phone: normalizedPhone,
        city: city.trim(),
        description: description?.trim() || '',
        payoutMethod,
        payoutDetails,
        loginPin: String(loginPin).trim(),
      });

      return NextResponse.json({ success: true, store }, { status: 201 });
    } catch (createErr: any) {
      if (createErr instanceof PhoneAlreadyExistsError || createErr?.name === 'PhoneAlreadyExistsError' || createErr?.message === 'PHONE_EXISTS') {
        const existing = createErr.existingStore || (await findStoreByPhone(normalizedPhone));
        return NextResponse.json(
          {
            success: false,
            code: 'PHONE_EXISTS',
            phoneExists: true,
            message:
              'هذا الرقم مسجّل مسبقاً ولديه حساب تاجر. سجّل الدخول برقمك ورمز الدخول، أو استخدم خيار نسيت رمز الدخول إذا نسيته.',
            existingStoreName: existing?.name,
          },
          { status: 409 }
        );
      }
      throw createErr;
    }
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
    if (error instanceof PhoneAlreadyExistsError || error?.name === 'PhoneAlreadyExistsError' || error?.message === 'PHONE_EXISTS') {
      return NextResponse.json(
        {
          success: false,
          code: 'PHONE_EXISTS',
          message: 'لا يمكن استخدام هذا الرقم لأنه مرتبط بمتجر تاجر آخر.',
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: error.message || 'حدث خطأ أثناء تعديل المتجر' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('code');

    if (!id) {
      return NextResponse.json({ success: false, message: 'معرف المتجر مطلوب' }, { status: 400 });
    }

    const success = await deleteStore(id);
    return NextResponse.json({ success, message: success ? 'تم حذف المتجر بنجاح' : 'تعذر حذف المتجر' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'خطأ أثناء حذف المتجر' }, { status: 500 });
  }
}
