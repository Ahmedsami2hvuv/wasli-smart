'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  ShoppingBag, 
  Clock, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  Flame, 
  Phone, 
  MapPin, 
  User, 
  AlertCircle,
  Plus,
  Minus,
  MessageCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';
import { IRAQ_GOVERNORATES } from '@/data/iraqCities';
import { Product, Store } from '@/types';

function OfferPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const storeCode = (params?.code as string) || '';
  const productId = (params?.id as string) || '';

  // معايير احتياطية من الرابط
  const queryStoreName = searchParams?.get('storeName') || searchParams?.get('name') || '';
  const queryPhone = searchParams?.get('phone') || searchParams?.get('p') || '';
  const queryCity = searchParams?.get('city') || searchParams?.get('c') || '';

  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  // حالة معرض الصور
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // حالة نموذج الطلب
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState<string>(IRAQ_GOVERNORATES[0] || 'بغداد');
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  // مرجع قسم الطلب للانتقال السلس إليه
  const orderSectionRef = useRef<HTMLDivElement>(null);

  // عداد تنازلي حقيقي لـ 10 ساعات
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 9,
    minutes: 58,
    seconds: 45,
  });

  useEffect(() => {
    // تحديد وقت انتهاء العرض لمدة 10 ساعات وحفظه محلياً ليبقى ثابتاً لنفس الزبون
    const storageKey = `wasli_offer_expiry_${productId}_${storeCode}`;
    let targetTime: number;

    if (typeof window !== 'undefined') {
      const savedExpiry = localStorage.getItem(storageKey);
      if (savedExpiry && Number(savedExpiry) > Date.now()) {
        targetTime = Number(savedExpiry);
      } else {
        // 10 ساعات من الآن
        targetTime = Date.now() + 10 * 60 * 60 * 1000;
        localStorage.setItem(storageKey, targetTime.toString());
      }
    } else {
      targetTime = Date.now() + 10 * 60 * 60 * 1000;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [productId, storeCode]);

  // جلب بيانات المتجر والمنتج
  useEffect(() => {
    async function loadData() {
      if (!productId) return;
      try {
        setLoading(true);

        // 1. جلب بيانات المتجر
        let foundStore: Store | null = null;
        try {
          const storeRes = await fetch('/api/stores');
          const storeData = await storeRes.json();
          if (storeData.stores && Array.isArray(storeData.stores)) {
            foundStore = storeData.stores.find(
              (s: any) => s.code?.toLowerCase() === storeCode.toLowerCase()
            ) || null;
          }
        } catch (e) {
          console.warn('تعذر جلب المتجر من الخادم:', e);
        }

        // فحص التخزين المحلي إن لم يعثر عليه
        if (!foundStore && typeof window !== 'undefined') {
          try {
            const savedCurrent = localStorage.getItem('wasli_current_store');
            if (savedCurrent) {
              const parsed = JSON.parse(savedCurrent);
              if (parsed.code?.toLowerCase() === storeCode.toLowerCase()) {
                foundStore = parsed;
              }
            }
          } catch (e) {}
        }

        if (foundStore && queryPhone && !foundStore.phone) {
          foundStore.phone = queryPhone;
        }

        setStore(foundStore);

        // 2. جلب المنتجات وسعر البيع الخاص بالمتجر
        let foundProduct: Product | null = null;

        // محاولة جلب منتجات المتجر المخصصة أولاً
        try {
          const spRes = await fetch(`/api/stores/products?storeCode=${storeCode}`);
          const spData = await spRes.json();
          if (spData.success && spData.products) {
            foundProduct = spData.products.find(
              (p: any) => p.id === productId || p.slug === productId
            );
          }
        } catch (e) {}

        // إذا لم يعثر عليه نجلب من الكتالوج العام
        if (!foundProduct) {
          const pRes = await fetch('/api/products');
          const pData = await pRes.json();
          if (pData.success && pData.products) {
            foundProduct = pData.products.find(
              (p: any) => p.id === productId || p.slug === productId
            );
          }
        }

        if (foundProduct) {
          setProduct(foundProduct);
        }
      } catch (err) {
        console.error('خطأ في تحميل تفاصيل العرض:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [productId, storeCode, queryStoreName, queryPhone, queryCity]);

  // قائمة صور المنتج
  const productImages = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    if (product.image) list.push(product.image);
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        const url = typeof img === 'string' ? img : ((img as any).localUrl || (img as any).url);
        if (url && !list.includes(url)) list.push(url);
      }
    }
    return list.length > 0 ? list : ['/placeholder-product.svg'];
  }, [product]);

  // حسابات السعر والتخفيض
  const currentPrice = useMemo(() => {
    if (!product) return 10000;
    return (product as any).sellingPrice || product.platformPriceIqd || product.priceIqd || 10000;
  }, [product]);

  // السعر السابق: زائد 20,000 د.ع فوق السعر المعروض بالمتجر
  const previousPrice = currentPrice + 20000;
  const discountAmount = 20000;
  const totalPrice = currentPrice * quantity;

  // التمرير السلس إلى قسم الطلب
  const scrollToOrderForm = () => {
    if (orderSectionRef.current) {
      orderSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // إرسال وتأكيد الطلب والتوجيه لواتساب التاجر
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim()) {
      setFormError('يرجى كتابة اسمك الثلاثي');
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 8) {
      setFormError('يرجى إدخال رقم هاتف صحيح للتواصل والتوصيل');
      return;
    }

    if (!customerDistrict.trim()) {
      setFormError('يرجى كتابة اسم القضاء أو المنطقة / الحي بالتفصيل');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. تسجيل الطلب في النظام داخلياً
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeCode: storeCode || store?.code,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerCity,
            customerDistrict: customerDistrict.trim(),
            items: [
              {
                productId: product?.id,
                productName: product?.name,
                quantity,
                price: currentPrice,
              }
            ],
            totalAmount: totalPrice,
            notes: 'طلب سريع من صفحة العرض الحصري',
          }),
        });
      } catch (errOrder) {
        console.warn('تنبيه حفظ الطلب في النظام:', errOrder);
      }

      // 2. تجهيز رسالة الواتساب للتاجر بدقة وتفصيل
      const storeName = store?.name || 'متجرك الإلكتروني';
      const cleanMerchantPhone = (store?.phone || queryPhone || '').replace(/[^0-9]/g, '');

      const whatsappMessage = 
`مرحباً، لقد قمت بالطلب من متجرك (${storeName})

تفاصيل الطلب:
- المنتج: ${product?.name}
- الكمية المطلوبة: ${quantity} قطعة
- السعر السابق: ${previousPrice.toLocaleString('ar-IQ')} د.ع
- سعر العرض المخفض: ${currentPrice.toLocaleString('ar-IQ')} د.ع (تخفيض ${discountAmount.toLocaleString('ar-IQ')} د.ع)
- المجموع الإجمالي: ${totalPrice.toLocaleString('ar-IQ')} د.ع

معلومات التوصيل:
- الاسم الثلاثي: ${customerName.trim()}
- رقم الهاتف: ${customerPhone.trim()}
- المحافظة: ${customerCity}
- المنطقة / القضاء: ${customerDistrict.trim()}

أرجو تجهيز طلبي وتوصيله بأسرع وقت، شكراً لكم!`;

      setOrderCompleted(true);

      // 3. توجيه الزبون إلى واتساب التاجر
      setTimeout(() => {
        let waUrl = '';
        if (cleanMerchantPhone) {
          // تحويل الرقم إلى الصيغة الدولية إذا كان يبدأ بـ 07
          let targetPhone = cleanMerchantPhone;
          if (targetPhone.startsWith('07')) {
            targetPhone = '964' + targetPhone.substring(1);
          } else if (targetPhone.startsWith('7')) {
            targetPhone = '964' + targetPhone;
          }
          waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(whatsappMessage)}`;
        } else {
          // فتح نافذة واتساب العامة مع نص الرسالة
          waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
        }

        window.open(waUrl, '_blank');
      }, 700);

    } catch (e: any) {
      setFormError('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-600 font-bold text-sm">جاري تجهيز العرض الحصري...</span>
        </div>
      </div>
    );
  }

  if (!product || !store) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-black text-slate-900 mb-2">عذراً، هذا المتجر أو العرض غير متوفر</h2>
          <p className="text-slate-600 text-xs leading-relaxed">
            قد يكون تم إيقاف هذا المتجر أو أن الرابط غير صالح.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28" dir="rtl">
      {/* شريط الإشعار العلوي للعرض الحصري */}
      <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white py-2 px-4 text-center text-xs sm:text-sm font-black shadow-sm flex items-center justify-center gap-2">
        <Flame className="w-4 h-4 animate-bounce shrink-0" />
        <span>عرض خاص لفترة محدودة | تخفيض بقيمة 20,000 د.ع ينتهي قريباً!</span>
      </div>

      {/* الهيدر الخاص بمتجر التاجر (بدون اسم وصلي - خصوصية بيضاء تامة) */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
              {store?.name ? store.name.charAt(0) : 'م'}
            </div>
            <div>
              <h1 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                {store?.name || 'متجر إلكتروني معتمد'}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>متجر عراقي موثوق - دفع عند الاستلام</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            <Truck className="w-3.5 h-3.5 text-brand-700" />
            <span>توصيل لكافة المحافظات</span>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي لصفحة العرض */}
      <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6 space-y-6">
        
        {/* صندوق العداد التنازلي للتخفيض لمدة 10 ساعات */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white p-4 sm:p-6 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="text-center sm:text-right space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-red-600/30 text-red-300 border border-red-500/30 px-3 py-1 rounded-full text-xs font-black">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>تخفيض على هذا المنتج لـ 10 ساعات فقط</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white">
                اطلب الآن قبل نفاذ الكمية أو قبل انتهاء العرض
              </h2>
            </div>

            {/* مربعات العداد التنازلي */}
            <div className="flex items-center gap-2 font-mono">
              <div className="flex flex-col items-center bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15 min-w-[58px]">
                <span className="text-xl sm:text-2xl font-black text-amber-400">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-300 font-sans">ساعة</span>
              </div>
              <span className="text-xl font-black text-white/50">:</span>
              <div className="flex flex-col items-center bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15 min-w-[58px]">
                <span className="text-xl sm:text-2xl font-black text-amber-400">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-300 font-sans">دقيقة</span>
              </div>
              <span className="text-xl font-black text-white/50">:</span>
              <div className="flex flex-col items-center bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15 min-w-[58px]">
                <span className="text-xl sm:text-2xl font-black text-red-400 animate-pulse">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-300 font-sans">ثانية</span>
              </div>
            </div>
          </div>

          {/* شريط نفاذ الكمية: تذكير بوجود 15 قطعة فقط */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>تنبيه المخزن: متبقي 15 قطعة فقط من هذا المنتج في المخزن!</span>
            </div>
            <div className="w-full sm:w-48 bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-red-500 h-full w-[85%] rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* بطاقة المنتج ومعرض الصور والتسعير */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200/90 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* قسم معرض الصور (يسار في RTL) */}
          <div className="lg:col-span-6 space-y-3">
            {/* الصورة الرئيسية الكبيرة */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={productImages[activeImageIndex] || '/placeholder-product.svg'}
                alt={product.name}
                className="w-full h-full object-cover transition-all duration-300"
              />

              {/* شارة التوفير الكبيرة على الصورة */}
              <div className="absolute top-3 right-3 bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>خصم 20,000 د.ع</span>
              </div>

              {/* أزرار التنقل السريع بين الصور إن وجدت أكثر من صورة */}
              {productImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* الصور المصغرة للتنقل */}
            {productImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeImageIndex === idx ? 'border-brand-700 ring-2 ring-brand-700/20' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* تفاصيل المنتج والتسعير المزدوج (يمين في RTL) */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="inline-block px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 font-bold text-xs mb-2">
                {product.category || 'عرض حصري خاص'}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {product.name}
              </h1>
            </div>

            {/* صندوق السعر المزدوج والمقارنة الصريحة */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">السعر السابق للمنتج:</span>
                <span className="text-sm font-black text-slate-400 line-through font-mono">
                  {previousPrice.toLocaleString('ar-IQ')} د.ع
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-sm font-black text-brand-900">السعر الحالي بالعرض:</span>
                <div className="text-left">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                    {currentPrice.toLocaleString('ar-IQ')}
                  </span>
                  <span className="text-xs font-bold text-slate-600 mr-1">د.ع</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-black text-emerald-800 bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>توفيرك اليوم من هذا العرض:</span>
                </span>
                <span className="font-mono text-sm">20,000 د.ع</span>
              </div>
            </div>

            {/* ميزات الشراء السريع والموثوقية */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/80">
                <Truck className="w-4 h-4 text-brand-700 shrink-0" />
                <span>توصيل سريع لباب البيت</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/80">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>دفع نقداً عند الاستلام</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/80">
                <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
                <span>فحص المنتج قبل الاستلام</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/80">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ضمان الجودة والاستبدال</span>
              </div>
            </div>

            {/* زر القفز السريع لنموذج الطلب في الصفحة */}
            <button
              type="button"
              onClick={scrollToOrderForm}
              className="w-full py-3.5 px-6 rounded-2xl bg-brand-700 hover:bg-brand-800 active:scale-98 text-white font-black text-sm shadow-lg shadow-brand-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-accent-400" />
              <span>اضغط هنا لتعبئة طلبك واستلام الخصم</span>
            </button>
          </div>
        </div>

        {/* وصف وتفاصيل المنتج */}
        {product.description && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-3">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Check className="w-4 h-4 text-brand-700" />
              <span>تفاصيل ومواصفات المنتج</span>
            </h2>
            <div className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          </div>
        )}

        {/* قسم نموذج الطلب المباشر الكامل */}
        <div 
          ref={orderSectionRef}
          id="order-form" 
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border-2 border-brand-600 scroll-mt-20 space-y-6"
        >
          <div className="text-center space-y-2 pb-4 border-b border-slate-200">
            <div className="w-12 h-12 bg-brand-50 text-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              تأكيد طلبك الآن قبل انتهاء الخصم
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              املأ معلوماتك وسيقوم المتجر بتجهيز طلبك والتواصل معك فوراً عبر واتساب لتأكيد الشحن
            </p>
          </div>

          {orderCompleted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-black text-emerald-900">تم استلام طلبك بنجاح!</h3>
              <p className="text-xs text-emerald-700 leading-relaxed max-w-md mx-auto">
                تم توجيهك إلى واتساب التاجر مع نص الرسالة مجهزاً بالكامل. إذا لم يفتح الواتساب تلقائياً، يمكنك الضغط على الزر أدناه:
              </p>
              <button
                type="button"
                onClick={handleConfirmOrder}
                className="mt-2 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إعادة فتح واتساب التاجر</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmOrder} className="space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center">
                  {formError}
                </div>
              )}

              {/* اختيار الكمية */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">الكمية المطلوبة:</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    سعر القطعة: {currentPrice.toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-black font-mono text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* حقل الاسم الثلاثي */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-700" />
                  <span>اسمك الثلاثي</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: علي حسن عبد الله"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all"
                />
              </div>

              {/* حقل رقم التليفون */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-700" />
                  <span>رقم تليفونك (واتساب)</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  placeholder="07700000000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm text-right outline-none transition-all"
                />
              </div>

              {/* حقل المحافظة */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-700" />
                  <span>المحافظة</span>
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all bg-white"
                >
                  {IRAQ_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>

              {/* حقل اسم القضاء أو المنطقة / المنطقة الفرعية */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-700" />
                  <span>اسم القضاء أو المنطقة أو الحي بالتفصيل</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: قضاء الكرادة - محلة 902 - قرب جامع الزوية"
                  value={customerDistrict}
                  onChange={(e) => setCustomerDistrict(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all"
                />
              </div>

              {/* ملخص المجموع النهائي والتأكيد */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-black">
                <span className="text-slate-700">المجموع النهائي (شامل الخصم):</span>
                <span className="text-xl font-mono text-emerald-600">
                  {totalPrice.toLocaleString('ar-IQ')} د.ع
                </span>
              </div>

              {/* زر الإرسال وتأكيد الطلب */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>جاري تسجيل الطلب وتجهيز الواتساب...</span>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    <span>تأكيد الطلب الآن عبر واتساب</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* الشريط السفلي العائم (Floating Sticky Bar) الثابت بالشاشة وقابل للتفاعل مع زر نابض */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 sm:p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold line-through font-mono">
              {previousPrice.toLocaleString('ar-IQ')} د.ع
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-2xl font-black text-emerald-600 font-mono">
                {currentPrice.toLocaleString('ar-IQ')}
              </span>
              <span className="text-[11px] font-bold text-slate-600">د.ع</span>
            </div>
          </div>

          {/* زر الطلب الآن العائم والنابض */}
          <button
            type="button"
            onClick={scrollToOrderForm}
            className="flex-1 max-w-sm py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse active:scale-98"
          >
            <ShoppingBag className="w-4 h-4 text-accent-300" />
            <span>اطلب الآن قبل نفاذ الـ 15 قطعة</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OfferPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <OfferPageContent />
    </Suspense>
  );
}
