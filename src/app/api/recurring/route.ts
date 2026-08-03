import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { normalizeRecurringInput, toTemplateRecord } from "@/lib/recurring-core";
import {
  recurringTemplateCreateSchema,
  validateRecurringTemplate,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

// Template việc lặp lại — CRUD cho màn Cài đặt › Việc định kỳ.

export async function GET() {
  try {
    const templates = await prisma.recurringTemplate.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    return ok(templates);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const parsed = recurringTemplateCreateSchema.parse(body);
    const input = normalizeRecurringInput({
      ...parsed,
      scheduleDay: parsed.scheduleDay ?? null,
    });
    const error = validateRecurringTemplate(input);
    if (error) return fail(error);

    const template = await prisma.recurringTemplate.create({
      data: toTemplateRecord(input),
    });
    return ok(template, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
