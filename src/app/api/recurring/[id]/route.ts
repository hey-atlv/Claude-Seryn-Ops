import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  normalizeRecurringInput,
  parseDefaults,
  parseSubItems,
  toTemplateRecord,
} from "@/lib/recurring-core";
import {
  recurringTemplateUpdateSchema,
  validateRecurringTemplate,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH gộp với bản ghi hiện có rồi validate TOÀN BỘ: đổi lịch tuần→tháng hay
 * đổi loại đích task→báo cáo đều làm các field khác trở nên hợp lệ/không hợp lệ,
 * nên không thể kiểm tra riêng lẻ từng field được gửi lên.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const patch = recurringTemplateUpdateSchema.parse(body);

    const existing = await prisma.recurringTemplate.findUnique({ where: { id } });
    if (!existing) return fail("Không tìm thấy template", 404);

    const input = normalizeRecurringInput({
      name: patch.name ?? existing.name,
      targetDb: patch.targetDb ?? existing.targetDb,
      scheduleType: patch.scheduleType ?? existing.scheduleType,
      scheduleDay:
        patch.scheduleDay !== undefined ? patch.scheduleDay : existing.scheduleDay,
      defaults: patch.defaults ?? parseDefaults(existing.defaults),
      subItems: patch.subItems ?? parseSubItems(existing.subItemsTemplate),
      active: patch.active ?? existing.active,
    });
    const error = validateRecurringTemplate(input);
    if (error) return fail(error);

    const template = await prisma.recurringTemplate.update({
      where: { id },
      data: toTemplateRecord(input),
    });
    return ok(template);
  } catch (error) {
    return handleApiError(error);
  }
}

// Xóa template — Task/Báo cáo đã sinh vẫn giữ nguyên (FK ON DELETE SET NULL),
// chỉ mất liên kết về template nên sẽ không còn bị chặn trùng theo kỳ.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await prisma.recurringTemplate.delete({ where: { id } });
    return ok({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
