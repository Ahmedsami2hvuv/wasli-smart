'use client';

import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  HelpCircle, 
  Layers, 
  Package, 
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Info
} from 'lucide-react';
import Link from 'next/link';

interface BotInfo {
  id: number;
  name: string;
  username: string;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  wholesale_price_iqd?: number;
  images?: string[];
  category?: string;
}

export default function TelegramManagerPage() {
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [postingProductId, setPostingProductId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // جلب الحالة المبدئية والمنتجات
  useEffect(() => {
    fetchInitialStatus();
    fetchRecentProducts();
  }, []);

  const fetchInitialStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/telegram');
      const data = await res.json();
      if (data.configured && data.botInfo) {
        setBotInfo(data.botInfo);
        if (data.channelId) setChannelId(data.channelId);
      }
    } catch (err) {
      console.error('خطأ في جلب حالة التيليجرام:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products.slice(0, 10));
      }
    } catch (err) {
      console.error('خطأ في جلب المنتجات:', err);
    }
  };

  // تفعيل الويب هوك والرد التلقائي على /start
  const handleSetupWebhook = async () => {
    try {
      setActionLoading('setup_webhook');
      setStatusMsg(null);
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup_webhook',
          botToken: botToken.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatusMsg({ text: data.message, type: 'success' });
      } else {
        setStatusMsg({ text: data.error, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: 'خطأ: ' + err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // 1. فحص التوكن
  const handleTestBot = async () => {
    if (!botToken.trim() && !botInfo) {
      setStatusMsg({ text: 'يرجى كتابة رمز التوكن (Bot Token) أولاً في الحقل أدناه.', type: 'error' });
      return;
    }

    try {
      setActionLoading('test_bot');
      setStatusMsg(null);
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_bot',
          botToken: botToken.trim(),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setBotInfo({
          id: data.bot.id,
          name: data.bot.first_name,
          username: data.bot.username,
        });
        setStatusMsg({ text: data.message, type: 'success' });
      } else {
        setStatusMsg({ text: data.error, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: 'تعذر فحص البوت: ' + err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // 2. فحص القناة
  const handleCheckChannel = async () => {
    if (!channelId.trim()) {
      setStatusMsg({ text: 'يرجى كتابة معرف القناة أولاً (مثال: @اسم_القناة أو -100xxxxxxxxxx).', type: 'error' });
      return;
    }

    try {
      setActionLoading('check_channel');
      setStatusMsg(null);
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_channel',
          botToken: botToken.trim(),
          channelId: channelId.trim(),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setStatusMsg({ text: data.message, type: 'success' });
      } else {
        setStatusMsg({ text: data.error, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: 'تعذر فحص القناة: ' + err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // 3. تيست نشر منشور تجريبي
  const handleTestPost = async () => {
    if (!channelId.trim()) {
      setStatusMsg({ text: 'يرجى إدخال معرف القناة لإرسال الاختبار إليها.', type: 'error' });
      return;
    }

    try {
      setActionLoading('test_post');
      setStatusMsg(null);
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_post',
          botToken: botToken.trim(),
          channelId: channelId.trim(),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setStatusMsg({ text: data.message, type: 'success' });
      } else {
        setStatusMsg({ text: data.error, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: 'تعذر إرسال النشر التجريبي: ' + err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // 4. نشر منتج حقيقي إلى القناة
  const handlePublishProduct = async (prodId: string) => {
    try {
      setPostingProductId(prodId);
      setStatusMsg(null);
      const res = await fetch('/api/admin/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post_product',
          botToken: botToken.trim(),
          channelId: channelId.trim(),
          productId: prodId,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setStatusMsg({ text: data.message, type: 'success' });
      } else {
        setStatusMsg({ text: data.error, type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: 'تعذر نشر المنتج: ' + err.message, type: 'error' });
    } finally {
      setPostingProductId(null);
    }
  };

  const copyToClipboard = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 pb-24" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* الترويسة وأزرار التنقل */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">لوحة الإدارة - قناة التيليجرام</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
              <Send className="w-7 h-7 text-sky-600" />
              <span>إعدادات وفحص نشر التيليجرام</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ربط ونشر المنتجات المستوردة تلقائياً في قناتك على تيليجرام مع فحص مباشر للأخطاء وتجربة النشر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/waahhlstor/products"
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <Package className="w-4 h-4 text-slate-500" />
              <span>إدارة المنتجات</span>
            </Link>
            <Link
              href="/waahhlstor"
              className="py-2.5 px-4 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرئيسية</span>
            </Link>
          </div>
        </div>

        {/* تنبيه مهم بخصوص: ليش البوت ميرد ع ستارت؟ */}
        <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-sky-950">
              <div className="font-black text-sky-900">
                ملاحظة مهمة: لماذا لا يرد البوت عند إرسال كلمة (start) في الخاص؟
              </div>
              <p className="text-xs text-sky-800 leading-relaxed">
                البوت في التيليجرام لا يرد تلقائياً في المحادثات الخاصة إلا إذا تم ربطه بمستمع للردود الآلية. ولكن <strong>وظيفة البوت الأساسية في منصة وصلي هي النشر التلقائي في القناة كمسؤول (Admin)</strong>، لذلك هو لا يحتاج للرد على الرسائل الخاصة لكي ينشر في القناة بنجاح. بمجرد إضافة البوت مشرفاً في قناتك وتزويدنا بالتوكن، سينشر كل المنتجات بدون أي مشكلة!
              </p>
            </div>
          </div>
        </div>

        {/* بطاقة إعدادات البوت والقناة وأزرار التيست */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-brand-700" />
              <h2 className="text-lg font-black text-slate-900">بيانات الربط مع تيليجرام</h2>
            </div>
            {botInfo && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                متصل: @{botInfo.username}
              </span>
            )}
          </div>

          {/* رسائل التنبيه والنتائج */}
          {statusMsg && (
            <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
              statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              statusMsg.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="font-bold leading-relaxed">{statusMsg.text}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* حقل التوكن */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                رمز البوت توكن (Bot Token) من BotFather
              </label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={botInfo ? 'رمز البوت محفوظ حالياً، اكتب رمزاً جديداً لتغييره' : 'مثال: 7892345678:AAHjkl123456...'}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-500">
                الرمز الذي يرسله لك البوت الرسمي (@BotFather) عند إنشاء البوت.
              </p>
            </div>

            {/* حقل معرف القناة */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                معرّف القناة (Channel ID أو Username)
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="مثال: @اسم_قناتك أو -1001234567890"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-500">
                معرف القناة العام مثل <span className="font-mono">@WasliStore</span> أو الآيدي الرقمي للقناة الخاصة.
              </p>
            </div>
          </div>

          {/* أزرار الفحص والتجربة المباشرة */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSetupWebhook}
              disabled={actionLoading !== null}
              className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'setup_webhook' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4 text-indigo-200" />}
              <span>تفعيل زر Start والرد التلقائي</span>
            </button>

            {botInfo && (
              <a
                href={`https://t.me/${botInfo.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4 text-sky-600" />
                <span>فتح محادثة البوت (@{botInfo.username})</span>
              </a>
            )}

            <button
              onClick={handleTestBot}
              disabled={actionLoading !== null}
              className="py-3 px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'test_bot' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4 text-sky-400" />}
              <span>فحص رمز البوت والتحقق</span>
            </button>

            <button
              onClick={handleCheckChannel}
              disabled={actionLoading !== null}
              className="py-3 px-5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'check_channel' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-sky-200" />}
              <span>فحص صلاحيات البوت في القناة</span>
            </button>

            <button
              onClick={handleTestPost}
              disabled={actionLoading !== null}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'test_post' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-200" />}
              <span>تيست نشر منشور تجريبي بالقناة</span>
            </button>
          </div>
        </div>

        {/* دليل الخطوات الثلاث السريعة للضبط */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-500" />
            <span>خطوات تفعيل النشر في القناة في دقيقة واحدة:</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="w-6 h-6 rounded-full bg-brand-700 text-white font-bold flex items-center justify-center text-xs">
                1
              </div>
              <div className="font-bold text-slate-800">إنشاء البوت في BotFather</div>
              <p className="text-slate-600 leading-relaxed">
                ادخل إلى <span className="font-mono text-brand-700">@BotFather</span> في تيليجرام واكتب <span className="font-mono">/newbot</span> وسمّه كما تشاء، وانسخ الرمز السري (HTTP API Token).
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="w-6 h-6 rounded-full bg-brand-700 text-white font-bold flex items-center justify-center text-xs">
                2
              </div>
              <div className="font-bold text-slate-800">إضافة البوت مشرفاً للقناة</div>
              <p className="text-slate-600 leading-relaxed">
                افتح قناتك في تيليجرام واذهب للمشرفين (Administrators) واضغط إضافة مشرف، وابحث عن يوزر البوت وأضفه مع تفعيل صلاحية (نشر الرسائل - Post Messages).
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="w-6 h-6 rounded-full bg-brand-700 text-white font-bold flex items-center justify-center text-xs">
                3
              </div>
              <div className="font-bold text-slate-800">لصق البيانات وتجربة النشر</div>
              <p className="text-slate-600 leading-relaxed">
                الصق الرمز ومعرف القناة في الحقول أعلاه واضغط على زر «تيست نشر منشور تجريبي»، وسيصلك المنشور بالقناة فوراً!
              </p>
            </div>
          </div>
        </div>

        {/* قسم تجربة نشر أي منتج من منتجات الموقع إلى القناة */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-700" />
                <span>نشر منتج فعلي إلى قناة تيليجرام</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك الضغط على زر "نشر بالقناة" أمام أي منتج من منتجاتك لإرساله للقناة بالصور والأسعار.
              </p>
            </div>
            <Link
              href="/waahhlstor/products"
              className="text-xs font-bold text-brand-700 hover:text-brand-800 transition-colors"
            >
              عرض كافة المنتجات
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                لا توجد منتجات مسجلة حالياً لعرضها.
              </div>
            ) : (
              products.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.images && p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-500">
                        الجملة: {(p.wholesale_price_iqd || p.price).toLocaleString('ar-IQ')} د.ع | القسم: {p.category || 'عام'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePublishProduct(p.id)}
                      disabled={postingProductId === p.id}
                      className="py-2 px-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {postingProductId === p.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>نشر بالقناة</span>
                    </button>
                    
                    <a
                      href={`/p/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>معاينة</span>
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
