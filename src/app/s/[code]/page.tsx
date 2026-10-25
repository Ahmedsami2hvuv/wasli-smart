'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  Store as StoreIcon, 
  Search, 
  ShoppingBag, 
  Plus, 
  Heart, 
  Home, 
  LayoutGrid, 
  Package, 
  User, 
  X, 
  ChevronDown, 
  ChevronLeft, 
  MapPin, 
  Phone, 
  Clock, 
  Check, 
  ArrowRight, 
  Trash2, 
  Share2,
  Calendar,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { Store, Product } from '@/types';
import { ProtectedImage } from '@/components/store/ProtectedImage';

// مكون الصورة الذكية التدريجية المتوافقة مع كاش المتصفح
function ProgressiveProductImage({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 bg-slate-200/60 animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin opacity-40" />
        </div>
      )}
      <ProtectedImage
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        containerClassName="w-full h-full"
      />
    </div>
  );
}

function StorePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = params?.code as string;
  const queryName = searchParams?.get('name') || searchParams?.get('n') || '';
  const queryOwner = searchParams?.get('owner') || searchParams?.get('o') || '';
  const queryPhone = searchParams?.get('phone') || searchParams?.get('p') || '';
  const queryCity = searchParams?.get('city') || searchParams?.get('c') || '';

  // التبويب النشط في شريط التنقل السفلي
  const [activeTab, setActiveTab] = useState<'home' | 'categories' | 'orders' | 'account'>('home');

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  
  // حالة نافذة الأقسام والأفرع
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // المفضلة
  const [favorites, setFavorites] = useState<string[]>([]);

  // السلة
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // حساب الزبون الافتراضي وطلباته (المأخوذة من آخر طلب)
  const [customerProfile, setCustomerProfile] = useState<{
    customerName: string;
    customerPhone: string;
    governorate: string;
    city: string;
    address: string;
  }>({
    customerName: '',
    customerPhone: '',
    governorate: 'بغداد',
    city: '',
    address: '',
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);

  // 1. تحميل بيانات المتجر والمنتجات
  useEffect(() => {
    async function loadStoreData() {
      if (!code) return;
      try {
        setLoading(true);
        let foundStore: Store | null = null;
        try {
          const storeRes = await fetch(`/api/stores`);
          const storeData = await storeRes.json();
          if (storeData.stores && Array.isArray(storeData.stores)) {
            const found = storeData.stores.find(
              (s: any) => s.code?.toLowerCase() === code.toLowerCase() || s.slug?.toLowerCase() === code.toLowerCase()
            );
            if (found) {
              foundStore = found;
            }
          }
        } catch (e) {
          console.warn('تعذر جلب المتاجر من الخادم:', e);
        }

        if (!foundStore && typeof window !== 'undefined') {
          try {
            const savedCurrent = localStorage.getItem('wasli_current_store');
            if (savedCurrent) {
              const parsed = JSON.parse(savedCurrent);
              if (parsed.code?.toLowerCase() === code.toLowerCase() || parsed.slug?.toLowerCase() === code.toLowerCase()) {
                foundStore = parsed;
              }
            }
          } catch (e) {}

          if (!foundStore) {
            try {
              const registry = localStorage.getItem('wasli_stores_registry');
              if (registry) {
                const parsedRegistry = JSON.parse(registry);
                if (Array.isArray(parsedRegistry)) {
                  const matched = parsedRegistry.find((s: any) => s.code?.toLowerCase() === code.toLowerCase());
                  if (matched) {
                    foundStore = matched;
                  }
                }
              }
            } catch (e) {}
          }
        }

        if (foundStore) {
          let needsSync = false;
          if (queryName && (foundStore.name === 'متجري الإلكتروني' || foundStore.name === 'متجر إلكتروني' || !foundStore.name)) {
            foundStore.name = queryName;
            needsSync = true;
          }
          if (queryOwner && !foundStore.ownerName) {
            foundStore.ownerName = queryOwner;
            needsSync = true;
          }
          if (queryPhone && !foundStore.phone) {
            foundStore.phone = queryPhone;
            needsSync = true;
          }

          if (needsSync) {
            fetch('/api/stores', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: code,
                id: foundStore.id,
                name: foundStore.name,
                ownerName: foundStore.ownerName,
                phone: foundStore.phone,
                city: foundStore.city,
              }),
            }).catch(() => {});
          }
        }

        if (foundStore) {
          setStore(foundStore);
          
          // جلب المنتجات المتاحة بأسعار متجر هذا التاجر
          try {
            const prodRes = await fetch(`/api/stores/products?storeCode=${code}&forCustomer=true`);
            const prodData = await prodRes.json();
            if (prodData.success && prodData.products && prodData.products.length > 0) {
              setProducts(prodData.products);
            } else {
              const fallbackRes = await fetch('/api/products');
              const fallbackData = await fallbackRes.json();
              if (fallbackData.success && fallbackData.products) {
                setProducts(fallbackData.products);
              }
            }
          } catch (pErr) {
            const fallbackRes = await fetch('/api/products');
            const fallbackData = await fallbackRes.json();
            if (fallbackData.success && fallbackData.products) {
              setProducts(fallbackData.products);
            }
          }
        } else {
          setStore(null);
        }
      } catch (err) {
        console.error('خطأ في تحميل المتجر:', err);
        setStore(null);
      } finally {
        setLoading(false);
      }
    }

    loadStoreData();
  }, [code, queryName, queryOwner, queryPhone, queryCity]);

  // 2. استرجاع المفضلة وبيانات الحساب الافتراضي والطلبات من التخزين المحلي
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // المفضلة
      try {
        const savedFavs = localStorage.getItem('wasli_customer_favs');
        if (savedFavs) {
          setFavorites(JSON.parse(savedFavs));
        }
      } catch (e) {}

      // الحساب الافتراضي المأخوذ من آخر طلب
      try {
        const savedProfile = localStorage.getItem('wasli_customer_profile');
        if (savedProfile) {
          const p = JSON.parse(savedProfile);
          setCustomerProfile(prev => ({
            ...prev,
            customerName: p.customerName || '',
            customerPhone: p.customerPhone || '',
            governorate: p.governorate || 'بغداد',
            city: p.city || '',
            address: p.address || '',
          }));
        }
      } catch (e) {}

      // سجل الطلبات
      try {
        const savedOrders = localStorage.getItem('wasli_customer_orders');
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          if (Array.isArray(orders)) {
            // تصفية طلبات هذا المتجر أو جميع طلبات الزبون
            setCustomerOrders(orders);
          }
        }
      } catch (e) {}
    }
  }, []);

  // اسم المتجر الحالي
  const activeStoreName = store?.name || queryName || 'متجر التاجر';
  const storeLogo = store?.image || store?.logoUrl || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=300&q=80';

  // تحديث عنوان المتصفح فوراً ليكون اسم المتجر فقط دون أي كلمة وصلي
  useEffect(() => {
    if (typeof document !== 'undefined' && activeStoreName) {
      document.title = activeStoreName;
    }
  }, [activeStoreName]);

  // 3. استخراج الأقسام والأفرع المتوفرة ديناميكياً
  const categoriesStructure = useMemo(() => {
    const map = new Map<string, Set<string>>();
    products.forEach((p) => {
      const cat = p.category?.trim() || 'عام';
      if (!map.has(cat)) {
        map.set(cat, new Set<string>());
      }
      if (p.subcategory?.trim()) {
        map.get(cat)!.add(p.subcategory.trim());
      }
    });

    return Array.from(map.entries()).map(([name, subSet]) => ({
      name,
      subcategories: Array.from(subSet),
    }));
  }, [products]);

  // حفظ سريع لبيانات المنتج والمتجر في الذاكرة لتفتحه صفحة المنتج في 0.01 ثانية
  const handleProductClick = (product: Product) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`wasli_prod_${product.id}`, JSON.stringify(product));
        if (store) {
          sessionStorage.setItem(`wasli_store_${code}`, JSON.stringify(store));
        }
      } catch (e) {}
    }
  };

  // 4. تبديل المفضلة
  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter(id => id !== productId) : [...prev, productId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('wasli_customer_favs', JSON.stringify(next));
      }
      return next;
    });
  };

  // 5. إدارة السلة
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

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.priceIqd * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const proceedToCheckout = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wasli_cart', JSON.stringify({
        storeCode: code,
        storeName: activeStoreName,
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

  // عدد المنتجات المعروضة لتحميل تدريجي سريع يريح المتصفح
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // إعادة ضبط عدد المعروض عند تغيير البحث أو التصنيف
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, selectedCategory, selectedSubcategory]);

  // حساب المنتجات المفلترة
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = searchQuery.trim() === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSub = selectedSubcategory === 'all' || p.subcategory === selectedSubcategory;

      return matchesSearch && matchesCat && matchesSub;
    });
  }, [products, searchQuery, selectedCategory, selectedSubcategory]);

  // المنتجات المعروضة تدريجياً (الدفعة الأولى ثم التي تليها)
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const hasMoreProducts = visibleCount < filteredProducts.length;

  const loadMoreProducts = () => {
    setVisibleCount(prev => Math.min(prev + 20, filteredProducts.length));
  };

  // المنتجات المفضلة للزبون
  const favoriteProducts = useMemo(() => {
    return products.filter(p => favorites.includes(p.id));
  }, [products, favorites]);

  // حفظ تعديلات الحساب الافتراضي
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('wasli_customer_profile', JSON.stringify(customerProfile));
      setIsEditingProfile(false);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24 select-none">
        {/* هيدر هيكلي ناعم يظهر فوراً */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
          <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 animate-pulse shrink-0" />
                <div className="space-y-1.5">
                  <div className="w-28 h-5 bg-slate-200 animate-pulse rounded-md" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-10 bg-slate-100 rounded-xl flex-1 animate-pulse" />
              <div className="h-10 w-20 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          </div>
        </header>

        {/* بطاقات هيكلية نبضية ناعمة لتجهيز المتجر في أقل من ثانية */}
        <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex justify-between items-center mb-4">
            <div className="w-24 h-5 bg-slate-200 animate-pulse rounded-md" />
            <div className="w-16 h-4 bg-slate-100 animate-pulse rounded-md" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden p-2 space-y-2.5">
                <div className="aspect-square bg-slate-200/70 rounded-xl animate-pulse" />
                <div className="h-4 bg-slate-200/70 rounded-md w-3/4 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded-md w-1/2 animate-pulse" />
                <div className="h-8 bg-slate-200/60 rounded-xl animate-pulse mt-2" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <StoreIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">المتجر غير متاح حالياً</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            عذراً، هذا الرابط غير صالح أو تم إيقاف المتجر وحذفه نهائياً من قبل الإدارة.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
            >
              الذهاب للرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 select-none">
      
      {/* 1. هيدر المتجر العلوي الأنيق والنظيف جداً: صورة المتجر واسم المتجر فقط */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            
            {/* اللوجو واسم المتجر فقط بدون أي نصوص أو شارات مزعجة */}
            <div 
              onClick={() => {
                setActiveTab('home');
                setSelectedCategory('all');
                setSelectedSubcategory('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 p-0.5 shadow-sm border border-slate-200 overflow-hidden shrink-0">
                <img 
                  src={storeLogo} 
                  alt={activeStoreName} 
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>

              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-brand-700 transition-colors">
                  {activeStoreName}
                </h1>
              </div>
            </div>

            {/* زر السلة المصغر عند توفر عناصر */}
            {cartItemsCount > 0 && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2.5 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors flex items-center gap-1.5 font-bold text-xs cursor-pointer"
                title="سلة التسوق"
              >
                <ShoppingBag className="w-5 h-5 text-brand-700" />
                <span className="hidden sm:inline">السلة</span>
                <span className="w-5 h-5 bg-brand-700 text-white rounded-full flex items-center justify-center text-[11px] font-black">
                  {cartItemsCount}
                </span>
              </button>
            )}
          </div>

          {/* حقل البحث وزر الأقسام والأفرع الأنيق */}
          <div className="mt-3 flex items-center gap-2">
            {/* حقل البحث */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن أي منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-8 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:border-brand-600 focus:bg-white bg-slate-50 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* زر الأقسام والأفرع لاختيار القسم بسهولة */}
            <button
              onClick={() => setIsCategoriesModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              <LayoutGrid className="w-4 h-4 text-brand-700" />
              <span className="hidden xs:inline">
                {selectedCategory === 'all' ? 'الأقسام' : selectedCategory}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {/* شارة توضيح الفلتر المختار إن وجد مع زر إلغائه */}
          {(selectedCategory !== 'all' || selectedSubcategory !== 'all') && (
            <div className="mt-2.5 flex items-center gap-2 text-xs">
              <span className="text-slate-500">التصنيف المختار:</span>
              <span className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-800 font-bold px-2.5 py-1 rounded-lg border border-brand-200">
                {selectedCategory !== 'all' ? selectedCategory : ''}
                {selectedSubcategory !== 'all' ? ` / ${selectedSubcategory}` : ''}
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubcategory('all');
                  }}
                  className="text-brand-600 hover:text-red-600 mr-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 2. محتوى الصفحة حسب التبويب النشط */}
      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        
        {/* التبويب 1: الرئيسية (عرض المنتجات) */}
        {activeTab === 'home' && (
          <div>
            {/* عدد النتائج */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                {selectedCategory === 'all' ? 'جميع المنتجات' : selectedCategory}
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {filteredProducts.length} منتج
              </span>
            </div>

            {/* حالة عدم وجود منتجات مطابقة */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs my-6">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد منتجات مطابقة</h3>
                <p className="text-slate-500 text-xs mb-4">جرب البحث بكلمات أخرى أو تغيير القسم المختار.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedSubcategory('all');
                  }}
                  className="px-4 py-2 bg-brand-700 text-white text-xs font-bold rounded-xl hover:bg-brand-800 transition-colors"
                >
                  عرض جميع المنتجات
                </button>
              </div>
            ) : (
              /* شبكة المنتجات بالتحميل التدريجي السريع، كاش المتصفح، وأسعار كبيرة */
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {visibleProducts.map((product, idx) => {
                    const isFav = favorites.includes(product.id);
                    return (
                      <div 
                        key={product.id}
                        className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        {/* صورة المنتج الذكية ذات التحميل التدريجي المتوافقة مع كاش المتصفح */}
                        <Link 
                          href={`/p/${product.id}?ref=${code}`}
                          onClick={() => handleProductClick(product)}
                          className="relative aspect-square overflow-hidden bg-slate-50 block"
                        >
                          <ProgressiveProductImage 
                            src={product.image} 
                            alt={product.name} 
                            priority={idx < 6}
                          />
                          {/* تصنيف المنتج فوق الصورة */}
                          {product.category && (
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs z-10">
                              {product.category}
                            </div>
                          )}
                        </Link>

                        {/* تفاصيل المنتج: اسم المنتج فقط بدون أي جزء من الوصف */}
                        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <Link 
                              href={`/p/${product.id}?ref=${code}`}
                              onClick={() => handleProductClick(product)}
                              className="block font-bold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-brand-700 transition-colors mb-2"
                              title={product.name}
                            >
                              {product.name}
                            </Link>
                          </div>

                          <div>
                            {/* السعر بحجم كبير وبارز جداً */}
                            <div className="flex items-baseline gap-1 mb-2.5">
                              <span className="text-lg sm:text-xl font-black text-brand-700 tracking-tight">
                                {product.priceIqd.toLocaleString('ar-IQ')}
                              </span>
                              <span className="text-xs font-bold text-slate-500">د.ع</span>
                            </div>

                            {/* أزرار الإجراء: أضف للسلة + زر القلب للمفضلة */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => addToCart(product)}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>أضف للسلة</span>
                              </button>
                              
                              {/* زر القلب للمفضلة بدلاً من السهم */}
                              <button
                                onClick={() => toggleFavorite(product.id)}
                                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                  isFav 
                                    ? 'bg-rose-50 border-rose-200 text-rose-500 shadow-2xs' 
                                    : 'border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50/50'
                                }`}
                                title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                              >
                                <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* زر وخيار التحميل التدريجي للمزيد من المنتجات بسلاسة ودون تعليق المتصفح */}
                {hasMoreProducts && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMoreProducts}
                      className="px-6 py-3 bg-white border border-slate-200 hover:border-brand-600 text-slate-800 hover:text-brand-700 text-xs font-bold rounded-2xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>عرض المزيد من المعروضات</span>
                      <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full text-[11px] font-black">
                        +{Math.min(20, filteredProducts.length - visibleCount)} منتج إضافي
                      </span>
                    </button>
                    <p className="text-[11px] text-slate-400 mt-2">
                      تم عرض {visibleCount} من أصل {filteredProducts.length} منتج
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* التبويب 2: الأقسام والأفرع مباشرة في الصفحة */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-brand-700" />
                <span>أقسام وتصنيفات المتجر</span>
              </h2>
              <span className="text-xs text-slate-500">{categoriesStructure.length} أقسام متاحة</span>
            </div>

            {/* زر كل المنتجات */}
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSubcategory('all');
                setActiveTab('home');
              }}
              className={`w-full p-4 rounded-2xl border text-right font-bold text-sm transition-all flex items-center justify-between ${
                selectedCategory === 'all' 
                  ? 'bg-brand-700 text-white border-brand-700 shadow-sm' 
                  : 'bg-white text-slate-900 border-slate-200 hover:border-brand-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  selectedCategory === 'all' ? 'bg-white/20' : 'bg-slate-100 text-brand-700'
                }`}>
                  <Layers className="w-5 h-5" />
                </div>
                <span>جميع المنتجات والمعروضات</span>
              </div>
              <span className="text-xs opacity-80">{products.length} منتج</span>
            </button>

            {/* قائمة الأقسام والأفرع */}
            <div className="space-y-3">
              {categoriesStructure.map((cat) => {
                const isSelected = selectedCategory === cat.name;
                const catProductsCount = products.filter(p => p.category === cat.name).length;
                return (
                  <div key={cat.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <button
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setSelectedSubcategory('all');
                        setActiveTab('home');
                      }}
                      className={`w-full p-4 text-right flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-brand-50 text-brand-900 font-black' : 'text-slate-900 font-bold hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">{cat.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {catProductsCount} منتج
                      </span>
                    </button>

                    {/* الأفرع التابعة لهذا القسم إن وجدت */}
                    {cat.subcategories.length > 0 && (
                      <div className="px-4 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
                        {cat.subcategories.map(sub => {
                          const isSubSelected = isSelected && selectedSubcategory === sub;
                          const subCount = products.filter(p => p.category === cat.name && p.subcategory === sub).length;
                          return (
                            <button
                              key={sub}
                              onClick={() => {
                                setSelectedCategory(cat.name);
                                setSelectedSubcategory(sub);
                                setActiveTab('home');
                              }}
                              className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                                isSubSelected 
                                  ? 'bg-brand-700 text-white border-brand-700 font-bold' 
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-500 font-medium'
                              }`}
                            >
                              {sub} ({subCount})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* التبويب 3: طلباتي (الطلبات السابقة للزبون) */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-700" />
                <span>طلباتي السابقة</span>
              </h2>
              <span className="text-xs text-slate-500">{customerOrders.length} طلب</span>
            </div>

            {customerOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد طلبات سابقة</h3>
                <p className="text-slate-500 text-xs mb-4">عندما تطلب أي منتج من هذا المتجر، ستتمكن من متابعة تفاصيل طلبك هنا.</p>
                <button
                  onClick={() => setActiveTab('home')}
                  className="px-5 py-2.5 bg-brand-700 text-white text-xs font-bold rounded-xl hover:bg-brand-800 transition-colors"
                >
                  تسوق الآن
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {customerOrders.map((ord, idx) => (
                  <div key={ord.orderNumber || idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="text-xs font-bold text-brand-800">
                          رقم الطلب: <span className="font-mono">{ord.orderNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{ord.date ? new Date(ord.date).toLocaleDateString('ar-IQ') : 'مؤخراً'}</span>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        قيد المعالجة والتوصيل
                      </span>
                    </div>

                    {/* المنتجات في الطلب */}
                    <div className="divide-y divide-slate-100">
                      {ord.items?.map((it: any, iIdx: number) => (
                        <div key={iIdx} className="py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {it.image && (
                              <img src={it.image} alt={it.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                            )}
                            <span className="font-medium text-slate-800">{it.name}</span>
                          </div>
                          <span className="font-bold text-slate-700">
                            {it.quantity} × {it.priceIqd?.toLocaleString('ar-IQ')} د.ع
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold">
                      <span className="text-slate-600">المجموع الكلي:</span>
                      <span className="text-sm font-black text-brand-700">
                        {ord.totalAmount?.toLocaleString('ar-IQ')} د.ع
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* التبويب 4: حسابي (الحساب الافتراضي المأخوذ من تفاصيل آخر طلب للزبون) */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-brand-700" />
                <span>حسابي</span>
              </h2>
            </div>

            {profileSaveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>تم حفظ وتحديث بيانات حسابك بنجاح!</span>
              </div>
            )}

            {/* بطاقة معلومات الحساب الافتراضي */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-black text-base border border-brand-100">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {customerProfile.customerName || 'زبون المتجر'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {customerProfile.customerPhone || 'حساب افتراضي مخصص لتسهيل وتتبع طلباتك'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-xs font-bold text-brand-700 hover:text-brand-800 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-100 transition-colors"
                >
                  {isEditingProfile ? 'إلغاء' : 'تعديل البيانات'}
                </button>
              </div>

              {/* وضع التعديل */}
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-3 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
                    <input 
                      type="text" 
                      value={customerProfile.customerName}
                      onChange={(e) => setCustomerProfile(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="اسمك الكامل"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-brand-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                    <input 
                      type="tel" 
                      value={customerProfile.customerPhone}
                      onChange={(e) => setCustomerProfile(prev => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="07xxxxxxxxx"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-brand-600"
                      dir="ltr"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة</label>
                      <input 
                        type="text" 
                        value={customerProfile.governorate}
                        onChange={(e) => setCustomerProfile(prev => ({ ...prev, governorate: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-brand-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة / الحي</label>
                      <input 
                        type="text" 
                        value={customerProfile.city}
                        onChange={(e) => setCustomerProfile(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="مثال: المنصور"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-brand-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">العنوان بالتفصيل</label>
                    <input 
                      type="text" 
                      value={customerProfile.address}
                      onChange={(e) => setCustomerProfile(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="أقرب نقطة دالة، رقم الزقاق والدار"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-brand-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    حفظ التغييرات
                  </button>
                </form>
              ) : (
                /* عرض البيانات الحالية */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-brand-700" />
                    <span>الهاتف: {customerProfile.customerPhone || 'لم يحدد بعد'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-brand-700" />
                    <span>الموقع: {customerProfile.governorate} {customerProfile.city ? ` - ${customerProfile.city}` : ''}</span>
                  </div>
                  {customerProfile.address && (
                    <div className="sm:col-span-2 text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg">
                      العنوان: {customerProfile.address}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* قسم المنتجات المفضلة للزبون */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>المنتجات المفضلة ({favoriteProducts.length})</span>
                </h3>
              </div>

              {favoriteProducts.length === 0 ? (
                <p className="text-slate-500 text-xs py-2 text-center">
                  لم تقم بإضافة أي منتج للمفضلة بعد. انقر على أيقونة القلب على أي منتج لحفظه هنا.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {favoriteProducts.map(p => (
                    <div key={p.id} className="border border-slate-100 rounded-xl p-2 bg-slate-50/50 flex flex-col justify-between">
                      <Link href={`/p/${p.id}?ref=${code}`} className="block">
                        <img src={p.image} alt={p.name} className="w-full aspect-square object-cover rounded-lg mb-1.5" />
                        <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</h4>
                        <div className="text-xs font-black text-brand-700 mt-1">
                          {p.priceIqd.toLocaleString('ar-IQ')} د.ع
                        </div>
                      </Link>
                      <button
                        onClick={() => addToCart(p)}
                        className="mt-2 w-full py-1.5 bg-brand-700 text-white text-[11px] font-bold rounded-lg hover:bg-brand-800 transition-colors"
                      >
                        أضف للسلة
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* 3. نافذة منبثقة لاختيار الأقسام والأفرع بسهولة عند النقر على زر الأقسام العلوي */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsCategoriesModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            {/* رأس النافذة */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-brand-700" />
                <h3 className="font-bold text-slate-900 text-base">الأقسام والتصنيفات</h3>
              </div>
              <button 
                onClick={() => setIsCategoriesModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى الأقسام والأفرع */}
            <div className="p-4 overflow-y-auto space-y-3">
              {/* خيار كل المنتجات */}
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedSubcategory('all');
                  setIsCategoriesModalOpen(false);
                }}
                className={`w-full p-3.5 rounded-xl border text-right font-bold text-sm transition-all flex items-center justify-between ${
                  selectedCategory === 'all' 
                    ? 'bg-brand-700 text-white border-brand-700 shadow-2xs' 
                    : 'bg-white text-slate-900 border-slate-200 hover:border-brand-500'
                }`}
              >
                <span>جميع الأقسام والمنتجات</span>
                <span className="text-xs opacity-80">{products.length} منتج</span>
              </button>

              {/* الأقسام مع أفرعها */}
              {categoriesStructure.map(cat => {
                const isSelected = selectedCategory === cat.name;
                const catCount = products.filter(p => p.category === cat.name).length;
                return (
                  <div key={cat.name} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => {
                        setSelectedCategory(cat.name);
                        setSelectedSubcategory('all');
                        setIsCategoriesModalOpen(false);
                      }}
                      className={`w-full p-3.5 text-right font-bold text-sm flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-brand-50 text-brand-900' : 'bg-white text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {catCount} منتج
                      </span>
                    </button>

                    {/* الأفرع إن وجدت */}
                    {cat.subcategories.length > 0 && (
                      <div className="p-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {cat.subcategories.map(sub => {
                          const isSubSelected = isSelected && selectedSubcategory === sub;
                          return (
                            <button
                              key={sub}
                              onClick={() => {
                                setSelectedCategory(cat.name);
                                setSelectedSubcategory(sub);
                                setIsCategoriesModalOpen(false);
                              }}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                                isSubSelected 
                                  ? 'bg-brand-700 text-white border-brand-700 font-bold' 
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-500'
                              }`}
                            >
                              {sub}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. شريط السلة العائم إذا كانت السلة تحتوي عناصر (فوق شريط التنقل السفلي) */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-30 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-700 flex items-center justify-center font-bold text-xs text-white">
                {cartItemsCount}
              </div>
              <div>
                <div className="text-[11px] text-slate-400">سلتك الحالية</div>
                <div className="text-sm font-black text-amber-400">
                  {cartTotal.toLocaleString('ar-IQ')} د.ع
                </div>
              </div>
            </div>

            <button
              onClick={proceedToCheckout}
              className="py-2 px-4 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>متابعة الطلب</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* 5. شريط التنقل السفلي الفخم (Bottom Navigation Bar): رئيسية - اقسام - طلباتي - حسابي */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg py-1 px-2">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center gap-1">
          
          {/* 1. الرئيسية */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              activeTab === 'home' 
                ? 'text-brand-700 font-black' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Home className={`w-5 h-5 mb-0.5 ${activeTab === 'home' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px]">الرئيسية</span>
          </button>

          {/* 2. الأقسام */}
          <button
            onClick={() => {
              setActiveTab('categories');
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              activeTab === 'categories' 
                ? 'text-brand-700 font-black' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <LayoutGrid className={`w-5 h-5 mb-0.5 ${activeTab === 'categories' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px]">الأقسام</span>
          </button>

          {/* 3. طلباتي */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              activeTab === 'orders' 
                ? 'text-brand-700 font-black' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Package className={`w-5 h-5 mb-0.5 ${activeTab === 'orders' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px]">طلباتي</span>
            {customerOrders.length > 0 && (
              <span className="absolute top-1 right-1/4 w-2 h-2 rounded-full bg-brand-700" />
            )}
          </button>

          {/* 4. حسابي (الحساب الافتراضي) */}
          <button
            onClick={() => setActiveTab('account')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
              activeTab === 'account' 
                ? 'text-brand-700 font-black' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <User className={`w-5 h-5 mb-0.5 ${activeTab === 'account' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px]">حسابي</span>
          </button>
        </div>
      </nav>

      {/* 6. درج السلة الجانبي */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsCartOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-brand-700" />
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    سلة مشترياتك من {activeStoreName}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
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
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" 
                      />
                      <div className="flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1 line-clamp-1">
                          {item.product.name}
                        </h4>
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
                <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-600">المجموع الفرعي:</span>
                    <span className="text-slate-900">{cartTotal.toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>أجور التوصيل المعتمدة:</span>
                    <span>5,000 د.ع</span>
                  </div>
                  <button
                    onClick={proceedToCheckout}
                    className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
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

export default function PublicStorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-700 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">جاري فتح المتجر وتجهيز المنتجات...</p>
        </div>
      </div>
    }>
      <StorePageContent />
    </Suspense>
  );
}
