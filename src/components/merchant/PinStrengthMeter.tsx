'use client';

import React from 'react';
import {
  evaluatePinStrength,
  getPinStrengthColor,
  getPinStrengthLabel,
  PinStrength,
} from '@/lib/merchantAuthShared';

export default function PinStrengthMeter({ pin }: { pin: string }) {
  if (!pin) return null;

  const strength: PinStrength = evaluatePinStrength(pin);
  const width = strength === 'strong' ? '100%' : strength === 'medium' ? '66%' : '33%';

  return (
    <div className="mt-2 space-y-1.5">
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getPinStrengthColor(strength)}`}
          style={{ width }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">قوة رمز الدخول</span>
        <span
          className={`font-bold ${
            strength === 'strong'
              ? 'text-emerald-700'
              : strength === 'medium'
                ? 'text-amber-700'
                : 'text-rose-700'
          }`}
        >
          {getPinStrengthLabel(strength)}
        </span>
      </div>
    </div>
  );
}
