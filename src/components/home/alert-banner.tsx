"use client";

import { useState } from "react";
import Link from "next/link";
import type { BannerItemRow } from "@/lib/today-row";

// Khối ① — banner cảnh báo gộp: 🔴 quá hạn · 🤫 im lặng · 🔗 phối hợp trễ.
// Dark: 3 ô số lớn; bấm ô → xổ danh sách ngay tại chỗ, bấm dòng → nơi xử lý.
// Sạch cả 3 nhóm → 1 dòng xanh sage.

interface AlertBannerProps {
  overdue: BannerItemRow[];
  silent: BannerItemRow[];
  staleDeps: BannerItemRow[];
}

type SegmentKey = "overdue" | "silent" | "deps";

export function AlertBanner({ overdue, silent, staleDeps }: AlertBannerProps) {
  const [openSeg, setOpenSeg] = useState<SegmentKey | null>(null);

  const allSegments: {
    key: SegmentKey;
    icon: string;
    label: string;
    items: BannerItemRow[];
    numCls: string;
    // box khi mở = viền + nền tint theo trạng thái
    activeBoxCls: string;
  }[] = [
    {
      key: "overdue",
      icon: "🔴",
      label: "quá hạn",
      items: overdue,
      numCls: "text-critical",
      activeBoxCls: "border-critical/40 bg-critical/[0.06]",
    },
    {
      key: "silent",
      icon: "🤫",
      label: "im lặng",
      items: silent,
      numCls: "text-muted",
      activeBoxCls: "border-hair bg-panel-3",
    },
    {
      key: "deps",
      icon: "🔗",
      label: "phối hợp trễ",
      items: staleDeps,
      numCls: "text-gold",
      activeBoxCls: "border-gold/40 bg-gold/[0.05]",
    },
  ];
  const segments = allSegments.filter((s) => s.items.length > 0);

  if (segments.length === 0) {
    return (
      <p className="app-card px-4 py-3.5 text-sm font-medium text-good">
        🟢 Không có cảnh báo — mọi việc trong tầm kiểm soát
      </p>
    );
  }

  const active = segments.find((s) => s.key === openSeg);

  return (
    <div className="app-card overflow-hidden">
      <div className="flex flex-wrap gap-2.5 p-4">
        {segments.map((s) => {
          const isOpen = openSeg === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setOpenSeg(isOpen ? null : s.key)}
              aria-expanded={isOpen}
              className={`flex min-w-[150px] flex-1 items-center gap-2.5 rounded-[11px] border px-4 py-3 text-left transition-colors ${
                isOpen ? s.activeBoxCls : "border-hair bg-panel-2 hover:border-[#35353b]"
              }`}
            >
              <span
                className={`text-[22px] font-bold leading-none tabular-nums tracking-tight ${s.numCls}`}
              >
                {s.items.length}
              </span>
              <span className="text-[12.5px] text-muted">
                <span aria-hidden className="mr-1">
                  {s.icon}
                </span>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <ul className="max-h-64 overflow-y-auto border-t border-hair-soft p-1.5">
          {active.items.map((it) => (
            <li key={it.id}>
              <Link
                href={it.href}
                className="flex flex-wrap items-baseline gap-x-2 rounded-md px-2.5 py-1.5 hover:bg-panel-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                  {it.title}
                </span>
                <span className="whitespace-nowrap text-xs text-muted">
                  {it.sub}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
