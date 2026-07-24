import { TaskTable } from "@/components/task-table";
import { TEAM_LABELS, type Team } from "@/lib/constants";
import { getDailySummary } from "@/lib/daily-summary";
import { leaderLabel } from "@/lib/leader-core";
import { formatVN } from "@/lib/timezone";
import { AiSummaryCard } from "./ai-summary-card";
import { ExportButtons } from "./export-buttons";

export const dynamic = "force-dynamic";

// 🌙 Tóm tắt cuối ngày (F2) — 4 nhóm + việc quan trọng nhất sáng mai.
export default async function DailySummaryPage() {
  const now = new Date();
  const s = await getDailySummary(now);
  const top = s.topTomorrow;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            🌙 Tóm tắt cuối ngày
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatVN(now, "dd/MM/yyyy")} — tự tổng hợp từ DB1, không cần đếm tay
          </p>
        </div>
        <ExportButtons />
      </header>

      <AiSummaryCard />

      {top && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ⭐ <strong>Việc quan trọng nhất sáng mai:</strong> {top.title}
            <span className="text-blue-600 dark:text-blue-300">
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

      <section>
        <h2 className="mb-2 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          ✅ Xong hôm nay ({s.doneToday.length})
        </h2>
        <TaskTable tasks={s.doneToday} empty="Hôm nay chưa chốt xong việc nào" />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          🔄 Đang làm ({s.inProgress.length})
        </h2>
        <TaskTable tasks={s.inProgress} empty="Không có task nào đang chạy" />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          🔴 Trễ — cần hỏi leader ({s.overdue.length})
        </h2>
        <TaskTable tasks={s.overdue} empty="Không có task nào trễ hạn 👏" />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          ⚠️ Sắp hạn ≤2 ngày ({s.dueSoon.length})
        </h2>
        <TaskTable tasks={s.dueSoon} empty="Không có deadline nào trong 2 ngày tới" />
      </section>
    </main>
  );
}
