import { NextRequest, NextResponse } from 'next/server';
import { normalizeIraqiPhone, validatePinFormat } from '@/lib/merchantAuth';
import {
  findStoreByPhone,
  setStoreLoginPin,
  verifyPinResetToken,
  verifyStoreLoginPin,
} from '@/lib/services/storeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = String(body.phone || '').trim();
    const newPin = String(body.newPin || body.pin || '').trim();
    const recoveryToken = String(body.recoveryToken || '').trim();
    const currentPin = String(body.currentPin || '').trim();

    const pinError = validatePinFormat(newPin);
    if (pinError) {
      return NextResponse.json({ success: false, message: pinError }, { status: 400 });
    }

    const store = await findStoreByPhone(phone);
    if (!store || !normalizeIraqiPhone(phone)) {
      return NextResponse.json(
        { success: false, message: 'لم يتم العثور على المتجر لهذا الرقم' },
        { status: 404 }
      );
    }

    let authorized = false;
    if (recoveryToken) {
      authorized = await verifyPinResetToken(store, recoveryToken);
    } else if (currentPin) {
      authorized = await verifyStoreLoginPin(store, currentPin);
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, message: 'غير مصرح بتغيير رمز الدخول. أعد التحقق من الرمز أولاً.' },
        { status: 403 }
      );
    }

    const updated = await setStoreLoginPin(store, newPin);

    return NextResponse.json({
      success: true,
      message: 'تم حفظ رمز الدخول بنجاح. احتفظ به في مكان آمن.',
      store: updated,
    });
  } catch (err: any) {
    console.error('خطأ في حفظ رمز الدخول:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'تعذر حفظ رمز الدخول' },
      { status: 500 }
    );
  }
}
