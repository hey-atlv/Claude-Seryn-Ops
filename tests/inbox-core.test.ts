import { describe, expect, it } from "vitest";
import { guessDraftFromLine, parseQuickCapture } from "../src/lib/inbox-core";

describe("parseQuickCapture", () => {
  it("tách nhiều dòng, bỏ dòng trống và khoảng trắng thừa", () => {
    const text = "  Việc A  \n\nViệc B\r\nViệc C\r\r\n  \n";
    expect(parseQuickCapture(text)).toEqual(["Việc A", "Việc B", "Việc C"]);
  });

  it("text rỗng trả mảng rỗng", () => {
    expect(parseQuickCapture("   \n  \n")).toEqual([]);
  });
});

describe("guessDraftFromLine", () => {
  it("không có ngày → title = cả dòng, deadline null", () => {
    expect(guessDraftFromLine("Chuẩn bị báo cáo tháng")).toEqual({
      title: "Chuẩn bị báo cáo tháng",
      deadline: null,
    });
  });

  it("tách deadline dd/mm/yyyy khỏi cuối dòng", () => {
    const r = guessDraftFromLine("Nộp báo cáo tuần - 20/08/2026");
    expect(r.title).toBe("Nộp báo cáo tuần");
    expect(r.deadline).toBe(
      new Date("2026-08-20T23:59:59+07:00").toISOString(),
    );
  });

  it("tách deadline yyyy-mm-dd khỏi đầu dòng", () => {
    const r = guessDraftFromLine("2026-08-05: gửi hợp đồng cho đối tác");
    expect(r.title).toBe("gửi hợp đồng cho đối tác");
    expect(r.deadline).toBe(
      new Date("2026-08-05T23:59:59+07:00").toISOString(),
    );
  });

  it("ngày sai định dạng (vd tháng 13) → coi như không có deadline", () => {
    const r = guessDraftFromLine("Việc gì đó 32/13/2026");
    expect(r.deadline).toBeNull();
    expect(r.title).toBe("Việc gì đó 32/13/2026");
  });
});
