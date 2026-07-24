import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { periodKey } from "@/lib/recurring-core";
import { weeklyStatUpsertSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/weekly-stats?week=2026-W30 — mặc định tuần hiện tại (giờ VN)
export async function GET(req: NextRequest) {
  try {
    const week =
      req.nextUrl.searchParams.get("week") ?? periodKey("WEEKLY", new Date());
    const stat = await prisma.weeklyStat.findUnique({
      where: { weekKey: week },
    });
    return ok(stat);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/weekly-stats — upsert chỉ số tuần theo weekKey
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = weeklyStatUpsertSchema.parse(body);
    const { weekKey, ...fields } = input;
    const stat = await prisma.weeklyStat.upsert({
      where: { weekKey },
      create: { weekKey, ...fields },
      update: fields,
    });
    return ok(stat);
  } catch (error) {
    return handleApiError(error);
  }
}
