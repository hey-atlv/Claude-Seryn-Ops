import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentMonthVN,
  dateKeyVN,
  monthGridVN,
} from "../src/lib/calendar-core";

describe("monthGridVN", () => {
  it("tháng 7/2026 (bắt đầu thứ 4): đệm từ thứ 2 29/06, kết thúc 02/08", () => {
    const grid = monthGridVN(2026, 7);
    expect(grid).toHaveLength(5);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[0][0]).toEqual({ key: "2026-06-29", day: 29, inMonth: false });
    expect(grid[0][2]).toEqual({ key: "2026-07-01", day: 1, inMonth: true });
    expect(grid[4][6]).toEqual({ key: "2026-08-02", day: 2, inMonth: false });
  });

  it("tháng 2/2027 (28 ngày, mở đầu đúng thứ 2): tròn 4 tuần không đệm", () => {
    const grid = monthGridVN(2027, 2);
    expect(grid).toHaveLength(4);
    expect(grid[0][0]).toEqual({ key: "2027-02-01", day: 1, inMonth: true });
    expect(grid[3][6]).toEqual({ key: "2027-02-28", day: 28, inMonth: true });
    expect(grid.flat().every((d) => d.inMonth)).toBe(true);
  });

  it("tháng 12 → tháng 1 đệm sang năm mới đúng", () => {
    const grid = monthGridVN(2026, 12);
    const last = grid.at(-1)!.at(-1)!;
    // 31/12/2026 là thứ 5 → tuần cuối đệm tới CN 03/01/2027
    expect(last).toEqual({ key: "2027-01-03", day: 3, inMonth: false });
  });
});

describe("dateKeyVN", () => {
  it("biên ngày theo giờ VN: 16:59Z cùng ngày, 17:00Z sang ngày mới", () => {
    expect(dateKeyVN(new Date("2026-07-17T16:59:59Z"))).toBe("2026-07-17");
    expect(dateKeyVN(new Date("2026-07-17T17:00:00Z"))).toBe("2026-07-18");
  });
});

describe("currentMonthVN", () => {
  it("23:30 VN ngày cuối tháng vẫn là tháng đó; 00:30 VN ngày 1 là tháng mới", () => {
    // 31/07 23:30 VN = 31/07 16:30 UTC
    expect(currentMonthVN(new Date("2026-07-31T16:30:00Z"))).toEqual({
      year: 2026,
      month: 7,
    });
    // 01/08 00:30 VN = 31/07 17:30 UTC
    expect(currentMonthVN(new Date("2026-07-31T17:30:00Z"))).toEqual({
      year: 2026,
      month: 8,
    });
  });
});

describe("addMonths", () => {
  it("qua biên năm cả hai chiều", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths(2026, 7, -19)).toEqual({ year: 2024, month: 12 });
  });
});
