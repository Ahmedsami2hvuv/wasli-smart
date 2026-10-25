'use client';

import React, { useState } from 'react';
import { 
  Zap, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Link as LinkIcon, 
  ExternalLink,
  ClipboardPaste,
  Sparkles,
  ShoppingBag,
  DollarSign
} from 'lucide-react';

interface FedshiQuickImporterProps {
  onSuccess?: () => void;
}

export default function FedshiQuickImporter({ onSuccess }: FedshiQuickImporterProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const handlePaste = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) setInputUrl(text.trim());
      }
    } catch (e) {
      // تجاهل إذا كانت الأذونات غير متوفرة
    }
  };

  const handleImport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) {
      setError('يرجى لصق رابط المنتج أو كتابة كود المنتج أولاً');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessData(null);

    try {
      const response = await fetch('/api/admin/fedshi-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'فشل سحب المنتج من فدشي.');
      }

      setSuccessData(data);
      setInputUrl('');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء الاتصال بسيرفر فدشي');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-blue-700/40 relative overflow-hidden my-6">
      {/* خلفية تجميلية خفيفة */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-blue-200 shadow-inner">
              <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                أداة السحب السريع المباشر من فدشي
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-medium">
                  جديد وتلقائي
                </span>
              </h3>
              <p className="text-sm text-blue-200/80">
                الصق رابط أي منتج من فدشي وسيقوم النظام بسحبه وحفظه ونشره في تيليجرام فوراً
              </p>
            </div>
          </div>
        </div>

        {/* نموذج الإدخال */}
        <form onSubmit={handleImport} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-blue-300/70">
                <LinkIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                dir="ltr"
                placeholder="https://web.fedshi.com/products/AFAGO أو كود المنتج AFAGO"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                disabled={loading}
                className="w-full pl-24 pr-11 py-3.5 bg-slate-800/90 border border-blue-500/40 rounded-2xl text-white placeholder-blue-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={handlePaste}
                disabled={loading}
                className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs bg-blue-700/60 hover:bg-blue-600/80 text-blue-100 rounded-xl border border-blue-400/30 flex items-center gap-1.5 transition"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                لصق
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !inputUrl.trim()}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري السحب والنشر...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 rotate-180" />
                  <span>سحب ونشر بتيليجرام</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* رسائل التنبيه والأخطاء */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* بطاقة نجاح السحب */}
        {successData && (
          <div className="mt-4 p-5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-100 text-sm animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-200 text-base mb-1">
                    {successData.message}
                  </h4>
                  {successData.details && (
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-emerald-300/80">
                      <span className="bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        كود المورد: {successData.details.code}
                      </span>
                      <span className="bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        سعر الجملة: {Number(successData.details.wholesalePrice).toLocaleString('ar-IQ')} د.ع
                      </span>
                      <span className="bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        الربح المتوقع: {Number(successData.details.expectedProfit).toLocaleString('ar-IQ')} د.ع
                      </span>
                      <span className="bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        الصور: {successData.details.imagesCount} صورة
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {successData.product?.id && (
                <a
                  href={`/p/${successData.product.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 rounded-xl text-xs flex items-center gap-1.5 transition shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  معاينة المنتج
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
