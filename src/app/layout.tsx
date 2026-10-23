import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "وصلي | المنصة العراقية للتسوق والتوصيل السريع",
  description: "اطلب من أفضل المتاجر والمطاعم والمنتجات في عموم العراق مع توصيل فوري ومباشر لباب منزلك.",
  keywords: ["وصلي", "توصيل العراق", "تسوق عراقي", "متاجر العراق", "تجارة إلكترونية عراقية", "توصيل سريع"],
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
