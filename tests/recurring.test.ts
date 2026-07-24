import { describe, expect, test } from "vitest";
import {
  isDue,
  isoWeek,
  periodKey,
  periodLabel,
  scheduledDeadlineVN,
} from "../src/lib/recurring-core";

// Thứ 5, 16/07/2026 10:00 giờ VN (= 03:00 UTC)
const NOW = new Date("2026-07-16T03:00:00Z");

describe("isoWeek", () => {
  test("16/07/2026 thuộc tuần 29", () => {
    expect(isoWeek(2026, 7, 16)).toEqual({ year: 2026, week: 29 });
  });
  test("01/01/2026 (thứ 5) thuộc tuần 1/2026", () => {
    expect(isoWeek(2026, 1, 1)).toEqual({ year: 2026, week: 1 });
  });
  test("01/01/2027 (thứ 6) thuộc tuần 53/2026 — năm ISO khác năm lịch", () => {
    expect(isoWeek(2027, 1, 1)).toEqual({ year: 2026, week: 53 });
  });
});

describe("periodKey / periodLabel", () => {
  test("weekly", () => {
    expect(periodKey("WEEKLY", NOW)).toBe("2026-W29");
    expect(periodLabel("WEEKLY", NOW)).toBe("tuần 29/2026");
  });
  test("monthly", () => {
    expect(periodKey("MONTHLY", NOW)).toBe("2026-07");
    expect(periodLabel("MONTHLY", NOW)).toBe("tháng 7/2026");
  });
});

describe("isDue — hôm nay thứ 5 (isoDow 4), ngày 16", () => {
  test("weekly hẹn thứ 2 → đến hạn (catch-up trong tuần)", () => {
    expect(isDue("WEEKLY", 1, NOW)).toBe(true);
  });
  test("weekly hẹn thứ 5 → đúng hôm nay", () => {
    expect(isDue("WEEKLY", 4, NOW)).toBe(true);
  });
  test("weekly hẹn thứ 6 → chưa", () => {
    expect(isDue("WEEKLY", 5, NOW)).toBe(false);
  });
  test("monthly hẹn ngày 1 → đến hạn", () => {
    expect(isDue("MONTHLY", 1, NOW)).toBe(true);
  });
  test("monthly hẹn ngày 20 → chưa", () => {
    expect(isDue("MONTHLY", 20, NOW)).toBe(false);
  });
});

describe("scheduledDeadlineVN — 23:59:59 giờ VN của ngày hẹn", () => {
  test("weekly thứ 2 → 13/07/2026 23:59 VN (= 16:59 UTC)", () => {
    expect(scheduledDeadlineVN("WEEKLY", 1, NOW).toISOString()).toBe(
      "2026-07-13T16:59:59.999Z",
    );
  });
  test("monthly ngày 1 → 01/07/2026 23:59 VN", () => {
    expect(scheduledDeadlineVN("MONTHLY", 1, NOW).toISOString()).toBe(
      "2026-07-01T16:59:59.999Z",
    );
  });
  test("weekly thứ 7 (ngày chưa tới) → 18/07/2026 23:59 VN", () => {
    expect(scheduledDeadlineVN("WEEKLY", 6, NOW).toISOString()).toBe(
      "2026-07-18T16:59:59.999Z",
    );
  });
});
