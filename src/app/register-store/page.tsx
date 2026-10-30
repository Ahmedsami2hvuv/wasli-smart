'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, Share2, User, Phone, MapPin, Copy, Check, Lock, ExternalLink, Bell, KeyRound, LogIn, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { IRAQ_GOVERNORATES } from '@/data/iraqCities';
import PinStrengthMeter from '@/components/merchant/PinStrengthMeter';
import MerchantAuthForm from '@/components/merchant/MerchantAuthForm';
import PasswordInput from '@/components/merchant/PasswordInput';
import { getIraqiPhoneValidationMessage, validatePinFormat } from '@/lib/merchantAuthShared';
import type { Store as StoreType } from '@/types';

const ORDERS_BOT_USERNAME = 'wasliasharatbot';

export default function RegisterStorePage() {
  const router = useRouter();
  const [pageMode, setPageMode] = useState<'register' | 'login'>('register');
  const [ownerName, setOwnerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdStore, setCreatedStore] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [telegramOpened, setTelegramOpened] = useState(false);
  const [loginPin, setLoginPin] = useState('');
  const [confirmLoginPin, setConfirmLoginPin] = useState('');
  const [phoneExists, setPhoneExists] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    ownerName?: string;
    storeName?: string;
    phone?: string;
    loginPin?: string;
    confirmLoginPin?: string;
    city?: string;
  }>({});

  const clearFieldError = (key: keyof typeof fieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleExistingLoginSuccess = (store: StoreType) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wasli_current_store', JSON.stringify({ ...store, authOk: true }));
    }
    router.push(`/merchant?storeCode=${store.code}`);
  };

  // توليد النص الكامل الشامل لمعلومات المتجر للحفظ والمشاركة
  const getFullStoreInfoText = () => {
    if (!createdStore) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wasli-smart.vercel.app';
    const storeUrl = `${origin}/s/${createdStore.code}?name=${encodeURIComponent(createdStore.name)}`;
    const dashboardUrl = `${origin}/merchant?storeCode=${createdStore.code}&name=${encodeURIComponent(createdStore.name)}&owner=${encodeURIComponent(createdStore.ownerName || "")}&city=${encodeURIComponent(createdStore.city || "")}&phone=${encodeURIComponent(createdStore.phone || "")}`;

    return `معلومات متجر التاجر في منصة وصلي:
- اسم التاجر: ${createdStore.ownerName || 'غير محدد'}
- اسم المتجر: ${createdStore.name}
- المحافظة: ${createdStore.city}
- رقم الهاتف: ${createdStore.phone}
- رمز المتجر الفريد: ${createdStore.code}

- رابط متجر التاجر المباشر للزبائن:
${storeUrl}

- رابط لوحة إدارة متجرك (احفظه في مكان آمن للعودة إليه):
${dashboardUrl}`;
  };

  const handleCopyStoreInfo = async () => {
    const textToCopy = getFullStoreInfoText();
    if (!textToCopy) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedInfo(true);
    } catch (err) {
      console.error('فشل في نسخ المعلومات:', err);
    }
  };

  // مشاركة المعلومات عبر تطبيقات الهاتف (واتساب / تيليجرام / غيرها)
  const handleShareStoreInfo = async () => {
    const fullText = getFullStoreInfoText();
    if (!fullText) return;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `معلومات متجر ${createdStore.name}`,
          text: fullText,
        });
        setCopiedInfo(true);
        return;
      } catch (e) {
        // إذا ألغى المستخدم المشاركة أو لم يدعمها
      }
    }

    // بديل تلقائي عند عدم توفر واجهة المشاركة الأصلية في المتصفح: فتح واتساب مباشرة
    handleShareToWhatsApp();
  };

  // فتح واتساب مباشرة مع النص مجهزاً بالكامل
  const handleShareToWhatsApp = () => {
    const fullText = getFullStoreInfoText();
    if (!fullText) return;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
    window.open(waUrl, '_blank');
    setCopiedInfo(true);
  };

  // فتح تيليجرام مباشرة مع النص مجهزاً بالكامل
  const handleShareToTelegram = () => {
    const fullText = getFullStoreInfoText();
    if (!fullText) return;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(fullText)}`;
    window.open(tgUrl, '_blank');
    setCopiedInfo(true);
  };

  // فتح بوت إشعارات الطلبات مع التعرف التلقائي على المتجر وإرسال الروابط
  const getOrdersBotConnectUrl = (storeCode: string) =>
    `https://t.me/${ORDERS_BOT_USERNAME}?start=store_${encodeURIComponent(storeCode)}`;

  const handleConnectOrdersBot = (storeCode?: string) => {
    const code = storeCode || createdStore?.code;
    if (!code) return;
    window.open(getOrdersBotConnectUrl(code), '_blank', 'noopener,noreferrer');
    setTelegramOpened(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setPhoneExists(false);

    const nextErrors: typeof fieldErrors = {};

    if (!ownerName.trim()) {
      nextErrors.ownerName = 'يرجى كتابة اسمك الثلاثي';
    }
    if (!storeName.trim()) {
      nextErrors.storeName = 'يرجى كتابة اسم متجرك';
    }
    if (!phone.trim()) {
      nextErrors.phone = 'يرجى إدخال رقم هاتفك للتواصل';
    } else {
      const phoneError = getIraqiPhoneValidationMessage(phone);
      if (phoneError) nextErrors.phone = phoneError;
    }

    const pinError = validatePinFormat(loginPin);
    if (pinError) {
      nextErrors.loginPin = pinError;
    }
    if (!confirmLoginPin.trim()) {
      nextErrors.confirmLoginPin = 'يرجى تأكيد رمز الدخول';
    } else if (loginPin !== confirmLoginPin) {
      nextErrors.confirmLoginPin = 'تأكيد رمز الدخول غير متطابق';
    }
    if (!city.trim()) {
      nextErrors.city = 'يرجى اختيار محافظتك';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          name: storeName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          loginPin: loginPin.trim(),
        }),
      });

      const data = await res.json();

      if (data.success && data.store) {
        setCreatedStore(data.store);
        // حفظ هوية المتجر في المتصفح للوصول السريع
        if (typeof window !== 'undefined') {
          localStorage.setItem('wasli_current_store', JSON.stringify(data.store));
          try {
            const registryStr = localStorage.getItem('wasli_stores_registry');
            const registry = registryStr ? JSON.parse(registryStr) : [];
            const exists = registry.some((s: any) => s.code === data.store.code);
            if (!exists) {
              registry.unshift(data.store);
              localStorage.setItem('wasli_stores_registry', JSON.stringify(registry));
            }
          } catch (e) {}

          // توجيه تلقائي لبوت الإشعارات لحفظ الروابط وتفعيل التنبيهات فوراً
          try {
            window.open(getOrdersBotConnectUrl(data.store.code), '_blank', 'noopener,noreferrer');
            setTelegramOpened(true);
          } catch (e) {}
        }
      } else {
        const exists = Boolean(data.phoneExists || data.code === 'PHONE_EXISTS');
        setPhoneExists(exists);
        if (exists) {
          setFieldErrors({ phone: 'هذا الرقم مسجّل مسبقاً' });
          setErrorMsg(
            data.message ||
              'هذا الرقم مسجّل مسبقاً ولديه حساب تاجر. سجّل الدخول أو استخدم نسيت رمز الدخول.'
          );
        } else {
          setErrorMsg(data.message || 'حدث خطأ أثناء إنشاء المتجر');
        }
      }
    } catch (err: any) {
      setPhoneExists(false);
      setErrorMsg('تعذر الاتصال بالخادم، يرجى المحاولة ثانية');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* نافذة منبثقة: الرقم مسجّل مسبقاً */}
      {phoneExists && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-amber-200/80 p-6 sm:p-7 text-right animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            <button
              type="button"
              onClick={() => {
                setPhoneExists(false);
                setErrorMsg('');
              }}
              className="absolute top-4 left-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 text-center mb-2">
              هذا الرقم مسجّل مسبقاً
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed text-center mb-2">
              {errorMsg || 'لديك حساب تاجر مرتبط بهذا الرقم. سجّل الدخول أو استرجع رمز الدخول.'}
            </p>
            {phone && (
              <p className="text-center font-mono font-bold text-brand-800 bg-brand-50 border border-brand-100 rounded-xl py-2 px-3 mb-5" dir="ltr">
                {phone}
              </p>
            )}

            <div className="space-y-2.5">
              <Link
                href="/merchant"
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-black flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول لحسابي</span>
              </Link>
              <Link
                href={`/merchant?recover=1&phone=${encodeURIComponent(phone.trim())}`}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-sm font-bold flex items-center justify-center"
              >
                نسيت رمز الدخول؟ استرجع حسابك
              </Link>
              <button
                type="button"
                onClick={() => {
                  setPhoneExists(false);
                  setErrorMsg('');
                  setPageMode('login');
                }}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                فتح تسجيل الدخول في هذه الصفحة
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto">
        {/* العودة للرئيسية */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700 transition-colors mb-8"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى الصفحة الرئيسية</span>
        </Link>

        {!createdStore ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80">
            {/* الهيدر */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-tr from-brand-700 to-skybrand-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-brand-500/20 mb-4">
                <Store className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                {pageMode === 'login' ? 'تسجيل دخول التاجر' : 'انضم كتاجر وأنشئ متجرك مجاناً'}
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                {pageMode === 'login'
                  ? 'أدخل رقم هاتفك ورمز الدخول لفتح صفحة التاجر ومتابعة مبيعاتك وأرباحك.'
                  : 'كن تاجراً معتمداً، اختر منتجات المنصة، حدد سعر البيع الذي تريده، وابدأ بجني أرباحك فورياً بدون الحاجة لرأس مال أو شراء بضاعة مسبقاً!'}
              </p>
            </div>

            {/* تبديل بين إنشاء حساب وتسجيل الدخول */}
            <div className="grid grid-cols-2 gap-2 p-1.5 mb-6 rounded-2xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setPageMode('register');
                  setErrorMsg('');
                  setPhoneExists(false);
                  setFieldErrors({});
                }}
                className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  pageMode === 'register'
                    ? 'bg-white text-brand-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${pageMode === 'register' ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>إنشاء حساب</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPageMode('login');
                  setErrorMsg('');
                  setPhoneExists(false);
                }}
                className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  pageMode === 'login'
                    ? 'bg-white text-brand-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <LogIn className={`w-3.5 h-3.5 ${pageMode === 'login' ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>تسجيل الدخول</span>
              </button>
            </div>

            {pageMode === 'login' ? (
              <div className="space-y-2">
                <MerchantAuthForm
                  onSuccess={handleExistingLoginSuccess}
                  showRegisterLink={false}
                />
                <button
                  type="button"
                  onClick={() => setPageMode('register')}
                  className="w-full text-xs font-bold text-brand-700 hover:text-brand-800 py-2 cursor-pointer"
                >
                  ما عندك حساب؟ أنشئ متجرك مجاناً
                </button>
              </div>
            ) : (
              <>
            {/* الميزات السريعة */}
            <div className="grid grid-cols-3 gap-2 mb-8 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 text-center text-xs">
              <div className="flex flex-col items-center gap-1 p-2">
                <ShieldCheck className="w-5 h-5 text-brand-700" />
                <span className="font-semibold text-slate-800">بدون رأس مال</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 border-x border-slate-200">
                <Zap className="w-5 h-5 text-accent-500" />
                <span className="font-semibold text-slate-800">توصيل لكل العراق</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2">
                <Share2 className="w-5 h-5 text-skybrand-600" />
                <span className="font-semibold text-slate-800">متجر تاجر مستقل</span>
              </div>
            </div>

            {/* النموذج */}
            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off" noValidate>
              {/* حقول وهمية لامتصاص اقتراحات كوكل لكلمات السر */}
              <input type="text" name="prevent_autofill_user" autoComplete="username" tabIndex={-1} aria-hidden="true" className="hidden" style={{ display: 'none' }} />
              <input type="password" name="prevent_autofill_pass" autoComplete="new-password" tabIndex={-1} aria-hidden="true" className="hidden" style={{ display: 'none' }} />

              {/* الاسم الثلاثي */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-brand-700" />
                  <span>اسمك الثلاثي</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: أحمد عبد الله حسين"
                  value={ownerName}
                  onChange={(e) => {
                    setOwnerName(e.target.value);
                    clearFieldError('ownerName');
                  }}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all ${
                    fieldErrors.ownerName ? 'border-red-400 bg-red-50/40' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.ownerName && (
                  <p className="mt-1.5 text-[11px] font-bold text-red-600">{fieldErrors.ownerName}</p>
                )}
              </div>

              {/* اسم المتجر */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-brand-700" />
                  <span>اسم متجرك</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: متجر النخيل، متجر الوسام"
                  value={storeName}
                  onChange={(e) => {
                    setStoreName(e.target.value);
                    clearFieldError('storeName');
                  }}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all ${
                    fieldErrors.storeName ? 'border-red-400 bg-red-50/40' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.storeName && (
                  <p className="mt-1.5 text-[11px] font-bold text-red-600">{fieldErrors.storeName}</p>
                )}
              </div>

              {/* رقم الهاتف */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-brand-700" />
                  <span>رقم هاتفك (واتساب للتواصل)</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="07700000000"
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setPhone(digits);
                    clearFieldError('phone');
                    setPhoneExists(false);
                    setErrorMsg('');
                  }}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm text-right outline-none transition-all ${
                    fieldErrors.phone ? 'border-red-400 bg-red-50/40' : 'border-slate-300'
                  }`}
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  يجب أن يكون الرقم 11 خانة ويبدأ بـ 07 (مثال: 07701234567)
                  {phone ? ` — الآن: ${phone.replace(/\D/g, '').length}/11` : ''}
                </p>
                {fieldErrors.phone && !phoneExists && (
                  <p className="mt-1.5 text-[11px] font-bold text-red-600">{fieldErrors.phone}</p>
                )}
              </div>

              {/* رمز الدخول لحماية حساب التاجر */}
              <div className={`rounded-2xl border p-4 space-y-3 ${fieldErrors.loginPin || fieldErrors.confirmLoginPin ? 'border-red-200 bg-red-50/30' : 'border-brand-100 bg-brand-50/40'}`}>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-brand-700" />
                    <span>رمز الدخول لحسابك</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                    هذا الرمز يحمي صفحة التاجر. احفظه جيداً وستحتاجه عند كل دخول.
                  </p>
                  <PasswordInput
                    minLength={4}
                    name="merchant_pin_create"
                    placeholder="4 خانات على الأقل"
                    value={loginPin}
                    onChange={(v) => {
                      setLoginPin(v);
                      clearFieldError('loginPin');
                      clearFieldError('confirmLoginPin');
                    }}
                    autoComplete="off"
                    className={fieldErrors.loginPin ? 'border-red-400' : ''}
                  />
                  <PinStrengthMeter pin={loginPin} />
                  {fieldErrors.loginPin && (
                    <p className="mt-1.5 text-[11px] font-bold text-red-600">{fieldErrors.loginPin}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-brand-700" />
                    <span>تأكيد رمز الدخول</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <PasswordInput
                    minLength={4}
                    name="merchant_pin_confirm"
                    placeholder="أعد كتابة رمز الدخول"
                    value={confirmLoginPin}
                    onChange={(v) => {
                      setConfirmLoginPin(v);
                      clearFieldError('confirmLoginPin');
                    }}
                    autoComplete="off"
                    className={fieldErrors.confirmLoginPin ? 'border-red-400' : ''}
                  />
                  {fieldErrors.confirmLoginPin && (
                    <p className="mt-1.5 text-[11px] font-bold text-red-600">{fieldErrors.confirmLoginPin}</p>
                  )}
                </div>
              </div>

              {/* اختيار المحافظة من بين 18 محافظة */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand-700" />
                  <span>المحافظة</span>
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    clearFieldError('city');
                  }}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none transition-all bg-white ${
                    fieldErrors.city ? 'border-red-400 bg-red-50/40 text-slate-900' : city ? 'border-slate-300 text-slate-900' : 'border-slate-300 text-slate-400'
                  }`}
                >
                  <option value="" disabled>
                    اختر محافظتك
                  </option>
                  {IRAQ_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  اختر محافظتك من بين المحافظات العراقية الـ 18
                </p>
                {fieldErrors.city && (
                  <p className="mt-1.5 text-[11px] font-bold text-red-600">{fieldErrors.city}</p>
                )}
              </div>

              {errorMsg && !phoneExists && (
                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold text-right">
                  {errorMsg}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-right">
                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                  طريقة استلام الأرباح (ماستر كارت / زين كاش / رصيد) تُطلب لاحقاً فقط عندما تصير عندك أرباح وتريد سحبها من صفحة التاجر.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-bold text-base shadow-lg shadow-brand-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>جاري إنشاء متجر التاجر...</span>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-accent-400" />
                    <span>تأكيد وإنشاء المتجر فورياً</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPageMode('login')}
                className="w-full text-xs font-bold text-sky-700 hover:text-sky-800 py-2 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>عندك حساب مسبقاً؟ سجّل الدخول من هنا</span>
              </button>
            </form>
              </>
            )}
          </div>
        ) : (
          /* شاشة نجاح إنشاء المتجر */
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-emerald-100 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 mb-2">
              مبروك! تم إنشاء متجرك بنجاح
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              أصبح متجر التاجر جاهزاً الآن. الخطوة الأهم: احفظ روابطك وفعّل إشعارات الطلبات على التليكرام.
            </p>

            {/* الخطوة الأولى: تفعيل بوت التليكرام وحفظ الروابط */}
            <div className="bg-gradient-to-br from-sky-50 to-brand-50 border-2 border-sky-200/90 rounded-2xl p-5 sm:p-6 text-right mb-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-600/30">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    احفظ روابطك وفعّل إشعارات التليكرام
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    البوت يتعرف على متجرك فوراً ويرسل لك رسالة فيها رابط المتجر ورابط صفحة التاجر، ويفعّل إشعارات الطلبات الجديدة.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleConnectOrdersBot()}
                className="w-full min-h-[48px] py-3.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-black text-sm shadow-md shadow-sky-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bell className="w-4 h-4 text-amber-300" />
                <span>
                  {telegramOpened
                    ? 'افتح البوت مرة أخرى إن لم تظهر الرسالة'
                    : 'فتح بوت الإشعارات الآن'}
                </span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </button>

              {telegramOpened && (
                <p className="mt-3 text-[11px] sm:text-xs text-sky-800 font-semibold text-center leading-relaxed">
                  تم فتح التليكرام. اضغط Start داخل البوت إن طُلب منك، وستصلك رسالة بروابطك فوراً.
                </p>
              )}
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-right space-y-3 mb-8">
              {createdStore.ownerName && (
                <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">اسم التاجر:</span>
                  <span className="font-bold text-slate-900">{createdStore.ownerName}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">اسم المتجر:</span>
                <span className="font-bold text-slate-900">{createdStore.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">المحافظة:</span>
                <span className="font-semibold text-slate-800">{createdStore.city}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">رقم الهاتف:</span>
                <span className="font-semibold text-slate-800" dir="ltr">{createdStore.phone}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">رمز المتجر الفريد:</span>
                <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">{createdStore.code}</span>
              </div>
              {/* الرابط الأول: رابط صفحة التاجر */}
              <div className="flex flex-col gap-1.5 text-sm pt-3 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-brand-700" />
                    <span>رابط صفحة التاجر (لوحة إدارة متجرك):</span>
                  </span>
                  <span className="text-[11px] text-brand-800 bg-brand-50 font-bold px-2 py-0.5 rounded-md">
                    صفحة التاجر
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-xs text-brand-800 bg-white p-2.5 rounded-xl border border-brand-200/90 break-all select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/merchant?storeCode=${createdStore.code}&name=${encodeURIComponent(createdStore.name)}&owner=${encodeURIComponent(createdStore.ownerName || "")}&city=${encodeURIComponent(createdStore.city || "")}&phone=${encodeURIComponent(createdStore.phone || "")}` : `/merchant?storeCode=${createdStore.code}&name=${encodeURIComponent(createdStore.name)}`}
                  </span>
                </div>
              </div>

              {/* الرابط الثاني: رابط متجر التاجر للزبائن */}
              <div className="flex flex-col gap-1.5 text-sm pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-skybrand-600" />
                    <span>رابط متجر التاجر المباشر (للزبائن والمشترين):</span>
                  </span>
                  <span className="text-[11px] text-skybrand-800 bg-skybrand-50 font-bold px-2 py-0.5 rounded-md">
                    متجر التاجر
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-xs text-skybrand-700 bg-white p-2.5 rounded-xl border border-skybrand-200/90 break-all select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/s/${createdStore.code}?name=${encodeURIComponent(createdStore.name)}` : `/s/${createdStore.code}?name=${encodeURIComponent(createdStore.name)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* بلوك التنبيه بعد نسخ المعلومات */}
            {copiedInfo && (
              <div className="bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 text-right shadow-sm mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="font-bold text-sm sm:text-base text-amber-950 flex items-center justify-between">
                      <span>تم نسخ معلوماتك بنجاح</span>
                      <span className="text-[11px] font-bold bg-amber-200/70 text-amber-900 px-2.5 py-0.5 rounded-full">
                        تنبيه أمان
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-semibold">
                      لقد قمت بنسخ كل معلوماتك، عليك بلصقها في مكان آمن (مثلاً في التيليجرام أو الواتساب) لتعود إليها، ولا تعطيها لشخص آخر.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* قسم خيارات المشاركة والحفظ السريع المباشر */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-right">
                  <div className="text-xs font-black text-slate-900">
                    حفظ ومشاركة بيانات متجرك:
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    أرسل معلومات متجرك لنفسك على واتساب أو تيليجرام لتعود إليها دائماً ولا تنساها
                  </p>
                </div>

                {/* أزرار المشاركة المباشرة (واتساب وتيليجرام وتطبيقات أخرى) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* زر واتساب المباشر */}
                  <button
                    type="button"
                    onClick={handleShareToWhatsApp}
                    className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>إرسال عبر واتساب</span>
                  </button>

                  {/* زر تيليجرام المباشر */}
                  <button
                    type="button"
                    onClick={handleShareToTelegram}
                    className="py-3 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-sky-600/20"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>إرسال عبر تيليجرام</span>
                  </button>

                  {/* زر مشاركة عبر تطبيقات الهاتف */}
                  <button
                    type="button"
                    onClick={handleShareStoreInfo}
                    className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-slate-800/20"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>مشاركة عبر التطبيقات</span>
                  </button>
                </div>

                {/* زر نسخ معلوماتي السريع كبديل */}
                <button
                  type="button"
                  onClick={handleCopyStoreInfo}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedInfo ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">تم نسخ كامل معلوماتك إلى الحافظة</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>نسخ المعلومات كنص للحافظة</span>
                    </>
                  )}
                </button>
              </div>

              {/* أزرار التنقل الرئيسية: الدخول لصفحة التاجر ومعاينة المتجر */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* زر الدخول إلى صفحة التاجر */}
                <Link
                  href={`/merchant?storeCode=${createdStore.code}&name=${encodeURIComponent(createdStore.name)}&owner=${encodeURIComponent(createdStore.ownerName || "")}&city=${encodeURIComponent(createdStore.city || "")}&phone=${encodeURIComponent(createdStore.phone || "")}`}
                  className="w-full py-3.5 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-black text-sm shadow-md shadow-brand-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <Store className="w-4 h-4 text-accent-400" />
                  <span>الدخول إلى صفحة التاجر</span>
                </Link>

                {/* زر معاينة متجر التاجر */}
                <Link
                  href={`/s/${createdStore.code}?name=${encodeURIComponent(createdStore.name)}`}
                  className="w-full py-3.5 px-6 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-1.5 text-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>معاينة متجر التاجر</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
