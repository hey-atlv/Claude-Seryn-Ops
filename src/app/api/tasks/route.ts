import { NextRequest } from "next/server";
import { alertStatus, isSilent } from "@/lib/alerts";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { priorityScore } from "@/lib/priority";
import { syncTaskToCalendar } from "@/lib/google-sync";
import { taskCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/tasks?team=&status=&open=1 — danh sách kèm score/cảnh báo, sort score giảm dần
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const team = sp.get("team") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const openOnly = sp.get("open") === "1";
    const tasks = await prisma.task.findMany({
      where: {
        ...(team && { team }),
        ...(status && { status }),
        ...(openOnly && { status: { not: "DONE" } }),
      },
      include: { leader: true, subItems: true },
      orderBy: { createdAt: "desc" },
    });
    const now = new Date();
    const data = tasks
      .map((t) => ({
        ...t,
        priorityScore: priorityScore(t, now),
        alertStatus: alertStatus(t, now),
        isSilent: isSilent(t, now),
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/tasks — tạo task mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = taskCreateSchema.parse(body);
    const task = await prisma.task.create({
      data: {
        ...input,
        completedAt: input.status === "DONE" ? new Date() : null,
      },
    });
    await syncTaskToCalendar(task.id);
    return ok(task, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
