import { NextRequest, NextResponse } from 'next/server';
import { getVaultBotToken, getOrdersBotToken } from '@/lib/telegram/vault';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const url = new URL(req.url);
    const botType = url.searchParams.get('bot');

    if (update && update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || '';
      const firstName = message.from?.first_name || 'صديقنا';

      // تحديد البوت الذي سيرد
      let activeToken = botType === 'orders' 
        ? getOrdersBotToken() 
        : getVaultBotToken();

      if (!activeToken) {
        activeToken = getVaultBotToken() || getOrdersBotToken();
      }

      const botName = botType === 'orders' ? 'إشعارات طلبات وصلي' : 'مستودع منتجات وصلي';

      // الرد على زر /start
      if (text.startsWith('/start')) {
        const welcomeMessage = [
          `أهلاً بك يا ${firstName} في بوت (${botName})`,
          '==============================',
          'البوت متصل بنجاح بالسيرفر ومستعد للعمل فوراً!',
          '',
          botType === 'orders' 
            ? 'وظيفة هذا البوت: إرسال تنبيهات فورية للمدير بكل طلب جديد يتم في المنصة.'
            : 'وظيفة هذا البوت: النشر التلقائي للمنتجات المستوردة مع صورها وأسعارها داخل قناتك.',
          '------------------------------',
          `معرف محادثتك (Chat ID): ${chatId}`,
          'نوع المحادثة: ' + (message.chat.type === 'private' ? 'محادثة خاصة' : message.chat.type),
          '==============================',
          'شكراً لاستخدامك منصة وصلي للتجارة الذكية والدروب شيبينغ في العراق.'
        ].join('\n');

        // إرسال الرد بالتوكن النشط
        await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeMessage,
          }),
        });
      } else {
        // الرد على أي رسالة أخرى
        const replyText = [
          `مرحباً ${firstName}!`,
          `تم استلام رسالتك في سيرفر منصة وصلي عبر بوت (${botName}).`,
          `معرف محادثتك هو: ${chatId}`
        ].join('\n');

        await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
          }),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('خطأ في معالجة ويب هوك التيليجرام:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'مستمع ويب هوك تيليجرام نشط ويعمل بنجاح.' });
}
