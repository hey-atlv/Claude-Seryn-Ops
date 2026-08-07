"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckSquare,
  Link2,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

// Sidebar shell dark (thay top-nav "Khác ▾"). Desktop: cột cố định trái.
// Mobile: top-bar + drawer trượt. Chỉ còn điều hướng — thao tác nhanh đã nằm
// ở 2 nút nổi góc dưới phải (FloatingLauncher).

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Hôm nay", icon: Sun },
  { href: "/tasks", label: "Công việc", icon: CheckSquare },
  { href: "/workspace", label: "Sổ tay", icon: NotebookPen },
  { href: "/ops", label: "Phối hợp & Báo cáo", icon: Link2 },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Chỉ 1 mục được sáng. Với route lồng nhau thì nhiều mục cùng khớp prefix —
 * chọn href dài nhất, tức mục cụ thể nhất.
 */
function activeHref(pathname: string, items: NavItem[]): string | null {
  return items.reduce<string | null>(
    (best, item) =>
      isActivePath(pathname, item.href) &&
      (best === null || item.href.length > best.length)
        ? item.href
        : best,
    null,
  );
}

function Brand() {
  return (
    <span className="flex select-none items-center gap-2.5 whitespace-nowrap text-[16px] font-bold tracking-wide text-bright">
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_0_4px_rgba(201,177,132,0.16)]" />
      Seryn Ops
    </span>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeHref(pathname, NAV_ITEMS);

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === current;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13.5px] transition-colors ${
              active
                ? "bg-gold/[0.11] font-semibold text-gold-text"
                : "text-dim hover:bg-panel-2 hover:text-text"
            }`}
          >
            <Icon size={16} strokeWidth={2.1} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13.5px] text-dim transition-colors hover:bg-panel-2 hover:text-text"
    >
      <LogOut size={16} strokeWidth={2.1} aria-hidden />
      Đăng xuất
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 mt-1 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
      {children}
    </div>
  );
}

/** Nội dung sidebar dùng chung cho cả desktop lẫn drawer mobile. */
function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <div className="rounded-[14px] border border-hair bg-panel p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Brand />
            <p className="mt-1 text-xs text-muted">Bảng điều hành Marketing</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-hair bg-panel p-4">
        <SectionLabel>🧭 Điều hướng</SectionLabel>
        <SidebarNav onNavigate={onNavigate} />
      </div>

      <div className="mt-auto rounded-[14px] border border-hair bg-panel p-2">
        <LogoutButton />
      </div>
    </div>
  );
}

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Đổi trang thì đóng drawer — adjust state during render, không dùng effect.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setDrawerOpen(false);
  }

  return (
    <>
      {/* ── Desktop: cột cố định ── */}
      <aside className="sticky top-0 hidden h-screen w-[264px] flex-none border-r border-hair-soft lg:block">
        <SidebarBody />
      </aside>

      {/* ── Mobile: top bar ── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hair-soft bg-bg/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Mở điều hướng"
          className="grid h-9 w-9 place-items-center rounded-lg border border-hair text-dim hover:bg-panel-2 hover:text-text"
        >
          <Menu size={18} aria-hidden />
        </button>
        <Brand />
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </header>

      {/* ── Mobile: drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Đóng điều hướng"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-hair-soft bg-bg shadow-elevated">
            <div className="flex items-center justify-end p-3 pb-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Đóng"
                className="grid h-9 w-9 place-items-center rounded-lg text-dim hover:bg-panel-2 hover:text-text"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <SidebarBody onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
