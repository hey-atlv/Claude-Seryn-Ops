import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { attachmentsDir, contentTypeFor, extOf } from "@/lib/attachments";
import { fail, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/inbox/[id]/file — stream lại file gốc đã upload (xem/tải lại)
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const item = await prisma.inboxItem.findUnique({ where: { id } });
    if (!item?.fileUrl) return fail("Item không có file đính kèm", 404);

    const buffer = await readFile(join(attachmentsDir(), item.fileUrl));
    const ext = extOf(item.fileUrl);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeFor(ext),
        "Content-Disposition": `inline; filename="${item.fileUrl}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
