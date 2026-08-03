import { describe, expect, it } from "vitest";
import {
  eventSlotVN,
  eventTitleFor,
  fromGoogleEventDate,
  monthRangeVN,
  resolveConflict,
  shouldSyncTask,
  toGoogleEventDate,
} from "../src/lib/google-calendar-core";

describe("toGoogleEventDate / fromGoogleEventDate — round-trip", () => {
  it("deadline 23:59:59 giờ VN → ngày all-day đúng, và ngược lại về cùng deadline", () => {
    const deadline = new Date("2026-07-21T16:59:59.999Z"); // 23:59:59 VN
    expect(toGoogleEventDate(deadline)).toBe("2026-07-21");
    expect(fromGoogleEventDate("2026-07-21").getTime()).toBe(deadline.getTime());
  });

  it("không lệch ngày quanh nửa đêm VN (00:30 VN = 17:30 UTC hôm trước)", () => {
    const deadline = new Date("2026-07-20T17:30:00Z"); // 00:30 VN ngày 21
    expect(toGoogleEventDate(deadline)).toBe("2026-07-21");
  });
});

describe("shouldSyncTask", () => {
  it("chỉ true khi task cấp cao nhất (parentId null) và có deadline", () => {
    expect(shouldSyncTask({ parentId: null, deadline: new Date() })).toBe(true);
    expect(shouldSyncTask({ parentId: null, deadline: null })).toBe(false);
    expect(shouldSyncTask({ parentId: "p1", deadline: new Date() })).toBe(false);
  });
});

describe("eventTitleFor", () => {
  it("thêm ✅ khi Done, giữ nguyên khi chưa", () => {
    expect(eventTitleFor({ title: "Báo cáo ROAS", status: "DONE" })).toBe(
      "✅ Báo cáo ROAS",
    );
    expect(eventTitleFor({ title: "Báo cáo ROAS", status: "IN_PROGRESS" })).toBe(
      "Báo cáo ROAS",
    );
  });
});

describe("monthRangeVN", () => {
  it("khoảng UTC đúng nửa đêm giờ VN đầu/cuối tháng (VN = UTC+7)", () => {
    expect(monthRangeVN(2026, 7)).toEqual({
      timeMin: "2026-06-30T17:00:00.000Z",
      timeMax: "2026-07-31T17:00:00.000Z",
    });
  });

  it("qua năm khi tháng 12 (next month là tháng 1 năm sau)", () => {
    expect(monthRangeVN(2026, 12)).toEqual({
      timeMin: "2026-11-30T17:00:00.000Z",
      timeMax: "2026-12-31T17:00:00.000Z",
    });
  });
});

describe("eventSlotVN", () => {
  it("event cả ngày → giữ nguyên ngày Google gửi, không có giờ", () => {
    expect(eventSlotVN({ date: "2026-08-04" })).toEqual({
      dateKey: "2026-08-04",
      time: null,
    });
  });

  it("event có giờ, offset +07 → giữ đúng giờ VN", () => {
    expect(eventSlotVN({ dateTime: "2026-08-04T10:00:00+07:00" })).toEqual({
      dateKey: "2026-08-04",
      time: "10:00",
    });
  });

  it("event có giờ ghi bằng UTC → quy đổi sang giờ VN (+7)", () => {
    expect(eventSlotVN({ dateTime: "2026-08-04T02:30:00Z" })).toEqual({
      dateKey: "2026-08-04",
      time: "09:30",
    });
  });

  it("offset khác +07 vẫn quy đổi đúng, kể cả khi lệch sang ngày VN kế tiếp", () => {
    // 20:00 ngày 03/08 giờ New York (UTC-4) = 07:00 ngày 04/08 giờ VN
    expect(eventSlotVN({ dateTime: "2026-08-03T20:00:00-04:00" })).toEqual({
      dateKey: "2026-08-04",
      time: "07:00",
    });
  });

  it("input rác hoặc thiếu mốc thời gian → null, không ném lỗi", () => {
    expect(eventSlotVN(null)).toBeNull();
    expect(eventSlotVN(undefined)).toBeNull();
    expect(eventSlotVN({})).toBeNull();
    expect(eventSlotVN({ date: null, dateTime: null })).toBeNull();
    expect(eventSlotVN({ date: "04/08/2026" })).toBeNull();
    expect(eventSlotVN({ dateTime: "hôm nào đó" })).toBeNull();
  });
});

describe("resolveConflict", () => {
  const base = {
    taskUpdatedAt: new Date("2026-07-20T00:00:00Z"),
    taskDeadlineKey: "2026-07-21",
    eventUpdatedAt: new Date("2026-07-20T00:00:00Z"),
    eventDeadlineKey: "2026-07-21",
  };

  it("NOOP khi hai bên đã cùng ngày (chặn ping-pong)", () => {
    expect(resolveConflict(base)).toBe("NOOP");
  });

  it("USE_EVENT khi event sửa sau task và ngày khác nhau", () => {
    expect(
      resolveConflict({
        ...base,
        eventDeadlineKey: "2026-07-22",
        eventUpdatedAt: new Date("2026-07-21T00:00:00Z"),
      }),
    ).toBe("USE_EVENT");
  });

  it("USE_TASK khi task sửa sau event và ngày khác nhau", () => {
    expect(
      resolveConflict({
        ...base,
        eventDeadlineKey: "2026-07-22",
        taskUpdatedAt: new Date("2026-07-22T00:00:00Z"),
      }),
    ).toBe("USE_TASK");
  });

  it("taskDeadlineKey null (task chưa có deadline) vẫn so sánh đúng, không NOOP nhầm", () => {
    expect(
      resolveConflict({
        ...base,
        taskDeadlineKey: null,
        eventUpdatedAt: new Date("2026-07-21T00:00:00Z"),
      }),
    ).toBe("USE_EVENT");
  });
});
