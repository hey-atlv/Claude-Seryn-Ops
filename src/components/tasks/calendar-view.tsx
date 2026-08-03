"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import {
  addMonths,
  currentMonthVN,
  dateKeyVN,
  monthGridVN,
} from "@/lib/calendar-core";
import type { ExternalCalendarEvent } from "@/lib/google-calendar-core";
import type { TaskRow } from "@/lib/task-row";

// D6 — Calendar tháng theo deadline (tự dựng grid cho nhẹ, tuần bắt đầu CN, giờ VN)
// J3 — thêm event Google Calendar KHÔNG do app tạo + bấm để tạo task từ event đó
// (prefill title/deadline, vẫn qua preview-confirm của TaskForm).
//
// Ngôn ngữ hình ảnh mượn Google Calendar, đổ về bảng màu dark của theme:
//   · task (chỉ có ngày, không giờ) = pill nền đặc, màu theo priority/status
//   · event Google (có giờ) = chấm tròn + giờ + tiêu đề, nền trong suốt
// Đúng cách Google phân biệt "all-day" với "timed", nên hai loại không lẫn nhau.

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MAX_TASK_CHIPS = 3;
const MAX_EVENT_CHIPS = 2;

interface CalendarViewProps {
  tasks: TaskRow[];
  onEdit: (task: TaskRow) => void;
  onCreateFromEvent: (event: ExternalCalendarEvent) => void;
}

// Nền ô theo mật độ deadline — giữ rất nhạt để không phá vẻ sạch kiểu Google
function heatClass(count: number): string {
  if (count >= 5) return "bg-gold/10";
  if (count >= 3) return "bg-gold/6";
  if (count >= 1) return "bg-gold/3";
  return "";
}

// Event cả ngày (time = null) lên đầu, phần còn lại theo giờ tăng dần ("HH:mm" so sánh chuỗi được)
function byStartTime(a: ExternalCalendarEvent, b: ExternalCalendarEvent): number {
  if (a.time === b.time) return 0;
  if (a.time === null) return -1;
  if (b.time === null) return 1;
  return a.time.localeCompare(b.time);
}

// Pill task: nền mờ + chữ cùng tông (desaturated theo hướng dark đã duyệt),
// KHÔNG dùng nền đặc bão hoà như Google bản sáng.
function chipClass(task: TaskRow): string {
  if (task.status === "DONE") return "bg-white/5 text-faint line-through";
  if (task.priority === "CRITICAL") return "bg-critical/15 text-critical";
  if (task.priority === "HIGH") return "bg-overdue/15 text-overdue";
  return "bg-dusty/12 text-dusty";
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
    // Trong cùng 1 ngày: event cả ngày lên trước, còn lại xếp theo giờ bắt đầu
    for (const [key, events] of map) {
      map.set(key, [...events].sort(byStartTime));
    }
    return map;
  }, [externalEvents]);

  const grid = monthGridVN(year, month);
  const todayKey = dateKeyVN(new Date());

  return (
    <div>
      {/* Thanh điều hướng theo thứ tự của Google: Hôm nay → ‹ › → tên tháng */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setYm(currentMonthVN())}
          className="rounded-full border border-hair px-3.5 py-1.5 text-[13px] font-medium text-dim transition-colors hover:bg-panel-2 hover:text-text"
        >
          Hôm nay
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Tháng trước"
            onClick={() => setYm((c) => addMonths(c.year, c.month, -1))}
            className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-panel-2 hover:text-text"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Tháng sau"
            onClick={() => setYm((c) => addMonths(c.year, c.month, 1))}
            className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-panel-2 hover:text-text"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
        <h2 className="ml-1 text-lg font-semibold tracking-tight text-text">
          Tháng {month}, {year}
        </h2>

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-good/80" aria-hidden />
            Lịch Google
          </span>
          <span className="flex items-center gap-1">
            Mật độ deadline
            <span className="size-3 rounded-[3px] bg-gold/3" aria-hidden />
            <span className="size-3 rounded-[3px] bg-gold/6" aria-hidden />
            <span className="size-3 rounded-[3px] bg-gold/10" aria-hidden />
            <span>1 → 5+ việc/ngày</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px] overflow-hidden rounded-lg border border-hair bg-panel">
          <div className="grid grid-cols-7 border-b border-hair bg-panel-2/40 text-center text-[11px] font-semibold uppercase tracking-wider text-faint">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          {grid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-hair-soft last:border-b-0">
              {week.map((day) => {
                const dayTasks = byDay.get(day.key) ?? [];
                const dayEvents = byDayExternal.get(day.key) ?? [];
                const hiddenTasks = dayTasks.slice(MAX_TASK_CHIPS);
                const hiddenEvents = dayEvents.slice(MAX_EVENT_CHIPS);
                const hiddenCount = hiddenTasks.length + hiddenEvents.length;
                const isToday = day.key === todayKey;
                return (
                  <div
                    key={day.key}
                    className={`min-h-[116px] border-r border-hair-soft p-1.5 last:border-r-0 ${
                      day.inMonth ? heatClass(dayTasks.length) : "bg-black/15"
                    }`}
                  >
                    {/* Google đặt số ngày ở giữa đỉnh ô, hôm nay là vòng tròn đặc */}
                    <div className="mb-1 flex justify-center">
                      <span
                        className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[12px] ${
                          isToday
                            ? "bg-gold font-bold text-bg"
                            : day.inMonth
                              ? "font-medium text-dim"
                              : "text-faint/60"
                        }`}
                      >
                        {day.day}
                      </span>
                    </div>

                    {dayTasks.slice(0, MAX_TASK_CHIPS).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onEdit(t)}
                        title={t.title}
                        className={`mb-0.5 block w-full truncate rounded px-1.5 py-[3px] text-left text-[11px] font-medium transition-shadow hover:ring-1 hover:ring-inset hover:ring-white/15 ${chipClass(t)}`}
                      >
                        {t.title}
                      </button>
                    ))}

                    {dayEvents.slice(0, MAX_EVENT_CHIPS).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onCreateFromEvent(e)}
                        title={`${e.time ? `${e.time} — ` : ""}${e.title} — bấm để tạo task từ event Google này`}
                        className="group mb-0.5 flex w-full items-center gap-1.5 rounded px-1.5 py-[3px] text-left text-[11px] text-dim transition-colors hover:bg-white/6 hover:text-text"
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-good/80"
                          aria-hidden
                        />
                        {e.time && (
                          <span className="shrink-0 tabular-nums text-muted">
                            {e.time}
                          </span>
                        )}
                        <span className="truncate">{e.title}</span>
                        <CalendarPlus
                          size={11}
                          strokeWidth={2.25}
                          aria-hidden
                          className="ml-auto hidden shrink-0 text-gold group-hover:block"
                        />
                      </button>
                    ))}

                    {hiddenCount > 0 && (
                      <p
                        title={[...hiddenTasks.map((t) => t.title), ...hiddenEvents.map((e) => e.title)].join("\n")}
                        className="px-1.5 pt-0.5 text-[11px] font-medium text-faint"
                      >
                        +{hiddenCount} nữa
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
