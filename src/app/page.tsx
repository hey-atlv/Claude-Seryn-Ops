import Link from "next/link";
import { AiSummaryCard } from "@/components/home/ai-summary-card";
import { AlertBanner } from "@/components/home/alert-banner";
import { DayTabs } from "@/components/home/day-tabs";
import { ExportButtons } from "@/components/home/export-buttons";
import { HealthStrip } from "@/components/home/health-strip";
import { TodayList } from "@/components/home/today-list";
import { WeeklyStatLine } from "@/components/home/weekly-stat-line";
import { TaskTable } from "@/components/task-table";
import { SILENT_TASK_DAYS, TEAM_LABELS, type Team } from "@/lib/constants";
import { getDailySummary } from "@/lib/daily-summary";
import { leaderLabel } from "@/lib/leader-core";
import { getHealthMetrics } from "@/lib/metrics";
import { REVIEW_STUCK_DAYS } from "@/lib/metrics-core";
import { formatVN } from "@/lib/timezone";
import { getTodayData } from "@/lib/today";
import { PROJECT_LIGHT_META } from "@/lib/today-core";

export const dynamic = "force-dynamic";

// Section card dark: nền panel + section-head uppercase gạch chân, count pill.
function Section({
  title,
  count,
  children,
}: {
  title: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="app-card p-[18px]">
      <div className="mb-4 flex items-center gap-2.5 border-b border-hair-soft pb-3.5 text-[13px] font-bold uppercase tracking-[0.16em] text-text">
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-panel-3 px-2 py-0.5 text-[11px] font-bold tracking-normal text-muted">
            {count} việc
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[11px] border border-dashed border-hair px-4 py-5 text-center text-sm text-faint">
      {children}
    </p>
  );
}

// 🏠 Bảng điều hành một ngày — gộp "Hôm nay" + "Sức khỏe" + "Cuối ngày".
// Trên cùng luôn hiện phần không phụ thuộc nhịp ngày: cảnh báo và 4 chỉ số
// sức khỏe. Dưới là 2 tab đổi theo nhịp: sáng xem phải làm gì, tối xem còn
// tồn gì và mai làm gì. Mỗi task chỉ xuất hiện đúng 1 khối theo mục đích.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const [d, m, s] = await Promise.all([
    getTodayData(),
    getHealthMetrics(now),
    getDailySummary(now),
  ]);
  const top = s.topTomorrow;

  const todayTab = (
    <div className="space-y-5">
      <Section title="📋 Hôm nay làm gì" count={d.todayTasks.length}>
        <TodayList tasks={d.todayTasks} />
      </Section>

      <Section title="📁 Tiến độ dự án">
        {d.projects.length === 0 ? (
          <EmptyNote>Chưa có dự án dài hơi đang chạy</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {d.projects.map((p) => {
              const meta = PROJECT_LIGHT_META[p.light];
              return (
                <li key={p.id}>
                  <Link
                    href={`/tasks?team=${p.team}`}
                    className="flex items-center gap-3.5 rounded-[11px] border border-hair-soft bg-panel-2 px-3.5 py-3 transition-colors hover:border-hair-hover hover:bg-panel-hover"
                  >
                    <span title={meta.label} aria-label={meta.label}>
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">
                        {p.title}
                      </span>
                      <span className="block text-xs text-muted">
                        {p.teamLabel}
                        {p.leaderName && ` · ${p.leaderName}`}
                        {p.light !== "GREEN" && (
                          <span className="font-semibold text-overdue">
                            {" "}
                            · {meta.label}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex w-44 shrink-0 items-center gap-2.5">
                      <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-panel-3">
                        <span
                          className="block h-full rounded-full bg-good"
                          style={{ width: `${p.pct}%` }}
                        />
                      </span>
                      <span className="w-14 text-right text-xs font-medium tabular-nums text-dim">
                        {p.total > 0 ? `${p.done}/${p.total}` : "—"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="⏳ Chờ sếp quyết" count={d.reviews.length}>
        {d.reviews.length === 0 ? (
          <EmptyNote>Không có việc chờ duyệt 👍</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {d.reviews.map((r) => (
              <li key={r.id}>
                <Link
                  href="/tasks?view=team"
                  className="flex items-center gap-3 rounded-[11px] border border-hair-soft bg-panel-2 px-3.5 py-3 transition-colors hover:border-hair-hover hover:bg-panel-hover"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                    {r.title}
                  </span>
                  <span className="whitespace-nowrap text-xs text-muted">
                    {r.teamLabel}
                    {r.leaderName && ` · ${r.leaderName}`}
                  </span>
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                      r.days >= 3
                        ? "bg-critical/[0.13] text-critical"
                        : "bg-panel-3 text-muted"
                    }`}
                  >
                    chờ {r.days} ngày
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <WeeklyStatLine
        weekKey={d.weekKey}
        weekLabel={d.weekLabel}
        initial={d.weeklyStat}
        history={d.weeklyHistory}
      />
    </div>
  );

  const closingTab = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Tự tổng hợp từ DB1 — không cần đếm tay
        </p>
        <ExportButtons />
      </div>

      <AiSummaryCard />

      {top && (
        <section className="rounded-[13px] border border-gold/40 bg-gold/[0.07] px-4 py-3.5">
          <p className="text-sm text-text">
            ⭐ <strong>Việc quan trọng nhất sáng mai:</strong> {top.title}
            <span className="text-dim">
              {" "}
              — {TEAM_LABELS[top.team as Team] ?? top.team}
              {top.leader ? ` · ${leaderLabel(top.leader)}` : ""}
              {top.deadline
                ? ` · deadline ${formatVN(top.deadline, "dd/MM")}`
                : ""}{" "}
              · score {top.priorityScore}
            </span>
          </p>
        </section>
      )}

      <Section title="✅ Xong hôm nay" count={s.doneToday.length}>
        <TaskTable tasks={s.doneToday} empty="Hôm nay chưa chốt xong việc nào" />
      </Section>

      <Section title="🔴 Trễ — cần hỏi leader" count={s.overdue.length}>
        <TaskTable tasks={s.overdue} empty="Không có task nào trễ hạn 👏" />
      </Section>

      <Section title="🔄 Đang làm dở" count={s.inProgress.length}>
        <TaskTable tasks={s.inProgress} empty="Không có task nào đang chạy" />
      </Section>

      <Section title="⚠️ Sắp hạn ≤2 ngày" count={s.dueSoon.length}>
        <TaskTable
          tasks={s.dueSoon}
          empty="Không có deadline nào trong 2 ngày tới"
        />
      </Section>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-6">
      <header>
        <h1 className="text-4xl">Hôm nay</h1>
        <p className="mt-1.5 text-sm text-muted">
          {formatVN(now, "EEEE dd/MM/yyyy · HH:mm")} (giờ VN) · {m.openTaskCount}{" "}
          việc đang mở
          {d.generatedNow > 0 &&
            ` · vừa sinh ${d.generatedNow} việc định kỳ mới`}
        </p>
      </header>

      <AlertBanner
        overdue={d.overdue}
        silent={d.silent}
        staleDeps={d.staleDeps}
      />

      <HealthStrip
        doneRate={m.doneRate}
        reviewStuck={m.reviewStuck}
        silentTasks={m.silentTasks}
        depSlaBreached={m.depSlaBreached}
        reviewStuckDays={REVIEW_STUCK_DAYS}
        silentDays={SILENT_TASK_DAYS}
      />

      <DayTabs
        today={todayTab}
        closing={closingTab}
        initialTab={typeof sp.tab === "string" ? sp.tab : undefined}
      />
    </main>
  );
}
