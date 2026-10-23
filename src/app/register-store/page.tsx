'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, Share2, User, Phone, MapPin, Copy, Check, Lock } from 'lucide-react';
import Link from 'next/link';
import { IRAQ_GOVERNORATES } from '@/data/iraqCities';

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

  const handleCopyStoreInfo = async () => {
    if (!createdStore) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wasli-smart.vercel.app';
    const storeUrl = `${origin}/s/${createdStore.code}?name=${encodeURIComponent(createdStore.name)}`;
    const dashboardUrl = `${origin}/merchant?storeCode=${createdStore.code}`;

    const textToCopy = `معلومات متجري:
- اسم صاحب المتجر: ${createdStore.ownerName || 'غير محدد'}
- اسم المتجر: ${createdStore.name}
- المحافظة: ${createdStore.city}
- رقم الهاتف: ${createdStore.phone}
- رمز المتجر الفريد: ${createdStore.code}
- رابط المتجر المباشر: ${storeUrl}
- رابط لوحة إدارة متجري: ${dashboardUrl}`;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!ownerName.trim()) {
      setErrorMsg('يرجى كتابة الاسم الثلاثي لصاحب المتجر');
      return;
    }

    if (!storeName.trim()) {
      setErrorMsg('يرجى كتابة اسم المتجر');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('يرجى إدخال رقم الهاتف للتواصل');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          name: storeName.trim(),
          phone: phone.trim(),
          city,
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
        }
      } else {
        setErrorMsg(data.message || 'حدث خطأ أثناء إنشاء المتجر');
      }
    } catch (err: any) {
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
                أنشئ متجرك الإلكتروني مجاناً
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                اختر منتجات منصة وصلي، حدد سعر البيع الذي تريده، وابدأ بجني الأرباح فورياً بدون الحاجة لرأس مال أو شراء بضاعة مسبقاً!
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
                <span className="font-semibold text-slate-800">توصيل سريع</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2">
                <Share2 className="w-5 h-5 text-skybrand-600" />
                <span className="font-semibold text-slate-800">روابط مباشرة</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium text-center">
                {errorMsg}
              </div>
            )}

            {/* النموذج */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* الاسم الثلاثي */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-brand-700" />
                  <span>الاسم الثلاثي</span>
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
                  <span>رقم الهاتف (واتساب للتواصل)</span>
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-bold text-base shadow-lg shadow-brand-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>جاري إنشاء متجرك...</span>
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
              أصبح متجرك جاهزاً الآن للبدء باختيار المنتجات وتحديد أرباحك.
            </p>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-right space-y-3 mb-8">
              {createdStore.ownerName && (
                <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">اسم صاحب المتجر:</span>
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
              {/* الرابط الأول: رابط لوحة إدارة متجرك */}
              <div className="flex flex-col gap-1.5 text-sm pt-3 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-brand-700" />
                    <span>رابط لوحة إدارة متجرك (الخاص بك):</span>
                  </span>
                  <span className="text-[11px] text-brand-800 bg-brand-50 font-bold px-2 py-0.5 rounded-md">
                    لوحة التحكم
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-xs text-brand-800 bg-white p-2.5 rounded-xl border border-brand-200/90 break-all select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/merchant?storeCode=${createdStore.code}` : `/merchant?storeCode=${createdStore.code}`}
                  </span>
                </div>
              </div>

              {/* الرابط الثاني: رابط متجرك للزبائن */}
              <div className="flex flex-col gap-1.5 text-sm pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-skybrand-600" />
                    <span>رابط متجرك المباشر (للزبائن والمشترين):</span>
                  </span>
                  <span className="text-[11px] text-skybrand-800 bg-skybrand-50 font-bold px-2 py-0.5 rounded-md">
                    متجر الزبائن
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

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* زر الدخول إلى لوحة إدارة متجري */}
                <Link
                  href={`/merchant?storeCode=${createdStore.code}`}
                  className="w-full py-4 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-bold text-sm shadow-md shadow-brand-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <Store className="w-4 h-4 text-accent-400" />
                  <span>الدخول إلى لوحة إدارة متجري</span>
                </Link>

                {/* زر نسخ معلوماتي */}
                <button
                  type="button"
                  onClick={handleCopyStoreInfo}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    copiedInfo
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                  }`}
                >
                  {copiedInfo ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>تم نسخ معلوماتي بنجاح</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-300" />
                      <span>نسخ معلوماتي</span>
                    </>
                  )}
                </button>
              </div>

              {/* زر معاينة صفحة المتجر */}
              <Link
                href={`/s/${createdStore.code}?name=${encodeURIComponent(createdStore.name)}`}
                className="w-full py-3 px-6 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 text-center"
              >
                <span>معاينة صفحة المتجر</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
