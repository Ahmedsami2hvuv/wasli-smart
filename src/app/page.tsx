'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Store, 
  Sparkles, 
  TrendingUp, 
  Package, 
  Truck, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  DollarSign, 
  Users, 
  ShoppingBag, 
  Share2, 
  SlidersHorizontal, 
  Clock, 
  ChevronDown, 
  PhoneCall,
  Coins,
  BadgePercent,
  Layers,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export default function HomePage() {
  // حالة حاسبة الأرباح التفاعلية
  const [wholesaleCost, setWholesaleCost] = useState(13000);
  const [sellingPrice, setSellingPrice] = useState(22000);
  const [monthlyOrders, setMonthlyOrders] = useState(50);
  
  // حالة الأسئلة الشائعة
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // حساب الأرباح
  const unitProfit = Math.max(0, sellingPrice - wholesaleCost);
  const totalMonthlyProfit = unitProfit * monthlyOrders;

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'هل أحتاج إلى رأس مال أو دفع مبالغ مسبقة للبدء؟',
      a: 'كلا نهائياً، التسجيل وإنشاء متجرك في منصة وصلي مجاني 100%. لا تحتاج لشراء أي بضاعة مقدماً ولا تدفع أي رسوم اشتراك، وتبدأ تجارتك من الصفر برأس مال 0 دينار.'
    },
    {
      q: 'كيف يظهر المتجر للزبائن عند مشاركة الرابط؟',
      a: 'عندما ترسل رابط متجرك لزبائنك أو تضعه في بايو حساباتك على مواقع التواصل، يفتح المتجر باسم متجرك الخاص وهويتك ورقم هاتفك، ويشاهد الزبون أسعار البيع التي حددتها أنت فقط دون ظهور أسعار الجملة ولا اسم وصلي .'
    },
    {
      q: 'من يتولى تخزين المنتجات وتوصيل الطلبات للزبائن؟',
      a: 'نحن في منصة وصلي نتولى إدارة المستودعات وتخزين المنتجات وفحص جودتها وتغليفها، ثم نقوم بشحنها وتوصيلها مباشرة لباب بيت الزبون عبر مناديبنا المتخصصين في كل العراق.'
    },
    {
      q: 'كيف ومتى أستلم أرباحي الصافية؟',
      a: 'بمجرد استلام الزبون للطلب وتسديد المبلغ للمندوب، يتم تسجيل ربحك الصافي فوراً في محفظة متجرك الإلكترونية، ويمكنك سحب أرباحك عبر الماستر كارت أو عبر محفظة زين كاش بكل سهولة.'
    },
    {
      q: 'هل يمكنني تعديل أسعار البيع للمنتجات في متجري؟',
      a: 'نعم بالتأكيد! كل منتج ننشره في المنصة نحدد له نطاقاً عادلاً لسعر البيع (حد أدنى وأعلى)، ولك كامل الحرية في ضبط سعر البيع الذي يناسب جمهورك وزبائنك لكسب الربح الذي تريده.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white" dir="rtl">
      
      {/* 1. الشريط العلوي الإعلاني */}
      <div className="bg-brand-900 text-sky-200 text-xs py-2.5 px-4 text-center font-bold tracking-wide border-b border-brand-800 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>فرصة عمل حر وتجارة حقيقية في البصرة وعموم العراق: أنشئ متجرك مجاناً وابدأ بربح دخل يومي مستمر</span>
      </div>

      {/* 2. شريط التنقل الرئيسي (Navbar) */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* الشعار */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-700 to-skybrand-500 flex items-center justify-center text-white shadow-md shadow-brand-700/20 group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>وصلي</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold border border-brand-200">سمارت</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 -mt-0.5">منصة التجارة الذكية للمسوقين</p>
            </div>
          </Link>

          {/* روابط سريعة للشاشات الكبيرة */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#how-it-works" className="hover:text-brand-700 transition-colors">كيف تعمل المنصة؟</a>
            <a href="#profit-calculator" className="hover:text-brand-700 transition-colors">حاسبة الأرباح</a>
            <a href="#features" className="hover:text-brand-700 transition-colors">المميزات</a>
            <a href="#faq" className="hover:text-brand-700 transition-colors">الأسئلة الشائعة</a>
          </nav>

          {/* أزرار الإجراء */}
          <div className="flex items-center gap-3">
            <Link
              href="/merchant"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              <span>دخول التاجر</span>
            </Link>

            <Link
              href="/register-store"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-700 to-brand-800 hover:from-brand-800 hover:to-brand-900 text-white text-xs sm:text-sm font-black shadow-md shadow-brand-700/25 transition-all hover:scale-[1.02]"
            >
              <span>أنشئ متجرك مجاناً</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </header>

      {/* 3. الواجهة الرئيسية البطلة (Hero Section) */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 bg-gradient-to-b from-white via-skybrand-50/30 to-slate-50">
        
        {/* لمسات خلفية جمالية */}
        <div className="absolute top-10 right-1/2 translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-brand-200/40 via-skybrand-200/40 to-emerald-200/30 blur-3xl rounded-full -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* وسم ترويجي علوي */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs text-xs font-black text-brand-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>فرصة تجارة حقيقية بدون مخاطرة لأبناء البصرة وكافة المحافظات</span>
            </div>

            {/* العنوان العريض الرئيسي */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.25]">
              امتلك متجرك الإلكتروني اليوم <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 via-skybrand-600 to-brand-800">
                بدون رأس مال وبدون شراء بضاعة
              </span>
              <br />
              <span className="text-2xl sm:text-4xl text-slate-800 font-black mt-2 block">
                بدون تخزين وبدون توصيل !
              </span>
            </h1>

            {/* شارة مجاناً البارزة */}
            <div className="pt-2 flex justify-center">
              <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/25 to-amber-500/15 border-2 border-amber-400 text-amber-700 shadow-md">
                <Sparkles className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="text-xl sm:text-3xl font-black tracking-widest text-amber-700">
                  مجااااااااااااااااااااااناً
                </span>
                <Sparkles className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </div>

            {/* النص التوضيحي */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              نوفر لك المنتجات الأصلية بسعر الجملة، ونخزنها، ونوصلها لباب زبونك في عموم العراق. دورك فقط هو إنشاء متجرك باسمك وتحديد أسعارك ونشر متجرك ومنتجاتك واستلام أرباحك الصافية!
            </p>

            {/* أزرار التحرك السريع */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/register-store"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-black text-base shadow-lg shadow-brand-700/30 transition-all hover:-translate-y-0.5"
              >
                <span>ابدأ وأنشئ متجرك مجاناً</span>
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm border border-slate-200 shadow-xs transition-colors"
              >
                <span>كيف يعمل النظام؟</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </a>
            </div>

            {/* أشرطة الثقة والمميزات السريعة */}
            <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto text-right">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="text-xl sm:text-2xl font-black text-brand-700 mb-0.5">0 د.ع</div>
                <div className="text-xs font-bold text-slate-600">رأس مال مطلوب</div>
                <div className="text-[10px] text-slate-400 mt-0.5">تبدأ مجاناً تماماً</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="text-xl sm:text-2xl font-black text-brand-700 mb-0.5">100%</div>
                <div className="text-xs font-bold text-slate-600">تحكم بأسعارك</div>
                <div className="text-[10px] text-slate-400 mt-0.5">أنت تضبط ربحك</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="text-xl sm:text-2xl font-black text-emerald-600 mb-0.5">توصيل لزبائنك</div>
                <div className="text-xs font-bold text-slate-600">نحن نتولى الشحن</div>
                <div className="text-[10px] text-slate-400 mt-0.5">بدون عناء منك</div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="text-xl sm:text-2xl font-black text-amber-600 mb-0.5">أرباح فورية</div>
                <div className="text-xs font-bold text-slate-600">ماستر كارت أو زين كاش</div>
                <div className="text-[10px] text-slate-400 mt-0.5">مع كل طلب ناجح</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. كيف تعمل المنصة خطوة بخطوة (How It Works) */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-black border border-brand-100">
              <Layers className="w-3.5 h-3.5" />
              <span>بساطة وسرعة في العمل</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              كيف تبدأ تجارتك مع «وصلي» في 4 خطوات؟
            </h2>
            <p className="text-sm text-slate-500">
              صممنا النظام لكي تبدأ البيع والربح في نفس اليوم وبأبسط تجربة استخدام ممكنة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* الخطوة 1 */}
            <div className="relative p-6 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-brand-700 text-white font-black text-lg flex items-center justify-center mb-5 shadow-md shadow-brand-700/20">
                1
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">أنشئ متجرك مجاناً</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ادخل اسمك واسم متجرك ورقم هاتفك، وخلال دقيقة واحدة سيكون لديك متجر إلكتروني متكامل بكل منتجاته برابط مخصص وباسمك الخاص.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-bold text-brand-700 flex items-center gap-1">
                <span>رابط خاص بك تماماً</span>
              </div>
            </div>

            {/* الخطوة 2 */}
            <div className="relative p-6 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-skybrand-600 text-white font-black text-lg flex items-center justify-center mb-5 shadow-md shadow-skybrand-600/20">
                2
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">المنتجات جاهزة في كتالوجك</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                إدارة المنصة تنشر المنتجات في أقسام مرتبة وبأسعار الجملة. ستجد المنتجات متوفرة تلقائياً في كتالوج متجرك بدون أي عناء.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-bold text-skybrand-700 flex items-center gap-1">
                <span>بدون شراء أو تخزين مسبق</span>
              </div>
            </div>

            {/* الخطوة 3 */}
            <div className="relative p-6 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-lg flex items-center justify-center mb-5 shadow-md shadow-amber-500/20">
                3
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">حدد سعر البيع وربحك</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                لكل منتج سعر شراء من المنصة ونطاق لسعر البيع. اختر السعر الذي تريده لزبائنك، والفارق بين السعرين هو ربحك الصافي بالكامل!
              </p>
              <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-bold text-amber-700 flex items-center gap-1">
                <span>أنت صاحب القرار بالتسعير</span>
              </div>
            </div>

            {/* الخطوة 4 */}
            <div className="relative p-6 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center mb-5 shadow-md shadow-emerald-600/20">
                4
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">انشر متجرك واستلم أرباحك</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                شارك رابط متجرك على تيك توك، انستغرام، أو واتساب. الزبون يطلب، ونحن نجهز ونوصل الطلب لبابه، وأرباحك تتحول لمحفظتك فوراً عند استلام الطلب من قبل الزبون .
              </p>
              <div className="mt-4 pt-4 border-t border-slate-200/60 text-xs font-bold text-emerald-700 flex items-center gap-1">
                <span>توصيل سريع ودفع عند الاستلام</span>
              </div>
            </div>

          </div>

          {/* مثال عملي حي ومباشر يشرح الفكرة بالأرقام */}
          <div className="mt-14 max-w-4xl mx-auto bg-gradient-to-tr from-brand-900 via-brand-800 to-skybrand-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-black border border-white/15">
                <BadgePercent className="w-4 h-4" />
                <span>مثال عملي توضيحي بالأرقام الحقيقية</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                كيف تربح من بيع قطعة واحدة مع منصة وصلي؟
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                
                <div className="p-4 rounded-2xl bg-white/10 border border-white/15">
                  <span className="text-xs text-sky-200 block mb-1">1. سعر الجملة من المنصة</span>
                  <span className="text-2xl font-black text-white">13,000 د.ع</span>
                  <p className="text-[11px] text-slate-300 mt-1">سعر المنتج الثابت الذي توفره لك إدارة وصلي</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 border border-white/15">
                  <span className="text-xs text-sky-200 block mb-1">2. سعر بيعك للزبون (تحدده أنت)</span>
                  <span className="text-2xl font-black text-amber-300">22,000 د.ع</span>
                  <p className="text-[11px] text-slate-300 mt-1">تختار بيعه ضمن النطاق المقترح (19 إلى 25 ألف)</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40">
                  <span className="text-xs text-emerald-300 font-bold block mb-1">3. ربحك الصافي في جيبك</span>
                  <span className="text-2xl font-black text-emerald-400">+9,000 د.ع</span>
                  <p className="text-[11px] text-emerald-200 mt-1">ربح صافٍ لك من قطعة واحدة بدون أن تدفع فلساً مسبقاً</p>
                </div>

              </div>

              <div className="pt-2 text-xs sm:text-sm text-sky-100/90 leading-relaxed border-t border-white/10 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تخيل أن تبيع 10 قطع فقط في اليوم: ربحك الصافي سيكون 90,000 د.ع يومياً بدون رأس مال وبدون مستودع!</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 5. حاسبة الأرباح التفاعلية (Profit Calculator) */}
      <section id="profit-calculator" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">
              <Coins className="w-3.5 h-3.5" />
              <span>جرب حساب أرباحك بنفسك</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              حاسبة الدخل والأرباح التفاعلية
            </h2>
            <p className="text-sm text-slate-500">
              حرك الأشرطة وجرب تغيير سعر البيع وعدد الطلبات الشهرية لترى أرباحك المتوقعة فوراً.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* مدخلات الحاسبة */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* ضبط سعر البيع */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                    <span className="text-slate-700">سعر البيع الذي تختاره للمنتج:</span>
                    <span className="text-brand-700 font-black text-base">{sellingPrice.toLocaleString('ar-IQ')} د.ع</span>
                  </div>
                  <input
                    type="range"
                    min={15000}
                    max={30000}
                    step={1000}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-700"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                    <span>الحد الأدنى: 15,000 د.ع</span>
                    <span>سعر الجملة: {wholesaleCost.toLocaleString('ar-IQ')} د.ع</span>
                    <span>الحد الأعلى: 30,000 د.ع</span>
                  </div>
                </div>

                {/* ضبط عدد المبيعات شهرياً */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                    <span className="text-slate-700">عدد الطلبات المتوقعة شهرياً:</span>
                    <span className="text-brand-700 font-black text-base">{monthlyOrders} طلب</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={300}
                    step={5}
                    value={monthlyOrders}
                    onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-700"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                    <span>10 طلبات</span>
                    <span>100 طلب</span>
                    <span>300 طلب شهرياً</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-100 text-xs text-brand-900 leading-relaxed">
                  <strong>ملاحظة:</strong> آلاف المنتجات المتنوعة ستضاف إلى متجرك بشكل تلقائي وعليك البيع لأقاربك وأصدقائك ومتابعيك على مواقع التواصل بدون أي حدود.
                </div>

              </div>

              {/* بطاقة النتائج والأرباح */}
              <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-brand-950 rounded-2xl p-6 sm:p-8 text-white space-y-6 text-center shadow-lg">
                
                <div>
                  <span className="text-xs text-slate-300 font-bold block mb-1">ربحك الصافي من كل قطعة واحدة:</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">
                    {unitProfit.toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <span className="text-xs text-sky-200 font-bold block mb-1">صافي أرباحك الشهرية المقدرة:</span>
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                    {totalMonthlyProfit.toLocaleString('ar-IQ')} د.ع
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">تصلك مباشرة دون أي استقطاعات</span>
                </div>

                <Link
                  href="/register-store"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-skybrand-600 hover:from-brand-500 hover:to-skybrand-500 text-white font-black text-sm shadow-md transition-all hover:scale-[1.02]"
                >
                  <span>سجل وابدأ تحقيق هذا الدخل</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 6. مميزات العمل مع وصلي (Features) */}
      <section id="features" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-black border border-brand-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>لماذا تختار منصة وصلي؟</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              كل ما تحتاجه لتنجح في التجارة الإلكترونية
            </h2>
            <p className="text-sm text-slate-500">
              وفرنا عليك كل التعقيدات اللوجستية والمالية لتركز فقط على التسويق والأرباح.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 hover:shadow-sm transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">بدون رأس مال (صفر مخاطرة)</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                لا داعي للقلق بشأن تكلفة شراء البضائع وتجميد أموالك، نحن نتحمل تمويل وتوفير البضاعة بالكامل.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 hover:shadow-sm transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-skybrand-100 text-skybrand-700 flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">متجر باسمك وهويتك الخاصة</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                متجرك يظهر للزبون باسمك وعلامتك التجارية ورقمك الخاص، مما يمنح زبائنك ثقة تامة بالتعامل معك.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 hover:shadow-sm transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">توصيل سريع وموثوق للمنازل</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                مناديبنا يصلون لجميع مناطق العراق ، مع خدمة الدفع عند الاستلام.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 hover:shadow-sm transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">حرية كاملة في تحديد أسعارك</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                لكل منتج نطاق سعري محدد مسبقاً، وتستطيع رفع أو خفض سعر البيع لزيادة مبيعاتك أو تعظيم أرباحك.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 hover:shadow-sm transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">إشعارات تيليجرام فورية بالطلبات</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                بمجرد قيام أي زبون بالطلب من متجرك، يصلك إشعار فوري عبر تيليجرام بتفاصيل الطلب وقيمة ربحك الصافي.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/70 hover:shadow-sm transition-all space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">لوحة تحكم ذكية وشاملة</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                تابع عدد مبيعاتك، والطلبات الجارية، والأرباح المعلقة والمسحوبة عبر واجهة عربية واضحة ومبسطة.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 7. الأسئلة الشائعة (FAQ) */}
      <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-black">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>إجابات على استفساراتك</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              الأسئلة الأكثر شيوعاً
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              إليك كل ما تحتاج معرفته عن كيفية العمل وجني الأرباح مع منصة وصلي.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-right font-bold text-sm sm:text-base text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180 text-brand-700' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 8. دعوة أخيرة للانضمام (Call to Action Banner) */}
      <section className="py-16 bg-gradient-to-r from-brand-800 via-brand-700 to-skybrand-700 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            جاهز لتبدأ مشروعك وتكسب أول أرباحك اليوم؟
          </h2>
          
          <p className="text-sm sm:text-base text-sky-100 max-w-xl mx-auto leading-relaxed">
            انضم الآن لمئات المسوقين وأصحاب المتاجر في العراق، وابدأ تجارتك بدون رأس مال وبدون أي مخاطرة.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register-store"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 text-brand-900 font-black text-base shadow-lg transition-all hover:scale-105"
            >
              <span>أنشئ متجرك مجاناً الآن</span>
              <ArrowLeft className="w-5 h-5 text-brand-700" />
            </Link>

            <Link
              href="/merchant"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-brand-900/40 hover:bg-brand-900/60 text-white font-bold text-sm border border-white/20 transition-colors"
            >
              <span>تسجيل دخول التاجر</span>
            </Link>
          </div>

        </div>
      </section>

      {/* 9. التذييل (Footer) */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-black text-white">منصة وصلي سمارت</span>
              <p className="text-[11px] text-slate-500">التجارة والتسويق الذكي لأبناء العراق</p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/register-store" className="hover:text-white transition-colors">إنشاء متجر</Link>
            <Link href="/merchant" className="hover:text-white transition-colors">لوحة التاجر</Link>
            <Link href="/waahhlstor" className="hover:text-white transition-colors">لوحة الإدارة</Link>
          </div>

          <div className="text-slate-500 text-center sm:text-left">
            جميع الحقوق محفوظة لمنصة وصلي © 2026
          </div>

        </div>
      </footer>

    </div>
  );
}
