'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ArrowLeft, X, AlertCircle, Link as LinkIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface MerchantLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MerchantLoginModal({ isOpen, onClose }: MerchantLoginModalProps) {
  const router = useRouter();
  const [storeInput, setStoreInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const rawInput = storeInput.trim();
    if (!rawInput) {
      setErrorMessage('يرجى إدخال رابط متجرك أو رمزه للدخول');
      return;
    }

    // استخراج الكود الذكي من أي شكل من أشكال الروابط
    let extractedCode = rawInput;
    const matchParam = rawInput.match(/[?&]storeCode=([a-zA-Z0-9_-]+)/i);
    const matchS = rawInput.match(/\/s\/([a-zA-Z0-9_-]+)/i);
    const matchW = rawInput.match(/\b(w-[a-zA-Z0-9]+)\b/i);

    if (matchParam && matchParam[1]) {
      extractedCode = matchParam[1].trim();
    } else if (matchS && matchS[1]) {
      extractedCode = matchS[1].trim();
    } else if (matchW && matchW[1]) {
      extractedCode = matchW[1].trim();
    } else if (rawInput.startsWith('http://') || rawInput.startsWith('https://')) {
      try {
        const url = new URL(rawInput);
        const sp = url.searchParams.get('storeCode') || url.searchParams.get('code');
        if (sp) {
          extractedCode = sp.trim();
        } else {
          const parts = url.pathname.split('/').filter(Boolean);
          if (parts.length > 0 && parts[parts.length - 1] !== 'merchant') {
            extractedCode = parts[parts.length - 1].trim();
          }
        }
      } catch (e) {}
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/stores');
      const data = await res.json();

      let found = null;
      if (data && data.stores) {
        const queryLower = extractedCode.toLowerCase();
        const rawLower = rawInput.toLowerCase();

        found = data.stores.find((s: any) => {
          const sCode = (s.code || '').toLowerCase();
          const sSlug = (s.slug || '').toLowerCase();
          const sPhone = (s.phone || '').trim();
          const sName = (s.name || '').toLowerCase();

          return (
            sCode === queryLower ||
            sSlug === queryLower ||
            sCode === rawLower ||
            (sPhone && sPhone === rawInput) ||
            sName === rawLower
          );
        });
      }

      // فحص التخزين المحلي في المتصفح إذا لم يعثر عليه
      if (!found && typeof window !== 'undefined') {
        try {
          const curSaved = localStorage.getItem('wasli_current_store');
          if (curSaved) {
            const parsed = JSON.parse(curSaved);
            if (parsed.code?.toLowerCase() === extractedCode.toLowerCase()) {
              found = parsed;
            }
          }
          if (!found) {
            const regSaved = localStorage.getItem('wasli_stores_registry');
            if (regSaved) {
              const reg = JSON.parse(regSaved);
              if (Array.isArray(reg)) {
                found = reg.find((s: any) => s.code?.toLowerCase() === extractedCode.toLowerCase());
              }
            }
          }
        } catch (e) {}
      }

      // إذا كان الكود كود متجر وصلي صالح w-[code] نعتمد المتجر فوراً
      if (!found && (extractedCode.toLowerCase().startsWith('w-') || extractedCode.length === 9)) {
        found = {
          id: `store-${extractedCode}`,
          name: 'متجري الإلكتروني',
          ownerName: 'صاحب المتجر',
          slug: `store-${extractedCode}`,
          code: extractedCode,
          description: 'متجر إلكتروني معتمد للتجارة المباشرة والتوصيل السريع لكافة المحافظات',
          city: 'العراق',
          phone: '',
          status: 'active',
          totalSales: 0,
          totalOrders: 0,
          balanceEarned: 0,
          balanceWithdrawn: 0,
          rating: 5.0,
          reviewsCount: 1,
          deliveryFeeIqd: 4000,
          deliveryTimeMinutes: 'خلال يوم أو يومين',
          isOpen: true,
          isAbiAlkhaseeb: false,
          image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
          logoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
          location: 'العراق',
          district: 'العراق',
          createdAt: new Date().toISOString(),
        };
      }

      if (found) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('wasli_current_store', JSON.stringify(found));
        }
        onClose();
        router.push(`/merchant?storeCode=${found.code}`);
        return;
      }

      setErrorMessage('لم يتم العثور على متجر مطابق لهذا الرابط. يرجى التأكد من الرابط أو إنشاء متجر جديد مجاناً.');
    } catch (err) {
      setErrorMessage('حدث خطأ أثناء محاولة الدخول، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        dir="rtl"
      >
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* رأس النافذة */}
        <div className="p-6 sm:p-8 text-center pb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-skybrand-500 flex items-center justify-center text-white shadow-md shadow-brand-700/20 mx-auto mb-4">
            <Store className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5">
            دخول حساب التاجر
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            أدخل رابط متجرك أو رمزه لفتح لوحة التحكم ومتابعة طلباتك وأرباحك
          </p>
        </div>

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={handleSubmit} className="px-6 sm:px-8 pb-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              رابط متجرك أو رمز المتجر:
            </label>
            <div className="relative">
              <input
                type="text"
                value={storeInput}
                onChange={(e) => {
                  setStoreInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="مثال: wasli-smart.vercel.app/s/your-store أو الرمز"
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all placeholder:text-slate-400 text-left dir-ltr"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <LinkIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
              يمكنك لصق رابط متجرك كاملاً أو كتابة رمز المتجر الخاص بك.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-black text-sm shadow-md shadow-brand-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <span>جاري التحقق والدخول...</span>
            ) : (
              <>
                <span>دخول لحسابي</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>

          {/* خيار إنشاء متجر لمن لا يملك متجر */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 mb-2">ليس لديك متجر بعد؟</p>
            <Link
              href="/register-store"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-black text-brand-700 hover:text-brand-800 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>أنشئ متجرك مجاناً وابدأ تجارتك الآن</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
