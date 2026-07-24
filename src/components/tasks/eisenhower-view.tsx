"use client";

import {
  classify,
  QUADRANT_META,
  QUADRANTS,
  type Quadrant,
} from "@/lib/eisenhower";
import type { TaskRow } from "@/lib/task-row";
import { formatVN } from "@/lib/timezone";

// View Ma trận Eisenhower: 4 ô phân loại tự động từ priority/impact/alert.
// Chỉ nhận task đang mở; click card mở form sửa.

interface EisenhowerViewProps {
  tasks: TaskRow[];
  onEdit: (task: TaskRow) => void;
}

const QUADRANT_STYLE: Record<Quadrant, { box: string; head: string }> = {
  DO: {
    box: "border-red-300 dark:border-red-900",
    head: "bg-red-600 text-white",
  },
  SCHEDULE: {
    box: "border-brand-300 dark:border-brand-900",
    head: "bg-brand-700 text-white",
  },
  DELEGATE: {
    box: "border-amber-300 dark:border-amber-900",
    head: "bg-amber-500 text-amber-950",
  },
  MONITOR: {
    box: "border-zinc-300 dark:border-zinc-700",
    head: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  },
};

export function EisenhowerView({ tasks, onEdit }: EisenhowerViewProps) {
  const grouped: Record<Quadrant, TaskRow[]> = {
    DO: [],
    SCHEDULE: [],
    DELEGATE: [],
    MONITOR: [],
  };
  for (const t of tasks) grouped[classify(t)].push(t);
  for (const q of QUADRANTS)
    grouped[q].sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Khẩn = Critical / quá hạn / sắp hạn ≤2 ngày · Quan trọng = ưu tiên Cao,
        Critical hoặc ảnh hưởng doanh thu Cao
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {QUADRANTS.map((q) => {
          const meta = QUADRANT_META[q];
          const style = QUADRANT_STYLE[q];
          const items = grouped[q];
          return (
            <section
              key={q}
              className={`overflow-hidden rounded-lg border bg-white dark:bg-zinc-900 ${style.box}`}
            >
              <header className={`px-3 py-2 ${style.head}`}>
                <span className="text-sm font-bold">
                  {meta.title} ({items.length})
                </span>
                <span className="ml-2 text-xs opacity-90">{meta.hint}</span>
              </header>
              <div className="max-h-80 space-y-1 overflow-y-auto p-2">
                {items.length === 0 && (
                  <p className="px-1 py-3 text-center text-xs text-zinc-400">
                    Trống
                  </p>
                )}
                {items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onEdit(t)}
                    className="flex w-full items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-left text-xs hover:border-brand-500 hover:bg-brand-50/40 dark:border-zinc-700 dark:hover:bg-brand-950/30"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {t.title}
                    </span>
                    {t.deadline && (
                      <span
                        className={`whitespace-nowrap ${
                          t.alertStatus === "OVERDUE"
                            ? "font-semibold text-red-600 dark:text-red-400"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {formatVN(new Date(t.deadline), "dd/MM")}
                      </span>
                    )}
                    {t.leaderName && (
                      <span className="whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                        {t.leaderName}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
