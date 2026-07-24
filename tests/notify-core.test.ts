import { describe, expect, it } from "vitest";
import { filterDue, type NotifyItem } from "../src/lib/notify-core";

const HOUR = 3_600_000;
const NOW = 1_800_000_000_000;

const item = (id: string, tier: NotifyItem["tier"]): NotifyItem => ({
  id,
  tier,
  title: id,
  detail: "",
  href: "/tasks",
});

describe("filterDue", () => {
  it("chưa từng hiện → đến hạn nhắc ở mọi tầng", () => {
    const items = [item("a", "CRITICAL"), item("b", "HIGH"), item("c", "NORMAL")];
    expect(filterDue(items, {}, NOW)).toHaveLength(3);
  });

  it("CRITICAL: nhắc lại sau 2h, chưa đủ 2h thì im", () => {
    const items = [item("a", "CRITICAL")];
    expect(filterDue(items, { a: NOW - 1 * HOUR }, NOW)).toHaveLength(0);
    expect(filterDue(items, { a: NOW - 2 * HOUR }, NOW)).toHaveLength(1);
  });

  it("HIGH: 2 lần/ngày (12h) · NORMAL: 1 lần/ngày (24h)", () => {
    const items = [item("h", "HIGH"), item("n", "NORMAL")];
    const shown11h = { h: NOW - 11 * HOUR, n: NOW - 23 * HOUR };
    expect(filterDue(items, shown11h, NOW)).toHaveLength(0);
    const shownDue = { h: NOW - 12 * HOUR, n: NOW - 24 * HOUR };
    expect(filterDue(items, shownDue, NOW)).toHaveLength(2);
  });

  it("alwaysTiers bỏ qua throttle — Critical hiện lại khi vừa mở app", () => {
    const items = [item("a", "CRITICAL"), item("h", "HIGH")];
    const justShown = { a: NOW - 1, h: NOW - 1 };
    const due = filterDue(items, justShown, NOW, { alwaysTiers: ["CRITICAL"] });
    expect(due.map((d) => d.id)).toEqual(["a"]);
  });
});
