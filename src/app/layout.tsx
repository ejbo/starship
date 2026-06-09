import type { Metadata } from "next";
import { Chakra_Petch } from "next/font/google";
import { GlobalNav } from "@/components/global-nav";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/catalog";
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
  const user = getCurrentUser();
  return (
    <html lang="zh-CN">
      <body className={`${chakra.variable} antialiased`}>
        <div className="atmosphere" />
        <div className="starfield" />
        <GlobalNav userName={user.name} userHue={user.avatarHue} tokenBalance={user.tokenBalance} />
        <div className="min-h-[70vh]">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
