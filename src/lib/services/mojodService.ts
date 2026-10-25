/**
 * خدمة الربط المباشر مع API منصة موجود (mojod.app / rolemall.com)
 */

const MOJOD_BASE_URL = 'https://rolemall.com';
export const DEFAULT_MOJOD_TOKEN = 'yHI04xM';

export interface MojodProductItem {
  _id: number;
  name: string;
  body: string;
  post_body?: string;
  category?: number;
  img: string[];
  price: number;
  oldPrice?: number | null;
  videosLinks?: string[];
}

export interface MojodProductsResponse {
  status: boolean;
  message: string;
  data: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    products: MojodProductItem[];
  };
}

export interface MojodProductDetailsResponse {
  status: boolean;
  message: string;
  data: {
    item_id: number;
    name: string;
    body: string;
    post_body?: string;
    img: string[];
    videosLinks?: string[];
    price: number;
    oldPrice?: number | null;
    category?: number;
  };
}

/**
 * جلب قائمة المنتجات من API موجود
 */
export async function getMojodProducts(options: {
  token?: string;
  page?: number;
  limit?: number;
  category?: number;
  search?: string;
} = {}): Promise<MojodProductsResponse['data'] | null> {
  const token = options.token || process.env.MOJOD_API_TOKEN || DEFAULT_MOJOD_TOKEN;
  const page = options.page || 1;
  const limit = options.limit || 20;

  const url = new URL(`${MOJOD_BASE_URL}/api/products`);
  url.searchParams.set('token', token);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));
  if (options.category) url.searchParams.set('category', String(options.category));
  if (options.search) url.searchParams.set('search', options.search);

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn('فشل جلب منتجات موجود:', res.status, res.statusText);
      return null;
    }

    const data: MojodProductsResponse = await res.json();
    if (data.status && data.data) {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('خطأ في الاتصال بـ API موجود:', err);
    return null;
  }
}

/**
 * جلب تفاصيل منتج محدد من API موجود
 */
export async function getMojodProductDetails(productId: string | number, token?: string): Promise<MojodProductDetailsResponse['data'] | null> {
  const activeToken = token || process.env.MOJOD_API_TOKEN || DEFAULT_MOJOD_TOKEN;
  const url = `${MOJOD_BASE_URL}/api/product-details?product_id=${encodeURIComponent(productId)}&strung=${encodeURIComponent(activeToken)}`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn('فشل جلب تفاصيل منتج موجود:', res.status);
      return null;
    }

    const data: MojodProductDetailsResponse = await res.json();
    if (data.status && data.data) {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('خطأ في جلب تفاصيل منتج موجود:', err);
    return null;
  }
}

/**
 * إرسال طلب شحن مباشر إلى منصة موجود
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
  token?: string;
}): Promise<{ success: boolean; message?: string; data?: any }> {
  const token = orderPayload.token || process.env.MOJOD_API_TOKEN || DEFAULT_MOJOD_TOKEN;
  const url = `${MOJOD_BASE_URL}/api/add-simple-order?token=${encodeURIComponent(token)}`;

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
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (res.ok && (result.status === true || result.success === true)) {
      return { success: true, message: 'تم إرسال الطلب إلى موجود بنجاح للشحن والتجهيز', data: result };
    }
    return { success: false, message: result.message || result.detail || 'تعذر تثبيت الطلب في موجود', data: result };
  } catch (err: any) {
    return { success: false, message: err.message || 'حدث خطأ في الاتصال بسيرفر موجود' };
  }
}
