import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/assistant/conversations — danh sách phiên chat gần nhất (chọn lại phiên cũ)
export async function GET() {
  const conversations = await prisma.aiConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, title: true, updatedAt: true },
  });
  return ok(
    conversations.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
    })),
  );
}
