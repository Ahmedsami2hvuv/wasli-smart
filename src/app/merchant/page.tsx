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
  ArrowLeft,
  Sliders,
  X,
  Upload,
  MapPin,
  Phone,
  User,
  Truck,
  Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { Store as StoreType, Order } from '@/types';

const IRAQI_GOVERNORATES = [
  'بغداد',
  'البصرة',
  'أربيل',
  'النجف الأشرف',
  'كربلاء المقدسة',
  'نينوى (الموصل)',
  'كركوك',
  'ذي قار (الناصرية)',
  'بابل (الحلة)',
  'ميسان (العمارة)',
  'الأنبار',
  'ديالى',
  'المثنى (السماوة)',
  'القادسية (الديوانية)',
  'واسط (الكوت)',
  'السليمانية',
  'دهوك',
  'صلاح الدين (تكريت)'
];

function MerchantDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlStoreCode = searchParams.get('storeCode');

  const [currentStore, setCurrentStore] = useState<StoreType | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // حالة تسجيل الدخول برابط المتجر إذا لم يتم تحديد متجر
  const [storeInput, setStoreInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // حالات نافذة تعديل المتجر
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    city: 'البصرة',
    district: '',
    description: '',
    logoUrl: '',
    bannerUrl: '',
    deliveryTimeMinutes: '30-45 دقيقة',
    deliveryFeeIqd: 4000,
    isOpen: true,
  });

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

        // فحص التخزين المحلي في المتصفح إذا لم يعثر عليه
        if (!found && code && typeof window !== 'undefined') {
          try {
            const regSaved = localStorage.getItem('wasli_stores_registry');
            if (regSaved) {
              const reg = JSON.parse(regSaved);
              if (Array.isArray(reg)) {
                found = reg.find((s: any) => s.code?.toLowerCase() === code.toLowerCase());
              }
            }
          } catch (e) {}
        }

        // إذا كان الكود كود متجر وصلي صالح w-[code] نعتمد المتجر فوراً
        if (!found && code && (code.toLowerCase().startsWith('w-') || code.length === 9)) {
          found = {
            id: `store-${code}`,
            name: 'متجري الإلكتروني',
            ownerName: 'صاحب المتجر',
            slug: `store-${code}`,
            code: code,
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

          // جلب عدد المنتجات المنشورة من المنصة تلقائياً
          try {
            const prodRes = await fetch('/api/products');
            const prodData = await prodRes.json();
            if (prodData.success && Array.isArray(prodData.products)) {
              setTotalProductsCount(prodData.products.length);
            }
          } catch (e) {}
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

    setIsLoggingIn(true);

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

      // إذا لم يعثر عليه من السيرفر، الفحص في التخزين المحلي للمتصفح
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

      // إذا كان الكود كود متجر وصلي صالح w-[code] نثبته ونفتح لوحة التحكم فوراً
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
        setCurrentStore(found);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wasli_current_store', JSON.stringify(found));
        }
        // تحديث الرابط في المتصفح ليبقى دائماً متصلاً بكود المتجر
        router.push(`/merchant?storeCode=${found.code}`);

        // جلب الطلبات
        try {
          const ordersRes = await fetch(`/api/orders?storeId=${found.id}`);
          const ordersData = await ordersRes.json();
          if (ordersData.success && ordersData.orders) {
            setOrders(ordersData.orders);
          }
        } catch (e) {}

        // جلب عدد المنتجات المنشورة
        try {
          const prodRes = await fetch('/api/products');
          const prodData = await prodRes.json();
          if (prodData.success && Array.isArray(prodData.products)) {
            setTotalProductsCount(prodData.products.length);
          }
        } catch (e) {}
        return;
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
    ? `${window.location.origin}/s/${currentStore.code}?name=${encodeURIComponent(currentStore.name)}`
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

  const openEditModal = () => {
    if (!currentStore) return;
    setEditForm({
      name: currentStore.name || '',
      ownerName: currentStore.ownerName || '',
      phone: currentStore.phone || '',
      city: currentStore.city || 'البصرة',
      district: currentStore.district || currentStore.location || '',
      description: currentStore.description || '',
      logoUrl: currentStore.logoUrl || currentStore.image || '',
      bannerUrl: currentStore.bannerUrl || '',
      deliveryTimeMinutes: currentStore.deliveryTimeMinutes || '30-45 دقيقة',
      deliveryFeeIqd: currentStore.deliveryFeeIqd ?? 4000,
      isOpen: currentStore.isOpen !== false,
    });
    setEditSuccessMsg('');
    setEditErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('files', file);

    if (type === 'logo') setIsUploadingLogo(true);
    if (type === 'banner') setIsUploadingBanner(true);

    try {
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.images?.[0]?.displayUrl) {
        const url = data.images[0].displayUrl;
        setEditForm(prev => ({
          ...prev,
          [type === 'logo' ? 'logoUrl' : 'bannerUrl']: url,
        }));
      } else {
        alert('تعذر رفع الصورة، يمكنك وضع رابط الصورة مباشرة');
      }
    } catch (err) {
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      if (type === 'banner') setIsUploadingBanner(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore) return;

    if (!editForm.name.trim()) {
      setEditErrorMsg('يرجى إدخال اسم المتجر');
      return;
    }
    if (!editForm.phone.trim()) {
      setEditErrorMsg('يرجى إدخال رقم هاتف المتجر');
      return;
    }

    setIsSavingStore(true);
    setEditErrorMsg('');
    setEditSuccessMsg('');

    try {
      const res = await fetch('/api/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentStore.id,
          code: currentStore.code,
          ...editForm,
        }),
      });

      const data = await res.json();
      if (data.success && data.store) {
        setCurrentStore(data.store);
        if (typeof window !== 'undefined') {
          localStorage.setItem('wasli_current_store', JSON.stringify(data.store));
        }
        setEditSuccessMsg('تم حفظ وتحديث بيانات المتجر بنجاح!');
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditSuccessMsg('');
        }, 1200);
      } else {
        setEditErrorMsg(data.message || 'حدث خطأ أثناء حفظ التعديلات');
      }
    } catch (err) {
      setEditErrorMsg('تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSavingStore(false);
    }
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
        
        {/* الترويسة ومعلومات المتجر مع أزرار التحكم العلوية */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-right w-full lg:w-auto justify-center sm:justify-start">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-skybrand-600 flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0 overflow-hidden">
              {currentStore?.logoUrl && !currentStore.logoUrl.includes('store-default') ? (
                <img 
                  src={currentStore.logoUrl} 
                  alt={currentStore.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <Store className="w-8 h-8" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  لوحة تحكم: {currentStore?.name || 'متجري الإلكتروني'}
                </h1>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  currentStore?.isOpen !== false 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentStore?.isOpen !== false ? 'نشط ومفعّل' : 'مغلق مؤقتاً'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                كود المتجر: <strong className="text-brand-700 font-bold">{currentStore?.code}</strong> | {currentStore?.city || 'البصرة'} {currentStore?.district ? `(${currentStore.district})` : ''}
              </p>
            </div>
          </div>

          {/* الأزرار العلوية المحددة: نسخ الرابط، مشاركة الرابط، فتح المتجر، تعديل المتجر */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 w-full lg:w-auto">
            {/* 1. زر نسخ الرابط */}
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="نسخ رابط المتجر"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>

            {/* 2. زر مشاركة الرابط */}
            <button
              onClick={handleNativeShare}
              className="py-2.5 px-4 bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="مشاركة رابط المتجر"
            >
              <Share2 className="w-4 h-4 text-skybrand-200" />
              <span>مشاركة الرابط</span>
            </button>

            {/* 3. زر فتح المتجر */}
            <Link
              href={storeUrl}
              target="_blank"
              className="py-2.5 px-3.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
              title="فتح ومعاينة المتجر"
            >
              <ExternalLink className="w-4 h-4 text-slate-600" />
              <span>فتح المتجر</span>
            </Link>

            {/* 4. زر تعديل المتجر */}
            <button
              onClick={openEditModal}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="تعديل بيانات المتجر"
            >
              <Sliders className="w-4 h-4 text-slate-950" />
              <span>تعديل المتجر</span>
            </button>

            {/* زر تبديل الحساب */}
            <button
              onClick={handleLogout}
              className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="تبديل المتجر أو الخروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">تبديل الحساب</span>
            </button>
          </div>
        </div>

        {/* بلوك الرابط بتصميم واضح وعالي التباين وألوان صحيحة 100% */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="w-11 h-11 rounded-xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center shrink-0">
              <LinkIcon className="w-5 h-5 text-skybrand-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-100">
                  رابط متجرك الحصري للمشاركة على واتساب ومنصات التواصل:
                </span>
                <span className="hidden sm:inline-block bg-skybrand-500/20 text-skybrand-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-skybrand-500/30">
                  رابط مباشر
                </span>
              </div>
              <div className="font-mono text-xs sm:text-sm font-bold text-skybrand-300 break-all select-all bg-black/40 px-3.5 py-2 rounded-xl border border-white/10" dir="ltr">
                {storeUrl}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
            <button
              onClick={handleCopyLink}
              className={`w-full md:w-auto py-2.5 px-5 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                copiedLink
                  ? 'bg-emerald-500 text-white'
                  : 'bg-accent-500 hover:bg-accent-400 active:bg-accent-600 text-slate-950'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ الرابط للنشر</span>
                </>
              )}
            </button>
          </div>
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
            <div className="text-xs font-bold text-slate-500 mb-1">المنتجات المعروضة</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {totalProductsCount} <span className="text-xs font-normal text-slate-500">منتج جاهز</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>تظهر تلقائياً في متجرك للزبائن</span>
            </div>
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

      {/* نافذة مودال لتعديل بيانات المتجر ("يكدر يعدل اي شي من المتجر") */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col my-auto">
            {/* رأس النافذة */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">تعديل بيانات المتجر</h3>
                  <p className="text-xs text-slate-500">عدل اسم متجرك، مدينتك، شعارك ومعلومات التوصيل بسهولة</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى النموذج */}
            <form onSubmit={handleSaveStore} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {editSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              {editErrorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              {/* الصف الأول: اسم المتجر واسم صاحب المتجر */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم المتجر <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="مثال: متجر أبو الأكبر"
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium"
                    />
                    <Store className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    اسم صاحب المتجر / المسوّق
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editForm.ownerName}
                      onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                      placeholder="اسمك الثلاثي أو اللقب"
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              {/* الصف الثاني: رقم الهاتف والمحافظة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رقم هاتف / واتساب المتجر <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="مثال: 07701234567"
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-mono text-left dir-ltr"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    المحافظة
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium bg-white"
                    >
                      {IRAQI_GOVERNORATES.map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                    <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              {/* الصف الثالث: المنطقة أو الحي */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  المنطقة أو الحي (اختياري)
                </label>
                <input
                  type="text"
                  value={editForm.district}
                  onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                  placeholder="مثال: العشار، الكرادة، حي الحسين، المنصور..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium"
                />
              </div>

              {/* الصف الرابع: وصف المتجر */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  وصف ونبذة عن المتجر
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="اكتب عبارة ترحيبية تظهر لزبائنك عند فتح المتجر..."
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-sm outline-none font-medium resize-none"
                />
              </div>

              {/* الصف الخامس: إعدادات التوصيل وحالة المتجر */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    وقت التوصيل التقديري
                  </label>
                  <input
                    type="text"
                    value={editForm.deliveryTimeMinutes}
                    onChange={(e) => setEditForm({ ...editForm, deliveryTimeMinutes: e.target.value })}
                    placeholder="مثال: 30-45 دقيقة"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 text-xs outline-none bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    أجور التوصيل (د.ع)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editForm.deliveryFeeIqd}
                    onChange={(e) => setEditForm({ ...editForm, deliveryFeeIqd: Number(e.target.value) })}
                    placeholder="4000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 text-xs outline-none bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    حالة استقبال الطلبات
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isOpen: !editForm.isOpen })}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                      editForm.isOpen 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    {editForm.isOpen ? 'المتجر مفتوح ويستقبل' : 'المتجر مغلق مؤقتاً'}
                  </button>
                </div>
              </div>

              {/* الصف السادس: شعار المتجر وغلافه */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* شعار المتجر */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    شعار المتجر (اللوغو)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {editForm.logoUrl ? (
                        <img src={editForm.logoUrl} alt="شعار المتجر" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors w-full justify-center border border-slate-200">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingLogo ? 'جاري الرفع...' : 'رفع صورة الشعار'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingLogo}
                          onChange={(e) => handleImageUpload(e, 'logo')}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* غلاف المتجر */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    صورة غلاف المتجر
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {editForm.bannerUrl ? (
                        <img src={editForm.bannerUrl} alt="غلاف المتجر" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors w-full justify-center border border-slate-200">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingBanner ? 'جاري الرفع...' : 'رفع صورة الغلاف'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploadingBanner}
                          onChange={(e) => handleImageUpload(e, 'banner')}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingStore}
                  className="py-2.5 px-6 rounded-xl bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-black text-xs shadow-md shadow-brand-700/20 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSavingStore ? (
                    <span>جاري حفظ التعديلات...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
