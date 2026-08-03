import { fromZonedTime } from "date-fns-tz";
import { VN_TZ, formatVN } from "./timezone";

// Logic thuần cho đồng bộ 2 chiều Task ↔ Google Calendar — tách khỏi lớp gọi
// API thật (google-sync.ts) để test độc lập, giống pattern today-core.ts.

/** Deadline VN → ngày all-day event Google ("yyyy-MM-dd" theo giờ VN) */
export function toGoogleEventDate(deadline: Date): string {
  return formatVN(deadline, "yyyy-MM-dd");
}

/** Ngày all-day event Google → deadline 23:59:59 giờ VN (khớp quy ước task-form.tsx) */
export function fromGoogleEventDate(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59.999`, VN_TZ);
}

export interface SyncableTask {
  parentId: string | null;
  deadline: Date | null;
}

/** Chỉ đồng bộ Task/Project cấp cao nhất có deadline — bỏ sub-items, bỏ task chưa có hạn */
export function shouldSyncTask(task: SyncableTask): boolean {
  return task.parentId === null && task.deadline !== null;
}

export interface TitleableTask {
  title: string;
  status: string;
}

/** Task Done giữ event nhưng thêm ✅ để phân biệt trên Google Calendar */
export function eventTitleFor(task: TitleableTask): string {
  return task.status === "DONE" ? `✅ ${task.title}` : task.title;
}

export interface ExternalCalendarEvent {
  id: string;
  title: string;
  dateKey: string; // "yyyy-MM-dd" theo lịch VN, khớp dateKeyVN của calendar-core.ts
  time: string | null; // "HH:mm" giờ VN — null khi là event cả ngày
}

/** Mốc `start`/`end` của event Google: cả ngày dùng `date`, có giờ dùng `dateTime` */
export interface GoogleEventSlot {
  date?: string | null;
  dateTime?: string | null;
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mốc bắt đầu của event Google → ô ngày trên Calendar view (theo lịch VN).
 * Event cả ngày (`date`) giữ nguyên ngày Google gửi; event có giờ (`dateTime`,
 * kèm offset bất kỳ) được quy đổi sang giờ VN. Trả null nếu không parse được —
 * dữ liệu Google lạ không được phép làm hỏng cả tháng lịch.
 */
export function eventSlotVN(
  start: GoogleEventSlot | null | undefined,
): { dateKey: string; time: string | null } | null {
  if (!start) return null;

  if (start.date) {
    return DATE_ONLY_RE.test(start.date)
      ? { dateKey: start.date, time: null }
      : null;
  }

  if (start.dateTime) {
    const at = new Date(start.dateTime);
    if (Number.isNaN(at.getTime())) return null;
    return { dateKey: formatVN(at, "yyyy-MM-dd"), time: formatVN(at, "HH:mm") };
  }

  return null;
}

/** Khoảng UTC ISO của 1 tháng theo giờ VN — làm timeMin/timeMax khi liệt kê event
 * Google không do app tạo (J3 — hiển thị Calendar view + "tạo task từ event"). */
export function monthRangeVN(year: number, month: number): {
  timeMin: string;
  timeMax: string;
} {
  const pad = (n: number) => String(n).padStart(2, "0");
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return {
    timeMin: fromZonedTime(`${year}-${pad(month)}-01T00:00:00`, VN_TZ).toISOString(),
    timeMax: fromZonedTime(`${next.y}-${pad(next.m)}-01T00:00:00`, VN_TZ).toISOString(),
  };
}

export type ConflictResolution = "USE_TASK" | "USE_EVENT" | "NOOP";

export interface ConflictInput {
  taskUpdatedAt: Date;
  taskDeadlineKey: string | null; // toGoogleEventDate(task.deadline) hoặc null
  eventUpdatedAt: Date;
  eventDeadlineKey: string; // ngày all-day hiện tại của event trên Google
}

/**
 * Last-write-wins theo mốc cập nhật — dùng khi pull-sync thấy event Google có
 * ngày khác deadline hiện tại của task. NOOP khi hai bên đã khớp (chặn vòng lặp
 * ping-pong: push vừa tạo/sửa event thì lần pull kế tiếp không cần ghi lại).
 */
export function resolveConflict(input: ConflictInput): ConflictResolution {
  if (input.taskDeadlineKey === input.eventDeadlineKey) return "NOOP";
  return input.eventUpdatedAt.getTime() > input.taskUpdatedAt.getTime()
    ? "USE_EVENT"
    : "USE_TASK";
}
