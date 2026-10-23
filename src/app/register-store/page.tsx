'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function RegisterStorePage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('البصرة - أبي الخصيب');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdStore, setCreatedStore] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!storeName.trim() || !phone.trim()) {
      setErrorMsg('يرجى كتابة اسم المتجر ورقم الهاتف للتواصل');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName.trim(),
          phone: phone.trim(),
          city,
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (data.success && data.store) {
        setCreatedStore(data.store);
        // حفظ هوية المتجر في المتصفح للوصول السريع
        if (typeof window !== 'undefined') {
          localStorage.setItem('wasli_current_store', JSON.stringify(data.store));
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
                <span className="font-semibold text-slate-800">روابط مشفرة</span>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium text-center">
                {errorMsg}
              </div>
            )}

            {/* النموذج */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  اسم متجرك <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متجر النخيل، متجر أحمد ستور"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  رقم الهاتف (واتساب للتواصل) <span className="text-red-500">*</span>
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

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  المنطقة / المحافظة
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all bg-white"
                >
                  <option value="البصرة - أبي الخصيب">البصرة - قضاء أبي الخصيب</option>
                  <option value="البصرة - العشار">البصرة - العشار</option>
                  <option value="البصرة - الجبيلة">البصرة - الجبيلة</option>
                  <option value="البصرة - الجزائر">البصرة - الجزائر</option>
                  <option value="البصرة - الزبير">البصرة - الزبير</option>
                  <option value="بغداد">بغداد</option>
                  <option value="محافظة أخرى">محافظة أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  نبذة تعريفية عن متجرك (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: متجر متخصص بأفضل منتجات وإلكترونيات بجودة عالية وتوصيل مباشر"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all"
                />
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
              <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">اسم المتجر:</span>
                <span className="font-bold text-slate-900">{createdStore.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">رمز المتجر الفريد:</span>
                <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">{createdStore.code}</span>
              </div>
              <div className="flex flex-col gap-1 text-sm pt-1">
                <span className="text-slate-500">رابط متجرك المباشر:</span>
                <span className="font-mono text-xs text-skybrand-700 bg-white p-2 rounded-lg border border-slate-200 break-all select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/s/${createdStore.code}` : `/s/${createdStore.code}`}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/merchant?storeCode=${createdStore.code}`}
                className="flex-1 py-3.5 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-md shadow-brand-700/20 transition-all text-center"
              >
                الدخول إلى لوحة إدارة متجري
              </Link>
              <Link
                href={`/s/${createdStore.code}`}
                className="py-3.5 px-6 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all text-center"
              >
                معاينة صفحة المتجر
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
