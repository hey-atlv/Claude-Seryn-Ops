import { AssistantChatClient } from "@/components/assistant/assistant-chat-client";

export const dynamic = "force-dynamic";

// Giai đoạn L1 — trang Trợ lý AI (nav "Khác ▾")
export default function AssistantPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">🤖 Trợ lý AI</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Hỏi về task, phối hợp, báo cáo — trợ lý chỉ đọc dữ liệu, không tự tạo/sửa/xoá gì
        </p>
      </header>
      <AssistantChatClient />
    </main>
  );
}
