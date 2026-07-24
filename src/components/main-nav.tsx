"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BookOpen,
  CalendarClock,
  CheckSquare,
  ChevronDown,
  FileDown,
  Link2,
  MoonStar,
  Settings,
  StickyNote,
  Sun,
} from "lucide-react";

// Nav 3 mục + menu "Khác ▾" (phương án 15 phút) — mọi route cũ giữ nguyên.

const MAIN_ITEMS = [
  { href: "/", label: "Hôm nay", icon: Sun },
  { href: "/tasks", label: "Công việc", icon: CheckSquare },
  { href: "/notes", label: "Ghi chú", icon: StickyNote },
];

const MORE_ITEMS = [
  { href: "/dependencies", label: "Phối hợp", icon: Link2 },
  { href: "/reports", label: "Báo cáo", icon: CalendarClock },
  { href: "/sop", label: "SOP", icon: BookOpen },
  { href: "/daily-summary", label: "Cuối ngày", icon: MoonStar },
  { href: "/assistant", label: "Trợ lý AI", icon: Bot },
  { href: "/import", label: "Import", icon: FileDown },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

// Active = accent gold brand (không còn khối navy đặc kiểu admin template)
const activeCls =
  "bg-gold/15 text-brand-800 font-semibold dark:bg-gold/15 dark:text-gold";
const idleCls =
  "text-zinc-600 hover:bg-brand-50 hover:text-brand-800 dark:text-zinc-300 dark:hover:bg-brand-950/60 dark:hover:text-brand-300";

export function MainNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Đổi trang thì đóng dropdown — adjust state during render, không dùng effect
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMoreOpen(false);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const moreActive = MORE_ITEMS.some((it) => isActive(it.href));

  return (
    <nav className="flex flex-1 items-center gap-1 text-sm">
      {MAIN_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition-colors ${
            isActive(href) ? activeCls : idleCls
          }`}
        >
          <Icon size={15} strokeWidth={2.25} aria-hidden />
          {label}
        </Link>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          className={`flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition-colors ${
            moreActive ? activeCls : idleCls
          }`}
        >
          Khác
          <ChevronDown
            size={14}
            strokeWidth={2.25}
            aria-hidden
            className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
          />
        </button>

        {moreOpen && (
          <>
            {/* Backdrop bắt click ra ngoài để đóng menu */}
            <button
              type="button"
              aria-label="Đóng menu"
              tabIndex={-1}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <div
              role="menu"
              className="absolute left-0 top-full z-40 mt-1 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            >
              {MORE_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 font-medium ${
                    isActive(href)
                      ? "bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300"
                      : idleCls
                  }`}
                >
                  <Icon size={15} strokeWidth={2.25} aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
