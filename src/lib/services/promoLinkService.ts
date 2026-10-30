import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export interface PromoLinkOrder {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  quantity: number;
  totalPrice: number;
  profit: number;
  status: 'pending' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface PromoLink {
  id: string;
  storeCode: string;
  storeName: string;
  productId: string;
  productName: string;
  productImage: string;
  sellingPrice: number;
  wholesalePrice: number;
  profitPerItem: number;
  youtubeUrl?: string;
  url: string;
  visitsCount: number;
  ordersCount: number;
  completedOrdersCount: number;
  conversionRate: number;
  totalRevenue: number;
  totalProfit: number;
  orders: PromoLinkOrder[];
  createdAt: string;
  updatedAt: string;
}

const CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'promoLinksCache.json');
const SETTINGS_KEY_PREFIX = 'promo_link:';

function getActiveSupabase() {
  if (isSupabaseAdminConfigured && supabaseAdmin) return supabaseAdmin;
  if (isSupabaseConfigured) return supabase;
  return null;
}

function settingsKey(storeCode: string, productId: string) {
  return `${SETTINGS_KEY_PREFIX}${storeCode.toLowerCase().trim()}:${productId.trim()}`;
}

function loadCachedLinks(): PromoLink[] {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      if (Array.isArray(parsed)) return parsed as PromoLink[];
    }
  } catch {
    // تجاهل أخطاء القراءة
  }
  return [];
}

function saveCachedLinks(links: PromoLink[]) {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(links, null, 2), 'utf8');
  } catch {
    // في بيئات القراءة فقط نتجاوز الكتابة بهدوء
  }
}

function upsertCachedLink(link: PromoLink) {
  const list = loadCachedLinks();
  const idx = list.findIndex(
    (l) =>
      l.storeCode.toLowerCase().trim() === link.storeCode.toLowerCase().trim() &&
      l.productId.trim() === link.productId.trim()
  );
  if (idx >= 0) list[idx] = link;
  else list.unshift(link);
  saveCachedLinks(list);
}

function mapRowToPromoLink(row: any): PromoLink {
  return {
    id: row.id,
    storeCode: row.store_code,
    storeName: row.store_name || 'متجري',
    productId: row.product_id,
    productName: row.product_name || 'منتج',
    productImage: row.product_image || '/placeholder-product.svg',
    sellingPrice: Number(row.selling_price || 0),
    wholesalePrice: Number(row.wholesale_price || 0),
    profitPerItem: Number(row.profit_per_item || 0),
    youtubeUrl: row.youtube_url || '',
    url: row.url,
    visitsCount: Number(row.visits_count || 0),
    ordersCount: Number(row.orders_count || 0),
    completedOrdersCount: Number(row.completed_orders_count || 0),
    conversionRate: Number(row.conversion_rate || 0),
    totalRevenue: Number(row.total_revenue || 0),
    totalProfit: Number(row.total_profit || 0),
    orders: Array.isArray(row.orders) ? row.orders : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPromoLinkToRow(link: PromoLink) {
  return {
    id: link.id,
    store_code: link.storeCode,
    store_name: link.storeName,
    product_id: link.productId,
    product_name: link.productName,
    product_image: link.productImage,
    selling_price: link.sellingPrice,
    wholesale_price: link.wholesalePrice,
    profit_per_item: link.profitPerItem,
    youtube_url: link.youtubeUrl || '',
    url: link.url,
    visits_count: link.visitsCount,
    orders_count: link.ordersCount,
    completed_orders_count: link.completedOrdersCount,
    conversion_rate: link.conversionRate,
    total_revenue: link.totalRevenue,
    total_profit: link.totalProfit,
    orders: link.orders || [],
    created_at: link.createdAt,
    updated_at: link.updatedAt,
  };
}

async function persistToSystemSettings(link: PromoLink): Promise<boolean> {
  const db = getActiveSupabase();
  if (!db) return false;

  try {
    const { error } = await db.from('system_settings').upsert(
      {
        key: settingsKey(link.storeCode, link.productId),
        value: link,
        description: `رابط ترويجي لمتجر ${link.storeCode} ومنتج ${link.productId}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (error) {
      console.warn('تعذر حفظ الرابط في system_settings:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('خطأ أثناء حفظ الرابط في system_settings:', err);
    return false;
  }
}

async function persistToPromoTable(link: PromoLink): Promise<boolean> {
  const db = getActiveSupabase();
  if (!db) return false;

  try {
    const { error } = await db
      .from('promo_links')
      .upsert(mapPromoLinkToRow(link), { onConflict: 'store_code,product_id' });

    if (error) {
      // الجدول غير موجود بعد — نستخدم system_settings كبديل دائم
      if (error.message?.includes('Could not find the table') || error.code === 'PGRST205') {
        return false;
      }
      console.warn('تعذر حفظ الرابط في promo_links:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('خطأ أثناء حفظ الرابط في promo_links:', err);
    return false;
  }
}

async function persistLink(link: PromoLink): Promise<PromoLink> {
  upsertCachedLink(link);

  const savedInTable = await persistToPromoTable(link);
  if (!savedInTable) {
    await persistToSystemSettings(link);
  }

  return link;
}

async function findFromSystemSettings(storeCode: string, productId: string): Promise<PromoLink | null> {
  const db = getActiveSupabase();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from('system_settings')
      .select('value')
      .eq('key', settingsKey(storeCode, productId))
      .maybeSingle();

    if (error || !data?.value) return null;
    return data.value as PromoLink;
  } catch {
    return null;
  }
}

async function findLink(storeCode: string, productId: string): Promise<PromoLink | null> {
  const cleanCode = storeCode.toLowerCase().trim();
  const cleanProd = productId.trim();
  const db = getActiveSupabase();

  if (db) {
    try {
      const { data, error } = await db
        .from('promo_links')
        .select('*')
        .eq('store_code', cleanCode)
        .eq('product_id', cleanProd)
        .maybeSingle();

      if (!error && data) {
        const mapped = mapRowToPromoLink(data);
        upsertCachedLink(mapped);
        return mapped;
      }
    } catch {
      // الجدول غير متاح — نتابع للبدائل
    }

    const fromSettings = await findFromSystemSettings(cleanCode, cleanProd);
    if (fromSettings) {
      upsertCachedLink(fromSettings);
      return fromSettings;
    }
  }

  return (
    loadCachedLinks().find(
      (l) =>
        l.storeCode.toLowerCase().trim() === cleanCode &&
        l.productId.trim() === cleanProd
    ) || null
  );
}

/**
 * جلب جميع الروابط الخاصة بمتجر معين
 */
export async function getPromoLinksByStore(storeCode: string): Promise<PromoLink[]> {
  if (!storeCode) return [];
  const cleanCode = storeCode.toLowerCase().trim();
  const db = getActiveSupabase();

  if (db) {
    try {
      const { data, error } = await db
        .from('promo_links')
        .select('*')
        .eq('store_code', cleanCode)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(mapRowToPromoLink);
        const others = loadCachedLinks().filter(
          (l) => l.storeCode.toLowerCase().trim() !== cleanCode
        );
        saveCachedLinks([...mapped, ...others]);
        return mapped;
      }
    } catch {
      // متابعة للبدائل
    }

    try {
      const { data, error } = await db
        .from('system_settings')
        .select('value')
        .like('key', `${SETTINGS_KEY_PREFIX}${cleanCode}:%`);

      if (!error && data && data.length > 0) {
        const mapped = data
          .map((row) => row.value as PromoLink)
          .filter(Boolean)
          .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

        const others = loadCachedLinks().filter(
          (l) => l.storeCode.toLowerCase().trim() !== cleanCode
        );
        saveCachedLinks([...mapped, ...others]);
        return mapped;
      }
    } catch (err) {
      console.warn('خطأ أثناء جلب الروابط من system_settings:', err);
    }
  }

  return loadCachedLinks().filter(
    (l) => l.storeCode.toLowerCase().trim() === cleanCode
  );
}

/**
 * جلب رابط مخصص محدد لمنتج ومتجر
 */
export async function getPromoLink(storeCode: string, productId: string): Promise<PromoLink | null> {
  if (!storeCode || !productId) return null;
  return findLink(storeCode, productId);
}

/**
 * إنشاء أو تحديث رابط بيع خاص
 */
export async function savePromoLink(data: {
  storeCode: string;
  storeName: string;
  productId: string;
  productName: string;
  productImage: string;
  sellingPrice: number;
  wholesalePrice: number;
  youtubeUrl?: string;
}): Promise<PromoLink> {
  const { storeCode, storeName, productId, productName, productImage, sellingPrice, wholesalePrice, youtubeUrl } = data;
  const cleanCode = storeCode.toLowerCase().trim();
  const cleanProd = productId.trim();
  const profitPerItem = Math.max(0, sellingPrice - wholesalePrice);
  const now = new Date().toISOString();
  const linkUrl = `/offer/${cleanCode}/${cleanProd}?storeName=${encodeURIComponent(storeName)}`;

  const existing = await findLink(cleanCode, cleanProd);

  if (existing) {
    const updated: PromoLink = {
      ...existing,
      storeName: storeName || existing.storeName,
      productName: productName || existing.productName,
      productImage: productImage || existing.productImage,
      sellingPrice,
      wholesalePrice,
      profitPerItem,
      youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : existing.youtubeUrl,
      url: linkUrl,
      updatedAt: now,
    };
    return persistLink(updated);
  }

  const newLink: PromoLink = {
    id: `link-${cleanCode}-${cleanProd}-${crypto.randomBytes(3).toString('hex')}`,
    storeCode: cleanCode,
    storeName: storeName || 'متجري',
    productId: cleanProd,
    productName: productName || 'منتج',
    productImage: productImage || '/placeholder-product.svg',
    sellingPrice,
    wholesalePrice,
    profitPerItem,
    youtubeUrl: youtubeUrl || '',
    url: linkUrl,
    visitsCount: 0,
    ordersCount: 0,
    completedOrdersCount: 0,
    conversionRate: 0,
    totalRevenue: 0,
    totalProfit: 0,
    orders: [],
    createdAt: now,
    updatedAt: now,
  };

  return persistLink(newLink);
}

/**
 * تسجيل زيارة جديدة للرابط
 */
export async function recordLinkVisit(storeCode: string, productId: string): Promise<number> {
  if (!storeCode || !productId) return 0;

  const link = await findLink(storeCode, productId);
  if (!link) return 0;

  link.visitsCount += 1;
  link.conversionRate =
    link.visitsCount > 0
      ? Number(((link.ordersCount / link.visitsCount) * 100).toFixed(1))
      : 0;
  link.updatedAt = new Date().toISOString();

  await persistLink(link);
  return link.visitsCount;
}

/**
 * تسجيل طلب جديد قادم من هذا الرابط وحساب الأرباح
 */
export async function recordLinkOrder(data: {
  storeCode: string;
  productId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  quantity: number;
  totalPrice: number;
}): Promise<boolean> {
  const { storeCode, productId, orderNumber, customerName, customerPhone, customerCity, quantity, totalPrice } = data;
  if (!storeCode || !productId) return false;

  const link = await findLink(storeCode, productId);
  if (!link) return false;

  const profitForOrder = link.profitPerItem * quantity;
  const newOrder: PromoLinkOrder = {
    orderNumber,
    customerName,
    customerPhone,
    customerCity,
    quantity,
    totalPrice,
    profit: profitForOrder,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  link.orders = [newOrder, ...(link.orders || [])];
  link.ordersCount += 1;
  link.totalRevenue += totalPrice;
  link.totalProfit += profitForOrder;
  link.conversionRate =
    link.visitsCount > 0
      ? Number(((link.ordersCount / link.visitsCount) * 100).toFixed(1))
      : 0;
  link.updatedAt = new Date().toISOString();

  await persistLink(link);
  return true;
}
