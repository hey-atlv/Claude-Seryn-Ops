import { ALERT_LABELS } from "@/lib/alerts";
import {
  PRIORITY_LABELS,
  TEAM_LABELS,
  type Priority,
  type Team,
} from "@/lib/constants";
import type { TaskWithMeta } from "@/lib/dashboard";
import { formatVN } from "@/lib/timezone";

interface TaskTableProps {
  tasks: TaskWithMeta[];
  empty: string;
}

// Bảng task dùng chung cho các khối Dashboard (cột theo mục 2.4 tài liệu)
export function TaskTable({ tasks, empty }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            <th className="px-3 py-2.5">Tên việc</th>
            <th className="px-3 py-2.5">Team</th>
            <th className="px-3 py-2.5">Leader</th>
            <th className="px-3 py-2.5">Deadline</th>
            <th className="px-3 py-2.5">Ưu tiên</th>
            <th className="px-3 py-2.5 text-right">Score</th>
            <th className="px-3 py-2.5">Cảnh báo</th>
            <th className="px-3 py-2.5">Update gần nhất</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t.id}
              className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800/50 ${
                t.priority === "CRITICAL"
                  ? "border-l-2 border-l-red-600 bg-red-50 dark:bg-red-950/30"
                  : t.alertStatus === "OVERDUE"
                    ? "border-l-2 border-l-red-400 bg-red-50/50 dark:bg-red-950/15"
                    : t.alertStatus === "DUE_SOON"
                      ? "border-l-2 border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/15"
                      : ""
              }`}
            >
              <td className="max-w-xs px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                {t.title}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {TEAM_LABELS[t.team as Team] ?? t.team}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {t.leader?.name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {t.deadline ? formatVN(t.deadline, "dd/MM/yyyy") : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {PRIORITY_LABELS[t.priority as Priority] ?? t.priority}
              </td>
              <td className="px-3 py-2.5 text-right font-mono font-semibold">
                {t.priorityScore}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {ALERT_LABELS[t.alertStatus]}
              </td>
              <td className="max-w-[16rem] px-3 py-2.5 text-zinc-500">
                {t.lastUpdateAt ? (
                  <>
                    <span className="whitespace-nowrap">
                      {formatVN(t.lastUpdateAt, "dd/MM")}
                    </span>
                    {t.lastUpdateNote ? (
                      <span className="ml-1 text-zinc-400">
                        — {t.lastUpdateNote}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
