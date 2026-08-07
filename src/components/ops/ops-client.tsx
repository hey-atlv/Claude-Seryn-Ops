"use client";

import { useEffect, useState } from "react";
import { BookOpen, CalendarClock, Link2 } from "lucide-react";
import { DepsClient } from "@/components/deps/deps-client";
import { ReportsClient } from "@/components/reports/reports-client";
import { SopClient, type SopRow } from "@/components/sop/sop-client";
import type { DepRow } from "@/lib/dep-row";
import type { ReportRow } from "@/lib/report-row";

// Phối hợp & Báo cáo — gộp Phối hợp liên phòng, SOP và Báo cáo ban lãnh đạo
// vào 1 trang, 3 sub-tab. Cả 3 đều là việc đối ngoại giữa các phòng: cam kết,
// quy trình chuẩn, và thứ trình lên trên. Tab "Phối hợp" vẫn giữ 3 view con
// của riêng nó (Board/Trễ hạn/Ngoài quy trình) vì đó là cách xem, không phải
// nội dung khác.

const TABS = [
  { key: "deps", label: "Phối hợp", icon: Link2 },
  { key: "sop", label: "SOP", icon: BookOpen },
  { key: "reports", label: "Báo cáo", icon: CalendarClock },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const isTabKey = (v: string | undefined): v is TabKey =>
  TABS.some((t) => t.key === v);

const SUBTITLES: Record<TabKey, string> = {
  deps: "Cam kết liên phòng — ai chờ ai, việc nào trễ, việc nào đi ngoài quy trình.",
  sop: "Quy trình chuẩn và mẫu tài liệu — viết bằng markdown, sửa tại chỗ.",
  reports:
    "Báo cáo tuần/tháng trình ban lãnh đạo — tự sinh theo lịch, gửi khi duyệt.",
};

interface OpsClientProps {
  deps: DepRow[];
  docs: SopRow[];
  reports: ReportRow[];
  initialTab?: string;
}

export function OpsClient({ deps, docs, reports, initialTab }: OpsClientProps) {
  const [tab, setTab] = useState<TabKey>(
    isTabKey(initialTab) ? initialTab : "deps",
  );

  // Giữ URL khớp tab để share hoặc F5 quay lại đúng chỗ (shallow, không gọi server)
  useEffect(() => {
    const qs = tab === "deps" ? "" : `?tab=${tab}`;
    window.history.replaceState(null, "", `/ops${qs}`);
  }, [tab]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Phối hợp &amp; Báo cáo
        </h1>
        <p className="mt-1 text-sm text-dim">{SUBTITLES[tab]}</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-brand-600 bg-brand-50/60 text-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
                : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <t.icon size={14} strokeWidth={2.25} aria-hidden />
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "deps" && <DepsClient deps={deps} />}
      {tab === "sop" && <SopClient docs={docs} />}
      {tab === "reports" && <ReportsClient reports={reports} />}
    </div>
  );
}
