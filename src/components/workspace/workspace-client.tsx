"use client";

import { useEffect, useState } from "react";
import { Bot, Inbox as InboxIcon, Lightbulb, StickyNote } from "lucide-react";
import { AssistantChatClient } from "@/components/assistant/assistant-chat-client";
import { IdeasClient, type IdeaRow } from "@/components/ideas/ideas-client";
import { InboxClient, type InboxItemRow } from "@/components/inbox/inbox-client";
import { NotesClient, type NoteRow } from "@/components/notes/notes-client";
import type { LeaderOption } from "@/lib/task-row";

// Sổ tay — gộp Ghi chú, Inbox, Ý tưởng và Trợ lý AI vào 1 trang, 4 sub-tab.
// Cả 4 đều là chỗ ý tưởng/thông tin sống trước khi thành việc thật; tách ra 3
// mục nav riêng chỉ làm nav dài mà chẳng mục nào ở lại lâu.

const TABS = [
  { key: "notes", label: "Ghi chú", icon: StickyNote },
  { key: "inbox", label: "Inbox", icon: InboxIcon },
  { key: "ideas", label: "Ý tưởng", icon: Lightbulb },
  { key: "assistant", label: "Trợ lý AI", icon: Bot },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const isTabKey = (v: string | undefined): v is TabKey =>
  TABS.some((t) => t.key === v);

const SUBTITLES: Record<TabKey, string> = {
  notes: "Nháp nhanh, ghim lại thứ chưa đủ chín thành việc.",
  inbox: "Dán/upload từ nguồn khác — review rồi chuyển thành task thật.",
  ideas:
    "Chấm giá trị/công sức, thẩm định rồi duyệt thành dự án — để ý tưởng không chết trong ghi chú.",
  assistant:
    "Hỏi về task, phối hợp, báo cáo — trợ lý chỉ đọc dữ liệu, không tự tạo/sửa/xoá gì.",
};

interface WorkspaceClientProps {
  initialNotes: NoteRow[];
  initialInboxItems: InboxItemRow[];
  initialIdeas: IdeaRow[];
  leaders: LeaderOption[];
  initialTab?: string;
}

export function WorkspaceClient({
  initialNotes,
  initialInboxItems,
  initialIdeas,
  leaders,
  initialTab,
}: WorkspaceClientProps) {
  const [tab, setTab] = useState<TabKey>(
    isTabKey(initialTab) ? initialTab : "notes",
  );

  // Giữ URL khớp tab để share hoặc F5 quay lại đúng chỗ (shallow, không gọi server)
  useEffect(() => {
    const qs = tab === "notes" ? "" : `?tab=${tab}`;
    window.history.replaceState(null, "", `/workspace${qs}`);
  }, [tab]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Sổ tay</h1>
        <p className="mt-1 text-sm text-dim">{SUBTITLES[tab]}</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-brand-600 bg-brand-50/60 text-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
                : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <t.icon size={14} strokeWidth={2.25} aria-hidden />
            {t.label}
            {t.key === "inbox" && initialInboxItems.length > 0 && (
              <span className="ml-0.5 rounded-full bg-brand-700 px-1.5 text-[10px] font-semibold text-white dark:bg-brand-600">
                {initialInboxItems.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "notes" && <NotesClient initialNotes={initialNotes} />}
      {tab === "inbox" && (
        <InboxClient initialItems={initialInboxItems} leaders={leaders} />
      )}
      {tab === "ideas" && <IdeasClient initialIdeas={initialIdeas} />}
      {tab === "assistant" && <AssistantChatClient />}
    </div>
  );
}
