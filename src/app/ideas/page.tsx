import { IdeasClient } from "@/components/ideas/ideas-client";
import { prisma } from "@/lib/db";

// Backlog ý tưởng — nơi ý tưởng sống trước khi đủ chín thành Project.
// Trước khi có trang này, ý tưởng chỉ nằm rải trong PersonalNote: không trạng
// thái, không chấm điểm, không có đường thành dự án.

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ideas = await prisma.idea.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Ý tưởng</h1>
        <p className="mt-1 text-sm text-dim">
          Ghi nhanh, chấm giá trị/công sức, thẩm định rồi duyệt thành dự án — để
          ý tưởng không chết trong ghi chú.
        </p>
      </div>
      <IdeasClient
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
      />
    </main>
  );
}
