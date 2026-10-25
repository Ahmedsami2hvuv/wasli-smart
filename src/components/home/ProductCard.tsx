'use client';

import React from 'react';
import { Plus, Check, ShoppingBag, Store } from 'lucide-react';
import Link from 'next/link';
import { Product } from '@/types';
import { formatIqd } from '@/lib/utils';
import { ProtectedImage } from '@/components/store/ProtectedImage';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isInCart?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isInCart = false,
}) => {
  const hasDiscount = product.originalPriceIqd && product.originalPriceIqd > product.priceIqd;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      
      {/* صورة المنتج */}
      <Link href={`/p/${product.id}`} className="relative aspect-square overflow-hidden bg-slate-50 block">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* شارة الخصم أو التميز */}
        {hasDiscount && (
          <div className="absolute top-2.5 right-2.5">
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-sm">
              عرض خاص
            </span>
          </div>
        )}

        {/* وسم المتجر التابع له */}
        <div className="absolute bottom-2 right-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-medium truncate max-w-full">
            <Store className="w-2.5 h-2.5 text-skybrand-300 shrink-0" />
            <span className="truncate">{product.storeName}</span>
          </span>
        </div>
      </Link>

      {/* تفاصيل المنتج */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <Link href={`/p/${product.id}`} className="font-bold text-sm text-slate-900 group-hover:text-brand-700 transition-colors line-clamp-1 block">
            {product.name}
          </Link>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* السعر وزر الإضافة */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-black text-brand-900">
              {formatIqd(product.priceIqd)}
            </div>
            {hasDiscount && (
              <div className="text-[11px] text-slate-400 line-through">
                {formatIqd(product.originalPriceIqd!)}
              </div>
            )}
          </div>

          <button
            onClick={() => onAddToCart(product)}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 shadow-sm ${
              isInCart
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-brand-50 hover:bg-brand-700 hover:text-white text-brand-800 border border-brand-200/80 hover:border-transparent'
            }`}
          >
            {isInCart ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>أُضيف</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>أضف للسلة</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
