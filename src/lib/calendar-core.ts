import { formatInTimeZone } from "date-fns-tz";
import { VN_TZ } from "./timezone";

// Logic thuần cho Calendar view (D6) — grid tháng theo lịch VN, tuần bắt đầu
// thứ 2. Tách khỏi component để test được (giống recurring-core).

const DAY_MS = 86_400_000;

export interface CalendarDay {
  key: string; // "yyyy-MM-dd" theo lịch VN
  day: number; // ngày trong tháng (1-31)
  inMonth: boolean; // thuộc tháng đang xem hay là ngày đệm đầu/cuối
}

/** Grid tháng: mảng tuần × 7 ngày, đệm đủ tuần bằng ngày tháng kề. month 1-12. */
export function monthGridVN(year: number, month: number): CalendarDay[][] {
  const first = Date.UTC(year, month - 1, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay: 0=CN..6=thứ 7 → offset so với thứ 2 đầu tuần
  const offset = (new Date(first).getUTCDay() + 6) % 7;
  const weekCount = Math.ceil((offset + daysInMonth) / 7);

  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const t = new Date(first + (w * 7 + d - offset) * DAY_MS);
      week.push({
        key: t.toISOString().slice(0, 10),
        day: t.getUTCDate(),
        inMonth: t.getUTCMonth() === month - 1,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

/** Khóa ngày VN ("yyyy-MM-dd") của một mốc thời gian — để gắn task vào ô lịch */
export function dateKeyVN(date: Date): string {
  return formatInTimeZone(date, VN_TZ, "yyyy-MM-dd");
}

/** Tháng hiện tại theo giờ VN */
export function currentMonthVN(now: Date = new Date()): {
  year: number;
  month: number;
} {
  const [y, m] = formatInTimeZone(now, VN_TZ, "yyyy-MM").split("-");
  return { year: Number(y), month: Number(m) };
}

/** Cộng/trừ tháng (delta có thể âm) — dùng cho nút ← → của calendar */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (((total % 12) + 12) % 12) + 1 };
}
