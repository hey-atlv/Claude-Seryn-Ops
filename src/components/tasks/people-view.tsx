"use client";

import { useMemo } from "react";
import { TEAM_LABELS, type Team } from "@/lib/constants";
import { TitleWithTag } from "./tag-chip";
import type { TaskRow } from "@/lib/task-row";
import { formatVN } from "@/lib/timezone";

// P1-b — View "Theo người": workload từng leader để CMO cân tải và họp 1-1.
// Mỗi leader 1 card: việc mở / quá hạn / sắp hạn / % đúng hạn 4 tuần gần nhất
// + 3 việc nóng nhất. Click việc → mở drawer chi tiết.

interface PeopleViewProps {
  tasks: TaskRow[]; // visible (gồm cả DONE để tính % đúng hạn)
  onOpen: (task: TaskRow) => void;
}

const DAY_MS = 86_400_000;
const ON_TIME_WINDOW_DAYS = 28;

interface LeaderStats {
  key: string;
  name: string;
  teams: string[];
  open: TaskRow[];
  overdue: number;
  dueSoon: number;
  review: number;
  done28: number;
  onTime28: number; // trong done28, số việc có deadline và chốt xong kịp hạn
  withDeadline28: number; // done28 có deadline — mẫu số của % đúng hạn
}

function collectStats(tasks: TaskRow[], now: Date): LeaderStats[] {
  const map = new Map<string, LeaderStats>();
  for (const t of tasks) {
    const key = t.leaderId ?? "none";
    let s = map.get(key);
    if (!s) {
      s = {
        key,
        name: t.leaderName ?? "— Chưa gán leader",
        teams: [],
        open: [],
        overdue: 0,
        dueSoon: 0,
        review: 0,
        done28: 0,
        onTime28: 0,
        withDeadline28: 0,
      };
      map.set(key, s);
    }
    if (!s.teams.includes(t.team)) s.teams.push(t.team);

    if (t.status === "DONE") {
      const doneAt = t.completedAt ? new Date(t.completedAt).getTime() : null;
      if (doneAt && now.getTime() - doneAt <= ON_TIME_WINDOW_DAYS * DAY_MS) {
        s.done28 += 1;
        if (t.deadline) {
          s.withDeadline28 += 1;
          if (doneAt <= new Date(t.deadline).getTime()) s.onTime28 += 1;
        }
      }
      continue;
    }

    s.open.push(t);
    if (t.alertStatus === "OVERDUE") s.overdue += 1;
    if (t.alertStatus === "DUE_SOON") s.dueSoon += 1;
    if (t.status === "REVIEW") s.review += 1;
  }

  return [...map.values()].sort(
    (a, b) => b.overdue - a.overdue || b.open.length - a.open.length,
  );
}

// 3 việc nóng nhất của leader: quá hạn trước, rồi deadline gần nhất
function hotTasks(open: TaskRow[]): TaskRow[] {
  return [...open]
    .sort((a, b) => {
      const ao = a.alertStatus === "OVERDUE" ? 0 : 1;
      const bo = b.alertStatus === "OVERDUE" ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
    })
    .slice(0, 3);
}

const teamLabel = (team: string) => TEAM_LABELS[team as Team] ?? team;

export function PeopleView({ tasks, onOpen }: PeopleViewProps) {
  const now = useMemo(() => new Date(), []);
  const stats = useMemo(() => collectStats(tasks, now), [tasks, now]);
  const maxOpen = Math.max(1, ...stats.map((s) => s.open.length));

  if (stats.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
        Chưa có việc nào để thống kê theo người
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Ai đang quá tải, ai đang rảnh, ai hay trễ — sắp theo quá hạn rồi số
        việc mở. % đúng hạn tính trên việc chốt xong {ON_TIME_WINDOW_DAYS} ngày
        gần nhất có deadline.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {stats.map((s) => {
          const pct =
            s.withDeadline28 > 0
              ? Math.round((s.onTime28 / s.withDeadline28) * 100)
              : null;
          return (
            <section
              key={s.key}
              className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <header className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {s.name}
                </span>
                <span className="text-xs text-zinc-500">
                  {s.teams.map(teamLabel).join(" · ")}
                </span>
                {pct !== null && (
                  <span
                    className={`ml-auto text-xs font-semibold ${
                      pct >= 80
                        ? "text-emerald-600 dark:text-emerald-400"
                        : pct >= 50
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    ✓ {pct}% đúng hạn ({s.onTime28}/{s.withDeadline28})
                  </span>
                )}
              </header>

              {/* Thanh tải: số việc mở so với người nhiều việc nhất */}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${
                    s.overdue > 0 ? "bg-red-500" : "bg-brand-600"
                  }`}
                  style={{ width: `${(s.open.length / maxOpen) * 100}%` }}
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <span>
                  <b className="text-zinc-900 dark:text-zinc-100">
                    {s.open.length}
                  </b>{" "}
                  đang mở
                </span>
                {s.overdue > 0 && (
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    🔴 {s.overdue} quá hạn
                  </span>
                )}
                {s.dueSoon > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    🟡 {s.dueSoon} sắp hạn
                  </span>
                )}
                {s.review > 0 && <span>⏳ {s.review} chờ duyệt</span>}
                <span>✅ {s.done28} xong {ON_TIME_WINDOW_DAYS}n</span>
              </div>

              {s.open.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  {hotTasks(s.open).map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(t)}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">
                          <TitleWithTag title={t.title} />
                        </span>
                        {t.deadline && (
                          <span
                            className={`whitespace-nowrap ${
                              t.alertStatus === "OVERDUE"
                                ? "font-semibold text-red-600 dark:text-red-400"
                                : "text-zinc-500"
                            }`}
                          >
                            {formatVN(new Date(t.deadline), "dd/MM")}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
