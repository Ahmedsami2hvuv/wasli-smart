import { NextRequest, NextResponse } from 'next/server';
import {
  buildAdminWhatsAppOtpMessage,
  generateOtpCode,
  getAdminTelegramLink,
  getAdminWhatsAppLink,
  normalizeIraqiPhone,
  toWhatsAppNumber,
} from '@/lib/merchantAuth';
import {
  findStoreByPhone,
  getStoreOtpMeta,
  saveStoreLoginOtp,
} from '@/lib/services/storeService';
import { sendAdminLoginRecoveryNotification } from '@/lib/telegram/vault';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = String(body.phone || '').trim();
    const normalized = normalizeIraqiPhone(phone);

    if (!normalized || normalized.length < 11) {
      return NextResponse.json(
        { success: false, message: 'يرجى إدخال رقم هاتف عراقي صحيح' },
        { status: 400 }
      );
    }

    const store = await findStoreByPhone(phone);

    // رسالة عامة حتى لا نكشف إن كان الرقم مسجلاً أم لا
    const genericSuccess = {
      success: true,
      message:
        'إذا كان الرقم مسجلاً لدينا، سيصلك رمز التأكيد عبر واتساب من الإدارة خلال دقائق. إن لم يصلك خلال 5 دقائق يمكنك طلب المساعدة من الأزرار بالأسفل.',
      waitSeconds: 300,
      support: {
        whatsapp: getAdminWhatsAppLink(),
        telegram: getAdminTelegramLink(),
      },
    };

    if (!store) {
      return NextResponse.json(genericSuccess);
    }

    const meta = await getStoreOtpMeta(store);
    if (meta.requestedAt) {
      const elapsed = Date.now() - new Date(meta.requestedAt).getTime();
      if (elapsed < 60 * 1000) {
        return NextResponse.json(
          {
            success: false,
            message: 'تم طلب رمز مؤخراً. يرجى الانتظار دقيقة واحدة ثم المحاولة مجدداً.',
            waitSeconds: Math.ceil((60 * 1000 - elapsed) / 1000),
          },
          { status: 429 }
        );
      }
    }

    const otpCode = generateOtpCode(6);
    await saveStoreLoginOtp(store, otpCode);

    const waNumber = toWhatsAppNumber(store.phone || phone);
    const waText = buildAdminWhatsAppOtpMessage(otpCode, store.name);
    const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;

    const notified = await sendAdminLoginRecoveryNotification({
      storeName: store.name,
      ownerName: store.ownerName,
      storeCode: store.code,
      phone: store.phone || phone,
      otpCode,
      whatsappUrl,
    });

    return NextResponse.json({
      ...genericSuccess,
      notified,
      storeHint: store.name,
    });
  } catch (err: any) {
    console.error('خطأ في طلب رمز الدخول:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'تعذر إرسال طلب الرمز' },
      { status: 500 }
    );
  }
}
