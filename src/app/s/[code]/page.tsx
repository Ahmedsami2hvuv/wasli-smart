'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Store as StoreIcon, 
  MapPin, 
  Phone, 
  Share2, 
  Search, 
  ShoppingBag, 
  Sparkles, 
  Check, 
  ArrowRight,
  Plus,
  Clock,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { Store, Product } from '@/types';

export default function PublicStorePage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copied, setCopied] = useState(false);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    async function loadStoreData() {
      if (!code) return;
      try {
        setLoading(true);
        // جلب تفاصيل المتجر
        const storeRes = await fetch(`/api/stores`);
        const storeData = await storeRes.json();
        const found = storeData.stores?.find(
          (s: any) => s.code?.toLowerCase() === code.toLowerCase() || s.slug?.toLowerCase() === code.toLowerCase()
        );

        if (found) {
          setStore(found);
        }

        // جلب المنتجات
        const prodRes = await fetch('/api/products');
        const prodData = await prodRes.json();
        if (prodData.success && prodData.products) {
          setProducts(prodData.products);
        }
      } catch (err) {
        console.error('خطأ في تحميل بيانات المتجر:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStoreData();
  }, [code]);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = store ? `متجر ${store.name} على منصة وصلي` : 'منصة وصلي';
    const text = `تفضل بزيارة متجر ${store?.name || ''} للتسوق وطلب المنتجات بتوصيل سريع!`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        // تم الإلغاء أو غير مدعوم
      }
    }

    // نسخ الرابط كبديل
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: Product; quantity: number }>;
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.priceIqd * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const proceedToCheckout = () => {
    // حفظ السالة وهوية المتجر
    if (typeof window !== 'undefined') {
      localStorage.setItem('wasli_cart', JSON.stringify({
        storeCode: code,
        storeName: store?.name || 'متجر وصلي',
        items: cart.map(i => ({
          productId: i.product.id,
          name: i.product.name,
          priceIqd: i.product.priceIqd,
          image: i.product.image,
          quantity: i.quantity,
        })),
      }));
      router.push(`/checkout?store=${code}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">جاري فتح المتجر وتجهيز المنتجات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* هيدر المتجر العلوي الفاخر */}
      <div className="bg-gradient-to-b from-brand-900 via-brand-800 to-slate-900 text-white pt-6 pb-12 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-6xl mx-auto">
          {/* رابط المنصة وصلي الصغير */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              href="/" 
              className="inline-flex items-center gap-1.5 text-xs text-skybrand-200 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>منصة وصلي الرئيسية</span>
            </Link>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 px-3.5 py-1.5 rounded-full shadow-sm transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-brand-700" />
                  <span>مشاركة المتجر</span>
                </>
              )}
            </button>
          </div>

          {/* بطاقة معلومات المتجر */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-right">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-lg shrink-0 overflow-hidden border-2 border-white/20">
              <img 
                src={store?.image || store?.logoUrl || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=300&q=80'} 
                alt={store?.name || 'متجر وصلي'} 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <span className="bg-skybrand-500/20 text-skybrand-200 text-xs px-2.5 py-0.5 rounded-full font-medium border border-skybrand-400/30">
                  متجر معتمد على وصلي
                </span>
                {store?.isAbiAlkhaseeb && (
                  <span className="bg-accent-500/20 text-accent-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-accent-400/30">
                    أبي الخصيب والبصرة
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black mb-2 text-white">
                {store?.name || 'متجر وصلي المميز'}
              </h1>

              <p className="text-slate-300 text-sm max-w-2xl mb-4 leading-relaxed">
                {store?.description || 'تسوق أحدث المنتجات الأصلية بتوصيل مباشر وسريع لباب منزلك مع ضمان الجودة.'}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-skybrand-400" />
                  <span>{store?.city || 'البصرة - أبي الخصيب'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent-400" />
                  <span>توصيل خلال {store?.deliveryTimeMinutes || '30-45 دقيقة'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>دفع عند الاستلام</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* شريط البحث وتصنيفات المتجر */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* حقل البحث */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث في منتجات المتجر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 bg-slate-50 focus:bg-white transition-all"
            />
          </div>

          {/* عدد المنتجات وزر السلة المصغر */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <span className="text-xs text-slate-500 font-medium">
              يعرض <strong className="text-slate-800">{filteredProducts.length}</strong> منتج
            </span>

            {cartItemsCount > 0 && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-brand-700/20 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>السلة ({cartItemsCount})</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-lg mr-1">{cartTotal.toLocaleString('ar-IQ')} د.ع</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* قائمة المنتجات */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">لا توجد منتجات مطابقة للبحث</h3>
            <p className="text-slate-500 text-sm">جرب البحث بكلمات أخرى أو تصفح باقي الأقسام.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
              >
                {/* صورة المنتج ورابط تفاصيله */}
                <Link 
                  href={`/p/${product.id}?ref=${code}`}
                  className="relative aspect-square overflow-hidden bg-slate-100 block"
                >
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
                    {product.category}
                  </div>
                </Link>

                {/* تفاصيل المنتج */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <Link 
                      href={`/p/${product.id}?ref=${code}`}
                      className="block font-bold text-slate-900 text-sm mb-1.5 hover:text-brand-700 transition-colors line-clamp-1"
                    >
                      {product.name}
                    </Link>
                    <p className="text-slate-500 text-xs line-clamp-2 mb-3">
                      {product.description}
                    </p>
                  </div>

                  <div>
                    {/* السعر */}
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <span className="text-base sm:text-lg font-black text-brand-800">
                          {product.priceIqd.toLocaleString('ar-IQ')}
                        </span>
                        <span className="text-[11px] text-slate-500 mr-1">د.ع</span>
                      </div>
                    </div>

                    {/* أزرار الإجراء */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        className="flex-1 py-2 px-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>أضف للسلة</span>
                      </button>
                      <Link
                        href={`/p/${product.id}?ref=${code}`}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        title="تفاصيل المنتج"
                      >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الشريط العائم السفلي للسلة (شاشة الجوال) */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-white/10">
            <div>
              <div className="text-xs text-slate-400">سلتك الحالية ({cartItemsCount} منتج)</div>
              <div className="text-base font-black text-accent-400">
                {cartTotal.toLocaleString('ar-IQ')} د.ع
              </div>
            </div>

            <button
              onClick={proceedToCheckout}
              className="py-2.5 px-5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>متابعة الطلب</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* درج السلة الجانبي */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsCartOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-brand-700" />
                  <h3 className="font-bold text-slate-900 text-base">سلة مشترياتك من {store?.name}</h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
                >
                  إغلاق
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">سلتك فارغة حالياً</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="py-3 flex items-center gap-3">
                      <img 
                        src={item.product.image} 
                        alt={item.product.name} 
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0" 
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 mb-1">{item.product.name}</h4>
                        <div className="text-xs text-brand-700 font-bold">
                          {item.product.priceIqd.toLocaleString('ar-IQ')} د.ع
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-lg">
                        <button 
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-slate-600 hover:text-red-600"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-slate-900 w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-slate-600 hover:text-brand-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-600">المجموع الفرعي:</span>
                    <span className="text-slate-900">{cartTotal.toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>أجور التوصيل المعتمدة:</span>
                    <span>4,000 د.ع</span>
                  </div>
                  <button
                    onClick={proceedToCheckout}
                    className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    متابعة إلى إتمام الطلب ({cartTotal.toLocaleString('ar-IQ')} د.ع)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
