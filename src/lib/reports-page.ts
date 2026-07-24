import { prisma } from "./db";
import { generateRecurring } from "./recurring";
import type { ReportRow } from "./report-row";

// Data loader trang /reports (Giai đoạn E2) — báo cáo định kỳ được sinh
// idempotent trước khi load (giống dashboard/tasks).

export async function getReportsPageData(
  now: Date = new Date(),
): Promise<ReportRow[]> {
  await generateRecurring(now);
  const reports = await prisma.report.findMany({
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  return reports.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    status: r.status,
    hasRevenue: r.hasRevenue,
    hasRoas: r.hasRoas,
    hasData: r.hasData,
    hasProjects: r.hasProjects,
    hasRisks: r.hasRisks,
    reportLink: r.reportLink,
    boardFeedback: r.boardFeedback,
    createdAt: r.createdAt.toISOString(),
  }));
}
