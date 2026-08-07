import { describe, expect, it } from "vitest";
import type { DailySummary } from "../src/lib/daily-summary";
import type { NotifyItem } from "../src/lib/notify-core";
import {
  buildAlertMessage,
  buildEodMessage,
  buildMorningMessage,
  draftFromTelegramText,
  isAuthorizedChat,
  shouldSendEodSummary,
  shouldSendMorningBrief,
} from "../src/lib/telegram-core";

describe("isAuthorizedChat", () => {
  it("đúng chat ID whitelist → true", () => {
    expect(isAuthorizedChat("123", "123")).toBe(true);
  });

  it("sai chat ID → false", () => {
    expect(isAuthorizedChat("456", "123")).toBe(false);
  });

  it("chưa cấu hình TELEGRAM_CHAT_ID (undefined) → luôn false", () => {
    expect(isAuthorizedChat("123", undefined)).toBe(false);
  });
});

describe("shouldSendEodSummary", () => {
  it("trước 17:30 → chưa gửi", () => {
    expect(shouldSendEodSummary("17:29", "2026-07-22", null)).toBe(false);
  });

  it("đúng 17:30, chưa gửi hôm nay → gửi", () => {
    expect(shouldSendEodSummary("17:30", "2026-07-22", null)).toBe(true);
  });

  it("sau 17:30, chưa gửi hôm nay → gửi", () => {
    expect(shouldSendEodSummary("20:15", "2026-07-22", "2026-07-21")).toBe(
      true,
    );
  });

  it("sau 17:30 nhưng đã gửi hôm nay rồi → không gửi lại", () => {
    expect(shouldSendEodSummary("18:00", "2026-07-22", "2026-07-22")).toBe(
      false,
    );
  });
});

describe("buildAlertMessage", () => {
  it("mảng rỗng → chuỗi rỗng", () => {
    expect(buildAlertMessage([])).toBe("");
  });

  it("gộp theo tầng, CRITICAL trước HIGH trước NORMAL", () => {
    const items: NotifyItem[] = [
      {
        id: "due-1",
        tier: "NORMAL",
        title: "📅 Việc thường",
        detail: "Deadline ngày mai",
        href: "/tasks",
      },
      {
        id: "crit-1",
        tier: "CRITICAL",
        title: "🔴 Việc khẩn",
        detail: "Critical",
        href: "/tasks",
      },
    ];
    const msg = buildAlertMessage(items);
    expect(msg.indexOf("Khẩn cấp")).toBeLessThan(msg.indexOf("Sắp đến hạn"));
    expect(msg).toContain("Việc khẩn");
    expect(msg).toContain("Việc thường");
  });
});

describe("buildEodMessage", () => {
  const emptySummary: DailySummary = {
    doneToday: [],
    inProgress: [],
    overdue: [],
    dueSoon: [],
    topTomorrow: null,
  };

  it("không có việc nào → vẫn ra đủ 4 nhóm, không có topTomorrow", () => {
    const msg = buildEodMessage(emptySummary);
    expect(msg).toContain("Hoàn thành hôm nay (0)");
    expect(msg).toContain("Đang làm (0)");
    expect(msg).toContain("Quá hạn (0)");
    expect(msg).toContain("Sắp đến hạn (0)");
    expect(msg).not.toContain("Việc quan trọng nhất sáng mai");
  });

  it("có topTomorrow → hiện tên việc + leader", () => {
    const summary: DailySummary = {
      ...emptySummary,
      topTomorrow: {
        id: "t1",
        title: "Chốt ngân sách Q3",
        leader: { id: "l1", name: "Ất", team: "DIGITAL", chatHandle: null },
        deadline: new Date("2026-07-23T23:59:59+07:00"),
      } as DailySummary["topTomorrow"],
    };
    const msg = buildEodMessage(summary);
    expect(msg).toContain("Chốt ngân sách Q3");
    expect(msg).toContain("Ất");
  });
});

describe("shouldSendMorningBrief — P1-d", () => {
  it("trước 07:30 → chưa gửi", () => {
    expect(shouldSendMorningBrief("07:29", "2026-08-07", null)).toBe(false);
  });

  it("từ 07:30, chưa gửi hôm nay → gửi", () => {
    expect(shouldSendMorningBrief("07:30", "2026-08-07", null)).toBe(true);
    expect(shouldSendMorningBrief("09:00", "2026-08-07", "2026-08-06")).toBe(
      true,
    );
  });

  it("đã gửi hôm nay → không gửi lại", () => {
    expect(shouldSendMorningBrief("08:00", "2026-08-07", "2026-08-07")).toBe(
      false,
    );
  });
});

describe("buildMorningMessage — P1-d", () => {
  const emptySummary: DailySummary = {
    doneToday: [],
    inProgress: [],
    overdue: [],
    dueSoon: [],
    topTomorrow: null,
  };

  it("rỗng → vẫn đủ 3 nhóm sáng, không có mục ưu tiên", () => {
    const msg = buildMorningMessage(emptySummary);
    expect(msg).toContain("Bản tin sáng");
    expect(msg).toContain("Quá hạn — hỏi leader ngay (0)");
    expect(msg).toContain("Đến hạn ≤2 ngày (0)");
    expect(msg).toContain("Đang làm (0)");
    expect(msg).not.toContain("Việc quan trọng nhất hôm nay");
  });

  it("có việc ưu tiên → hiện tên + leader", () => {
    const summary: DailySummary = {
      ...emptySummary,
      topTomorrow: {
        id: "t1",
        title: "Chốt ngân sách Q3",
        leader: { id: "l1", name: "Ất", team: "DIGITAL", chatHandle: null },
        deadline: new Date("2026-07-23T23:59:59+07:00"),
      } as DailySummary["topTomorrow"],
    };
    const msg = buildMorningMessage(summary);
    expect(msg).toContain("Việc quan trọng nhất hôm nay");
    expect(msg).toContain("Chốt ngân sách Q3");
  });
});

describe("draftFromTelegramText", () => {
  it("tách deadline khỏi text giống guessDraftFromLine", () => {
    const draft = draftFromTelegramText("  Gửi hợp đồng - 20/08/2026  ");
    expect(draft.title).toBe("Gửi hợp đồng");
    expect(draft.deadline).toBe(
      new Date("2026-08-20T23:59:59+07:00").toISOString(),
    );
  });
});
