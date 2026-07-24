import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ideaCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/ideas — backlog ý tưởng, mới sửa trước.
// Không sắp theo điểm ở DB: điểm là giá trị dẫn xuất (impact/effort), tính ở
// client để chỉ có MỘT nguồn sự thật duy nhất là idea-score.ts.
export async function GET() {
  try {
    const ideas = await prisma.idea.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return ok(ideas);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/ideas — ghi nhanh 1 ý tưởng mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = ideaCreateSchema.parse(body);
    const idea = await prisma.idea.create({ data: input });
    return ok(idea, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
