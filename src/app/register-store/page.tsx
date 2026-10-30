'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, Share2, User, Phone, MapPin, Copy, Check, Lock, CreditCard, Wallet, Smartphone, ExternalLink, Bell, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { IRAQ_GOVERNORATES } from '@/data/iraqCities';
import PinStrengthMeter from '@/components/merchant/PinStrengthMeter';
import { validatePinFormat } from '@/lib/merchantAuthShared';

const ORDERS_BOT_USERNAME = 'wasliasharatbot';

export default function RegisterStorePage() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('البصرة');
  const [isLoading, setIsLoading] = useState(false);
  const [createdStore, setCreatedStore] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [telegramOpened, setTelegramOpened] = useState(false);
  const [loginPin, setLoginPin] = useState('');
  const [confirmLoginPin, setConfirmLoginPin] = useState('');
  const [phoneExists, setPhoneExists] = useState(false);

  // حالات طريقة استلام الأرباح
  const [payoutMethod, setPayoutMethod] = useState<'mastercard' | 'zain_cash' | 'mobile_credit'>('mastercard');
  const [mastercardNumber, setMastercardNumber] = useState('');
  const [mastercardHolderName, setMastercardHolderName] = useState('');
  const [zainCashPhone, setZainCashPhone] = useState('');
  const [zainCashHolderName, setZainCashHolderName] = useState('');
  const [creditProvider, setCreditProvider] = useState<'asia' | 'atheer'>('asia');
  const [creditPhone, setCreditPhone] = useState('');

  // توليد النص الكامل الشامل لمعلومات المتجر للحفظ والمشاركة
  const getFullStoreInfoText = () => {
    if (!createdStore) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wasli-smart.vercel.app';
    const storeUrl = `${origin}/s/${createdStore.code}?name=${encodeURIComponent(createdStore.name)}`;
    const dashboardUrl = `${origin}/merchant?storeCode=${createdStore.code}&name=${encodeURIComponent(createdStore.name)}&owner=${encodeURIComponent(createdStore.ownerName || "")}&city=${encodeURIComponent(createdStore.city || "")}&phone=${encodeURIComponent(createdStore.phone || "")}`;

    let payoutSummary = '';
    const curMethod = createdStore.payoutMethod || createdStore.payoutDetails?.method || payoutMethod;
    const curDetails = createdStore.payoutDetails || {};
    if (curMethod === 'mastercard') {
      payoutSummary = `ماستر كارت (رقم: ${curDetails.mastercardNumber || mastercardNumber || 'غير محدد'} - باسم: ${curDetails.mastercardHolderName || mastercardHolderName || 'غير محدد'})`;
    } else if (curMethod === 'zain_cash') {
      payoutSummary = `زين كاش (رقم المحفظة: ${curDetails.zainCashPhone || zainCashPhone || 'غير محدد'} - باسم: ${curDetails.zainCashHolderName || zainCashHolderName || 'غير محدد'})`;
    } else if (curMethod === 'mobile_credit') {
      const provName = (curDetails.creditProvider || creditProvider) === 'asia' ? 'آسيا سيل' : 'أثير زين';
      payoutSummary = `رصيد اتصال (${provName} - رقم التحويل: ${curDetails.creditPhone || creditPhone || 'غير محدد'})`;
    }

    return `معلومات متجر التاجر في منصة وصلي:
- اسم التاجر: ${createdStore.ownerName || 'غير محدد'}
- اسم المتجر: ${createdStore.name}
- المحافظة: ${createdStore.city}
- رقم الهاتف: ${createdStore.phone}
- رمز المتجر الفريد: ${createdStore.code}
- طريقة استلام الأرباح: ${payoutSummary || 'غير محددة'}

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

    if (!ownerName.trim()) {
      setErrorMsg('يرجى كتابة اسمك الثلاثي');
      return;
    }

    if (!storeName.trim()) {
      setErrorMsg('يرجى كتابة اسم متجرك');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('يرجى إدخال رقم هاتفك للتواصل');
      return;
    }

    const pinError = validatePinFormat(loginPin);
    if (pinError) {
      setErrorMsg(pinError);
      return;
    }
    if (loginPin !== confirmLoginPin) {
      setErrorMsg('تأكيد رمز الدخول غير متطابق');
      return;
    }

    // التحقق من طريقة استلام الأرباح
    if (payoutMethod === 'mastercard') {
      if (!mastercardNumber.trim()) {
        setErrorMsg('يرجى إدخال رقم حساب أو بطاقة الماستر كارت');
        return;
      }
      if (!mastercardHolderName.trim()) {
        setErrorMsg('يرجى كتابة اسم صاحب حساب الماستر كارت (باسم من؟)');
        return;
      }
    } else if (payoutMethod === 'zain_cash') {
      if (!zainCashPhone.trim()) {
        setErrorMsg('يرجى إدخال رقم هاتف محفظة زين كاش');
        return;
      }
      if (!zainCashHolderName.trim()) {
        setErrorMsg('يرجى كتابة اسم صاحب محفظة زين كاش (باسم من؟)');
        return;
      }
    } else if (payoutMethod === 'mobile_credit') {
      if (!creditPhone.trim()) {
        setErrorMsg('يرجى إدخال رقم الهاتف الذي ترغب بتحويل الرصيد إليه');
        return;
      }
    }

    setIsLoading(true);

    try {
      const payoutDetailsObj = {
        method: payoutMethod,
        mastercardNumber: payoutMethod === 'mastercard' ? mastercardNumber.trim() : undefined,
        mastercardHolderName: payoutMethod === 'mastercard' ? mastercardHolderName.trim() : undefined,
        zainCashPhone: payoutMethod === 'zain_cash' ? zainCashPhone.trim() : undefined,
        zainCashHolderName: payoutMethod === 'zain_cash' ? zainCashHolderName.trim() : undefined,
        creditProvider: payoutMethod === 'mobile_credit' ? creditProvider : undefined,
        creditPhone: payoutMethod === 'mobile_credit' ? creditPhone.trim() : undefined,
      };

      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          name: storeName.trim(),
          phone: phone.trim(),
          city,
          payoutMethod,
          payoutDetails: payoutDetailsObj,
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
        setPhoneExists(Boolean(data.phoneExists || data.code === 'PHONE_EXISTS'));
        setErrorMsg(data.message || 'حدث خطأ أثناء إنشاء المتجر');
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
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-brand-700 to-skybrand-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-brand-500/20 mb-4">
                <Store className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                انضم كتاجر وأنشئ متجرك مجاناً
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                كن تاجراً معتمداً، اختر منتجات المنصة، حدد سعر البيع الذي تريده، وابدأ بجني أرباحك فورياً بدون الحاجة لرأس مال أو شراء بضاعة مسبقاً!
              </p>
            </div>

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

            {errorMsg && (
              <div
                className={`mb-6 p-4 rounded-xl border text-sm font-medium text-right space-y-3 ${
                  phoneExists
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-red-50 border-red-200 text-red-700 text-center'
                }`}
              >
                <p className="leading-relaxed">{errorMsg}</p>
                {phoneExists && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href="/merchant"
                      className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-black text-center flex items-center justify-center"
                    >
                      دخول حسابي الحالي
                    </Link>
                    <Link
                      href={`/merchant?recover=1&phone=${encodeURIComponent(phone.trim())}`}
                      className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/60 text-amber-950 text-xs font-bold text-center flex items-center justify-center"
                    >
                      نسيت رمز الدخول؟
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* النموذج */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* الاسم الثلاثي */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-brand-700" />
                  <span>اسمك الثلاثي</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد عبد الله حسين"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all"
                />
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
                  required
                  placeholder="مثال: متجر النخيل، متجر الوسام"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all"
                />
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
                  required
                  dir="ltr"
                  placeholder="07700000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm text-right outline-none transition-all"
                />
              </div>

              {/* رمز الدخول لحماية حساب التاجر */}
              <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-brand-700" />
                    <span>رمز الدخول لحسابك</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                    هذا الرمز يحمي صفحة التاجر. احفظه جيداً وستحتاجه عند كل دخول.
                  </p>
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="4 خانات على الأقل"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all bg-white"
                  />
                  <PinStrengthMeter pin={loginPin} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-brand-700" />
                    <span>تأكيد رمز الدخول</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="أعد كتابة رمز الدخول"
                    value={confirmLoginPin}
                    onChange={(e) => setConfirmLoginPin(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all bg-white"
                  />
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
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all bg-white"
                >
                  {IRAQ_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  اختر محافظتك من بين المحافظات العراقية الـ 18
                </p>
              </div>

              {/* قسم طريقة استلام الأرباح */}
              <div className="pt-4 border-t border-slate-200">
                <div className="mb-3">
                  <label className="block text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-brand-700" />
                    <span>طريقة استلام أرباحك</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    حدد الوسيلة التي ترغب بأن نحول لك أرباحك عليها فور تسليم طلبات متجرك
                  </p>
                </div>

                {/* خيارات الطرق الثلاث */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
                  {/* خيار 1: ماستر كارت */}
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('mastercard')}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                      payoutMethod === 'mastercard'
                        ? 'border-brand-700 bg-brand-50/70 text-brand-900 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${payoutMethod === 'mastercard' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payoutMethod === 'mastercard' ? 'border-brand-700 bg-brand-700' : 'border-slate-300'}`}>
                        {payoutMethod === 'mastercard' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-xs">ماستر كارت</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">تحويل بنكي مباشر</div>
                    </div>
                  </button>

                  {/* خيار 2: زين كاش */}
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('zain_cash')}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                      payoutMethod === 'zain_cash'
                        ? 'border-brand-700 bg-brand-50/70 text-brand-900 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${payoutMethod === 'zain_cash' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payoutMethod === 'zain_cash' ? 'border-brand-700 bg-brand-700' : 'border-slate-300'}`}>
                        {payoutMethod === 'zain_cash' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-xs">زين كاش</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">محفظة إلكترونية فورية</div>
                    </div>
                  </button>

                  {/* خيار 3: ليس لدي بطاقة - رصيد اتصال */}
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('mobile_credit')}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                      payoutMethod === 'mobile_credit'
                        ? 'border-amber-600 bg-amber-50/80 text-amber-950 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${payoutMethod === 'mobile_credit' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payoutMethod === 'mobile_credit' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'}`}>
                        {payoutMethod === 'mobile_credit' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-xs">ليس لدي بطاقة</div>
                      <div className="text-[10px] text-amber-800 font-medium mt-0.5">رصيد آسيا أو أثير</div>
                    </div>
                  </button>
                </div>

                {/* الحقول التابعة للماستر كارت */}
                {payoutMethod === 'mastercard' && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-brand-900 mb-1">
                      بيانات حساب الماستر كارت لتحويل أرباحك:
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        رقم حساب / بطاقة الماستر كارت *
                      </label>
                      <input
                        type="text"
                        required
                        dir="ltr"
                        placeholder="مثال: 5310 0000 0000 0000 أو رقم الحساب"
                        value={mastercardNumber}
                        onChange={(e) => setMastercardNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 text-slate-900 text-xs text-right outline-none bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        اسم صاحب الحساب / البطاقة (باسم من؟) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="الاسم الكامل كما هو مسجل على البطاقة أو الحساب"
                        value={mastercardHolderName}
                        onChange={(e) => setMastercardHolderName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 text-slate-900 text-xs outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* الحقول التابعة للزين كاش */}
                {payoutMethod === 'zain_cash' && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-brand-900 mb-1">
                      بيانات محفظة زين كاش لتحويل أرباحك:
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        رقم هاتف محفظة زين كاش *
                      </label>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        placeholder="07800000000"
                        value={zainCashPhone}
                        onChange={(e) => setZainCashPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 text-slate-900 text-xs text-right outline-none bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        اسم صاحب المحفظة (باسم من؟) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="الاسم الثلاثي لصاحب محفظة زين كاش"
                        value={zainCashHolderName}
                        onChange={(e) => setZainCashHolderName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 text-slate-900 text-xs outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* الحقول التابعة للرصيد (ليس لدي بطاقة) */}
                {payoutMethod === 'mobile_credit' && (
                  <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-amber-950 flex items-center justify-between">
                      <span>تحويل الأرباح كرصيد هاتف:</span>
                      <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                        رصيد مباشر
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                      إذا لم تكن تملك ماستر كارت أو محفظة زين كاش، سنقوم بتحويل أرباحك مباشرة كرصيد اتصال (كارت شحن أو تحويل رصيد) للرقم الذي تحدده.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        نوع شبكة الرصيد المطلوب *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCreditProvider('asia')}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            creditProvider === 'asia'
                              ? 'bg-red-600 border-red-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          رصيد آسيا سيل (Asiacell)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreditProvider('atheer')}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            creditProvider === 'atheer'
                              ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          رصيد أثير (Zain / أثير)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        رقم الهاتف الذي نحول له الرصيد *
                      </label>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        placeholder="07700000000 أو 07800000000"
                        value={creditPhone}
                        onChange={(e) => setCreditPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 text-slate-900 text-xs text-right outline-none bg-white font-mono"
                      />
                    </div>
                  </div>
                )}
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
            </form>
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
              <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">طريقة استلام الأرباح:</span>
                <span className="font-semibold text-slate-800 text-xs text-left max-w-[240px]">
                  {createdStore.payoutMethod === 'mastercard' && (
                    <span>ماستر كارت ({createdStore.payoutDetails?.mastercardNumber} - باسم: {createdStore.payoutDetails?.mastercardHolderName})</span>
                  )}
                  {createdStore.payoutMethod === 'zain_cash' && (
                    <span>زين كاش ({createdStore.payoutDetails?.zainCashPhone} - باسم: {createdStore.payoutDetails?.zainCashHolderName})</span>
                  )}
                  {createdStore.payoutMethod === 'mobile_credit' && (
                    <span>رصيد {createdStore.payoutDetails?.creditProvider === 'asia' ? 'آسيا سيل' : 'أثير زين'} للرقم ({createdStore.payoutDetails?.creditPhone})</span>
                  )}
                  {!createdStore.payoutMethod && (
                    <span>ماستر كارت / زين كاش</span>
                  )}
                </span>
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
