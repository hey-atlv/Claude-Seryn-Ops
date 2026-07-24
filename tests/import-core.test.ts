import { describe, expect, it } from "vitest";
import {
  buildDraft,
  buildDrafts,
  guessMapping,
  parseCsv,
  parseDeadline,
  parsePriority,
  parseStatus,
  parseTeam,
  type ImportField,
  type LeaderRef,
} from "../src/lib/import-core";

const LEADERS: LeaderRef[] = [
  { id: "l-digital", name: "Anh Tuấn", team: "DIGITAL" },
  { id: "l-content", name: "Chị Hoa", team: "CONTENT" },
];

describe("parseCsv", () => {
  it('field trong nháy kép chứa dấu phẩy + xuống dòng, "" là escape', () => {
    const rows = parseCsv(
      'Tên việc,Ghi chú\r\n"Báo cáo, quý 3","Nói ""rõ""\nhai dòng"\r\n',
    );
    expect(rows).toEqual([
      ["Tên việc", "Ghi chú"],
      ["Báo cáo, quý 3", 'Nói "rõ"\nhai dòng'],
    ]);
  });

  it("bỏ BOM và dòng trống thừa cuối file", () => {
    const rows = parseCsv("﻿a,b\n1,2\n,\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("guessMapping", () => {
  it("nhận header tiếng Việt có dấu từ Sheets cũ", () => {
    const mapping = guessMapping([
      "Tên việc",
      "Team",
      "Người phụ trách",
      "Nhóm việc",
      "Trạng thái",
      "Hạn chót",
      "Ưu tiên",
      "Cột lạ",
    ]);
    expect(mapping).toEqual([
      "title",
      "team",
      "leader",
      "category",
      "status",
      "deadline",
      "priority",
      null,
    ] satisfies (ImportField | null)[]);
  });

  it("field trùng nhau: cột đầu thắng, cột sau bỏ", () => {
    expect(guessMapping(["Deadline", "Hạn"])).toEqual(["deadline", null]);
  });
});

describe("chuyển giá trị tiếng Việt sang enum", () => {
  it("team theo label lẫn mã", () => {
    expect(parseTeam("PR&Trade&Event")).toBe("PR_TRADE_EVENT");
    expect(parseTeam("kskd&kt")).toBe("KSKD_KT");
    expect(parseTeam("Digital")).toBe("DIGITAL");
    expect(parseTeam("Khối lạ")).toBeNull();
  });

  it("trạng thái + ưu tiên tiếng Việt", () => {
    expect(parseStatus("Đang làm")).toBe("IN_PROGRESS");
    expect(parseStatus("Hoàn thành")).toBe("DONE");
    expect(parsePriority("🔴 Critical")).toBe("CRITICAL");
    expect(parsePriority("Cao")).toBe("HIGH");
  });

  it("deadline dd/mm/yyyy và yyyy-mm-dd → cuối ngày giờ VN", () => {
    // 23:59:59+07:00 = 16:59:59Z cùng ngày
    expect(parseDeadline("17/08/2026")).toBe("2026-08-17T16:59:59.000Z");
    expect(parseDeadline("2026-08-17")).toBe("2026-08-17T16:59:59.000Z");
    expect(parseDeadline("17/13/2026")).toBeNull();
    expect(parseDeadline("tháng sau")).toBeNull();
  });
});

describe("buildDraft", () => {
  const mapping: (ImportField | null)[] = [
    "title",
    "team",
    "leader",
    "category",
    "status",
    "deadline",
    "priority",
  ];

  it("dòng đủ dữ liệu: map đúng enum, leader khớp tên", () => {
    const r = buildDraft(
      [
        "Tối ưu ads",
        "Digital",
        "Tuấn",
        "KPI/ROAS",
        "Đang làm",
        "20/08/2026",
        "Cao",
      ],
      mapping,
      LEADERS,
      0,
    );
    expect(r.errors).toEqual([]);
    expect(r.draft).toMatchObject({
      title: "Tối ưu ads",
      team: "DIGITAL",
      leaderId: "l-digital",
      category: "KPI/ROAS",
      status: "IN_PROGRESS",
      priority: "HIGH",
      deadline: "2026-08-20T16:59:59.000Z",
    });
  });

  it("thiếu title/team hoặc deadline sai → lỗi chặn, draft null", () => {
    const r = buildDraft(
      ["", "Khối lạ", "", "", "", "31/02/x", ""],
      mapping,
      LEADERS,
      1,
    );
    expect(r.draft).toBeNull();
    expect(r.errors).toHaveLength(3);
  });

  it("giá trị lạ không chặn: cảnh báo + mặc định, nhóm việc sai team bỏ trống", () => {
    const r = buildDraft(
      ["Viết bài", "Content", "Ai đó", "KPI/ROAS", "???", "", ""],
      mapping,
      LEADERS,
      2,
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(3); // leader lạ, trạng thái lạ, nhóm việc sai team
    expect(r.draft).toMatchObject({
      team: "CONTENT",
      leaderId: "l-content", // fallback leader của team
      category: null,
      status: "TODO",
      priority: "NORMAL",
      revenueImpact: "MEDIUM",
    });
  });
});

describe("buildDrafts", () => {
  it("bỏ dòng header, giữ chỉ số dòng dữ liệu", () => {
    const rows = parseCsv(
      "Tên việc,Team\nViệc A,Digital\n,Digital\nViệc B,Content",
    );
    const results = buildDrafts(rows, guessMapping(rows[0]), LEADERS);
    expect(results).toHaveLength(3);
    expect(results[0].draft?.title).toBe("Việc A");
    expect(results[1].errors).toEqual(["Thiếu tên việc"]);
    expect(results[2].rowIndex).toBe(2);
  });
});
