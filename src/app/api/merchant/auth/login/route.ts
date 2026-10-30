import { NextRequest, NextResponse } from 'next/server';
import { normalizeIraqiPhone } from '@/lib/merchantAuth';
import {
  findStoreByPhone,
  getStoreBySlugOrCode,
  getAllStores,
  verifyStoreLoginPin,
} from '@/lib/services/storeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = String(body.phone || '').trim();
    const pin = String(body.pin || body.loginPin || '').trim();
    const storeCode = String(body.storeCode || body.code || '').trim();

    // دخول برقم الهاتف + رمز الدخول
    if (phone && pin) {
      if (!normalizeIraqiPhone(phone)) {
        return NextResponse.json(
          { success: false, message: 'رقم الهاتف غير صالح' },
          { status: 400 }
        );
      }

      const store = await findStoreByPhone(phone);
      if (!store) {
        return NextResponse.json(
          { success: false, message: 'رقم الهاتف أو رمز الدخول غير صحيح' },
          { status: 401 }
        );
      }

      if (!store.hasLoginPin) {
        return NextResponse.json(
          {
            success: false,
            message: 'لم يتم تعيين رمز دخول لهذا المتجر بعد. استخدم نسيت الرمز لإنشاء رمز جديد، أو ادخل برابط المتجر إن كان متاحاً.',
            needsPinSetup: true,
          },
          { status: 403 }
        );
      }

      const ok = await verifyStoreLoginPin(store, pin);
      if (!ok) {
        return NextResponse.json(
          { success: false, message: 'رقم الهاتف أو رمز الدخول غير صحيح' },
          { status: 401 }
        );
      }

      return NextResponse.json({ success: true, store });
    }

    // توافق قديم: دخول بالكود/الرابط فقط للمتاجر بدون رمز دخول
    if (storeCode) {
      let store = await getStoreBySlugOrCode(storeCode);
      if (!store) {
        const all = await getAllStores();
        const lower = storeCode.toLowerCase();
        store =
          all.find(
            (s) =>
              (s.code || '').toLowerCase() === lower ||
              (s.slug || '').toLowerCase() === lower ||
              (s.phone || '') === storeCode ||
              (s.name || '').toLowerCase() === lower
          ) || null;
      }

      if (!store) {
        return NextResponse.json(
          { success: false, message: 'لم يتم العثور على متجر مطابق' },
          { status: 404 }
        );
      }

      if (store.hasLoginPin && !pin) {
        return NextResponse.json(
          {
            success: false,
            message: 'هذا المتجر محمي برمز دخول. أدخل رقم الهاتف ورمز الدخول.',
            requiresPin: true,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, store });
    }

    return NextResponse.json(
      { success: false, message: 'يرجى إدخال رقم الهاتف ورمز الدخول' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('خطأ في دخول التاجر:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'تعذر تسجيل الدخول' },
      { status: 500 }
    );
  }
}