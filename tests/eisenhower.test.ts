import { describe, expect, it } from "vitest";
import { classify } from "../src/lib/eisenhower";

const base = { priority: "NORMAL", revenueImpact: "MEDIUM" } as const;

describe("classify — ma trận Eisenhower", () => {
  it("Critical luôn là Làm ngay (khẩn + quan trọng), kể cả không deadline", () => {
    expect(
      classify({ ...base, priority: "CRITICAL", alertStatus: "NO_DEADLINE" }),
    ).toBe("DO");
  });

  it("quá hạn/sắp hạn + (ưu tiên Cao hoặc impact Cao) → Làm ngay", () => {
    expect(
      classify({ priority: "HIGH", revenueImpact: "LOW", alertStatus: "OVERDUE" }),
    ).toBe("DO");
    expect(
      classify({
        priority: "NORMAL",
        revenueImpact: "HIGH",
        alertStatus: "DUE_SOON",
      }),
    ).toBe("DO");
  });

  it("quan trọng nhưng chưa khẩn → Lên lịch", () => {
    expect(
      classify({ priority: "HIGH", revenueImpact: "MEDIUM", alertStatus: "ON_TRACK" }),
    ).toBe("SCHEDULE");
    expect(
      classify({
        priority: "NORMAL",
        revenueImpact: "HIGH",
        alertStatus: "NO_DEADLINE",
      }),
    ).toBe("SCHEDULE");
  });

  it("khẩn nhưng ít quan trọng → Giao việc", () => {
    expect(classify({ ...base, alertStatus: "OVERDUE" })).toBe("DELEGATE");
  });

  it("không khẩn, ít quan trọng → Theo dõi", () => {
    expect(classify({ ...base, alertStatus: "ON_TRACK" })).toBe("MONITOR");
    expect(classify({ ...base, alertStatus: "NO_DEADLINE" })).toBe("MONITOR");
  });
});
