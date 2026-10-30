import crypto from 'crypto';
import {
  buildAdminWhatsAppOtpMessage,
  buildMerchantHelpMessage,
  evaluatePinStrength,
  getPhoneLookupVariants,
  getPinStrengthColor,
  getPinStrengthLabel,
  normalizeIraqiPhone,
  phonesMatch,
  toEnglishDigits,
  toIraqiLocalPhone,
  toWhatsAppNumber,
  validatePinFormat,
  type PinStrength,
} from '@/lib/merchantAuthShared';

export {
  buildAdminWhatsAppOtpMessage,
  buildMerchantHelpMessage,
  evaluatePinStrength,
  getPhoneLookupVariants,
  getPinStrengthColor,
  getPinStrengthLabel,
  normalizeIraqiPhone,
  phonesMatch,
  toEnglishDigits,
  toIraqiLocalPhone,
  toWhatsAppNumber,
  validatePinFormat,
};
export type { PinStrength };

const PIN_PEPPER = process.env.MERCHANT_PIN_PEPPER || 'wasli-merchant-pin-v1';

export function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(`${PIN_PEPPER}:${value}`).digest('hex');
}

export function generateOtpCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += String(crypto.randomInt(0, 10));
  }
  return code;
}

export function generateRecoveryToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function getAdminWhatsAppLink(): string | null {
  const raw = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || process.env.ADMIN_WHATSAPP || '';
  const num = toWhatsAppNumber(raw);
  return num ? `https://wa.me/${num}` : null;
}

export function getAdminTelegramLink(): string | null {
  const raw = (process.env.NEXT_PUBLIC_ADMIN_TELEGRAM || process.env.ADMIN_TELEGRAM || '').replace(/^@/, '');
  return raw ? `https://t.me/${raw}` : null;
}
