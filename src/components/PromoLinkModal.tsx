'use client';

import React, { useState, useEffect } from 'react';
import { 
  Link as LinkIcon, 
  X, 
  Copy, 
  ExternalLink, 
  Check, 
  TrendingUp, 
  Eye, 
  ShoppingBag, 
  DollarSign, 
  Percent, 
  Sparkles, 
  Youtube, 
  Info,
  Calendar,
  Phone,
  MapPin,
  CheckCircle2,
  PackageCheck
} from 'lucide-react';
import { PromoLink, PromoLinkOrder } from '@/lib/services/promoLinkService';

interface PromoLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    image: string;
    priceIqd?: number;
    platformPriceIqd?: number;
    wholesalePriceIqd?: number;
    minPriceIqd?: number;
    maxPriceIqd?: number;
  };
  store: {
    code: string;
    name: string;
  };
  onLinkUpdated?: (link: PromoLink) => void;
}

export default function PromoLinkModal({
  isOpen,
  onClose,
  product,
  store,
  onLinkUpdated,
}: PromoLinkModalProps) {
  const [linkData, setLinkData] = useState<PromoLink | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // حقول النموذج
  const wholesaleCost = Number(product.wholesalePriceIqd || (product.priceIqd ? Math.round(product.priceIqd * 0.7) : 8000));
  const minP = Number(product.minPriceIqd || wholesaleCost + 3000);
  const maxP = Number(product.maxPriceIqd || wholesaleCost + 25000);

  const [sellingPrice, setSellingPrice] = useState<number>(() => {
    return Number(product.priceIqd || product.platformPriceIqd || wholesaleCost + 7000);
  });
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  // جلب إحصائيات الرابط
  useEffect(() => {
    if (!isOpen || !store.code || !product.id) return;

    async function fetchStats() {
      try {
        setLoadingStats(true);
        const res = await fetch(`/api/promo-links?storeCode=${store.code}&productId=${product.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.link) {
            setLinkData(data.link);
            setSellingPrice(Number(data.link.sellingPrice));
            setYoutubeUrl(data.link.youtubeUrl || '');
            setIsGenerated(true);
          } else {
            // محاولة القراءة من التخزين المحلي كاحتياط
            try {
              const localKey = `wasli_promo_${store.code}_${product.id}`;
              const saved = localStorage.getItem(localKey);
              if (saved) {
                const parsed = JSON.parse(saved);
                setLinkData(parsed);
                setSellingPrice(Number(parsed.sellingPrice));
                setYoutubeUrl(parsed.youtubeUrl || '');
                setIsGenerated(true);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('خطأ في جلب بيانات الرابط:', err);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchStats();
  }, [isOpen, store.code, product.id]);

  if (!isOpen) return null;

  // الربح الصافي للقطعة
  const calculatedProfit = Math.max(0, sellingPrice - wholesaleCost);

  // الرابط الكامل
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const generatedPath = `/offer/${store.code}/${product.id}?storeName=${encodeURIComponent(store.name)}`;
  const fullUrl = `${origin}${generatedPath}`;

  // حفظ وتحديث الرابط
  const handleSaveAndGenerate = async () => {
    setIsSaving(true);
    setSaveToast('');

    try {
      const payload = {
        storeCode: store.code,
        storeName: store.name,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        sellingPrice: Number(sellingPrice),
        wholesalePrice: wholesaleCost,
        youtubeUrl: youtubeUrl.trim(),
      };

      const res = await fetch('/api/promo-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.link) {
          setLinkData(data.link);
          setIsGenerated(true);

          // حفظ محلي أيضاً
          try {
            const localKey = `wasli_promo_${store.code}_${product.id}`;
            localStorage.setItem(localKey, JSON.stringify(data.link));
          } catch (e) {}

          if (onLinkUpdated) {
            onLinkUpdated(data.link);
          }

          setSaveToast('تم حفظ إعدادات الرابط بنجاح!');
          setTimeout(() => setSaveToast(''), 3000);
        }
      }
    } catch (e) {
      setSaveToast('تعذر الحفظ، يرجى المحاولة ثانية');
    } finally {
      setIsSaving(false);
    }
  };

  // نسخ الرابط
  const handleCopyLink = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* رأس النافذة */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">إنشاء رابط البيع الخاص</h2>
              <p className="text-[11px] text-emerald-200">أنشئ رابطاً خاصاً بك للمنتج وشاركه واربح من كل طلب</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* جسم النافذة القابل للتمرير */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          
          {/* بطاقة معلومات المنتج السريعة */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate">{product.name}</h3>
              <div className="flex items-center gap-3 text-xs mt-1">
                <span className="text-slate-500 font-medium">سعر الجملة: <strong className="text-slate-800">{wholesaleCost.toLocaleString('ar-IQ')} د.ع</strong></span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ربحك: +{calculatedProfit.toLocaleString('ar-IQ')} د.ع
                </span>
              </div>
            </div>
          </div>

          {/* صندوق: كيف يعمل رابط البيع الخاص؟ */}
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-sky-900 font-bold text-xs mb-2">
              <Info className="w-4 h-4 text-sky-600 shrink-0" />
              <span>كيف يعمل رابط البيع الخاص؟</span>
            </div>
            <ul className="text-xs text-sky-800 space-y-1.5 pr-2 list-disc list-inside leading-relaxed">
              <li>قم بتحديد السعر الذي تريد بيعه به لزبائنك.</li>
              <li>اضغط على <strong>«حفظ وتوليد الرابط»</strong> لإنشاء صفحة بيع مخصصة لهذا المنتج.</li>
              <li>شارك الرابط في إعلاناتك وصفحاتك عبر وسائل التواصل (إنستغرام، تيك توك، فيسبوك).</li>
              <li>عند شراء أي عميل عبر الرابط، سيتم تثبيت الطلب تلقائياً في حسابك وأرباحك.</li>
              <li>تابع إحصائيات المبيعات والزيارات مباشرة من هذا الجدول.</li>
            </ul>
          </div>

          {/* إحصائيات الرابط المباشرة */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>إحصائيات الرابط</span>
            </h3>

            {loadingStats ? (
              <div className="text-center py-4 text-xs text-slate-400 animate-pulse">جاري تحميل إحصائيات الرابط...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">عدد الزيارات</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                    {linkData?.visitsCount || 0}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">عدد الطلبات</div>
                  <div className="text-lg font-black text-brand-700 mt-0.5 font-mono">
                    {linkData?.ordersCount || 0}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">معدل التحويل</div>
                  <div className="text-lg font-black text-purple-700 mt-0.5 font-mono">
                    {linkData?.conversionRate || 0}%
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <div className="text-[11px] text-emerald-700 font-medium">إجمالي أرباحك</div>
                  <div className="text-base font-black text-emerald-800 mt-0.5 font-mono">
                    {(linkData?.totalProfit || 0).toLocaleString('ar-IQ')} د.ع
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* تحديد سعر الموقع ورابط يوتيوب */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <DollarSign className="w-4 h-4 text-brand-700" />
              <span>تحديد سعر البيع بالرابط</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سعر البيع للزبون (د.ع)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="500"
                    min={minP}
                    max={maxP}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-black font-mono outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                    placeholder="أدخل السعر"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">د.ع</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-center shrink-0">
                  <span className="text-[10px] text-emerald-700 block font-medium">ربحك بالقطعة</span>
                  <span className="text-xs font-black text-emerald-800 font-mono">+{calculatedProfit.toLocaleString('ar-IQ')} د.ع</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-600" />
                <span>رابط فيديو يوتيوب للمنتج (اختياري)</span>
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-brand-600"
                dir="ltr"
              />
            </div>

            {saveToast && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{saveToast}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAndGenerate}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <span>جاري الحفظ والتوليد...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isGenerated ? 'حفظ وتحديث الرابط' : 'توليد رابط البيع الخاص'}</span>
                </>
              )}
            </button>
          </div>

          {/* صندوق الرابط المولد وزر النسخ والفتح */}
          {isGenerated && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-black text-slate-900">رابط البيع الخاص بك جاهز:</h3>
              
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="flex-1 font-mono text-xs text-slate-700 truncate" dir="ltr">
                  {fullUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-600" />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 text-[11px]">اضغط على زر النسخ لنشر الرابط أو فتحه للمعاينة</span>
                <a
                  href={generatedPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-800"
                >
                  <span>معاينة الرابط</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* سجل الطلبات الواردة من هذا الرابط بالتحديد */}
          {linkData && linkData.orders && linkData.orders.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-black text-slate-900 flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span>الطلبات الواردة من هذا الرابط ({linkData.orders.length})</span>
                </div>
              </h3>

              <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-slate-100">
                {linkData.orders.map((ord, idx) => (
                  <div key={idx} className="pt-2 pb-1 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span>{ord.customerName}</span>
                        <span className="text-[10px] font-mono text-slate-400">({ord.orderNumber})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{ord.customerPhone}</span>
                        <span>•</span>
                        <span>{ord.customerCity}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="font-black text-emerald-700 font-mono">
                        +{ord.profit?.toLocaleString('ar-IQ')} د.ع ربح
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {ord.quantity} قطعة • {ord.totalPrice?.toLocaleString('ar-IQ')} د.ع
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* تذييل النافذة */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
