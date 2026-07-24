import { NextRequest } from "next/server";
import { alertStatus } from "@/lib/alerts";
import { fail, handleApiError, ok } from "@/lib/api";
import { DEPENDENCY_STALE_DAYS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { dependencyCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
const DAY_MS = 86_400_000;

// GET /api/dependencies?partner=&status=&stale=1&offProcess=1
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const partner = sp.get("partner") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const stale = sp.get("stale") === "1"; // chờ phản hồi quá 3 ngày → cần "đi đòi"
    const offProcess = sp.get("offProcess") === "1"; // TC-KT lệch quy trình
    const now = new Date();

    const deps = await prisma.dependency.findMany({
      where: {
        ...(partner && { partner }),
        ...(status && { status }),
        ...(stale && {
          status: "WAITING",
          createdAt: {
            lt: new Date(now.getTime() - DEPENDENCY_STALE_DAYS * DAY_MS),
          },
        }),
        ...(offProcess && { partner: "TC_KT", followsProcess: false }),
      },
      orderBy: { createdAt: "desc" },
    });
    const data = deps.map((d) => ({
      ...d,
      alertStatus: alertStatus({ status: d.status, deadline: d.slaDate }, now),
      waitingDays: Math.floor((now.getTime() - d.createdAt.getTime()) / DAY_MS),
    }));
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = dependencyCreateSchema.parse(body);
    const dep = await prisma.dependency.create({ data: input });
    return ok(dep, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
