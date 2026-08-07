"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MoonStar, Sun } from "lucide-react";

// Hai nhịp của một ngày: sáng mở máy xem phải làm gì, tối đóng máy xem còn tồn
// gì và mai làm gì. Nội dung của cả hai được render sẵn ở server rồi truyền
// xuống dưới dạng ReactNode — đổi tab không cần gọi lại server.

const TABS = [
  { key: "today", label: "Hôm nay", icon: Sun },
  { key: "closing", label: "Cuối ngày", icon: MoonStar },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const isTabKey = (v: string | undefined): v is TabKey =>
  TABS.some((t) => t.key === v);

interface DayTabsProps {
  today: ReactNode;
  closing: ReactNode;
  initialTab?: string;
}

export function DayTabs({ today, closing, initialTab }: DayTabsProps) {
  const [tab, setTab] = useState<TabKey>(
    isTabKey(initialTab) ? initialTab : "today",
  );

  // Giữ URL khớp tab để share hoặc F5 quay lại đúng chỗ (shallow, không gọi server)
  useEffect(() => {
    const qs = tab === "today" ? "" : `?tab=${tab}`;
    window.history.replaceState(null, "", `/${qs}`);
  }, [tab]);

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto border-b border-hair-soft pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-gold text-[#e4d4ae]"
                : "border-transparent text-dim hover:text-text"
            }`}
          >
            <t.icon size={15} strokeWidth={2.25} aria-hidden />
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "today" ? today : closing}
    </div>
  );
}
