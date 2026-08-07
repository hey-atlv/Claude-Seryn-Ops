import { redirect } from "next/navigation";

// Phối hợp đã gộp vào /ops. Giữ route cũ để bookmark không 404.
export default function DependenciesPage() {
  redirect("/ops?tab=deps");
}
