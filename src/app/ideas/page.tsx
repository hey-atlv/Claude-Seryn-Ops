import { redirect } from "next/navigation";

// Ý tưởng đã gộp vào Sổ tay (/workspace). Giữ route cũ để bookmark không 404.
export default function IdeasPage() {
  redirect("/workspace?tab=ideas");
}
