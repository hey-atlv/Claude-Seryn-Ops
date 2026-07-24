import { describe, expect, it } from "vitest";
import type { AlertStatus } from "../src/lib/alerts";
import {
  daysSitting,
  pickTodayTasks,
  projectLight,
  projectProgress,
  TODAY_LIST_LIMIT,
} from "../src/lib/today-core";

// now = 10:00 sáng 21/07/2026 giờ VN
const NOW = new Date("2026-07-21T03:00:00Z");
const DAY_MS = 86_400_000;

// Deadline 23:59:59 giờ VN của một ngày (quy ước form D8)
const endOfDayVN = (isoDay: string) => new Date(`${isoDay}T23:59:59+07:00`);

interface FakeTask {
  id: string;
  priority: string;
  alertStatus: AlertStatus;
  deadline: Date | null;
  priorityScore: number;
}

const task = (over: Partial<FakeTask>): FakeTask => ({
  id: "t",
  priority: "NORMAL",
  alertStatus: "ON_TRACK",
  deadline: null,
  priorityScore: 0,
  ...over,
});

describe("pickTodayTasks — khối ② Hôm nay làm gì", () => {
  it("xếp Critical trước quá hạn trước đến-hạn-hôm-nay, trong nhóm sort score", () => {
    const list = [
      task({ id: "today", deadline: endOfDayVN("2026-07-21"), priorityScore: 80 }),
      task({ id: "overdue", alertStatus: "OVERDUE", deadline: endOfDayVN("2026-07-19"), priorityScore: 50 }),
      task({ id: "crit-low", priority: "CRITICAL", priorityScore: 10 }),
      task({ id: "crit-high", priority: "CRITICAL", priorityScore: 999 }),
    ];
    expect(pickTodayTasks(list, NOW).map((t) => t.id)).toEqual([
      "crit-high",
      "crit-low",
      "overdue",
      "today",
    ]);
  });

  it("bỏ task thường chưa đến hạn và cắt tối đa 7 việc", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      task({ id: `c${i}`, priority: "CRITICAL", priorityScore: i }),
    );
    const notToday = task({
      id: "future",
      deadline: endOfDayVN("2026-07-25"),
      priorityScore: 999,
    });
    const picked = pickTodayTasks([notToday, ...many], NOW);
    expect(picked).toHaveLength(TODAY_LIST_LIMIT);
    expect(picked.some((t) => t.id === "future")).toBe(false);
  });

  it("task Critical quá hạn chỉ xuất hiện 1 lần (nhóm Critical)", () => {
    const t = task({
      id: "both",
      priority: "CRITICAL",
      alertStatus: "OVERDUE",
      deadline: endOfDayVN("2026-07-01"),
    });
    expect(pickTodayTasks([t], NOW)).toHaveLength(1);
  });
});

const sub = (over: {
  status?: string;
  deadline?: Date | null;
  movedDaysAgo: number;
}) => ({
  status: over.status ?? "IN_PROGRESS",
  deadline: over.deadline ?? null,
  updatedAt: new Date(NOW.getTime() - over.movedDaysAgo * DAY_MS),
  completedAt: null,
});

describe("projectLight — đèn khối ③", () => {
  it("🔴 khi mọi sub-item không nhích quá 14 ngày", () => {
    const subs = [sub({ movedDaysAgo: 20 }), sub({ movedDaysAgo: 15 })];
    expect(projectLight(subs, new Date(0), NOW)).toBe("RED");
  });

  it("🔴 thắng 🟡 khi vừa đứng im vừa có việc con trễ", () => {
    const subs = [
      sub({ movedDaysAgo: 20, deadline: endOfDayVN("2026-07-01") }),
    ];
    expect(projectLight(subs, new Date(0), NOW)).toBe("RED");
  });

  it("🟡 khi có việc con chưa xong đã trễ deadline (nhưng vẫn nhích)", () => {
    const subs = [
      sub({ movedDaysAgo: 2, deadline: endOfDayVN("2026-07-19") }),
      sub({ movedDaysAgo: 30, status: "DONE" }),
    ];
    expect(projectLight(subs, new Date(0), NOW)).toBe("YELLOW");
  });

  it("việc con trễ nhưng đã DONE thì không tính 🟡", () => {
    const subs = [
      sub({ movedDaysAgo: 1, status: "DONE", deadline: endOfDayVN("2026-07-10") }),
    ];
    expect(projectLight(subs, new Date(0), NOW)).toBe("GREEN");
  });

  it("completedAt mới cũng tính là nhích", () => {
    const stale = sub({ movedDaysAgo: 30 });
    const subs = [{ ...stale, completedAt: new Date(NOW.getTime() - DAY_MS) }];
    expect(projectLight(subs, new Date(0), NOW)).toBe("GREEN");
  });

  it("chưa có sub-item → xét mốc của chính project", () => {
    expect(
      projectLight([], new Date(NOW.getTime() - 20 * DAY_MS), NOW),
    ).toBe("RED");
    expect(
      projectLight([], new Date(NOW.getTime() - 3 * DAY_MS), NOW),
    ).toBe("GREEN");
  });
});

describe("projectProgress + daysSitting", () => {
  it("tính % theo sub DONE, làm tròn", () => {
    const subs = [{ status: "DONE" }, { status: "TODO" }, { status: "TODO" }];
    expect(projectProgress(subs)).toEqual({ done: 1, total: 3, pct: 33 });
    expect(projectProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it("daysSitting đếm tròn ngày, không âm", () => {
    expect(daysSitting(new Date(NOW.getTime() - 2.5 * DAY_MS), NOW)).toBe(2);
    expect(daysSitting(new Date(NOW.getTime() + DAY_MS), NOW)).toBe(0);
  });
});
