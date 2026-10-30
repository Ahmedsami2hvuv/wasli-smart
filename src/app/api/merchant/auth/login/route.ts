import { NextRequest, NextResponse } from 'next/server';
import { normalizeIraqiPhone } from '@/lib/merchantAuth';
import {
  findStoreByPhone,
  findStoresByPhone,
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

      // نبحث في كل المتاجر المرتبطة بالرقم (حتى لو صار تكرار بالخطأ)
      // وندخل للحساب الذي يطابق رمز الدخول، مع تفضيل الحساب الأصلي
      const matches = await findStoresByPhone(phone);
      if (!matches.length) {
        return NextResponse.json(
          { success: false, message: 'رقم الهاتف أو رمز الدخول غير صحيح' },
          { status: 401 }
        );
      }

      let matchedStore = null as (typeof matches)[number] | null;
      for (const candidate of matches) {
        if (!candidate.hasLoginPin) continue;
        const ok = await verifyStoreLoginPin(candidate, pin);
        if (ok) {
          matchedStore = candidate;
          break;
        }
      }

      // إن لم يوجد تطابق بالرمز، جرّب الحساب الأساسي فقط لرسالة أوضح
      if (!matchedStore) {
        const primary = (await findStoreByPhone(phone)) || matches[0];
        if (!primary.hasLoginPin) {
          return NextResponse.json(
            {
              success: false,
              message: 'لم يتم تعيين رمز دخول لهذا المتجر بعد. استخدم نسيت الرمز لإنشاء رمز جديد.',
              needsPinSetup: true,
            },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { success: false, message: 'رقم الهاتف أو رمز الدخول غير صحيح' },
          { status: 401 }
        );
      }

      return NextResponse.json({ success: true, store: matchedStore });
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
