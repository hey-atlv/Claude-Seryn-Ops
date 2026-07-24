import { NextRequest } from "next/server";
import { alertStatus, isSilent } from "@/lib/alerts";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { deleteTaskEvent, syncTaskToCalendar } from "@/lib/google-sync";
import { priorityScore } from "@/lib/priority";
import { categoryValidForTeam, taskUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: { leader: true, subItems: true, parent: true },
    });
    if (!task) return fail("Không tìm thấy task", 404);
    const now = new Date();
    return ok({
      ...task,
      priorityScore: priorityScore(task, now),
      alertStatus: alertStatus(task, now),
      isSilent: isSilent(task, now),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = taskUpdateSchema.parse(body);

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return fail("Không tìm thấy task", 404);

    // Ràng buộc chéo sau khi merge: Nhóm việc phải khớp Team
    const team = input.team ?? existing.team;
    const category =
      input.category !== undefined ? input.category : existing.category;
    if (!categoryValidForTeam(team, category)) {
      return fail(`Nhóm việc "${category}" không thuộc team đã chọn`);
    }

    // Tự ghi/xóa completedAt khi chuyển trạng thái
    const completedAt =
      input.status === undefined
        ? undefined
        : input.status === "DONE"
          ? (existing.completedAt ?? new Date())
          : null;

    const task = await prisma.task.update({
      where: { id },
      data: { ...input, completedAt },
    });
    await syncTaskToCalendar(task.id);
    return ok(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await deleteTaskEvent(id); // đọc googleEventId trước khi task biến mất
    await prisma.task.delete({ where: { id } }); // sub-items xóa theo (cascade)
    return ok({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
