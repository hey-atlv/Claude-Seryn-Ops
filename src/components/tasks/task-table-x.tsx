"use client";

import { ALERT_LABELS } from "@/lib/alerts";
import {
  PRIORITY_LABELS,
  TEAM_LABELS,
  type Priority,
  type Team,
} from "@/lib/constants";
import type { TaskRow } from "@/lib/task-row";
import { formatVN } from "@/lib/timezone";
import { QuickUpdate } from "./quick-update";

interface TaskTableXProps {
  tasks: TaskRow[];
  empty: string;
  onEdit: (task: TaskRow) => void;
  onChanged: () => void;
}

// Bảng task tương tác cho các view D2/D3/D4/D7 — như TaskTable của Dashboard
// nhưng chạy client-side, có nút sửa + update tiến độ nhanh.
export function TaskTableX({ tasks, empty, onEdit, onChanged }: TaskTableXProps) {
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
          <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
            <th className="px-3 py-2.5">Tên việc</th>
            <th className="px-3 py-2.5">Team</th>
            <th className="px-3 py-2.5">Leader</th>
            <th className="px-3 py-2.5">Deadline</th>
            <th className="px-3 py-2.5">Ưu tiên</th>
            <th className="px-3 py-2.5 text-right">Score</th>
            <th className="px-3 py-2.5">Cảnh báo</th>
            <th className="px-3 py-2.5">Update gần nhất</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t.id}
              className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800/50 ${
                t.priority === "CRITICAL" ? "bg-red-50 dark:bg-red-950/30" : ""
              }`}
            >
              <td className="max-w-xs px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                <button
                  type="button"
                  onClick={() => onEdit(t)}
                  className="text-left hover:underline"
                >
                  {t.title}
                </button>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {TEAM_LABELS[t.team as Team] ?? t.team}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {t.leaderName ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {t.deadline ? formatVN(new Date(t.deadline), "dd/MM/yyyy") : "—"}
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
              <td className="max-w-[14rem] px-3 py-2.5 text-zinc-500">
                {t.lastUpdateAt ? (
                  <>
                    <span className="whitespace-nowrap">
                      {formatVN(new Date(t.lastUpdateAt), "dd/MM")}
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
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <QuickUpdate taskId={t.id} onDone={onChanged} />
                <button
                  type="button"
                  title="Sửa task"
                  onClick={() => onEdit(t)}
                  className="ml-1 rounded px-1.5 py-0.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ✏️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
