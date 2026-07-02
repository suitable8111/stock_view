import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock View — 글로벌 시황",
  description: "KOSPI · KOSDAQ · NASDAQ · S&P 500 실시간 시황",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
