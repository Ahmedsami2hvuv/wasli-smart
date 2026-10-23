'use client';

import React from 'react';
import { Star, Clock, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Store } from '@/types';
import { formatIqd } from '@/lib/utils';

interface StoreCardProps {
  store: Store;
  onSelect?: (store: Store) => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, onSelect }) => {
  const storeUrl = `/s/${store.code || store.slug || store.id}`;

  return (
    <Link
      href={storeUrl}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer block"
    >
      {/* صورة المتجر */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        <img
          src={store.image}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

        {/* شارة التقييم */}
        <div className="absolute top-2.5 right-2.5">
          <span className="px-2 py-1 rounded-xl bg-white/95 backdrop-blur-md text-slate-800 text-[11px] font-black shadow-sm flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            {store.rating}
          </span>
        </div>

        {/* التصنيف والمنطقة */}
        <div className="absolute bottom-2.5 right-2.5 left-2.5 text-white">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-700/85 backdrop-blur-sm">
            {store.categoryName}
          </span>
          <h3 className="font-bold text-base mt-1 truncate group-hover:text-skybrand-200 transition-colors">
            {store.name}
          </h3>
        </div>
      </div>

      {/* تفاصيل البطاقة */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <p className="text-xs text-slate-500 line-clamp-1">
          {store.tagline}
        </p>

        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="w-3 h-3 text-skybrand-500 shrink-0" />
          <span className="truncate">{store.location}</span>
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-700 font-semibold">
            <Clock className="w-3.5 h-3.5 text-skybrand-600" />
            <span>{store.deliveryTimeMinutes}</span>
          </div>

          <div className="text-slate-500">
            توصيل: <span className="font-bold text-slate-900">{formatIqd(store.deliveryFeeIqd)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
