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
export function getVaultBotToken(): string {
  const envToken = process.env.TELEGRAM_VAULT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  // إذا كانت القيمة في فيرسل مضبوطة على توكن بوت الإشعارات (wasliasharatbot)، نستخدم تلقائياً توكن بوت مستودع المنتجات المشرف في القناة
  if (!envToken || envToken.startsWith('8664781934')) {
    return '8862218858:AAHPyAOmL4_Y1R3um05z1CXbNd1UmdM-wk4';
  }
  return envToken;
}

export function getVaultChannelId(): string | undefined {
  return process.env.TELEGRAM_VAULT_CHANNEL_ID || process.env.TELEGRAM_CHANNEL_ID;
}

export function getOrdersBotToken(): string | undefined {
  return process.env.TELEGRAM_ORDERS_BOT_TOKEN || process.env.TELEGRAM_NOTIFICATIONS_BOT_TOKEN;
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

  // تحديد نوع الصورة الفعلي بدقة لعرضها داخل المتصفح مباشرة ومنع تنزيلها كملف
  let contentType = 'image/jpeg';
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith('.webp')) {
    contentType = 'image/webp';
  } else if (lowerPath.endsWith('.png')) {
    contentType = 'image/png';
  } else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
    contentType = 'image/jpeg';
  } else if (buffer.length > 4) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      contentType = 'image/jpeg';
    } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      contentType = 'image/png';
    } else if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') {
      contentType = 'image/webp';
    }
  }

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
    'طلب جديد وارد لمتجر التاجر',
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
    `صافي أرباح التاجر من هذا الطلب: ${orderData.merchantProfit.toLocaleString('ar-IQ')} د.ع`,
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
    'إشعار صفحة المدير: طلب جديد',
    '==============================',
    `رقم الطلب: ${orderData.orderNumber}`,
    `متجر التاجر: ${orderData.storeName}`,
    `الزبون: ${orderData.customerName}`,
    `رقم الهاتف: ${orderData.customerPhone}`,
    `العنوان: ${orderData.governorate} - ${orderData.city || ''} ${orderData.address || ''}`,
    '------------------------------',
    'المنتجات المطلوبة:',
    itemsSummary,
    '------------------------------',
    `إجمالي المبلغ: ${orderData.totalAmount.toLocaleString('ar-IQ')} د.ع`,
    `ربح التاجر: ${orderData.merchantProfit.toLocaleString('ar-IQ')} د.ع`,
    '==============================',
    'يرجى مراجعة صفحة المدير لمتابعة وتأكيد الطلب.'
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
async function fetchAndOptimizeImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    const optimized = await optimizeProductImage(inputBuffer);
    return optimized.buffer;
  } catch (err) {
    console.warn('تعذر تحميل وضغط صورة المنتج للتيليجرام:', url, err);
    return null;
  }
}

/**
 * نقل وتخزين صورة المنتج الخارجية (فدشي أو موجود) في مستودع وصلي بتيليجرام وتحويل رابطها لرابط وصلي محلي
 */
export async function mirrorProductImageToVault(externalUrl: string, caption?: string): Promise<string> {
  if (!externalUrl || typeof externalUrl !== 'string') return '';
  const trimmed = externalUrl.trim();
  if (trimmed.startsWith('/api/images/proxy') || trimmed.startsWith('data:') || trimmed.includes('/placeholder')) {
    return trimmed;
  }

  try {
    const webpBuffer = await fetchAndOptimizeImage(trimmed);
    if (!webpBuffer) return trimmed;

    const res = await uploadImageToTelegramVault(webpBuffer, 'product.webp', caption);
    return res.displayUrl || trimmed;
  } catch (err) {
    console.warn('تعذر نقل الصورة إلى مستودع تيليجرام:', trimmed, err);
    return trimmed;
  }
}

/**
 * استخراج روابط البروكسي المحلية لصور الألبوم من نتيجة رسائل تيليجرام
 */
function extractProxyUrlsFromTelegramResult(result: any): string[] {
  const fileIds: string[] = [];
  if (Array.isArray(result)) {
    for (const msg of result) {
      if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
        const best = msg.photo[msg.photo.length - 1];
        if (best.file_id) fileIds.push(best.file_id);
      }
    }
  } else if (result && result.photo && Array.isArray(result.photo) && result.photo.length > 0) {
    const best = result.photo[result.photo.length - 1];
    if (best.file_id) fileIds.push(best.file_id);
  }
  return fileIds.map(fid => `/api/images/proxy?fileId=${encodeURIComponent(fid)}`);
}

/**
 * نشر المنتج المستورد تلقائياً في قناة تيليجرام ككتلة صور مجمعة WebP
 */
export async function publishProductToTelegramChannel(product: {
  name: string;
  image?: string;
  images?: string[];
  wholesalePriceIqd: number;
  minPriceIqd: number;
  maxPriceIqd: number;
  description?: string;
  promoDescription?: string;
  specifications?: string;
  supplierCode?: string;
  category?: string;
  productId?: string;
}): Promise<{ 
  success: boolean; 
  messageId?: number; 
  error?: string;
  proxyUrls?: string[];
  primaryProxyUrl?: string;
}> {
  const botToken = getVaultBotToken() || getOrdersBotToken();
  const rawChannelId = getVaultChannelId() || process.env.TELEGRAM_ADMIN_CHAT_ID;
  const channelId = cleanTelegramChatId(rawChannelId);

  if (!botToken || !channelId) {
    return { 
      success: false, 
      error: 'متغيرات بيئة بوت تيليجرام أو معرّف القناة غير معينة في فيرسل (TELEGRAM_VAULT_BOT_TOKEN أو TELEGRAM_VAULT_CHANNEL_ID)' 
    };
  }

  // استخراج الوصف والمواصفات
  const descriptionText = (product.specifications || product.description || '').trim();
  // استخراج الوصف الترويجي
  const promoText = (product.promoDescription || '').trim();

  const headerLines = [
    `منتج جديد متاح للتجار: ${product.name}`,
    '==============================',
    `القسم: ${product.category || 'عام'}`,
    product.supplierCode ? `كود المورد: ${product.supplierCode}` : '',
    '------------------------------',
    `سعر الجملة للتاجر: ${product.wholesalePriceIqd.toLocaleString('ar-IQ')} د.ع`,
    `سعر البيع المقترح للزبون: ${product.minPriceIqd.toLocaleString('ar-IQ')} - ${product.maxPriceIqd.toLocaleString('ar-IQ')} د.ع`,
    `هامش ربح التاجر المتوقع: ${(product.minPriceIqd - product.wholesalePriceIqd).toLocaleString('ar-IQ')} - ${(product.maxPriceIqd - product.wholesalePriceIqd).toLocaleString('ar-IQ')} د.ع`,
    '------------------------------',
  ].filter(Boolean);

  const footerLine = '==============================\nمتوفر الآن للطلب والشحن المباشر لكافة محافظات العراق والدفع عند الاستلام.';

  let caption = '';
  let needExtraPromoMessage = false;

  const combinedFullLines = [...headerLines];
  if (descriptionText) {
    combinedFullLines.push(`الوصف والمواصفات:\n${descriptionText}`);
  }
  if (promoText) {
    combinedFullLines.push(`الوصف الترويجي (للإعلان والترويج):\n${promoText}`);
  }
  combinedFullLines.push(footerLine);

  const fullText = combinedFullLines.join('\n');

  if (fullText.length <= 1020) {
    caption = fullText;
  } else {
    needExtraPromoMessage = true;
    const fittedLines = [...headerLines];
    if (descriptionText) {
      fittedLines.push(`الوصف والمواصفات:\n${descriptionText.slice(0, 420)}`);
    }
    fittedLines.push('الوصف الترويجي الكامل مرفق أدناه مباشرة (جاهز للنسخ والإعلان)');
    fittedLines.push(footerLine);
    caption = fittedLines.join('\n').slice(0, 1020);
  }

  // دالة مساعدة لإرسال رسالة الوصف الترويجي التكميلية إن دعت الحاجة
  const sendExtraPromoIfNeeded = async () => {
    if (needExtraPromoMessage && promoText) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            text: `الوصف الترويجي (جاهز للنسخ والإعلان):\n\n${promoText}`,
          }),
        });
      } catch (extraErr) {
        console.warn('تعذر إرسال رسالة الوصف الترويجي الإضافية:', extraErr);
      }
    }
  };

  try {
    // جمع الصور وتصفيتها (بحد أقصى 6 صور للألبوم لضمان سرعة نشر خارقة)
    const rawImages = (product.images && product.images.length > 0)
      ? product.images
      : (product.image ? [product.image] : []);

    const validUrls = rawImages
      .filter(img => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://')))
      .slice(0, 6);

    // 1. إذا كان لدينا أكثر من صورة: إرسالها فوراً كألبوم مجمع بروابطها المباشرة فائقة السرعة
    if (validUrls.length > 1) {
      try {
        const mediaUrls = validUrls.map((url, idx) => ({
          type: 'photo',
          media: url,
          caption: idx === 0 ? caption.slice(0, 1024) : undefined,
        }));

        const groupUrlRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({
            chat_id: channelId,
            media: mediaUrls,
          }),
        });

        const groupUrlData = await groupUrlRes.json();
        if (groupUrlData.ok) {
          await sendExtraPromoIfNeeded();
          const proxyUrls = extractProxyUrlsFromTelegramResult(groupUrlData.result);
          return {
            success: true,
            messageId: Array.isArray(groupUrlData.result) ? groupUrlData.result[0]?.message_id : undefined,
            proxyUrls,
            primaryProxyUrl: proxyUrls[0],
          };
        } else {
          console.warn('تعذر إرسال ألبوم الصور بروابطه المباشرة، جاري المحاولة بالبديل:', groupUrlData.description);
        }
      } catch (groupFallbackErr) {
        console.warn('خطأ في إرسال ألبوم تليغرام المباشر:', groupFallbackErr);
      }
    }

    // 2. إذا كانت صورة واحدة فقط (أو كبديل سريع): إرسالها برابطها المباشر في أجزاء من الثانية
    const singleImageUrl = validUrls[0] || product.image;
    if (singleImageUrl && (singleImageUrl.startsWith('http://') || singleImageUrl.startsWith('https://'))) {
      try {
        const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            photo: singleImageUrl,
            caption: caption.slice(0, 1024),
          }),
        });

        const photoData = await photoRes.json();
        if (photoData.ok) {
          await sendExtraPromoIfNeeded();
          const proxyUrls = extractProxyUrlsFromTelegramResult(photoData.result);
          return { 
            success: true, 
            messageId: photoData.result?.message_id,
            proxyUrls,
            primaryProxyUrl: proxyUrls[0],
          };
        }
      } catch (singleErr) {
        console.warn('خطأ في إرسال الصورة الفردية المباشرة:', singleErr);
      }
    }

    // 3. كحل أخير إذا لم تتوفر صور: إرسال الرسالة النصية
    const msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: caption,
      }),
    });

    const msgData = await msgRes.json();
    if (msgData.ok) {
      await sendExtraPromoIfNeeded();
    }
    return { success: msgData.ok === true, messageId: msgData.result?.message_id, error: msgData.description };
  } catch (err: any) {
    console.error('خطأ في نشر المنتج على قناة تيليجرام:', err);
    return { success: false, error: err.message };
  }
}
