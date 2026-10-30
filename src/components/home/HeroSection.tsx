'use client';

import React from 'react';
import { 
  Sparkles, 
  MapPin, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  Truck, 
  Search, 
  Store,
  ChevronRight
} from 'lucide-react';

interface HeroSectionProps {
  onSearchFocus: () => void;
  selectedLocation: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearchFocus,
  selectedLocation,
}) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-12 lg:pb-24">
      {/* خلفية بتدرجات هندسية وإشعاع لوني هادئ */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
      
      {/* دوائر ضوئية ديكورية */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-skybrand-200/40 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 -left-20 w-96 h-96 rounded-full bg-brand-100/50 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* الجانب الأيمن: العناوين والمحتوى الرئيسي */}
          <div className="lg:col-span-7 space-y-6 text-right">
            
            {/* وسم ترحيبي مميز */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-skybrand-50 border border-skybrand-200 text-skybrand-800 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-skybrand-500 animate-ping" />
              <span>منصة التجارة الذكية والدروب شيبينغ في عموم العراق</span>
            </div>

            {/* العنوان الرئيسي العريض */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.25] sm:leading-[1.2]">
              أنشئ متجرك وابدأ البيع <br className="hidden sm:inline" />
              بدون رأس مال و<span className="text-transparent bg-clip-text bg-gradient-to-l from-brand-700 via-skybrand-600 to-skybrand-500">اترك الشحن علينا</span>
            </h1>

            {/* الوصف التوضيحي البسيط */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
              وصلي تمكّنك من امتلاك متجر إلكتروني خاص باسمك، تبيع فيه المنتجات بأسعارك، بينما نتولى نحن التخزين والتغليف والتوصيل والتحصيل في كافة محافظات العراق.
            </p>

            {/* شريط الإجراءات والبحث الفوري */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
              <a
                href="/register-store"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-700 via-brand-800 to-skybrand-700 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-brand-700/25 hover:shadow-xl transition-all duration-200 active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-accent-400" />
                <span>أنشئ متجرك مجاناً وابدأ جني الأرباح</span>
                <ArrowLeft className="w-4 h-4" />
              </a>

              <a
                href="/#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all duration-200"
              >
                <span>كيف تعمل المنصة؟</span>
              </a>
            </div>

            {/* مؤشرات الثقة والسرعة */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-200/80 max-w-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Clock className="w-4 h-4 text-skybrand-600 shrink-0" />
                  <span>25 - 40 دقيقة</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">متوسط مدة التوصيل</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>دفع عند الاستلام</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">أمان وثقة تامة</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Truck className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>تتبع مباشر</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">مندوب مخصص لكل طلب</div>
              </div>
            </div>

          </div>

          {/* الجانب الأيسر: بطاقة العرض التفاعلية الفخمة */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md">
              
              {/* بطاقة الواجهة الرئيسية المزينة */}
              <div className="relative rounded-3xl bg-white p-6 shadow-2xl shadow-skybrand-500/10 border border-slate-100 overflow-hidden">
                
                {/* رأس البطاقة */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-skybrand-50 flex items-center justify-center text-skybrand-700 font-black text-sm">
                      وصل
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">حالة التوصيل السريع</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-skybrand-500" />
                        <span>{selectedLocation}</span>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    الخدمة متاحة الآن
                  </span>
                </div>

                {/* صورة ترويجية للمتاجر والمنتجات */}
                <div className="mt-4 relative rounded-2xl overflow-hidden aspect-[16/10] group">
                  <img
                    src="https://images.unsplash.com/photo-1596797882870-8c33deeac224?w=600&auto=format&fit=crop&q=80"
                    alt="منتجات وتسوق عراقي فاخر"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-4">
                    <span className="px-2 py-0.5 rounded-md bg-accent-500 text-slate-950 text-[10px] font-black w-fit mb-1">
                      منتج اليوم الحصري
                    </span>
                    <h3 className="text-white font-bold text-base">تمر برحي وخيرات العراق الفاخرة</h3>
                    <p className="text-slate-200 text-xs mt-0.5">طازج ومختار من أجود خيرات العراق</p>
                  </div>
                </div>

                {/* بطاقة عائمة للمندوب والسرعة */}
                <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">مندوبو وصلي جاهزون في كل العراق</div>
                      <div className="text-[11px] text-slate-500">توصيل سريع ومباشر لباب بيتك</div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-brand-700 bg-brand-100/60 px-2.5 py-1 rounded-lg">
                    15 - 30 د
                  </span>
                </div>

              </div>

              {/* بطاقة بارزة سفلية تطفو جزئياً لإعطاء عمق بصري راقٍ */}
              <div className="absolute -bottom-6 -right-4 sm:-right-6 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-xl border border-slate-100/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center font-black">
                  4.9
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">تقييم ممتاز في عموم المحافظات</div>
                  <div className="text-[10px] text-slate-500">أكثر من 1,200 زبون سعيد هذا الشهر</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
