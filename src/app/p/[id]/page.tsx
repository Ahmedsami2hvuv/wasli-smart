'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Share2, 
  ShoppingBag, 
  Check, 
  ShieldCheck, 
  Truck, 
  Clock, 
  Sparkles,
  Store as StoreIcon,
  Plus,
  Minus
} from 'lucide-react';
import Link from 'next/link';
import { Product, Store } from '@/types';

function ProductDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const productId = params?.id as string;
  const storeRef = searchParams.get('ref') || '';

  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!productId) return;
      try {
        setLoading(true);
        // جلب المنتج
        const prodRes = await fetch('/api/products');
        const prodData = await prodRes.json();
        const foundProd = prodData.products?.find((p: any) => p.id === productId || p.slug === productId);
        if (foundProd) {
          setProduct(foundProd);
        }

        // إذا كان هناك متجر محيل، نجلب بياناته
        if (storeRef) {
          const storeRes = await fetch('/api/stores');
          const storeData = await storeRes.json();
          const foundStore = storeData.stores?.find(
            (s: any) => s.code?.toLowerCase() === storeRef.toLowerCase() || s.slug?.toLowerCase() === storeRef.toLowerCase()
          );
          if (foundStore) {
            setStore(foundStore);
          }
        }
      } catch (err) {
        console.error('خطأ في جلب تفاصيل المنتج:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [productId, storeRef]);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const storeText = store ? `عبر متجر ${store.name}` : 'عبر منصة وصلي';
    const title = `${product?.name || 'منتج'} | ${storeText}`;
    const text = `شاهد ${product?.name} بسعر ${product?.priceIqd.toLocaleString('ar-IQ')} د.ع ${storeText} مع خدمة توصيل سريع!`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        // تم الإلغاء
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOrderNow = () => {
    if (!product) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem('wasli_cart', JSON.stringify({
        storeCode: storeRef || 'platform',
        storeName: store?.name || 'منصة وصلي',
        items: [{
          productId: product.id,
          name: product.name,
          priceIqd: product.priceIqd,
          image: product.image,
          quantity: quantity,
        }],
      }));
      router.push(`/checkout?store=${storeRef || 'platform'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">جاري تحميل تفاصيل المنتج...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md">
          <h2 className="text-xl font-bold text-slate-800 mb-2">المنتج غير موجود</h2>
          <p className="text-slate-600 text-sm mb-6">قد يكون هذا المنتج قد تم إيقافه أو تغير رابطه.</p>
          <Link href="/" className="px-5 py-2.5 bg-brand-700 text-white rounded-xl text-sm font-bold">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* شريط التنقل العلوي والرجوع */}
        <div className="flex items-center justify-between mb-6">
          {store ? (
            <Link 
              href={`/s/${store.code}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لمتجر {store.name}</span>
            </Link>
          ) : (
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرئيسية</span>
            </Link>
          )}

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>تم نسخ الرابط!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-brand-700" />
                <span>مشاركة المنتج</span>
              </>
            )}
          </button>
        </div>

        {/* بطاقة تفاصيل المنتج الرئيسية */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8">
          {/* صورة المنتج */}
          <div className="flex flex-col gap-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-xs">
                {product.category}
              </div>
            </div>
          </div>

          {/* معلومات المنتج والطلب */}
          <div className="flex flex-col justify-between">
            <div>
              {/* شارة المتجر المحيل */}
              {store && (
                <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200/60 text-brand-800 text-xs px-3 py-1.5 rounded-xl font-semibold mb-4">
                  <StoreIcon className="w-3.5 h-3.5 text-brand-700" />
                  <span>معروض برعاية: <strong>{store.name}</strong></span>
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 leading-snug">
                {product.name}
              </h1>

              {/* السعر */}
              <div className="flex items-baseline gap-2 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-3xl font-black text-brand-800">
                  {product.priceIqd.toLocaleString('ar-IQ')}
                </span>
                <span className="text-sm font-bold text-slate-500">دينار عراقي</span>
                <span className="mr-auto text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                  متوفر للتوصيل الفوري
                </span>
              </div>

              {/* الوصف */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">الوصف والمميزات:</h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* مميزات سريعة */}
              <div className="grid grid-cols-2 gap-3 mb-6 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-700 shrink-0" />
                  <span>توصيل لكافة مناطق البصرة والعراق</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>دفع نقدي عند الاستلام</span>
                </div>
              </div>
            </div>

            {/* أدوات الكمية والطلب */}
            <div className="border-t border-slate-200/80 pt-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-bold text-slate-700">الكمية:</span>
                <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-slate-900 text-sm">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-500 mr-auto">
                  الإجمالي: <strong className="text-slate-900 font-bold">{(product.priceIqd * quantity).toLocaleString('ar-IQ')} د.ع</strong>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleOrderNow}
                  className="flex-1 py-4 px-6 bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-brand-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 text-accent-400" />
                  <span>اطلب الآن ودفع عند الاستلام</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center font-bold text-slate-500">جاري تحميل تفاصيل المنتج...</div>
      </div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}
