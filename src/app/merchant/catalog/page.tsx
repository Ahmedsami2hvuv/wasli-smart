'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Check, 
  Share2, 
  ArrowRight, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2,
  ExternalLink,
  Store as StoreIcon
} from 'lucide-react';
import Link from 'next/link';
import { Product, Store } from '@/types';

function MerchantCatalogContent() {
  const searchParams = useSearchParams();
  const storeCode = searchParams.get('storeCode') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sellingPrices, setSellingPrices] = useState<Record<string, number>>({});
  const [addedStatus, setAddedStatus] = useState<Record<string, boolean>>({});
  const [sharedStatus, setSharedStatus] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // جلب المنتجات
        const prodRes = await fetch('/api/products');
        const prodData = await prodRes.json();
        if (prodData.success && prodData.products) {
          setProducts(prodData.products);

          // ضبط أسعار البيع الافتراضية الموصى بها (مثلاً +25% عن السعر الأساسي)
          const initialPrices: Record<string, number> = {};
          prodData.products.forEach((p: Product) => {
            const base = p.platformPriceIqd || p.priceIqd;
            const suggested = Math.round((base * 1.25) / 1000) * 1000;
            const min = p.minPriceIqd || base;
            const max = p.maxPriceIqd || (base * 1.6);
            initialPrices[p.id] = Math.min(max, Math.max(min, suggested));
          });
          setSellingPrices(initialPrices);
        }

        // جلب المتجر
        const storeRes = await fetch('/api/stores');
        const storeData = await storeRes.json();
        let current = null;
        if (storeCode && storeData.stores) {
          current = storeData.stores.find((s: any) => s.code?.toLowerCase() === storeCode.toLowerCase());
        }
        if (!current && storeData.stores?.length > 0) {
          current = storeData.stores[0];
        }
        setStore(current);
      } catch (err) {
        console.error('خطأ في تحميل الكتالوج:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [storeCode]);

  const handlePriceChange = (productId: string, val: number) => {
    setSellingPrices(prev => ({
      ...prev,
      [productId]: val,
    }));
  };

  const handleAddToMyStore = (product: Product) => {
    const selectedPrice = sellingPrices[product.id] || product.platformPriceIqd || product.priceIqd;
    const min = product.minPriceIqd || product.platformPriceIqd || product.priceIqd;
    const max = product.maxPriceIqd || (product.platformPriceIqd || product.priceIqd) * 2;

    if (selectedPrice < min) {
      setActionMessage({
        text: `السعر لا يمكن أن يقل عن الحد الأدنى: ${min.toLocaleString('ar-IQ')} د.ع`,
        type: 'error',
      });
      return;
    }

    if (selectedPrice > max) {
      setActionMessage({
        text: `السعر لا يمكن أن يتجاوز الحد الأعلى: ${max.toLocaleString('ar-IQ')} د.ع`,
        type: 'error',
      });
      return;
    }

    // إضافة المنتج بنجاح
    setAddedStatus(prev => ({ ...prev, [product.id]: true }));
    setActionMessage({
      text: `تمت إضافة منتج "${product.name}" بنجاح إلى متجرك بسعر ${selectedPrice.toLocaleString('ar-IQ')} د.ع!`,
      type: 'success',
    });

    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  const handleShareProduct = async (product: Product) => {
    const code = store?.code || 'store';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/p/${product.id}?ref=${code}`;
    const price = sellingPrices[product.id] || product.priceIqd;
    const title = `${product.name} | متجر ${store?.name || ''}`;
    const text = `منتج ${product.name} الأصلي متوفر الآن بسعر ${price.toLocaleString('ar-IQ')} د.ع مع توصيل سريع!`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (e) {}
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setSharedStatus(prev => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setSharedStatus(prev => ({ ...prev, [product.id]: false }));
      }, 2500);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* الترويسة وأزرار الرجوع */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href={`/merchant?storeCode=${store?.code}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة إلى لوحة المتجر</span>
          </Link>

          {store && (
            <div className="text-xs bg-brand-50 text-brand-800 px-3 py-1.5 rounded-xl border border-brand-200/60 font-medium flex items-center gap-1.5">
              <StoreIcon className="w-3.5 h-3.5 text-brand-700" />
              <span>أنت تضيف إلى متجر: <strong>{store.name}</strong> ({store.code})</span>
            </div>
          )}
        </div>

        {/* العنوان والبحث */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 mb-1">
                كتالوج منتجات منصة وصلي
              </h1>
              <p className="text-slate-600 text-xs">
                اختر المنتجات التي ترغب بتسويقها، حدد سعر البيع ضمن الحدود المسموحة، وشاهد ربحك المتوقع فورياً!
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو التصنيف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 outline-none focus:border-brand-600"
              />
            </div>
          </div>

          {/* تنبيه الرسائل */}
          {actionMessage && (
            <div className={`p-4 rounded-xl text-xs font-bold transition-all mb-6 ${
              actionMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {actionMessage.text}
            </div>
          )}

          {/* شبكة المنتجات في الكتالوج */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">جاري تحميل المنتجات المتاحة...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              لم يتم العثور على أي منتجات مطابقة لبحثك.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const basePrice = product.platformPriceIqd || product.priceIqd;
                const minPrice = product.minPriceIqd || basePrice;
                const maxPrice = product.maxPriceIqd || Math.round(basePrice * 1.6);
                const currentPrice = sellingPrices[product.id] || basePrice;
                const expectedProfit = Math.max(0, currentPrice - basePrice);
                const isAdded = addedStatus[product.id];
                const isShared = sharedStatus[product.id];

                return (
                  <div
                    key={product.id}
                    className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 flex flex-col justify-between hover:border-brand-300 transition-all shadow-xs"
                  >
                    <div>
                      {/* صورة ومعلومات عليا */}
                      <div className="flex gap-3 mb-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="flex-1">
                          <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-semibold inline-block mb-1">
                            {product.category}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                            {product.name}
                          </h3>
                          <div className="text-xs text-slate-500 mt-1">
                            سعر المنصة الأساسي: <strong className="text-slate-700">{basePrice.toLocaleString('ar-IQ')} د.ع</strong>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            الحد المسموح: {minPrice.toLocaleString('ar-IQ')} إلى {maxPrice.toLocaleString('ar-IQ')} د.ع
                          </div>
                        </div>
                      </div>

                      {/* مدخل تحديد السعر التفاعلي */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 mb-3 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                          <span>سعر البيع في متجرك:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="500"
                              min={minPrice}
                              max={maxPrice}
                              value={currentPrice}
                              onChange={(e) => handlePriceChange(product.id, Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-slate-300 rounded text-center text-xs font-bold text-brand-800 outline-none focus:border-brand-600"
                            />
                            <span className="text-[11px] text-slate-500">د.ع</span>
                          </div>
                        </div>

                        {/* بطاقة الربح المتوقع المحسوب فورياً */}
                        <div className="flex justify-between items-center bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 text-xs">
                          <span className="text-emerald-800 font-bold flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ربحك الصافي المتوقع:</span>
                          </span>
                          <span className="font-black text-emerald-700">
                            +{expectedProfit.toLocaleString('ar-IQ')} د.ع
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* أزرار الإضافة والمشاركة */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleAddToMyStore(product)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isAdded 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-brand-700 hover:bg-brand-800 text-white shadow-xs'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>مضاف إلى متجرك</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة لمتجري</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleShareProduct(product)}
                        className="py-2 px-3 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="مشاركة رابط المنتج برقم متجرك"
                      >
                        {isShared ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-brand-700" />}
                        <span>{isShared ? 'تم النسخ' : 'مشاركة'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function MerchantCatalogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center font-bold text-slate-500">جاري تحميل كتالوج المنتجات...</div>
      </div>
    }>
      <MerchantCatalogContent />
    </Suspense>
  );
}
