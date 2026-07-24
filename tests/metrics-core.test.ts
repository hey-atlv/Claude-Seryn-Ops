import { describe, expect, it } from "vitest";
import { doneOnTimeRate } from "../src/lib/metrics-core";

const d = (iso: string) => new Date(iso);

describe("doneOnTimeRate — % hoàn thành đúng hạn", () => {
  it("chỉ tính task có đủ deadline + completedAt", () => {
    const rate = doneOnTimeRate([
      { deadline: d("2026-07-10T00:00:00Z"), completedAt: d("2026-07-09T00:00:00Z") }, // đúng hạn
      { deadline: d("2026-07-10T00:00:00Z"), completedAt: d("2026-07-12T00:00:00Z") }, // trễ
      { deadline: null, completedAt: d("2026-07-01T00:00:00Z") }, // loại — thiếu deadline
      { deadline: d("2026-07-01T00:00:00Z"), completedAt: null }, // loại — thiếu completedAt
    ]);
    expect(rate).toEqual({ onTime: 1, total: 2, pct: 50 });
  });

  it("hoàn thành đúng ngay hạn chót vẫn tính đúng hạn", () => {
    const same = d("2026-07-10T23:59:59Z");
    expect(doneOnTimeRate([{ deadline: same, completedAt: same }])).toEqual({
      onTime: 1,
      total: 1,
      pct: 100,
    });
  });

  it("không có task đủ điều kiện → pct null", () => {
    expect(doneOnTimeRate([])).toEqual({ onTime: 0, total: 0, pct: null });
    expect(
      doneOnTimeRate([{ deadline: null, completedAt: null }]),
    ).toEqual({ onTime: 0, total: 0, pct: null });
  });
});
