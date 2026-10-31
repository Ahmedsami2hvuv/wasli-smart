import fs from 'fs';
import path from 'path';
import { IRAQ_GOVERNORATES } from '@/data/iraqCities';
import {
  generateOtpCode,
  getIraqiPhoneValidationMessage,
  toIraqiLocalPhone,
  toWhatsAppNumber,
  validatePinFormat,
  buildAdminWhatsAppOtpMessage,
} from '@/lib/merchantAuth';
import {
  createNewStore,
  findStoreByPhone,
  findStoresByPhone,
  PhoneAlreadyExistsError,
  saveStoreLoginOtp,
  setStoreLoginPin,
  updateStore,
  verifyStoreLoginOtp,
  verifyStoreLoginPin,
  getStoreOtpMeta,
} from '@/lib/services/storeService';
import { sendAdminLoginRecoveryNotification } from '@/lib/telegram/vault';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Store } from '@/types';

export type MerchantBotStep =
  | 'idle'
  | 'login_phone'
  | 'login_pin'
  | 'recover_phone'
  | 'recover_otp'
  | 'recover_new_pin'
  | 'register_name'
  | 'register_phone'
  | 'register_store'
  | 'register_pin'
  | 'register_confirm_pin'
  | 'register_city';

export interface MerchantBotSession {
  chatId: string;
  step: MerchantBotStep;
  data: {
    phone?: string;
    pin?: string;
    ownerName?: string;
    storeName?: string;
    city?: string;
  };
  updatedAt: string;
}

type ReplyMarkup =
  | { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> }
  | { keyboard: Array<Array<{ text: string }>>; resize_keyboard: boolean; one_time_keyboard: boolean }
  | { remove_keyboard: boolean };

export interface BotReply {
  text: string;
  replyMarkup?: ReplyMarkup;
}

const SESSION_PREFIX = 'tg_merchant_session:';
const CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'telegramMerchantSessions.json');
const memorySessions = new Map<string, MerchantBotSession>();

function getActiveSupabase() {
  if (isSupabaseAdminConfigured && supabaseAdmin) return supabaseAdmin;
  if (isSupabaseConfigured) return supabase;
  return null;
}

function getPublicSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://wasli-smart.vercel.app').replace(/\/$/, '');
}

export function buildMerchantLinks(store: {
  code?: string;
  name?: string;
  ownerName?: string;
  city?: string;
  phone?: string;
}) {
  const origin = getPublicSiteUrl();
  const code = store.code || '';
  const storeUrl = `${origin}/s/${code}?name=${encodeURIComponent(store.name || '')}`;
  const dashboardUrl =
    `${origin}/merchant?storeCode=${code}` +
    `&name=${encodeURIComponent(store.name || '')}` +
    `&owner=${encodeURIComponent(store.ownerName || '')}` +
    `&city=${encodeURIComponent(store.city || '')}` +
    `&phone=${encodeURIComponent(store.phone || '')}`;
  return { storeUrl, dashboardUrl };
}

export function buildStoreLinksKeyboard(storeUrl: string, dashboardUrl: string): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: 'رابط متجر التاجر (للزبائن)', url: storeUrl }],
      [{ text: 'فتح صفحة التاجر', url: dashboardUrl }],
    ],
  };
}

function authMenuKeyboard(): ReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: 'إنشاء حساب تاجر', callback_data: 'auth:register' }],
      [{ text: 'تسجيل دخول', callback_data: 'auth:login' }],
      [{ text: 'نسيت رمز الدخول', callback_data: 'auth:recover' }],
    ],
  };
}

function cancelKeyboard(): ReplyMarkup {
  return {
    keyboard: [[{ text: 'إلغاء' }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function governorateKeyboard(): ReplyMarkup {
  const rows: Array<Array<{ text: string }>> = [];
  for (let i = 0; i < IRAQ_GOVERNORATES.length; i += 2) {
    const row = [{ text: IRAQ_GOVERNORATES[i] }];
    if (IRAQ_GOVERNORATES[i + 1]) row.push({ text: IRAQ_GOVERNORATES[i + 1] });
    rows.push(row);
  }
  rows.push([{ text: 'إلغاء' }]);
  return {
    keyboard: rows,
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function loadFileSessions(): Record<string, MerchantBotSession> {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // تجاهل
  }
  return {};
}

function saveFileSessions(all: Record<string, MerchantBotSession>) {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(all, null, 2), 'utf8');
  } catch {
    // تجاهل
  }
}

export async function getSession(chatId: string): Promise<MerchantBotSession> {
  const id = String(chatId);
  const mem = memorySessions.get(id);
  if (mem) return mem;

  const file = loadFileSessions()[id];
  if (file) {
    memorySessions.set(id, file);
    return file;
  }

  const db = getActiveSupabase();
  if (db) {
    try {
      const { data } = await db
        .from('system_settings')
        .select('value')
        .eq('key', `${SESSION_PREFIX}${id}`)
        .maybeSingle();
      if (data?.value) {
        const session = data.value as MerchantBotSession;
        memorySessions.set(id, session);
        return session;
      }
    } catch {
      // تجاهل
    }
  }

  return { chatId: id, step: 'idle', data: {}, updatedAt: new Date().toISOString() };
}

export async function saveSession(session: MerchantBotSession): Promise<void> {
  session.updatedAt = new Date().toISOString();
  memorySessions.set(session.chatId, session);

  const all = loadFileSessions();
  all[session.chatId] = session;
  saveFileSessions(all);

  const db = getActiveSupabase();
  if (db) {
    try {
      await db.from('system_settings').upsert(
        {
          key: `${SESSION_PREFIX}${session.chatId}`,
          value: session,
          description: `جلسة بوت التاجر ${session.chatId}`,
          updated_at: session.updatedAt,
        },
        { onConflict: 'key' }
      );
    } catch {
      // تجاهل
    }
  }
}

export async function clearSession(chatId: string): Promise<void> {
  const id = String(chatId);
  memorySessions.delete(id);
  const all = loadFileSessions();
  delete all[id];
  saveFileSessions(all);

  const db = getActiveSupabase();
  if (db) {
    try {
      await db.from('system_settings').delete().eq('key', `${SESSION_PREFIX}${id}`);
    } catch {
      // تجاهل
    }
  }
}

function welcomeAuthMessage(firstName: string): BotReply {
  return {
    text: [
      `أهلاً بك يا ${firstName} في بوت وصلي للتجار`,
      '==============================',
      'من هنا تقدر:',
      '• تنشئ حساب تاجر ومتجر جديد',
      '• تسجّل دخول لحسابك',
      '• تسترجع رمز الدخول إذا نسيته',
      '',
      'وبعد التسجيل يصلك إشعار فوري بأي طلب جديد على متجرك.',
      '==============================',
      'اختر من الأزرار بالأسفل:',
    ].join('\n'),
    replyMarkup: authMenuKeyboard(),
  };
}

async function linkStoreToChat(store: Store, chatId: string, username?: string) {
  await updateStore(store.id, {
    telegramChatId: String(chatId),
    telegramUsername: username || undefined,
  });
}

function successAccountMessage(store: Store, firstName: string, isNew: boolean): BotReply {
  const { storeUrl, dashboardUrl } = buildMerchantLinks(store);
  return {
    text: [
      isNew ? `مبروك يا ${firstName}! تم إنشاء متجرك بنجاح` : `أهلاً بعودتك يا ${firstName}!`,
      '==============================',
      `المتجر: ${store.name}`,
      `كود المتجر: ${store.code}`,
      `التاجر: ${store.ownerName || firstName}`,
      '------------------------------',
      'احفظ هذين الرابطين:',
      '',
      'رابط متجر التاجر (للزبائن):',
      storeUrl,
      '',
      'رابط صفحة التاجر:',
      dashboardUrl,
      '------------------------------',
      'هذا البوت مربوط بمتجرك الآن، وستصلك إشعارات الطلبات هنا مباشرة.',
      '==============================',
    ].join('\n'),
    // نُزيل لوحة المحافظات ثم نعرض أزرار الروابط في نفس الرد عبر رسالة لاحقة من الويب هوك عند الحاجة
    replyMarkup: {
      inline_keyboard: [
        [{ text: 'رابط متجر التاجر (للزبائن)', url: storeUrl }],
        [{ text: 'فتح صفحة التاجر', url: dashboardUrl }],
      ],
    },
  };
}

export async function startAuthFlow(firstName: string): Promise<BotReply> {
  return welcomeAuthMessage(firstName);
}

export async function handleAuthCallback(params: {
  chatId: string;
  data: string;
  firstName: string;
  username?: string;
}): Promise<BotReply> {
  const { chatId, data, firstName } = params;
  const session = await getSession(chatId);

  if (data === 'auth:cancel') {
    await clearSession(chatId);
    return {
      text: 'تم الإلغاء. اختر ما تريد من القائمة:',
      replyMarkup: authMenuKeyboard(),
    };
  }

  if (data === 'auth:register') {
    session.step = 'register_name';
    session.data = {};
    await saveSession(session);
    return {
      text: 'إنشاء حساب تاجر جديد\n\nما اسمك الثلاثي؟',
      replyMarkup: cancelKeyboard(),
    };
  }

  if (data === 'auth:login') {
    session.step = 'login_phone';
    session.data = {};
    await saveSession(session);
    return {
      text: 'تسجيل الدخول\n\nأرسل رقم هاتفك المسجّل (مثال: 07XXXXXXXXX)',
      replyMarkup: cancelKeyboard(),
    };
  }

  if (data === 'auth:recover') {
    session.step = 'recover_phone';
    session.data = {};
    await saveSession(session);
    return {
      text: [
        'استرجاع رمز الدخول',
        '',
        'أرسل رقم هاتفك المسجّل.',
        'سنرسل لك رمز تأكيد مؤقت (لا نرسل الرمز السري القديم حفاظاً على أمانك).',
      ].join('\n'),
      replyMarkup: cancelKeyboard(),
    };
  }

  return welcomeAuthMessage(firstName);
}

export async function handleAuthText(params: {
  chatId: string;
  text: string;
  firstName: string;
  username?: string;
}): Promise<BotReply | null> {
  const { chatId, firstName, username } = params;
  const text = (params.text || '').trim();
  if (!text) return null;

  if (text === 'إلغاء' || text === '/cancel') {
    await clearSession(chatId);
    return {
      text: 'تم الإلغاء. اختر ما تريد من القائمة:',
      replyMarkup: { remove_keyboard: true },
    };
  }

  // أوامر قائمة سريعة بالنص
  if (text === 'إنشاء حساب' || text === 'إنشاء حساب تاجر' || text === 'تسجيل') {
    return handleAuthCallback({ chatId, data: 'auth:register', firstName, username });
  }
  if (text === 'تسجيل دخول' || text === 'دخول') {
    return handleAuthCallback({ chatId, data: 'auth:login', firstName, username });
  }
  if (text === 'نسيت الرمز' || text === 'نسيت رمز الدخول') {
    return handleAuthCallback({ chatId, data: 'auth:recover', firstName, username });
  }

  const session = await getSession(chatId);
  if (session.step === 'idle') return null;

  switch (session.step) {
    case 'login_phone':
      return handleLoginPhone(session, text);
    case 'login_pin':
      return handleLoginPin(session, text, firstName, username);
    case 'recover_phone':
      return handleRecoverPhone(session, text, chatId);
    case 'recover_otp':
      return handleRecoverOtp(session, text);
    case 'recover_new_pin':
      return handleRecoverNewPin(session, text, firstName, username);
    case 'register_name':
      return handleRegisterName(session, text);
    case 'register_phone':
      return handleRegisterPhone(session, text);
    case 'register_store':
      return handleRegisterStore(session, text);
    case 'register_pin':
      return handleRegisterPin(session, text);
    case 'register_confirm_pin':
      return handleRegisterConfirmPin(session, text);
    case 'register_city':
      return handleRegisterCity(session, text, firstName, username);
    default:
      return null;
  }
}

async function handleLoginPhone(session: MerchantBotSession, text: string): Promise<BotReply> {
  const phoneError = getIraqiPhoneValidationMessage(text);
  if (phoneError) {
    return { text: phoneError + '\n\nأعد إرسال الرقم بشكل صحيح:', replyMarkup: cancelKeyboard() };
  }

  const phone = toIraqiLocalPhone(text);
  const store = await findStoreByPhone(phone);
  if (!store) {
    return {
      text: 'ما لقينا حساب مرتبط بهذا الرقم.\nتقدر تنشئ حساب جديد من الزر بالأسفل.',
      replyMarkup: authMenuKeyboard(),
    };
  }

  session.data.phone = phone;
  session.step = 'login_pin';
  await saveSession(session);

  if (!store.hasLoginPin) {
    session.step = 'recover_phone';
    await saveSession(session);
    return {
      text: 'هذا الحساب ما عنده رمز دخول بعد. نبدأ استرجاع/تعيين رمز جديد.\nأرسل رقمك مرة أخرى أو اضغط «نسيت رمز الدخول» من القائمة.',
      replyMarkup: authMenuKeyboard(),
    };
  }

  return {
    text: `أهلاً بك. متجرك: ${store.name}\n\nالآن أرسل رمز الدخول:`,
    replyMarkup: cancelKeyboard(),
  };
}

async function handleLoginPin(
  session: MerchantBotSession,
  text: string,
  firstName: string,
  username?: string
): Promise<BotReply> {
  const phone = session.data.phone || '';
  const pin = text.trim();
  const matches = await findStoresByPhone(phone);
  let matched: Store | null = null;
  for (const candidate of matches) {
    if (!candidate.hasLoginPin) continue;
    if (await verifyStoreLoginPin(candidate, pin)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    return {
      text: 'رقم الهاتف أو رمز الدخول غير صحيح.\nحاول مرة ثانية، أو اختر «نسيت رمز الدخول».',
      replyMarkup: {
        inline_keyboard: [
          [{ text: 'إعادة المحاولة', callback_data: 'auth:login' }],
          [{ text: 'نسيت رمز الدخول', callback_data: 'auth:recover' }],
        ],
      },
    };
  }

  await linkStoreToChat(matched, session.chatId, username);
  await clearSession(session.chatId);
  return successAccountMessage(matched, firstName, false);
}

async function handleRecoverPhone(
  session: MerchantBotSession,
  text: string,
  chatId: string
): Promise<BotReply> {
  const phoneError = getIraqiPhoneValidationMessage(text);
  if (phoneError) {
    return { text: phoneError + '\n\nأعد إرسال الرقم:', replyMarkup: cancelKeyboard() };
  }

  const phone = toIraqiLocalPhone(text);
  const store = await findStoreByPhone(phone);

  // رسالة عامة حتى لا نكشف وجود الرقم بسهولة بشكل كامل، مع مسار واضح إن وُجد
  if (!store) {
    await clearSession(chatId);
    return {
      text: 'إذا كان الرقم مسجلاً لدينا، راح يوصلك رمز التأكيد عبر واتساب من الإدارة.\nما لقينا طلباً جاهزاً الآن. تأكد من الرقم أو أنشئ حساباً جديداً.',
      replyMarkup: authMenuKeyboard(),
    };
  }

  const meta = await getStoreOtpMeta(store);
  if (meta.requestedAt) {
    const elapsed = Date.now() - new Date(meta.requestedAt).getTime();
    if (elapsed < 60 * 1000) {
      return {
        text: 'تم طلب رمز مؤخراً. انتظر دقيقة ثم حاول مجدداً.',
        replyMarkup: cancelKeyboard(),
      };
    }
  }

  const otpCode = generateOtpCode(6);
  await saveStoreLoginOtp(store, otpCode);

  const waNumber = toWhatsAppNumber(store.phone || phone);
  const waText = buildAdminWhatsAppOtpMessage(otpCode, store.name);
  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;

  await sendAdminLoginRecoveryNotification({
    storeName: store.name,
    ownerName: store.ownerName,
    storeCode: store.code,
    phone: store.phone || phone,
    otpCode,
    whatsappUrl,
  });

  // إذا كان هذا التيليجرام مربوط مسبقاً بنفس المتجر، نرسل الرمز هنا مباشرة
  const linkedHere =
    String(store.telegramChatId || '') === String(chatId) ||
    String((store as any).settings?.telegram_chat_id || '') === String(chatId);

  session.data.phone = phone;
  session.step = 'recover_otp';
  await saveSession(session);

  if (linkedHere) {
    return {
      text: [
        'أرسلنا رمز التأكيد إلى هذه المحادثة لأن حسابك مربوط مسبقاً.',
        '',
        `رمز التأكيد: ${otpCode}`,
        '',
        'الرمز صالح لمدة 15 دقيقة.',
        'الآن أرسل الرمز هنا للمتابعة:',
      ].join('\n'),
      replyMarkup: cancelKeyboard(),
    };
  }

  return {
    text: [
      'تم إرسال طلب رمز التأكيد للإدارة.',
      'راح يوصلك الرمز عبر واتساب على رقمك المسجّل.',
      '',
      'عندما يوصلك الرمز، أرسله هنا مباشرة.',
      'لا نرسل رمز الدخول السري القديم — هذا رمز مؤقت فقط لحماية حسابك.',
    ].join('\n'),
    replyMarkup: cancelKeyboard(),
  };
}

async function handleRecoverOtp(session: MerchantBotSession, text: string): Promise<BotReply> {
  const phone = session.data.phone || '';
  const store = await findStoreByPhone(phone);
  if (!store) {
    await clearSession(session.chatId);
    return { text: 'انتهت الجلسة. ابدأ من جديد.', replyMarkup: authMenuKeyboard() };
  }

  const ok = await verifyStoreLoginOtp(store, text.trim());
  if (!ok) {
    return {
      text: 'رمز التأكيد غير صحيح أو منتهٍ. أعد إرساله أو اطلب رمزاً جديداً من «نسيت رمز الدخول».',
      replyMarkup: {
        inline_keyboard: [
          [{ text: 'طلب رمز جديد', callback_data: 'auth:recover' }],
          [{ text: 'إلغاء', callback_data: 'auth:cancel' }],
        ],
      },
    };
  }

  session.step = 'recover_new_pin';
  await saveSession(session);
  return {
    text: 'تم التحقق بنجاح.\n\nالآن أرسل رمز دخول جديد (4 خانات على الأقل):',
    replyMarkup: cancelKeyboard(),
  };
}

async function handleRecoverNewPin(
  session: MerchantBotSession,
  text: string,
  firstName: string,
  username?: string
): Promise<BotReply> {
  const pinError = validatePinFormat(text);
  if (pinError) {
    return { text: pinError + '\n\nأرسل رمزاً جديداً:', replyMarkup: cancelKeyboard() };
  }

  const phone = session.data.phone || '';
  const store = await findStoreByPhone(phone);
  if (!store) {
    await clearSession(session.chatId);
    return { text: 'انتهت الجلسة. ابدأ من جديد.', replyMarkup: authMenuKeyboard() };
  }

  const updated = await setStoreLoginPin(store, text.trim());
  await linkStoreToChat(updated, session.chatId, username);
  await clearSession(session.chatId);

  const links = buildMerchantLinks(updated);
  return {
    text: [
      `تم تحديث رمز الدخول بنجاح يا ${firstName}.`,
      'احفظ الرمز في مكان آمن ولا تشاركه مع أحد.',
      '==============================',
      `متجرك: ${updated.name}`,
      `الكود: ${updated.code}`,
    ].join('\n'),
    replyMarkup: buildStoreLinksKeyboard(links.storeUrl, links.dashboardUrl),
  };
}

async function handleRegisterName(session: MerchantBotSession, text: string): Promise<BotReply> {
  if (text.trim().length < 3) {
    return { text: 'يرجى كتابة اسمك الثلاثي بشكل أوضح:', replyMarkup: cancelKeyboard() };
  }
  session.data.ownerName = text.trim();
  session.step = 'register_phone';
  await saveSession(session);
  return {
    text: 'تمام. الآن أرسل رقم هاتفك (مثال: 07XXXXXXXXX)',
    replyMarkup: cancelKeyboard(),
  };
}

async function handleRegisterPhone(session: MerchantBotSession, text: string): Promise<BotReply> {
  const phoneError = getIraqiPhoneValidationMessage(text);
  if (phoneError) {
    return { text: phoneError + '\n\nأعد إرسال الرقم:', replyMarkup: cancelKeyboard() };
  }

  const phone = toIraqiLocalPhone(text);
  const existing = await findStoreByPhone(phone);
  if (existing) {
    await clearSession(session.chatId);
    return {
      text: [
        'هذا الرقم موجود سابقاً ولديه حساب تاجر.',
        `المتجر: ${existing.name}`,
        '',
        'سجّل الدخول أو استرجع رمز الدخول إن نسيته.',
      ].join('\n'),
      replyMarkup: {
        inline_keyboard: [
          [{ text: 'تسجيل دخول', callback_data: 'auth:login' }],
          [{ text: 'نسيت رمز الدخول', callback_data: 'auth:recover' }],
        ],
      },
    };
  }

  session.data.phone = phone;
  session.step = 'register_store';
  await saveSession(session);
  return {
    text: 'ممتاز. ما اسم متجرك؟',
    replyMarkup: cancelKeyboard(),
  };
}

async function handleRegisterStore(session: MerchantBotSession, text: string): Promise<BotReply> {
  if (text.trim().length < 2) {
    return { text: 'يرجى كتابة اسم المتجر:', replyMarkup: cancelKeyboard() };
  }
  session.data.storeName = text.trim();
  session.step = 'register_pin';
  await saveSession(session);
  return {
    text: 'اختر رمز دخول لحسابك (4 خانات على الأقل).\nاحفظه جيداً لأنك تحتاجه في كل مرة تسجّل دخول.',
    replyMarkup: cancelKeyboard(),
  };
}

async function handleRegisterPin(session: MerchantBotSession, text: string): Promise<BotReply> {
  const pinError = validatePinFormat(text);
  if (pinError) {
    return { text: pinError + '\n\nأرسل رمزاً آخر:', replyMarkup: cancelKeyboard() };
  }
  session.data.pin = text.trim();
  session.step = 'register_confirm_pin';
  await saveSession(session);
  return {
    text: 'أعد كتابة رمز الدخول للتأكيد:',
    replyMarkup: cancelKeyboard(),
  };
}

async function handleRegisterConfirmPin(session: MerchantBotSession, text: string): Promise<BotReply> {
  if (text.trim() !== session.data.pin) {
    session.step = 'register_pin';
    session.data.pin = undefined;
    await saveSession(session);
    return {
      text: 'التأكيد غير متطابق. أرسل رمز الدخول من جديد:',
      replyMarkup: cancelKeyboard(),
    };
  }
  session.step = 'register_city';
  await saveSession(session);
  return {
    text: 'اختر محافظتك من الأزرار بالأسفل:',
    replyMarkup: governorateKeyboard(),
  };
}

async function handleRegisterCity(
  session: MerchantBotSession,
  text: string,
  firstName: string,
  username?: string
): Promise<BotReply> {
  const city = text.trim();
  const valid = (IRAQ_GOVERNORATES as readonly string[]).includes(city);
  if (!valid) {
    return {
      text: 'يرجى اختيار المحافظة من الأزرار الظاهرة فقط:',
      replyMarkup: governorateKeyboard(),
    };
  }

  const phone = session.data.phone || '';
  const existing = await findStoreByPhone(phone);
  if (existing) {
    await clearSession(session.chatId);
    return {
      text: 'هذا الرقم موجود سابقاً. سجّل الدخول بدل إنشاء حساب جديد.',
      replyMarkup: {
        inline_keyboard: [
          [{ text: 'تسجيل دخول', callback_data: 'auth:login' }],
          [{ text: 'نسيت رمز الدخول', callback_data: 'auth:recover' }],
        ],
      },
    };
  }

  try {
    const store = await createNewStore({
      ownerName: session.data.ownerName,
      name: session.data.storeName || `متجر ${session.data.ownerName}`,
      phone,
      city,
      loginPin: session.data.pin,
    });

    await linkStoreToChat(store, session.chatId, username);
    await clearSession(session.chatId);
    return successAccountMessage(store, firstName, true);
  } catch (err: any) {
    if (err instanceof PhoneAlreadyExistsError || err?.name === 'PhoneAlreadyExistsError') {
      await clearSession(session.chatId);
      return {
        text: 'هذا الرقم موجود سابقاً. سجّل الدخول أو استرجع رمز الدخول.',
        replyMarkup: {
          inline_keyboard: [
            [{ text: 'تسجيل دخول', callback_data: 'auth:login' }],
            [{ text: 'نسيت رمز الدخول', callback_data: 'auth:recover' }],
          ],
        },
      };
    }
    console.error('فشل إنشاء متجر من البوت:', err);
    return {
      text: 'تعذر إنشاء المتجر الآن. حاول مرة أخرى بعد قليل أو سجّل من الموقع.',
      replyMarkup: authMenuKeyboard(),
    };
  }
}

export function isAuthCommand(text: string): boolean {
  const t = (text || '').trim();
  return (
    t === '/start' ||
    t.startsWith('/start ') ||
    t === 'إنشاء حساب' ||
    t === 'إنشاء حساب تاجر' ||
    t === 'تسجيل' ||
    t === 'تسجيل دخول' ||
    t === 'دخول' ||
    t === 'نسيت الرمز' ||
    t === 'نسيت رمز الدخول' ||
    t === 'إلغاء' ||
    t === '/cancel' ||
    t === '/auth' ||
    t === 'القائمة'
  );
}
