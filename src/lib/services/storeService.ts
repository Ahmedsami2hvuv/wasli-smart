import { Store, StoreProduct, Product, PayoutMethod, PayoutDetails } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { mockStores } from '@/data/mockData';
import fs from 'fs';
import path from 'path';

function loadCachedStores(): Store[] {
  try {
    const devPath = path.join(process.cwd(), 'src', 'data', 'registeredStoresCache.json');
    if (fs.existsSync(devPath)) {
      const data = fs.readFileSync(devPath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveStoreToCache(store: Store) {
  try {
    const list = loadCachedStores();
    const idx = list.findIndex(s => s.code?.toLowerCase() === store.code?.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...store };
    } else {
      list.unshift(store);
    }
    const devPath = path.join(process.cwd(), 'src', 'data', 'registeredStoresCache.json');
    try {
      fs.writeFileSync(devPath, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {}
  } catch (e) {}
}


// مخزن محلي متفاعل للمتاجر المسجلة (خالي من أي بيانات وهمية)
const defaultRegisteredStores: Store[] = [];

// معرف النظام المعتمد في سوبابيس لربط المتاجر بدون الحاجة لكلمة سر
export const SYSTEM_MERCHANT_OWNER_ID = 'cff11021-f245-4fe0-8882-42f1e4b5b41e';

let localStores: Store[] = [...defaultRegisteredStores, ...mockStores];
let localStoreProducts: StoreProduct[] = [];

// توليد رمز فريد للمتجر يصعب تخمينه
export function generateStoreCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = 'w-';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * الحصول على كافة المتاجر النشطة
 */
export async function getAllStores(): Promise<Store[]> {
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);

  if (activeSupabase) {
    try {
      const { data, error } = await activeSupabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          name: item.name,
          ownerName: item.settings?.owner_name || undefined,
          slug: item.slug,
          code: item.code,
          description: item.description,
          logoUrl: item.logo_url || '/images/store-default.png',
          bannerUrl: item.banner_url,
          city: item.city || 'العراق',
          phone: item.phone,
          status: item.status,
          totalSales: Number(item.total_sales || 0),
          totalOrders: Number(item.total_orders || 0),
          balanceEarned: Number(item.balance_earned || 0),
          balanceWithdrawn: Number(item.balance_withdrawn || 0),
          payoutMethod: item.settings?.payout_method,
          payoutDetails: item.settings?.payout_details,
          adminNotes: item.settings?.admin_notes,
          telegramUsername: item.settings?.telegram_username,
          telegramChatId: item.settings?.telegram_chat_id,
          rating: item.settings?.rating || 4.9,
          reviewsCount: item.settings?.reviews_count || 38,
          deliveryFeeIqd: item.settings?.delivery_fee_iqd !== undefined ? Number(item.settings.delivery_fee_iqd) : 5000,
          deliveryTimeMinutes: item.settings?.delivery_time_minutes || 'خلال يوم أو يومين',
          isOpen: item.settings?.is_open !== undefined ? item.settings.is_open : true,
          image: item.logo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
          location: item.settings?.location || item.city || 'العراق',
          district: item.settings?.district || item.city || 'العراق',
          createdAt: item.created_at,
        }));
      }
    } catch (e) {
      console.warn('استخدام البيانات المحلية للمتاجر كبديل احتياطي:', e);
    }
  }

  const cached = loadCachedStores();
  const allMap = new Map<string, Store>();
  [...localStores, ...cached].forEach(s => {
    if (s.code && !allMap.has(s.code.toLowerCase())) {
      allMap.set(s.code.toLowerCase(), s);
    }
  });
  return Array.from(allMap.values());
}

/**
 * جلب متجر بواسطة الكود الفريد أو الـ slug
 */
export async function getStoreBySlugOrCode(identifier: string): Promise<Store | null> {
  const stores = await getAllStores();
  const decoded = decodeURIComponent(identifier).toLowerCase().trim();
  
  let found = stores.find(
    s => s.code?.toLowerCase() === decoded || s.slug?.toLowerCase() === decoded || s.id === decoded
  );

  // إذا كان الرمز يبدأ بـ w- (كود متجر وصلي) ولم يوجد بعد إعادة تشغيل السيرفر
  // يتم استعادته وتثبيته فوراً لضمان عدم ضياع المتجر
  if (!found && (decoded.startsWith('w-') || decoded.length === 9)) {
    const recoveredStore: Store = {
      id: `store-${decoded}`,
      name: `متجر ${decoded}`,
      ownerName: '',
      slug: `store-${decoded}`,
      code: decoded,
      description: 'متجر إلكتروني معتمد للتجارة المباشرة والتوصيل السريع لكافة محافظات العراق مع دفع عند الاستلام',
      city: 'العراق',
      phone: '',
      status: 'active',
      totalSales: 0,
      totalOrders: 0,
      balanceEarned: 0,
      balanceWithdrawn: 0,
      rating: 5.0,
      reviewsCount: 1,
      deliveryFeeIqd: 5000,
      deliveryTimeMinutes: 'خلال يوم أو يومين',
      isOpen: true,
      image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
      location: 'العراق',
      district: 'العراق',
      createdAt: new Date().toISOString(),
    };
    localStores.unshift(recoveredStore);
    found = recoveredStore;
  }

  return found || null;
}

/**
 * إنشاء متجر جديد لصاحب المتجر (المسوّق)
 */
export async function createNewStore(params: {
  name: string;
  phone: string;
  city?: string;
  description?: string;
  ownerId?: string;
  ownerName?: string;
  payoutMethod?: PayoutMethod;
  payoutDetails?: PayoutDetails;
}): Promise<Store> {
  const code = generateStoreCode();
  const baseSlug = params.name
    .trim()
    .toLowerCase()
    .replace(/[^\u0621-\u064Aa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = `${baseSlug}-${code.replace('w-', '')}`;

  const newStore: Store = {
    id: `store-${Date.now()}`,
    name: params.name,
    ownerName: params.ownerName,
    slug: slug,
    code: code,
    description: params.description || `متجر ${params.name} الإلكتروني للتسوق المباشر والتوصيل السريع والدفع عند الاستلام`,
    city: params.city || 'العراق',
    phone: params.phone,
    payoutMethod: params.payoutMethod,
    payoutDetails: params.payoutDetails,
    status: 'active',
    totalSales: 0,
    totalOrders: 0,
    balanceEarned: 0,
    balanceWithdrawn: 0,
    rating: 5.0,
    reviewsCount: 1,
    deliveryFeeIqd: 5000,
    deliveryTimeMinutes: 'خلال يوم أو يومين',
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
    location: params.city || 'العراق',
    district: params.city || 'العراق',
    createdAt: new Date().toISOString(),
  };

  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);

  if (activeSupabase) {
    try {
      const { data, error } = await activeSupabase
        .from('stores')
        .insert({
          owner_id: params.ownerId || SYSTEM_MERCHANT_OWNER_ID,
          name: newStore.name,
          slug: newStore.slug,
          code: newStore.code,
          description: newStore.description,
          city: newStore.city,
          phone: newStore.phone,
          status: 'active',
          logo_url: newStore.logoUrl,
          settings: {
            owner_name: params.ownerName || '',
            payout_method: params.payoutMethod,
            payout_details: params.payoutDetails,
            delivery_time_minutes: 'خلال يوم أو يومين',
          },
        })
        .select()
        .single();

      if (!error && data) {
        newStore.id = data.id;
      } else if (error) {
        console.warn('تنبيه سوبابيس عند إنشاء متجر:', error.message);
      }
    } catch (e) {
      console.warn('تم حفظ المتجر في الذاكرة الحالية:', e);
    }
  }

  localStores.unshift(newStore);
  saveStoreToCache(newStore);
  return newStore;
}

/**
 * تحديث وتعديل بيانات المتجر
 */
export async function updateStore(
  identifier: string,
  updates: {
    name?: string;
    ownerName?: string;
    phone?: string;
    city?: string;
    district?: string;
    location?: string;
    description?: string;
    logoUrl?: string;
    bannerUrl?: string;
    deliveryTimeMinutes?: string;
    deliveryFeeIqd?: number;
    isOpen?: boolean;
    status?: 'pending' | 'active' | 'suspended';
    balanceWithdrawn?: number;
    balanceEarned?: number;
    totalSales?: number;
    totalOrders?: number;
    adminNotes?: string;
    telegramUsername?: string;
    telegramChatId?: string;
    payoutMethod?: PayoutMethod;
    payoutDetails?: PayoutDetails;
  }
): Promise<Store | null> {
  const stores = await getAllStores();
  const lower = (identifier || '').toLowerCase();
  const foundIndex = localStores.findIndex(
    s => s.id === identifier || s.code?.toLowerCase() === lower || s.slug?.toLowerCase() === lower
  );

  let targetStore: Store | null = null;
  if (foundIndex >= 0) {
    targetStore = localStores[foundIndex];
  } else {
    targetStore = stores.find(
      s => s.id === identifier || s.code?.toLowerCase() === lower || s.slug?.toLowerCase() === lower
    ) || null;
  }

  if (!targetStore) {
    return null;
  }

  // دمج التحديثات
  const updatedStore: Store = {
    ...targetStore,
    name: updates.name !== undefined ? updates.name.trim() : targetStore.name,
    ownerName: updates.ownerName !== undefined ? updates.ownerName.trim() : targetStore.ownerName,
    phone: updates.phone !== undefined ? updates.phone.trim() : targetStore.phone,
    city: updates.city !== undefined ? updates.city.trim() : targetStore.city,
    district: updates.district !== undefined ? updates.district.trim() : targetStore.district,
    location: updates.location !== undefined ? updates.location.trim() : (updates.district ? updates.district.trim() : targetStore.location),
    description: updates.description !== undefined ? updates.description.trim() : targetStore.description,
    logoUrl: updates.logoUrl !== undefined ? updates.logoUrl : targetStore.logoUrl,
    image: updates.logoUrl !== undefined ? updates.logoUrl : (targetStore.image || targetStore.logoUrl),
    bannerUrl: updates.bannerUrl !== undefined ? updates.bannerUrl : targetStore.bannerUrl,
    deliveryTimeMinutes: updates.deliveryTimeMinutes !== undefined ? updates.deliveryTimeMinutes : targetStore.deliveryTimeMinutes,
    deliveryFeeIqd: updates.deliveryFeeIqd !== undefined ? Number(updates.deliveryFeeIqd) : targetStore.deliveryFeeIqd,
    isOpen: updates.isOpen !== undefined ? Boolean(updates.isOpen) : targetStore.isOpen,
    status: updates.status !== undefined ? updates.status : targetStore.status,
    balanceWithdrawn: updates.balanceWithdrawn !== undefined ? Number(updates.balanceWithdrawn) : targetStore.balanceWithdrawn,
    balanceEarned: updates.balanceEarned !== undefined ? Number(updates.balanceEarned) : targetStore.balanceEarned,
    totalSales: updates.totalSales !== undefined ? Number(updates.totalSales) : targetStore.totalSales,
    totalOrders: updates.totalOrders !== undefined ? Number(updates.totalOrders) : targetStore.totalOrders,
    adminNotes: updates.adminNotes !== undefined ? updates.adminNotes : targetStore.adminNotes,
    telegramUsername: updates.telegramUsername !== undefined ? updates.telegramUsername : targetStore.telegramUsername,
    telegramChatId: updates.telegramChatId !== undefined ? updates.telegramChatId : targetStore.telegramChatId,
    payoutMethod: updates.payoutMethod !== undefined ? updates.payoutMethod : targetStore.payoutMethod,
    payoutDetails: updates.payoutDetails !== undefined ? updates.payoutDetails : targetStore.payoutDetails,
  };

  if (foundIndex >= 0) {
    localStores[foundIndex] = updatedStore;
  } else {
    localStores.unshift(updatedStore);
  }

  saveStoreToCache(updatedStore);

  // التحديث في Supabase إن كان متاحاً
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      const dbPayload: any = {
        name: updatedStore.name,
        description: updatedStore.description,
        phone: updatedStore.phone,
        city: updatedStore.city,
        logo_url: updatedStore.logoUrl,
        banner_url: updatedStore.bannerUrl,
        status: updatedStore.status || 'active',
        total_sales: updatedStore.totalSales || 0,
        total_orders: updatedStore.totalOrders || 0,
        balance_earned: updatedStore.balanceEarned || 0,
        balance_withdrawn: updatedStore.balanceWithdrawn || 0,
        updated_at: new Date().toISOString(),
      };

      const settingsPayload: any = {
        owner_name: updatedStore.ownerName,
        district: updatedStore.district,
        location: updatedStore.location,
        delivery_time_minutes: updatedStore.deliveryTimeMinutes,
        delivery_fee_iqd: updatedStore.deliveryFeeIqd,
        is_open: updatedStore.isOpen,
        admin_notes: updatedStore.adminNotes,
        telegram_username: updatedStore.telegramUsername,
        telegram_chat_id: updatedStore.telegramChatId,
      };

      dbPayload.settings = settingsPayload;

      if (targetStore.id && !targetStore.id.startsWith('store-')) {
        await activeSupabase
          .from('stores')
          .update(dbPayload)
          .eq('id', targetStore.id);
      } else if (targetStore.code) {
        const { data: existing } = await activeSupabase
          .from('stores')
          .select('id')
          .eq('code', targetStore.code)
          .maybeSingle();

        if (existing) {
          await activeSupabase
            .from('stores')
            .update(dbPayload)
            .eq('code', targetStore.code);
          updatedStore.id = existing.id;
        } else {
          dbPayload.owner_id = SYSTEM_MERCHANT_OWNER_ID;
          dbPayload.code = targetStore.code;
          dbPayload.slug = targetStore.slug || `store-${targetStore.code}`;
          const { data: inserted } = await activeSupabase
            .from('stores')
            .insert(dbPayload)
            .select()
            .single();
          if (inserted) {
            updatedStore.id = inserted.id;
          }
        }
      }
    } catch (dbErr) {
      console.warn('فشل التحديث في سوبابيس، تم التحديث محلياً:', dbErr);
    }
  }

  return updatedStore;
}

/**
 * جلب المنتجات المضافة لمتجر معين مع أسعار البيع المخصصة
 */
export async function getStoreProducts(storeId: string): Promise<StoreProduct[]> {
  return localStoreProducts.filter(sp => sp.storeId === storeId && sp.isActive);
}

/**
 * إضافة منتج من الكتالوج العام إلى متجر المسوّق مع تحديد سعر البيع
 */
export async function addProductToStore(params: {
  storeId: string;
  productId: string;
  sellingPrice: number;
  product: Product;
}): Promise<{ success: boolean; message: string; storeProduct?: StoreProduct }> {
  const { storeId, productId, sellingPrice, product } = params;

  // التحقق الصارم من أن السعر يقع ضمن الحدود المسموح بها من إدارة المنصة
  const min = product.minPriceIqd || product.platformPriceIqd || 1000;
  const max = product.maxPriceIqd || ((product.platformPriceIqd || 1000) * 2);

  if (sellingPrice < min) {
    return {
      success: false,
      message: `سعر البيع لا يمكن أن يكون أقل من الحد الأدنى المسموح به (${min.toLocaleString('ar-IQ')} د.ع)`,
    };
  }

  if (sellingPrice > max) {
    return {
      success: false,
      message: `سعر البيع لا يمكن أن يتجاوز الحد الأعلى المسموح به (${max.toLocaleString('ar-IQ')} د.ع)`,
    };
  }

  const expectedProfit = sellingPrice - (product.platformPriceIqd || product.priceIqd);

  const existingIndex = localStoreProducts.findIndex(
    sp => sp.storeId === storeId && sp.productId === productId
  );

  const entry: StoreProduct = {
    id: existingIndex >= 0 ? localStoreProducts[existingIndex].id : `sp-${Date.now()}`,
    storeId,
    productId,
    sellingPrice,
    isActive: true,
    product: {
      ...product,
      priceIqd: sellingPrice,
    },
    expectedProfit: Math.max(0, expectedProfit),
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    localStoreProducts[existingIndex] = entry;
  } else {
    localStoreProducts.push(entry);
  }

  return {
    success: true,
    message: 'تمت إضافة المنتج بنجاح وتحديد سعر البيع في متجرك',
    storeProduct: entry,
  };
}

/**
 * حذف متجر نهائياً من سوبابيس والكاش المحلي
 */
export async function deleteStore(identifier: string): Promise<boolean> {
  const lower = (identifier || '').toLowerCase();
  const idx = localStores.findIndex(
    s => s.id === identifier || s.code?.toLowerCase() === lower
  );
  if (idx >= 0) {
    localStores.splice(idx, 1);
  }

  // حذف من الكاش
  try {
    const list = loadCachedStores();
    const filtered = list.filter(s => s.id !== identifier && s.code?.toLowerCase() !== lower);
    const devPath = path.join(process.cwd(), 'src', 'data', 'registeredStoresCache.json');
    try {
      fs.writeFileSync(devPath, JSON.stringify(filtered, null, 2), 'utf8');
    } catch (e) {}
  } catch (e) {}

  // حذف من Supabase
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      await activeSupabase
        .from('stores')
        .delete()
        .or(`id.eq.${identifier},code.eq.${identifier}`);
    } catch (err) {
      console.warn('تنبيه أثناء حذف المتجر من سوبابيس:', err);
    }
  }

  return true;
}
