import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "太阳系轨道探险 | Solar System Game",
  description: "基于手绘太阳系轨道图的互动网页游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
