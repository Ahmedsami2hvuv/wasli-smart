export interface DropPrimeRawProduct {
  id: string;
  name: string;
  category?: string;
  wholesalePrice: number;
  minCustomerPrice: number;
  maxCustomerPrice?: number;
  suggestedMargin?: number;
  stock?: number;
  colorStock?: Record<string, number>;
  colors?: string[];
  isOutofStock?: boolean;
  image: string;
  description?: string;
  marketingCopy?: string;
  promoMedia?: string[];
  videoUrls?: string[];
  tags?: string[];
  isBestSeller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  deliveryFee?: number;
  sku?: string;
  salesCount?: number;
  rating?: number;
  createdAt?: string;
}

export interface DropPrimeParsedProduct {
  supplierCode: string;
  supplierSku: string;
  name: string;
  category: string;
  description: string;
  promoDescription: string;
  specifications: string;
  supplierCost: number;       // تكلفة المورد من دروب برايم (مثال 20,000)
  wholesalePrice: number;     // سعر جملة وصلي للتاجر = أقل سعر بيع حدده دروب برايم (مثال 25,000)
  minCustomerPrice: number;   // أقل سعر بيع مقترح للزبون (مثال 30,000)
  maxCustomerPrice: number;   // أعلى سعر بيع مقترح (مثال 100,000 أو فما فوق)
  platformProfit: number;     // ربح المنصة (مثال 5,000)
  merchantProfit: number;     // ربح التاجر المتوقع (مثال 5,000 فما فوق)
  primaryImage: string;
  images: string[];
  videoUrl?: string;
  stockQuantity: number;
  colors?: string[];
  variants?: Array<{ id: string; name: string; image: string; stock: number }>;
}

const DROP_PRIME_API_URL = 'https://dropprime.site/api/products';

/**
 * جلب جميع منتجات دروب برايم من الـ API العام
 */
export async function fetchAllDropPrimeProducts(): Promise<DropPrimeRawProduct[]> {
  try {
    const res = await fetch(DROP_PRIME_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      throw new Error(`تعذر جلب منتجات دروب برايم: رمز الاستجابة ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data.products || []);
  } catch (err: any) {
    console.error('خطأ في جلب منتجات دروب برايم:', err);
    return [];
  }
}

/**
 * جلب تفاصيل منتج معين من دروب برايم عبر المعرّف أو كود SKU
 */
export async function fetchDropPrimeProductDetails(idOrSku: string): Promise<DropPrimeRawProduct | null> {
  if (!idOrSku) return null;
  const cleanId = idOrSku.trim();

  // 1. محاولة الجلب المباشر بالـ ID
  try {
    const res = await fetch(`${DROP_PRIME_API_URL}/${encodeURIComponent(cleanId)}?_t=${Date.now()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.name) return data;
    }
  } catch (e) {
    // محاولة بديلة عبر القائمة الكاملة
  }

  // 2. إذا لم يعثر عليه مباشرة أو كان الكود هو SKU، نبحث في القائمة العامة
  const all = await fetchAllDropPrimeProducts();
  const found = all.find(p => 
    String(p.id) === cleanId || 
    String(p.sku || '').toLowerCase() === cleanId.toLowerCase()
  );

  return found || null;
}

/**
 * تطبيق المعادلة المالية المعتمدة لمنصة وصلي الخاصة بمورد «دروب برايم»:
 * - سعر المورد (التكلفة) = wholesalePrice
 * - سعر جملة وصلي للمنصة والتاجر = minCustomerPrice
 * - أقل سعر بيع للتاجر للزبون = wholesalePriceIqd + 5000 (لضمان ربح 5,000 د.ع كحد أدنى)
 * - أعلى سعر بيع للزبون = مفتوح (بحد أقصى مرن)
 */
export function parseDropPrimeProduct(raw: DropPrimeRawProduct): DropPrimeParsedProduct {
  const supplierCost = Number(raw.wholesalePrice) || 0;
  
  // سعر جملة وصلي = أقل سعر بيع حدده دروب برايم
  const rawMinPrice = Number(raw.minCustomerPrice) || 0;
  let wholesalePrice = rawMinPrice;
  
  // إذا كان أقل سعر بيع مساوياً للتكلفة أو غير منطقي، نضمن هامش ربح للمنصة 5,000 د.ع
  if (wholesalePrice <= supplierCost) {
    wholesalePrice = supplierCost + 5000;
  }

  // ربح المنصة = (سعر جملة وصلي - تكلفة دروب برايم)
  const platformProfit = wholesalePrice - supplierCost;

  // أقل سعر لبيع التاجر للزبون = (سعر جملة وصلي + 5,000 د.ع)
  const minCustomerPrice = wholesalePrice + 5000;

  // أعلى سعر لبيع التاجر = مفتوح (نحدد 100,000 د.ع كحد أقصى مرن أو ما حدده المورد)
  const rawMaxPrice = Number(raw.maxCustomerPrice) || 0;
  const maxCustomerPrice = Math.max(rawMaxPrice, wholesalePrice + 50000, 100000);

  // ربح التاجر المبدئي
  const merchantProfit = minCustomerPrice - wholesalePrice;

  // تجميع كافة الصور الترويجية في مصفوفة واحدة
  const images: string[] = [];
  if (raw.image && raw.image.startsWith('http')) {
    images.push(raw.image.trim());
  }

  if (Array.isArray(raw.promoMedia)) {
    for (const m of raw.promoMedia) {
      if (typeof m === 'string' && m.startsWith('http') && !images.includes(m.trim())) {
        images.push(m.trim());
      }
    }
  }

  const primaryImage = images[0] || raw.image || '/placeholder-product.svg';

  // معالجة الفيديو
  let videoUrl: string | undefined = undefined;
  if (Array.isArray(raw.videoUrls) && raw.videoUrls.length > 0) {
    videoUrl = raw.videoUrls[0];
  }

  // إعداد المتغيرات والألوان والمخزون
  const colorsList = Array.isArray(raw.colors) ? raw.colors : [];
  const colorStockMap = raw.colorStock || {};
  const variants = colorsList.map((colorName, idx) => ({
    id: `variant-dp-${idx}`,
    name: colorName,
    image: primaryImage,
    stock: typeof colorStockMap[colorName] === 'number' ? colorStockMap[colorName] : 20,
  }));

  const promoDescription = (raw.marketingCopy || raw.description || raw.name).trim();
  const specifications = (raw.description || raw.marketingCopy || raw.name).trim();

  return {
    supplierCode: String(raw.sku || raw.id).trim(),
    supplierSku: String(raw.sku || raw.id).trim(),
    name: raw.name.trim(),
    category: (raw.category || 'منتجات عامة').trim(),
    description: specifications,
    promoDescription: promoDescription,
    specifications: specifications,
    supplierCost,
    wholesalePrice,
    minCustomerPrice,
    maxCustomerPrice,
    platformProfit,
    merchantProfit,
    primaryImage,
    images,
    videoUrl,
    stockQuantity: Number(raw.stock) || 50,
    colors: colorsList,
    variants,
  };
}
