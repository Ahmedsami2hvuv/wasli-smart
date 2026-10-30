import { Store, StoreProduct, Product, PayoutMethod, PayoutDetails } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { mockStores } from '@/data/mockData';
import { getAllProducts } from '@/lib/services/productService';
import {
  generateRecoveryToken,
  getPhoneLookupVariants,
  hashSecret,
  phonesMatch,
  toIraqiLocalPhone,
} from '@/lib/merchantAuth';
import fs from 'fs';
import path from 'path';

type StoreAuthSettings = {
  login_pin_hash?: string | null;
  login_otp_hash?: string | null;
  login_otp_expires_at?: string | null;
  login_otp_requested_at?: string | null;
  pin_reset_token_hash?: string | null;
  pin_reset_expires_at?: string | null;
};

function mapDbStoreToStore(item: any): Store {
  return {
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
    hasLoginPin: Boolean(item.settings?.login_pin_hash || item.hasLoginPin),
    rating: item.settings?.rating || 4.9,
    reviewsCount: item.settings?.reviews_count || 38,
    deliveryFeeIqd: item.settings?.delivery_fee_iqd !== undefined ? Number(item.settings.delivery_fee_iqd) : 5000,
    deliveryTimeMinutes: item.settings?.delivery_time_minutes || 'خلال يوم أو يومين',
    isOpen: item.settings?.is_open !== undefined ? item.settings.is_open : true,
    image: item.logo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    location: item.settings?.location || item.city || 'العراق',
    district: item.settings?.district || item.city || 'العراق',
    createdAt: item.created_at,
  };
}

function sanitizeStoreForClient(store: Store): Store {
  const { ...safe } = store as Store & { loginPinHash?: string };
  delete (safe as any).loginPinHash;
  return {
    ...safe,
    hasLoginPin: Boolean((store as any).hasLoginPin || (store as any).loginPinHash),
  };
}

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
        return data.map(item => sanitizeStoreForClient(mapDbStoreToStore(item)));
      }
    } catch (e) {
      console.warn('استخدام البيانات المحلية للمتاجر كبديل احتياطي:', e);
    }
  }

  const cached = loadCachedStores();
  const authCache = loadAuthCache();
  const allMap = new Map<string, Store>();
  [...localStores, ...cached].forEach(s => {
    if (s.code && !allMap.has(s.code.toLowerCase())) {
      const auth = authCache[s.code.toLowerCase()];
      allMap.set(
        s.code.toLowerCase(),
        sanitizeStoreForClient({ ...s, hasLoginPin: Boolean(s.hasLoginPin || auth?.login_pin_hash) })
      );
    }
  });
  return Array.from(allMap.values());
}

/**
 * جلب متجر بواسطة الكود الفريد أو الـ slug باستعلام مباشر وسريع من قاعدة البيانات
 */
export async function getStoreBySlugOrCode(identifier: string): Promise<Store | null> {
  const decoded = decodeURIComponent(identifier || '').toLowerCase().trim();
  if (!decoded) return null;

  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);

  if (activeSupabase) {
    try {
      const { data, error } = await activeSupabase
        .from('stores')
        .select('*')
        .or(`code.ilike.${decoded},slug.ilike.${decoded},id.eq.${decoded}`)
        .maybeSingle();

      if (!error && data) {
        return sanitizeStoreForClient(mapDbStoreToStore(data));
      }
    } catch (e) {
      console.warn('استخدام الكاش المحلي للبحث عن المتجر:', e);
    }
  }

  const cached = loadCachedStores();
  const foundInLocal = [...localStores, ...cached].find(
    s => s.code?.toLowerCase() === decoded || s.slug?.toLowerCase() === decoded || s.id === decoded
  );
  return foundInLocal || null;
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
  loginPin?: string;
}): Promise<Store> {
  const code = generateStoreCode();
  const baseSlug = params.name
    .trim()
    .toLowerCase()
    .replace(/[^\u0621-\u064Aa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = `${baseSlug}-${code.replace('w-', '')}`;
  const loginPinHash = params.loginPin ? hashSecret(params.loginPin.trim()) : undefined;
  const normalizedPhone = toIraqiLocalPhone(params.phone) || params.phone.trim();

  const newStore: Store = {
    id: `store-${Date.now()}`,
    name: params.name,
    ownerName: params.ownerName,
    slug: slug,
    code: code,
    description: params.description || `متجر ${params.name} الإلكتروني للتسوق المباشر والتوصيل السريع والدفع عند الاستلام`,
    city: params.city || 'العراق',
    phone: normalizedPhone,
    payoutMethod: params.payoutMethod,
    payoutDetails: params.payoutDetails,
    hasLoginPin: Boolean(loginPinHash),
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
            ...(loginPinHash ? { login_pin_hash: loginPinHash } : {}),
          },
        })
        .select()
        .single();

      if (!error && data) {
        newStore.id = data.id;
      } else if (error) {
        console.error('فشل حفظ المتجر في سوبابيس:', error.message);
        throw new Error('تعذر حفظ المتجر في قاعدة البيانات. يرجى المحاولة مرة أخرى.');
      }
    } catch (e: any) {
      if (e?.message?.includes('تعذر حفظ المتجر')) throw e;
      console.error('خطأ أثناء إنشاء المتجر في سوبابيس:', e);
      throw new Error('تعذر حفظ المتجر في قاعدة البيانات. يرجى المحاولة مرة أخرى.');
    }
  }

  if (loginPinHash) {
    const cache = loadAuthCache();
    cache[(newStore.code || '').toLowerCase()] = { login_pin_hash: loginPinHash };
    saveAuthCache(cache);
  }
  localStores.unshift(newStore);
  saveStoreToCache(newStore);
  return sanitizeStoreForClient(newStore);
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

      // دمج الإعدادات مع الموجود حتى لا نمسح رمز الدخول أو الأسعار المخصصة
      let existingSettings: Record<string, any> = {};
      try {
        const { data: currentRow } = await activeSupabase
          .from('stores')
          .select('settings')
          .or(
            targetStore.id && !targetStore.id.startsWith('store-')
              ? `id.eq.${targetStore.id}`
              : `code.eq.${targetStore.code}`
          )
          .maybeSingle();
        existingSettings = currentRow?.settings || {};
      } catch (e) {}

      const settingsPayload: any = {
        ...existingSettings,
        owner_name: updatedStore.ownerName,
        district: updatedStore.district,
        location: updatedStore.location,
        delivery_time_minutes: updatedStore.deliveryTimeMinutes,
        delivery_fee_iqd: updatedStore.deliveryFeeIqd,
        is_open: updatedStore.isOpen,
        admin_notes: updatedStore.adminNotes,
        telegram_username: updatedStore.telegramUsername,
        telegram_chat_id: updatedStore.telegramChatId,
        payout_method: updatedStore.payoutMethod,
        payout_details: updatedStore.payoutDetails,
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

  return sanitizeStoreForClient(updatedStore);
}

function getAuthCachePath() {
  return path.join(process.cwd(), 'src', 'data', 'merchantAuthCache.json');
}

function loadAuthCache(): Record<string, StoreAuthSettings> {
  try {
    const p = getAuthCachePath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8')) || {};
    }
  } catch (e) {}
  return {};
}

function saveAuthCache(cache: Record<string, StoreAuthSettings>) {
  try {
    fs.writeFileSync(getAuthCachePath(), JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {}
}

async function getRawStoreSettings(store: Store): Promise<Record<string, any>> {
  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      let query = activeSupabase.from('stores').select('settings');
      if (store.id && !store.id.startsWith('store-')) {
        query = query.eq('id', store.id);
      } else if (store.code) {
        query = query.eq('code', store.code);
      }
      const { data } = await query.maybeSingle();
      if (data?.settings) return { ...data.settings };
    } catch (e) {}
  }
  const cache = loadAuthCache();
  const key = (store.code || store.id || '').toLowerCase();
  return { ...(cache[key] || {}) };
}

async function patchStoreAuthSettings(store: Store, patch: StoreAuthSettings & Record<string, any>): Promise<void> {
  const current = await getRawStoreSettings(store);
  const merged: Record<string, any> = { ...current, ...patch };
  Object.keys(patch).forEach((key) => {
    if (patch[key] === undefined || patch[key] === null) {
      delete merged[key];
    }
  });

  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
  if (activeSupabase) {
    try {
      if (store.id && !store.id.startsWith('store-')) {
        await activeSupabase.from('stores').update({ settings: merged, updated_at: new Date().toISOString() }).eq('id', store.id);
      } else if (store.code) {
        await activeSupabase.from('stores').update({ settings: merged, updated_at: new Date().toISOString() }).eq('code', store.code);
      }
    } catch (e) {
      console.warn('تعذر حفظ إعدادات الدخول في سوبابيس:', e);
    }
  }

  const cache = loadAuthCache();
  const key = (store.code || store.id || '').toLowerCase();
  cache[key] = {
    login_pin_hash: merged.login_pin_hash,
    login_otp_hash: merged.login_otp_hash,
    login_otp_expires_at: merged.login_otp_expires_at,
    login_otp_requested_at: merged.login_otp_requested_at,
    pin_reset_token_hash: merged.pin_reset_token_hash,
    pin_reset_expires_at: merged.pin_reset_expires_at,
  };
  saveAuthCache(cache);
}

export async function findStoreByPhone(phone: string): Promise<Store | null> {
  const variants = getPhoneLookupVariants(phone);
  if (variants.length === 0) return null;

  const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);

  // 1) بحث مباشر في سوبابيس بكل صيغ الرقم المحتملة
  if (activeSupabase) {
    try {
      const orFilter = variants
        .map((v) => `phone.eq.${v.replace(/,/g, '')}`)
        .join(',');

      const { data, error } = await activeSupabase
        .from('stores')
        .select('*')
        .or(orFilter)
        .limit(20);

      if (!error && data && data.length > 0) {
        const matched = data.find((row) => phonesMatch(row.phone, phone));
        if (matched) return sanitizeStoreForClient(mapDbStoreToStore(matched));
        return sanitizeStoreForClient(mapDbStoreToStore(data[0]));
      }

      // 2) مسح أوسع: جلب أرقام الهواتف ومطابقتها بآخر 10 أرقام
      const { data: phoneRows, error: phoneErr } = await activeSupabase
        .from('stores')
        .select('*')
        .not('phone', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (!phoneErr && phoneRows && phoneRows.length > 0) {
        const matched = phoneRows.find((row) => phonesMatch(row.phone, phone));
        if (matched) return sanitizeStoreForClient(mapDbStoreToStore(matched));
      }
    } catch (e) {
      console.warn('تعذر البحث عن المتجر بالهاتف عبر سوبابيس:', e);
    }
  }

  // 3) بديل محلي / كاش
  const stores = await getAllStores();
  return stores.find((s) => phonesMatch(s.phone, phone)) || null;
}

export async function verifyStoreLoginPin(store: Store, pin: string): Promise<boolean> {
  const settings = await getRawStoreSettings(store);
  const hash = settings.login_pin_hash;
  if (!hash) return false;
  return hash === hashSecret(String(pin || '').trim());
}

export async function setStoreLoginPin(store: Store, pin: string): Promise<Store> {
  const pinHash = hashSecret(String(pin || '').trim());
  await patchStoreAuthSettings(store, {
    login_pin_hash: pinHash,
    login_otp_hash: null,
    login_otp_expires_at: null,
    pin_reset_token_hash: null,
    pin_reset_expires_at: null,
  });
  return sanitizeStoreForClient({ ...store, hasLoginPin: true });
}

export async function saveStoreLoginOtp(store: Store, otpCode: string, requestedAt = new Date()): Promise<void> {
  const expires = new Date(requestedAt.getTime() + 15 * 60 * 1000);
  await patchStoreAuthSettings(store, {
    login_otp_hash: hashSecret(otpCode),
    login_otp_expires_at: expires.toISOString(),
    login_otp_requested_at: requestedAt.toISOString(),
  });
}

export async function getStoreOtpMeta(store: Store): Promise<{
  requestedAt?: string;
  expiresAt?: string;
  otpHash?: string;
}> {
  const settings = await getRawStoreSettings(store);
  return {
    requestedAt: settings.login_otp_requested_at,
    expiresAt: settings.login_otp_expires_at,
    otpHash: settings.login_otp_hash,
  };
}

export async function verifyStoreLoginOtp(store: Store, otpCode: string): Promise<boolean> {
  const settings = await getRawStoreSettings(store);
  if (!settings.login_otp_hash || !settings.login_otp_expires_at) return false;
  if (new Date(settings.login_otp_expires_at).getTime() < Date.now()) return false;
  return settings.login_otp_hash === hashSecret(String(otpCode || '').trim());
}

export async function issuePinResetToken(store: Store): Promise<string> {
  const token = generateRecoveryToken();
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await patchStoreAuthSettings(store, {
    pin_reset_token_hash: hashSecret(token),
    pin_reset_expires_at: expires.toISOString(),
    login_otp_hash: null,
    login_otp_expires_at: null,
  });
  return token;
}

export async function verifyPinResetToken(store: Store, token: string): Promise<boolean> {
  const settings = await getRawStoreSettings(store);
  if (!settings.pin_reset_token_hash || !settings.pin_reset_expires_at) return false;
  if (new Date(settings.pin_reset_expires_at).getTime() < Date.now()) return false;
  return settings.pin_reset_token_hash === hashSecret(String(token || '').trim());
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

/**
 * جلب منتجات المتجر المتاحة للزبائن مباشرة من جهة السيرفر بسرعة فائقة
 */
export async function getStoreProductsForCustomer(identifier: string): Promise<Product[]> {
  try {
    const cleanId = (identifier || '').toLowerCase().trim();
    const allProducts = await getAllProducts();
    if (!cleanId) return allProducts;

    const store = await getStoreBySlugOrCode(cleanId);
    let customPrices: Record<string, { sellingPrice: number; isActive: boolean }> = {};

    const activeSupabase = (isSupabaseAdminConfigured && supabaseAdmin) ? supabaseAdmin : (isSupabaseConfigured ? supabase : null);
    if (activeSupabase && store?.id) {
      try {
        const { data: storeData } = await activeSupabase
          .from('stores')
          .select('settings')
          .eq('id', store.id)
          .maybeSingle();

        if (storeData?.settings?.custom_product_prices) {
          customPrices = { ...storeData.settings.custom_product_prices };
        }

        const { data: spRows } = await activeSupabase
          .from('store_products')
          .select('product_id, selling_price, is_active')
          .eq('store_id', store.id);

        if (spRows && spRows.length > 0) {
          spRows.forEach((row: any) => {
            if (row.product_id) {
              customPrices[row.product_id] = {
                sellingPrice: Number(row.selling_price),
                isActive: row.is_active !== false,
              };
            }
          });
        }
      } catch (e) {}
    }

    const mergedProducts = allProducts.map(product => {
      const custom = customPrices[product.id];
      const basePlatformPrice = product.platformPriceIqd || product.priceIqd || 10000;
      const minPrice = product.minPriceIqd || (basePlatformPrice + 5000);
      const maxPrice = product.maxPriceIqd || (basePlatformPrice + 20000);

      const defaultSellingPrice = Math.min(maxPrice, Math.max(minPrice, basePlatformPrice + 10000));
      const rawSelling = custom && custom.sellingPrice ? Number(custom.sellingPrice) : defaultSellingPrice;
      const sellingPrice = Math.max(minPrice, Math.min(maxPrice, rawSelling));
      const isActive = custom && custom.isActive !== undefined ? custom.isActive : true;
      const merchantProfit = Math.max(0, sellingPrice - basePlatformPrice);

      return {
        ...product,
        priceIqd: sellingPrice,
        sellingPrice: sellingPrice,
        defaultSellingPrice: defaultSellingPrice,
        platformPriceIqd: basePlatformPrice,
        minPriceIqd: minPrice,
        maxPriceIqd: maxPrice,
        merchantProfit: merchantProfit,
        isActive: isActive,
        isCustomized: !!custom,
      };
    });

    return mergedProducts.filter(p => p.isActive !== false);
  } catch (error) {
    console.warn('تعذر جلب منتجات المتجر من السيرفر:', error);
    return [];
  }
}
