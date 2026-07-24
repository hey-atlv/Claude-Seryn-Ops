import { NextRequest } from "next/server";
import { INBOX_STATUSES, type InboxStatus } from "@/lib/constants";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { inboxItemCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/inbox?status=PENDING — mặc định PENDING, mới nhất trước
export async function GET(req: NextRequest) {
  try {
    const statusParam = req.nextUrl.searchParams.get("status");
    const status: InboxStatus = INBOX_STATUSES.includes(
      statusParam as InboxStatus,
    )
      ? (statusParam as InboxStatus)
      : "PENDING";
    const items = await prisma.inboxItem.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
    return ok(items);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/inbox — tạo 1 item thủ công (source thường là TELEGRAM/GSHEET/GCAL sau này)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = inboxItemCreateSchema.parse(body);
    const item = await prisma.inboxItem.create({ data: input });
    return ok(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
