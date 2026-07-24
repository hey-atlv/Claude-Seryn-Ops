// Logic thuần cho nhắc việc phân tầng (F1) — tách khỏi component để test được.
// Tần suất theo kế hoạch: Critical mỗi lần mở app + mỗi 2h · Cao 2 lần/ngày ·
// Thường 1 lần (1 ngày trước deadline).

export type NotifyTier = "CRITICAL" | "HIGH" | "NORMAL";

const HOUR_MS = 3_600_000;

export const REMINDER_INTERVAL_MS: Record<NotifyTier, number> = {
  CRITICAL: 2 * HOUR_MS,
  HIGH: 12 * HOUR_MS, // 2 lần/ngày
  NORMAL: 24 * HOUR_MS, // 1 lần cho mỗi deadline
};

export interface NotifyItem {
  id: string; // ổn định theo task + tầng (+ kỳ deadline với NORMAL) để throttle
  tier: NotifyTier;
  title: string;
  detail: string;
  href: string;
}

export interface FilterDueOptions {
  /** Các tầng bỏ qua throttle — VD CRITICAL khi vừa mở app */
  alwaysTiers?: NotifyTier[];
}

/** Lọc thông báo đến hạn nhắc lại theo tần suất phân tầng */
export function filterDue(
  items: NotifyItem[],
  lastShown: Record<string, number>,
  nowMs: number,
  options: FilterDueOptions = {},
): NotifyItem[] {
  const always = new Set(options.alwaysTiers ?? []);
  return items.filter((item) => {
    if (always.has(item.tier)) return true;
    const last = lastShown[item.id];
    return (
      last === undefined || nowMs - last >= REMINDER_INTERVAL_MS[item.tier]
    );
  });
}
