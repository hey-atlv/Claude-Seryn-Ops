import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { buildReportDraft } from "@/lib/report-draft";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// P1-c — POST: dựng nháp báo cáo từ dữ liệu DB, tự tick checklist theo phần
// thật sự có số liệu, đẩy status khỏi "Chưa bắt đầu". Trả markdown cho client.
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return fail("Không tìm thấy báo cáo", 404);

    const { draft, checklist } = await buildReportDraft(report);
    await prisma.report.update({
      where: { id },
      data: {
        ...checklist,
        status: report.status === "NOT_STARTED" ? "GATHERING" : report.status,
      },
    });
    return ok({ draft, checklist });
  } catch (error) {
    return handleApiError(error);
  }
}
