/**
 * خدمة الربط المباشر والتوثيق الرسمي مع سيرفر منصة موجود (mojod.app)
 */

const MOJOD_APP_BASE_URL = 'https://www.mojod.app';
const MOJOD_IMAGE_BASE_URL = 'https://mojod.app/images';

// بيانات الحساب الرسمي للأدمن
const MOJOD_DEFAULT_PHONE = process.env.MOJOD_PHONE || '+9647733921468';
const MOJOD_DEFAULT_PASSWORD = process.env.MOJOD_PASSWORD || 'AHMEDHLAWAADAHAM';

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * الحصول على توكن المصادقة الرسمي بحساب الأدمن وتجديده تلقائياً
 */
export async function getMojodAuthToken(): Promise<string | null> {
  // إذا كان التوكن صالحاً ولم يمر عليه أكثر من 12 ساعة
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  try {
    const res = await fetch(`${MOJOD_APP_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        phone: MOJOD_DEFAULT_PHONE,
        password: MOJOD_DEFAULT_PASSWORD,
      }),
    });

    const data = await res.json();
    if (data && data.status && data.data && data.data.token) {
      cachedToken = data.data.token;
      // صلاحية التوكن 12 ساعة
      tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
      return cachedToken;
    }

    console.warn('فشل تسجيل الدخول في موچود:', data);
    return null;
  } catch (err) {
    console.error('خطأ أثناء تسجيل الدخول في موچود:', err);
    return null;
  }
}

export interface MojodItem {
  _id: number;
  name: string;
  category: number;
  price: number;       // تكلفة المورد بالجملة (مثال: 6000 د.ع)
  lowPrice: number;    // أقل سعر بيع مسموح (مثال: 12000 د.ع) = سعر جملة وصلي للتاجر
  highPrice: number;   // أعلى سعر بيع مسموح (مثال: 25000 د.ع) = سقف بيع الزبون
  oldPrice?: number;
  img: string[];       // أسماء الصور (مثل aJNkK2uX0A.jpg) أو روابط كاملة
  body?: string;       // تفاصيل ومواصفات المنتج
  post_body?: string;  // كليشة الإعلان والتسويق لقناة التليغرام
  videosLinks?: string[];
  stockQuantity?: number;
}

export interface MojodProductsResponseData {
  page: number;
  limit: number;
  total: number;
  pages: number;
  products: MojodItem[];
}

/**
 * تحويل اسم الصورة إلى رابط مباشر كامل
 */
export function formatMojodImageUrl(imgNameOrUrl: string): string {
  if (!imgNameOrUrl) return '/placeholder-product.svg';
  if (imgNameOrUrl.startsWith('http://') || imgNameOrUrl.startsWith('https://')) {
    return imgNameOrUrl;
  }
  return `${MOJOD_IMAGE_BASE_URL}/${imgNameOrUrl.replace(/^\/+/, '')}`;
}

/**
 * جلب قائمة المنتجات من سيرفر موجود الرسمي بالأسعار الحقيقية الدقيقة
 */
export async function getMojodProducts(options: {
  page?: number;
  limit?: number;
  search?: string;
  category?: number;
} = {}): Promise<MojodProductsResponseData | null> {
  const token = await getMojodAuthToken();
  const page = options.page || 1;
  const limit = options.limit || 50;

  const url = new URL(`${MOJOD_APP_BASE_URL}/items/all`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  if (options.search && options.search.trim()) {
    url.searchParams.set('search', options.search.trim());
  }
  if (options.category) {
    url.searchParams.set('category', String(options.category));
  }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      console.warn('فشل جلب قائمة منتجات موجود:', res.status, res.statusText);
      return null;
    }

    const json = await res.json();
    if (!json || json.status === false || !json.data) {
      return null;
    }

    const rawItems: any[] = Array.isArray(json.data.items) ? json.data.items : [];
    const products: MojodItem[] = rawItems.map(item => {
      const rawImgs = Array.isArray(item.img) ? item.img : (item.img ? [item.img] : []);
      const formattedImgs = rawImgs.map((im: string) => formatMojodImageUrl(im));

      return {
        _id: Number(item._id || item.id),
        name: (item.name || '').trim(),
        category: Number(item.category) || 0,
        price: Number(item.price) || 0,
        lowPrice: Number(item.lowPrice) || 0,
        highPrice: Number(item.highPrice) || 0,
        oldPrice: Number(item.oldPrice) || 0,
        img: formattedImgs,
        body: item.body || '',
        post_body: item.post_body || '',
        videosLinks: Array.isArray(item.videosLinks) ? item.videosLinks : [],
        stockQuantity: Number(item.the_count_in_us) || 50,
      };
    });

    const total = Number(json.data.total) || products.length;
    const pages = Number(json.data.pages || json.data.total_pages) || Math.ceil(total / limit);

    return {
      page: Number(json.data.page) || page,
      limit: Number(json.data.limit) || limit,
      total,
      pages,
      products,
    };
  } catch (err) {
    console.error('خطأ في الاتصال بسيرفر موجود:', err);
    return null;
  }
}

/**
 * جلب تفاصيل منتج محدد بدقة من سيرفر موجود الرسمي
 */
export async function getMojodProductDetails(productId: string | number): Promise<MojodItem | null> {
  const token = await getMojodAuthToken();
  const cleanId = String(productId).trim();
  const url = `${MOJOD_APP_BASE_URL}/items/${encodeURIComponent(cleanId)}`;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn('تعذر جلب تفاصيل المنتج من موجود:', res.status);
      return null;
    }

    const json = await res.json();
    const item = json.data || json.item;
    if (!item) return null;

    const rawImgs = Array.isArray(item.img) ? item.img : (item.img ? [item.img] : []);
    const formattedImgs = rawImgs.map((im: string) => formatMojodImageUrl(im));

    return {
      _id: Number(item._id || item.id || cleanId),
      name: (item.name || '').trim(),
      category: Number(item.category) || 0,
      price: Number(item.price) || 0,
      lowPrice: Number(item.lowPrice) || 0,
      highPrice: Number(item.highPrice) || 0,
      oldPrice: Number(item.oldPrice) || 0,
      img: formattedImgs,
      body: item.body || '',
      post_body: item.post_body || '',
      videosLinks: Array.isArray(item.videosLinks) ? item.videosLinks : [],
      stockQuantity: Number(item.the_count_in_us) || 50,
    };
  } catch (err) {
    console.error('خطأ في جلب تفاصيل المنتج من موجود:', err);
    return null;
  }
}

/**
 * إرسال وتثبيت طلب شحن مباشر إلى منصة موجود
 */
export async function sendOrderToMojod(orderPayload: {
  customerName: string;
  phone1: string;
  phone2?: string;
  governorate: string;
  address: string;
  mojodItemId: number;
  totalSellingPrice: number;
  quantity: number;
  note?: string;
}): Promise<{ success: boolean; message?: string; data?: any }> {
  const token = await getMojodAuthToken();
  const url = `${MOJOD_APP_BASE_URL}/orders/add`;

  const body = {
    cus_name: orderPayload.customerName,
    cus_num1: orderPayload.phone1,
    capetel: orderPayload.phone2 || orderPayload.phone1,
    city: orderPayload.governorate,
    address: `${orderPayload.governorate} - ${orderPayload.address}`,
    item_id: Number(orderPayload.mojodItemId),
    all_price: Number(orderPayload.totalSellingPrice),
    count: Number(orderPayload.quantity) || 1,
    note: orderPayload.note || '',
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (res.ok && (result.status === true || result.success === true)) {
      return { success: true, message: 'تم إرسال الطلب إلى موجود بنجاح للشحن والتجهيز', data: result };
    }
    return { success: false, message: result.message || 'تعذر تثبيت الطلب في موجود', data: result };
  } catch (err: any) {
    return { success: false, message: err.message || 'حدث خطأ في الاتصال بسيرفر موجود' };
  }
}
