import { vi } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

// Toàn hệ thống dùng giờ Việt Nam. DB lưu UTC; mọi ranh giới ngày tính theo VN.
export const VN_TZ = "Asia/Ho_Chi_Minh";

const DAY_MS = 86_400_000;

/** 00:00 hôm nay theo giờ VN, trả về dạng Date UTC (dùng cho query "Việc hôm nay") */
export function startOfTodayVN(now: Date = new Date()): Date {
  const vnDate = formatInTimeZone(now, VN_TZ, "yyyy-MM-dd");
  return fromZonedTime(`${vnDate}T00:00:00`, VN_TZ);
}

/** 23:59:59.999 hôm nay theo giờ VN */
export function endOfTodayVN(now: Date = new Date()): Date {
  return new Date(startOfTodayVN(now).getTime() + DAY_MS - 1);
}

/**
 * Số ngày (theo lịch VN) từ `now` tới `deadline`.
 * 0 = cùng ngày VN · âm = đã qua · dương = còn n ngày.
 * Tính theo ngày lịch VN chứ không theo mốc 24h, để "còn 2 ngày" khớp
 * trực giác người dùng và không lệch do chênh UTC+7.
 */
export function daysUntilVN(deadline: Date, now: Date = new Date()): number {
  const nowVn = formatInTimeZone(now, VN_TZ, "yyyy-MM-dd");
  const deadlineVn = formatInTimeZone(deadline, VN_TZ, "yyyy-MM-dd");
  return Math.round(
    (Date.parse(`${deadlineVn}T00:00:00Z`) - Date.parse(`${nowVn}T00:00:00Z`)) /
      DAY_MS,
  );
}

/**
 * Format một mốc thời gian theo giờ VN để hiển thị.
 * Locale `vi` để token phụ thuộc ngôn ngữ ra tiếng Việt ("Thứ Sáu" chứ không
 * phải "Friday"); các format số như dd/MM/yyyy không bị ảnh hưởng.
 */
export function formatVN(date: Date, fmt = "dd/MM/yyyy HH:mm"): string {
  return formatInTimeZone(date, VN_TZ, fmt, { locale: vi });
}
