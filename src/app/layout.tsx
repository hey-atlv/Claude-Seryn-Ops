import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  Cormorant_Garamond,
  Geist_Mono,
} from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { FloatingLauncher } from "@/components/floating/floating-launcher";
import "./globals.css";

// Font thương hiệu Seryn: body Be Vietnam Pro, heading Cormorant Garamond
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Seryn Marketing Ops",
  description:
    "Hệ thống quản lý công việc & dự án — Giám đốc Marketing Seryn",
};

// Đặt theme TRƯỚC khi paint để không chớp màu: SSR mặc định dark,
// script gỡ class nếu người dùng đã chọn light (localStorage["seryn-theme"]).
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("seryn-theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`dark ${beVietnam.variable} ${cormorant.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Theo docs Next "preventing-flash-before-hydration" mục Themes.
            React dev có thể log cảnh báo script-tag khi HMR re-render layout —
            noise dev-only, production không render lại root layout ở client. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
        <FloatingLauncher />
      </body>
    </html>
  );
}
