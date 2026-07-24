import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { noteCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/notes — ghi chú cá nhân, ghim trước, mới sửa trước
export async function GET() {
  try {
    const notes = await prisma.personalNote.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });
    return ok(notes);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/notes — tạo ghi chú mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = noteCreateSchema.parse(body);
    const note = await prisma.personalNote.create({ data: input });
    return ok(note, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
