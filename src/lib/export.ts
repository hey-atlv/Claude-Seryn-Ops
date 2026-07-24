import type { Leader, Task } from "@/generated/prisma/client";
import { getDailySummary } from "./daily-summary";
import { prisma } from "./db";
import {
  dailySummaryHtml,
  reportHtml,
  type SummaryTaskLike,
} from "./pdf-templates";
import { formatVN } from "./timezone";

// K2 — nối template thuần (pdf-templates.ts) với dữ liệu thật, dùng chung cho
// cả 2 route (tải PDF trực tiếp và gửi qua Telegram) tránh lặp code load data.

export type ExportType = "report" | "daily-summary";

function toSummaryTask(t: Task & { leader: Leader | null }): SummaryTaskLike {
  return {
    title: t.title,
    team: t.team,
    leaderName: t.leader?.name ?? null,
    deadline: t.deadline ? t.deadline.toISOString() : null,
  };
}

function slugifyFilename(title: string): string {
  return title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "bao-cao";
}

export async function buildExportHtml(
  type: ExportType,
  id: string | null,
): Promise<{ html: string; filename: string }> {
  if (type === "report") {
    if (!id) throw new Error("Thiếu id báo cáo");
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw new Error("Không tìm thấy báo cáo");
    return {
      html: reportHtml({
        title: report.title,
        type: report.type,
        dueDate: report.dueDate ? report.dueDate.toISOString() : null,
        hasRevenue: report.hasRevenue,
        hasRoas: report.hasRoas,
        hasData: report.hasData,
        hasProjects: report.hasProjects,
        hasRisks: report.hasRisks,
        reportLink: report.reportLink,
        boardFeedback: report.boardFeedback,
      }),
      filename: `${slugifyFilename(report.title)}.pdf`,
    };
  }

  const now = new Date();
  const summary = await getDailySummary(now);
  return {
    html: dailySummaryHtml({
      dateLabel: formatVN(now, "dd/MM/yyyy"),
      topTomorrow: summary.topTomorrow ? toSummaryTask(summary.topTomorrow) : null,
      doneToday: summary.doneToday.map(toSummaryTask),
      inProgress: summary.inProgress.map(toSummaryTask),
      overdue: summary.overdue.map(toSummaryTask),
      dueSoon: summary.dueSoon.map(toSummaryTask),
    }),
    filename: `tom-tat-cuoi-ngay-${formatVN(now, "yyyy-MM-dd")}.pdf`,
  };
}
