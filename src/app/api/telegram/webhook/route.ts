import { NextRequest, NextResponse } from 'next/server';
import { getVaultBotToken } from '@/lib/telegram/vault';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    if (update && update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || '';
      const firstName = message.from?.first_name || 'صديقنا';

      const botToken = getVaultBotToken();
      if (!botToken) {
        return NextResponse.json({ ok: false, error: 'No bot token' }, { status: 500 });
      }

      // الرد على زر /start
      if (text.startsWith('/start')) {
        const welcomeMessage = [
          `أهلاً بك يا ${firstName} في بوت منصة وصلي للتجارة الذكية`,
          '==============================',
          'البوت متصل بنجاح بالسيرفر وهو يعمل الآن بشكل ممتاز!',
          '',
          'وظائف هذا البوت في منصة وصلي:',
          '1. نشر المنتجات الجديدة تلقائياً في قناتك الخاصة على تيليجرام فور استيرادها.',
          '2. متابعة وإرسال إشعارات الطلبات الجديدة في المنصة.',
          '------------------------------',
          `معرف هذه المحادثة (Chat ID): ${chatId}`,
          'نوع المحادثة: ' + (message.chat.type === 'private' ? 'محادثة خاصة' : message.chat.type),
          '==============================',
          'يمكنك الآن إضافة هذا البوت مشرفاً (Admin) في قناتك لنشر المنتجات مباشرة.'
        ].join('\n');

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
          'تم استلام رسالتك في سيرفر منصة وصلي.',
          `معرفك هو: ${chatId}`,
          'البوت مخصص لخدمة منصة وصلي ونشر المنتجات تلقائياً في القناة.'
        ].join('\n');

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
