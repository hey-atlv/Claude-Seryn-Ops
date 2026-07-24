import { DepsClient } from "@/components/deps/deps-client";
import { getDependenciesPageData } from "@/lib/deps-page";

export const dynamic = "force-dynamic";

// 🔗 Phối hợp liên phòng — 3 views DB2 (Giai đoạn E1)
export default async function DependenciesPage() {
  const deps = await getDependenciesPageData();
  return <DepsClient deps={deps} />;
}
