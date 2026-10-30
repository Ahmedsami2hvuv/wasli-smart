'use client';

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
  id?: string;
  name?: string;
  /** لا تستخدم new-password حتى لا يظهر اقتراح كوكل لكلمة سر قوية */
  autoComplete?: string;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  className = '',
  id,
  name = 'merchant-access-pin',
  autoComplete = 'off',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [supportsMask, setSupportsMask] = useState(true);

  useEffect(() => {
    try {
      const ok =
        typeof CSS !== 'undefined' &&
        typeof CSS.supports === 'function' &&
        CSS.supports('-webkit-text-security', 'disc');
      setSupportsMask(Boolean(ok));
    } catch {
      setSupportsMask(false);
    }
  }, []);

  // نفضّل حقل نص مخفي بصرياً حتى ما يظهر اقتراح كوكل "باسوورد قوي"
  // والمتصفحات اللي ما تدعم الإخفاء البصري ترجع لحقل password العادي
  const inputType = visible ? 'text' : supportsMask ? 'text' : 'password';

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={inputType}
        inputMode="text"
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
        data-form-type="other"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={
          !visible && supportsMask
            ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)
            : undefined
        }
        className={`w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 text-slate-900 text-sm outline-none transition-all bg-white ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer min-w-[44px] justify-center"
        title={visible ? 'إخفاء الرمز' : 'إظهار الرمز'}
        aria-label={visible ? 'إخفاء الرمز' : 'إظهار الرمز'}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
