import { NextRequest, NextResponse } from 'next/server';
import { normalizeIraqiPhone } from '@/lib/merchantAuth';
import {
  findStoreByPhone,
  issuePinResetToken,
  verifyStoreLoginOtp,
} from '@/lib/services/storeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = String(body.phone || '').trim();
    const otpCode = String(body.otpCode || body.otp || '').trim();

    if (!normalizeIraqiPhone(phone) || otpCode.length < 4) {
      return NextResponse.json(
        { success: false, message: 'يرجى إدخال رقم الهاتف ورمز التأكيد بشكل صحيح' },
        { status: 400 }
      );
    }

    const store = await findStoreByPhone(phone);
    if (!store) {
      return NextResponse.json(
        { success: false, message: 'رمز التأكيد غير صحيح أو منتهٍ' },
        { status: 400 }
      );
    }

    const valid = await verifyStoreLoginOtp(store, otpCode);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: 'رمز التأكيد غير صحيح أو منتهٍ. اطلب رمزاً جديداً.' },
        { status: 400 }
      );
    }

    const recoveryToken = await issuePinResetToken(store);

    return NextResponse.json({
      success: true,
      message: 'تم التحقق بنجاح. احفظ رمز دخولك أو غيّره الآن.',
      recoveryToken,
      store,
      hasLoginPin: Boolean(store.hasLoginPin),
    });
  } catch (err: any) {
    console.error('خطأ في التحقق من رمز الدخول:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'تعذر التحقق من الرمز' },
      { status: 500 }
    );
  }
}
