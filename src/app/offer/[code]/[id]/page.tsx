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
  Star,
  Eye,
  ArrowDown
} from 'lucide-react';
import { IRAQ_GOVERNORATES } from '@/data/iraqCities';
import { Product, Store } from '@/types';

// بطاقة صورة بنمط الزجاج الأبيض النقي ثلاثي الأبعاد أثناء التمرير
function WhiteGlass3DCard({
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
        threshold: 0.15,
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
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-700 ease-out transform ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-16 scale-95'
      }`}
      style={{ perspective: '1100px' }}
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.015, 1.015, 1.015)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d',
          transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className="relative rounded-3xl p-4 sm:p-6 bg-white/80 backdrop-blur-xl border border-white/90 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.07)] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] transition-shadow duration-300 group"
      >
        {/* انعكاس زجاجي علوي ناعم */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent rounded-t-3xl pointer-events-none"></div>

        {/* رأس البطاقة: ترقيم واقعي وبسيط */}
        <div className="flex items-center justify-between gap-3 mb-3 relative z-10" style={{ transform: 'translateZ(15px)' }}>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
              0{index + 1}
            </span>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-800 block">
                {index === 0 ? 'الصورة الرئيسية للمنتج' : `صورة توضيحية رقم ${index + 1}`}
              </span>
              <span className="text-[11px] text-slate-400">تصوير واقعي ومطابق للأصل</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenZoom(image)}
            title="تكبير الصورة"
            className="w-8 h-8 rounded-xl bg-white/90 hover:bg-white border border-slate-200/80 text-slate-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* مساحة عرض الصورة الزجاجية */}
        <div 
          className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/70 shadow-inner group/img cursor-pointer"
          style={{ transform: 'translateZ(25px)' }}
          onClick={() => onOpenZoom(image)}
        >
          <img
            src={image}
            alt={`${productTitle} - صورة ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/img:scale-104"
            loading="lazy"
          />

          {/* شارة زجاجية توضح رقم الصورة */}
          <div 
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-slate-800 px-3 py-1.5 rounded-xl border border-white/80 shadow-sm text-xs font-bold flex items-center gap-1.5"
            style={{ transform: 'translateZ(35px)' }}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>صورة {index + 1} من {total}</span>
          </div>

          {/* تلميح تكبير ناعم */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
            <span className="px-3.5 py-1.5 rounded-xl bg-white/95 text-slate-800 text-xs font-bold shadow-md flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>اضغط للتكبير</span>
            </span>
          </div>
        </div>

        {/* تذييل البطاقة */}
        <div 
          className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs"
          style={{ transform: 'translateZ(15px)' }}
        >
          <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>حق المعاينة مكفول عند الاستلام</span>
          </div>

          <button
            type="button"
            onClick={onQuickOrder}
            className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>طلب هذا المنتج</span>
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

  const queryStoreName = searchParams?.get('storeName') || searchParams?.get('name') || '';
  const queryPhone = searchParams?.get('phone') || searchParams?.get('p') || '';
  const queryCity = searchParams?.get('city') || searchParams?.get('c') || '';

  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState<string>(IRAQ_GOVERNORATES[0] || 'بغداد');
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  const orderSectionRef = useRef<HTMLDivElement>(null);
  const gallerySectionRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    async function loadData() {
      if (!productId) return;
      try {
        setLoading(true);

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

        // تحديث عنوان التاب في المتصفح باسم المتجر والمنتج حصراً بدون اسم وصلي
        if (typeof document !== 'undefined') {
          const finalStoreName = foundStore?.name || queryStoreName || 'متجر معتمد';
          if (foundProduct?.name) {
            document.title = `${foundProduct.name} - ${finalStoreName}`;
          } else {
            document.title = finalStoreName;
          }
        }
      } catch (err) {
        console.error('خطأ في تحميل تفاصيل العرض:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [productId, storeCode, queryStoreName, queryPhone, queryCity]);

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

  const scrollToGallery = () => {
    if (gallerySectionRef.current) {
      gallerySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
            notes: 'طلب سريع من صفحة العرض',
          }),
        });
      } catch (errOrder) {
        console.warn('تنبيه حفظ الطلب في النظام:', errOrder);
      }

      const storeName = store?.name || 'متجرك الإلكتروني';
      const cleanMerchantPhone = (store?.phone || queryPhone || '').replace(/[^0-9]/g, '');

      const whatsappMessage = 
`مرحباً، أود تأكيد طلبي من متجر (${storeName}):

تفاصيل الطلب:
- المنتج: ${product?.name}
- الكمية: ${quantity}
- السعر: ${currentPrice.toLocaleString('ar-IQ')} د.ع (شامل خصم العرض)
- المجموع الكلي: ${totalPrice.toLocaleString('ar-IQ')} د.ع

معلومات التوصيل:
- الاسم: ${customerName.trim()}
- الهاتف: ${customerPhone.trim()}
- المحافظة: ${customerCity}
- العنوان: ${customerDistrict.trim()}

يرجى تأكيد التجهيز والإرسال، شكراً لكم.`;

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-600 font-bold text-sm">جاري تجهيز صفحة العرض...</span>
        </div>
      </div>
    );
  }

  if (!product || !store) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center" dir="rtl">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-sm border border-slate-200/80 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">عذراً، هذا العرض غير متوفر</h2>
          <p className="text-slate-600 text-xs leading-relaxed">
            قد يكون تم إيقاف العرض أو أن الرابط غير صحيح.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100/70 via-slate-50 to-slate-100/70 text-slate-900 pb-32 relative overflow-x-hidden" dir="rtl">
      
      {/* هالات لونية خفيفة جداً في الخلفية لتعزيز الإحساس بالزجاج الشفاف */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 right-10 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-5 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">

        {/* شريط الإشعار العلوي للخصم */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white py-2 px-4 text-center text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2">
          <Flame className="w-4 h-4 text-amber-300 shrink-0" />
          <span>عرض خاص لفترة محدودة • خصم 20,000 د.ع ينتهي قريباً</span>
        </div>

        {/* هيدر المتجر الزجاجي الأبيض */}
        <header className="bg-white/75 border-b border-white/80 sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {store?.name ? store.name.charAt(0) : 'م'}
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  {store?.name || 'متجر معتمد'}
                </h1>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>دفع نقداً عند الاستلام وبعد الفحص</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white/80 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>توصيل لكافة المحافظات</span>
            </div>
          </div>
        </header>

        {/* المحتوى الرئيسي */}
        <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6 space-y-6">
          
          {/* صندوق العداد التنازلي الزجاجي */}
          <div className="rounded-3xl bg-white/75 backdrop-blur-xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-white/90 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-right space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/80 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>تخفيض مؤقت لـ 10 ساعات فقط</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  ينتهي العرض قريباً، احجز طلبك الآن بالسعر المخفض
                </h2>
              </div>

              {/* عداد الساعات والدقائق والثواني */}
              <div className="flex items-center gap-2 font-mono">
                <div className="flex flex-col items-center bg-slate-900 text-white px-3 py-2 rounded-2xl shadow-sm min-w-[56px]">
                  <span className="text-xl sm:text-2xl font-bold text-amber-400">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-300 font-sans">ساعة</span>
                </div>
                <span className="text-lg font-bold text-slate-400">:</span>
                <div className="flex flex-col items-center bg-slate-900 text-white px-3 py-2 rounded-2xl shadow-sm min-w-[56px]">
                  <span className="text-xl sm:text-2xl font-bold text-amber-400">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-300 font-sans">دقيقة</span>
                </div>
                <span className="text-lg font-bold text-slate-400">:</span>
                <div className="flex flex-col items-center bg-slate-900 text-white px-3 py-2 rounded-2xl shadow-sm min-w-[56px]">
                  <span className="text-xl sm:text-2xl font-bold text-rose-400 animate-pulse">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-300 font-sans">ثانية</span>
                </div>
              </div>
            </div>

            {/* شريط نفاذ الكمية */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span>الكمية المتوفرة في المخزن: متبقي 15 قطعة فقط</span>
              </div>
              <div className="w-full sm:w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-rose-500 h-full w-[85%] rounded-full"></div>
              </div>
            </div>
          </div>

          {/* بطاقة المنتج الزجاجية الرئيسية */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-5 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.05)] border border-white/90 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            
            {/* قسم معرض الصور */}
            <div className="lg:col-span-6 space-y-3">
              <div 
                className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs group cursor-pointer"
                onClick={() => setZoomImage(productImages[activeImageIndex])}
              >
                <img
                  src={productImages[activeImageIndex] || '/placeholder-product.svg'}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                />

                {/* شارة الخصم */}
                <div className="absolute top-3 right-3 bg-rose-600 text-white font-bold text-xs px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  <span>خصم 20,000 د.ع</span>
                </div>

                {/* زر النزول للصور */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToGallery();
                  }}
                  className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/80 shadow-sm flex items-center gap-1.5 hover:bg-white transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>تصفح الصور كاملة ↓</span>
                </button>

                {/* أسهم التنقل */}
                {productImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : productImages.length - 1));
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev < productImages.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* مصغرات الصور */}
              {productImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        activeImageIndex === idx 
                          ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-xs' 
                          : 'border-slate-200/80 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* تفاصيل المنتج والسعر */}
            <div className="lg:col-span-6 space-y-4">
              <div>
                <div className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs mb-2">
                  {product.category || 'عرض خاص'}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                  {product.name}
                </h1>
              </div>

              {/* صندوق السعر المزدوج النظيف */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">السعر السابق:</span>
                  <span className="text-sm font-bold text-slate-400 line-through font-mono">
                    {previousPrice.toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-sm font-bold text-slate-900">سعر العرض الحالي:</span>
                  <div className="text-left">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                      {currentPrice.toLocaleString('ar-IQ')}
                    </span>
                    <span className="text-xs font-bold text-slate-600 mr-1">د.ع</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/80">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>توفيرك اليوم من هذا العرض:</span>
                  </span>
                  <span className="font-mono text-sm font-bold">20,000 د.ع</span>
                </div>
              </div>

              {/* مميزات الشراء */}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/90 border border-slate-200/70">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>توصيل سريع للعنوان</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/90 border border-slate-200/70">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>الدفع عند الاستلام</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/90 border border-slate-200/70">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>معاينة وفحص قبل الدفع</span>
                </div>
              </div>

              {/* زر النزول للطلب */}
              <button
                type="button"
                onClick={scrollToOrderForm}
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>اضغط هنا لتعبئة طلبك واستلام الخصم</span>
              </button>
            </div>
          </div>

          {/* قسم استعراض صور المنتج كاملة بالزجاج الأبيض ثلاثي الأبعاد */}
          <section ref={gallerySectionRef} className="space-y-4 pt-4">
            <div className="text-center space-y-1.5 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/70">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>صور ومعاينة المنتج</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                شاهد صور المنتج من كافة الجوانب
              </h2>
              <p className="text-xs text-slate-500">
                انزل للأسفل لمشاهدة جميع الصور المرفقة للمنتج
              </p>
            </div>

            {/* قائمة بطاقات الصور ثلاثية الأبعاد الزجاجية */}
            <div className="space-y-5">
              {productImages.map((img, idx) => (
                <WhiteGlass3DCard
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
            <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 p-5 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.03)] space-y-2.5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                <span>تفاصيل ومواصفات المنتج</span>
              </h2>
              <div className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* تجارب زبائن بسيطة وواقعية */}
          <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <h3 className="text-sm font-bold text-slate-900">تجارب المشترين</h3>
              </div>
              <span className="text-xs text-slate-500">تقييم 4.9 من 5</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-1">
                <div className="flex items-center justify-between text-slate-800 font-bold">
                  <span>أحمد من بغداد</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">شراء مؤكد</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  وصلني الطلب بسرعة، ونفس الصورة تماماً، والمندوب انتظرني فحصت القطعة.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-1">
                <div className="flex items-center justify-between text-slate-800 font-bold">
                  <span>سجاد من النجف</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">شراء مؤكد</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  التعامل جداً راقي وسعر الخصم ممتاز مقارنة بالسوق. شكراً لكم.
                </p>
              </div>
            </div>
          </div>

          {/* قسم نموذج الطلب الزجاجي الأبيض */}
          <div 
            ref={orderSectionRef}
            id="order-form" 
            className="rounded-3xl bg-white/90 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-blue-200/80 scroll-mt-20 space-y-5"
          >
            <div className="text-center space-y-1.5 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-2xs">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                تأكيد طلبك وتثبيت الخصم
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                املأ معلوماتك وسيقوم المتجر بالتواصل معك مباشرة عبر واتساب لتأكيد الشحن
              </p>
            </div>

            {orderCompleted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-emerald-900">تم استلام طلبك بنجاح!</h3>
                <p className="text-xs text-emerald-700 leading-relaxed max-w-md mx-auto">
                  تم تجهيز نص الرسالة في واتساب. إذا لم تفتح المحادثة تلقائياً، اضغط على الزر التالي:
                </p>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  className="mt-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>فتح محادثة واتساب</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleConfirmOrder} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center">
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
                    <span className="w-8 text-center font-bold font-mono text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* حقل الاسم */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>اسمك الكامل</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: علي حسن عبد الله"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm outline-none transition-all"
                  />
                </div>

                {/* حقل رقم الهاتف */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>رقم هاتفك (واتساب)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="07700000000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm text-right outline-none transition-all"
                  />
                </div>

                {/* حقل المحافظة */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>المحافظة</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm outline-none transition-all"
                  >
                    {IRAQ_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>

                {/* حقل العنوان */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>اسم القضاء أو الحي بالتفصيل</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الكرادة - قرب تقاطع المسبح"
                    value={customerDistrict}
                    onChange={(e) => setCustomerDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 text-sm outline-none transition-all"
                  />
                </div>

                {/* المجموع */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-700">المجموع الكلي:</span>
                  <span className="text-xl font-mono text-emerald-600">
                    {totalPrice.toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>

                {/* زر الإرسال */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>جاري تجهيز الطلب...</span>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5" />
                      <span>تأكيد الطلب عبر واتساب</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </main>

        {/* الشريط السفلي العائم الزجاجي الأبيض */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-xl border-t border-white/90 p-3 sm:p-3.5 shadow-[0_-5px_25px_rgba(0,0,0,0.06)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold line-through font-mono">
                {previousPrice.toLocaleString('ar-IQ')} د.ع
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-2xl font-bold text-emerald-600 font-mono">
                  {currentPrice.toLocaleString('ar-IQ')}
                </span>
                <span className="text-[11px] font-bold text-slate-600">د.ع</span>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToOrderForm}
              className="flex-1 max-w-sm py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>اطلب الآن قبل نفاذ الـ 15 قطعة</span>
            </button>
          </div>
        </div>

        {/* نافذة تكبير الصورة الزجاجية */}
        {zoomImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
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
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl bg-white/10"
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <OfferPageContent />
    </Suspense>
  );
}
