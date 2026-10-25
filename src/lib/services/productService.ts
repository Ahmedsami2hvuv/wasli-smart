import { Product } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mockProducts } from '@/data/mockData';
import crypto from 'crypto';

function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

const CATEGORY_MAP: Record<string, string> = {
  'cat-electronics': '11111111-1111-1111-1111-111111111101',
  'cat-fashion': '11111111-1111-1111-1111-111111111102',
  'cat-perfumes': '11111111-1111-1111-1111-111111111103',
  'cat-home': '11111111-1111-1111-1111-111111111104',
  'cat-iraqi-special': '11111111-1111-1111-1111-111111111105',
};
const initialProducts: Product[] = mockProducts.map((p, idx) => {
  const basePrice = p.priceIqd || 15000;
  const wholesalePrice = Math.round(basePrice * 0.7); // سعر الجملة
  const platformPrice = basePrice; // سعر المنصة الأساسي
  const minPrice = platformPrice; // الحد الأدنى المسموح به
  const maxPrice = Math.round(platformPrice * 1.6); // الحد الأعلى المسموح به

  return {
    ...p,
    wholesalePriceIqd: wholesalePrice,
    platformPriceIqd: platformPrice,
    minPriceIqd: minPrice,
    maxPriceIqd: maxPrice,
    stockQuantity: 50 + (idx * 15),
    isStockTracked: true,
    isAvailable: true,
    status: 'published',
  };
});

let localProducts: Product[] = [...initialProducts];

function mapDbProductToModel(item: any): Product {
  const wholesale = Number(item.wholesale_price) || 0;
  const platform = Number(item.platform_price) || wholesale;
  const minP = Number(item.min_price) || platform;
  const maxP = Number(item.max_price) || Math.round(platform * 1.6);

  const resolveImage = (im: any): string => {
    if (!im) return '';
    if (typeof im === 'string') return im;
    if (im.telegram_file_id) {
      return `/api/images/proxy?fileId=${encodeURIComponent(im.telegram_file_id)}`;
    }
    return im.local_url || im.localUrl || im.image_url || '';
  };

  const sortedImages = Array.isArray(item.images)
    ? [...item.images].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.sort_order || 0) - (b.sort_order || 0);
      })
    : [];

  const primaryImg = sortedImages.length > 0 ? resolveImage(sortedImages[0]) : (item.image || '/placeholder-product.svg');
  const allImages = sortedImages.length > 0 ? sortedImages.map(resolveImage) : (item.images?.map(resolveImage) || []);

  return {
    id: item.id,
    name: item.title || item.name || '',
    slug: item.slug,
    description: item.description || '',
    shortDescription: item.short_description,
    priceIqd: platform,
    wholesalePriceIqd: wholesale,
    platformPriceIqd: platform,
    minPriceIqd: minP,
    maxPriceIqd: maxP,
    stockQuantity: item.stock_quantity ?? 100,
    isStockTracked: item.is_stock_tracked,
    isAvailable: item.is_available,
    status: item.status || 'published',
    image: primaryImg || '/placeholder-product.svg',
    category: (() => {
      const match = (item.description || '').match(/<!--WASLI_CAT_NAMES:([^>]+)-->/);
      return match ? match[1] : (item.category?.name || 'عام');
    })(),
    categoryId: item.category_id,
    subcategoryId: (() => {
      const match = (item.description || '').match(/<!--WASLI_SUBCAT_ID:([^>]+)-->/);
      return match ? match[1] : (item.subcategory_id || undefined);
    })(),
    subcategory: (() => {
      const match = (item.description || '').match(/<!--WASLI_SUBCAT_NAMES?:([^>]+)-->/);
      return match ? match[1] : (item.subcategory || undefined);
    })(),
    promoDescription: (item.description || '').replace(/<!--WASLI_[A-Z_]+:[^>]+-->/g, '').trim(),
    specifications: (item.description || '').replace(/<!--WASLI_[A-Z_]+:[^>]+-->/g, '').trim(),
    supplierPriceIqd: (() => {
      const supplierMatch = (item.description || '').match(/<!--WASLI_SUPPLIER_PRICE:(\d+)-->/);
      return supplierMatch ? Number(supplierMatch[1]) : wholesale;
    })(),
    supplierCode: item.brand || item.metadata?.supplierCode,
    images: allImages,
  };
}

/**
 * جلب جميع المنتجات المتاحة للتسويق في المنصة
 */
export async function getAllProducts(): Promise<Product[]> {
  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      const { data, error } = await dbClient
        .from('products')
        .select(`
          *,
          category:categories(name),
          images:product_images(*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(mapDbProductToModel);
      }
    } catch (e) {
      console.warn('استخدام البيانات المحلية للمنتجات كبديل احتياطي:', e);
    }
  }

  return localProducts;
}

/**
 * جلب المنتجات مقسمة لصفحات (20 منتج في الصفحة) لتوفير استهلاك سوبابيس وفيرسل
 */
export async function getProductsPaginated(options?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.max(1, Math.min(100, options?.limit || 20));
  const search = options?.search?.trim();

  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      let query = dbClient
        .from('products')
        .select(`
          *,
          category:categories(name),
          images:product_images(*)
        `, { count: 'exact' });

      if (search) {
        query = query.or(`title.ilike.%${search}%,brand.ilike.%${search}%,slug.ilike.%${search}%`);
      }

      query = query.order('created_at', { ascending: false });

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (!error && data) {
        const total = count ?? data.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const mappedProducts = data.map(mapDbProductToModel);

        return {
          products: mappedProducts,
          total,
          page,
          limit,
          totalPages,
        };
      }
    } catch (e) {
      console.warn('استخدام البيانات المحلية للمنتجات (تقسيم الصفحات):', e);
    }
  }

  // في حال تعذر الاتصال بسوبابيس، نقسم المنتجات المحلية
  let filtered = [...localProducts];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.supplierCode?.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const from = (page - 1) * limit;
  const products = filtered.slice(from, from + limit);

  return {
    products,
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * جلب منتج محدد بواسطة المعرف أو الرابط (slug) مباشرة وبسرعة فائقة
 */
export async function getProductByIdOrSlug(identifier: string): Promise<Product | null> {
  if (!identifier) return null;
  const decoded = decodeURIComponent(identifier).toLowerCase();

  // فحص الذاكرة المحلية أولاً (0 ميلي ثانية)
  const localFound = localProducts.find(p => p.id === decoded || p.slug?.toLowerCase() === decoded);
  if (localFound) return localFound;

  // الاستعلام المباشر من سوبابيس لهذا المنتج فقط
  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      const { data, error } = await dbClient
        .from('products')
        .select(`
          *,
          category:categories(name),
          images:product_images(*)
        `)
        .or(`id.eq.${decoded},slug.eq.${decoded}`)
        .maybeSingle();

      if (!error && data) {
        const wholesale = Number(data.wholesale_price) || Number(data.wholesale_price_iqd) || 0;
        const platform = Number(data.platform_price) || Number(data.platform_price_iqd) || wholesale;
        const minP = Number(data.min_price) || Number(data.min_price_iqd) || (wholesale > 0 ? wholesale + 5000 : 0);
        const maxP = Number(data.max_price) || Number(data.max_price_iqd) || (minP > 0 ? minP + 15000 : 0);

        // سعر البيع الفعلي للزبون: سعر المنصة أو الحد الأدنى للبيع
        const displayPrice = Number(data.price_iqd) || Number(data.price) || minP || platform || wholesale;

        return {
          id: data.id,
          name: data.title || data.name,
          slug: data.slug,
          description: data.description || '',
          priceIqd: displayPrice,
          wholesalePriceIqd: wholesale,
          platformPriceIqd: platform,
          minPriceIqd: minP,
          maxPriceIqd: maxP,
          promoDescription: data.promo_description || '',
          specifications: data.specifications || data.description,
          supplierCode: data.brand || data.supplier_code,
          category: data.category?.name || data.category || 'عام',
          categoryId: data.category_id,
          subcategory: data.subcategory || '',
          subcategoryId: data.subcategory_id,
          image: data.image || (Array.isArray(data.images) && data.images[0] ? (data.images[0].localUrl || data.images[0].local_url || data.images[0].image_url) : '/images/products/placeholder.webp'),
          images: Array.isArray(data.images) ? data.images.map((img: any) => img.localUrl || img.local_url || img.image_url || img) : [],
          isAvailable: data.is_available ?? true,
          status: data.status || 'published',
          stockQuantity: data.stock_quantity ?? 50,
          colors: data.colors || [],
        };
      }
    } catch (err) {
      console.warn('تعذر جلب المنتج المباشر من سوبابيس:', err);
    }
  }

  // إذا لم يعثر عليه مباشرة نلجأ للقائمة الكاملة كاحتياط
  const products = await getAllProducts();
  return products.find(p => p.id === decoded || p.slug?.toLowerCase() === decoded) || null;
}

/**
 * إضافة منتج جديد بواسطة مدير المنصة
 */
export async function createPlatformProduct(productData: {
  name: string;
  category: string;
  categoryId?: string;
  subcategory?: string;
  subcategoryId?: string;
  description: string;
  shortDescription?: string;
  promoDescription?: string;
  specifications?: string[] | string;
  wholesalePriceIqd: number;
  platformPriceIqd: number;
  minPriceIqd: number;
  maxPriceIqd: number;
  supplierPriceIqd?: number;
  supplierCode?: string;
  supplierSku?: string;
  supplierSource?: string;
  colors?: { name: string; image?: string; stock?: number }[];
  variants?: { id?: string; name: string; sku?: string; price?: number; stock?: number; image?: string }[];
  videoUrl?: string;
  stockQuantity: number;
  image: string;
  images?: string[];
  brand?: string;
}): Promise<Product> {
  const slug = productData.name
    .trim()
    .toLowerCase()
    .replace(/[^\u0621-\u064Aa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') + `-${Date.now().toString().slice(-4)}`;

  const productId = crypto.randomUUID();

  const newProduct: Product = {
    id: productId,
    name: productData.name,
    slug: slug,
    description: productData.description,
    shortDescription: productData.shortDescription || productData.description.slice(0, 80),
    promoDescription: productData.promoDescription || productData.description,
    specifications: productData.specifications,
    priceIqd: productData.platformPriceIqd,
    wholesalePriceIqd: productData.wholesalePriceIqd,
    platformPriceIqd: productData.platformPriceIqd,
    minPriceIqd: productData.minPriceIqd,
    maxPriceIqd: productData.maxPriceIqd,
    supplierPriceIqd: productData.supplierPriceIqd,
    supplierCode: productData.supplierCode,
    supplierSku: productData.supplierSku,
    supplierSource: productData.supplierSource || 'manual',
    colors: productData.colors,
    variants: productData.variants,
    videoUrl: productData.videoUrl,
    stockQuantity: productData.stockQuantity,
    isStockTracked: true,
    isAvailable: true,
    status: 'published',
    image: productData.image,
    images: productData.images?.map((url, i) => ({
      id: crypto.randomUUID(),
      productId: productId,
      localUrl: url,
      isPrimary: i === 0,
      sortOrder: i,
    })),
    category: productData.category,
    categoryId: productData.categoryId,
    subcategory: productData.subcategory,
    subcategoryId: productData.subcategoryId,
    brand: productData.brand,
    createdAt: new Date().toISOString(),
  };

  // التأكد من صحة categoryId بصيغة UUID المتوافقة مع سوبابيس
  let validCategoryId: string | null = null;
  if (productData.categoryId) {
    if (isValidUUID(productData.categoryId)) {
      validCategoryId = productData.categoryId;
    } else if (CATEGORY_MAP[productData.categoryId]) {
      validCategoryId = CATEGORY_MAP[productData.categoryId];
    }
  }

  // مطابقة تلقائية لقسم سوبابيس بواسطة الاسم إن لم يتوفر المعرف
  if (!validCategoryId && productData.category) {
    const catLower = productData.category.toLowerCase();
    if (catLower.includes('منزل') || catLower.includes('أجهزة') || catLower.includes('اجهزة')) {
      validCategoryId = '11111111-1111-1111-1111-111111111104';
    } else if (catLower.includes('إلكترون') || catLower.includes('الكترون') || catLower.includes('هاتف')) {
      validCategoryId = '11111111-1111-1111-1111-111111111101';
    } else if (catLower.includes('أزياء') || catLower.includes('ازياء') || catLower.includes('ملابس')) {
      validCategoryId = '11111111-1111-1111-1111-111111111102';
    } else if (catLower.includes('عطور') || catLower.includes('تجميل') || catLower.includes('عناية')) {
      validCategoryId = '11111111-1111-1111-1111-111111111103';
    }
  }

  // محاولة الإدخال في سوبابيس (باستخدام عميل الإدارة أو العميل العام)
  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      let storedDescription = newProduct.description || '';
      if (newProduct.supplierPriceIqd && newProduct.supplierPriceIqd > 0) {
        storedDescription = `${storedDescription.replace(/<!--WASLI_SUPPLIER_PRICE:\d+-->/g, '').trim()}\n\n<!--WASLI_SUPPLIER_PRICE:${newProduct.supplierPriceIqd}-->`;
      }

      const { error: insertError } = await dbClient.from('products').insert({
        id: newProduct.id,
        title: newProduct.name,
        slug: newProduct.slug,
        description: storedDescription,
        short_description: newProduct.shortDescription,
        wholesale_price: newProduct.wholesalePriceIqd,
        platform_price: newProduct.platformPriceIqd,
        min_price: newProduct.minPriceIqd,
        max_price: newProduct.maxPriceIqd,
        stock_quantity: newProduct.stockQuantity,
        category_id: validCategoryId,
        brand: newProduct.supplierCode || null,
        is_stock_tracked: true,
        is_available: true,
        status: 'published',
      });

      if (insertError) {
        console.warn('تنبيه سوبابيس عند إدخال المنتج:', insertError);
      }

      // حفظ الصور في جدول الصور إذا توفرت
      if (newProduct.images && newProduct.images.length > 0) {
        try {
          await dbClient.from('product_images').insert(
            newProduct.images.map((img, i) => ({
              id: img.id,
              product_id: newProduct.id,
              local_url: img.localUrl,
              is_primary: i === 0,
              sort_order: i,
            }))
          );
        } catch (imgErr) {
          console.warn('تعذر حفظ صور المنتج في جدول product_images:', imgErr);
        }
      }
    } catch (dbErr) {
      console.warn('تعذر الحفظ المباشر في سوبابيس، تم الاكتفاء بالحفظ المحلي النشط:', dbErr);
    }
  }

  localProducts.unshift(newProduct);
  return newProduct;
}

/**
 * جلب منتج محدد بواسطة المعرف بسرعة فائقة
 */
export async function getProductById(id: string): Promise<Product | null> {
  return getProductByIdOrSlug(id);
}

/**
 * تعديل منتج قائم
 */
export async function updatePlatformProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      const updateData: any = {};
      if (updates.name) updateData.title = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.shortDescription) updateData.short_description = updates.shortDescription;
      if (updates.wholesalePriceIqd !== undefined) updateData.wholesale_price = updates.wholesalePriceIqd;
      if (updates.platformPriceIqd !== undefined) updateData.platform_price = updates.platformPriceIqd;
      if (updates.minPriceIqd !== undefined) updateData.min_price = updates.minPriceIqd;
      if (updates.maxPriceIqd !== undefined) updateData.max_price = updates.maxPriceIqd;
      if (updates.stockQuantity !== undefined) updateData.stock_quantity = updates.stockQuantity;
      if (updates.categoryId) updateData.category_id = updates.categoryId;
      if (updates.status) updateData.status = updates.status;
      if (updates.isAvailable !== undefined) updateData.is_available = updates.isAvailable;

      if (updates.supplierPriceIqd !== undefined || updates.subcategoryId !== undefined || updates.subcategory !== undefined || updates.category !== undefined) {
        const { data: curr } = await dbClient.from('products').select('description').eq('id', id).maybeSingle();
        let baseDesc = ((updates.description !== undefined ? updates.description : curr?.description) || '');
        
        if (updates.supplierPriceIqd !== undefined) {
          baseDesc = baseDesc.replace(/<!--WASLI_SUPPLIER_PRICE:\d+-->/g, '').trim();
          if (updates.supplierPriceIqd > 0) {
            baseDesc += `\n\n<!--WASLI_SUPPLIER_PRICE:${updates.supplierPriceIqd}-->`;
          }
        }

        if (updates.category !== undefined) {
          baseDesc = baseDesc.replace(/<!--WASLI_CAT_NAMES:[^>]+-->/g, '').trim();
          if (updates.category && updates.category !== 'عام') {
            baseDesc += `\n<!--WASLI_CAT_NAMES:${updates.category}-->`;
          }
        }

        if (updates.subcategoryId !== undefined) {
          baseDesc = baseDesc.replace(/<!--WASLI_SUBCAT_ID:[^>]+-->/g, '').trim();
          if (updates.subcategoryId) {
            baseDesc += `\n<!--WASLI_SUBCAT_ID:${updates.subcategoryId}-->`;
          }
        }

        if (updates.subcategory !== undefined) {
          baseDesc = baseDesc.replace(/<!--WASLI_SUBCAT_NAMES?:[^>]+-->/g, '').trim();
          if (updates.subcategory) {
            baseDesc += `\n<!--WASLI_SUBCAT_NAMES:${updates.subcategory}-->`;
          }
        }

        updateData.description = baseDesc.trim();
      }

      await dbClient.from('products').update(updateData).eq('id', id);
    } catch (err) {
      console.warn('تعذر تحديث المنتج في سوبابيس:', err);
    }
  }

  const idx = localProducts.findIndex(p => p.id === id);
  if (idx !== -1) {
    localProducts[idx] = {
      ...localProducts[idx],
      ...updates,
    };
    return localProducts[idx];
  }

  return getProductById(id);
}

/**
 * أرشفة منتج أو حذفه نهائياً
 */
export async function deleteOrArchiveProduct(id: string): Promise<boolean> {
  return deleteProducts([id]);
}

/**
 * حذف مجموعة من المنتجات دفعة واحدة نهائياً من سوبابيس والذاكرة المحلية
 */
export async function deleteProducts(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;

  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      // 1. حذف عناصر الطلبات المرتبطة لفك قيد المفتاح الأجنبي (Foreign Key)
      await dbClient.from('order_items').delete().in('product_id', ids);
    } catch (err) {}

    try {
      // 2. حذف ارتباطات صور المنتجات
      await dbClient.from('product_images').delete().in('product_id', ids);
    } catch (err) {}

    try {
      // 3. حذف ارتباطات المنتجات في المتاجر إن وجدت
      await dbClient.from('store_products').delete().in('product_id', ids);
    } catch (err) {}

    try {
      // 4. حذف المنتجات من جدول products
      await dbClient.from('products').delete().in('id', ids);
    } catch (err) {
      console.warn('تعذر حذف المنتجات من سوبابيس:', err);
    }
  }

  // 5. الحذف من الذاكرة المحلية
  const idSet = new Set(ids);
  for (let i = localProducts.length - 1; i >= 0; i--) {
    if (idSet.has(localProducts[i].id)) {
      localProducts.splice(i, 1);
    }
  }

  return true;
}

/**
 * حذف جميع منتجات المنصة بالكامل من سوبابيس والذاكرة المحلية
 */
export async function deleteAllProducts(): Promise<boolean> {
  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      // 1. حذف عناصر الطلبات لفك قيد المفتاح الأجنبي حتى لا يعيق حذف المنتجات
      await dbClient.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {}

    try {
      // 2. حذف كافة صور المنتجات
      await dbClient.from('product_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {}

    try {
      // 3. حذف كافة ارتباطات المنتجات في متاجر التجار
      await dbClient.from('store_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {}

    try {
      // 4. حذف كافة المنتجات من جدول products
      await dbClient.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn('تعذر حذف كافة المنتجات من سوبابيس:', err);
    }
  }

  // 5. تفريغ الذاكرة المحلية كلياً
  localProducts.length = 0;
  return true;
}

/**
 * معالجة ورفع أرباح كافة المنتجات التي يقل ربح المنصة فيها عن الحد المطلوب (افتراضياً 3,000 د.ع)
 */
export async function fixLowProfitProducts(targetMinProfit = 3000): Promise<{ updatedCount: number; products: Product[] }> {
  const allProducts = await getAllProducts();
  const updatedProducts: Product[] = [];

  for (const p of allProducts) {
    const wholesale = Number(p.wholesalePriceIqd) || 0;
    const supplier = Number(p.supplierPriceIqd) || 0;
    const currentProfit = wholesale - supplier;

    if (currentProfit < targetMinProfit) {
      const diff = targetMinProfit - currentProfit;
      const newWholesale = wholesale + diff;
      const currentMax = Number(p.maxPriceIqd) || 0;
      const newPlatform = Math.max(Number(p.platformPriceIqd || 0) + diff, newWholesale);
      const newMinPrice = Math.max(Number(p.minPriceIqd || 0) + diff, newWholesale);
      // الحد الأعلى للتاجر يبقى نفسه تماماً بدون زيادة
      const newMaxPrice = currentMax > 0 ? Math.max(currentMax, newMinPrice) : (newMinPrice + 5000);

      await updatePlatformProduct(p.id, {
        wholesalePriceIqd: newWholesale,
        platformPriceIqd: newPlatform,
        minPriceIqd: newMinPrice,
        maxPriceIqd: newMaxPrice,
      });

      updatedProducts.push({
        ...p,
        wholesalePriceIqd: newWholesale,
        platformPriceIqd: newPlatform,
        minPriceIqd: newMinPrice,
        maxPriceIqd: newMaxPrice,
      });
    }
  }

  return { updatedCount: updatedProducts.length, products: updatedProducts };
}

/**
 * البحث عن منتج بواسطة كود المورد (كود فدشي) للتأكد من وجوده مسبقاً
 */
export async function findProductBySupplierCode(code: string): Promise<any | null> {
  if (!code) return null;
  const cleanCode = code.trim().toLowerCase();

  // 1. البحث الدقيق في الذاكرة المؤقتة بكود المورد فقط
  const localMatch = localProducts.find(p => 
    p.supplierCode?.toLowerCase() === cleanCode || 
    p.brand?.toLowerCase() === cleanCode
  );
  if (localMatch) return localMatch;

  // 2. البحث الدقيق في سوبابيس بحقل brand (كود المورد الحقيقي)
  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      const { data, error } = await dbClient
        .from('products')
        .select('*')
        .eq('brand', code.trim())
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          name: data.title,
          wholesalePriceIqd: Number(data.wholesale_price) || 0,
          platformPriceIqd: Number(data.platform_price) || 0,
          minPriceIqd: Number(data.min_price) || 0,
          maxPriceIqd: Number(data.max_price) || 0,
          supplierCode: data.brand,
          slug: data.slug,
        };
      }
    } catch (err) {
      console.warn('تعذر البحث عن كود المورد في سوبابيس:', err);
    }
  }

  return null;
}

export interface DuplicateGroup {
  id: string;
  title: string;
  reason: string;
  score: number;
  products: Product[];
}

export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function areProductsSimilar(p1: Product, p2: Product): { isSimilar: boolean; reason: string; score: number } {
  if (p1.id === p2.id) return { isSimilar: false, reason: '', score: 0 };

  // 1. تطابق كود المورد
  const code1 = (p1.supplierCode || '').trim().toLowerCase();
  const code2 = (p2.supplierCode || '').trim().toLowerCase();
  if (code1 && code2 && code1 === code2) {
    return { isSimilar: true, reason: 'تطابق كود المورد (' + code1 + ')', score: 1.0 };
  }

  // 2. تطابق رابط الصورة الأساسية أو أي صورة في المعرض
  const isRealImg = (url: string) => typeof url === 'string' && url.trim().length > 0 && !url.includes('placeholder') && !url.includes('data:image');
  
  const getProductImageUrls = (prod: Product): string[] => {
    const urls: string[] = [];
    if (prod.image && isRealImg(prod.image)) urls.push(prod.image.trim());
    if (Array.isArray(prod.images)) {
      prod.images.forEach((im: any) => {
        const u = typeof im === 'string' ? im : (im?.localUrl || im?.local_url);
        if (u && isRealImg(u)) urls.push(u.trim());
      });
    }
    return urls;
  };

  const imgs1 = getProductImageUrls(p1);
  const imgs2 = getProductImageUrls(p2);

  if (imgs1.length > 0 && imgs2.length > 0) {
    const hasSameImg = imgs1.some(u1 => imgs2.includes(u1));
    if (hasSameImg) {
      return { isSimilar: true, reason: 'تطابق صورة المنتج مع منتج آخر', score: 0.95 };
    }
  }

  // 4. فحص تشابه الأسماء
  const n1 = normalizeArabicText(p1.name);
  const n2 = normalizeArabicText(p2.name);
  if (!n1 || !n2) return { isSimilar: false, reason: '', score: 0 };

  if (n1 === n2) {
    return { isSimilar: true, reason: 'تطابق تام في اسم المنتج', score: 1.0 };
  }

  // إذا كان أحد الاسمين يحتوي الآخر كاملاً وطوله أكثر من 7 أحرف
  if ((n1.includes(n2) || n2.includes(n1)) && Math.min(n1.length, n2.length) >= 7) {
    return { isSimilar: true, reason: 'تطابق أجزاء الاسم الأساسي', score: 0.88 };
  }

  const words1 = n1.split(' ').filter(w => w.length > 1);
  const words2 = n2.split(' ').filter(w => w.length > 1);
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  if (set1.size >= 2 && set2.size >= 2) {
    let intersection = 0;
    set1.forEach(w => {
      if (set2.has(w)) intersection++;
    });
    const overlap = intersection / Math.min(set1.size, set2.size);
    const unionSize = new Set(words1.concat(words2)).size;
    const jaccard = unionSize > 0 ? intersection / unionSize : 0;

    if (overlap >= 0.75 && intersection >= 2) {
      const pct = Math.round(overlap * 100);
      return { isSimilar: true, reason: `تشابه قوي في كلمات الاسم (${pct}%)`, score: overlap };
    }

    if (jaccard >= 0.60) {
      const pct = Math.round(jaccard * 100);
      return { isSimilar: true, reason: `تشابه في الاسم بنسبة (${pct}%)`, score: jaccard };
    }
  }

  return { isSimilar: false, reason: '', score: 0 };
}

export function findDuplicateProductGroups(allProducts: Product[]): DuplicateGroup[] {
  const visited = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (let i = 0; i < allProducts.length; i++) {
    const p1 = allProducts[i];
    if (visited.has(p1.id)) continue;

    const cluster: Product[] = [p1];
    let topReason = '';
    let highestScore = 0;

    for (let j = i + 1; j < allProducts.length; j++) {
      const p2 = allProducts[j];
      if (visited.has(p2.id)) continue;

      const res = areProductsSimilar(p1, p2);
      if (res.isSimilar) {
        cluster.push(p2);
        visited.add(p2.id);
        if (res.score > highestScore) {
          highestScore = res.score;
          topReason = res.reason;
        }
      }
    }

    if (cluster.length > 1) {
      visited.add(p1.id);
      groups.push({
        id: `dup-${p1.id}`,
        title: p1.name,
        reason: topReason || 'تشابه في تفاصيل المنتج',
        score: highestScore,
        products: cluster,
      });
    }
  }

  return groups;
}
