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
 * دوال مساعدة لجلب إعدادات بوت مستودع الصور وبوت إشعارات المتاجر
 */
export function getVaultBotToken(): string | undefined {
  return process.env.TELEGRAM_VAULT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
}

export function getVaultChannelId(): string | undefined {
  return process.env.TELEGRAM_VAULT_CHANNEL_ID || process.env.TELEGRAM_CHANNEL_ID;
}

export function getOrdersBotToken(): string | undefined {
  return (
    process.env.TELEGRAM_ORDERS_BOT_TOKEN ||
    process.env.TELEGRAM_NOTIFICATIONS_BOT_TOKEN ||
    process.env.TELEGRAM_VAULT_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN
  );
}

/**
 * رفع صورة واحدة أو مجموعة صور إلى قناة مستودع تيليجرام
 */
export async function uploadImageToTelegramVault(
  imageBuffer: Buffer,
  fileName: string = 'product.webp',
  caption?: string
): Promise<TelegramImageUploadResult> {
  const botToken = getVaultBotToken();
  const channelId = getVaultChannelId();

  if (!botToken || !channelId) {
    throw new Error('إعدادات بوت أو قناة مستودع صور تيليجرام غير مكتملة في متغيرات البيئة.');
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
  const botToken = getVaultBotToken();
  if (!botToken) {
    throw new Error('رمز بوت مستودع الصور غير متوفر.');
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
 * بيانات إشعار الطلب
 */
export interface OrderNotificationPayload {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  city?: string;
  address?: string;
  storeName: string;
  totalAmount: number;
  merchantProfit: number;
  itemsCount: number;
  itemsList?: Array<{ name: string; quantity: number; price: number }>;
}

/**
 * إرسال إشعار فوري لصاحب المتجر عند وصول طلب جديد لمتجره
 */
export async function sendStoreOrderNotification(
  storeChatId: string,
  orderData: OrderNotificationPayload
): Promise<boolean> {
  const botToken = getOrdersBotToken();
  if (!botToken || !storeChatId) {
    return false;
  }

  const itemsSummary = orderData.itemsList && orderData.itemsList.length > 0
    ? orderData.itemsList.map(item => `- ${item.name} (عدد: ${item.quantity})`).join('\n')
    : `عدد المنتجات: ${orderData.itemsCount}`;

  const messageText = [
    'طلب جديد وارد لمتجرك في منصة وصلي',
    '==============================',
    `رقم الطلب: ${orderData.orderNumber}`,
    `اسم المتجر: ${orderData.storeName}`,
    '------------------------------',
    `اسم الزبون: ${orderData.customerName}`,
    `المحافظة / العنوان: ${orderData.governorate}${orderData.city ? ' - ' + orderData.city : ''}`,
    '------------------------------',
    'المنتجات المطلوبة:',
    itemsSummary,
    '------------------------------',
    `إجمالي مبلغ الطلب: ${orderData.totalAmount.toLocaleString('ar-IQ')} د.ع`,
    `صافي أرباحك من هذا الطلب: ${orderData.merchantProfit.toLocaleString('ar-IQ')} د.ع`,
    '==============================',
    'تم تسجيل الطلب وبدء إجراءات التجهيز والتوصيل عبر المنصة.'
  ].join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: storeChatId,
        text: messageText,
      }),
    });
    const resData = await response.json();
    return resData.ok === true;
  } catch (err) {
    console.error('خطأ في إرسال إشعار تيليجرام لمتجر:', err);
    return false;
  }
}

/**
 * إرسال إشعار فوري لمدير المنصة عند وصول طلب جديد
 */
export async function sendAdminOrderNotification(orderData: OrderNotificationPayload): Promise<boolean> {
  const botToken = getOrdersBotToken();
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!botToken || !adminChatId) {
    return false;
  }

  const itemsSummary = orderData.itemsList && orderData.itemsList.length > 0
    ? orderData.itemsList.map(item => `- ${item.name} (${item.quantity} × ${item.price.toLocaleString('ar-IQ')} د.ع)`).join('\n')
    : `عدد المنتجات: ${orderData.itemsCount}`;

  const messageText = [
    'إشعار إداري: طلب جديد في منصة وصلي',
    '==============================',
    `رقم الطلب: ${orderData.orderNumber}`,
    `المتجر المسوّق: ${orderData.storeName}`,
    `الزبون: ${orderData.customerName}`,
    `رقم الهاتف: ${orderData.customerPhone}`,
    `العنوان: ${orderData.governorate} - ${orderData.city || ''} ${orderData.address || ''}`,
    '------------------------------',
    'المنتجات المطلوبة:',
    itemsSummary,
    '------------------------------',
    `إجمالي المبلغ: ${orderData.totalAmount.toLocaleString('ar-IQ')} د.ع`,
    `ربح المتجر: ${orderData.merchantProfit.toLocaleString('ar-IQ')} د.ع`,
    '==============================',
    'يرجى مراجعة لوحة الإدارة لمتابعة وتأكيد الطلب.'
  ].join('\n');

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: messageText,
      }),
    });
    const resData = await response.json();
    return resData.ok === true;
  } catch (err) {
    console.error('خطأ في إرسال إشعار تيليجرام للمشرف:', err);
    return false;
  }
}


export function cleanTelegramChatId(input: string | number | null | undefined): string | number | null {
  if (!input) return null;
  if (typeof input === 'number') return input;
  let cleaned = String(input).replace(/[\u200E\u200F\u202A-\u202E\uFEFF]/g, '').trim();
  cleaned = cleaned.replace(/[\u2010-\u2015\u2212]/g, '-');
  if (/^-?\d+$/.test(cleaned)) {
    return Number(cleaned);
  }
  return cleaned;
}

/**
 * نشر المنتج المستورد تلقائياً في قناة تيليجرام
 */
export async function publishProductToTelegramChannel(product: {
  name: string;
  image?: string;
  wholesalePriceIqd: number;
  minPriceIqd: number;
  maxPriceIqd: number;
  promoDescription?: string;
  specifications?: string;
  supplierCode?: string;
  category?: string;
  productId?: string;
}): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const botToken = getVaultBotToken() || getOrdersBotToken();
  const rawChannelId = getVaultChannelId() || process.env.TELEGRAM_ADMIN_CHAT_ID;
  const channelId = cleanTelegramChatId(rawChannelId);

  if (!botToken || !channelId) {
    return { 
      success: false, 
      error: 'متغيرات بيئة بوت تيليجرام أو معرّف القناة غير معينة في فيرسل (TELEGRAM_BOT_TOKEN أو TELEGRAM_CHANNEL_ID)' 
    };
  }

  const caption = [
    `منتج جديد متاح للتسويق: ${product.name}`,
    '==============================',
    `القسم: ${product.category || 'عام'}`,
    product.supplierCode ? `كود المورد: ${product.supplierCode}` : '',
    '------------------------------',
    `سعر الجملة للمسوق: ${product.wholesalePriceIqd.toLocaleString('ar-IQ')} د.ع`,
    `سعر البيع المقترح للزبون: ${product.minPriceIqd.toLocaleString('ar-IQ')} - ${product.maxPriceIqd.toLocaleString('ar-IQ')} د.ع`,
    `هامش ربحك المتوقع: ${(product.minPriceIqd - product.wholesalePriceIqd).toLocaleString('ar-IQ')} - ${(product.maxPriceIqd - product.wholesalePriceIqd).toLocaleString('ar-IQ')} د.ع`,
    '------------------------------',
    product.promoDescription ? `الوصف والمميزات:\n${product.promoDescription.slice(0, 350)}` : '',
    '==============================',
    'متوفر الآن للطلب والشحن المباشر لكافة محافظات العراق والدفع عند الاستلام.'
  ].filter(Boolean).join('\n');

  try {
    if (product.image && (product.image.startsWith('http://') || product.image.startsWith('https://'))) {
      const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          photo: product.image,
          caption: caption.slice(0, 1024),
        }),
      });

      const photoData = await photoRes.json();
      if (photoData.ok) {
        return { success: true, messageId: photoData.result?.message_id };
      }
    }

    const msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: caption,
      }),
    });

    const msgData = await msgRes.json();
    return { success: msgData.ok === true, messageId: msgData.result?.message_id, error: msgData.description };
  } catch (err: any) {
    console.error('خطأ في نشر المنتج على قناة تيليجرام:', err);
    return { success: false, error: err.message };
  }
}
