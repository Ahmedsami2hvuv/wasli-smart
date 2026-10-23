'use client';

import React from 'react';
import { 
  X, 
  Star, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Palmtree, 
  Store as StoreIcon,
  ShoppingBag
} from 'lucide-react';
import { Store, Product } from '@/types';
import { ProductCard } from '@/components/home/ProductCard';
import { formatIqd } from '@/lib/utils';

interface StoreModalProps {
  store: Store | null;
  onClose: () => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
  cartProductIds: string[];
}

export const StoreModal: React.FC<StoreModalProps> = ({
  store,
  onClose,
  products,
  onAddToCart,
  cartProductIds,
}) => {
  if (!store) return null;

  const storeProducts = products.filter(p => p.storeId === store.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* خلفية معتمة */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-200">
          
          {/* زر الإغلاق */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* صورة الغلاف ورأس المتجر */}
          <div className="relative h-60 sm:h-72 w-full bg-slate-100">
            <img
              src={store.image}
              alt={store.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

            <div className="absolute bottom-6 right-6 left-6 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-skybrand-500/90 text-white text-xs font-bold">
                  {store.categoryName}
                </span>
                {store.isAbiAlkhaseeb && (
                  <span className="px-3 py-1 rounded-full bg-emerald-600/95 text-white text-xs font-bold flex items-center gap-1">
                    <Palmtree className="w-3.5 h-3.5" />
                    متجر في أبي الخصيب
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black">{store.name}</h2>
              <p className="text-xs sm:text-sm text-slate-200 max-w-xl">{store.tagline}</p>
            </div>
          </div>

          {/* شريط الإحصائيات والمعلومات */}
          <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{store.rating} ({store.reviewsCount} تقييم)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-4 h-4 text-skybrand-600" />
                <span>التوصيل: {store.deliveryTimeMinutes}</span>
              </div>
              <div className="text-slate-600">
                أجرة التوصيل: <span className="font-bold text-slate-900">{formatIqd(store.deliveryFeeIqd)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-600">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>{store.location}</span>
            </div>
          </div>

          {/* قائمة منتجات هذا المتجر */}
          <div className="p-4 sm:p-6 max-h-[50vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900">قائمة منتجات المتجر</h3>
              <span className="text-xs text-slate-500">{storeProducts.length} متوفر حالياً</span>
            </div>

            {storeProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">يتم تحديث قائمة المنتجات لهذا المتجر حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {storeProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    isInCart={cartProductIds.includes(product.id)}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
