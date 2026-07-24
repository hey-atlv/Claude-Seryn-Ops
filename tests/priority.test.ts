import { describe, expect, test } from "vitest";
import { CRITICAL_SCORE, priorityScore } from "../src/lib/priority";

// Mốc thời gian cố định: 10:00 sáng 15/07/2026 giờ VN (= 03:00 UTC)
const NOW = new Date("2026-07-15T03:00:00Z");

const at = (iso: string) => new Date(iso);

describe("priorityScore — công thức 2.1.c", () => {
  test("Critical luôn = 999 bất kể deadline", () => {
    expect(
      priorityScore(
        { priority: "CRITICAL", deadline: null, revenueImpact: "LOW" },
        NOW,
      ),
    ).toBe(CRITICAL_SCORE);
    expect(
      priorityScore(
        {
          priority: "CRITICAL",
          deadline: at("2026-12-31T00:00:00Z"),
          revenueImpact: "LOW",
        },
        NOW,
      ),
    ).toBe(999);
  });

  test("không có deadline = 0", () => {
    expect(
      priorityScore(
        { priority: "NORMAL", deadline: null, revenueImpact: "HIGH" },
        NOW,
      ),
    ).toBe(0);
  });

  test("quá hạn + tác động cao = 80 (50 + 30)", () => {
    expect(
      priorityScore(
        {
          priority: "HIGH",
          deadline: at("2026-07-14T03:00:00Z"),
          revenueImpact: "HIGH",
        },
        NOW,
      ),
    ).toBe(80);
  });

  test("còn 2 ngày + tác động cao = 70 (40 + 30)", () => {
    expect(
      priorityScore(
        {
          priority: "NORMAL",
          deadline: at("2026-07-17T03:00:00Z"),
          revenueImpact: "HIGH",
        },
        NOW,
      ),
    ).toBe(70);
  });

  test("còn 5 ngày + tác động trung bình = 50 (30 + 20)", () => {
    expect(
      priorityScore(
        {
          priority: "NORMAL",
          deadline: at("2026-07-20T03:00:00Z"),
          revenueImpact: "MEDIUM",
        },
        NOW,
      ),
    ).toBe(50);
  });

  test("còn 10 ngày + tác động thấp = 30 (20 + 10)", () => {
    expect(
      priorityScore(
        {
          priority: "NORMAL",
          deadline: at("2026-07-25T03:00:00Z"),
          revenueImpact: "LOW",
        },
        NOW,
      ),
    ).toBe(30);
  });

  test("còn xa (>10 ngày) + tác động thấp = 20 (10 + 10)", () => {
    expect(
      priorityScore(
        {
          priority: "NORMAL",
          deadline: at("2026-08-15T03:00:00Z"),
          revenueImpact: "LOW",
        },
        NOW,
      ),
    ).toBe(20);
  });

  test("múi giờ VN: 01:00 sáng 16/07 VN, deadline 22:00 tối 16/07 VN → cùng ngày VN → urgency 50", () => {
    // 18:00 UTC 15/07 = 01:00 VN 16/07 · 15:00 UTC 16/07 = 22:00 VN 16/07
    // Nếu tính theo UTC sẽ ra "còn 1 ngày" (sai) — theo ngày VN là cùng ngày (đúng)
    const nowVn0100 = at("2026-07-15T18:00:00Z");
    const deadlineVn2200 = at("2026-07-16T15:00:00Z");
    expect(
      priorityScore(
        { priority: "NORMAL", deadline: deadlineVn2200, revenueImpact: "LOW" },
        nowVn0100,
      ),
    ).toBe(60); // 50 (cùng ngày) + 10
  });
});
