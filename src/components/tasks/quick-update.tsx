"use client";

import { useState } from "react";
import { patchTask } from "./task-api";

interface QuickUpdateProps {
  taskId: string;
  onDone: () => void;
}

// D8 — form update tiến độ nhanh "1 chạm": ghi lastUpdateAt = bây giờ + note
export function QuickUpdate({ taskId, onDone }: QuickUpdateProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await patchTask(taskId, {
      lastUpdateAt: new Date().toISOString(),
      lastUpdateNote: note.trim() || null,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Lỗi không rõ");
      return;
    }
    setOpen(false);
    setNote("");
    onDone();
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        title="Update tiến độ nhanh"
        onClick={() => setOpen((v) => !v)}
        className="rounded px-1.5 py-0.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        ⚡
      </button>
      {open && (
        <span className="absolute right-0 top-full z-20 mt-1 block w-64 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <input
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Tiến độ hiện tại…"
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {error && (
            <span className="mt-1 block text-xs text-red-600">{error}</span>
          )}
          <span className="mt-1.5 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-brand-700 px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {saving ? "Đang lưu…" : "Lưu update"}
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
