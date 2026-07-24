import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  cooperationValidForPartner,
  dependencyUpdateSchema,
  TCKT_ADHOC_TYPE,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = dependencyUpdateSchema.parse(body);

    const existing = await prisma.dependency.findUnique({ where: { id } });
    if (!existing) return fail("Không tìm thấy dependency", 404);

    // Ràng buộc chéo sau merge: loại phối hợp khớp khối; TC-KT phát sinh phải có SLA
    const partner = input.partner ?? existing.partner;
    const coop =
      input.cooperationType !== undefined
        ? input.cooperationType
        : existing.cooperationType;
    const sla = input.slaDate !== undefined ? input.slaDate : existing.slaDate;
    if (!cooperationValidForPartner(partner, coop)) {
      return fail(`Loại phối hợp "${coop}" không thuộc khối đã chọn`);
    }
    if (partner === "TC_KT" && coop === TCKT_ADHOC_TYPE && !sla) {
      return fail("Việc phát sinh với Tài chính-KT bắt buộc điền SLA");
    }

    const dep = await prisma.dependency.update({ where: { id }, data: input });
    return ok(dep);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await prisma.dependency.delete({ where: { id } });
    return ok({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
