"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { apiCall } from "@/lib/api-client";

// F3 — nút "Tóm tắt bằng AI" cho trang Cuối ngày. Opt-in (bấm mới gọi) để không
// tốn API mỗi lần mở trang. Rớt về template thuần nếu chưa có ANTHROPIC_API_KEY.

export function AiSummaryCard() {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await apiCall<{ text: string }>("/api/daily-summary/narrative");
    setBusy(false);
    if (res.success && res.data) setText(res.data.text);
    else setError(res.error ?? "Không tạo được tóm tắt");
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          <Sparkles
            size={15}
            strokeWidth={2.25}
            aria-hidden
            className="text-gold"
          />
          Tóm tắt bằng AI
        </h2>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {busy ? "Đang viết…" : text ? "Viết lại" : "Tạo tóm tắt"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {text && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {text}
        </p>
      )}
    </section>
  );
}
