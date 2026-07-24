import { describe, expect, it } from "vitest";
import { dailySummaryHtml, reportHtml } from "../src/lib/pdf-templates";

describe("reportHtml", () => {
  const base = {
    title: "Báo cáo tuần 30",
    type: "WEEKLY",
    dueDate: "2026-07-26T16:59:59.999Z",
    hasRevenue: true,
    hasRoas: true,
    hasData: false,
    hasProjects: false,
    hasRisks: false,
    reportLink: null,
    boardFeedback: null,
  };

  it("có tiêu đề, badge loại báo cáo, và đánh dấu đúng ✓/✗ theo checklist", () => {
    const html = reportHtml(base);
    expect(html).toContain("Báo cáo tuần 30");
    expect(html).toContain("Báo cáo tuần");
    expect((html.match(/class="ok"/g) ?? []).length).toBe(2); // hasRevenue + hasRoas
    expect((html.match(/class="no"/g) ?? []).length).toBe(3);
  });

  it("escape HTML trong title (chặn injection nếu tên báo cáo có ký tự đặc biệt)", () => {
    const html = reportHtml({ ...base, title: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("chỉ render card feedback/link khi có dữ liệu", () => {
    const withoutExtra = reportHtml(base);
    expect(withoutExtra).not.toContain("Feedback lãnh đạo");
    const withExtra = reportHtml({
      ...base,
      boardFeedback: "Cần bổ sung số liệu ROAS",
      reportLink: "https://sheet.example/1",
    });
    expect(withExtra).toContain("Feedback lãnh đạo");
    expect(withExtra).toContain("Cần bổ sung số liệu ROAS");
    expect(withExtra).toContain("https://sheet.example/1");
  });
});

describe("dailySummaryHtml", () => {
  it("render đủ 4 nhóm + việc quan trọng nhất sáng mai, nhóm rỗng ghi 'Không có'", () => {
    const html = dailySummaryHtml({
      dateLabel: "22/07/2026",
      topTomorrow: {
        title: "Duyệt ngân sách Q3",
        team: "DIGITAL",
        leaderName: "Ất",
        deadline: "2026-07-23T16:59:59.999Z",
      },
      doneToday: [
        { title: "Báo cáo ROAS", team: "DIGITAL", leaderName: "Ất", deadline: null },
      ],
      inProgress: [],
      overdue: [],
      dueSoon: [],
    });
    expect(html).toContain("22/07/2026");
    expect(html).toContain("Duyệt ngân sách Q3");
    expect(html).toContain("Báo cáo ROAS");
    expect(html).toContain("Digital"); // TEAM_LABELS map đúng
    // 3 nhóm rỗng (inProgress, overdue, dueSoon) → 3 lần "Không có"
    expect((html.match(/Không có/g) ?? []).length).toBe(3);
  });

  it("không có topTomorrow thì không render khối ⭐", () => {
    const html = dailySummaryHtml({
      dateLabel: "22/07/2026",
      topTomorrow: null,
      doneToday: [],
      inProgress: [],
      overdue: [],
      dueSoon: [],
    });
    expect(html).not.toContain("Việc quan trọng nhất sáng mai");
  });
});
