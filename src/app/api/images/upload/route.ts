import { NextRequest, NextResponse } from 'next/server';
import { optimizeProductImage, uploadImageToTelegramVault } from '@/lib/telegram/vault';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const caption = formData.get('caption') as string || '';

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, message: 'لم يتم إرفاق أي ملفات للرفع' }, { status: 400 });
    }

    const uploadedResults = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const inputBuffer = Buffer.from(bytes);

      // 1. معالجة وضغط الصورة
      const optimized = await optimizeProductImage(inputBuffer);

      // 2. هل إعدادات تيليجرام متوفرة؟
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID) {
        try {
          const telegramResult = await uploadImageToTelegramVault(
            optimized.buffer,
            `product_${Date.now()}.webp`,
            caption
          );

          uploadedResults.push({
            telegramFileId: telegramResult.fileId,
            telegramMessageId: telegramResult.messageId,
            displayUrl: telegramResult.displayUrl,
            width: telegramResult.width,
            height: telegramResult.height,
            size: telegramResult.size,
            storageType: 'telegram',
          });
          continue;
        } catch (tgError: any) {
          console.error('فشل الرفع إلى تيليجرام، سيتم استخدام التخزين المحلي الآمن كبديل احتياطي:', tgError);
        }
      }

      // بديل احتياطي محلي في مجلد uploads العام إذا لم يتم إدخال مفتاح تيليجرام بعد
      const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(publicUploadsDir)) {
        fs.mkdirSync(publicUploadsDir, { recursive: true });
      }

      const fileName = `product_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;
      const filePath = path.join(publicUploadsDir, fileName);
      fs.writeFileSync(filePath, optimized.buffer);

      uploadedResults.push({
        telegramFileId: null,
        displayUrl: `/uploads/${fileName}`,
        width: optimized.width,
        height: optimized.height,
        size: optimized.size,
        storageType: 'local',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'تمت معالجة ورفع الصور بنجاح',
      images: uploadedResults,
    });
  } catch (error: any) {
    console.error('خطأ أثناء معالجة الصور:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'حدث خطأ أثناء معالجة الصور',
    }, { status: 500 });
  }
}
