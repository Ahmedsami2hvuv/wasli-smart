'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  MapPin, 
  Clock, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  Share2, 
  Plus, 
  Minus, 
  Sparkles, 
  Tag, 
  Copy, 
  Store as StoreIcon 
} from 'lucide-react';
import Link from 'next/link';
import { Product, Store } from '@/types';
import { ProtectedImage } from '@/components/store/ProtectedImage';

function ProductDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const productId = params?.id as string;
  const storeRef = searchParams.get('ref');

  // استرجاع المنتج المحفوظ فوراً من الذاكرة اللحظية إن وجد لفتحه في 0 ثانية
  const [product, setProduct] = useState<Product | null>(() => {
    if (typeof window !== 'undefined' && productId) {
      try {
        const cached = sessionStorage.getItem(`wasli_prod_${productId}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

  const [store, setStore] = useState<Store | null>(() => {
    if (typeof window !== 'undefined' && storeRef) {
      try {
        const cachedStore = sessionStorage.getItem(`wasli_store_${storeRef}`);
        if (cachedStore) return JSON.parse(cachedStore);
        const currentStore = localStorage.getItem('wasli_current_store');
        if (currentStore) {
          const parsed = JSON.parse(currentStore);
          if (parsed.code?.toLowerCase() === storeRef.toLowerCase()) return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  // إذا كان المنتج موجوداً مسبقاً في الذاكرة فلا داعي لشاشة التحميل
  const [loading, setLoading] = useState(() => !Boolean(product));
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeImage, setActiveImage] = useState<string>(() => product?.image || '');
  const [selectedColor, setSelectedColor] = useState<any>(() => product?.colors?.[0] || null);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);

  // استخراج رمز المنتج النظيف والبارز
  const productCode = useMemo(() => {
    if (!product) return '';
    return product.supplierCode || product.supplierSku || (product.id ? (product.id.startsWith('prd-') ? product.id.toUpperCase() : `PRD-${product.id.slice(0, 6).toUpperCase()}`) : '');
  }, [product]);

  const handleCopyCode = () => {
    if (productCode && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(productCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!productId) return;
      try {
        // إذا كان المنتج غير موجود بالذاكرة نظهر حالة التحميل
        if (!product) {
          setLoading(true);
        }

        // جلب المنتج والمتجر بالتوازي (Parallel Requests) لسرعة خيالية
        const productFetch = fetch(`/api/products/${productId}`)
          .then(async res => res.ok ? res.json() : null)
          .catch(() => null);

        const storeFetch = (storeRef && !store) 
          ? fetch(`/api/stores`).then(async res => res.ok ? res.json() : null).catch(() => null)
          : Promise.resolve(null);

        const [prodResult, storeResult] = await Promise.all([productFetch, storeFetch]);

        let foundProduct = prodResult?.success && prodResult?.product ? prodResult.product : null;

        // في حال كان رابط slug أو احتياط
        if (!foundProduct && !product) {
          try {
            const fallbackRes = await fetch('/api/products');
            const fallbackData = await fallbackRes.json();
            if (fallbackData.success && fallbackData.products) {
              foundProduct = fallbackData.products.find((p: any) => p.id === productId || p.slug === productId) || null;
            }
          } catch (e) {}
        }

        if (foundProduct) {
          // ضبط سعر البيع المعروض للزبون بدقة ليتطابق مع أرباح التاجر وسعر البيع المقترح
          const minP = Number(foundProduct.minPriceIqd) || (foundProduct.wholesalePriceIqd ? foundProduct.wholesalePriceIqd + 5000 : 0);
          const maxP = Number(foundProduct.maxPriceIqd) || (minP ? minP + 15000 : 0);
          let finalPrice = Number(foundProduct.priceIqd) || Number(foundProduct.platformPriceIqd) || minP;

          if (storeRef) {
            // إذا كان الزبون يتصفح عبر متجر تاجر: يحسب السعر الافتراضي لبيع الزبون بما يضمن ربح التاجر كاملاً
            const suggestedStorePrice = foundProduct.wholesalePriceIqd ? (foundProduct.wholesalePriceIqd + 10000) : minP;
            finalPrice = Math.min(maxP, Math.max(minP, suggestedStorePrice));
          } else {
            finalPrice = Math.max(minP, finalPrice);
          }

          foundProduct.priceIqd = finalPrice;
          setProduct(foundProduct);

          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(`wasli_prod_${productId}`, JSON.stringify(foundProduct));
            } catch (e) {}
          }

          if (!activeImage) setActiveImage(foundProduct.image || '');
          if (foundProduct.colors && foundProduct.colors.length > 0 && !selectedColor) {
            setSelectedColor(foundProduct.colors[0]);
          }
        }

        if (storeResult?.stores && Array.isArray(storeResult.stores) && storeRef) {
          const matchedStore = storeResult.stores.find(
            (s: any) => s.code?.toLowerCase() === storeRef.toLowerCase() || s.slug?.toLowerCase() === storeRef.toLowerCase()
          );
          if (matchedStore) {
            setStore(matchedStore);
          }
        }
      } catch (err) {
        console.error('خطأ في استرجاع تفاصيل المنتج:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [productId, storeRef]);

  // تحديث عنوان الصفحة في المتصفح ليكون محايداً ولا يذكر كلمة وصلي نهائياً
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (product) {
        document.title = store?.name ? `${product.name} - ${store.name}` : product.name;
      }
    }
  }, [product, store]);

  // قائمة جميع صور المنتج للمعرض
  const allImages = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    if (product.image) list.push(product.image);
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        const url = typeof img === 'string' ? img : ((img as any).localUrl || (img as any).url);
        if (url && !list.includes(url)) list.push(url);
      }
    }
    // إضافة صور الألوان إن وجدت
    if (product.colors && Array.isArray(product.colors)) {
      for (const c of product.colors) {
        if (c.image && !list.includes(c.image)) {
          list.push(c.image);
        }
      }
    }
    return list;
  }, [product]);

  const handleShare = async () => {
    if (!product) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const storeText = store ? `عبر متجر ${store.name}` : '';
    const title = `${product.name} ${storeText}`;
    const text = `اطلب ${product.name} بسعر ${product.priceIqd.toLocaleString('ar-IQ')} د.ع مع توصيل سريع ودفع عند الاستلام.`;

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
        storeCode: storeRef || 'direct',
        storeName: store?.name || 'المتجر الإلكتروني',
        items: [{
          productId: product.id,
          name: product.name,
          priceIqd: product.priceIqd,
          image: activeImage || product.image,
          selectedColor: selectedColor?.name || '',
          quantity: quantity,
        }],
      }));
      router.push(`/checkout?store=${storeRef || 'direct'}`);
    }
  };

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="w-32 h-9 bg-slate-200 animate-pulse rounded-xl" />
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-slate-200/70 rounded-2xl animate-pulse" />
            <div className="space-y-4">
              <div className="w-28 h-6 bg-slate-200 rounded-lg animate-pulse" />
              <div className="w-full h-8 bg-slate-200 rounded-lg animate-pulse" />
              <div className="w-48 h-12 bg-slate-100 rounded-2xl animate-pulse" />
              <div className="w-full h-24 bg-slate-100 rounded-2xl animate-pulse" />
              <div className="w-full h-12 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
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
          {store ? (
            <Link href={`/s/${store.code}`} className="px-5 py-2.5 bg-brand-700 text-white rounded-xl text-sm font-bold">
              العودة لمتجر {store.name}
            </Link>
          ) : (
            <Link href="/" className="px-5 py-2.5 bg-brand-700 text-white rounded-xl text-sm font-bold">
              العودة للصفحة الرئيسية
            </Link>
          )}
        </div>
      </div>
    );
  }

  // فلترة المواصفات لضمان عدم ظهور النص الترويجي الموجه للتجار
  const displaySpecs = (() => {
    if (product.specifications) {
      if (Array.isArray(product.specifications)) return product.specifications.join('\n');
      return String(product.specifications);
    }
    if (product.description) {
      // إزالة أي إشارة للنص الترويجي إذا كان مدمجاً
      const desc = String(product.description);
      if (desc.includes('الوصف الترويجي:')) {
        return desc.split('الوصف الترويجي:')[0].trim();
      }
      return desc;
    }
    return 'منتج أصلي عالي الجودة متوفر للشحن المباشر مع حق المعاينة والفحص عند الاستلام.';
  })();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* شريط التنقل العلوي والرجوع لمتجر التاجر */}
        <div className="flex items-center justify-between mb-6">
          {store ? (
            <Link 
              href={`/s/${store.code}`}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-brand-700 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لمتجر {store.name}</span>
            </Link>
          ) : (
            <button 
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-brand-700 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع للمتجر</span>
            </button>
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
          {/* معرض صور المنتج: تحميل فوري للصورة الأولى وتحميل تدريجي لباقي الصور */}
          <div className="flex flex-col gap-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative group shadow-xs">
              {/* هيكل التحميل الناعم للصورة الرئيسية */}
              {!mainImageLoaded && (
                <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-brand-200 border-t-brand-700 rounded-full animate-spin" />
                </div>
              )}
              <ProtectedImage 
                src={activeImage || product.image} 
                alt={product.name} 
                onLoad={() => setMainImageLoaded(true)}
                className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
                  mainImageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                containerClassName="w-full h-full"
              />
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-xs">
                {product.category}
              </div>
            </div>

            {/* شريط مصغرات الصور لعرض كافة صور المنتج بتحميل تدريجي كسول في الخلفية */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1">
                {allImages.map((imgUrl, idx) => {
                  const isCurrent = (activeImage || product.image) === imgUrl;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMainImageLoaded(false);
                        setActiveImage(imgUrl);
                      }}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border transition-all cursor-pointer bg-slate-100 ${
                        isCurrent 
                          ? 'border-brand-700 ring-2 ring-brand-700 ring-offset-2 scale-105 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={imgUrl} 
                        alt={`صورة ${idx + 1}`} 
                        loading="lazy" 
                        decoding="async"
                        className="w-full h-full object-cover" 
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* معلومات المنتج والطلب */}
          <div className="flex flex-col justify-between">
            <div>
              {/* شارات المتجر ورمز المنتج البارز */}
              <div className="flex flex-wrap items-center gap-2 mb-3.5">
                {store && (
                  <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold">
                    <StoreIcon className="w-3.5 h-3.5 text-brand-700" />
                    <span>متجر: <strong>{store.name}</strong></span>
                  </div>
                )}

                {/* رمز المنتج الواضح والأنيق مع إمكانية النسخ */}
                {productCode && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200/90 text-sky-900 text-xs px-3 py-1.5 rounded-xl font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="انقر لنسخ رمز المنتج"
                  >
                    <Tag className="w-3.5 h-3.5 text-sky-600" />
                    <span>رمز المنتج:</span>
                    <span className="font-mono text-sky-700 font-black tracking-wide" dir="ltr">
                      {productCode}
                    </span>
                    {copiedCode ? (
                      <Check className="w-3 h-3 text-emerald-600 mr-0.5" />
                    ) : (
                      <Copy className="w-3 h-3 text-sky-500 opacity-60 mr-0.5" />
                    )}
                  </button>
                )}
              </div>

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

              {/* اختيار الألوان والخيارات التفاعلي */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold text-slate-700">اختر اللون أو الموديل:</h3>
                    {selectedColor && (
                      <span className="text-xs font-black text-brand-700">
                        المحدد: {selectedColor.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((c, idx) => {
                      const isSelected = selectedColor?.name === c.name || (!selectedColor && idx === 0);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedColor(c);
                            if (c.image) {
                              setActiveImage(c.image);
                            }
                          }}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-brand-700 bg-brand-50 text-brand-900 shadow-xs ring-1 ring-brand-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {c.image ? (
                            <img src={c.image} alt={c.name} className="w-5 h-5 rounded-md object-cover border border-slate-200" />
                          ) : (
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0"
                              style={{ backgroundColor: (c as any).code || '#94a3b8' }}
                            />
                          )}
                          <span>{c.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-700 shrink-0 mr-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* تفاصيل ومواصفات المنتج للزبون (المواصفات الفنية الحقيقية) */}
              <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span>المواصفات الفنية وتفاصيل المنتج:</span>
                  </h3>
                  {productCode && (
                    <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      رمز المنتج: {productCode}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line space-y-1.5">
                  {displaySpecs}
                </div>
              </div>

              {/* مميزات سريعة */}
              <div className="grid grid-cols-2 gap-3 mb-6 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-700 shrink-0" />
                  <span>توصيل سريع لكافة المحافظات</span>
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
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-slate-900 text-sm">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
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
