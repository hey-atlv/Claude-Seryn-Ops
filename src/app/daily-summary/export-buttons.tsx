"use client";

import { useState } from "react";
import { FileDown, Send } from "lucide-react";
import { apiCall } from "@/lib/api-client";

// K3 — nút "Xuất PDF" + "Gửi qua Telegram" cho trang Tóm tắt cuối ngày.

export function ExportButtons() {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendTelegram() {
    setSending(true);
    setMsg(null);
    const res = await apiCall("/api/export/telegram", "POST", {
      type: "daily-summary",
    });
    setSending(false);
    setMsg(res.success ? "✅ Đã gửi qua Telegram" : `⚠️ ${res.error}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href="/api/export/pdf?type=daily-summary"
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:border-brand-500 hover:text-brand-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-brand-300"
      >
        <FileDown size={14} strokeWidth={2.25} aria-hidden />
        Xuất PDF
      </a>
      <button
        type="button"
        onClick={sendTelegram}
        disabled={sending}
        className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
      >
        <Send size={14} strokeWidth={2.25} aria-hidden />
        {sending ? "Đang gửi…" : "Gửi qua Telegram"}
      </button>
      {msg && <span className="text-sm text-zinc-500">{msg}</span>}
    </div>
  );
}
