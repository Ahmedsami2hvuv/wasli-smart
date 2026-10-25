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
        return data.map(item => ({
          id: item.id,
          name: item.title,
          slug: item.slug,
          description: item.description,
          shortDescription: item.short_description,
          priceIqd: Number(item.platform_price),
          wholesalePriceIqd: Number(item.wholesale_price),
          platformPriceIqd: Number(item.platform_price),
          minPriceIqd: Number(item.min_price),
          maxPriceIqd: Number(item.max_price),
          stockQuantity: item.stock_quantity,
          isStockTracked: item.is_stock_tracked,
          isAvailable: item.is_available,
          status: item.status,
          image: item.images?.[0]?.local_url || '/placeholder-product.svg',
          category: item.category?.name || 'عام',
          categoryId: item.category_id,
          promoDescription: (item.description || '').replace(/<!--WASLI_SUPPLIER_PRICE:\d+-->/g, '').trim(),
          specifications: (item.description || '').replace(/<!--WASLI_SUPPLIER_PRICE:\d+-->/g, '').trim(),
          supplierPriceIqd: (() => {
            const supplierMatch = (item.description || '').match(/<!--WASLI_SUPPLIER_PRICE:(\d+)-->/);
            if (supplierMatch) return Number(supplierMatch[1]);
            return Number(item.wholesale_price) || 0;
          })(),
          supplierCode: item.brand || item.metadata?.supplierCode,
          images: item.images?.map((im: any) => im.local_url) || [],
        }));
      }
    } catch (e) {
      console.warn('استخدام البيانات المحلية للمنتجات كبديل احتياطي:', e);
    }
  }

  return localProducts;
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

      if (updates.supplierPriceIqd !== undefined) {
        const { data: curr } = await dbClient.from('products').select('description').eq('id', id).maybeSingle();
        const baseDesc = ((updates.description !== undefined ? updates.description : curr?.description) || '').replace(/<!--WASLI_SUPPLIER_PRICE:\d+-->/g, '').trim();
        updateData.description = `${baseDesc}\n\n<!--WASLI_SUPPLIER_PRICE:${updates.supplierPriceIqd}-->`;
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
      // 1. حذف ارتباطات المنتجات في المتاجر إن وجدت
      await dbClient.from('store_products').delete().in('product_id', ids);
    } catch (err) {
      // تجاهل إذا كان الجدول غير موجود
    }

    try {
      // 2. حذف المنتجات من جدول products
      await dbClient.from('products').delete().in('id', ids);
    } catch (err) {
      console.warn('تعذر حذف المنتجات من سوبابيس:', err);
    }
  }

  // 3. الحذف من الذاكرة المحلية
  const idSet = new Set(ids);
  for (let i = localProducts.length - 1; i >= 0; i--) {
    if (idSet.has(localProducts[i].id)) {
      localProducts.splice(i, 1);
    }
  }

  return true;
}

/**
 * البحث عن منتج بواسطة كود المورد (كود فدشي) للتأكد من وجوده مسبقاً
 */
export async function findProductBySupplierCode(code: string): Promise<any | null> {
  if (!code) return null;
  const cleanCode = code.trim().toLowerCase();

  // 1. البحث في الذاكرة المؤقتة
  const localMatch = localProducts.find(p => 
    p.supplierCode?.toLowerCase() === cleanCode || 
    p.slug?.toLowerCase().includes(cleanCode) ||
    p.id?.toLowerCase() === cleanCode
  );
  if (localMatch) return localMatch;

  // 2. البحث في سوبابيس
  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      const { data, error } = await dbClient
        .from('products')
        .select('*')
        .or(`brand.eq.${code.trim()},slug.ilike.%${cleanCode}%,title.ilike.%${cleanCode}%`)
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
