import { NextRequest } from "next/server";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { leaderCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Leader — CRUD cho màn Cài đặt › Team & Leader.

export async function GET() {
  try {
    const leaders = await prisma.leader.findMany({
      orderBy: [{ team: "asc" }, { name: "asc" }],
    });
    return ok(leaders);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const parsed = leaderCreateSchema.parse(body);
    if (parsed.channel && parsed.team !== "DIGITAL") {
      return fail("Chỉ team Digital mới chia kênh (Facebook/Zalo/Google)");
    }
    const leader = await prisma.leader.create({
      data: {
        name: parsed.name,
        team: parsed.team,
        channel: parsed.channel ?? null,
        chatHandle: parsed.chatHandle ?? null,
      },
    });
    return ok(leader, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
