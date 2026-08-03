import { describe, expect, test } from "vitest";
import {
  isDue,
  isoWeek,
  nextOccurrenceVN,
  normalizeRecurringInput,
  parseDefaults,
  parseSubItems,
  periodKey,
  periodLabel,
  scheduleText,
  scheduledDeadlineVN,
  toTemplateRecord,
  type RecurringTemplateInput,
} from "../src/lib/recurring-core";
import { validateRecurringTemplate } from "../src/lib/validation";

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

describe("nextOccurrenceVN — ngày hẹn kế tiếp còn hiệu lực", () => {
  test("weekly thứ 2 đã qua trong tuần → nhảy sang thứ 2 tuần sau", () => {
    expect(nextOccurrenceVN("WEEKLY", 1, NOW).toISOString()).toBe(
      "2026-07-20T16:59:59.999Z",
    );
  });
  test("weekly thứ 6 chưa tới → vẫn trong tuần này", () => {
    expect(nextOccurrenceVN("WEEKLY", 5, NOW).toISOString()).toBe(
      "2026-07-17T16:59:59.999Z",
    );
  });
  test("monthly ngày 1 đã qua → ngày 1 tháng sau", () => {
    expect(nextOccurrenceVN("MONTHLY", 1, NOW).toISOString()).toBe(
      "2026-08-01T16:59:59.999Z",
    );
  });
  test("monthly ngày 20 chưa tới → vẫn trong tháng này", () => {
    expect(nextOccurrenceVN("MONTHLY", 20, NOW).toISOString()).toBe(
      "2026-07-20T16:59:59.999Z",
    );
  });
  test("tháng 12 → nhảy sang tháng 1 năm sau", () => {
    const dec = new Date("2026-12-20T03:00:00Z");
    expect(nextOccurrenceVN("MONTHLY", 1, dec).toISOString()).toBe(
      "2027-01-01T16:59:59.999Z",
    );
  });
  test("monthly ngày 31 vào tháng 2 → lùi về ngày cuối tháng", () => {
    const feb = new Date("2026-02-05T03:00:00Z");
    expect(nextOccurrenceVN("MONTHLY", 31, feb).toISOString()).toBe(
      "2026-02-28T16:59:59.999Z",
    );
  });
});

describe("scheduleText", () => {
  test("weekly", () => expect(scheduleText("WEEKLY", 5)).toBe("Hằng tuần · Thứ 6"));
  test("monthly", () => expect(scheduleText("MONTHLY", 1)).toBe("Hằng tháng · ngày 1"));
  test("none", () => expect(scheduleText("NONE", null)).toBe("Không tự sinh"));
});

describe("parseDefaults / parseSubItems — JSON hỏng không làm sập trang", () => {
  test("defaults hợp lệ", () => {
    expect(parseDefaults('{"team":"DIGITAL"}')).toEqual({ team: "DIGITAL" });
  });
  test("defaults hỏng → object rỗng", () => {
    expect(parseDefaults("{team:DIGITAL")).toEqual({});
    expect(parseDefaults(null)).toEqual({});
  });
  test("subItems chỉ giữ phần tử chuỗi", () => {
    expect(parseSubItems('["Kế hoạch",3,"Review"]')).toEqual(["Kế hoạch", "Review"]);
    expect(parseSubItems("không-phải-json")).toEqual([]);
  });
});

const taskInput: RecurringTemplateInput = {
  name: "  Báo cáo ROAS tuần  ",
  targetDb: "TASK",
  scheduleType: "WEEKLY",
  scheduleDay: 5,
  defaults: { type: "TASK", team: "DIGITAL", category: "KPI/ROAS", priority: "HIGH" },
  subItems: [" Gom số liệu ", "", "Soạn báo cáo"],
  active: true,
};

describe("normalizeRecurringInput", () => {
  test("trim tên và sub-item, bỏ dòng trống", () => {
    const out = normalizeRecurringInput(taskInput);
    expect(out.name).toBe("Báo cáo ROAS tuần");
    expect(out.subItems).toEqual(["Gom số liệu", "Soạn báo cáo"]);
  });
  test("template báo cáo chỉ giữ defaults.type và không có sub-item", () => {
    const out = normalizeRecurringInput({
      ...taskInput,
      targetDb: "REPORT",
      defaults: { type: "WEEKLY", team: "DIGITAL", category: "KPI/ROAS" },
    });
    expect(out.defaults).toEqual({ type: "WEEKLY" });
    expect(out.subItems).toEqual([]);
  });
  test("lịch NONE thì bỏ ngày hẹn", () => {
    const out = normalizeRecurringInput({ ...taskInput, scheduleType: "NONE" });
    expect(out.scheduleDay).toBeNull();
  });
  test("field rỗng bị loại khỏi defaults", () => {
    const out = normalizeRecurringInput({
      ...taskInput,
      defaults: { type: "TASK", team: "DIGITAL", category: "  " },
    });
    expect(out.defaults).toEqual({ type: "TASK", team: "DIGITAL" });
  });
});

describe("toTemplateRecord", () => {
  test("serialize defaults/subItems về JSON", () => {
    const record = toTemplateRecord(normalizeRecurringInput(taskInput));
    expect(JSON.parse(record.defaults)).toEqual({
      type: "TASK",
      team: "DIGITAL",
      category: "KPI/ROAS",
      priority: "HIGH",
    });
    expect(JSON.parse(record.subItemsTemplate ?? "[]")).toEqual([
      "Gom số liệu",
      "Soạn báo cáo",
    ]);
  });
  test("không có sub-item → cột null", () => {
    const record = toTemplateRecord(
      normalizeRecurringInput({ ...taskInput, subItems: [] }),
    );
    expect(record.subItemsTemplate).toBeNull();
  });
});

describe("validateRecurringTemplate", () => {
  const check = (patch: Partial<RecurringTemplateInput>) =>
    validateRecurringTemplate(normalizeRecurringInput({ ...taskInput, ...patch }));

  test("template task hợp lệ", () => {
    expect(check({})).toBeNull();
  });
  test("lịch tuần thiếu thứ", () => {
    expect(check({ scheduleDay: null })).toMatch(/thứ trong tuần/);
  });
  test("lịch tháng ngày ngoài khoảng", () => {
    expect(check({ scheduleType: "MONTHLY", scheduleDay: 40 })).toMatch(
      /ngày trong tháng/,
    );
  });
  test("template tự sinh phải có team", () => {
    expect(check({ defaults: { type: "TASK" } })).toMatch(/team nhận việc/);
  });
  test("template thủ công (NONE) không bắt buộc team", () => {
    expect(check({ scheduleType: "NONE", defaults: { type: "PROJECT" } })).toBeNull();
  });
  test("nhóm việc không thuộc team", () => {
    expect(
      check({ defaults: { type: "TASK", team: "CONTENT", category: "KPI/ROAS" } }),
    ).toMatch(/không thuộc team/);
  });
  test("template báo cáo thiếu loại", () => {
    expect(check({ targetDb: "REPORT", defaults: {} })).toMatch(/loại báo cáo/);
  });
  test("template báo cáo hợp lệ", () => {
    expect(check({ targetDb: "REPORT", defaults: { type: "MONTHLY" } })).toBeNull();
  });
});
