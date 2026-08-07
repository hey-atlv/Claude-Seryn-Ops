import { redirect } from "next/navigation";

// SOP đã gộp vào /ops. Giữ route cũ để bookmark không 404.
export default function SopPage() {
  redirect("/ops?tab=sop");
}
