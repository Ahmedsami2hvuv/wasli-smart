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
          promoDescription: item.description,
          specifications: item.description,
          supplierPriceIqd: Number(item.wholesale_price) - 3000,
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
 * جلب منتج محدد بواسطة المعرف أو الرابط (slug)
 */
export async function getProductByIdOrSlug(identifier: string): Promise<Product | null> {
  const products = await getAllProducts();
  const decoded = decodeURIComponent(identifier).toLowerCase();
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
      const { error: insertError } = await dbClient.from('products').insert({
        id: newProduct.id,
        title: newProduct.name,
        slug: newProduct.slug,
        description: newProduct.description,
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
 * جلب منتج محدد بواسطة المعرف
 */
export async function getProductById(id: string): Promise<Product | null> {
  const all = await getAllProducts();
  const found = all.find(p => p.id === id);
  if (found) return found;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          name: data.title || data.name,
          slug: data.slug,
          description: data.description,
          priceIqd: data.price_iqd || data.price,
          wholesalePriceIqd: data.wholesale_price_iqd || data.price,
          minPriceIqd: data.min_price_iqd || data.price,
          maxPriceIqd: data.max_price_iqd || data.price * 1.3,
          promoDescription: data.promo_description || data.description,
          specifications: data.specifications,
          supplierCode: data.supplier_code,
          category: data.category || 'عام',
          image: data.image || '/images/products/placeholder.webp',
          images: Array.isArray(data.images) ? data.images : [],
          isAvailable: true,
          status: 'published',
        };
      }
    } catch (err) {
      console.warn('تعذر جلب المنتج من سوبابيس:', err);
    }
  }

  return null;
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
 * أرشفة منتج أو إيقاف توفره
 */
export async function deleteOrArchiveProduct(id: string): Promise<boolean> {
  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      await dbClient.from('products').delete().eq('id', id);
    } catch (err) {
      console.warn('تعذر حذف المنتج من سوبابيس:', err);
    }
  }

  const idx = localProducts.findIndex(p => p.id === id);
  if (idx !== -1) {
    localProducts.splice(idx, 1);
  }
  return true;
}
