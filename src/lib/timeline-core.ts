import { dateKeyVN } from "./calendar-core";
import type { TaskRow } from "./task-row";

// Logic thuần cho view "Dòng thời gian" (Gantt tháng) — mỗi dự án/đầu việc là
// một thanh trải từ ngày bắt đầu tới deadline, cắt gọn trong tháng đang xem.
// Tách khỏi component để test được (giống calendar-core / eisenhower).
//
// Mọi mốc quy về khóa ngày VN dạng "yyyy-MM-dd" rồi mới so sánh: chuỗi này so
// sánh từ điển đúng bằng so sánh thời gian, nên không cần dựng Date trung gian.

const DAY_MS = 86_400_000;

export interface TimelineDay {
  key: string; // "yyyy-MM-dd" theo lịch VN
  day: number; // 1..31
  weekday: number; // 0 = chủ nhật … 6 = thứ 7 — dùng để chia tuần trên trục
  weekend: boolean; // thứ 7 hoặc chủ nhật
}

/** Thanh của một việc, quy về chỉ số cột ngày (0-based) trong tháng đang xem */
export interface TimelineBar {
  startIndex: number; // cột ngày bắt đầu (đã cắt vào tháng)
  endIndex: number; // cột ngày kết thúc, TÍNH CẢ ngày này
  clippedStart: boolean; // việc đã bắt đầu từ trước tháng
  clippedEnd: boolean; // việc còn kéo sang tháng sau
  startKey: string; // mốc bắt đầu thật (chưa cắt) — để hiện tooltip
  endKey: string; // mốc kết thúc thật (chưa cắt)
  inferredStart: boolean; // true = chưa điền startDate, đang lùi về ngày tạo
}

/** Mốc giai đoạn con của Project rơi vào tháng đang xem */
export interface TimelineMilestone {
  id: string;
  index: number; // cột ngày
  key: string; // "yyyy-MM-dd" của chính mốc này
  title: string;
  done: boolean;
}

export interface TimelineRow {
  task: TaskRow;
  bar: TimelineBar;
  milestones: TimelineMilestone[];
  progressPct: number;
}

/** Danh sách ngày của tháng (month 1-12) — trục ngang của biểu đồ */
export function monthDaysVN(year: number, month: number): TimelineDay[] {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: TimelineDay[] = [];
  for (let d = 1; d <= count; d++) {
    const t = new Date(Date.UTC(year, month - 1, d));
    const weekday = t.getUTCDay();
    days.push({
      key: t.toISOString().slice(0, 10),
      day: d,
      weekday,
      weekend: weekday === 0 || weekday === 6,
    });
  }
  return days;
}

/** Số ngày từ khóa `from` tới khóa `to` (âm nếu `to` sớm hơn) */
function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

/**
 * "Quan trọng" theo nghĩa của trang này: dự án dài hơi, hoặc việc được đánh
 * ưu tiên Cao/Critical. Đây là bộ lọc mặc định của biểu đồ — vẫn xem được
 * tất cả bằng công tắc trên UI.
 */
export function isImportantTask(task: TaskRow): boolean {
  return (
    task.type === "PROJECT" ||
    task.priority === "CRITICAL" ||
    task.priority === "HIGH"
  );
}

/** Mốc kết thúc muộn nhất trong các giai đoạn con (null nếu không có) */
function lastSubItemDeadline(task: TaskRow): string | null {
  let latest: string | null = null;
  for (const sub of task.subItems) {
    if (!sub.deadline) continue;
    const key = dateKeyVN(new Date(sub.deadline));
    if (latest === null || key > latest) latest = key;
  }
  return latest;
}

// Trạng thái quy ra % khi việc không có giai đoạn con để đếm. Không phải số đo
// thật, chỉ là gợi ý thị giác cho biết thanh đã đi được bao xa.
const STATUS_PROGRESS: Record<string, number> = {
  TODO: 0,
  IN_PROGRESS: 45,
  REVIEW: 80,
  DONE: 100,
};

/** % hoàn thành của một việc: Project đếm giai đoạn con, việc lẻ suy từ trạng thái */
export function progressPct(task: TaskRow): number {
  if (task.status === "DONE") return 100;
  const total = task.subItems.length;
  if (total > 0) {
    const done = task.subItems.filter((s) => s.status === "DONE").length;
    return Math.round((done / total) * 100);
  }
  return STATUS_PROGRESS[task.status] ?? 0;
}

interface PlanRange {
  startKey: string;
  endKey: string;
  inferredStart: boolean;
}

/**
 * Khoảng kế hoạch thật của một việc, chưa cắt theo tháng.
 * Trả null khi việc không có mốc nào để vẽ (không startDate, không deadline,
 * không giai đoạn con có hạn) — ngày tạo một mình không phải là kế hoạch.
 */
function planRange(task: TaskRow): PlanRange | null {
  const endSource = task.deadline
    ? dateKeyVN(new Date(task.deadline))
    : lastSubItemDeadline(task);
  const startSource = task.startDate ? dateKeyVN(new Date(task.startDate)) : null;

  if (startSource === null) {
    if (endSource === null) return null;
    // Chưa điền ngày bắt đầu → lùi về ngày tạo, nhưng không được muộn hơn hạn
    // (việc nhập sau khi đã quá hạn sẽ thành thanh 1 ngày đúng ở deadline).
    const created = dateKeyVN(new Date(task.createdAt));
    return {
      startKey: created < endSource ? created : endSource,
      endKey: endSource,
      inferredStart: true,
    };
  }

  // Có ngày bắt đầu nhưng chưa có hạn (hoặc hạn sớm hơn) → thanh 1 ngày ở mốc bắt đầu.
  return {
    startKey: startSource,
    endKey: endSource !== null && endSource > startSource ? endSource : startSource,
    inferredStart: false,
  };
}

/** Cắt khoảng kế hoạch vào tháng đang xem; null = không giao với tháng */
function clipToMonth(
  range: PlanRange,
  firstKey: string,
  lastKey: string,
): TimelineBar | null {
  if (range.endKey < firstKey || range.startKey > lastKey) return null;
  const from = range.startKey < firstKey ? firstKey : range.startKey;
  const to = range.endKey > lastKey ? lastKey : range.endKey;
  return {
    startIndex: daysBetween(firstKey, from),
    endIndex: daysBetween(firstKey, to),
    clippedStart: range.startKey < firstKey,
    clippedEnd: range.endKey > lastKey,
    startKey: range.startKey,
    endKey: range.endKey,
    inferredStart: range.inferredStart,
  };
}

/** Giai đoạn con có hạn rơi vào tháng đang xem, xếp theo ngày tăng dần */
function milestonesInMonth(
  task: TaskRow,
  firstKey: string,
  lastKey: string,
): TimelineMilestone[] {
  return task.subItems
    .flatMap((sub) => {
      if (!sub.deadline) return [];
      const key = dateKeyVN(new Date(sub.deadline));
      if (key < firstKey || key > lastKey) return [];
      return [
        {
          id: sub.id,
          index: daysBetween(firstKey, key),
          key,
          title: sub.title,
          done: sub.status === "DONE",
        },
      ];
    })
    .sort((a, b) => a.index - b.index);
}

export interface TimelineOptions {
  /** true = chỉ dự án + việc Critical/High (mặc định của biểu đồ) */
  importantOnly?: boolean;
}

/**
 * Dựng các dòng của biểu đồ cho tháng `year`/`month` (month 1-12).
 * Việc không giao với tháng, hoặc không có mốc kế hoạch nào, bị loại.
 * Sắp xếp: bắt đầu sớm trước, cùng ngày thì kết thúc sớm trước, rồi theo tên.
 */
export function buildTimelineRows(
  tasks: TaskRow[],
  year: number,
  month: number,
  options: TimelineOptions = {},
): TimelineRow[] {
  const days = monthDaysVN(year, month);
  const firstKey = days[0].key;
  const lastKey = days[days.length - 1].key;
  const pool = options.importantOnly ? tasks.filter(isImportantTask) : tasks;

  return pool
    .flatMap((task) => {
      const range = planRange(task);
      if (!range) return [];
      const bar = clipToMonth(range, firstKey, lastKey);
      if (!bar) return [];
      return [
        {
          task,
          bar,
          milestones: milestonesInMonth(task, firstKey, lastKey),
          progressPct: progressPct(task),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.bar.startIndex - b.bar.startIndex ||
        a.bar.endIndex - b.bar.endIndex ||
        a.task.title.localeCompare(b.task.title, "vi"),
    );
}
