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
  Check,
  Maximize2,
  X,
  Layers,
  Award,
  Star,
  Eye
} from 'lucide-react';
import { IRAQ_GOVERNORATES } from '@/data/iraqCities';
import { Product, Store } from '@/types';

// مكون مخصص لعرض كل صورة بتأثير ثلاثي الأبعاد عند التمرير (3D Scroll Reveal & Tilt)
function Reveal3DImageCard({
  image,
  index,
  total,
  productTitle,
  onOpenZoom,
  onQuickOrder,
}: {
  image: string;
  index: number;
  total: number;
  productTitle: string;
  onOpenZoom: (img: string) => void;
  onQuickOrder: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // الكشف عن وصول التمرير إلى الصورة
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // تفاعل الإمالة ثلاثية الأبعاد مع حركة الماوس أو اللمس
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -9; // إمالة أفقية
    const rotateY = ((x - centerX) / centerX) * 9;  // إمالة عمودية
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  // نصوص وعناوين زوايا العرض ثلاثية الأبعاد
  const angleTitles = [
    'المنظور الرئيسي للتصميم والفخامة',
    'الزاوية الجانبية وتفاصيل الخامات',
    'أدق تفاصيل الجودة والمتانة',
    'منظور الاستخدام العملي والأناقة',
    'لقطة مقربة للأبعاد واللمسات النهائية',
  ];
  const angleTitle = angleTitles[index % angleTitles.length];

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-16 scale-95'
      }`}
      style={{ perspective: '1200px' }}
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d',
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className="relative bg-gradient-to-b from-white via-slate-50/60 to-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden group backdrop-blur-sm"
      >
        {/* خلفية جمالية بتوهج خفيف في الزوايا */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-brand-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-brand-500/20 transition-all duration-700"></div>
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700"></div>

        {/* شريط معلومات الزاوية العلوية */}
        <div className="flex items-center justify-between gap-3 mb-3 relative z-10" style={{ transform: 'translateZ(20px)' }}>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-slate-900 text-amber-400 font-mono text-xs font-black shadow-sm">
              0{index + 1}
            </span>
            <div>
              <span className="text-[10px] font-bold text-slate-600 block">زاوية العرض الحقيقية</span>
              <h4 className="text-xs sm:text-sm font-black text-slate-800 leading-tight">
                {angleTitle}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>جودة أصلية</span>
            </span>
            <button
              type="button"
              onClick={() => onOpenZoom(image)}
              title="تكبير الصورة"
              className="w-8 h-8 rounded-xl bg-white/90 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* حاوية الصورة ثلاثية الأبعاد */}
        <div 
          className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-inner group/img cursor-pointer"
          style={{ transform: 'translateZ(35px)' }}
          onClick={() => onOpenZoom(image)}
        >
          <img
            src={image}
            alt={`${productTitle} - زاوية ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/img:scale-105"
            loading="lazy"
          />

          {/* تدرج تظليل سينمائي خفيف عند الأسفل */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none flex items-end p-4">
            <span className="text-white text-xs font-bold flex items-center gap-1.5 drop-shadow-md">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>اضغط لتكبير الصورة بدقة كاملة</span>
            </span>
          </div>

          {/* شارة ثلاثية الأبعاد عائمة على الصورة */}
          <div 
            className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-white/20 shadow-lg text-[11px] font-black flex items-center gap-1.5"
            style={{ transform: 'translateZ(45px)' }}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>عرض ثلاثي الأبعاد • {index + 1} من {total}</span>
          </div>
        </div>

        {/* شريط الإجراء السفلي للبطاقة */}
        <div 
          className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs"
          style={{ transform: 'translateZ(25px)' }}
        >
          <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصوير مطابق 100% للواقع الفعلي</span>
          </div>

          <button
            type="button"
            onClick={onQuickOrder}
            className="px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-black text-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>احجز هذه القطعة</span>
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // حالة تكبير الصورة المنبثقة (Lightbox Modal)
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // حالة معرض الصور العلوي
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

  // مراجع التمرير
  const orderSectionRef = useRef<HTMLDivElement>(null);
  const gallery3DRef = useRef<HTMLDivElement>(null);

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
          console.warn('تعذر جلب المتجر من السيرفر:', e);
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

  // التمرير السلس إلى قسم الصور ثلاثية الأبعاد
  const scrollTo3DGallery = () => {
    if (gallery3DRef.current) {
      gallery3DRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            notes: 'طلب سريع من صفحة العرض الحصري ثلاثية الأبعاد',
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
          let targetPhone = cleanMerchantPhone;
          if (targetPhone.startsWith('07')) {
            targetPhone = '964' + targetPhone.substring(1);
          } else if (targetPhone.startsWith('7')) {
            targetPhone = '964' + targetPhone;
          }
          waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(whatsappMessage)}`;
        } else {
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <span className="text-white font-black text-sm tracking-wide">جاري تحميل تجربة العرض ثلاثي الأبعاد...</span>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32" dir="rtl">
      {/* شريط الإشعار العلوي للعرض الحصري */}
      <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white py-2 px-4 text-center text-xs sm:text-sm font-black shadow-sm flex items-center justify-center gap-2">
        <Flame className="w-4 h-4 animate-bounce shrink-0 text-amber-300" />
        <span>عرض خاص لفترة محدودة | تخفيض بقيمة 20,000 د.ع ينتهي قريباً!</span>
      </div>

      {/* الهيدر الخاص بمتجر التاجر (بدون اسم وصلي - خصوصية بيضاء تامة) */}
      <header className="bg-white/95 border-b border-slate-200/80 sticky top-0 z-30 shadow-xs backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-700 text-white flex items-center justify-center font-black text-sm shadow-xs ring-2 ring-brand-100">
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

          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <Truck className="w-3.5 h-3.5 text-brand-700" />
            <span>توصيل لكافة المحافظات</span>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي لصفحة العرض */}
      <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6 space-y-8">
        
        {/* صندوق العداد التنازلي للتخفيض لمدة 10 ساعات */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white p-5 sm:p-7 shadow-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div className="text-center sm:text-right space-y-1.5">
              <div className="inline-flex items-center gap-1.5 bg-red-600/30 text-red-300 border border-red-500/30 px-3 py-1 rounded-full text-xs font-black">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>تخفيض حقيقي لـ 10 ساعات فقط</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white">
                اطلب الآن قبل نفاذ الكمية أو انتهاء وقت العرض
              </h2>
            </div>

            {/* مربعات العداد التنازلي الفاخرة */}
            <div className="flex items-center gap-2 font-mono">
              <div className="flex flex-col items-center bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/15 min-w-[62px] shadow-inner">
                <span className="text-2xl sm:text-3xl font-black text-amber-400">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-300 font-sans font-bold">ساعة</span>
              </div>
              <span className="text-2xl font-black text-white/40">:</span>
              <div className="flex flex-col items-center bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/15 min-w-[62px] shadow-inner">
                <span className="text-2xl sm:text-3xl font-black text-amber-400">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-300 font-sans font-bold">دقيقة</span>
              </div>
              <span className="text-2xl font-black text-white/40">:</span>
              <div className="flex flex-col items-center bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/15 min-w-[62px] shadow-inner">
                <span className="text-2xl sm:text-3xl font-black text-red-400 animate-pulse">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-slate-300 font-sans font-bold">ثانية</span>
              </div>
            </div>
          </div>

          {/* شريط نفاذ الكمية */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span>تنبيه المخزن: متبقي 15 قطعة فقط في مخازن التوصيل السريع!</span>
            </div>
            <div className="w-full sm:w-52 bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5">
              <div className="bg-gradient-to-r from-amber-500 to-red-500 h-full w-[85%] rounded-full animate-pulse shadow-sm"></div>
            </div>
          </div>
        </div>

        {/* بطاقة الواجهة الرئيسية والتسعير الفوري */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200/90 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* قسم الصورة الرئيسية والمعرض التفاعلي */}
          <div className="lg:col-span-6 space-y-3.5">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md group">
              <img
                src={productImages[activeImageIndex] || '/placeholder-product.svg'}
                alt={product.name}
                className="w-full h-full object-cover transition-all duration-300"
              />

              {/* شارة التوفير الكبيرة على الصورة */}
              <div className="absolute top-3 right-3 bg-red-600 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>خصم 20,000 د.ع</span>
              </div>

              {/* زر استعراض المنظور ثلاثي الأبعاد بالنزول للأسفل */}
              <button
                type="button"
                onClick={scrollTo3DGallery}
                className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-white/20 shadow-md flex items-center gap-1.5 hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>استعراض الصور ثلاثية الأبعاد ↓</span>
              </button>

              {/* أزرار التنقل السريع بين الصور */}
              {productImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1))}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* الصور المصغرة */}
            {productImages.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeImageIndex === idx ? 'border-brand-700 ring-2 ring-brand-700/20 scale-102' : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* تفاصيل المنتج والتسعير المزدوج */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-50 text-brand-700 font-bold text-xs mb-2 border border-brand-100">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>{product.category || 'عرض ترويجي حصري'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {product.name}
              </h1>
            </div>

            {/* صندوق السعر المزدوج والمقارنة الصريحة */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">السعر السابق للمنتج:</span>
                <span className="text-sm font-black text-slate-400 line-through font-mono">
                  {previousPrice.toLocaleString('ar-IQ')} د.ع
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm font-black text-slate-900">سعر العرض المخفض:</span>
                <div className="text-left">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                    {currentPrice.toLocaleString('ar-IQ')}
                  </span>
                  <span className="text-xs font-bold text-slate-600 mr-1">د.ع</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-black text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>مجموع التوفير الفوري لك:</span>
                </span>
                <span className="font-mono text-sm font-black">20,000 د.ع</span>
              </div>
            </div>

            {/* ميزات الشراء والموثوقية */}
            <div className="grid grid-cols-2 gap-2.5 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/90 border border-slate-200/60">
                <Truck className="w-4 h-4 text-brand-700 shrink-0" />
                <span>توصيل سريع لباب البيت</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/90 border border-slate-200/60">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>دفع نقداً عند الاستلام</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/90 border border-slate-200/60">
                <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
                <span>فحص المنتج قبل الاستلام</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/90 border border-slate-200/60">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ضمان الجودة والاستبدال</span>
              </div>
            </div>

            {/* زر القفز السريع لنموذج الطلب */}
            <button
              type="button"
              onClick={scrollToOrderForm}
              className="w-full py-4 px-6 rounded-2xl bg-brand-700 hover:bg-brand-800 active:scale-98 text-white font-black text-sm shadow-lg shadow-brand-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" />
              <span>اضغط هنا لتعبئة طلبك واستلام الخصم</span>
            </button>
          </div>
        </div>

        {/* قسم صور المنتج ثلاثية الأبعاد أثناء التمرير (3D Interactive Scroll Showcase) */}
        <section ref={gallery3DRef} className="space-y-6 pt-4">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-400 text-xs font-black shadow-sm">
              <Layers className="w-3.5 h-3.5" />
              <span>معرض الاستعراض الواقعي ثلاثي الأبعاد</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              استكشف المنتج بكل تفاصيله وزواياه الواقعية
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              مرر للأسفل لمشاهدة تفاصيل المنتج من زوايا تصوير متعددة، حرّك الماوس أو المس الشاشة لتفاعل ثلاثي الأبعاد!
            </p>
          </div>

          {/* قائمة البطاقات ثلاثية الأبعاد التي تظهر كلما نزل الزبون للأسفل */}
          <div className="space-y-6 sm:space-y-8">
            {productImages.map((img, idx) => (
              <Reveal3DImageCard
                key={idx}
                image={img}
                index={idx}
                total={productImages.length}
                productTitle={product.name}
                onOpenZoom={(selectedImg) => setZoomImage(selectedImg)}
                onQuickOrder={scrollToOrderForm}
              />
            ))}
          </div>
        </section>

        {/* وصف وتفاصيل المنتج */}
        {product.description && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/90 space-y-3">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Check className="w-4 h-4 text-brand-700" />
              <span>تفاصيل ومواصفات المنتج</span>
            </h2>
            <div className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
              {product.description}
            </div>
          </div>
        )}

        {/* تقييمات وتجارب الزبائن السابقة لتعزيز الثقة */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-1 text-amber-400 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <h3 className="text-base font-black text-white">تقييم المشترين وتجربتهم</h3>
            </div>
            <span className="text-xs font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-full">
              تقييم عام: 4.9 / 5 من أكثر من 180 زبون عراقي
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold text-white">كرار من بغداد</span>
                <span className="text-[10px] text-emerald-400 font-bold">شراء مؤكد</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                المنتج وصلني خلال 24 ساعة نفس الصور بالضبط والتعامل راقي جداً. شكراً لكم.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold text-white">أم حسين من البصرة</span>
                <span className="text-[10px] text-emerald-400 font-bold">شراء مؤكد</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                فتحت الكارتونة وفحصت المنتج قبل ما أنطي الفلوس للمندوب، جودة ممتازة وسعر الخصم رائع.
              </p>
            </div>
          </div>
        </div>

        {/* قسم نموذج الطلب المباشر الكامل */}
        <div 
          ref={orderSectionRef}
          id="order-form" 
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-brand-600 scroll-mt-20 space-y-6"
        >
          <div className="text-center space-y-2 pb-4 border-b border-slate-200">
            <div className="w-12 h-12 bg-brand-50 text-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
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
                className="mt-2 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer shadow-sm"
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

      {/* الشريط السفلي العائم (Floating Sticky Bar) */}
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
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span>اطلب الآن قبل نفاذ الـ 15 قطعة</span>
          </button>
        </div>
      </div>

      {/* نافذة تكبير الصورة المنبثقة بدقة عالية (Lightbox Modal) */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImage(null)}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomImage}
            alt="تكبير صورة المنتج"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default function OfferPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <OfferPageContent />
    </Suspense>
  );
}
