import { NextRequest } from "next/server";
import { alertStatus } from "@/lib/alerts";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { reportCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/reports?type=&status=
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const now = new Date();
    const reports = await prisma.report.findMany({
      where: { ...(type && { type }), ...(status && { status }) },
      orderBy: { dueDate: "asc" },
    });
    const data = reports.map((r) => ({
      ...r,
      alertStatus: alertStatus(
        // SUBMITTED coi như xong với công thức cảnh báo
        {
          status: r.status === "SUBMITTED" ? "DONE" : r.status,
          deadline: r.dueDate,
        },
        now,
      ),
    }));
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = reportCreateSchema.parse(body);
    const report = await prisma.report.create({ data: input });
    return ok(report, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
