import { OpsClient } from "@/components/ops/ops-client";
import { prisma } from "@/lib/db";
import { getDependenciesPageData } from "@/lib/deps-page";
import { getReportsPageData } from "@/lib/reports-page";

// Phối hợp & Báo cáo — gộp Phối hợp liên phòng + SOP + Báo cáo ban lãnh đạo.
// Các route cũ (/dependencies, /sop, /reports) redirect về đây kèm ?tab=.

export const dynamic = "force-dynamic";

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const [deps, docs, reports] = await Promise.all([
    getDependenciesPageData(),
    prisma.sopDoc.findMany({ orderBy: { updatedAt: "desc" } }),
    getReportsPageData(),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-6">
      <OpsClient
        initialTab={typeof sp.tab === "string" ? sp.tab : undefined}
        deps={deps}
        docs={docs.map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          content: d.content,
          updatedAt: d.updatedAt.toISOString(),
        }))}
        reports={reports}
      />
    </main>
  );
}
