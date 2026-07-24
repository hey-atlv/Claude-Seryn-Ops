import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import {
  IDEA_PROMOTABLE_FROM,
  IDEA_STATUS_FLOW,
  IDEA_STATUS_LABELS,
  type IdeaStatus,
} from "@/lib/constants";
import { HIGH_IMPACT_MIN } from "@/lib/idea-score";
import { prisma } from "@/lib/db";
import { ideaUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/ideas/[id] — sửa ý tưởng. Đổi trạng thái phải đi đúng luồng
// (IDEA_STATUS_FLOW). Riêng APPROVED → PROJECT sinh kèm 1 Task type=PROJECT
// trong cùng transaction, để không bao giờ có ý tưởng PROJECT mà thiếu dự án.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = ideaUpdateSchema.parse(body);

    const current = await prisma.idea.findUnique({ where: { id } });
    if (!current) return fail("Không tìm thấy ý tưởng", 404);

    const nextStatus = input.status;
    const isStatusChange =
      nextStatus !== undefined && nextStatus !== current.status;

    if (isStatusChange) {
      const allowed = IDEA_STATUS_FLOW[current.status as IdeaStatus] ?? [];
      if (!allowed.includes(nextStatus)) {
        const from =
          IDEA_STATUS_LABELS[current.status as IdeaStatus] ?? current.status;
        const to = IDEA_STATUS_LABELS[nextStatus] ?? nextStatus;
        return fail(`Không thể chuyển "${from}" → "${to}"`);
      }
    }

    const isPromotion = isStatusChange && nextStatus === "PROJECT";
    if (isPromotion) {
      if (current.status !== IDEA_PROMOTABLE_FROM) {
        return fail("Chỉ ý tưởng đã duyệt mới sinh được dự án");
      }
      if (current.promotedTaskId) {
        return fail("Ý tưởng này đã sinh dự án rồi");
      }
      if (!current.team && !input.team) {
        return fail("Cần gán Team trước khi chuyển thành dự án");
      }
    }

    if (!isPromotion) {
      const idea = await prisma.idea.update({ where: { id }, data: input });
      return ok(idea);
    }

    const team = (input.team ?? current.team) as string;
    const idea = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: current.title,
          type: "PROJECT",
          team,
          note: current.description,
          revenueImpact: current.impact >= HIGH_IMPACT_MIN ? "HIGH" : "MEDIUM",
        },
      });
      return tx.idea.update({
        where: { id },
        data: { ...input, promotedTaskId: task.id },
      });
    });
    return ok(idea);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await prisma.idea.delete({ where: { id } });
    return ok({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
