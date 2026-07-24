import { NextRequest } from "next/server";
import { proposeTriage } from "@/lib/ai-triage";
import { guessDraftFromLine, parseQuickCapture } from "@/lib/inbox-core";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { inboxCaptureSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// POST /api/inbox/capture — H3: dán nhiều dòng text, mỗi dòng tạo 1 InboxItem
// (source PASTE). L3 — ưu tiên gợi ý AI (Haiku, thêm team/category/priority),
// rớt về gợi ý rule-based (chỉ title/deadline) nếu AI lỗi/chưa cấu hình key.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const { text } = inboxCaptureSchema.parse(body);

    const lines = parseQuickCapture(text);
    if (lines.length === 0) return fail("Không có dòng nào để thêm vào Inbox");

    const drafts = await Promise.all(
      lines.map((line) => proposeTriage(line).then((d) => d ?? guessDraftFromLine(line))),
    );

    const result = await prisma.inboxItem.createMany({
      data: lines.map((line, i) => ({
        source: "PASTE",
        rawText: line,
        parsedDraft: JSON.stringify(drafts[i]),
      })),
    });
    return ok({ created: result.count }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
