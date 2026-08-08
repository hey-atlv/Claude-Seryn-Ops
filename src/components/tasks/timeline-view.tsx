"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, currentMonthVN, dateKeyVN } from "@/lib/calendar-core";
import { TEAM_LABELS, type Team } from "@/lib/constants";
import { TitleWithTag } from "./tag-chip";
import type { TaskRow } from "@/lib/task-row";
import {
  buildTimelineRows,
  monthDaysVN,
  type TimelineBar,
  type TimelineDay,
  type TimelineMilestone,
  type TimelineRow,
} from "@/lib/timeline-core";

// View "Dòng thời gian" — Gantt một tháng: mỗi dự án/đầu việc là một thanh
// trải từ ngày bắt đầu tới deadline, nhìn một phát thấy việc nào chồng việc nào.
//
// Ngôn ngữ hình ảnh giữ đúng theme dark đã duyệt: thanh dùng nền mờ + ruột đặc
// cùng tông (ruột = phần đã xong), KHÔNG màu bão hoà. Mã màu theo cảnh báo
// tiến độ chứ không theo priority — priority đã có chấm coral ở cột tên.

// Cột tên dính khi cuộn ngang, đủ rộng cho ~36 ký tự
const LABEL_W = "w-[248px]";
// 31 ngày × ~30px + cột tên → thà cuộn ngang còn hơn bóp ngày thành vạch
const MIN_W = "min-w-[1180px]";
const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
// Nhãn ngày cạnh thanh cần chừng này cột trống mới đủ chỗ, không thì bỏ nhãn
const LABEL_SLOT_MIN = 4;

interface TimelineViewProps {
  tasks: TaskRow[];
  onEdit: (task: TaskRow) => void;
  /** Kéo ngang thanh N ngày → dời deadline (và ngày bắt đầu nếu có) */
  onShift: (task: TaskRow, deltaDays: number) => void;
}

// ── Tông màu theo cảnh báo tiến độ ────────────────────────────────
// track = nền thanh (luôn thấy được màu trạng thái kể cả khi 0%),
// fill = ruột đặc dài theo % hoàn thành, ring = viền mảnh giữ thanh không chìm.
type Tone = "track" | "soon" | "overdue" | "done";

const TONES: Record<
  Tone,
  { label: string; track: string; fill: string; ring: string; dot: string }
> = {
  track: {
    label: "Đúng tiến độ",
    track: "bg-dusty/12",
    fill: "bg-dusty/55",
    ring: "ring-dusty/30",
    dot: "bg-dusty",
  },
  soon: {
    label: "Sắp hạn",
    track: "bg-overdue/12",
    fill: "bg-overdue/60",
    ring: "ring-overdue/35",
    dot: "bg-overdue",
  },
  overdue: {
    label: "Quá hạn",
    track: "bg-critical/14",
    fill: "bg-critical/65",
    ring: "ring-critical/40",
    dot: "bg-critical",
  },
  done: {
    label: "Xong",
    track: "bg-good/12",
    fill: "bg-good/55",
    ring: "ring-good/30",
    dot: "bg-good",
  },
};

const TONE_ORDER: Tone[] = ["track", "soon", "overdue", "done"];

function toneOf(task: TaskRow): Tone {
  if (task.status === "DONE") return "done";
  if (task.alertStatus === "OVERDUE") return "overdue";
  if (task.alertStatus === "DUE_SOON") return "soon";
  return "track";
}

/** "2026-08-14" → "14/08" */
const shortDay = (key: string) => `${key.slice(8)}/${key.slice(5, 7)}`;

// ── Trục ngang ────────────────────────────────────────────────────

interface WeekGroup {
  start: number; // cột ngày đầu tuần (0-based)
  span: number;
  label: string; // "3–9"
}

/** Gộp các ngày thành tuần (mốc mới ở mỗi thứ 2) cho tầng trên của trục */
function groupWeeks(days: TimelineDay[]): WeekGroup[] {
  const starts = days.flatMap((d, i) => (i === 0 || d.weekday === 1 ? [i] : []));
  return starts.map((start, k) => {
    const end = (starts[k + 1] ?? days.length) - 1;
    const from = days[start].day;
    const to = days[end].day;
    return {
      start,
      span: end - start + 1,
      label: from === to ? `${from}` : `${from}–${to}`,
    };
  });
}

/**
 * Vạch dọc của một cột ngày. Hôm nay ăn vạch gold — mọi dòng đều vẽ nên nó nối
 * thành một đường liền xuyên bảng; đầu tuần ăn vạch xám để mắt bắt được nhịp tuần.
 */
function dayEdge(day: TimelineDay, index: number, isToday: boolean): string {
  if (isToday) return "border-l-2 border-gold/80";
  if (day.weekday === 1 && index > 0) return "border-l border-hair";
  return "";
}

/** Nền của một cột ngày; `strong` dành cho hàng trục (đậm hơn thân bảng) */
function dayShade(day: TimelineDay, isToday: boolean, strong: boolean): string {
  if (isToday) return strong ? "bg-gold/15" : "bg-gold/[0.07]";
  return day.weekend ? "bg-ink/[0.03]" : "";
}

// ── Nhãn ngày cạnh thanh ──────────────────────────────────────────

interface LabelSlot {
  column: string;
  align: string;
}

/**
 * Chỗ đặt nhãn "14/08 · 45%": ưu tiên bên phải thanh, hết chỗ thì lùi sang trái,
 * chật cả hai bên thì bỏ nhãn (tooltip vẫn nói đủ) — không bao giờ đè lên thanh.
 */
function labelSlot(bar: TimelineBar, dayCount: number): LabelSlot | null {
  if (dayCount - 1 - bar.endIndex >= LABEL_SLOT_MIN) {
    return { column: `${bar.endIndex + 2} / -1`, align: "pl-2 text-left" };
  }
  if (bar.startIndex >= LABEL_SLOT_MIN) {
    return { column: `1 / ${bar.startIndex + 1}`, align: "pr-2 text-right" };
  }
  return null;
}

/** Tooltip của thanh: khoảng ngày thật (chưa cắt theo tháng) + tiến độ + các mốc */
function barTitle(row: TimelineRow): string {
  const { bar, task } = row;
  const start = bar.inferredStart
    ? `${shortDay(bar.startKey)} (ngày tạo — chưa điền ngày bắt đầu)`
    : shortDay(bar.startKey);
  return [
    task.title,
    `${start} → ${shortDay(bar.endKey)} · tiến độ ${row.progressPct}%`,
    ...row.milestones.map(
      (m) => `${m.done ? "✓" : "◇"} ${shortDay(m.key)} — ${m.title}`,
    ),
  ].join("\n");
}

// ── Các mảnh giao diện ────────────────────────────────────────────

function MilestoneMark({ milestone }: { milestone: TimelineMilestone }) {
  return (
    <span
      style={{ gridRow: 1, gridColumn: milestone.index + 1 }}
      title={`${milestone.done ? "✓ Đã xong" : "◇ Chưa xong"} · ${shortDay(milestone.key)} — ${milestone.title}`}
      className={`z-20 size-2.5 rotate-45 place-self-center rounded-[2px] ring-2 ring-panel ${
        milestone.done ? "bg-good" : "bg-gold"
      }`}
    />
  );
}

function TrackGuides({
  days,
  todayKey,
  columns,
}: {
  days: TimelineDay[];
  todayKey: string;
  columns: string;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid"
      style={{ gridTemplateColumns: columns }}
    >
      {days.map((d, i) => {
        const isToday = d.key === todayKey;
        return (
          <div
            key={d.key}
            className={`${dayEdge(d, i, isToday)} ${dayShade(d, isToday, false)}`}
          />
        );
      })}
    </div>
  );
}

function TimelineRowLine({
  row,
  columns,
  days,
  todayKey,
  onEdit,
  onShift,
}: {
  row: TimelineRow;
  columns: string;
  days: TimelineDay[];
  todayKey: string;
  onEdit: (task: TaskRow) => void;
  onShift: (task: TaskRow, deltaDays: number) => void;
}) {
  const { task, bar } = row;
  const tone = TONES[toneOf(task)];
  const span = bar.endIndex - bar.startIndex + 1;
  const slot = labelSlot(bar, days.length);
  const label =
    shortDay(bar.endKey) +
    (row.progressPct > 0 && row.progressPct < 100 ? ` · ${row.progressPct}%` : "");

  // P2 — kéo ngang thanh để dời lịch: snap từng nấc 1 ngày, thả là PATCH.
  // Click thường (không kéo) vẫn mở drawer — suppressClick chặn click sau kéo.
  const [dragPx, setDragPx] = useState(0);
  const dragRef = useRef<{ startX: number; dayW: number; delta: number } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const canDrag = task.status !== "DONE" && task.deadline !== null;

  function onBarPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!canDrag || e.button !== 0) return;
    const gridW =
      e.currentTarget.parentElement?.getBoundingClientRect().width ?? 0;
    if (gridW === 0) return;
    dragRef.current = { startX: e.clientX, dayW: gridW / days.length, delta: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onBarPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d) return;
    const delta = Math.round((e.clientX - d.startX) / d.dayW);
    if (delta !== d.delta) {
      d.delta = delta;
      setDragPx(delta * d.dayW);
    }
  }

  function onBarPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    setDragPx(0);
    if (d && d.delta !== 0) {
      // Click theo sau drag (nếu trình duyệt bắn) bị chặn; kéo xong mà không
      // có click nào theo sau thì tự nhả cờ để click kế tiếp mở drawer bình thường
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      onShift(task, d.delta);
    }
  }

  function onBarPointerCancel() {
    dragRef.current = null;
    setDragPx(0);
  }

  return (
    <div className="group flex border-b border-hair-soft last:border-b-0">
      <div
        className={`${LABEL_W} sticky left-0 z-20 shrink-0 border-r border-hair-soft bg-panel px-3 py-2 transition-colors group-hover:bg-panel-2`}
      >
        <button
          type="button"
          onClick={() => onEdit(task)}
          title={task.title}
          className={`flex w-full items-center gap-1.5 text-left text-[12px] font-medium transition-colors hover:text-gold ${
            task.status === "DONE" ? "text-faint line-through" : "text-text"
          }`}
        >
          {task.priority === "CRITICAL" && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-critical"
              aria-label="Critical"
            />
          )}
          <span className="truncate">
            {task.type === "PROJECT" && "🗂 "}
            <TitleWithTag title={task.title} />
          </span>
        </button>
        <p className="mt-0.5 truncate text-[10px] text-faint">
          {TEAM_LABELS[task.team as Team] ?? task.team}
          {task.leaderName && ` · ${task.leaderName}`}
          {row.milestones.length > 0 && ` · ${row.milestones.length} mốc`}
        </p>
      </div>

      <div className="relative flex flex-1 items-center py-2.5">
        <TrackGuides days={days} todayKey={todayKey} columns={columns} />
        <div
          className="relative grid w-full"
          style={{ gridTemplateColumns: columns }}
        >
          <button
            type="button"
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              onEdit(task);
            }}
            onPointerDown={onBarPointerDown}
            onPointerMove={onBarPointerMove}
            onPointerUp={onBarPointerUp}
            onPointerCancel={onBarPointerCancel}
            title={
              barTitle(row) + (canDrag ? "\n↔ Kéo ngang để dời lịch" : "")
            }
            style={{
              gridRow: 1,
              gridColumn: `${bar.startIndex + 1} / span ${span}`,
              transform: dragPx !== 0 ? `translateX(${dragPx}px)` : undefined,
              touchAction: canDrag ? "none" : undefined,
            }}
            className={`h-6 overflow-hidden ring-1 ring-inset transition-shadow hover:ring-ink/35 ${tone.track} ${tone.ring} ${
              bar.clippedStart ? "rounded-l-none" : "rounded-l-full"
            } ${bar.clippedEnd ? "rounded-r-none" : "rounded-r-full"} ${
              canDrag ? "cursor-grab active:cursor-grabbing" : ""
            } ${dragPx !== 0 ? "z-30 ring-2 ring-gold/60" : ""}`}
          >
            <span
              className={`block h-full ${tone.fill} ${
                bar.clippedStart ? "" : "rounded-l-full"
              }`}
              style={{ width: `${row.progressPct}%` }}
            />
          </button>

          {slot && (
            <span
              style={{ gridRow: 1, gridColumn: slot.column }}
              className={`z-10 self-center overflow-hidden whitespace-nowrap text-[10px] tabular-nums text-faint ${slot.align}`}
            >
              {label}
            </span>
          )}

          {row.milestones.map((m) => (
            <MilestoneMark key={m.id} milestone={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── View ──────────────────────────────────────────────────────────

export function TimelineView({ tasks, onEdit, onShift }: TimelineViewProps) {
  const [{ year, month }, setYm] = useState(() => currentMonthVN());
  const [importantOnly, setImportantOnly] = useState(true);

  const days = useMemo(() => monthDaysVN(year, month), [year, month]);
  const weeks = useMemo(() => groupWeeks(days), [days]);
  const rows = useMemo(
    () => buildTimelineRows(tasks, year, month, { importantOnly }),
    [tasks, year, month, importantOnly],
  );
  // Tổng việc có mặt trong tháng (không lọc) — để nút lọc nói được "còn bao nhiêu nữa"
  const totalInMonth = useMemo(
    () => buildTimelineRows(tasks, year, month).length,
    [tasks, year, month],
  );
  // Chú thích màu kiêm luôn số đếm — nhìn là biết tháng này đang nóng chỗ nào
  const counts = useMemo(
    () =>
      rows.reduce<Record<Tone, number>>(
        (acc, r) => {
          const tone = toneOf(r.task);
          return { ...acc, [tone]: acc[tone] + 1 };
        },
        { track: 0, soon: 0, overdue: 0, done: 0 },
      ),
    [rows],
  );

  const columns = `repeat(${days.length}, minmax(0, 1fr))`;
  const todayKey = dateKeyVN(new Date());

  return (
    <div>
      {/* Thanh điều hướng đồng bộ với Calendar: Hôm nay → ‹ › → tên tháng */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
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

        <button
          type="button"
          onClick={() => setImportantOnly((v) => !v)}
          aria-pressed={importantOnly}
          title="Việc quan trọng = dự án dài hơi, hoặc ưu tiên Cao/Critical"
          className={`ml-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            importantOnly
              ? "bg-gold/15 text-gold hover:bg-gold/20"
              : "border border-hair text-dim hover:bg-panel-2 hover:text-text"
          }`}
        >
          {importantOnly
            ? `Chỉ việc quan trọng (${rows.length}/${totalInMonth})`
            : `Tất cả việc trong tháng (${rows.length})`}
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-faint">
          {TONE_ORDER.map((tone) => (
            <span
              key={tone}
              className={`flex items-center gap-1.5 ${counts[tone] === 0 ? "opacity-40" : ""}`}
            >
              <span
                className={`size-2 rounded-full ${TONES[tone].dot}`}
                aria-hidden
              />
              <span className="font-semibold tabular-nums text-dim">
                {counts[tone]}
              </span>
              {TONES[tone].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-2 rotate-45 rounded-[1px] bg-gold" aria-hidden />
            Mốc giai đoạn
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hair px-4 py-8 text-center text-sm text-faint">
          Tháng này chưa có việc nào để vẽ.
          <br />
          <span className="text-[12px]">
            Biểu đồ chỉ nhận việc có mốc kế hoạch — điền Ngày bắt đầu hoặc Deadline
            trong form task
            {importantOnly && totalInMonth > 0 && (
              <>, hoặc bấm nút lọc để xem cả {totalInMonth} việc trong tháng</>
            )}
            .
          </span>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hair bg-panel">
          <div className={MIN_W}>
            {/* Trục tầng 1 — dải tuần */}
            <div className="flex bg-panel-2">
              <div
                className={`${LABEL_W} sticky left-0 z-30 shrink-0 border-r border-hair bg-panel-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-faint`}
              >
                Tuần
              </div>
              <div className="grid flex-1" style={{ gridTemplateColumns: columns }}>
                {weeks.map((w) => (
                  <div
                    key={w.start}
                    style={{ gridColumn: `${w.start + 1} / span ${w.span}` }}
                    className="border-l border-hair py-1 text-center text-[10px] tabular-nums text-faint first:border-l-0"
                  >
                    {w.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Trục tầng 2 — ngày + thứ */}
            <div className="flex border-b border-hair bg-panel-2">
              <div
                className={`${LABEL_W} sticky left-0 z-30 shrink-0 border-r border-hair bg-panel-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint`}
              >
                Dự án / đầu việc
              </div>
              <div className="grid flex-1" style={{ gridTemplateColumns: columns }}>
                {days.map((d, i) => {
                  const isToday = d.key === todayKey;
                  return (
                    <div
                      key={d.key}
                      className={`py-1 text-center leading-tight ${dayEdge(d, i, isToday)} ${dayShade(d, isToday, true)}`}
                    >
                      <div
                        className={`text-[11px] font-semibold tabular-nums ${
                          isToday
                            ? "text-gold"
                            : d.weekend
                              ? "text-faint"
                              : "text-dim"
                        }`}
                      >
                        {d.day}
                      </div>
                      <div
                        className={`text-[8px] uppercase ${isToday ? "text-gold/80" : "text-faint/70"}`}
                      >
                        {WEEKDAY_LABELS[d.weekday]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {rows.map((row) => (
              <TimelineRowLine
                key={row.task.id}
                row={row}
                columns={columns}
                days={days}
                todayKey={todayKey}
                onEdit={onEdit}
                onShift={onShift}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
