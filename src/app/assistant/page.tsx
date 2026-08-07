import { redirect } from "next/navigation";

// Trợ lý AI đã gộp vào Sổ tay (/workspace). Giữ route cũ để bookmark không 404.
export default function AssistantPage() {
  redirect("/workspace?tab=assistant");
}
