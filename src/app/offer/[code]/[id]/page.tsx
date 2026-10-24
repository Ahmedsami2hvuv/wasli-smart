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
  Eye,
  Zap,
  ShieldAlert,
  ArrowDown
} from 'lucide-react';
import { IRAQ_GOVERNORATES } from '@/data/iraqCities';
import { Product, Store } from '@/types';

// بطاقة عرض الصورة ثلاثية الأبعاد الفاخرة أثناء التمرير (Cinematic 3D Scroll Stage)
function Cinematic3DImageCard({
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const angleTitles = [
    { label: 'المنظور الرئيسي المتكامل', badge: 'فخامة مطلقة' },
    { label: 'زاوية تفاصيل الخامات والدقة', badge: 'تصنيع ممتاز' },
    { label: 'أدق تفاصيل الملمس والتشطيب', badge: 'فحص يدوي' },
    { label: 'منظور الاستخدام العملي الواقعي', badge: 'مطابق 100%' },
    { label: 'اللقطة المقربة لأبعاد القطعة', badge: 'أصلي معتمد' },
  ];
  const currentAngle = angleTitles[index % angleTitles.length];

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-24 scale-90'
      }`}
      style={{ perspective: '1400px' }}
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.025, 1.025, 1.025)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d',
          transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative rounded-3xl p-5 sm:p-7 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-black border border-amber-500/30 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.15)] overflow-hidden group backdrop-blur-xl"
      >
        {/* هالة توهج علوية سينمائية */}
        <div className="absolute top-0 right-1/4 w-72 h-32 bg-gradient-to-b from-amber-500/20 via-brand-500/10 to-transparent blur-3xl pointer-events-none group-hover:from-amber-500/30 transition-all duration-700"></div>
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700"></div>

        {/* لمعان ضوئي ديناميكي عائم على الحافة */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-75"></div>

        {/* شريط معلومات الزاوية العلوية */}
        <div className="flex items-center justify-between gap-3 mb-4 relative z-10" style={{ transform: 'translateZ(25px)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-mono text-base font-black flex items-center justify-center shadow-lg shadow-amber-500/30 ring-2 ring-amber-300/30">
              0{index + 1}
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                زاوية تفاعلية ثلاثية الأبعاد
              </span>
              <h4 className="text-sm sm:text-base font-black text-white leading-tight">
                {currentAngle.label}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black shadow-xs flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentAngle.badge}</span>
            </span>
            <button
              type="button"
              onClick={() => onOpenZoom(image)}
              title="تكبير الصورة بدقة فائقة"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center shadow-md transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        </div>

        {/* مسرح الصورة ثلاثي الأبعاد مع انعكاس وتأثير زجاجي */}
        <div 
          className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl group/img cursor-pointer"
          style={{ transform: 'translateZ(40px)' }}
          onClick={() => onOpenZoom(image)}
        >
          <img
            src={image}
            alt={`${productTitle} - زاوية ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/img:scale-108"
            loading="lazy"
          />

          {/* طبقة توهج سينمائي أسفل الصورة */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-60 group-hover/img:opacity-40 transition-opacity"></div>

          {/* تلميح النقر للتكبير */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-xs">
            <span className="px-4 py-2 rounded-2xl bg-slate-950/90 text-amber-400 font-black text-xs border border-amber-400/40 shadow-xl flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>اضغط للتكبير وفحص الخامة بدقة عالية</span>
            </span>
          </div>

          {/* شارة رقم الزاوية العائمة في الفضاء ثلاثي الأبعاد */}
          <div 
            className="absolute top-3.5 right-3.5 bg-slate-950/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-amber-400/30 shadow-xl text-xs font-black flex items-center gap-2"
            style={{ transform: 'translateZ(60px)' }}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-mono font-bold">زاوية 0{index + 1}</span>
            <span className="text-white/40">/</span>
            <span className="text-white/70 font-mono">0{total}</span>
          </div>

          {/* شارة الضمان الواقعي */}
          <div 
            className="absolute bottom-3.5 left-3.5 bg-emerald-950/90 backdrop-blur-md text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/40 shadow-xl text-[11px] font-black flex items-center gap-1.5"
            style={{ transform: 'translateZ(50px)' }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>تصوير حقيقي مطابق 100%</span>
          </div>
        </div>

        {/* شريط الإجراء السفلي للبطاقة */}
        <div 
          className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3 text-xs"
          style={{ transform: 'translateZ(30px)' }}
        >
          <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>معاينة حرة عند باب البيت قبل دفع الدينار</span>
          </div>

          <button
            type="button"
            onClick={onQuickOrder}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>احجز هذه القطعة الآن</span>
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

  // حالة تكبير الصورة المنبثقة بدقة عالية
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
    const storageKey = `wasli_offer_expiry_${productId}_${storeCode}`;
    let targetTime: number;

    if (typeof window !== 'undefined') {
      const savedExpiry = localStorage.getItem(storageKey);
      if (savedExpiry && Number(savedExpiry) > Date.now()) {
        targetTime = Number(savedExpiry);
      } else {
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

        try {
          const spRes = await fetch(`/api/stores/products?storeCode=${storeCode}`);
          const spData = await spRes.json();
          if (spData.success && spData.products) {
            foundProduct = spData.products.find(
              (p: any) => p.id === productId || p.slug === productId
            );
          }
        } catch (e) {}

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

  const previousPrice = currentPrice + 20000;
  const discountAmount = 20000;
  const totalPrice = currentPrice * quantity;

  const scrollToOrderForm = () => {
    if (orderSectionRef.current) {
      orderSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollTo3DGallery = () => {
    if (gallery3DRef.current) {
      gallery3DRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // إرسال وتأكيد الطلب
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
            notes: 'طلب سريع من العرض السينمائي ثلاثي الأبعاد',
          }),
        });
      } catch (errOrder) {
        console.warn('تنبيه حفظ الطلب في النظام:', errOrder);
      }

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
      <div className="min-h-screen bg-[#070A11] flex items-center justify-center p-4 text-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <Sparkles className="w-7 h-7 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <span className="text-amber-300 font-black text-sm tracking-widest">جاري تحميل المنصة الفاخرة ثلاثية الأبعاد...</span>
        </div>
      </div>
    );
  }

  if (!product || !store) {
    return (
      <div className="min-h-screen bg-[#070A11] flex items-center justify-center p-4 text-center" dir="rtl">
        <div className="bg-slate-900/90 border border-amber-500/30 p-8 rounded-3xl shadow-2xl max-w-md w-full backdrop-blur-xl">
          <AlertCircle className="w-14 h-14 text-amber-400 mx-auto mb-3 animate-bounce" />
          <h2 className="text-xl font-black text-white mb-2">عذراً، هذا العرض غير متوفر حالياً</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            قد يكون نفذت الكمية بالكامل أو انتهت فترة صلاحية هذا الرابط الحصري.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080F] text-slate-100 pb-36 relative overflow-x-hidden selection:bg-amber-500 selection:text-black" dir="rtl">
      
      {/* خلفية ضوئية متحركة في عمق الصفحة */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px]"></div>
        <div className="absolute top-1/3 left-10 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-1/4 right-10 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[150px]"></div>
        {/* شبكة هندسية خافتة فخمة */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-70"></div>
      </div>

      <div className="relative z-10">
        
        {/* شريط الإشعار العلوي الناري الخاطف للأنظار */}
        <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-slate-950 font-black py-2.5 px-4 shadow-[0_4px_25px_rgba(239,68,68,0.4)]">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm tracking-wide">
            <Flame className="w-5 h-5 text-red-950 animate-bounce shrink-0" />
            <span className="font-black">عرض التصفية الفوري | خصم 20,000 د.ع ينتهي مع انتهاء العداد أدناه!</span>
            <Zap className="w-4 h-4 text-red-950 shrink-0" />
          </div>
        </div>

        {/* الهيدر الزجاجي الملكي لمتجر التاجر */}
        <header className="bg-slate-950/80 border-b border-white/10 sticky top-0 z-30 shadow-2xl backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black text-base shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-2 ring-white/20">
                {store?.name ? store.name.charAt(0) : 'م'}
              </div>
              <div>
                <h1 className="font-black text-white text-sm sm:text-base leading-tight tracking-wide">
                  {store?.name || 'متجر معتمد'}
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>متجر عراقي موثوق • دفع بعد الفحص والاستلام</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl shadow-inner">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>شحن سريع لـ 18 محافظة</span>
            </div>
          </div>
        </header>

        {/* المحتوى الرئيسي للمنصة */}
        <main className="max-w-4xl mx-auto px-4 pt-6 space-y-8">
          
          {/* صندوق العداد التنازلي الليزري الفاخر لـ 10 ساعات */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-[#0E1322] to-slate-950 p-6 sm:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_50px_rgba(245,158,11,0.15)] border-2 border-amber-500/40 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-red-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10">
              <div className="text-center sm:text-right space-y-2">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600/30 to-amber-600/30 text-amber-300 border border-amber-400/40 px-3.5 py-1 rounded-full text-xs font-black shadow-inner">
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>تخفيض خاص جداً • صالح لـ 10 ساعات فقط</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">
                  احجز طلبك الآن قبل إغلاق العرض وعودة السعر الأصلي
                </h2>
                <p className="text-xs text-slate-300">
                  سيتم تثبيت الخصم المالي فور إرسال النموذج وحجز قطعتك من المخزن المركزي
                </p>
              </div>

              {/* مربعات العداد التنازلي النيون الرقمية */}
              <div className="flex items-center gap-2.5 font-mono">
                <div className="flex flex-col items-center bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-amber-500/40 min-w-[68px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                  <span className="text-2xl sm:text-4xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-sans font-bold mt-1">ساعة</span>
                </div>
                <span className="text-3xl font-black text-amber-400/50 animate-pulse">:</span>
                <div className="flex flex-col items-center bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-amber-500/40 min-w-[68px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                  <span className="text-2xl sm:text-4xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-sans font-bold mt-1">دقيقة</span>
                </div>
                <span className="text-3xl font-black text-amber-400/50 animate-pulse">:</span>
                <div className="flex flex-col items-center bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-red-500/50 min-w-[68px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
                  <span className="text-2xl sm:text-4xl font-black text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-sans font-bold mt-1">ثانية</span>
                </div>
              </div>
            </div>

            {/* شريط نفاذ المخزن التفاعلي الليزري */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs font-black text-amber-300">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                <span>تنبيه المخزن: متبقي 15 قطعة فقط في مخازن التوصيل السريع!</span>
              </div>
              <div className="w-full sm:w-60 bg-black/70 h-3 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
                <div className="bg-gradient-to-r from-amber-500 via-red-500 to-amber-400 h-full w-[88%] rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
              </div>
            </div>
          </div>

          {/* منصة المنتج الرئيسية والتسعير المزدوج */}
          <div className="rounded-3xl bg-slate-950/90 border border-white/15 p-6 sm:p-9 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-9 items-start relative">
            
            {/* قسم معرض الصور الرئيسي مع تأثير ثلاثي الأبعاد */}
            <div className="lg:col-span-6 space-y-4">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl group cursor-pointer" onClick={() => setZoomImage(productImages[activeImageIndex])}>
                <img
                  src={productImages[activeImageIndex] || '/placeholder-product.svg'}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-106"
                />

                {/* شارة الخصم النارية البارزة */}
                <div className="absolute top-4 right-4 bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 font-black text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(239,68,68,0.6)] flex items-center gap-1.5 ring-2 ring-white/20">
                  <Flame className="w-4 h-4 fill-slate-950" />
                  <span>وفر 20,000 د.ع الآن</span>
                </div>

                {/* زر النزول للصور ثلاثية الأبعاد */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollTo3DGallery();
                  }}
                  className="absolute bottom-4 left-4 bg-black/80 hover:bg-black text-amber-300 px-4 py-2 rounded-xl text-xs font-black border border-amber-500/40 shadow-xl flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer group-hover:border-amber-400"
                >
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>تصفح الصور ثلاثية الأبعاد ↓</span>
                </button>

                {/* أزرار التنقل */}
                {productImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1));
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-6 h-6 text-amber-300" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-6 h-6 text-amber-300" />
                    </button>
                  </>
                )}
              </div>

              {/* مصغرات الصور */}
              {productImages.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        activeImageIndex === idx 
                          ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105' 
                          : 'border-white/10 opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* تفاصيل المنتج والتسعير المزدوج المقارن */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 font-black text-xs mb-3 border border-amber-400/30 shadow-inner">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{product.category || 'العرض الأكثر طلباً'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug tracking-wide">
                  {product.name}
                </h1>
              </div>

              {/* صندوق مقارنة السعر الفاخر المشطوب */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-black/80 to-slate-900/90 border border-white/15 space-y-3.5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">السعر السابق بالسوق:</span>
                  <span className="text-base font-black text-slate-500 line-through font-mono">
                    {previousPrice.toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-sm font-black text-amber-300">سعر العرض الحصري اليوم:</span>
                  <div className="text-left flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                      {currentPrice.toLocaleString('ar-IQ')}
                    </span>
                    <span className="text-xs font-black text-emerald-300">د.ع</span>
                  </div>
                </div>

                {/* بطاقة التوفير المشعة */}
                <div className="pt-2 flex items-center justify-between text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 p-3.5 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.3)]">
                  <span className="flex items-center gap-1.5 font-black">
                    <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                    <span>مجموع التوفير في جيبك اليوم:</span>
                  </span>
                  <span className="font-mono text-base font-black">20,000 د.ع</span>
                </div>
              </div>

              {/* ميزات الضمان والتوصيل الفاخرة */}
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-200">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>توصيل سريع لباب البيت</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>الدفع نقداً بعد المعاينة</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>فحص قبل دفع الدينار</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ضمان الجودة والاستبدال</span>
                </div>
              </div>

              {/* زر الحجز السريع والقفز لنموذج الشراء */}
              <button
                type="button"
                onClick={scrollToOrderForm}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 active:scale-98 text-slate-950 font-black text-sm sm:text-base shadow-[0_0_35px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2.5 cursor-pointer ring-2 ring-white/20"
              >
                <ShoppingBag className="w-5 h-5 fill-slate-950" />
                <span>اضغط هنا لتعبئة طلبك واستلام الخصم فوراً</span>
              </button>
            </div>
          </div>

          {/* قسم استعراض صور المنتج ثلاثية الأبعاد الفاخرة عند التمرير */}
          <section ref={gallery3DRef} className="space-y-7 pt-6">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-500/20 text-amber-300 text-xs font-black border border-amber-400/40 shadow-lg">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>المسرح ثلاثي الأبعاد • انزل للأسفل للاستعراض</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                شاهد تفاصيل المنتج كأنك تمسكه بيدك الآن
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                كلما مررت للأسفل، تظهر كل زاوية بتفاعل ثلاثي الأبعاد حقيقي، حرّك الماوس أو المس الشاشة لاختبار العمق!
              </p>
            </div>

            {/* بطاقات الصور ثلاثية الأبعاد التفاعلية */}
            <div className="space-y-8">
              {productImages.map((img, idx) => (
                <Cinematic3DImageCard
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

          {/* مواصفات وتفاصيل المنتج */}
          {product.description && (
            <div className="rounded-3xl bg-slate-950/80 border border-white/10 p-6 sm:p-8 shadow-xl space-y-4 backdrop-blur-md">
              <h2 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                <Check className="w-5 h-5 text-amber-400" />
                <span>مواصفات وتفاصيل المنتج الأصلية</span>
              </h2>
              <div className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
                {product.description}
              </div>
            </div>
          )}

          {/* تقييمات الزبائن وتجارب الشراء بالثيم الداكن الفاخر */}
          <div className="rounded-3xl bg-gradient-to-br from-black via-slate-950 to-black p-6 sm:p-8 shadow-2xl border border-white/10 space-y-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">آراء وتجارب المشترين العراقيين</h3>
              </div>
              <span className="text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-3.5 py-1.5 rounded-xl">
                تقييم: 4.9 / 5 من أكثر من 240 زبون
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-black text-white text-sm">كرار من بغداد</span>
                  <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-500/30">شراء مؤكد</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  المنتج وصلني خلال 24 ساعة نفس الصور بالضبط والتعامل راقي جداً. فحصت المنتج قبل ما أدفع والمندوب كان محترم.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-black text-white text-sm">أم حسين من البصرة</span>
                  <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-500/30">شراء مؤكد</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  الخامة تجنن وتستاهل أكثر من سعرها، التخفيض كان فرصة حقيقية والباكيت وصل سليم ومرتب.
                </p>
              </div>
            </div>
          </div>

          {/* قسم نموذج الطلب الليزري المباشر المضيء */}
          <div 
            ref={orderSectionRef}
            id="order-form" 
            className="rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-9 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.2)] border-2 border-emerald-500/50 scroll-mt-24 space-y-7 relative overflow-hidden backdrop-blur-2xl"
          >
            <div className="absolute top-0 right-1/3 w-64 h-32 bg-emerald-500/15 blur-3xl pointer-events-none"></div>

            <div className="text-center space-y-2 pb-5 border-b border-white/10">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-[0_0_25px_rgba(16,185,129,0.5)] ring-2 ring-emerald-300/30">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                تأكيد حجز طلبك قبل نفاذ الكمية
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                املأ معلوماتك وسيقوم المتجر بتجهيز طلبك والتواصل معك فوراً عبر واتساب لتأكيد الشحن
              </p>
            </div>

            {orderCompleted ? (
              <div className="p-8 rounded-3xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-4 shadow-xl">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-xl font-black text-white">تم استلام طلبك وتثبيت الخصم بنجاح!</h3>
                <p className="text-xs sm:text-sm text-emerald-200 leading-relaxed max-w-md mx-auto">
                  تم توجيهك إلى واتساب التاجر مع نص الرسالة مجهزاً بالكامل. إذا لم يفتح الواتساب تلقائياً، يمكنك الضغط على الزر أدناه:
                </p>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  className="mt-2 py-4 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm inline-flex items-center gap-2 cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all active:scale-95"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>فتح محادثة واتساب التاجر الآن</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmOrder} className="space-y-5">
                {formError && (
                  <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs sm:text-sm font-black text-center shadow-md">
                    {formError}
                  </div>
                )}

                {/* اختيار الكمية */}
                <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-300 block">الكمية المطلوبة:</span>
                    <span className="text-xs text-amber-400 font-mono font-bold">
                      سعر القطعة: {currentPrice.toLocaleString('ar-IQ')} د.ع
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-30 flex items-center justify-center font-bold text-white cursor-pointer transition-all"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-black font-mono text-lg text-amber-300">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center font-bold text-white cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* حقل الاسم الثلاثي */}
                <div>
                  <label className="block text-xs font-black text-slate-300 mb-2 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-400" />
                    <span>اسمك الثلاثي</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: علي حسن عبد الله"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-black/70 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-white placeholder-slate-500 text-sm outline-none transition-all"
                  />
                </div>

                {/* حقل رقم الهاتف */}
                <div>
                  <label className="block text-xs font-black text-slate-300 mb-2 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-amber-400" />
                    <span>رقم هاتفك (واتساب)</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="07700000000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-black/70 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-white placeholder-slate-500 text-sm text-right outline-none transition-all"
                  />
                </div>

                {/* حقل المحافظة */}
                <div>
                  <label className="block text-xs font-black text-slate-300 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>المحافظة</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-black/70 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-white text-sm outline-none transition-all"
                  >
                    {IRAQ_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov} className="bg-slate-900 text-white">
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>

                {/* حقل القضاء أو الحي بالتفصيل */}
                <div>
                  <label className="block text-xs font-black text-slate-300 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>اسم القضاء أو الحي والشارع بالتفصيل</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: قضاء الكرادة - محلة 902 - قرب جامع الزوية"
                    value={customerDistrict}
                    onChange={(e) => setCustomerDistrict(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-black/70 border border-white/15 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-white placeholder-slate-500 text-sm outline-none transition-all"
                  />
                </div>

                {/* ملخص المجموع النهائي */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-sm sm:text-base font-black">
                  <span className="text-slate-300">المجموع النهائي (شامل الخصم):</span>
                  <span className="text-2xl sm:text-3xl font-mono text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                    {totalPrice.toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>

                {/* زر الإرسال وتأكيد الطلب الفاخر */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 sm:py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-base shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-98 ring-2 ring-white/30"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">جاري تسجيل طلبك وتجهيز الواتساب...</span>
                  ) : (
                    <>
                      <MessageCircle className="w-6 h-6 fill-slate-950" />
                      <span>تأكيد الطلب الآن وتثبيت الخصم عبر واتساب</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </main>

        {/* الشريط السفلي العائم السينمائي الفاخر (Floating Command Bar) */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-2xl border-t border-amber-500/30 p-3.5 sm:p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-500 font-bold line-through font-mono">
                {previousPrice.toLocaleString('ar-IQ')} د.ع
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-3xl font-black text-emerald-400 font-mono drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                  {currentPrice.toLocaleString('ar-IQ')}
                </span>
                <span className="text-xs font-bold text-slate-400">د.ع</span>
              </div>
            </div>

            {/* زر الحجز العائم المشع والنابض */}
            <button
              type="button"
              onClick={scrollToOrderForm}
              className="flex-1 max-w-md py-3.5 sm:py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-base shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse active:scale-98 ring-2 ring-amber-300/40"
            >
              <ShoppingBag className="w-5 h-5 fill-slate-950" />
              <span>اطلب الآن قبل نفاذ الـ 15 قطعة</span>
            </button>
          </div>
        </div>

        {/* نافذة تكبير الصورة المنبثقة بدقة سينمائية كاملة (Lightbox Modal) */}
        {zoomImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
            onClick={() => setZoomImage(null)}
          >
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute top-5 left-5 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20 shadow-2xl"
            >
              <X className="w-7 h-7" />
            </button>
            <img
              src={zoomImage}
              alt="تكبير صورة المنتج بدقة عالية"
              className="max-w-full max-h-[88vh] rounded-3xl object-contain shadow-[0_0_80px_rgba(245,158,11,0.3)] border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function OfferPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <OfferPageContent />
    </Suspense>
  );
}
