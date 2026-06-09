import type { Metadata } from "next";
import { Chakra_Petch } from "next/font/google";
import "./globals.css";

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
});

export const metadata: Metadata = {
  title: "星港 StarPort",
  description: "AI 时代的一站式应用、模型与 Agent 社交平台",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${chakra.variable} antialiased`}>
        <div className="atmosphere" />
        <div className="starfield" />
        {children}
      </body>
    </html>
  );
}
