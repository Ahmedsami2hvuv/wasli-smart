'use client';

import React from 'react';
import { Zap, ShieldCheck, Wallet, Headphones } from 'lucide-react';
import { FEATURES } from '@/data/mockData';

export const FeaturesSection: React.FC = () => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Zap':
        return <Zap className="w-6 h-6 text-skybrand-600" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6 text-brand-600" />;
      case 'Wallet':
        return <Wallet className="w-6 h-6 text-accent-500" />;
      case 'Headphones':
        return <Headphones className="w-6 h-6 text-emerald-600" />;
      default:
        return <Zap className="w-6 h-6 text-brand-600" />;
    }
  };

  return (
    <section id="features" className="py-14 bg-white border-y border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold text-skybrand-600 uppercase tracking-wider bg-skybrand-50 px-3 py-1 rounded-full border border-skybrand-100">
            لماذا يختار التجار «وصلي»؟
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            كل ما تحتاجه للبيع أونلاين بدون رأس مال
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            من إنشاء المتجر وضبط الأسعار، إلى التخزين والشحن والتحصيل — منصة واحدة تدعم تجارتك في كل العراق.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feat, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 hover:border-skybrand-200 hover:shadow-soft transition-all duration-300 space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                {getIcon(feat.iconName)}
              </div>
              <h3 className="font-bold text-base text-slate-900 group-hover:text-brand-800 transition-colors">
                {feat.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
