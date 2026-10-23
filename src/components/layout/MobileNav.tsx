'use client';

import React from 'react';
import { Home, Store, Compass, ShoppingBag, MapPin } from 'lucide-react';

interface MobileNavProps {
  cartCount: number;
  onOpenCart: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  cartCount,
  onOpenCart,
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl pb-safe">
      <div className="grid grid-cols-4 h-16 items-center px-2">
        
        {/* زر الرئيسية */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'home' ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">الرئيسية</span>
        </button>

        {/* قسم أبي الخصيب */}
        <button
          onClick={() => {
            onTabChange('abi-alkhaseeb');
            const el = document.getElementById('abi-alkhaseeb');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
            activeTab === 'abi-alkhaseeb' ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-5 h-5 text-skybrand-600" />
          <span className="text-[10px]">أبي الخصيب</span>
          <span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-accent-500" />
        </button>

        {/* المتاجر */}
        <button
          onClick={() => {
            onTabChange('stores');
            const el = document.getElementById('stores');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'stores' ? 'text-brand-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px]">المتاجر</span>
        </button>

        {/* السلة */}
        <button
          onClick={onOpenCart}
          className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-800 relative"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-brand-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-accent-500 text-slate-900 text-[10px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">السلة</span>
        </button>

      </div>
    </nav>
  );
};
