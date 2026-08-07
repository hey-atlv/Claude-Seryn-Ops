import { redirect } from "next/navigation";

// Tóm tắt cuối ngày đã thành tab "Cuối ngày" của trang chủ.
// Giữ route cũ để bookmark không 404.
export default function DailySummaryPage() {
  redirect("/?tab=closing");
}
