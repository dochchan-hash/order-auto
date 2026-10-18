import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "아파트 한눈에 | 단지·평형·매매가 조회",
  description: "아파트 이름으로 평수, 타입, 준공년도, 최근 매매 실거래와 시세를 함께 확인하세요.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
