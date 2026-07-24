import { NotesInboxClient } from "@/components/notes/notes-inbox-client";
import { prisma } from "@/lib/db";

// Ghi chú cá nhân + Inbox — 2 sub-tab quick-capture trước khi thành việc thật.

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const [notes, inboxItems, leaders] = await Promise.all([
    prisma.personalNote.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.inboxItem.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leader.findMany({
      select: { id: true, name: true, team: true, channel: true },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Ghi chú & Inbox
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Nháp nhanh ý tưởng, dán/upload từ nguồn khác — review rồi chuyển
          thành task thật khi cần.
        </p>
      </div>
      <NotesInboxClient
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
        leaders={leaders}
      />
    </main>
  );
}
