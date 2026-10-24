'use client';

import React from 'react';
import { 
  Palmtree, 
  Utensils, 
  ShoppingBasket, 
  Cake, 
  Coffee, 
  HeartPulse, 
  Sparkles,
  Layers
} from 'lucide-react';
import { CATEGORIES } from '@/data/mockData';
import { CategoryId } from '@/types';

interface CategorySliderProps {
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
}

export const CategorySlider: React.FC<CategorySliderProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Palmtree':
        return <Palmtree className="w-5 h-5 text-emerald-600" />;
      case 'Utensils':
        return <Utensils className="w-5 h-5 text-amber-600" />;
      case 'ShoppingBasket':
        return <ShoppingBasket className="w-5 h-5 text-skybrand-600" />;
      case 'Cake':
        return <Cake className="w-5 h-5 text-rose-500" />;
      case 'Coffee':
        return <Coffee className="w-5 h-5 text-amber-700" />;
      case 'HeartPulse':
        return <HeartPulse className="w-5 h-5 text-red-600" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      default:
        return <Layers className="w-5 h-5 text-brand-600" />;
    }
  };

  return (
    <section id="categories" className="py-8 bg-white border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* رأس القسم */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">تصنيفات المتاجر والطلبات</h2>
            <p className="text-xs text-slate-500 mt-1">اختر القسم الذي ترغب بالطلب منه للوصول السريع للمتاجر</p>
          </div>

          {selectedCategory && (
            <button
              onClick={() => onSelectCategory(null)}
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              عرض الكل
            </button>
          )}
        </div>

        {/* أزرار وبطاقات التصنيفات */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          
          {/* زر جميع التصنيفات */}
          <button
            onClick={() => onSelectCategory(null)}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all duration-200 group text-center ${
              selectedCategory === null
                ? 'bg-brand-700 text-white border-brand-700 shadow-md shadow-brand-700/20'
                : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${
              selectedCategory === null ? 'bg-white/20 text-white' : 'bg-white text-brand-700 shadow-sm'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">جميع الأقسام</span>
          </button>

          {/* قائمة التصنيفات */}
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const isSpecial = cat.id === 'iraq-special';

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(isSelected ? null : cat.id)}
                className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all duration-200 group text-center ${
                  isSelected
                    ? 'bg-brand-700 text-white border-brand-700 shadow-md shadow-brand-700/20'
                    : isSpecial
                    ? 'bg-emerald-50/60 hover:bg-emerald-50 text-slate-900 border-emerald-200 hover:border-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* شارة التميز */}
                {isSpecial && !isSelected && (
                  <span className="absolute -top-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black">
                    مميز
                  </span>
                )}

                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : isSpecial 
                    ? 'bg-emerald-100 shadow-sm' 
                    : 'bg-white shadow-sm'
                }`}>
                  {getIcon(cat.iconName)}
                </div>
                <span className="text-xs font-bold truncate max-w-full">{cat.name}</span>
              </button>
            );
          })}

        </div>

      </div>
    </section>
  );
};
