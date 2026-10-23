import React from 'react';
import { Store, MapPin, Phone, ShieldCheck, Heart, Sparkles, Clock, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          
          {/* العمود الأول: هوية وصلي */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-skybrand-400 flex items-center justify-center text-white shadow-lg">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-2xl font-black text-white tracking-tight">وصلي</span>
                <span className="block text-[10px] font-bold text-skybrand-400 -mt-1 tracking-wider">
                  منصة التسوق والتوصيل العراقية
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              «وصلي» منصة عراقية صُممت لتقريب المسافات وربط الزبائن بأفضل المتاجر المحلية والمطاعم والمنتجات في عموم العراق، لتجربة شراء سهلة وسريعة وموثوقة.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>دفع آمن عند الاستلام</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <Clock className="w-4 h-4 text-skybrand-400 shrink-0" />
                <span>توصيل سريع ومباشر</span>
              </div>
            </div>
          </div>

          {/* العمود الثاني: أقسام التوصيل */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-bold tracking-wide uppercase">أقسام التسوق</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#stores" className="hover:text-skybrand-400 transition-colors flex items-center justify-between">
                  <span>المتاجر الأكثر طلباً</span>
                  <span className="text-[10px] bg-brand-900/80 text-skybrand-300 px-1.5 py-0.5 rounded">مميز</span>
                </a>
              </li>
              <li>
                <a href="#stores" className="hover:text-skybrand-400 transition-colors">مطاعم ومأكولات شرقية</a>
              </li>
              <li>
                <a href="#stores" className="hover:text-skybrand-400 transition-colors">حلويات وكليجة عراقية</a>
              </li>
              <li>
                <a href="#stores" className="hover:text-skybrand-400 transition-colors">سوبرماركت وتموينات</a>
              </li>
              <li>
                <a href="#stores" className="hover:text-skybrand-400 transition-colors">صيدليات ومستلزمات صحية</a>
              </li>
              <li>
                <a href="#stores" className="hover:text-skybrand-400 transition-colors">عطور وبخور عراقي</a>
              </li>
            </ul>
          </div>

          {/* العمود الثالث: مناطق الخدمة */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-bold tracking-wide uppercase">نطاق التغطية</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-skybrand-400 shrink-0" />
                <span>بغداد (الرصافة والكرخ)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>البصرة وعموم أحيائها</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>أربيل وإقليم كردستان</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>النجف الأشرف وكربلاء المقدسة</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>كافة محافظات العراق (18 محافظة)</span>
              </li>
            </ul>
          </div>

          {/* العمود الرابع: انضمام الشركاء والمتاجر */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-bold tracking-wide uppercase">أصحاب المتاجر</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              هل تمتلك متجراً، مطعماً، أو منتجات مميزة في العراق؟ انضم لعائلة «وصلي» وزد مبيعاتك وأرباحك اليوم.
            </p>
            <div className="pt-2">
              <a
                href="/register-store"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-400 hover:text-accent-300 transition-colors group"
              >
                <span>سجل متجرك الآن مجاناً</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          </div>

        </div>

        {/* حقوق النشر والاعتزاز بالهوية */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>صُنع بفخر لأبناء</span>
            <span className="text-slate-300 font-bold">العراق</span>
          </div>

          <p>© {new Date().getFullYear()} منصة وصلي (Wasli). جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
};
