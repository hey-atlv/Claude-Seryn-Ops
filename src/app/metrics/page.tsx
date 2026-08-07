import { redirect } from "next/navigation";

// Sức khỏe hệ thống đã thành dải chỉ số cố định trên đầu trang chủ.
// Giữ route cũ để bookmark không 404.
export default function MetricsPage() {
  redirect("/");
}
