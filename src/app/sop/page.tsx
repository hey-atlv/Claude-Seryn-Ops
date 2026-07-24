import { SopClient } from "@/components/sop/sop-client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// 📚 SOP & Templates — markdown (Giai đoạn E3)
export default async function SopPage() {
  const docs = await prisma.sopDoc.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <SopClient
      docs={docs.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        content: d.content,
        updatedAt: d.updatedAt.toISOString(),
      }))}
    />
  );
}
