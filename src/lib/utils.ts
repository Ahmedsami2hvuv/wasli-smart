import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIqd(amount?: number | null): string {
  const value = typeof amount === 'number' ? amount : 0;
  return `${value.toLocaleString("ar-IQ")} د.ع`;
}
