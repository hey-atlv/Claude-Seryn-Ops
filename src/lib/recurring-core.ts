import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ISO_WEEKDAY_LABELS, RECURRING_SCHEDULE_LABELS } from "./constants";
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

/** Mốc 12:00 trưa VN của ngày đầu kỳ kế tiếp — chỉ dùng làm neo để tính ngày hẹn kỳ sau */
function nextPeriodAnchor(type: ScheduleType, now: Date): Date {
  if (type === "WEEKLY") return new Date(now.getTime() + 7 * DAY_MS);
  const p = vnParts(now);
  const year = p.month === 12 ? p.year + 1 : p.year;
  const month = p.month === 12 ? 1 : p.month + 1;
  return fromZonedTime(`${year}-${pad2(month)}-01T12:00:00`, VN_TZ);
}

/**
 * Ngày hẹn kế tiếp còn hiệu lực: ngày hẹn của kỳ hiện tại nếu chưa qua,
 * ngược lại là ngày hẹn của kỳ sau. Dùng để hiển thị "lần sinh tới" ở Cài đặt.
 */
export function nextOccurrenceVN(
  type: ScheduleType,
  scheduleDay: number,
  now: Date = new Date(),
): Date {
  const current = scheduledDeadlineVN(type, scheduleDay, now);
  if (current.getTime() >= now.getTime()) return current;
  return scheduledDeadlineVN(type, scheduleDay, nextPeriodAnchor(type, now));
}

/** Mô tả lịch cho UI: "Hằng tuần · Thứ 6" · "Hằng tháng · ngày 1" · "Không tự sinh" */
export function scheduleText(
  scheduleType: string,
  scheduleDay: number | null,
): string {
  if (scheduleType === "WEEKLY") {
    const label = ISO_WEEKDAY_LABELS[scheduleDay ?? 1] ?? `thứ ${scheduleDay}`;
    return `${RECURRING_SCHEDULE_LABELS.WEEKLY} · ${label}`;
  }
  if (scheduleType === "MONTHLY") {
    return `${RECURRING_SCHEDULE_LABELS.MONTHLY} · ngày ${scheduleDay ?? 1}`;
  }
  return RECURRING_SCHEDULE_LABELS.NONE;
}

// ── Template định kỳ: field điền sẵn & chuẩn hóa trước khi ghi DB ──

/** Field điền sẵn khi sinh bản ghi — lưu dạng JSON ở RecurringTemplate.defaults */
export interface RecurringDefaults {
  /** TASK: TASK|PROJECT · REPORT: WEEKLY|MONTHLY */
  type?: string;
  team?: string;
  category?: string;
  priority?: string;
  revenueImpact?: string;
}

export interface RecurringTemplateInput {
  name: string;
  targetDb: string;
  scheduleType: string;
  scheduleDay: number | null;
  defaults: RecurringDefaults;
  subItems: string[];
  active: boolean;
}

/** Đúng các cột của bảng RecurringTemplate */
export interface RecurringTemplateRecord {
  name: string;
  targetDb: string;
  scheduleType: string;
  scheduleDay: number | null;
  defaults: string;
  subItemsTemplate: string | null;
  active: boolean;
}

/** JSON hỏng (sửa tay/dữ liệu cũ) không được làm sập trang — coi như không có defaults */
export function parseDefaults(raw: string | null): RecurringDefaults {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as RecurringDefaults) : {};
  } catch {
    return {};
  }
}

export function parseSubItems(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Bỏ các field không thuộc loại đích trước khi validate/ghi:
 * template REPORT chỉ giữ `type`, template không tự sinh thì không có ngày hẹn.
 */
export function normalizeRecurringInput(
  input: RecurringTemplateInput,
): RecurringTemplateInput {
  const isReport = input.targetDb === "REPORT";
  const trimmed = (v: string | undefined) => {
    const s = v?.trim();
    return s ? s : undefined;
  };
  const defaults: RecurringDefaults = isReport
    ? { type: trimmed(input.defaults.type) }
    : {
        type: trimmed(input.defaults.type),
        team: trimmed(input.defaults.team),
        category: trimmed(input.defaults.category),
        priority: trimmed(input.defaults.priority),
        revenueImpact: trimmed(input.defaults.revenueImpact),
      };

  return {
    name: input.name.trim(),
    targetDb: input.targetDb,
    scheduleType: input.scheduleType,
    scheduleDay: input.scheduleType === "NONE" ? null : input.scheduleDay,
    // Field undefined bị JSON.stringify loại bỏ → defaults luôn gọn
    defaults: JSON.parse(JSON.stringify(defaults)) as RecurringDefaults,
    subItems: isReport ? [] : input.subItems.map(s => s.trim()).filter(Boolean),
    active: input.active,
  };
}

/** Input đã chuẩn hóa → đúng các cột DB (defaults/subItems lưu JSON) */
export function toTemplateRecord(
  input: RecurringTemplateInput,
): RecurringTemplateRecord {
  return {
    name: input.name,
    targetDb: input.targetDb,
    scheduleType: input.scheduleType,
    scheduleDay: input.scheduleDay,
    defaults: JSON.stringify(input.defaults),
    subItemsTemplate: input.subItems.length ? JSON.stringify(input.subItems) : null,
    active: input.active,
  };
}
