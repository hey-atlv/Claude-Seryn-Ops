import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sopCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const docs = await prisma.sopDoc.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return ok(docs);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = sopCreateSchema.parse(body);
    const doc = await prisma.sopDoc.create({ data: input });
    return ok(doc, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
