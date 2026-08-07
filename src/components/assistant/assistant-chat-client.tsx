"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Plus, Send, User } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import type { DisplayChatMessage } from "@/lib/ai-conversation-view";
import { formatVN } from "@/lib/timezone";

// Giai đoạn L1 — panel chat AI: gửi câu hỏi, đọc SSE thủ công từ
// /api/assistant/chat (text_delta/tool_call/tool_result/done/error), lưu
// conversationId ở localStorage để mở lại đúng phiên khi F5 (giống pattern
// throttle của notification-bell.tsx).

const STORAGE_KEY = "seryn-assistant-conversation-id";

interface SessionRow {
  id: string;
  title: string | null;
  updatedAt: string;
}

const CARD = "rounded-lg border border-hair bg-panel";
const BTN_PRIMARY =
  "flex items-center gap-1.5 rounded-md bg-gold/[0.14] px-3 py-2 text-sm font-semibold text-gold hover:bg-gold/25 disabled:opacity-50";
const BTN_GHOST =
  "rounded-md px-2.5 py-1.5 text-xs text-muted hover:bg-panel-3 hover:text-text";

const TOOL_LABELS: Record<string, string> = {
  search_tasks: "tìm task",
  get_task_detail: "xem chi tiết task",
  get_team_summary: "tổng hợp team",
  get_dependencies: "tra cứu phối hợp",
  get_reports: "tra cứu báo cáo",
  get_stats: "tra cứu số liệu tổng quan",
};

function loadConversationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveConversationId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage bị chặn — bỏ qua, chỉ mất khả năng nhớ phiên khi F5
  }
}

interface AssistantChatClientProps {
  // Widget nổi: bỏ cột danh sách phiên (quá hẹp), thay bằng dropdown gọn.
  compact?: boolean;
}

export function AssistantChatClient({ compact = false }: AssistantChatClientProps = {}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = loadConversationId();
    if (id) loadConversation(id);
    refreshSessions();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  async function refreshSessions() {
    const res = await apiCall<SessionRow[]>("/api/assistant/conversations");
    if (res.success && res.data) setSessions(res.data);
  }

  async function loadConversation(id: string) {
    const res = await apiCall<{ id: string; messages: DisplayChatMessage[] }>(
      `/api/assistant/conversations/${id}`,
    );
    if (res.success && res.data) {
      setConversationId(id);
      setMessages(res.data.messages);
      saveConversationId(id);
    } else {
      saveConversationId(null);
    }
  }

  function startNewSession() {
    setConversationId(null);
    setMessages([]);
    setError(null);
    saveConversationId(null);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text, tools: [] },
      { role: "assistant", text: "", tools: [] },
    ]);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Trợ lý AI lỗi — thử lại sau");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;
          const jsonText = line.slice(5).trim();
          if (!jsonText) continue;
          handleEvent(JSON.parse(jsonText));
        }
      }
    } catch {
      setError("Không kết nối được máy chủ — kiểm tra dev server");
    }
    setBusy(false);
    setStatus(null);
  }

  function handleEvent(event: Record<string, unknown>) {
    if (event.type === "text_delta") {
      const delta = String(event.text ?? "");
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") next[next.length - 1] = { ...last, text: last.text + delta };
        return next;
      });
    } else if (event.type === "tool_call") {
      const label = TOOL_LABELS[String(event.name)] ?? String(event.name);
      setStatus(`🔍 Đang ${label}...`);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && !last.tools.includes(String(event.name))) {
          next[next.length - 1] = { ...last, tools: [...last.tools, String(event.name)] };
        }
        return next;
      });
    } else if (event.type === "tool_result") {
      setStatus(null);
    } else if (event.type === "done") {
      const id = String(event.conversationId);
      setConversationId(id);
      saveConversationId(id);
      refreshSessions();
    } else if (event.type === "error") {
      setError(String(event.message));
    }
  }

  const sessionPicker = compact ? (
    <div className="flex items-center gap-1.5 border-b border-hair-soft p-2">
      <button
        type="button"
        onClick={startNewSession}
        title="Phiên mới"
        className={`${BTN_GHOST} flex shrink-0 items-center gap-1`}
      >
        <Plus size={13} aria-hidden />
      </button>
      <select
        value={conversationId ?? ""}
        onChange={(e) => {
          if (e.target.value) loadConversation(e.target.value);
        }}
        className="min-w-0 flex-1 truncate rounded-md border border-hair bg-panel-2 px-2 py-1 text-xs text-dim focus:border-gold/60 focus:outline-none"
      >
        <option value="">Phiên hiện tại</option>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title || "(chưa có tiêu đề)"}
          </option>
        ))}
      </select>
    </div>
  ) : (
    <div className={`${CARD} space-y-1 p-2`}>
      <button type="button" onClick={startNewSession} className={`${BTN_GHOST} flex w-full items-center gap-1.5`}>
        <Plus size={13} aria-hidden /> Phiên mới
      </button>
      <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => loadConversation(s.id)}
            className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-xs ${
              s.id === conversationId
                ? "bg-gold/[0.11] text-gold-text"
                : "text-muted hover:bg-panel-2 hover:text-text"
            }`}
            title={s.title ?? ""}
          >
            {s.title || "(chưa có tiêu đề)"}
            <span className="block text-[10px] text-faint">
              {formatVN(new Date(s.updatedAt), "dd/MM HH:mm")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const chatColumn = (
    <div className={compact ? "flex h-full flex-col" : `${CARD} flex h-[70vh] flex-col`}>
      {compact && sessionPicker}
      <div ref={scrollRef} className={`flex-1 space-y-3 overflow-y-auto ${compact ? "p-3" : "p-4"}`}>
          {messages.length === 0 && (
            <p className="text-sm text-muted">
              Hỏi về task/dependency/report — ví dụ &quot;team Digital có việc gì quá hạn?&quot;
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <Bot size={16} className="mt-1 shrink-0 text-gold" aria-hidden />
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-dusty/[0.16] text-text"
                    : "bg-panel-2 text-dim"
                }`}
              >
                {m.tools.length > 0 && (
                  <p className="mb-1 text-[11px] italic text-muted">
                    Đã dùng: {m.tools.map((t) => TOOL_LABELS[t] ?? t).join(", ")}
                  </p>
                )}
                {m.text || (busy && i === messages.length - 1 ? "…" : "")}
              </div>
              {m.role === "user" && (
                <User size={16} className="mt-1 shrink-0 text-faint" aria-hidden />
              )}
            </div>
          ))}
          {status && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Loader2 size={12} className="animate-spin" aria-hidden /> {status}
            </p>
          )}
          {error && (
            <p className="rounded-md bg-critical/[0.12] px-3 py-2 text-sm text-critical">
              {error}
            </p>
          )}
        </div>
        <div className="flex items-end gap-2 border-t border-hair-soft p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Nhập câu hỏi..."
            className="flex-1 resize-none rounded-md border border-hair bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-faint focus:border-gold/60 focus:outline-none"
          />
          <button type="button" onClick={send} disabled={busy || !input.trim()} className={BTN_PRIMARY}>
            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Send size={15} aria-hidden />}
          </button>
        </div>
      </div>
  );

  if (compact) return chatColumn;

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      {sessionPicker}
      {chatColumn}
    </div>
  );
}
