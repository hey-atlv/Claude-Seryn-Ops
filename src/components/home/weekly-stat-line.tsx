"use client";

import { useState } from "react";
import { apiCall } from "@/lib/api-client";
import type { WeeklyStatRow } from "@/lib/today-row";

// Khối ⑤ — 1 dòng chỉ số tuần nhập tay, upsert theo weekKey.

interface WeeklyStatLineProps {
  weekKey: string; // "2026-W30"
  weekLabel: string; // "tuần 30/2026"
  initial: WeeklyStatRow | null;
}

const num = (v: string): number | null => {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const show = (v: number | null | undefined) => (v == null ? "" : String(v));

export function WeeklyStatLine({
  weekKey,
  weekLabel,
  initial,
}: WeeklyStatLineProps) {
  const [revenue, setRevenue] = useState(show(initial?.revenue));
  const [planPct, setPlanPct] = useState(show(initial?.planPct));
  const [roas, setRoas] = useState(show(initial?.roas));
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await apiCall("/api/weekly-stats", "PUT", {
      weekKey,
      revenue: num(revenue),
      planPct: num(planPct),
      roas: num(roas),
      note: note.trim() || null,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Lỗi không rõ");
      return;
    }
    setSavedAt(
      new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }

  const inputCls =
    "w-24 rounded-md border border-hair bg-panel-2 px-2 py-1 text-sm text-right text-text tabular-nums placeholder:text-faint focus:border-gold/60 focus:outline-none";

  return (
    <div className="app-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="font-semibold text-dim">
          📊 Chỉ số {weekLabel}
        </span>
        <label className="flex items-center gap-1.5 text-muted">
          Doanh thu lũy kế (tr)
          <input
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            inputMode="decimal"
            className={inputCls}
          />
        </label>
        <label className="flex items-center gap-1.5 text-muted">
          % khoán
          <input
            value={planPct}
            onChange={(e) => setPlanPct(e.target.value)}
            inputMode="decimal"
            className={`${inputCls} w-16`}
          />
        </label>
        <label className="flex items-center gap-1.5 text-muted">
          ROAS
          <input
            value={roas}
            onChange={(e) => setRoas(e.target.value)}
            inputMode="decimal"
            className={`${inputCls} w-16`}
          />
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú ngắn…"
          className="min-w-32 flex-1 rounded-md border border-hair bg-panel-2 px-2 py-1 text-sm text-text placeholder:text-faint focus:border-gold/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-gold/[0.14] px-3 py-1 text-xs font-semibold text-gold transition-colors hover:bg-gold/25 disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
        {savedAt && !error && (
          <span className="text-xs text-good">✓ Đã lưu {savedAt}</span>
        )}
        {error && <span className="text-xs text-critical">{error}</span>}
      </div>
    </div>
  );
}
