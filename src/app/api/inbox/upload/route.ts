import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { proposeTriage } from "@/lib/ai-triage";
import {
  ATTACHMENT_EXT_TO_TYPE,
  attachmentsDir,
  extOf,
  MAX_ATTACHMENT_BYTES,
  safeAttachmentName,
} from "@/lib/attachments";
import { fail, handleApiError, ok } from "@/lib/api";
import { extractText } from "@/lib/inbox-parse";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/inbox/upload — H2/H4: nhận multipart/form-data { file }, validate
// đuôi/size, lưu file vào attachmentsDir() (ngoài OneDrive), trích text (nếu
// xlsx/docx/pdf) rồi tạo InboxItem (source UPLOAD).
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || !(file instanceof File)) {
      return fail("Thiếu file upload");
    }
    if (file.size === 0) return fail("File rỗng");
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return fail(
        `File vượt quá ${Math.floor(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB`,
      );
    }

    const ext = extOf(file.name);
    const fileType = ATTACHMENT_EXT_TO_TYPE[ext];
    if (!fileType) {
      return fail(
        `Không hỗ trợ file .${ext || "?"} — chỉ nhận xlsx/csv/docx/pdf/ảnh`,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const savedName = safeAttachmentName(file.name);
    await writeFile(join(attachmentsDir(), savedName), buffer);

    let rawText: string | null = null;
    try {
      rawText = await extractText(buffer, fileType);
    } catch (parseError) {
      console.error("[InboxUpload] Lỗi trích text:", parseError);
      // Vẫn lưu file + tạo item, chỉ là không có rawText — người dùng tự mở file
    }

    // L3 — gợi ý AI (title/deadline/team/category/priority) nếu trích được text
    const draft = rawText ? await proposeTriage(rawText) : null;

    const item = await prisma.inboxItem.create({
      data: {
        source: "UPLOAD",
        rawText,
        fileUrl: savedName,
        fileType,
        parsedDraft: draft ? JSON.stringify(draft) : null,
      },
    });
    return ok(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
