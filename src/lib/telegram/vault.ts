import sharp from 'sharp';

export interface ProcessedImageResult {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  size: number;
}

export interface TelegramImageUploadResult {
  fileId: string;
  messageId?: number;
  width: number;
  height: number;
  size: number;
  displayUrl: string;
}

/**
 * معالجة وضغط الصورة وتحويلها إلى WebP بأبعاد متناسقة وجودة فائقة
 */
export async function optimizeProductImage(inputBuffer: Buffer): Promise<ProcessedImageResult> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  // ضبط أقصى عرض 1200 بكسل مع الحفاظ على التناسب
  const targetWidth = metadata.width && metadata.width > 1200 ? 1200 : undefined;

  let pipeline = image;
  if (targetWidth) {
    pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true });
  }

  // ضغط ذكي بصيغة WebP
  const processedBuffer = await pipeline
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const finalMeta = await sharp(processedBuffer).metadata();

  return {
    buffer: processedBuffer,
    mimeType: 'image/webp',
    width: finalMeta.width || 800,
    height: finalMeta.height || 800,
    size: processedBuffer.length,
  };
}

/**
 * رفع صورة واحدة أو مجموعة صور إلى قناة مستودع تيليجرام
 */
export async function uploadImageToTelegramVault(
  imageBuffer: Buffer,
  fileName: string = 'product.webp',
  caption?: string
): Promise<TelegramImageUploadResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !channelId) {
    throw new Error('إعدادات بوت أو قناة تيليجرام غير مكتملة في متغيرات البيئة.');
  }

  const formData = new FormData();
  formData.append('chat_id', channelId);
  if (caption) {
    formData.append('caption', caption);
  }

  const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/webp' });
  formData.append('photo', blob, fileName);

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`فشل رفع الصورة إلى تيليجرام: ${data.description || 'خطأ غير معروف'}`);
  }

  // استخراج الصورة ذات الدقة الأعلى من بين الأحجام المرتجعة
  const photos = data.result.photo;
  const largestPhoto = photos[photos.length - 1];

  return {
    fileId: largestPhoto.file_id,
    messageId: data.result.message_id,
    width: largestPhoto.width,
    height: largestPhoto.height,
    size: largestPhoto.file_size || imageBuffer.length,
    displayUrl: `/api/images/proxy?fileId=${encodeURIComponent(largestPhoto.file_id)}`,
  };
}

/**
 * جلب مسار الصورة من تيليجرام لتحميلها عبر الخادم الوسيط
 */
export async function getTelegramFileStream(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('رمز البوت غير متوفر.');
  }

  // 1. الحصول على مسار الملف
  const getFileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const fileData = await getFileRes.json();

  if (!fileData.ok || !fileData.result.file_path) {
    throw new Error(`لم يتم العثور على الملف في تيليجرام: ${fileData.description || ''}`);
  }

  const filePath = fileData.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

  // 2. تحميل محتوى الملف
  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) {
    throw new Error('فشل جلب ملف الصورة من خادم تيليجرام.');
  }

  const arrayBuffer = await downloadRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = downloadRes.headers.get('content-type') || 'image/webp';

  return { buffer, contentType };
}

/**
 * إرسال إشعار فوري لمدير المنصة عند وصول طلب جديد
 */
export async function sendAdminOrderNotification(orderData: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  storeName: string;
  totalAmount: number;
  merchantProfit: number;
  itemsCount: number;
}): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!botToken || !adminChatId) {
    return false;
  }

  const text = `📦 طلب جديد في منصة وصلي!
━━━━━━━━━━━━━━
🔹 رقم الطلب: ${orderData.orderNumber}
🏪 المتجر: ${orderData.storeName}
👤 الزبون: ${orderData.customerName}
📞 الهاتف: ${orderData.customerPhone}
📍 المحافظة: ${orderData.governorate}
🛍️ عدد المنتجات: ${orderData.itemsCount}
💰 الإجمالي: ${orderData.totalAmount.toLocaleString('ar-IQ')} د.ع
📈 ربح المسوّق: ${orderData.merchantProfit.toLocaleString('ar-IQ')} د.ع
━━━━━━━━━━━━━━
يرجى الدخول إلى لوحة الإدارة لمراجعة وتأكيد الطلب.`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: text,
      }),
    });
    const resData = await response.json();
    return resData.ok === true;
  } catch (err) {
    console.error('خطأ في إرسال إشعار تيليجرام للمشرف:', err);
    return false;
  }
}
