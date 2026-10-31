import { NextRequest, NextResponse } from 'next/server';
import { getOrdersBotToken } from '@/lib/telegram/vault';
import { getStoreBySlugOrCode, getAllStores, updateStore } from '@/lib/services/storeService';
import {
  buildMerchantLinks,
  buildStoreLinksKeyboard,
  clearSession,
  getSession,
  handleAuthCallback,
  handleAuthText,
  saveSession,
  startAuthFlow,
} from '@/lib/telegram/merchantBotAuth';

export const dynamic = 'force-dynamic';

type ReplyMarkup = Record<string, unknown>;

async function sendBotMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  replyMarkup?: ReplyMarkup
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

async function answerCallbackQuery(botToken: string, callbackQueryId: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    });
  } catch {
    // تجاهل
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const botToken = getOrdersBotToken();

    if (!botToken) {
      return NextResponse.json({ ok: false, error: 'رمز بوت الطلبات غير محدد' }, { status: 500 });
    }

    // ضغطات الأزرار المضمنة (إنشاء حساب / دخول / نسيت الرمز)
    if (update?.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id;
      const data = String(cq.data || '');
      const firstName = cq.from?.first_name || 'صديقنا التاجر';
      const username = cq.from?.username || '';

      await answerCallbackQuery(botToken, cq.id);

      if (chatId && data.startsWith('auth:')) {
        const reply = await handleAuthCallback({
          chatId: String(chatId),
          data,
          firstName,
          username,
        });
        await sendBotMessage(botToken, chatId, reply.text, reply.replyMarkup as ReplyMarkup);
      }

      return NextResponse.json({ ok: true });
    }

    if (update?.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = (message.text || '').trim();
      const firstName = message.from?.first_name || 'صديقنا التاجر';
      const username = message.from?.username || '';

      if (text.startsWith('/start')) {
        const parts = text.split(/\s+/);
        const payload = parts.length > 1 ? parts[1].trim() : '';

        // مسار التسجيل/الدخول عبر التيليجرام
        if (!payload || payload === 'auth' || payload === 'register' || payload === 'login') {
          await clearSession(String(chatId));
          const reply = await startAuthFlow(firstName);
          await sendBotMessage(botToken, chatId, reply.text, reply.replyMarkup as ReplyMarkup);
          return NextResponse.json({ ok: true });
        }

        // ربط متجر موجود عبر الرابط العميق store_XXXX
        const storeCode = payload.replace(/^store_/, '').trim();
        let matchedStore = storeCode ? await getStoreBySlugOrCode(storeCode) : null;

        if (matchedStore) {
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
            'من الآن فصاعداً، ستصلك كافة إشعارات الطلبات الجديدة مباشرة هنا.',
            '==============================',
          ].join('\n');

          await sendBotMessage(
            botToken,
            chatId,
            confirmationMessage,
            buildStoreLinksKeyboard(storeUrl, dashboardUrl) as ReplyMarkup
          );
          return NextResponse.json({ ok: true });
        }

        // إن كان مرتبطاً مسبقاً
        const allStores = await getAllStores();
        const alreadyLinkedStore = allStores.find(
          (s) =>
            s.telegramChatId === String(chatId) ||
            (s as any).settings?.telegram_chat_id === String(chatId)
        );

        if (alreadyLinkedStore) {
          const { storeUrl, dashboardUrl } = buildMerchantLinks(alreadyLinkedStore);
          const linkedMsg = [
            `أهلاً بعودتك يا ${firstName}!`,
            '==============================',
            `حسابك مرتبط حالياً بمتجر: ${alreadyLinkedStore.name}`,
            `كود المتجر: ${alreadyLinkedStore.code}`,
            '------------------------------',
            'تقدر أيضاً تستخدم القائمة لإدارة الدخول أو إنشاء حساب آخر.',
          ].join('\n');

          await sendBotMessage(
            botToken,
            chatId,
            linkedMsg,
            {
              inline_keyboard: [
                ...((buildStoreLinksKeyboard(storeUrl, dashboardUrl) as any).inline_keyboard || []),
                [{ text: 'قائمة التسجيل والدخول', callback_data: 'auth:cancel' }],
              ],
            }
          );
          return NextResponse.json({ ok: true });
        }

        const reply = await startAuthFlow(firstName);
        await sendBotMessage(botToken, chatId, reply.text, reply.replyMarkup as ReplyMarkup);
        return NextResponse.json({ ok: true });
      }

      if (text === '/status' || text === 'الحالة') {
        const allStores = await getAllStores();
        const alreadyLinkedStore = allStores.find(
          (s) =>
            s.telegramChatId === String(chatId) ||
            (s as any).settings?.telegram_chat_id === String(chatId)
        );

        if (alreadyLinkedStore) {
          const { storeUrl, dashboardUrl } = buildMerchantLinks(alreadyLinkedStore);
          await sendBotMessage(
            botToken,
            chatId,
            [
              `حالة الاتصال: نشط ومتصل بمتجر (${alreadyLinkedStore.name})`,
              `كود المتجر: ${alreadyLinkedStore.code}`,
              'تصلك إشعارات الطلبات فور تسجيلها.',
            ].join('\n'),
            buildStoreLinksKeyboard(storeUrl, dashboardUrl) as ReplyMarkup
          );
        } else {
          await sendBotMessage(
            botToken,
            chatId,
            'حالة الاتصال: غير مرتبط بأي متجر بعد. استخدم /start لإنشاء حساب أو تسجيل الدخول.'
          );
        }
        return NextResponse.json({ ok: true });
      }

      if (text === '/help' || text === 'مساعدة' || text === '/auth' || text === 'القائمة') {
        const reply = await startAuthFlow(firstName);
        await sendBotMessage(botToken, chatId, reply.text, reply.replyMarkup as ReplyMarkup);
        return NextResponse.json({ ok: true });
      }

      // متابعة محادثة التسجيل/الدخول إن كانت الجلسة نشطة
      const session = await getSession(String(chatId));
      const authReply = await handleAuthText({
        chatId: String(chatId),
        text,
        firstName,
        username,
      });

      if (authReply) {
        // بعد الإلغاء نعرض القائمة بأزرار مضمنة
        if (text === 'إلغاء' || text === '/cancel') {
          await sendBotMessage(botToken, chatId, authReply.text, { remove_keyboard: true });
          const menu = await startAuthFlow(firstName);
          await sendBotMessage(botToken, chatId, menu.text, menu.replyMarkup as ReplyMarkup);
        } else {
          const markup = authReply.replyMarkup as ReplyMarkup | undefined;
          // إن وُجدت أزرار روابط مضمنة بعد لوحة المحافظات، نُزيل لوحة الرد أولاً
          if (markup && 'inline_keyboard' in markup) {
            await sendBotMessage(botToken, chatId, authReply.text, { remove_keyboard: true });
            await sendBotMessage(botToken, chatId, 'اختصارات سريعة:', markup);
          } else {
            await sendBotMessage(botToken, chatId, authReply.text, markup);
          }
        }
        return NextResponse.json({ ok: true });
      }

      // إذا لا جلسة نشطة ونص حر: ذكّر بالقائمة
      if (session.step === 'idle' && text) {
        await saveSession({ chatId: String(chatId), step: 'idle', data: {}, updatedAt: new Date().toISOString() });
        await sendBotMessage(
          botToken,
          chatId,
          'استخدم /start لفتح قائمة إنشاء الحساب أو تسجيل الدخول، أو /status لمعرفة حالة الربط.'
        );
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
