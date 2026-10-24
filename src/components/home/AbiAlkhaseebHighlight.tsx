'use client';

import React from 'react';
import { 
  Palmtree, 
  MapPin, 
  Clock, 
  Star, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  BadgePercent
} from 'lucide-react';
import { Store, Product } from '@/types';
import { formatIqd } from '@/lib/utils';

interface AbiAlkhaseebHighlightProps {
  stores: Store[];
  onSelectStore: (store: Store) => void;
  onAddToCart: (product: Product) => void;
  featuredProducts: Product[];
}

export const AbiAlkhaseebHighlight: React.FC<AbiAlkhaseebHighlightProps> = ({
  stores,
  onSelectStore,
  onAddToCart,
  featuredProducts,
}) => {
  const featuredStores = stores.filter(s => s.isFeatured || s.isAbiAlkhaseeb || true).slice(0, 6);

  return (
    <section id="featured-stores" className="py-14 bg-gradient-to-b from-skybrand-50/50 via-white to-slate-50 relative overflow-hidden border-b border-slate-200/60">
      
      {/* لمسات خلفية ناعمة */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-skybrand-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* شريط العنوان الترويجي */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100/80 text-brand-800 text-xs font-bold border border-brand-200">
              <Sparkles className="w-3.5 h-3.5 text-brand-700" />
              <span>متاجر معتمدة ومنتجات أصلية في عموم العراق</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              المتاجر العراقية المميزة
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              تسوق من أفضل المتاجر والمطاعم العراقية المختارة بعناية، مع توصيل مباشر وسريع لباب بيتك أينما كنت في محافظات العراق.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm w-fit">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>مندوبون محترفون يغطون كافة المحافظات والأقضية</span>
          </div>
        </div>

        {/* شبكة بطاقات المتاجر */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredStores.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
              onClick={() => onSelectStore(store)}
            >
              {/* صورة الغلاف */}
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img
                  src={store.image}
                  alt={store.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/10" />

                {/* شارات الحالة */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-brand-600/95 backdrop-blur-md text-white text-[11px] font-bold shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    متجر مميز
                  </span>
                </div>

                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-slate-800 text-[11px] font-black shadow-sm flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {store.rating || 4.9}
                    <span className="text-slate-400 font-normal">({store.reviewsCount || 24})</span>
                  </span>
                </div>

                {/* اسم وموقع المتجر داخل الصورة */}
                <div className="absolute bottom-3 right-3 left-3 text-white">
                  <h3 className="font-black text-lg group-hover:text-skybrand-200 transition-colors">
                    {store.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-200 mt-0.5">
                    <MapPin className="w-3 h-3 text-skybrand-400 shrink-0" />
                    <span className="truncate">{store.location || 'العراق'}</span>
                  </div>
                </div>
              </div>

              {/* تفاصيل المتجر والخدمة */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {store.tagline || store.description}
                </p>

                {/* الوسوم السريعة */}
                <div className="flex flex-wrap gap-1.5">
                  {(store.tags || ['معتمد', 'توصيل سريع']).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* معلومات التوصيل والحد الأدنى */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-skybrand-600" />
                    <span>{store.deliveryTimeMinutes || '30-45 دقيقة'}</span>
                  </div>

                  <div className="text-slate-500">
                    توصيل: <span className="font-bold text-slate-900">{formatIqd(store.deliveryFeeIqd || 5000)}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStore(store);
                    }}
                    className="p-1.5 rounded-lg bg-skybrand-50 hover:bg-skybrand-100 text-skybrand-700 font-bold text-xs flex items-center gap-1 transition-colors"
                  >
                    <span>عرض المنتجات</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
