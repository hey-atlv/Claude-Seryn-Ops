import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { inboxStatusUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/inbox/[id] — đổi trạng thái (convert → CONVERTED, bỏ qua → DISMISSED)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const { status } = inboxStatusUpdateSchema.parse(body);
    const item = await prisma.inboxItem.update({ where: { id }, data: { status } });
    return ok(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await prisma.inboxItem.delete({ where: { id } });
    return ok({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
