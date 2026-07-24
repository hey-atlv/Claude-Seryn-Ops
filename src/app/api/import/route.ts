import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { taskCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MAX_IMPORT_ROWS = 500;

const importSchema = z.object({
  tasks: z
    .array(taskCreateSchema)
    .min(1, "Không có dòng nào để import")
    .max(MAX_IMPORT_ROWS, `Tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần import`),
});

// POST /api/import — tạo hàng loạt task từ CSV (G1). Atomic: lỗi 1 dòng là
// không tạo dòng nào, client sửa rồi gửi lại — tránh import nửa vời khó dò.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const { tasks } = importSchema.parse(body);

    const leaderIds = new Set(
      (await prisma.leader.findMany({ select: { id: true } })).map((l) => l.id),
    );
    const badLeader = tasks.findIndex(
      (t) => t.leaderId && !leaderIds.has(t.leaderId),
    );
    if (badLeader !== -1) {
      return fail(`Dòng ${badLeader + 1}: leaderId không tồn tại`);
    }

    const now = new Date();
    const result = await prisma.task.createMany({
      data: tasks.map((t) => ({
        ...t,
        completedAt: t.status === "DONE" ? now : null,
      })),
    });
    return ok({ created: result.count }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
