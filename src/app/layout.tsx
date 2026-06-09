import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "星港 StarPort",
  description: "AI 时代的一站式应用与 Agent 社交平台",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
