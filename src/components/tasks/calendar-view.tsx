"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, X } from "lucide-react";
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
const WEEKDAYS_FULL = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];
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

/** "2026-08-05" → "Thứ 4, 5/8/2026" (key sinh từ monthGridVN nên đọc theo UTC) */
function formatDayTitle(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const weekday = WEEKDAYS_FULL[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${day}/${month}/${year}`;
}

// Trong ô lịch chỗ hẹp nên cắt bớt tiêu đề; trong panel chi tiết thì hiện đủ.
type ChipVariant = "cell" | "panel";

interface TaskChipProps {
  task: TaskRow;
  variant: ChipVariant;
  onSelect: (task: TaskRow) => void;
}

function TaskChip({ task, variant, onSelect }: TaskChipProps) {
  const inCell = variant === "cell";
  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      title={task.title}
      className={`mb-0.5 block w-full rounded text-left font-medium transition-shadow hover:ring-1 hover:ring-inset hover:ring-white/15 ${
        inCell ? "truncate px-1.5 py-[3px] text-[11px]" : "px-2 py-1.5 text-[12px]"
      } ${chipClass(task)}`}
    >
      {task.title}
    </button>
  );
}

interface EventChipProps {
  event: ExternalCalendarEvent;
  variant: ChipVariant;
  onSelect: (event: ExternalCalendarEvent) => void;
}

function EventChip({ event, variant, onSelect }: EventChipProps) {
  const inCell = variant === "cell";
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      title={`${event.time ? `${event.time} — ` : ""}${event.title} — bấm để tạo task từ event Google này`}
      className={`group mb-0.5 flex w-full items-center gap-1.5 rounded text-left text-dim transition-colors hover:bg-white/6 hover:text-text ${
        inCell ? "px-1.5 py-[3px] text-[11px]" : "px-2 py-1.5 text-[12px]"
      }`}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-good/80" aria-hidden />
      {event.time && (
        <span className="shrink-0 tabular-nums text-muted">{event.time}</span>
      )}
      <span className={inCell ? "truncate" : ""}>{event.title}</span>
      <CalendarPlus
        size={inCell ? 11 : 13}
        strokeWidth={2.25}
        aria-hidden
        className="ml-auto hidden shrink-0 text-gold group-hover:block"
      />
    </button>
  );
}

interface DayDetailPanelProps {
  dateKey: string;
  tasks: TaskRow[];
  events: ExternalCalendarEvent[];
  onClose: () => void;
  onSelectTask: (task: TaskRow) => void;
  onSelectEvent: (event: ExternalCalendarEvent) => void;
}

// Popup chi tiết ngày kiểu Google: liệt kê đầy đủ, không cắt bớt.
// Dùng lại đúng pattern overlay của useConfirm (Esc + bấm nền để đóng).
function DayDetailPanel({
  dateKey,
  tasks,
  events,
  onClose,
  onSelectTask,
  onSelectEvent,
}: DayDetailPanelProps) {
  const title = formatDayTitle(dateKey);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl border border-hair bg-panel shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3 border-b border-hair-soft px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-text">{title}</p>
            <p className="mt-0.5 text-xs text-muted">
              {tasks.length} việc · {events.length} lịch Google
            </p>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Đóng"
            onClick={onClose}
            className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-panel-3 hover:text-text"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-3 py-3">
          {tasks.map((t) => (
            <TaskChip key={t.id} task={t} variant="panel" onSelect={onSelectTask} />
          ))}
          {events.map((e) => (
            <EventChip key={e.id} event={e} variant="panel" onSelect={onSelectEvent} />
          ))}
          {tasks.length === 0 && events.length === 0 && (
            <p className="px-2 py-1.5 text-[12px] text-faint">Ngày này chưa có gì.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CalendarView({ tasks, onEdit, onCreateFromEvent }: CalendarViewProps) {
  const [{ year, month }, setYm] = useState(() => currentMonthVN());
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>([]);
  // Ngày đang mở panel chi tiết ("yyyy-MM-dd"), null = không mở
  const [openKey, setOpenKey] = useState<string | null>(null);

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

  // Panel luôn nhường chỗ cho form: đóng trước rồi mới mở form sửa/tạo task
  const selectTask = (task: TaskRow) => {
    setOpenKey(null);
    onEdit(task);
  };
  const selectEvent = (event: ExternalCalendarEvent) => {
    setOpenKey(null);
    onCreateFromEvent(event);
  };

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
                const itemCount = dayTasks.length + dayEvents.length;
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
                      <button
                        type="button"
                        disabled={itemCount === 0}
                        onClick={() => setOpenKey(day.key)}
                        aria-label={`Xem chi tiết ${formatDayTitle(day.key)}`}
                        className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[12px] transition-colors ${
                          isToday
                            ? "bg-gold font-bold text-bg"
                            : day.inMonth
                              ? "font-medium text-dim"
                              : "text-faint/60"
                        } ${
                          itemCount === 0
                            ? "cursor-default"
                            : isToday
                              ? "hover:bg-gold/85"
                              : "hover:bg-white/10 hover:text-text"
                        }`}
                      >
                        {day.day}
                      </button>
                    </div>

                    {dayTasks.slice(0, MAX_TASK_CHIPS).map((t) => (
                      <TaskChip key={t.id} task={t} variant="cell" onSelect={selectTask} />
                    ))}

                    {dayEvents.slice(0, MAX_EVENT_CHIPS).map((e) => (
                      <EventChip
                        key={e.id}
                        event={e}
                        variant="cell"
                        onSelect={selectEvent}
                      />
                    ))}

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setOpenKey(day.key)}
                        title={[...hiddenTasks.map((t) => t.title), ...hiddenEvents.map((e) => e.title)].join("\n")}
                        className="block w-full rounded px-1.5 py-[3px] text-left text-[11px] font-medium text-faint transition-colors hover:bg-white/6 hover:text-dim"
                      >
                        +{hiddenCount} nữa
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {openKey && (
        <DayDetailPanel
          dateKey={openKey}
          tasks={byDay.get(openKey) ?? []}
          events={byDayExternal.get(openKey) ?? []}
          onClose={() => setOpenKey(null)}
          onSelectTask={selectTask}
          onSelectEvent={selectEvent}
        />
      )}
    </div>
  );
}
