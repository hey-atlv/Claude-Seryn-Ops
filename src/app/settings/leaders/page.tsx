import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { LeadersClient } from "./leaders-client";

export const dynamic = "force-dynamic";

// Cài đặt › Team & Leader — quản lý người nhận việc của từng team.
// Team là danh mục cố định của hệ thống (gắn với nhóm việc, validate, báo cáo)
// — trang này quản lý LEADER trong từng team.

export default async function LeadersSettingsPage() {
  const [leaders, taskCounts] = await Promise.all([
    prisma.leader.findMany({ orderBy: [{ team: "asc" }, { name: "asc" }] }),
    prisma.task.groupBy({ by: ["leaderId"], _count: { _all: true } }),
  ]);
  const countByLeader = new Map(
    taskCounts
      .filter((c) => c.leaderId !== null)
      .map((c) => [c.leaderId as string, c._count._all]),
  );

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-6">
      <Link
        href="/settings"
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
        Cài đặt
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Team & Leader
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Team là danh mục cố định của hệ thống (gắn với nhóm việc, ma trận, báo
        cáo). Quản lý leader của từng team tại đây — leader hiện trong ô chọn khi
        tạo/sửa task của team đó.
      </p>
      <LeadersClient
        leaders={leaders.map((l) => ({
          id: l.id,
          name: l.name,
          team: l.team,
          channel: l.channel,
          chatHandle: l.chatHandle,
          taskCount: countByLeader.get(l.id) ?? 0,
        }))}
      />
    </main>
  );
}
