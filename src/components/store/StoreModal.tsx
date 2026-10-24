'use client';

import React from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  Truck, 
  Star, 
  Phone, 
  ShoppingBag, 
  Plus, 
  Sparkles,
  Info 
} from 'lucide-react';
import { Store, Product } from '@/types';
import { formatIqd } from '@/lib/utils';

interface StoreModalProps {
  store: Store | null;
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({
  store,
  isOpen,
  onClose,
  products,
  onAddToCart,
}) => {
  if (!isOpen || !store) return null;

  const storeProducts = products.filter(p => p.storeId === store.id || p.storeCode === store.code);

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
                <span className="px-3 py-1 rounded-full bg-emerald-600/95 text-white text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  متجر عراقي معتمد
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black">{store.name}</h2>
              <p className="text-xs sm:text-sm text-slate-200 max-w-xl">{store.tagline || store.description}</p>
            </div>
          </div>

          {/* شريط الإحصائيات والمعلومات */}
          <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{store.rating || 4.9} ({store.reviewsCount || 20} تقييم)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-4 h-4 text-skybrand-600" />
                <span>التوصيل: {store.deliveryTimeMinutes || '30-45 دقيقة'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Truck className="w-4 h-4 text-brand-600" />
                <span>أجور التوصيل: {formatIqd(store.deliveryFeeIqd || 5000)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{store.location || 'العراق'}</span>
            </div>
          </div>

          {/* قائمة منتجات هذا المتجر */}
          <div className="p-4 sm:p-8 max-h-[55vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900">منتجات المتجر المتوفرة</h3>
              <span className="text-xs text-slate-500 font-medium">{storeProducts.length} منتج</span>
            </div>

            {storeProducts.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">جاري تحديث قائمة منتجات هذا المتجر حالياً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {storeProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-brand-300 transition-all bg-white flex flex-col justify-between space-y-3 group"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{product.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{product.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-black text-sm text-brand-700">
                        {formatIqd(product.priceIqd)}
                      </span>

                      <button
                        onClick={() => onAddToCart(product)}
                        className="p-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white transition-colors flex items-center gap-1 text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
