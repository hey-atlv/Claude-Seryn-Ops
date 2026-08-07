import { redirect } from "next/navigation";

// Ghi chú đã gộp vào Sổ tay (/workspace). Giữ route cũ để bookmark không 404.
export default function NotesPage() {
  redirect("/workspace?tab=notes");
}
