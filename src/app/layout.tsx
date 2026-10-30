import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-cairo",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "وصلي | منصة التجارة الذكية والدروب شيبينغ في العراق",
  description: "أنشئ متجرك مجاناً وابدأ البيع بدون رأس مال. منصة وصلي تتولى التخزين والشحن والتحصيل في كافة محافظات العراق، وأنت تربح من فرق السعر.",
  keywords: ["وصلي", "دروب شيبينغ العراق", "تجارة ذكية", "متجر إلكتروني بدون رأس مال", "تجارة إلكترونية عراقية", "بيع أونلاين العراق"],
  authors: [{ name: "فريق منصة وصلي" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1D4ED8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable}`}>
      <body className="font-cairo bg-slate-50 text-slate-900 antialiased selection:bg-skybrand-100 selection:text-brand-800">
        {children}
      </body>
    </html>
  );
}
