'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Store, 
  Share2, 
  Copy, 
  Check, 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  ArrowUpRight, 
  ExternalLink,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Link as LinkIcon,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { Store as StoreType, Order } from '@/types';

function MerchantDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlStoreCode = searchParams.get('storeCode');

  const [currentStore, setCurrentStore] = useState<StoreType | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // حالة تسجيل الدخول برابط المتجر إذا لم يتم تحديد متجر
  const [storeInput, setStoreInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    async function initMerchant() {
      try {
        setLoading(true);
        let code = urlStoreCode;
        if (!code && typeof window !== 'undefined') {
          const saved = localStorage.getItem('wasli_current_store');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              code = parsed.code;
            } catch (e) {}
          }
        }

        const storeRes = await fetch('/api/stores');
        const storeData = await storeRes.json();
        
        let found = null;
        if (code && storeData.stores) {
          found = storeData.stores.find(
            (s: any) => s.code?.toLowerCase() === code?.toLowerCase() || s.slug?.toLowerCase() === code?.toLowerCase()
          );
        }

        if (found) {
          setCurrentStore(found);
          if (typeof window !== 'undefined') {
            localStorage.setItem('wasli_current_store', JSON.stringify(found));
          }
          // جلب طلبات هذا المتجر
          const ordersRes = await fetch(`/api/orders?storeId=${found.id}`);
          const ordersData = await ordersRes.json();
          if (ordersData.success && ordersData.orders) {
            setOrders(ordersData.orders);
          }
        } else {
          setCurrentStore(null);
        }
      } catch (err) {
        console.error('خطأ في تحميل بيانات لوحة التاجر:', err);
      } finally {
        setLoading(false);
      }
    }

    initMerchant();
  }, [urlStoreCode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const rawInput = storeInput.trim();
    if (!rawInput) {
      setLoginError('يرجى إدخال رابط متجرك أو رمزه للدخول');
      return;
    }

    let extractedCode = rawInput;
    if (extractedCode.includes('/s/')) {
      const parts = extractedCode.split('/s/');
      extractedCode = parts[1].split('/')[0].split('?')[0].trim();
    } else if (extractedCode.startsWith('http://') || extractedCode.startsWith('https://')) {
      const parts = extractedCode.split('/');
      extractedCode = parts[parts.length - 1].split('?')[0].trim();
    }

    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/stores');
      const data = await res.json();

      if (data && data.stores) {
        const queryLower = extractedCode.toLowerCase();
        const rawLower = rawInput.toLowerCase();

        const found = data.stores.find((s: any) => {
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

        if (found) {
          setCurrentStore(found);
          if (typeof window !== 'undefined') {
            localStorage.setItem('wasli_current_store', JSON.stringify(found));
          }
          // جلب الطلبات
          const ordersRes = await fetch(`/api/orders?storeId=${found.id}`);
          const ordersData = await ordersRes.json();
          if (ordersData.success && ordersData.orders) {
            setOrders(ordersData.orders);
          }
          return;
        }
      }

      setLoginError('لم يتم العثور على متجر مطابق لهذا الرابط. يرجى التأكد من الرابط أو إنشاء متجر جديد مجاناً.');
    } catch (err) {
      setLoginError('حدث خطأ أثناء محاولة الدخول، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wasli_current_store');
    }
    setCurrentStore(null);
    setOrders([]);
    setStoreInput('');
    router.push('/merchant');
  };

  const storeUrl = typeof window !== 'undefined' && currentStore 
    ? `${window.location.origin}/s/${currentStore.code}`
    : `/s/${currentStore?.code || 'store'}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!currentStore) return;
    const text = `تفضل بزيارة متجري الإلكتروني "${currentStore.name}" على منصة وصلي للتسوق بأسعار مميزة وتوصيل سريع!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentStore.name,
          text: text,
          url: storeUrl,
        });
        return;
      } catch (e) {}
    }
    handleCopyLink();
  };

  const totalExpectedProfits = orders.reduce((sum, o) => sum + (o.merchantProfit || 0), 0);
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const earnedProfits = deliveredOrders.reduce((sum, o) => sum + (o.merchantProfit || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">جاري تجهيز لوحة التحكم الخاصة بك...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن هناك متجر مسجل، نظهر شاشة طلب رابط المتجر
  if (!currentStore) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-brand-700 to-skybrand-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-brand-700/20 mb-4">
              <Store className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              دخول حساب التاجر
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              يرجى إدخال رابط متجرك الإلكتروني أو رمزه لفتح لوحة التحكم الخاصة بك ومتابعة أرباحك
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                    if (loginError) setLoginError('');
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

            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-black text-sm shadow-md shadow-brand-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoggingIn ? (
                <span>جاري التحقق والدخول...</span>
              ) : (
                <>
                  <span>دخول لحسابي</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-slate-100 text-center space-y-3">
              <p className="text-xs text-slate-500">ليس لديك متجر بعد؟</p>
              <Link
                href="/register-store"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>أنشئ متجرك مجاناً في دقيقة واحدة</span>
              </Link>
              <div>
                <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">
                  العودة للصفحة الرئيسية
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* الترويسة ومعلومات المتجر */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-right">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-skybrand-600 flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  لوحة تحكم: {currentStore?.name || 'متجري الإلكتروني'}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  نشط ومفعّل
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                كود المتجر الفريد: <strong className="text-brand-700 font-bold">{currentStore?.code}</strong> | {currentStore?.city || 'البصرة'}
              </p>
            </div>
          </div>

          {/* أزرار المشاركة والمعاينة والخروج */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleNativeShare}
              className="py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-accent-400" />
              <span>مشاركة المتجر</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>
            <Link
              href={`/s/${currentStore?.code}`}
              target="_blank"
              className="py-2.5 px-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
              <span>فتح المتجر</span>
            </Link>
            <button
              onClick={handleLogout}
              className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="تسجيل الخروج أو الدخول بمتجر آخر"
            >
              <LogOut className="w-4 h-4" />
              <span>تبديل الحساب</span>
            </button>
          </div>
        </div>

        {/* شريط الرابط المشفر المميز */}
        <div className="bg-gradient-to-r from-skybrand-900 to-brand-900 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5 text-skybrand-300" />
            </div>
            <div>
              <div className="text-xs text-skybrand-200 font-medium">رابط متجرك الحصري للمشاركة على واتساب ومنصات التواصل:</div>
              <div className="font-mono text-sm font-bold text-white break-all select-all mt-0.5" dir="ltr">
                {storeUrl}
              </div>
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto py-2 px-4 bg-white text-slate-900 hover:bg-skybrand-50 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer"
          >
            {copiedLink ? 'تم نسخ الرابط!' : 'نسخ الرابط للنشر'}
          </button>
        </div>

        {/* بطاقات الإحصائيات والأرباح */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">الأرباح المتوقعة</div>
            <div className="text-xl sm:text-2xl font-black text-brand-800">
              {totalExpectedProfits.toLocaleString('ar-IQ')} <span className="text-xs font-normal text-slate-500">د.ع</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">من جميع الطلبات الجارية</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">الأرباح المستحقة</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600">
              {earnedProfits.toLocaleString('ar-IQ')} <span className="text-xs font-normal text-slate-500">د.ع</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-2">جاهزة للسحب بعد تسليم الطلب</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">إجمالي الطلبات</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {orders.length} <span className="text-xs font-normal text-slate-500">طلب</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">عبر رابط متجرك الخاص</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="text-xs font-bold text-slate-500 mb-1">كتالوج المنتجات</div>
            <Link 
              href={`/merchant/catalog?storeCode=${currentStore?.code}`}
              className="inline-flex items-center gap-1.5 text-brand-700 hover:text-brand-800 font-bold text-sm mt-1"
            >
              <span>إضافة منتجات لمتجري</span>
              <Plus className="w-4 h-4" />
            </Link>
            <div className="text-[11px] text-slate-400 mt-2">اختر منتجات المنصة وحدد سعرك</div>
          </div>
        </div>

        {/* الطلبات الواردة لمتجري */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">الطلبات الواردة من متجرك</h2>
              <p className="text-xs text-slate-500 mt-0.5">تتبع طلبات زبائنك وحالات التوصيل وأرباح كل طلب</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {orders.length} طلب
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد طلبات واردة حتى الآن</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6">
                شارك رابط متجرك ومنتجاتك على مجموعات وحالات واتساب لجلب أولى طلباتك والبدء بجني الأرباح!
              </p>
              <button
                onClick={handleNativeShare}
                className="py-2.5 px-5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                مشاركة رابط المتجر الآن
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase">
                    <th className="py-3 px-3">رقم الطلب</th>
                    <th className="py-3 px-3">الزبون</th>
                    <th className="py-3 px-3">المحافظة والمنطقة</th>
                    <th className="py-3 px-3">الإجمالي</th>
                    <th className="py-3 px-3">ربحك</th>
                    <th className="py-3 px-3">حالة الطلب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-brand-700">
                        {order.orderNumber}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{order.customerName}</div>
                        <div className="text-xs text-slate-400" dir="ltr">{order.customerPhone}</div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">
                        {order.governorate} - {order.city}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {order.totalAmount.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3 font-bold text-emerald-600">
                        +{order.merchantProfit.toLocaleString('ar-IQ')} د.ع
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status === 'new' && 'طلب جديد'}
                          {order.status === 'reviewed' && 'تمت المراجعة'}
                          {order.status === 'processing' && 'قيد التجهيز'}
                          {order.status === 'shipped' && 'خرج للتوصيل'}
                          {order.status === 'delivered' && 'تم التسليم'}
                          {order.status === 'cancelled' && 'ملغي'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MerchantDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center font-bold text-slate-500">جاري تحميل لوحة التاجر...</div>
      </div>
    }>
      <MerchantDashboardContent />
    </Suspense>
  );
}
