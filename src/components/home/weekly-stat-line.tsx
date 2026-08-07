"use client";

import { useState } from "react";
import { apiCall } from "@/lib/api-client";
import type { WeeklyStatPoint, WeeklyStatRow } from "@/lib/today-row";

// Khối ⑤ — 1 dòng chỉ số tuần nhập tay, upsert theo weekKey.
// P1-e: kèm sparkline xu hướng ≤8 tuần + delta so tuần trước cho từng chỉ số.

interface WeeklyStatLineProps {
  weekKey: string; // "2026-W30"
  weekLabel: string; // "tuần 30/2026"
  initial: WeeklyStatRow | null;
  history: WeeklyStatPoint[]; // cũ → mới
}

// Sparkline SVG thuần: nối các tuần có số liệu, chấm tròn ở điểm cuối
function Sparkline({ values }: { values: (number | null)[] }) {
  const pts = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return null;

  const W = 72;
  const H = 20;
  const PAD = 2;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const x = (i: number) =>
    PAD + ((W - 2 * PAD) * i) / Math.max(1, values.length - 1);
  const y = (v: number) => H - PAD - ((H - 2 * PAD) * (v - min)) / span;
  const path = pts.map((p) => `${x(p.i)},${y(p.v)}`).join(" ");
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const up = last.v >= prev.v;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden
      className="shrink-0"
    >
      <polyline
        points={path}
        fill="none"
        strokeWidth="1.5"
        className={up ? "stroke-emerald-500" : "stroke-red-400"}
      />
      <circle
        cx={x(last.i)}
        cy={y(last.v)}
        r="2"
        className={up ? "fill-emerald-500" : "fill-red-400"}
      />
    </svg>
  );
}

// Delta so tuần trước: "▲ +12" / "▼ -3" — chỉ hiện khi cả 2 tuần có số
function Delta({ values }: { values: (number | null)[] }) {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length < 2) return null;
  const d = nums[nums.length - 1] - nums[nums.length - 2];
  if (d === 0) return <span className="text-xs text-faint">＝</span>;
  const up = d > 0;
  return (
    <span
      className={`text-xs font-semibold ${up ? "text-good" : "text-critical"}`}
    >
      {up ? "▲" : "▼"} {up ? "+" : ""}
      {Math.round(d * 100) / 100}
    </span>
  );
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
  history,
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

      {/* P1-e — xu hướng ≤8 tuần: nhìn 5 giây biết đang lên hay xuống */}
      {history.length >= 2 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-hair-soft pt-2 text-xs text-muted">
          <span className="text-faint">
            Xu hướng {history.length} tuần
          </span>
          <span className="flex items-center gap-1.5">
            Doanh thu
            <Sparkline values={history.map((h) => h.revenue)} />
            <Delta values={history.map((h) => h.revenue)} />
          </span>
          <span className="flex items-center gap-1.5">
            % khoán
            <Sparkline values={history.map((h) => h.planPct)} />
            <Delta values={history.map((h) => h.planPct)} />
          </span>
          <span className="flex items-center gap-1.5">
            ROAS
            <Sparkline values={history.map((h) => h.roas)} />
            <Delta values={history.map((h) => h.roas)} />
          </span>
        </div>
      )}
    </div>
  );
}
