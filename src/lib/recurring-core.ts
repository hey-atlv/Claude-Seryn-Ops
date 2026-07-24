import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { VN_TZ } from "./timezone";

// Logic thuần (không chạm DB) cho việc sinh task/báo cáo lặp lại — test độc lập được.

export type ScheduleType = "WEEKLY" | "MONTHLY";

const DAY_MS = 86_400_000;
const pad2 = (n: number) => String(n).padStart(2, "0");

export interface VnParts {
  year: number;
  month: number;
  day: number;
  isoDow: number; // 1 = thứ 2 ... 7 = chủ nhật
}

export function vnParts(now: Date): VnParts {
  return {
    year: Number(formatInTimeZone(now, VN_TZ, "yyyy")),
    month: Number(formatInTimeZone(now, VN_TZ, "MM")),
    day: Number(formatInTimeZone(now, VN_TZ, "dd")),
    isoDow: Number(formatInTimeZone(now, VN_TZ, "i")),
  };
}

/** Tuần ISO-8601 của một ngày lịch (thuần số học UTC — không phụ thuộc múi giờ máy) */
export function isoWeek(
  year: number,
  month: number,
  day: number,
): { year: number; week: number } {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dow = (date.getUTCDay() + 6) % 7; // 0 = thứ 2
  date.setUTCDate(date.getUTCDate() - dow + 3); // thứ 5 cùng tuần quyết định năm ISO
  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const ftDow = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDow + 3);
  const week =
    1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return { year: isoYear, week };
}

/** Khóa kỳ chống sinh trùng: "2026-W29" hoặc "2026-07" */
export function periodKey(type: ScheduleType, now: Date): string {
  const p = vnParts(now);
  if (type === "WEEKLY") {
    const w = isoWeek(p.year, p.month, p.day);
    return `${w.year}-W${pad2(w.week)}`;
  }
  return `${p.year}-${pad2(p.month)}`;
}

/** Nhãn kỳ cho tên task/báo cáo: "tuần 29/2026" hoặc "tháng 7/2026" */
export function periodLabel(type: ScheduleType, now: Date): string {
  const p = vnParts(now);
  if (type === "WEEKLY") {
    const w = isoWeek(p.year, p.month, p.day);
    return `tuần ${w.week}/${w.year}`;
  }
  return `tháng ${p.month}/${p.year}`;
}

/**
 * Đã đến/qua ngày hẹn trong kỳ hiện tại chưa?
 * Catch-up: mở app trễ vài ngày vẫn sinh bản ghi cho kỳ này —
 * bản sinh muộn sẽ tự hiện 🔴 QUÁ HẠN để được xử lý, không bị bỏ sót.
 */
export function isDue(
  type: ScheduleType,
  scheduleDay: number,
  now: Date,
): boolean {
  const p = vnParts(now);
  return type === "WEEKLY" ? p.isoDow >= scheduleDay : p.day >= scheduleDay;
}

/** Deadline = 23:59:59 giờ VN của ngày hẹn trong kỳ hiện tại */
export function scheduledDeadlineVN(
  type: ScheduleType,
  scheduleDay: number,
  now: Date,
): Date {
  const p = vnParts(now);
  let dateStr: string;
  if (type === "WEEKLY") {
    const noonToday = fromZonedTime(
      `${p.year}-${pad2(p.month)}-${pad2(p.day)}T12:00:00`,
      VN_TZ,
    );
    const target = new Date(
      noonToday.getTime() + (scheduleDay - p.isoDow) * DAY_MS,
    );
    dateStr = formatInTimeZone(target, VN_TZ, "yyyy-MM-dd");
  } else {
    const daysInMonth = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
    dateStr = `${p.year}-${pad2(p.month)}-${pad2(Math.min(scheduleDay, daysInMonth))}`;
  }
  return fromZonedTime(`${dateStr}T23:59:59.999`, VN_TZ);
}
