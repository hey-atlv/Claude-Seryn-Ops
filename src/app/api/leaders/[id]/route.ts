import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { leaderUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Sửa/xóa 1 leader — Cài đặt › Team & Leader.

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const parsed = leaderUpdateSchema.parse(body);

    const existing = await prisma.leader.findUnique({ where: { id } });
    if (!existing) return fail("Không tìm thấy leader", 404);

    // Ràng buộc chéo trên bản ghi SAU khi merge — đổi team khỏi Digital thì kênh
    // không còn ý nghĩa, tự xóa thay vì bắt lỗi.
    const team = parsed.team ?? existing.team;
    let channel = parsed.channel !== undefined ? parsed.channel : existing.channel;
    if (team !== "DIGITAL") channel = null;

    const leader = await prisma.leader.update({
      where: { id },
      data: {
        name: parsed.name ?? existing.name,
        team,
        channel,
        chatHandle:
          parsed.chatHandle !== undefined ? parsed.chatHandle : existing.chatHandle,
      },
    });
    return ok(leader);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const taskCount = await prisma.task.count({ where: { leaderId: id } });
    if (taskCount > 0) {
      return fail(
        `Leader đang được gán ${taskCount} task — đổi tên hoặc gán lại task trước khi xóa`,
      );
    }
    await prisma.leader.delete({ where: { id } });
    return ok({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
