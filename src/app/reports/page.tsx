import { ReportsClient } from "@/components/reports/reports-client";
import { getReportsPageData } from "@/lib/reports-page";

export const dynamic = "force-dynamic";

// 📋 Báo cáo ban lãnh đạo — DB3 (Giai đoạn E2)
export default async function ReportsPage() {
  const reports = await getReportsPageData();
  return <ReportsClient reports={reports} />;
}
