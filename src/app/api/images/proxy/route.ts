import { NextRequest, NextResponse } from 'next/server';
import { getTelegramFileStream } from '@/lib/telegram/vault';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return new NextResponse('معرّف الصورة مفقود', { status: 400 });
  }

  try {
    const { buffer, contentType } = await getTelegramFileStream(fileId);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Content-Disposition': 'inline', // إجبار المتصفح على عرض الصورة بداخله كصورة مباشرة ومنع تنزيلها كملف
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('خطأ في جلب صورة تيليجرام الوسيطة:', error);
    return new NextResponse('تعذر تحميل الصورة المطلوبة', { status: 502 });
  }
}
