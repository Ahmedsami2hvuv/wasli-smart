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
 * نشر المنتج المستورد تلقائياً في قناة تيليجرام ككتلة صور مجمعة WebP
 */
export async function publishProductToTelegramChannel(product: {
  name: string;
  image?: string;
  images?: string[];
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
      error: 'متغيرات بيئة بوت تيليجرام أو معرّف القناة غير معينة في فيرسل (TELEGRAM_VAULT_BOT_TOKEN أو TELEGRAM_VAULT_CHANNEL_ID)' 
    };
  }

  const caption = [
    `منتج جديد متاح للتجار: ${product.name}`,
    '==============================',
    `القسم: ${product.category || 'عام'}`,
    product.supplierCode ? `كود المورد: ${product.supplierCode}` : '',
    '------------------------------',
    `سعر الجملة للتاجر: ${product.wholesalePriceIqd.toLocaleString('ar-IQ')} د.ع`,
    `سعر البيع المقترح للزبون: ${product.minPriceIqd.toLocaleString('ar-IQ')} - ${product.maxPriceIqd.toLocaleString('ar-IQ')} د.ع`,
    `هامش ربح التاجر المتوقع: ${(product.minPriceIqd - product.wholesalePriceIqd).toLocaleString('ar-IQ')} - ${(product.maxPriceIqd - product.wholesalePriceIqd).toLocaleString('ar-IQ')} د.ع`,
    '------------------------------',
    product.promoDescription ? `الوصف والمميزات:\n${product.promoDescription.slice(0, 350)}` : '',
    '==============================',
    'متوفر الآن للطلب والشحن المباشر لكافة محافظات العراق والدفع عند الاستلام.'
  ].filter(Boolean).join('\n');

  try {
    // جمع الصور وتصفيتها (بحد أقصى 10 صور لتيليجرام)
    const rawImages = (product.images && product.images.length > 0)
      ? product.images
      : (product.image ? [product.image] : []);

    const validUrls = rawImages
      .filter(img => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://')))
      .slice(0, 10);

    // 1. إذا كان لدينا أكثر من صورة: تنزيلها وضغطها WebP وإرسالها كألبوم صور مجمع (sendMediaGroup)
    if (validUrls.length > 1) {
      try {
        const formData = new FormData();
        formData.append('chat_id', String(channelId));

        const mediaMeta: Array<{ type: string; media: string; caption?: string }> = [];
        let addedCount = 0;

        for (let i = 0; i < validUrls.length; i++) {
          const webpBuffer = await fetchAndOptimizeImage(validUrls[i]);
          if (webpBuffer) {
            const fieldName = `photo_${addedCount}`;
            const blob = new Blob([new Uint8Array(webpBuffer)], { type: 'image/webp' });
            formData.append(fieldName, blob, `product_${addedCount}.webp`);

            mediaMeta.push({
              type: 'photo',
              media: `attach://${fieldName}`,
              caption: addedCount === 0 ? caption.slice(0, 1024) : undefined,
            });
            addedCount++;
          }
        }

        if (mediaMeta.length > 1) {
          formData.append('media', JSON.stringify(mediaMeta));

          const groupRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
            method: 'POST',
            body: formData,
          });

          const groupData = await groupRes.json();
          if (groupData.ok) {
            return {
              success: true,
              messageId: Array.isArray(groupData.result) ? groupData.result[0]?.message_id : undefined,
            };
          } else {
            console.warn('تعذر إرسال ألبوم الصور المضغوط كـ FormData، جاري التجربة بروابط الصور:', groupData.description);
          }
        }
      } catch (albumErr) {
        console.warn('خطأ في معالجة ألبوم الصور المضغوط:', albumErr);
      }

      // بديل إضافي: إرسال ألبوم الصور بروابطها المباشرة
      try {
        const mediaUrls = validUrls.map((url, idx) => ({
          type: 'photo',
          media: url,
          caption: idx === 0 ? caption.slice(0, 1024) : undefined,
        }));

        const groupUrlRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: channelId,
            media: mediaUrls,
          }),
        });

        const groupUrlData = await groupUrlRes.json();
        if (groupUrlData.ok) {
          return {
            success: true,
            messageId: Array.isArray(groupUrlData.result) ? groupUrlData.result[0]?.message_id : undefined,
          };
        }
      } catch (groupFallbackErr) {
        console.warn('تعذر إرسال ألبوم الروابط:', groupFallbackErr);
      }
    }

    // 2. إذا كانت صورة واحدة فقط: ضغطها بصيغة WebP وإرسالها
    const singleImageUrl = validUrls[0] || product.image;
    if (singleImageUrl && (singleImageUrl.startsWith('http://') || singleImageUrl.startsWith('https://'))) {
      const singleWebp = await fetchAndOptimizeImage(singleImageUrl);
      if (singleWebp) {
        const formData = new FormData();
        formData.append('chat_id', String(channelId));
        formData.append('caption', caption.slice(0, 1024));
        formData.append('photo', new Blob([new Uint8Array(singleWebp)], { type: 'image/webp' }), 'product.webp');

        const singleRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });

        const singleData = await singleRes.json();
        if (singleData.ok) {
          return { success: true, messageId: singleData.result?.message_id };
        }
      }

      // بديل مباشر للصورة الواحدة
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
        return { success: true, messageId: photoData.result?.message_id };
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
    return { success: msgData.ok === true, messageId: msgData.result?.message_id, error: msgData.description };
  } catch (err: any) {
    console.error('خطأ في نشر المنتج على قناة تيليجرام:', err);
    return { success: false, error: err.message };
  }
}
