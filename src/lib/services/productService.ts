import { Product } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { mockProducts } from '@/data/mockData';

// منتجات المنصة الأولية مع تفاصيل التسعير والعمولات
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
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name),
          images:product_images(*)
        `)
        .eq('status', 'published')
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
          image: item.images?.[0]?.local_url || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80',
          category: item.category?.name || 'عام',
          categoryId: item.category_id,
          promoDescription: item.metadata?.promoDescription || item.description,
          specifications: item.metadata?.specifications || null,
          supplierPriceIqd: item.metadata?.supplierPriceIqd ? Number(item.metadata.supplierPriceIqd) : undefined,
          supplierCode: item.metadata?.supplierCode,
          colors: item.metadata?.colors,
          variants: item.metadata?.variants,
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

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
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
      id: `img-${Date.now()}-${i}`,
      productId: `prod-${Date.now()}`,
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

  // محاولة الإدخال في سوبابيس إن كان مهيأ
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('products').insert({
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
        category_id: newProduct.categoryId || null,
        status: 'published',
        metadata: {
          supplierPriceIqd: newProduct.supplierPriceIqd,
          supplierCode: newProduct.supplierCode,
          supplierSku: newProduct.supplierSku,
          supplierSource: newProduct.supplierSource,
          promoDescription: newProduct.promoDescription,
          specifications: newProduct.specifications,
          colors: newProduct.colors,
          variants: newProduct.variants,
          videoUrl: newProduct.videoUrl,
          images: productData.images,
        }
      });

      // حفظ الصور في جدول الصور إذا توفرت
      if (newProduct.images && newProduct.images.length > 0) {
        try {
          await supabase.from('product_images').insert(
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
  const idx = localProducts.findIndex(p => p.id === id);
  if (idx === -1) return null;

  localProducts[idx] = {
    ...localProducts[idx],
    ...updates,
  };

  return localProducts[idx];
}

/**
 * أرشفة منتج أو إيقاف توفره
 */
export async function deleteOrArchiveProduct(id: string): Promise<boolean> {
  const product = localProducts.find(p => p.id === id);
  if (!product) return false;

  product.status = 'archived';
  product.isAvailable = false;
  return true;
}
