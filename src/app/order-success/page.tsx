'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Copy, Check, ShoppingBag, Truck, PhoneCall, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('orderNumber') || 'ORD-SUCCESS';
  const storeCode = searchParams.get('store');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'تم استلام طلبك بنجاح';
    }
  }, []);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-16">
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200/80 max-w-lg w-full text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          تم استلام طلبك بنجاح!
        </h1>

        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          شكراً لتسوقك معنا. تم إرسال تفاصيل طلبك إلى قسم التجهيز وسيقوم المندوب بالتواصل معك هاتفياً قبل التوصيل للتأكيد.
        </p>

        {/* بطاقة رقم الطلب */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-8">
          <div className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-wider">
            رقم الطلب الخاص بك
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-2xl font-black text-brand-800 tracking-wider">
              {orderNumber}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              title="نسخ رقم الطلب"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            يرجى الاحتفاظ بهذا الرقم لمتابعة حالة الشحنة مع المندوب
          </span>
        </div>

        {/* خطوات التوصيل */}
        <div className="grid grid-cols-2 gap-3 text-right text-xs text-slate-600 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-start gap-2">
            <Truck className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900">توصيل سريع</strong>
              <span>مباشرة إلى باب بيتك أو مكان عملك</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <PhoneCall className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-slate-900">اتصال المندوب</strong>
              <span>سيتصل بك المندوب لتأكيد العنوان</span>
            </div>
          </div>
        </div>

        {storeCode ? (
          <Link
            href={`/s/${storeCode}`}
            className="w-full py-4 px-6 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-700/20 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>العودة للمتجر ومتابعة التسوق</span>
          </Link>
        ) : (
          <div className="text-xs text-slate-400">
            يسعدنا تواصلكم دائماً، نتمنى لكم تجربة تسوق ممتعة.
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center font-bold text-slate-500">جاري تحميل تأكيد الطلب...</div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
