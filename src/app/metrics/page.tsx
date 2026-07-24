import Link from "next/link";
import { Activity, Clock, Link2, MoonStar } from "lucide-react";
import { SILENT_TASK_DAYS } from "@/lib/constants";
import { getHealthMetrics, type HealthTaskItem } from "@/lib/metrics";
import { REVIEW_STUCK_DAYS } from "@/lib/metrics-core";
import type { NotifyItem } from "@/lib/notify-core";

export const dynamic = "force-dynamic";

// Trang "Sức khỏe hệ thống" — 4 chỉ số vận hành tự đo (Phase 2).

interface KpiProps {
  label: string;
  value: string;
  hint: string;
  tone: "good" | "warn" | "bad" | "neutral";
}

const TONE: Record<KpiProps["tone"], string> = {
  good: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-red-400",
  neutral: "text-text",
};

function Kpi({ label, value, hint, tone }: KpiProps) {
  return (
    <div className="rounded-[14px] border border-hair bg-panel p-4">
      <p className="text-[12px] font-medium uppercase tracking-wide text-dim">
        {label}
      </p>
      <p className={`mt-1.5 text-3xl font-bold ${TONE[tone]}`}>{value}</p>
      <p className="mt-1 text-[12.5px] text-muted">{hint}</p>
    </div>
  );
}

function TaskList({
  items,
  href,
  empty,
}: {
  items: HealthTaskItem[];
  href: string;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-[13px] text-muted">{empty}</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((t) => (
        <li key={t.id}>
          <Link
            href={href}
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

function DepList({ items }: { items: NotifyItem[] }) {
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
            href={d.href ?? "/dependencies"}
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

export default async function MetricsPage() {
  const m = await getHealthMetrics(new Date());

  const doneValue = m.doneRate.pct === null ? "—" : `${m.doneRate.pct}%`;
  const doneTone: KpiProps["tone"] =
    m.doneRate.pct === null
      ? "neutral"
      : m.doneRate.pct >= 80
        ? "good"
        : m.doneRate.pct >= 50
          ? "warn"
          : "bad";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <Activity
            size={22}
            strokeWidth={2.25}
            aria-hidden
            className="text-gold"
          />
          Sức khỏe hệ thống
        </h1>
        <p className="mt-1 text-sm text-dim">
          Chỉ số vận hành tự đo — {m.openTaskCount} việc đang mở
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Hoàn thành đúng hạn"
          value={doneValue}
          hint={
            m.doneRate.total === 0
              ? "Chưa đủ dữ liệu"
              : `${m.doneRate.onTime}/${m.doneRate.total} task có deadline`
          }
          tone={doneTone}
        />
        <Kpi
          label={`Kẹt duyệt (>${REVIEW_STUCK_DAYS} ngày)`}
          value={String(m.reviewStuck.length)}
          hint="Task ở Review chờ sếp quyết"
          tone={m.reviewStuck.length > 0 ? "warn" : "good"}
        />
        <Kpi
          label="Phối hợp trễ SLA"
          value={String(m.depSlaBreached.length)}
          hint="Dependency quá hạn cần kết quả"
          tone={m.depSlaBreached.length > 0 ? "bad" : "good"}
        />
        <Kpi
          label={`Im lặng (>${SILENT_TASK_DAYS} ngày)`}
          value={String(m.silentTasks.length)}
          hint="Đang làm nhưng không có update"
          tone={m.silentTasks.length > 0 ? "warn" : "good"}
        />
      </section>

      <section className="rounded-[14px] border border-hair bg-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text">
          <Clock
            size={17}
            strokeWidth={2.25}
            aria-hidden
            className="text-amber-400"
          />
          Kẹt duyệt — chờ sếp quyết ({m.reviewStuck.length})
        </h2>
        <TaskList
          items={m.reviewStuck}
          href="/tasks"
          empty="Không có task nào kẹt ở Review 👏"
        />
      </section>

      <section className="rounded-[14px] border border-hair bg-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text">
          <MoonStar
            size={17}
            strokeWidth={2.25}
            aria-hidden
            className="text-amber-400"
          />
          Task im lặng — cần hỏi leader ({m.silentTasks.length})
        </h2>
        <TaskList
          items={m.silentTasks}
          href="/tasks"
          empty="Không có task nào im lặng 👏"
        />
      </section>

      <section className="rounded-[14px] border border-hair bg-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text">
          <Link2
            size={17}
            strokeWidth={2.25}
            aria-hidden
            className="text-red-400"
          />
          Phối hợp trễ SLA ({m.depSlaBreached.length})
        </h2>
        <DepList items={m.depSlaBreached} />
      </section>
    </main>
  );
}
