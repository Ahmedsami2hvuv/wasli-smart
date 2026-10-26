'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Link as LinkIcon, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  FileText, 
  Check, 
  Trash2, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { inspectText, cleanText, InspectionResult } from '@/lib/utils/fedshiInspector';

interface ProductIssue {
  productId: string;
  name: string;
  image: string;
  wholesalePriceIqd: number;
  supplierCode?: string;
  detectedWords: string[];
  detectedLinks: string[];
  fedshiCount: number;
  linksCount: number;
  originalDescription: string;
  cleanedDescription: string;
  originalShortDescription?: string;
  cleanedShortDescription?: string;
  originalName: string;
  cleanedName: string;
}

interface FedshiInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductsUpdated?: () => void;
}

export default function FedshiInspectorModal({
  isOpen,
  onClose,
  onProductsUpdated,
}: FedshiInspectorModalProps) {
  // التبويب النشط: إما فحص المنتجات في المنصة أو الفاحص الفوري للنصوص
  const [activeTab, setActiveTab] = useState<'scan_db' | 'live_paste'>('live_paste');

  // حالات فحص المنتجات المخزنة
  const [scanning, setScanning] = useState(false);
  const [scannedOnce, setScannedOnce] = useState(false);
  const [totalScanned, setTotalScanned] = useState(0);
  const [issuesList, setIssuesList] = useState<ProductIssue[]>([]);
  const [cleaningId, setCleaningId] = useState<string | null>(null);
  const [cleaningAll, setCleaningAll] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // حالات الفاحص الفوري للنصوص الملصقة
  const [liveInputText, setLiveInputText] = useState('');
  const [copiedCleanText, setCopiedCleanText] = useState(false);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);

  // نتيجة الفحص الفوري للنص الملصق
  const liveResult: InspectionResult = useMemo(() => {
    return inspectText(liveInputText);
  }, [liveInputText]);

  // دالة فحص المنتجات في قاعدة البيانات
  const handleScanDatabase = async () => {
    try {
      setScanning(true);
      setActionMessage(null);
      const res = await fetch('/api/admin/fedshi-inspector');
      const data = await res.json();
      if (data.success) {
        setIssuesList(data.issues || []);
        setTotalScanned(data.totalScanned || 0);
        setScannedOnce(true);
      } else {
        setActionMessage({ text: data.message || 'تعذر إتمام الفحص', type: 'error' });
      }
    } catch (err: any) {
      setActionMessage({ text: 'حدث خطأ أثناء الاتصال بالسيرفر للفحص', type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  // دالة تنظيف منتج واحد
  const handleCleanProduct = async (issue: ProductIssue) => {
    try {
      setCleaningId(issue.productId);
      const res = await fetch('/api/admin/fedshi-inspector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: issue.productId,
          customCleanedDescription: issue.cleanedDescription,
          customCleanedShortDescription: issue.cleanedShortDescription,
          customCleanedName: issue.cleanedName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIssuesList(prev => prev.filter(item => item.productId !== issue.productId));
        setActionMessage({ text: `تم تنظيف وتحديث المنتج "${issue.name}" بنجاح`, type: 'success' });
        if (onProductsUpdated) onProductsUpdated();
      } else {
        setActionMessage({ text: data.message || 'فشل تنظيف المنتج', type: 'error' });
      }
    } catch (err) {
      setActionMessage({ text: 'حدث خطأ أثناء تنظيف المنتج', type: 'error' });
    } finally {
      setCleaningId(null);
    }
  };

  // دالة تنظيف كافة المنتجات المخالفة دفعة واحدة
  const handleCleanAllProducts = async () => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في تنظيف وتحديث كافة المنتجات المكتشفة (${issuesList.length} منتج) وإزالة الروابط وكلمات الموردين (فدشي وموجود) منها؟`)) {
      return;
    }

    try {
      setCleaningAll(true);
      setActionMessage(null);
      const res = await fetch('/api/admin/fedshi-inspector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleanAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({ text: data.message || 'تم تنظيف كافة المنتجات بنجاح', type: 'success' });
        if (onProductsUpdated) onProductsUpdated();
        // إعادة الفحص الفعلي للتأكد من قاعدة البيانات مباشرة
        await handleScanDatabase();
      } else {
        setActionMessage({ text: data.message || 'فشل تنظيف المنتجات', type: 'error' });
      }
    } catch (err) {
      setActionMessage({ text: 'حدث خطأ أثناء المعالجة الجماعية', type: 'error' });
    } finally {
      setCleaningAll(false);
    }
  };

  // دالة نسخ النص المنظف
  const handleCopyCleanText = () => {
    if (!liveResult.cleanedText) return;
    navigator.clipboard.writeText(liveResult.cleanedText);
    setCopiedCleanText(true);
    setTimeout(() => setCopiedCleanText(false), 2000);
  };

  // دالة نسخ رابط محدد
  const handleCopyLink = (link: string, idx: number) => {
    navigator.clipboard.writeText(link);
    setCopiedLinkIndex(idx);
    setTimeout(() => setCopiedLinkIndex(null), 2000);
  };

  // إبراز الكلمات والروابط المكتشفة داخل النص لسهولة الرؤية
  const renderHighlightedText = (text: string, matches: InspectionResult['matches']) => {
    if (!matches || matches.length === 0) {
      return <span>{text}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((m, idx) => {
      // النص العادي قبل التطابق
      if (m.startIndex > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>{text.substring(lastIndex, m.startIndex)}</span>
        );
      }

      // العنصر المكتشف مظللاً
      if (m.type === 'external_link') {
        elements.push(
          <span
            key={`match-${idx}`}
            className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md font-bold underline border border-red-300 mx-0.5 inline-flex items-center gap-1"
            title="رابط خارجي مكتشف"
          >
            <LinkIcon className="w-3 h-3 inline-block" />
            {m.text}
          </span>
        );
      } else {
        elements.push(
          <span
            key={`match-${idx}`}
            className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md font-black border border-amber-400 mx-0.5"
            title="كلمة تابعة لمنصة فد شي"
          >
            {m.text}
          </span>
        );
      }

      lastIndex = m.endIndex;
    });

    // بقية النص بعد آخر تطابق
    if (lastIndex < text.length) {
      elements.push(
        <span key={`text-end`}>{text.substring(lastIndex)}</span>
      );
    }

    return elements;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6" dir="rtl">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* رأس النافذة */}
        <div className="p-5 sm:p-6 bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                كاشف نصوص وروابط الموردين (فد شي وموجود)
                <span className="text-[11px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                  حماية الخصوصية
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                فحص فوري لكشف كلمات الموردين (فد شي / موجود) وأي روابط خارجية في الأوصاف والعناوين مع إمكانية تنظيفها بضغطة واحدة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* أزرار التبديل بين التبويبين */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('live_paste')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'live_paste'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>الفاحص الفوري (لصق وكشف سريع للوصف)</span>
            {liveResult.hasIssues && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('scan_db');
              if (!scannedOnce) handleScanDatabase();
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'scan_db'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>فحص جميع منتجات المنصة المخزنة</span>
            {issuesList.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {issuesList.length}
              </span>
            )}
          </button>
        </div>

        {/* رسائل التنبيه والإجراءات */}
        {actionMessage && (
          <div className={`mx-6 mt-4 p-3.5 rounded-2xl text-xs font-bold border flex items-center justify-between ${
            actionMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setActionMessage(null)} 
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* محتوى التبويبات */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* تبويب 1: الفاحص الفوري للنصوص الملصقة */}
          {activeTab === 'live_paste' && (
            <div className="space-y-5">
              
              {/* شريط الإدخال والتعليمات */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                    <span>الصق وصف أو عنوان المنتج من فد شي هنا:</span>
                  </label>
                  {liveInputText && (
                    <button
                      type="button"
                      onClick={() => setLiveInputText('')}
                      className="text-[11px] text-slate-500 hover:text-red-600 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      مسح النص
                    </button>
                  )}
                </div>

                <textarea
                  rows={4}
                  value={liveInputText}
                  onChange={(e) => setLiveInputText(e.target.value)}
                  placeholder="مثال: سماعة بلوتوث أصلية عالية الجودة... وصف المنتج في فد شي... لمزيد من التفاصيل زوروا https://fedshi.com..."
                  className="w-full p-4 rounded-2xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 bg-white transition-all leading-relaxed"
                />
              </div>

              {/* نتائج الكشف الحي */}
              {liveInputText.trim() ? (
                <div className="space-y-4">
                  
                  {/* شريط الحالة والإحصاءات */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    liveResult.hasIssues
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {liveResult.hasIssues ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <h4 className="text-xs sm:text-sm font-black">
                          {liveResult.hasIssues 
                            ? 'تم اكتشاف عناصر محظورة (كلمة فد شي أو روابط خارجية)!'
                            : 'النص نظيف تماماً وخالٍ من أي روابط أو إشارة لفد شي'}
                        </h4>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          {liveResult.hasIssues
                            ? 'انظر أدناه للتفاصيل والروابط المستخرجة، كما يمكنك نسخ النسخة المنظفة فوراً.'
                            : 'يمكنك استخدام هذا الوصف بثقة وأمان داخل متجرك.'}
                        </p>
                      </div>
                    </div>

                    {/* العدادات السريعة */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1 rounded-xl bg-white/80 border border-slate-200/80 text-[11px] font-black text-slate-800 shadow-2xs">
                        كلمات فدشي: <span className={liveResult.fedshiOccurrences > 0 ? 'text-amber-700' : 'text-slate-500'}>{liveResult.fedshiOccurrences}</span>
                      </div>
                      <div className="px-3 py-1 rounded-xl bg-white/80 border border-slate-200/80 text-[11px] font-black text-slate-800 shadow-2xs">
                        الروابط: <span className={liveResult.linksCount > 0 ? 'text-red-700' : 'text-slate-500'}>{liveResult.linksCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* في حال وجود مشاكل: عرض الروابط والكلمات المستخرجة بالتفصيل */}
                  {liveResult.hasIssues && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* الكلمات المكتشفة */}
                      <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
                        <div className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          كلمات فد شي المكتشفة ({liveResult.detectedWords.length}):
                        </div>
                        {liveResult.detectedWords.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {liveResult.detectedWords.map((word, i) => (
                              <span 
                                key={i}
                                className="px-2.5 py-1 rounded-lg bg-amber-200 text-amber-950 font-black text-xs border border-amber-300 shadow-2xs"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500">لا توجد كلمات فد شي مباشرة.</p>
                        )}
                      </div>

                      {/* الروابط المكتشفة */}
                      <div className="p-4 rounded-2xl border border-red-200 bg-red-50/40 space-y-2">
                        <div className="text-xs font-black text-red-900 flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-red-600" />
                          الروابط المكتشفة ({liveResult.detectedLinks.length}):
                        </div>
                        {liveResult.detectedLinks.length > 0 ? (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {liveResult.detectedLinks.map((link, i) => (
                              <div 
                                key={i}
                                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-red-200/80 text-xs"
                              >
                                <span className="font-mono text-[11px] text-red-700 truncate dir-ltr select-all max-w-[260px]">
                                  {link}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(link, i)}
                                  className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-all cursor-pointer shrink-0 flex items-center gap-1"
                                >
                                  {copiedLinkIndex === i ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>تم النسخ</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>نسخ الرابط</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500">لا توجد روابط خارجية مكتشفة.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* معاينة النص الأصلي مع التظليل البصري للأماكن المكتشفة */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>معاينة النص مع تظليل العناصر المكتشفة:</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-1 text-amber-800">
                          <span className="w-2.5 h-2.5 rounded-xs bg-amber-300 border border-amber-400" />
                          كلمة فدشي
                        </span>
                        <span className="flex items-center gap-1 text-red-700">
                          <span className="w-2.5 h-2.5 rounded-xs bg-red-200 border border-red-300" />
                          رابط خارجي
                        </span>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {renderHighlightedText(liveInputText, liveResult.matches)}
                    </div>
                  </div>

                  {/* صندوق النسخة المنظفة الجاهزة للنسخ */}
                  <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs sm:text-sm font-black text-emerald-950">
                          الوصف المنظف النقي (جاهز للاستخدام):
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyCleanText}
                        className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        {copiedCleanText ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم النسخ بنجاح!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ الوصف النظيف</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs sm:text-sm text-slate-800 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {liveResult.cleanedText || <span className="text-slate-400 italic">لا يوجد نص متبقٍ بعد التنظيف</span>}
                    </div>
                  </div>

                </div>
              ) : (
                /* حالة النص فارغ */
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">الصق وصف أي منتج في الصندوق أعلاه</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    ستقوم الأداة فورياً وبدون أي تأخير برصد أي كلمة تابعة لمنصة فد شي واستخراج جميع الروابط، وتقديم نسخة نظيفة جاهزة للنسخ بنقرة واحدة.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* تبويب 2: فحص جميع المنتجات المخزنة بالمنصة */}
          {activeTab === 'scan_db' && (
            <div className="space-y-5">
              
              {/* شريط الإجراءات العلوي للتبويب */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    نتائج فحص قاعدة البيانات
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {scannedOnce 
                      ? `تم فحص ${totalScanned} منتج في المنصة - تم العثور على (${issuesList.length}) منتج يحتاج للمراجعة`
                      : 'اضغط على زر الفحص للبدء بفحص جميع المنتجات المسجلة في المنصة'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanDatabase}
                    disabled={scanning}
                    className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    <span>{scanning ? 'جاري الفحص...' : 'إعادة الفحص'}</span>
                  </button>

                  {issuesList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCleanAllProducts}
                      disabled={cleaningAll}
                      className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                      title="تنظيف كافة الروابط وكلمات فدشي من جميع المنتجات المخالفة بضغطة زر واحدة"
                    >
                      {cleaningAll ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري التنظيف الشامل...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>تنظيف الكل دفعة واحدة</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* حالة التحميل */}
              {scanning && (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
                  <p className="text-sm font-bold text-slate-800">جاري فحص جميع المنتجات في المنصة...</p>
                  <p className="text-xs text-slate-500">يتم تحليل أسماء المنتجات والأوصاف والمواصفات لرصد أي روابط أو كلمات فد شي</p>
                </div>
              )}

              {/* في حال عدم وجود مخالفات */}
              {!scanning && scannedOnce && issuesList.length === 0 && (
                <div className="py-16 text-center border-2 border-dashed border-emerald-200 rounded-3xl bg-emerald-50/40 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-emerald-950">ممتاز! المنصة خالية من أي روابط أو أسماء فد شي</h4>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                    جميع المنتجات المفحوصة ({totalScanned} منتج) نظيفة تماماً وتتوافق 100% مع معايير الخصوصية والتسمية البيضاء للتاجر.
                  </p>
                </div>
              )}

              {/* قائمة المنتجات المخالفة */}
              {!scanning && issuesList.length > 0 && (
                <div className="space-y-4">
                  {issuesList.map((issue) => {
                    const isExpanded = expandedProductId === issue.productId;

                    return (
                      <div 
                        key={issue.productId}
                        className="p-4 sm:p-5 rounded-2xl border border-amber-200/90 bg-white shadow-xs hover:border-amber-300 transition-all space-y-4"
                      >
                        {/* معلومات المنتج الأساسية وأزرار الإجراء */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                              <Image 
                                src={issue.image} 
                                alt={issue.name} 
                                fill 
                                sizes="56px"
                                className="object-cover" 
                              />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                                {issue.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-bold">
                                {issue.supplierCode && (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                                    كود: {issue.supplierCode}
                                  </span>
                                )}
                                <span>جملة: {issue.wholesalePriceIqd.toLocaleString()} د.ع</span>
                              </div>
                            </div>
                          </div>

                          {/* الشارات وزر التنظيف الفوري */}
                          <div className="flex items-center gap-2 shrink-0">
                            {issue.fedshiCount > 0 && (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-[11px] border border-amber-300">
                                فد شي ({issue.fedshiCount})
                              </span>
                            )}
                            {issue.linksCount > 0 && (
                              <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-900 font-black text-[11px] border border-red-300">
                                روابط ({issue.linksCount})
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCleanProduct(issue)}
                              disabled={cleaningId === issue.productId}
                              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                              title="تنظيف وتحديث هذا المنتج فوراً في قاعدة البيانات"
                            >
                              {cleaningId === issue.productId ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>جاري الحفظ...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>تنظيف وتحديث</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setExpandedProductId(isExpanded ? null : issue.productId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                              title={isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* الروابط المكتشفة في هذا المنتج */}
                        {issue.detectedLinks.length > 0 && (
                          <div className="p-3 rounded-xl bg-red-50/70 border border-red-200/80 space-y-1">
                            <span className="text-[11px] font-black text-red-900 flex items-center gap-1">
                              <LinkIcon className="w-3 h-3 text-red-600" />
                              الروابط المكتشفة داخل هذا المنتج:
                            </span>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {issue.detectedLinks.map((link, lIdx) => (
                                <span 
                                  key={lIdx}
                                  className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white text-red-700 border border-red-200 dir-ltr select-all"
                                >
                                  {link}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* التفاصيل الموسعة (المقارنة بين الأصلي والمنظف) */}
                        {isExpanded && (
                          <div className="space-y-3 pt-2 border-t border-slate-100">
                            {issue.originalDescription && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-slate-500">الوصف الكامل الأصلي:</span>
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                    {issue.originalDescription}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[11px] font-black text-emerald-800">الوصف الكامل بعد التنظيف:</span>
                                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs text-slate-800 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                    {issue.cleanedDescription || <span className="text-slate-400 italic">لا يوجد نص</span>}
                                  </div>
                                </div>
                              </div>
                            )}

                            {issue.originalShortDescription && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <span className="text-[11px] font-bold text-slate-500">الوصف الترويجي / المختصر الأصلي:</span>
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                    {issue.originalShortDescription}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[11px] font-black text-emerald-800">الوصف الترويجي بعد التنظيف:</span>
                                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs text-slate-800 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                    {issue.cleanedShortDescription || <span className="text-slate-400 italic">لا يوجد نص</span>}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ذيل النافذة */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-semibold">
            أداة كاشف فد شي تضمن الحفاظ على خصوصية التاجر التامة وعدم تسرب أي روابط خارجية لزبائنه.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
