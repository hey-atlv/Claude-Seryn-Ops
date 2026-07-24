"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import {
  addMonths,
  currentMonthVN,
  dateKeyVN,
  monthGridVN,
} from "@/lib/calendar-core";
import type { ExternalCalendarEvent } from "@/lib/google-calendar-core";
import type { TaskRow } from "@/lib/task-row";

// D6 — Calendar tháng theo deadline (tự dựng grid cho nhẹ, tuần bắt đầu thứ 2, giờ VN)
// J3 — thêm event Google Calendar KHÔNG do app tạo (chip viền đứt) + bấm để tạo
// task từ event đó (prefill title/deadline, vẫn qua preview-confirm của TaskForm).

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MAX_CHIPS_PER_DAY = 3;
const MAX_EXTERNAL_CHIPS_PER_DAY = 2;

interface CalendarViewProps {
  tasks: TaskRow[];
  onEdit: (task: TaskRow) => void;
  onCreateFromEvent: (event: ExternalCalendarEvent) => void;
}

// Heatmap mật độ deadline: nền teal đậm dần theo số việc trong ngày
function heatClass(count: number): string {
  if (count >= 5) return "bg-brand-600/35 dark:bg-brand-400/30";
  if (count >= 3) return "bg-brand-600/20 dark:bg-brand-400/18";
  if (count >= 1) return "bg-brand-600/10 dark:bg-brand-400/10";
  return "";
}

function chipClass(task: TaskRow): string {
  if (task.status === "DONE")
    return "bg-zinc-100 text-zinc-400 line-through dark:bg-zinc-800 dark:text-zinc-500";
  if (task.priority === "CRITICAL")
    return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  if (task.priority === "HIGH")
    return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
  return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
}

export function CalendarView({ tasks, onEdit, onCreateFromEvent }: CalendarViewProps) {
  const [{ year, month }, setYm] = useState(() => currentMonthVN());
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiCall<ExternalCalendarEvent[]>(
      `/api/google/calendar-events?year=${year}&month=${month}`,
    ).then((res) => {
      if (!cancelled && res.success) setExternalEvents(res.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      if (!t.deadline) continue;
      const key = dateKeyVN(new Date(t.deadline));
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [tasks]);

  const byDayExternal = useMemo(() => {
    const map = new Map<string, ExternalCalendarEvent[]>();
    for (const e of externalEvents) {
      map.set(e.dateKey, [...(map.get(e.dateKey) ?? []), e]);
    }
    return map;
  }, [externalEvents]);

  const grid = monthGridVN(year, month);
  const todayKey = dateKeyVN(new Date());

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setYm((c) => addMonths(c.year, c.month, -1))}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ←
        </button>
        <span className="min-w-32 text-center text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Tháng {month}/{year}
        </span>
        <button
          type="button"
          onClick={() => setYm((c) => addMonths(c.year, c.month, 1))}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          →
        </button>
        <button
          type="button"
          onClick={() => setYm(currentMonthVN())}
          className="ml-2 rounded-md px-2.5 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
        >
          Hôm nay
        </button>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
          Mật độ deadline
          <span className="h-3 w-3 rounded-sm bg-brand-600/10 dark:bg-brand-400/10" />
          <span className="h-3 w-3 rounded-sm bg-brand-600/20 dark:bg-brand-400/18" />
          <span className="h-3 w-3 rounded-sm bg-brand-600/35 dark:bg-brand-400/30" />
          <span>1 → 5+ việc/ngày</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px] overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-7 border-b border-zinc-200 text-center text-xs font-medium uppercase text-zinc-500 dark:border-zinc-800">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>
          {grid.map((week, wi) => (
            <div
              key={wi}
              className="grid grid-cols-7 border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
            >
              {week.map((day) => {
                const dayTasks = byDay.get(day.key) ?? [];
                const dayEvents = byDayExternal.get(day.key) ?? [];
                const isToday = day.key === todayKey;
                return (
                  <div
                    key={day.key}
                    className={`min-h-24 border-r border-zinc-100 p-1 last:border-0 dark:border-zinc-800/60 ${
                      day.inMonth
                        ? heatClass(dayTasks.length)
                        : "bg-zinc-50/70 dark:bg-zinc-950/40"
                    } ${isToday ? "ring-2 ring-inset ring-brand-600" : ""}`}
                  >
                    <div
                      className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        isToday
                          ? "bg-brand-600 font-bold text-white"
                          : day.inMonth
                            ? "font-medium text-zinc-700 dark:text-zinc-200"
                            : "text-zinc-300 dark:text-zinc-600"
                      }`}
                    >
                      {day.day}
                    </div>
                    {dayTasks.slice(0, MAX_CHIPS_PER_DAY).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onEdit(t)}
                        title={t.title}
                        className={`mb-0.5 block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${chipClass(t)}`}
                      >
                        {t.title}
                      </button>
                    ))}
                    {dayTasks.length > MAX_CHIPS_PER_DAY && (
                      <p className="px-1 text-[10px] text-zinc-400">
                        +{dayTasks.length - MAX_CHIPS_PER_DAY} việc nữa
                      </p>
                    )}
                    {dayEvents.slice(0, MAX_EXTERNAL_CHIPS_PER_DAY).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onCreateFromEvent(e)}
                        title={`${e.title} — bấm để tạo task từ event Google này`}
                        className="mb-0.5 flex w-full items-center gap-1 truncate rounded border border-dashed border-zinc-300 px-1 py-0.5 text-left text-[10px] font-medium text-zinc-500 hover:border-brand-500 hover:text-brand-700 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-brand-400 dark:hover:text-brand-300"
                      >
                        <CalendarPlus size={10} strokeWidth={2.25} aria-hidden className="shrink-0" />
                        <span className="truncate">{e.title}</span>
                      </button>
                    ))}
                    {dayEvents.length > MAX_EXTERNAL_CHIPS_PER_DAY && (
                      <p className="px-1 text-[10px] text-zinc-400">
                        +{dayEvents.length - MAX_EXTERNAL_CHIPS_PER_DAY} event nữa
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
