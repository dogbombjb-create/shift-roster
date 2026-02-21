import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "月間シフト表",
  description: "月間シフト管理システム",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning={true}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
