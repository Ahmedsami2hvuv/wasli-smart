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
        return NextResponse.json({ ok: false, error: 'رمز بوت المستودع غير محدد' }, { status: 500 });
      }

      if (text.startsWith('/start')) {
        const welcomeMessage = [
          `أهلاً بك يا ${firstName} في بوت (مستودع منتجات وصلي)`,
          '==============================',
          'البوت متصل بنجاح بالسيرفر وهو المخصص لنشر المنتجات في القناة.',
          '',
          'مهمتي الأساسية:',
          'نشر أي منتج جديد يتم استيراده من فدشي تلقائياً في قناتك مع الصور والأسعار وهوامش الربح.',
          '------------------------------',
          `معرف محادثتك: ${chatId}`,
          '==============================',
          'البوت مربوط وجاهز للعمل.'
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

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('خطأ في ويب هوك بوت المستودع:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, bot: 'mstodaawaslibot', status: 'active' });
}
