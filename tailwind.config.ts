import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8", // الأزرق الأساسي
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#172554",
        },
        skybrand: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9", // الأزرق السماوي
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
          950: "#082F49",
        },
        accent: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B", // الأصفر الذهبي
          600: "#D97706",
          700: "#B45309",
        },
      },
      fontFamily: {
        cairo: ["var(--font-cairo)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -5px rgba(2, 132, 199, 0.08)",
        card: "0 4px 20px -2px rgba(15, 23, 42, 0.06)",
        hover: "0 20px 35px -5px rgba(14, 165, 233, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
