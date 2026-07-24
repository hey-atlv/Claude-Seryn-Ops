import { ImportClient } from "@/components/import/import-client";
import { prisma } from "@/lib/db";

// G1 — Import CSV từ Google Sheets cũ → mapping cột → tạo tasks hàng loạt.

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const leaders = await prisma.leader.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          📥 Import công việc từ CSV
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Chuyển dữ liệu từ Google Sheets cũ vào hệ thống — 3 bước: chọn
          file/dán dữ liệu → ghép cột → kiểm tra rồi import.
        </p>
      </div>
      <ImportClient
        leaders={leaders.map((l) => ({
          id: l.id,
          name: l.name,
          team: l.team,
        }))}
      />
    </main>
  );
}
