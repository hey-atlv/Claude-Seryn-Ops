import { describe, expect, test } from "vitest";
import { alertStatus, isSilent } from "../src/lib/alerts";

// 10:00 sáng 15/07/2026 giờ VN (= 03:00 UTC)
const NOW = new Date("2026-07-15T03:00:00Z");
const at = (iso: string) => new Date(iso);
const DAY = 86_400_000;

describe("alertStatus — công thức 2.1.d", () => {
  test("Done → DONE bất kể deadline", () => {
    expect(
      alertStatus({ status: "DONE", deadline: at("2026-07-01T00:00:00Z") }, NOW),
    ).toBe("DONE");
  });

  test("không có deadline → NO_DEADLINE", () => {
    expect(alertStatus({ status: "TODO", deadline: null }, NOW)).toBe(
      "NO_DEADLINE",
    );
  });

  test("deadline đã qua → OVERDUE", () => {
    expect(
      alertStatus(
        { status: "IN_PROGRESS", deadline: at("2026-07-15T02:00:00Z") },
        NOW,
      ),
    ).toBe("OVERDUE");
  });

  test("còn ≤2 ngày → DUE_SOON", () => {
    expect(
      alertStatus(
        { status: "TODO", deadline: at("2026-07-17T03:00:00Z") },
        NOW,
      ),
    ).toBe("DUE_SOON");
  });

  test("còn >2 ngày → ON_TRACK", () => {
    expect(
      alertStatus(
        { status: "TODO", deadline: at("2026-07-20T03:00:00Z") },
        NOW,
      ),
    ).toBe("ON_TRACK");
  });

  test("múi giờ VN: 23:00 đêm 15/07 VN, deadline 23:59 cùng ngày VN → DUE_SOON, KHÔNG phải OVERDUE", () => {
    // 16:00 UTC = 23:00 VN · 16:59 UTC = 23:59 VN
    const nowVn2300 = at("2026-07-15T16:00:00Z");
    const deadlineVn2359 = at("2026-07-15T16:59:00Z");
    expect(
      alertStatus({ status: "TODO", deadline: deadlineVn2359 }, nowVn2300),
    ).toBe("DUE_SOON");
  });
});

describe("isSilent — task im lặng >7 ngày (view 🤫)", () => {
  const created = at("2026-06-01T00:00:00Z");

  test("In progress, update cuối 8 ngày trước → im lặng", () => {
    expect(
      isSilent(
        {
          status: "IN_PROGRESS",
          lastUpdateAt: new Date(NOW.getTime() - 8 * DAY),
          createdAt: created,
        },
        NOW,
      ),
    ).toBe(true);
  });

  test("In progress, update cuối 6 ngày trước → chưa im lặng", () => {
    expect(
      isSilent(
        {
          status: "IN_PROGRESS",
          lastUpdateAt: new Date(NOW.getTime() - 6 * DAY),
          createdAt: created,
        },
        NOW,
      ),
    ).toBe(false);
  });

  test("chưa từng update → tính từ ngày tạo", () => {
    expect(
      isSilent(
        { status: "IN_PROGRESS", lastUpdateAt: null, createdAt: created },
        NOW,
      ),
    ).toBe(true);
  });

  test("không ở In progress → không tính im lặng", () => {
    expect(
      isSilent(
        {
          status: "TODO",
          lastUpdateAt: new Date(NOW.getTime() - 30 * DAY),
          createdAt: created,
        },
        NOW,
      ),
    ).toBe(false);
  });
});
