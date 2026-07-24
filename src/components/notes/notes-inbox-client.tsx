"use client";

import { useState } from "react";
import { Inbox as InboxIcon, StickyNote } from "lucide-react";
import { InboxClient, type InboxItemRow } from "@/components/inbox/inbox-client";
import type { LeaderOption } from "@/lib/task-row";
import { NotesClient, type NoteRow } from "./notes-client";

// Gộp Ghi chú + Inbox thành 1 trang, 2 sub-tab — cả 2 vẫn là quick-capture cá
// nhân trước khi thành việc thật nên gộp chung 1 chỗ cho gọn nav.

const TABS = [
  { key: "notes", label: "Ghi chú", icon: StickyNote },
  { key: "inbox", label: "Inbox", icon: InboxIcon },
] as const;
type TabKey = (typeof TABS)[number]["key"];

interface NotesInboxClientProps {
  initialNotes: NoteRow[];
  initialInboxItems: InboxItemRow[];
  leaders: LeaderOption[];
}

export function NotesInboxClient({
  initialNotes,
  initialInboxItems,
  leaders,
}: NotesInboxClientProps) {
  const [tab, setTab] = useState<TabKey>("notes");

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 border-b border-zinc-200 pb-px dark:border-zinc-800">
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
    </div>
  );
}
