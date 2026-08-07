import { WorkspaceClient } from "@/components/workspace/workspace-client";
import { prisma } from "@/lib/db";

// Sổ tay — gộp Ghi chú + Inbox + Ý tưởng + Trợ lý AI. Các route cũ
// (/notes, /ideas, /assistant) redirect về đây kèm ?tab= tương ứng.

export const dynamic = "force-dynamic";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const [notes, inboxItems, ideas, leaders] = await Promise.all([
    prisma.personalNote.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.inboxItem.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.idea.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.leader.findMany({
      select: { id: true, name: true, team: true, channel: true },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6">
      <WorkspaceClient
        initialTab={typeof sp.tab === "string" ? sp.tab : undefined}
        initialNotes={notes.map((n) => ({
          id: n.id,
          content: n.content,
          pinned: n.pinned,
          updatedAt: n.updatedAt.toISOString(),
        }))}
        initialInboxItems={inboxItems.map((i) => ({
          id: i.id,
          source: i.source,
          rawText: i.rawText,
          fileUrl: i.fileUrl,
          fileType: i.fileType,
          parsedDraft: i.parsedDraft,
          createdAt: i.createdAt.toISOString(),
        }))}
        initialIdeas={ideas.map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          status: i.status,
          impact: i.impact,
          effort: i.effort,
          team: i.team,
          source: i.source,
          decisionNote: i.decisionNote,
          promotedTaskId: i.promotedTaskId,
          updatedAt: i.updatedAt.toISOString(),
        }))}
        leaders={leaders}
      />
    </main>
  );
}
