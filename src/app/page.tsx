import Link from "next/link";
import { AlertBanner } from "@/components/home/alert-banner";
import { TodayList } from "@/components/home/today-list";
import { WeeklyStatLine } from "@/components/home/weekly-stat-line";
import { getTodayData } from "@/lib/today";
import { PROJECT_LIGHT_META } from "@/lib/today-core";
import { formatVN } from "@/lib/timezone";

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

// 🏠 Màn "Hôm nay" — phương án 15 phút (21/07/2026): ① banner cảnh báo gộp
// ② hôm nay làm gì ③ tiến độ dự án ④ chờ sếp quyết ⑤ 1 dòng chỉ số tuần.
// Mỗi task chỉ xuất hiện đúng 1 khối theo mục đích.
export default async function Home() {
  const d = await getTodayData();
  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 p-6">
      <header>
        <h1 className="text-4xl">Hôm nay</h1>
        <p className="mt-1.5 text-sm text-muted">
          {formatVN(now, "EEEE dd/MM/yyyy · HH:mm")} (giờ VN)
          {d.generatedNow > 0 && ` · vừa sinh ${d.generatedNow} việc định kỳ mới`}
        </p>
      </header>

      <AlertBanner
        overdue={d.overdue}
        silent={d.silent}
        staleDeps={d.staleDeps}
      />

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
                    className="flex items-center gap-3.5 rounded-[11px] border border-hair-soft bg-panel-2 px-3.5 py-3 transition-colors hover:border-[#35353b] hover:bg-[#232328]"
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
                  className="flex items-center gap-3 rounded-[11px] border border-hair-soft bg-panel-2 px-3.5 py-3 transition-colors hover:border-[#35353b] hover:bg-[#232328]"
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
      />
    </main>
  );
}
