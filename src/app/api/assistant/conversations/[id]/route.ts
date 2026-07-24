import { NextRequest } from "next/server";
import { toDisplayMessages } from "@/lib/ai-conversation-view";
import { handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/assistant/conversations/[id] — nạp lại lịch sử hiển thị khi mở lại phiên cũ
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const conversation = await prisma.aiConversation.findUnique({ where: { id } });
    if (!conversation) return handleApiError({ code: "P2025" });
    const raw = JSON.parse(conversation.messagesJson) as unknown[];
    return ok({
      id: conversation.id,
      title: conversation.title,
      messages: toDisplayMessages(raw),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
