"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { HealthTaskItem } from "@/lib/metrics";
import type { NotifyItem } from "@/lib/notify-core";

// Dải sức khỏe — 4 chỉ số vận hành nằm cố định trên đầu màn hình, không phải
// đổi tab mới thấy. Ba chỉ số có danh sách kèm theo thì bấm vào bung ra ngay
// dưới dải, nên phần tổng quan vẫn gọn khi mọi thứ đang ổn.

type Tone = "good" | "warn" | "bad" | "neutral";

const VALUE_TONE: Record<Tone, string> = {
  good: "text-good",
  warn: "text-amber-400",
  bad: "text-critical",
  neutral: "text-text",
};

type DetailKey = "review" | "silent" | "dep";

interface HealthStripProps {
  doneRate: { pct: number | null; onTime: number; total: number };
  reviewStuck: HealthTaskItem[];
  silentTasks: HealthTaskItem[];
  depSlaBreached: NotifyItem[];
  reviewStuckDays: number;
  silentDays: number;
}

function countTone(n: number, bad?: boolean): Tone {
  if (n === 0) return "good";
  return bad ? "bad" : "warn";
}

function doneRateTone(pct: number | null): Tone {
  if (pct === null) return "neutral";
  if (pct >= 80) return "good";
  return pct >= 50 ? "warn" : "bad";
}

/** Ô chỉ số. Có `onClick` thì thành nút bung danh sách, không thì là thẻ tĩnh. */
function Kpi({
  label,
  value,
  hint,
  tone,
  open,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  tone: Tone;
  open?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-dim">
        {label}
        {onClick && (
          <ChevronDown
            size={13}
            strokeWidth={2.5}
            aria-hidden
            className={`ml-auto transition-transform ${open ? "rotate-180 text-gold" : ""}`}
          />
        )}
      </p>
      <p
        className={`mt-1.5 text-[28px] font-bold leading-none ${VALUE_TONE[tone]}`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[12px] text-muted">{hint}</p>
    </>
  );

  const shell = `rounded-[13px] border p-3.5 text-left transition-colors ${
    open ? "border-gold bg-panel-2" : "border-hair bg-panel hover:border-[#35353b]"
  }`;

  if (!onClick) {
    return <div className={shell}>{body}</div>;
  }
  return (
    <button type="button" onClick={onClick} aria-expanded={open} className={shell}>
      {body}
    </button>
  );
}

function TaskLines({ items, empty }: { items: HealthTaskItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-[13px] text-muted">{empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((t) => (
        <li key={t.id}>
          <Link
            href="/tasks"
            className="flex items-center justify-between gap-3 rounded-[9px] border border-hair bg-panel-2 px-3 py-2 text-[13.5px] text-text transition-colors hover:border-gold"
          >
            <span className="min-w-0 truncate">
              {t.title}
              {t.leader && <span className="text-dim"> · {t.leader}</span>}
            </span>
            <span className="shrink-0 font-semibold text-amber-400">
              {t.days} ngày
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DepLines({ items }: { items: NotifyItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[13px] text-muted">Không có phối hợp nào trễ SLA 👏</p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((d) => (
        <li key={d.id}>
          <Link
            href={d.href || "/ops?tab=deps"}
            className="flex flex-col gap-0.5 rounded-[9px] border border-hair bg-panel-2 px-3 py-2 text-[13.5px] text-text transition-colors hover:border-gold"
          >
            <span className="truncate">{d.title}</span>
            {d.detail && (
              <span className="text-[12.5px] text-dim">{d.detail}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HealthStrip({
  doneRate,
  reviewStuck,
  silentTasks,
  depSlaBreached,
  reviewStuckDays,
  silentDays,
}: HealthStripProps) {
  const [detail, setDetail] = useState<DetailKey | null>(null);
  const toggle = (k: DetailKey) => setDetail((cur) => (cur === k ? null : k));

  return (
    <section>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi
          label="Đúng hạn"
          value={doneRate.pct === null ? "—" : `${doneRate.pct}%`}
          hint={
            doneRate.total === 0
              ? "Chưa đủ dữ liệu"
              : `${doneRate.onTime}/${doneRate.total} task có deadline`
          }
          tone={doneRateTone(doneRate.pct)}
        />
        <Kpi
          label={`Kẹt duyệt >${reviewStuckDays}n`}
          value={String(reviewStuck.length)}
          hint="Chờ sếp quyết quá lâu"
          tone={countTone(reviewStuck.length)}
          open={detail === "review"}
          onClick={() => toggle("review")}
        />
        <Kpi
          label="Phối hợp trễ SLA"
          value={String(depSlaBreached.length)}
          hint="Quá hạn cần kết quả"
          tone={countTone(depSlaBreached.length, true)}
          open={detail === "dep"}
          onClick={() => toggle("dep")}
        />
        <Kpi
          label={`Im lặng >${silentDays}n`}
          value={String(silentTasks.length)}
          hint="Đang làm nhưng bặt tin"
          tone={countTone(silentTasks.length)}
          open={detail === "silent"}
          onClick={() => toggle("silent")}
        />
      </div>

      {detail && (
        <div className="mt-2.5 rounded-[13px] border border-gold/40 bg-panel p-3.5">
          {detail === "review" && (
            <TaskLines
              items={reviewStuck}
              empty="Không có task nào kẹt ở Review 👏"
            />
          )}
          {detail === "silent" && (
            <TaskLines items={silentTasks} empty="Không có task nào im lặng 👏" />
          )}
          {detail === "dep" && <DepLines items={depSlaBreached} />}
        </div>
      )}
    </section>
  );
}
