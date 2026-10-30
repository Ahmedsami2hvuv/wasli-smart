'use client';

import React, { useState } from 'react';
import { 
  ShoppingBag, 
  MapPin, 
  Search, 
  Menu, 
  X, 
  ChevronDown, 
  Store, 
  PhoneCall,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  selectedLocation,
  onSelectLocation,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);

  const locations = [
    'بغداد - الكرخ والرصافة',
    'البصرة - عموم المحافظة',
    'أربيل - كردستان',
    'النجف وكربلاء',
    'نينوى والموصل',
    'كافة محافظات العراق',
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-effect border-b border-slate-200/80 transition-all duration-300">
      {/* الشريط الإعلاني الترحيبي المصغر */}
      <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-skybrand-600 text-white text-xs py-1.5 px-4 text-center font-medium shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent-400 shrink-0" />
          <span>أهلاً بكم في منصة وصلي | التجارة الذكية والدروب شيبينغ بدون رأس مال في عموم العراق</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* الشعار والهوية البصرية */}
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-700 via-skybrand-500 to-skybrand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-brand-900 group-hover:text-brand-700 transition-colors">
                  وصلي
                </span>
                <span className="text-[10px] -mt-1 font-semibold text-skybrand-600 tracking-wider">
                  WASLI SMART
                </span>
              </div>
            </a>

            {/* محدد الموقع الجغرافي السريع */}
            <div className="relative hidden md:block mr-2">
              <button
                onClick={() => setLocationMenuOpen(!locationMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium transition-colors border border-slate-200"
              >
                <MapPin className="w-3.5 h-3.5 text-skybrand-600 shrink-0" />
                <span className="truncate max-w-[140px]">{selectedLocation}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {locationMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-56 rounded-2xl p-2 glass-dropdown border border-slate-200 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    اختر منطقة التوصيل
                  </div>
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        onSelectLocation(loc);
                        setLocationMenuOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                        selectedLocation === loc
                          ? 'bg-skybrand-50 text-skybrand-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{loc}</span>
                      {selectedLocation === loc && (
                        <span className="w-1.5 h-1.5 rounded-full bg-skybrand-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* شريط البحث المكتبي */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="ابحث عن متجر، منتج، كليجة، عطور..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-11 pr-11 pl-4 rounded-xl bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 text-sm border border-slate-200/80 focus:border-skybrand-500 focus:ring-4 focus:ring-skybrand-500/15 outline-none transition-all duration-200"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute left-3 top-3 p-0.5 rounded-full hover:bg-slate-200 text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* الإجراءات وروابط التنقل السريعة */}
          <div className="flex items-center gap-2.5">
            {/* زر فتح متجر للتاجر الجديد */}
            <a
              href="/register-store"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-400" />
              <span>أنشئ متجرك مجاناً</span>
            </a>

            {/* زر صفحة التاجر */}
            <a
              href="/merchant"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-brand-800 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-brand-600" />
              <span>صفحة التاجر</span>
            </a>

            {/* زر صفحة المدير */}
            <a
              href="/waahhlstor"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-brand-800 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <span>صفحة المدير</span>
            </a>

            {/* زر فتح السلة */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200/80 transition-all duration-200 active:scale-95 group"
              aria-label="سلة التسوق"
            >
              <ShoppingBag className="w-5 h-5 text-brand-700 group-hover:text-brand-900 transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-5 px-1 rounded-full bg-accent-500 text-slate-900 text-[11px] font-black flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* زر قائمة الجوال */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* شريط البحث في شاشات الجوال */}
        <div className="lg:hidden pb-3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="ابحث عن متجر، منتج، كليجة، عطور..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-10 pr-10 pl-4 rounded-xl bg-slate-100 text-slate-800 placeholder-slate-400 text-sm border border-slate-200 focus:border-skybrand-500 focus:ring-2 focus:ring-skybrand-500/20 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* القائمة المنسدلة للهواتف */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3">
          <div className="p-3 bg-skybrand-50/70 rounded-xl border border-skybrand-100">
            <div className="text-xs font-bold text-skybrand-900 mb-1">منطقة التوصيل الحالية:</div>
            <div className="text-xs text-skybrand-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{selectedLocation}</span>
            </div>
          </div>
          <div className="space-y-1">
            <a
              href="/register-store"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 mb-2"
            >
              أنشئ متجرك وابدأ البيع والأرباح
            </a>
            <a
              href="/merchant"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              صفحة التاجر (لوحة التحكم)
            </a>
            <a
              href="/waahhlstor"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              صفحة المدير (لوحة الأدمن)
            </a>
            <a
              href="#featured-stores"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              المتاجر العراقية المميزة
            </a>
            <a
              href="#categories"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              تصنيفات المتاجر
            </a>
            <a
              href="#stores"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              جميع المتاجر المحلية
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              مميزات وصلي
            </a>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-brand-600" />
              <span>دعم مباشر: متوفر 24 ساعة</span>
            </div>
            <span className="font-bold text-brand-700">تطبيق عراقي أصيل</span>
          </div>
        </div>
      )}
    </header>
  );
};
