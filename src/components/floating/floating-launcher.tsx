"use client";

import { useState } from "react";
import { Bot, StickyNote } from "lucide-react";
import { FloatingPanel } from "@/components/floating/floating-panel";
import { FloatingNotesPanel } from "@/components/floating/floating-notes-panel";
import { AssistantChatClient } from "@/components/assistant/assistant-chat-client";

// Nút nổi góc dưới phải: mở nhanh Trợ lý AI / Ghi chú ở bất kỳ trang nào,
// song song với trang đầy đủ /assistant và /notes (không thay thế nav).

const FAB_BASE =
  "flex h-11 w-11 items-center justify-center rounded-full shadow-elevated transition-colors";
const FAB_IDLE =
  "border border-hair bg-panel text-dim hover:bg-panel-2 hover:text-text";
const FAB_ACTIVE = "border border-gold/30 bg-gold/20 text-gold hover:bg-gold/25";

export function FloatingLauncher() {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col items-end gap-2 p-4">
      <div className="flex flex-row-reverse items-end gap-3">
        {assistantOpen && (
          <FloatingPanel
            title="Trợ lý AI"
            icon={<Bot size={16} className="text-gold" aria-hidden />}
            onClose={() => setAssistantOpen(false)}
          >
            <AssistantChatClient compact />
          </FloatingPanel>
        )}
        {notesOpen && (
          <FloatingPanel
            title="Ghi chú nhanh"
            icon={<StickyNote size={16} className="text-gold" aria-hidden />}
            onClose={() => setNotesOpen(false)}
          >
            <FloatingNotesPanel />
          </FloatingPanel>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          aria-expanded={notesOpen}
          aria-label="Ghi chú nhanh"
          title="Ghi chú nhanh"
          className={`${FAB_BASE} ${notesOpen ? FAB_ACTIVE : FAB_IDLE}`}
        >
          <StickyNote size={19} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setAssistantOpen((v) => !v)}
          aria-expanded={assistantOpen}
          aria-label="Trợ lý AI"
          title="Trợ lý AI"
          className={`${FAB_BASE} ${assistantOpen ? FAB_ACTIVE : FAB_IDLE}`}
        >
          <Bot size={19} aria-hidden />
        </button>
      </div>
    </div>
  );
}
