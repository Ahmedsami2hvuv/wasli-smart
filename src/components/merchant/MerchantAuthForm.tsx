'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  KeyRound,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import PinStrengthMeter from '@/components/merchant/PinStrengthMeter';
import { buildMerchantHelpMessage, validatePinFormat } from '@/lib/merchantAuthShared';
import type { Store as StoreType } from '@/types';

type Mode = 'login' | 'recover-phone' | 'recover-wait' | 'recover-otp' | 'set-pin';

interface MerchantAuthFormProps {
  onSuccess: (store: StoreType) => void;
  showRegisterLink?: boolean;
  compact?: boolean;
  initialMode?: Mode;
  initialPhone?: string;
}

const HELP_UNLOCK_SECONDS = 300;

export default function MerchantAuthForm({
  onSuccess,
  showRegisterLink = true,
  initialMode = 'login',
  initialPhone = '',
}: MerchantAuthFormProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [phone, setPhone] = useState(initialPhone);
  const [pin, setPin] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [recoveredStore, setRecoveredStore] = useState<StoreType | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [waitStartedAt, setWaitStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [supportLinks, setSupportLinks] = useState<{ whatsapp: string | null; telegram: string | null }>({
    whatsapp: null,
    telegram: null,
  });

  useEffect(() => {
    if (mode !== 'recover-wait' && mode !== 'recover-otp') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [mode]);

  const secondsLeft = useMemo(() => {
    if (!waitStartedAt) return HELP_UNLOCK_SECONDS;
    const elapsed = Math.floor((now - waitStartedAt) / 1000);
    return Math.max(0, HELP_UNLOCK_SECONDS - elapsed);
  }, [waitStartedAt, now]);

  const helpUnlocked = secondsLeft <= 0;

  const resetMessages = () => {
    setErrorMessage('');
    setInfoMessage('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!phone.trim() || !pin.trim()) {
      setErrorMessage('أدخل رقم الهاتف ورمز الدخول');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/merchant/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
      });
      const data = await res.json();
      if (data.success && data.store) {
        onSuccess(data.store);
        return;
      }
      setErrorMessage(data.message || 'تعذر تسجيل الدخول');
      if (data.needsPinSetup) {
        setInfoMessage('يمكنك استرجاع الحساب عبر نسيت الرمز لإنشاء رمز دخول جديد.');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء محاولة الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!phone.trim()) {
      setErrorMessage('أدخل رقم هاتفك المسجّل');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/merchant/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.message || 'تعذر طلب الرمز');
        return;
      }
      setSupportLinks({
        whatsapp: data.support?.whatsapp || null,
        telegram: data.support?.telegram || null,
      });
      setWaitStartedAt(Date.now());
      setInfoMessage(data.message);
      setMode('recover-wait');
    } catch {
      setErrorMessage('تعذر الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!otpCode.trim()) {
      setErrorMessage('أدخل رمز التأكيد الذي وصلك');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/merchant/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otpCode: otpCode.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.message || 'رمز غير صحيح');
        return;
      }
      setRecoveryToken(data.recoveryToken);
      setRecoveredStore(data.store);
      setMode('set-pin');
      setInfoMessage('تم التحقق. احفظ رمز دخولك أو عيّن رمزاً جديداً.');
    } catch {
      setErrorMessage('تعذر التحقق من الرمز');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const pinErr = validatePinFormat(newPin);
    if (pinErr) {
      setErrorMessage(pinErr);
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMessage('تأكيد رمز الدخول غير متطابق');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/merchant/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          newPin: newPin.trim(),
          recoveryToken,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.message || 'تعذر حفظ الرمز');
        return;
      }
      onSuccess(data.store || recoveredStore);
    } catch {
      setErrorMessage('تعذر حفظ رمز الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const openHelpWhatsApp = () => {
    const base = supportLinks.whatsapp;
    if (!base || !helpUnlocked) return;
    const text = buildMerchantHelpMessage(phone.trim());
    window.open(`${base}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const openHelpTelegram = () => {
    if (!supportLinks.telegram || !helpUnlocked) return;
    window.open(supportLinks.telegram, '_blank', 'noopener,noreferrer');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4" dir="rtl">
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">رقم الهاتف المسجّل</label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  resetMessages();
                }}
                placeholder="07700000000"
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none text-left"
                dir="ltr"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">رمز الدخول</label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  resetMessages();
                }}
                placeholder="أدخل رمز الدخول"
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
          </div>

          {(errorMessage || infoMessage) && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                errorMessage
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage || infoMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-black text-sm shadow-md shadow-brand-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? 'جاري التحقق...' : (
              <>
                <span>دخول لحسابي</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              setMode('recover-phone');
            }}
            className="w-full text-xs font-bold text-sky-700 hover:text-sky-800 py-2 cursor-pointer"
          >
            نسيت رمز الدخول أو رابط المتجر؟
          </button>
        </form>
      )}

      {mode === 'recover-phone' && (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-right">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-900 leading-relaxed">
                اكتب رقم هاتفك المسجّل. سيصلك إشعار للإدارة لإرسال رمز تأكيد عبر واتساب.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">رقم الهاتف</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07700000000"
              className="w-full py-3 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 text-sm outline-none text-left"
              dir="ltr"
            />
          </div>
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4" />
            <span>{isLoading ? 'جاري إرسال الطلب...' : 'طلب رمز التأكيد'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className="w-full text-xs text-slate-500 hover:text-slate-700 py-2 cursor-pointer"
          >
            العودة لتسجيل الدخول
          </button>
        </form>
      )}

      {(mode === 'recover-wait' || mode === 'recover-otp') && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-right space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
              <span>تم إرسال الطلب للإدارة</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              {infoMessage ||
                'خلال 5 دقائق إن لم يصلك الرمز عبر واتساب، فعّل أزرار طلب المساعدة بالأسفل.'}
            </p>
            {!helpUnlocked && (
              <p className="text-[11px] font-bold text-amber-800">
                تفعيل أزرار المساعدة بعد: {formatTimer(secondsLeft)}
              </p>
            )}
          </div>

          <form
            onSubmit={handleVerifyOtp}
            className="space-y-3"
            onFocus={() => setMode('recover-otp')}
          >
            <label className="block text-xs font-bold text-slate-700">رمز التأكيد الواصل عبر واتساب</label>
            <input
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="XXXXXX"
              className="w-full py-3 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 text-center tracking-[0.35em] font-black text-lg outline-none"
              dir="ltr"
            />
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">{errorMessage}</div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] py-3.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-black text-sm disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? 'جاري التحقق...' : 'تأكيد الرمز والدخول'}
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!helpUnlocked || !supportLinks.whatsapp}
              onClick={openHelpWhatsApp}
              className="min-h-[44px] py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              طلب عبر واتساب
            </button>
            <button
              type="button"
              disabled={!helpUnlocked || !supportLinks.telegram}
              onClick={openHelpTelegram}
              className="min-h-[44px] py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
            >
              طلب عبر تليكرام
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMode('recover-phone')}
            className="w-full text-xs text-slate-500 py-2 cursor-pointer"
          >
            إعادة طلب الرمز برقم آخر
          </button>
        </div>
      )}

      {mode === 'set-pin' && (
        <form onSubmit={handleSetPin} className="space-y-4">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-right">
            <p className="text-xs text-emerald-900 leading-relaxed font-semibold">
              تم التحقق من حسابك
              {recoveredStore?.name ? ` (${recoveredStore.name})` : ''}. احفظ رمز الدخول أو عيّن رمزاً جديداً الآن.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">رمز الدخول الجديد</label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 text-sm outline-none"
              placeholder="4 خانات على الأقل"
            />
            <PinStrengthMeter pin={newPin} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">تأكيد رمز الدخول</label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 text-sm outline-none"
              placeholder="أعد كتابة الرمز"
            />
          </div>
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">{errorMessage}</div>
          )}
          <div className="grid grid-cols-1 gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] py-3.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-black text-sm disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? 'جاري الحفظ...' : 'حفظ رمز الدخول والدخول للحساب'}
            </button>
          </div>
        </form>
      )}

      {showRegisterLink && mode === 'login' && (
        <div className="pt-3 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 mb-2">ليس لديك متجر بعد؟</p>
          <Link
            href="/register-store"
            className="inline-flex items-center gap-1.5 text-xs font-black text-brand-700 hover:text-brand-800"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>أنشئ متجرك مجاناً وابدأ تجارتك الآن</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export function MerchantAuthHeader() {
  return (
    <div className="text-center mb-2">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-skybrand-500 flex items-center justify-center text-white shadow-md shadow-brand-700/20 mx-auto mb-4">
        <Store className="w-7 h-7" />
      </div>
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5">دخول حساب التاجر</h2>
      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
        أدخل رقم هاتفك ورمز الدخول لفتح صفحة التاجر ومتابعة طلباتك وأرباحك
      </p>
    </div>
  );
}
