import { NextRequest, NextResponse } from 'next/server';
import { getOrdersBotToken } from '@/lib/telegram/vault';
import { getStoreBySlugOrCode, getAllStores, updateStore } from '@/lib/services/storeService';

export const dynamic = 'force-dynamic';

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

          const confirmationMessage = [
            `أهلاً وسهلاً بك يا ${firstName}!`,
            '==============================',
            `تم بنجاح ربط متجرك (${matchedStore.name}) بهذا الحساب!`,
            '------------------------------',
            `كود المتجر: ${matchedStore.code}`,
            `التاجر: ${matchedStore.ownerName || firstName}`,
            `معرف المحادثة (Chat ID): ${chatId}`,
            '------------------------------',
            'من الآن فصاعداً، ستصلك كافة إشعارات الطلبات الجديدة وتفاصيل مبيعاتك وأرباحك فور تسجيل أي طلب لمتجرك مباشرة هنا.',
            '==============================',
            'منصة وصلي الذكية تتمنى لك تجارة مباركة ومبيعات مضاعفة!'
          ].join('\n');

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: confirmationMessage,
            }),
          });
        } else {
          // لم يتم تمرير كود متجر، نتحقق إن كان هذا التاجر مرتبطاً مسبقاً بأي متجر
          const allStores = await getAllStores();
          const alreadyLinkedStore = allStores.find(
            s => s.telegramChatId === String(chatId) || (s as any).settings?.telegram_chat_id === String(chatId)
          );

          if (alreadyLinkedStore) {
            const linkedMsg = [
              `أهلاً بعودتك يا ${firstName}!`,
              '==============================',
              `حسابك مرتبط حالياً بمتجر: ${alreadyLinkedStore.name}`,
              `كود المتجر: ${alreadyLinkedStore.code}`,
              '------------------------------',
              'البوت يعمل بصورة ممتازة وجاهز لتسليم إشعارات المبيعات والأرباح فور وصولها.',
              '=============================='
            ].join('\n');

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: linkedMsg,
              }),
            });
          } else {
            const welcomeMessage = [
              `أهلاً بك يا ${firstName} في بوت (إشعارات طلبات وصلي)`,
              '==============================',
              'البوت متصل بنجاح وهو المخصص لإرسال إشعارات الطلبات والمبيعات الفورية.',
              '',
              'لكي يتم ربط متجرك وتصلك إشعارات مبيعاتك وأرباحك تلقائياً:',
              '1. افتح صفحة التاجر لمتجرك.',
              '2. من القائمة الجانبية اضغط على زر [الاتصال ببوت الإشعارات].',
              '3. سيتم فتح هذا البوت وربط المتجر فوراً بضغطة زر واحدة!',
              '------------------------------',
              `معرف محادثتك الشخصي (Chat ID): ${chatId}`,
              '=============================='
            ].join('\n');

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: welcomeMessage,
              }),
            });
          }
        }
      } else if (text === '/status' || text === 'الحالة') {
        const allStores = await getAllStores();
        const alreadyLinkedStore = allStores.find(
          s => s.telegramChatId === String(chatId) || (s as any).settings?.telegram_chat_id === String(chatId)
        );

        const statusMsg = alreadyLinkedStore
          ? `حالة الاتصال: نشط ومتصل بمتجر (${alreadyLinkedStore.name}) - كود: ${alreadyLinkedStore.code}`
          : 'حالة الاتصال: غير مرتبط بأي متجر بعد. يرجى الضغط على زر (الاتصال ببوت الإشعارات) في صفحة التاجر.';

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: statusMsg,
          }),
        });
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
