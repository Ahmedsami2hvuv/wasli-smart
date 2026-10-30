export type PinStrength = 'weak' | 'medium' | 'strong';

/** تحويل الأرقام العربية/الفارسية إلى إنجليزية قبل أي مقارنة */
export function toEnglishDigits(input: string): string {
  return String(input || '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)));
}

export function normalizeIraqiPhone(input: string): string {
  const digits = toEnglishDigits(input).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 10) return `964${digits}`;
  return digits;
}

/** الصيغة المحلية المعتمدة للتخزين: 07XXXXXXXXX */
export function toIraqiLocalPhone(input: string): string {
  const normalized = normalizeIraqiPhone(input);
  if (!normalized) return '';
  if (normalized.startsWith('964') && normalized.length >= 13) {
    return `0${normalized.slice(3)}`;
  }
  if (normalized.startsWith('7') && normalized.length === 10) {
    return `0${normalized}`;
  }
  return toEnglishDigits(input).replace(/\D/g, '');
}

export function getPhoneLookupVariants(input: string): string[] {
  const local = toIraqiLocalPhone(input);
  const normalized = normalizeIraqiPhone(input);
  const raw = toEnglishDigits(input).replace(/\D/g, '');
  const variants = [
    input.trim(),
    raw,
    local,
    normalized,
    normalized ? `+${normalized}` : '',
    normalized.startsWith('964') ? normalized.slice(3) : '',
  ].filter(Boolean);
  return Array.from(new Set(variants));
}

export function phonesMatch(a?: string | null, b?: string | null): boolean {
  const na = normalizeIraqiPhone(a || '');
  const nb = normalizeIraqiPhone(b || '');
  if (!na || !nb) return false;
  return na === nb || na.slice(-10) === nb.slice(-10);
}

export function toWhatsAppNumber(phone: string): string {
  return normalizeIraqiPhone(phone);
}

export function evaluatePinStrength(pin: string): PinStrength {
  const value = String(pin || '');
  if (value.length < 4) return 'weak';

  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 8) score += 1;
  if (/[0-9]/.test(value) && /[a-zA-Z\u0600-\u06FF]/.test(value)) score += 1;
  if (/[^0-9a-zA-Z\u0600-\u06FF]/.test(value)) score += 1;
  if (!/^(\d)\1+$/.test(value) && !['1234', '0000', '1111', '2222', '123456'].includes(value)) {
    score += 1;
  }

  if (score >= 3) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
}

export function validatePinFormat(pin: string): string | null {
  const value = String(pin || '').trim();
  if (value.length < 4) return 'رمز الدخول يجب أن يكون 4 خانات على الأقل';
  if (value.length > 32) return 'رمز الدخول طويل جداً';
  return null;
}

export function getPinStrengthLabel(strength: PinStrength): string {
  if (strength === 'strong') return 'قوي';
  if (strength === 'medium') return 'متوسط';
  return 'ضعيف';
}

export function getPinStrengthColor(strength: PinStrength): string {
  if (strength === 'strong') return 'bg-emerald-500';
  if (strength === 'medium') return 'bg-amber-500';
  return 'bg-rose-500';
}

export function buildAdminWhatsAppOtpMessage(otpCode: string, storeName?: string): string {
  const storePart = storeName ? ` لمتجر ${storeName}` : '';
  return `مرحباً، هذا رمز تأكيد الدخول الخاص بك في منصة وصلي${storePart}:\n\n${otpCode}\n\nالرمز صالح لمدة قصيرة. لا تشاركه مع أحد.`;
}

export function buildMerchantHelpMessage(phone: string): string {
  return `مرحباً، أنا أحاول تسجيل الدخول إلى حساب التاجر في منصة وصلي وأحتاج رمز التأكيد.\nرقمي: ${phone}\nيرجى إرسال رمز التأكيد عبر واتساب.`;
}
