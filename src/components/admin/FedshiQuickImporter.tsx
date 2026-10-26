'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Link as LinkIcon, 
  ExternalLink,
  ClipboardPaste,
  X,
  ListOrdered,
  Sparkles,
  ArrowDown,
  Boxes
} from 'lucide-react';

export interface QueueItem {
  id: string;
  rawInput: string;
  code?: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progressText?: string;
  result?: {
    name: string;
    code: string;
    wholesalePrice: number;
    expectedProfit: number;
    imagesCount: number;
    productId?: string;
  };
  error?: string;
  timestamp: number;
}

interface FedshiQuickImporterProps {
  onSuccess?: () => void;
}

export default function FedshiQuickImporter({ onSuccess }: FedshiQuickImporterProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const isProcessingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // استخراج الأكواد أو الروابط المتعددة عند اللصق
  const extractUrlsOrCodes = (text: string): string[] => {
    if (!text) return [];
    // تقسيم النص عبر الأسطر أو الفواصل أو المسافات
    const rawTokens = text.split(/[\r\n,]+/).map(t => t.trim()).filter(Boolean);
    const results: string[] = [];
    
    for (const token of rawTokens) {
      // إذا كان سطراً يحتوي عدة روابط
      const urlMatches = token.match(/https?:\/\/[^\s]+/g);
      if (urlMatches && urlMatches.length > 0) {
        urlMatches.forEach(u => results.push(u.trim()));
      } else {
        results.push(token);
      }
    }
    return results.filter(Boolean);
  };

  // إضافة رابط أو أكثر إلى طابور المعالجة فوراً
  const addToQueue = (inputStrings: string[]) => {
    if (!inputStrings || inputStrings.length === 0) return;

    const newItems: QueueItem[] = inputStrings.map((str) => {
      // استخراج كود المنتج المبدئي للعرض الأولي (فدشي أو دروب برايم)
      let preliminaryCode = str;
      const m = str.match(/\/(?:product|products|p)\/([^/?#]+)/i) || str.match(/id=([^&?#]+)/);
      if (m && m[1]) preliminaryCode = m[1];
      preliminaryCode = preliminaryCode.split('?')[0].split('#')[0].trim();

      return {
        id: crypto.randomUUID(),
        rawInput: str,
        code: preliminaryCode,
        status: 'pending',
        timestamp: Date.now(),
      };
    });

    setQueue((prev) => [...prev, ...newItems]);
    setInputUrl('');
    // إعادة المؤشر لحقل الإدخال ليكون جاهزاً فوراً للرابط التالي
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const [loadingAllDP, setLoadingAllDP] = useState(false);

  // سحب جميع منتجات دروب برايم دفعة واحدة للطابور
  const handleLoadAllDropPrime = async () => {
    setLoadingAllDP(true);
    try {
      const res = await fetch('/api/suppliers/dropprime');
      const data = await res.json();
      if (data.success && Array.isArray(data.products) && data.products.length > 0) {
        const codes = data.products.map((p: any) => `https://dropprime.site/product/${p.supplierCode}`);
        addToQueue(codes);
      }
    } catch (e) {
      console.error('خطأ في جلب منتجات دروب برايم:', e);
    } finally {
      setLoadingAllDP(false);
    }
  };

  // معالجة زر الإرسال أو الضغط على Enter
  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const items = extractUrlsOrCodes(inputUrl.trim());
    if (items.length > 0) {
      addToQueue(items);
    }
  };

  // معالجة زر اللصق الذكي (Paste)
  const handlePasteAndAdd = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const items = extractUrlsOrCodes(text.trim());
          if (items.length > 0) {
            addToQueue(items);
          }
        }
      }
    } catch (e) {
      // في حال عدم توفر صلاحية الحافظة، نكتفي بالحقل
    }
  };

  // تشغيل المعالج لطابور الروابط بالتسلسل المنظم
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessingRef.current) return;

      // العثور على أول عنصر بحالة الانتظار
      const nextItem = queue.find((item) => item.status === 'pending');
      if (!nextItem) return;

      isProcessingRef.current = true;

      // تحديث حالة العنصر إلى قيد المعالجة (processing)
      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? { ...item, status: 'processing', progressText: 'جاري الاتصال بسيرفر فدشي وسحب المنتج...' }
            : item
        )
      );

      try {
        const response = await fetch('/api/admin/fedshi-fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: nextItem.rawInput }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'تعذر سحب المنتج من فدشي.');
        }

        // تحديث العنصر إلى نجاح
        setQueue((prev) =>
          prev.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: 'success',
                  result: {
                    name: data.details?.name || data.product?.name || 'منتج فدشي',
                    code: data.details?.code || nextItem.code || '',
                    wholesalePrice: data.details?.wholesalePrice || 0,
                    expectedProfit: data.details?.expectedProfit || 0,
                    imagesCount: data.details?.imagesCount || 0,
                    productId: data.product?.id,
                  },
                }
              : item
          )
        );

        if (onSuccess) {
          onSuccess();
        }

        // إخفاء العنصر المكتمل بنجاح تلقائياً بعد 7 ثوانٍ لإبقاء الواجهة نظيفة
        setTimeout(() => {
          setQueue((prev) => prev.filter((item) => item.id !== nextItem.id));
        }, 7000);

      } catch (err: any) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: 'error',
                  error: err.message || 'حدث خطأ غير متوقع أثناء معالجة المنتج',
                }
              : item
          )
        );
      } finally {
        isProcessingRef.current = false;
      }
    };

    processQueue();
  }, [queue, onSuccess]);

  // إزالة عنصر يدوي من القائمة
  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // إعادة محاولة سحب عنصر فشل
  const retryItem = (id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'pending', error: undefined } : item
      )
    );
  };

  const pendingCount = queue.filter(i => i.status === 'pending').length;
  const isWorking = queue.some(i => i.status === 'processing');

  return (
    <div className="bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-blue-700/40 relative overflow-hidden my-6">
      {/* خلفية تجميلية خفيفة */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* الترويسة وشارة الطابور الحي */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-blue-200 shadow-inner">
              <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                أداة السحب السريع المباشر (فدشي + دروب برايم)
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  معالجة تلقائية متتابعة
                </span>
              </h3>
              <p className="text-sm text-blue-200/80">
                الصق الروابط من فدشي أو دروب برايم واحداً تلو الآخر بدون انتظار! الأداة تسحب بالخلفية وتترك لك الحقل مفتوحاً دائماً
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadAllDropPrime}
              disabled={loadingAllDP}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-2xl text-xs font-bold border border-purple-400/40 flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
              title="جلب كافة منتجات دروب برايم المتاحة دفعة واحدة إلى طابور السحب والنشر"
            >
              {loadingAllDP ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
              ) : (
                <Boxes className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>سحب كل دروب برايم (28 منتج)</span>
            </button>

            {/* عداد الطابور */}
            {queue.length > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-blue-900/60 border border-blue-500/40 rounded-2xl text-xs font-bold text-blue-200">
                <ListOrdered className="w-4 h-4 text-amber-400" />
                <span>
                  {isWorking ? 'جاري المعالجة' : 'جاهز'} ({queue.length} في القائمة)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* نموذج الإدخال السريع والمفتوح دائماً */}
        <form onSubmit={handleFormSubmit} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-blue-300/70">
                <LinkIcon className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                type="text"
                dir="ltr"
                placeholder="الصق رابط فدشي أو دروب برايم (dropprime.site) واضغط Enter..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                autoComplete="off"
                className="w-full pl-28 pr-11 py-3.5 bg-slate-900/90 border border-blue-500/40 rounded-2xl text-white placeholder-blue-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition shadow-inner"
              />
              <button
                type="button"
                onClick={handlePasteAndAdd}
                className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs bg-blue-700/70 hover:bg-blue-600 text-blue-100 font-bold rounded-xl border border-blue-400/40 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="لصق الرابط وإضافته فوراً للطابور"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                لصق وسحب
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputUrl.trim()}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4 rotate-180" />
              <span>إضافة وسحب</span>
            </button>
          </div>
          <p className="text-[11px] text-blue-300/60 pr-1">
            نصيحة: يمكنك لصق الرابط والضغط على (Enter)، وسيفرغ الحقل فوراً لتلصق الرابط الثاني مباشرة بينما الأول يُسحب ويُنشر!
          </p>
        </form>

        {/* قائمة طابور المعالجة اللحظية التفاعلية */}
        {queue.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-blue-800/40 animate-fade-in">
            {queue.map((item) => {
              if (item.status === 'processing') {
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-blue-900/50 border border-sky-400/50 text-white flex items-center justify-between gap-3 animate-pulse"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0">
                        <Loader2 className="w-4 h-4 text-sky-300 animate-spin" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-sky-200 truncate">
                          جاري سحب ونشر المنتج: {item.code || item.rawInput}
                        </div>
                        <div className="text-[11px] text-sky-300/70">
                          يتم استخراج البيانات والصور والنشر في قناة تيليجرام تلقائياً...
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] bg-sky-500/20 text-sky-300 px-2.5 py-1 rounded-lg border border-sky-400/30 shrink-0 font-bold">
                      قيد المعالجة الآن
                    </span>
                  </div>
                );
              }

              if (item.status === 'pending') {
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 text-slate-300 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400 text-xs">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs text-slate-300 truncate" dir="ltr">
                        {item.code || item.rawInput}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700 font-medium">
                        في انتظار دوره
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
                        title="إلغاء من القائمة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.status === 'success' && item.result) {
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-md"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-emerald-200 truncate">
                          تم سحب ({item.result.name}) وحفظه ونشره بنجاح في تيليجرام!
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-emerald-300/80">
                          <span className="bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                            كود: {item.result.code}
                          </span>
                          <span className="bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                            سعر الجملة: {Number(item.result.wholesalePrice).toLocaleString('ar-IQ')} د.ع
                          </span>
                          <span className="bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                            الربح المتوقع: {Number(item.result.expectedProfit).toLocaleString('ar-IQ')} د.ع
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {item.result.productId && (
                        <a
                          href={`/p/${item.result.productId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-lg text-xs flex items-center gap-1 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          معاينة
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-emerald-400/60 hover:text-emerald-200 p-1 transition cursor-pointer"
                        title="إخفاء"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.status === 'error') {
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 flex items-center justify-between gap-3 animate-fade-in"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-rose-200 truncate">
                          تعذر سحب: {item.code || item.rawInput}
                        </div>
                        <div className="text-[11px] text-rose-300/80">
                          {item.error}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => retryItem(item.id)}
                        className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 rounded-lg text-xs transition cursor-pointer"
                      >
                        إعادة المحاولة
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-rose-400/60 hover:text-rose-200 p-1 transition cursor-pointer"
                        title="إغلاق"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
