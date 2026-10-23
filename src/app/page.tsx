'use client';

import React, { useState, useMemo } from 'react';
import { 
  Store as StoreIcon, 
  Sparkles, 
  Search, 
  MapPin, 
  SlidersHorizontal,
  Flame,
  ArrowLeft
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { HeroSection } from '@/components/home/HeroSection';
import { CategorySlider } from '@/components/home/CategorySlider';
import { AbiAlkhaseebHighlight } from '@/components/home/AbiAlkhaseebHighlight';
import { StoreCard } from '@/components/home/StoreCard';
import { ProductCard } from '@/components/home/ProductCard';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { CartDrawer } from '@/components/store/CartDrawer';
import { StoreModal } from '@/components/store/StoreModal';

import { STORES, PRODUCTS } from '@/data/mockData';
import { Store, Product, CartItem } from '@/types';

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState('أبي الخصيب - باب سليمان');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  
  const [cartItems, setCartItems] = useState<CartItem[]>([
    // عنصر أولي توضيحي في السلة
    { product: PRODUCTS[0], quantity: 1 }
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // إضافة منتج للسلة
  const handleAddToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // تعديل كمية المنتج
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  // حذف منتج من السلة
  const handleRemoveItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  // تفريغ السلة
  const handleClearCart = () => {
    setCartItems([]);
  };

  // تصفية المتاجر بحسب البحث والتصنيف
  const filteredStores = useMemo(() => {
    return STORES.filter(store => {
      const matchesSearch = 
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.tagline || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.district || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory 
        ? store.categoryId === selectedCategory 
        : true;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // تصفية المنتجات بحسب البحث
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(prod => {
      const matchesSearch = 
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.storeName || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [searchQuery]);

  const cartProductIds = useMemo(() => cartItems.map(i => i.product.id), [cartItems]);
  const cartTotalCount = useMemo(() => cartItems.reduce((acc, item) => acc + item.quantity, 0), [cartItems]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-16 sm:pb-0">
      
      {/* شريط التنقل الرئيسي */}
      <Navbar
        cartCount={cartTotalCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
      />

      <main className="flex-1">
        
        {/* الواجهة الرئيسية والبانر الترحيبي */}
        <HeroSection
          onSearchFocus={() => {
            const input = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (input) input.focus();
          }}
          selectedLocation={selectedLocation}
        />

        {/* شريط تصنيفات المتاجر */}
        <CategorySlider
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* قسم أبي الخصيب الحصري والمميز */}
        <AbiAlkhaseebHighlight
          stores={STORES}
          onSelectStore={setSelectedStore}
          onAddToCart={handleAddToCart}
          featuredProducts={PRODUCTS.filter(p => (p.storeId || '').includes('alkhaseeb') || (p.storeId || '').includes('khoz') || (p.storeId || '').includes('basra'))}
        />

        {/* قسم جميع المتاجر المحلية */}
        <section id="stores" className="py-14 bg-white border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  جميع المتاجر المتاحة في البصرة وأبي الخصيب
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  اختر متجرك المفضل واستعرض قائمة الأطعمة والمشتريات الطازجة
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {filteredStores.length} متجر متاح
                </span>
              </div>
            </div>

            {filteredStores.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 rounded-3xl border border-slate-200">
                <StoreIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">لم نجد متاجر تطابق بحثك</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً مثل «مطاعم ومأكولات» أو «متاجر أبي الخصيب».
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition-colors"
                >
                  إعادة ضبط البحث
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredStores.map(store => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    onSelect={setSelectedStore}
                  />
                ))}
              </div>
            )}

          </div>
        </section>

        {/* قسم المنتجات المميزة والأكثر طلباً */}
        <section id="products" className="py-14 bg-slate-50 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 text-xs font-black text-amber-600 mb-1">
                  <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>الأكثر طلباً هذا الأسبوع</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  منتجات مختارة تصلك فوراً
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  isInCart={cartProductIds.includes(product.id)}
                />
              ))}
            </div>

          </div>
        </section>

        {/* قسم مميزات منصة وصلي */}
        <FeaturesSection />

      </main>

      {/* تذييل الصفحة */}
      <Footer />

      {/* شريط الملاحة السفلي الخاص بالهواتف */}
      <MobileNav
        cartCount={cartTotalCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* سلة المشتريات المنزلقة */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        selectedLocation={selectedLocation}
      />

      {/* نافذة تفاصيل المتجر وقائمة منتجاته */}
      <StoreModal
        store={selectedStore}
        onClose={() => setSelectedStore(null)}
        products={PRODUCTS}
        onAddToCart={handleAddToCart}
        cartProductIds={cartProductIds}
      />

    </div>
  );
}
