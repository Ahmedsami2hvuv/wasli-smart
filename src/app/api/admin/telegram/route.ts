import { NextRequest, NextResponse } from 'next/server';
import { getVaultBotToken, getVaultChannelId, publishProductToTelegramChannel } from '@/lib/telegram/vault';
import { getProductById } from '@/lib/services/productService';

export const dynamic = 'force-dynamic';

// متغيرات ذاكرة مؤقتة في السيرفر في حال تم إدخالها من لوحة التحكم قبل إضافتها في Vercel
let runtimeBotToken: string | null = null;
let runtimeChannelId: string | null = null;

// تنظيف وتجهيز معرف المحادثة أو القناة وحذف أي أحرف توجيه خفية من النسخ
function cleanTelegramChatId(input: string | number | null | undefined): string | number | null {
  if (!input) return null;
  if (typeof input === 'number') return input;
  let cleaned = input.replace(/[\u200E\u200F\u202A-\u202E\uFEFF]/g, '').trim();
  cleaned = cleaned.replace(/[\u2010-\u2015\u2212]/g, '-');
  if (/^-?\d+$/.test(cleaned)) {
    return Number(cleaned);
  }
  return cleaned;
}

function getActiveBotToken(): string | null {
  return runtimeBotToken || getVaultBotToken() || null;
}

function getActiveChannelId(): string | null {
  return runtimeChannelId || getVaultChannelId() || null;
}

export async function GET() {
  const token = getActiveBotToken();
  const channel = getActiveChannelId();

  if (!token) {
    return NextResponse.json({
      configured: false,
      botToken: '',
      channelId: channel || '',
      botInfo: null,
      message: 'رمز البوت (Bot Token) غير محدد بعد في إعدادات المنصة.',
    });
  }

  // فحص حالة البوت مع خوادم تيليجرام
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();

    if (data.ok) {
      return NextResponse.json({
        configured: true,
        botToken: token.slice(0, 8) + '...' + token.slice(-5),
        channelId: channel || '',
        botInfo: {
          id: data.result.id,
          name: data.result.first_name,
          username: data.result.username,
        },
        message: 'البوت متصل ويعمل بشكل سليم.',
      });
    } else {
      return NextResponse.json({
        configured: false,
        botToken: token.slice(0, 8) + '...',
        channelId: channel || '',
        botInfo: null,
        error: data.description || 'رمز البوت غير صالح.',
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      configured: false,
      error: 'تعذر الاتصال بخوادم تيليجرام: ' + err.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, botToken, channelId, testMessage, productId } = body;

    // تحديث التوكن والقناة في الذاكرة الحالية إذا تم إرسالها
    if (botToken && typeof botToken === 'string' && botToken.trim()) {
      runtimeBotToken = botToken.trim();
    }
    if (channelId && typeof channelId === 'string' && channelId.trim()) {
      runtimeChannelId = channelId.trim();
    }

    const currentToken = getActiveBotToken();
    const currentChannel = getActiveChannelId();

    // 0. تفعيل الرد التلقائي وزر start للبوت عبر الويب هوك
    if (action === 'setup_webhook') {
      if (!currentToken) {
        return NextResponse.json({ ok: false, error: 'يرجى إدخال رمز البوت أولاً.' }, { status: 400 });
      }

      const host = req.headers.get('host') || 'wasli-smart.vercel.app';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

      const hookRes = await fetch(`https://api.telegram.org/bot${currentToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      const hookData = await hookRes.json();

      if (hookData.ok) {
        return NextResponse.json({
          ok: true,
          message: 'تم تفعيل زر start والرد التلقائي للبوت بنجاح! افتح محادثة البوت واضغط start وسيرد عليك فوراً.',
          webhookUrl,
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: `تعذر تفعيل الويب هوك: ${hookData.description}`,
        }, { status: 400 });
      }
    }

    // 1. فحص الاتصال بالبوت فقط (getMe)
    if (action === 'test_bot') {
      if (!currentToken) {
        return NextResponse.json({ ok: false, error: 'يرجى إدخال رمز البوت (Bot Token) أولاً.' }, { status: 400 });
      }

      const res = await fetch(`https://api.telegram.org/bot${currentToken}/getMe`);
      const data = await res.json();

      if (data.ok) {
        return NextResponse.json({
          ok: true,
          message: `تم الاتصال بالبوت بنجاح: ${data.result.first_name} (@${data.result.username})`,
          bot: data.result,
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: `تيليجرام رفض الرمز: ${data.description || 'رمز غير صالح'}`,
        }, { status: 400 });
      }
    }

    // 2. اختبار القناة والتحقق من أن البوت مشرف
    if (action === 'check_channel') {
      if (!currentToken) {
        return NextResponse.json({ ok: false, error: 'يرجى إدخال رمز البوت أولاً.' }, { status: 400 });
      }
      if (!currentChannel) {
        return NextResponse.json({ ok: false, error: 'يرجى إدخال معرّف القناة أو رابطها أولاً.' }, { status: 400 });
      }

      // جلب معلومات القناة
      const targetChatId = cleanTelegramChatId(currentChannel);
      const chatRes = await fetch(`https://api.telegram.org/bot${currentToken}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: targetChatId }),
      });
      const chatData = await chatRes.json();

      if (!chatData.ok) {
        return NextResponse.json({
          ok: false,
          error: `تعذر الوصول للقناة (${currentChannel}): ${chatData.description}. تأكد أن البوت تمت إضافته للقناة مشرفاً.`,
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        message: `تم العثور على القناة: "${chatData.result.title}" بنجاح. البوت لديه صلاحية الوصول.`,
        chat: chatData.result,
      });
    }

    // 3. تجربة نشر منشور تجريبي في القناة (Test Post)
    if (action === 'test_post') {
      if (!currentToken || !currentChannel) {
        return NextResponse.json({
          ok: false,
          error: 'يرجى إدخال رمز البوت ومعرّف القناة قبل إجراء اختبار النشر.',
        }, { status: 400 });
      }

      const sampleCaption = [
        'تجربة نشر ناجحة من منصة وصلي',
        '==============================',
        'هذا اختبار للتأكد من ربط بوت تيليجرام بالقناة بنجاح.',
        'سيبدأ البوت بنشر المنتجات الجديدة تلقائياً فور استيرادها.',
        '------------------------------',
        `تاريخ الفحص: ${new Date().toLocaleString('ar-IQ')}`,
        'منصة وصلي للتجارة الذكية والدروب شيبينغ في العراق.',
      ].join('\n');

      const sampleImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&auto=format&fit=crop&q=80';

      const targetChatId = cleanTelegramChatId(currentChannel);
      const postRes = await fetch(`https://api.telegram.org/bot${currentToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          photo: sampleImage,
          caption: sampleCaption,
        }),
      });

      const postData = await postRes.json();

      if (postData.ok) {
        return NextResponse.json({
          ok: true,
          message: 'تم إرسال المنشور التجريبي إلى قناتك في تيليجرام بنجاح! تفقد القناة الآن.',
          messageId: postData.result.message_id,
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: `فشل النشر في القناة: ${postData.description}. يرجى التأكد من إضافة البوت كمشرف في القناة ولديه إذن نشر الرسائل (Post Messages).`,
        }, { status: 400 });
      }
    }

    // 4. تجربة نشر منتج حقيقي موجود في المنصة
    if (action === 'post_product' && productId) {
      if (!currentToken || !currentChannel) {
        return NextResponse.json({
          ok: false,
          error: 'إعدادات البوت أو القناة غير مكتملة.',
        }, { status: 400 });
      }

      // جلب بيانات المنتج
      const product = await getProductById(productId);

      if (!product) {
        return NextResponse.json({ ok: false, error: 'لم يتم العثور على المنتج المطلوب.' }, { status: 404 });
      }

      const productImages = product.images && product.images.length > 0 
        ? product.images.map((img: any) => typeof img === 'string' ? img : img.localUrl || img.url)
        : [product.image];

      const result = await publishProductToTelegramChannel({
        name: product.name,
        image: productImages[0],
        wholesalePriceIqd: product.wholesalePriceIqd || product.priceIqd || 0,
        minPriceIqd: product.minPriceIqd || product.priceIqd || 0,
        maxPriceIqd: product.maxPriceIqd || ((product.priceIqd || 0) * 1.3),
        promoDescription: product.promoDescription || product.description,
        specifications: Array.isArray(product.specifications) ? product.specifications.join('\n') : product.specifications,
        supplierCode: product.supplierCode,
        category: product.category,
        productId: product.id,
      });

      if (result.success) {
        return NextResponse.json({
          ok: true,
          message: `تم نشر المنتج "${product.name}" في قناة تيليجرام بنجاح!`,
          messageId: result.messageId,
        });
      } else {
        return NextResponse.json({
          ok: false,
          error: `تعذر النشر: ${result.error || 'حدث خطأ غير متوقع'}`,
        }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: false, error: 'إجراء غير معروف.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
