import { redirect } from "next/navigation";

// Báo cáo đã gộp vào /ops. Giữ route cũ để bookmark không 404.
export default function ReportsPage() {
  redirect("/ops?tab=reports");
}
