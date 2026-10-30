import { NextRequest, NextResponse } from 'next/server';
import { getOrdersBotToken } from '@/lib/telegram/vault';
import { getStoreBySlugOrCode, getAllStores, updateStore } from '@/lib/services/storeService';

export const dynamic = 'force-dynamic';

function getPublicSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://wasli-smart.vercel.app').replace(/\/$/, '');
}

function buildMerchantLinks(store: {
  code?: string;
  name?: string;
  ownerName?: string;
  city?: string;
  phone?: string;
}) {
  const origin = getPublicSiteUrl();
  const code = store.code || '';
  const storeUrl = `${origin}/s/${code}?name=${encodeURIComponent(store.name || '')}`;
  const dashboardUrl =
    `${origin}/merchant?storeCode=${code}` +
    `&name=${encodeURIComponent(store.name || '')}` +
    `&owner=${encodeURIComponent(store.ownerName || '')}` +
    `&city=${encodeURIComponent(store.city || '')}` +
    `&phone=${encodeURIComponent(store.phone || '')}`;
  return { storeUrl, dashboardUrl };
}

function buildStoreLinksKeyboard(storeUrl: string, dashboardUrl: string) {
  return {
    inline_keyboard: [
      [{ text: 'رابط متجر التاجر (للزبائن)', url: storeUrl }],
      [{ text: 'رابط صفحة التاجر (الإدارة)', url: dashboardUrl }],
    ],
  };
}

async function sendBotMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  replyMarkup?: ReturnType<typeof buildStoreLinksKeyboard>
) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    if (update && update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = (message.text || '').trim();
      const firstName = message.from?.first_name || 'صديقنا التاجر';
      const username = message.from?.username || '';
      const botToken = getOrdersBotToken();

      if (!botToken) {
        return NextResponse.json({ ok: false, error: 'رمز بوت الطلبات غير محدد' }, { status: 500 });
      }

      if (text.startsWith('/start')) {
        const parts = text.split(/\s+/);
        const payload = parts.length > 1 ? parts[1].trim() : '';

        // استخراج كود المتجر من الرابط العميق (Deep Link Payload)
        const storeCode = payload.replace(/^store_/, '').trim();

        let matchedStore = null;
        if (storeCode) {
          matchedStore = await getStoreBySlugOrCode(storeCode);
        }

        if (matchedStore) {
          // تم التعرف على المتجر والتاجر! نقوم بربط الـ Chat ID وتحديث المتجر فوراً
          await updateStore(matchedStore.id, {
            telegramChatId: String(chatId),
            telegramUsername: username,
          });

          const { storeUrl, dashboardUrl } = buildMerchantLinks(matchedStore);

          const confirmationMessage = [
            `أهلاً وسهلاً بك يا ${firstName}!`,
            '==============================',
            `تم بنجاح ربط متجرك (${matchedStore.name}) بهذا الحساب!`,
            '------------------------------',
            `كود المتجر: ${matchedStore.code}`,
            `التاجر: ${matchedStore.ownerName || firstName}`,
            '------------------------------',
            'احفظ هذين الرابطين في هذه المحادثة دائماً:',
            '',
            'رابط متجر التاجر (للزبائن):',
            storeUrl,
            '',
            'رابط صفحة التاجر (لوحة الإدارة):',
            dashboardUrl,
            '------------------------------',
            'من الآن فصاعداً، ستصلك كافة إشعارات الطلبات الجديدة وتفاصيل مبيعاتك وأرباحك فور تسجيل أي طلب لمتجرك مباشرة هنا.',
            '==============================',
            'احفظ هذه الرسالة في مكان آمن، ولا تشارك رابط صفحة التاجر مع أحد.',
            'منصة وصلي الذكية تتمنى لك تجارة مباركة ومبيعات مضاعفة!'
          ].join('\n');

          await sendBotMessage(
            botToken,
            chatId,
            confirmationMessage,
            buildStoreLinksKeyboard(storeUrl, dashboardUrl)
          );
        } else {
          // لم يتم تمرير كود متجر، نتحقق إن كان هذا التاجر مرتبطاً مسبقاً بأي متجر
          const allStores = await getAllStores();
          const alreadyLinkedStore = allStores.find(
            s => s.telegramChatId === String(chatId) || (s as any).settings?.telegram_chat_id === String(chatId)
          );

          if (alreadyLinkedStore) {
            const { storeUrl, dashboardUrl } = buildMerchantLinks(alreadyLinkedStore);

            const linkedMsg = [
              `أهلاً بعودتك يا ${firstName}!`,
              '==============================',
              `حسابك مرتبط حالياً بمتجر: ${alreadyLinkedStore.name}`,
              `كود المتجر: ${alreadyLinkedStore.code}`,
              '------------------------------',
              'روابطك المحفوظة:',
              '',
              'رابط متجر التاجر (للزبائن):',
              storeUrl,
              '',
              'رابط صفحة التاجر (لوحة الإدارة):',
              dashboardUrl,
              '------------------------------',
              'البوت يعمل بصورة ممتازة وجاهز لتسليم إشعارات المبيعات والأرباح فور وصولها.',
              '=============================='
            ].join('\n');

            await sendBotMessage(
              botToken,
              chatId,
              linkedMsg,
              buildStoreLinksKeyboard(storeUrl, dashboardUrl)
            );
          } else {
            const welcomeMessage = [
              `أهلاً بك يا ${firstName} في بوت (إشعارات طلبات وصلي)`,
              '==============================',
              'البوت متصل بنجاح وهو المخصص لإرسال إشعارات الطلبات والمبيعات الفورية.',
              '',
              'لكي يتم ربط متجرك وتصلك إشعارات مبيعاتك وأرباحك تلقائياً مع حفظ روابطك:',
              '1. أكمل تسجيل متجرك، أو افتح صفحة التاجر.',
              '2. اضغط زر [احفظ روابطك وفعّل إشعارات التليكرام].',
              '3. سيتم فتح هذا البوت وربط المتجر فوراً وإرسال روابطك بضغطة واحدة!',
              '------------------------------',
              `معرف محادثتك الشخصي (Chat ID): ${chatId}`,
              '=============================='
            ].join('\n');

            await sendBotMessage(botToken, chatId, welcomeMessage);
          }
        }
      } else if (text === '/status' || text === 'الحالة') {
        const allStores = await getAllStores();
        const alreadyLinkedStore = allStores.find(
          s => s.telegramChatId === String(chatId) || (s as any).settings?.telegram_chat_id === String(chatId)
        );

        if (alreadyLinkedStore) {
          const { storeUrl, dashboardUrl } = buildMerchantLinks(alreadyLinkedStore);
          const statusMsg = [
            `حالة الاتصال: نشط ومتصل بمتجر (${alreadyLinkedStore.name})`,
            `كود المتجر: ${alreadyLinkedStore.code}`,
            'تصلك كافة إشعارات الطلبات فور تسجيلها بنجاح.',
            '',
            'رابط متجر التاجر:',
            storeUrl,
            '',
            'رابط صفحة التاجر:',
            dashboardUrl,
          ].join('\n');

          await sendBotMessage(
            botToken,
            chatId,
            statusMsg,
            buildStoreLinksKeyboard(storeUrl, dashboardUrl)
          );
        } else {
          await sendBotMessage(
            botToken,
            chatId,
            'حالة الاتصال: غير مرتبط بأي متجر بعد. يرجى الضغط على زر (احفظ روابطك وفعّل إشعارات التليكرام) من شاشة نجاح التسجيل أو من صفحة التاجر ليتم الربط تلقائياً.'
          );
        }
      } else if (text === '/help' || text === 'مساعدة') {
        const helpMsg = [
          'دليل استخدام بوت إشعارات وصلي:',
          '==============================',
          '• /start - بدء واستقبال رسالة الترحيب والربط مع المتجر وإرسال روابطك.',
          '• /status - التحقق من حالة الربط وعرض رابط المتجر ورابط صفحة التاجر.',
          '• /help - عرض تعليمات المساعدة الحالية.',
          '------------------------------',
          'لربط أي متجر جديد: من شاشة نجاح التسجيل أو صفحة التاجر اضغط على زر تفعيل إشعارات التليكرام.'
        ].join('\n');

        await sendBotMessage(botToken, chatId, helpMsg);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('خطأ في ويب هوك بوت الطلبات:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, bot: 'wasliasharatbot', status: 'active' });
}
