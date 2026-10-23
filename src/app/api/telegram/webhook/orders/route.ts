import { NextRequest, NextResponse } from 'next/server';
import { getOrdersBotToken } from '@/lib/telegram/vault';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    if (update && update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || '';
      const firstName = message.from?.first_name || 'صديقنا';
      const botToken = getOrdersBotToken();

      if (!botToken) {
        return NextResponse.json({ ok: false, error: 'رمز بوت الطلبات غير محدد' }, { status: 500 });
      }

      if (text.startsWith('/start')) {
        const welcomeMessage = [
          `أهلاً بك يا ${firstName} في بوت (إشعارات طلبات وصلي)`,
          '==============================',
          'البوت متصل بنجاح بالسيرفر وهو المخصص لإشعارات المبيعات والطلبات.',
          '',
          'مهمتي الأساسية:',
          'إرسال إشعار فوري في الخاص للمدير والتاجر عند ورود أي طلب شراء جديد في المنصة.',
          '------------------------------',
          `معرف محادثتك الشخصي (Chat ID): ${chatId}`,
          '==============================',
          'جاهز لإرسال إشعارات الطلبات فور حدوثها.'
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
    console.error('خطأ في ويب هوك بوت الطلبات:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, bot: 'wasliasharatbot', status: 'active' });
}
