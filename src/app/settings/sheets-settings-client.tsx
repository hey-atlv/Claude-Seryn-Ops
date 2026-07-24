"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, Trash2 } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import { useConfirm } from "@/components/ui/confirm-dialog";

// J2 — danh sách sheet nguồn đọc vào Inbox (nhiều sheet/link cùng lúc), dùng
// chung tài khoản Google đã kết nối.

export interface SheetSourceRow {
  id: string;
  label: string | null;
  sheetId: string;
  sheetRange: string;
  lastSyncAt: string | null;
  lastError: string | null;
}

interface SheetsSettingsClientProps {
  sources: SheetSourceRow[];
}

export function SheetsSettingsClient({ sources }: SheetsSettingsClientProps) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [idInput, setIdInput] = useState("");
  const [rangeInput, setRangeInput] = useState("Sheet1");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  async function addSource() {
    setSaving(true);
    setMsg(null);
    const res = await apiCall("/api/google/sheets-config", "POST", {
      label: label.trim() || null,
      sheetId: idInput.trim(),
      sheetRange: rangeInput.trim() || "Sheet1",
    });
    setSaving(false);
    if (!res.success) {
      setMsg(`Thêm thất bại: ${res.error}`);
      return;
    }
    setLabel("");
    setIdInput("");
    setRangeInput("Sheet1");
    router.refresh();
  }

  async function removeSource(id: string) {
    const ok = await confirm("Xóa sheet nguồn này?", {
      detail: "Dòng đã nhập vào Inbox trước đó vẫn giữ nguyên.",
      confirmLabel: "Xóa sheet",
    });
    if (!ok) return;
    setDeletingId(id);
    await apiCall(`/api/google/sheets-config/${id}`, "DELETE");
    setDeletingId(null);
    router.refresh();
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center gap-2">
        <Sheet
          size={18}
          strokeWidth={2.25}
          className="text-brand-700 dark:text-brand-400"
          aria-hidden
        />
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          Google Sheets
        </h2>
      </header>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Dòng mới thêm vào cuối mỗi sheet (dòng đầu là header) sẽ tự động đưa vào
        tab Inbox của trang Ghi chú mỗi khi mở màn &quot;Hôm nay&quot;. Có thể thêm
        nhiều sheet/link cùng lúc.
      </p>

      {sources.length > 0 && (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                  {s.label || s.sheetId} <span className="text-zinc-400">· {s.sheetRange}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  {s.lastError
                    ? `⚠ Lỗi: ${s.lastError}`
                    : s.lastSyncAt
                      ? `Đồng bộ gần nhất ${new Date(s.lastSyncAt).toLocaleString("vi-VN")}`
                      : "Chưa đồng bộ"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeSource(s.id)}
                disabled={deletingId === s.id}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-critical/15 hover:text-critical disabled:opacity-50"
                aria-label="Xóa"
              >
                <Trash2 size={16} strokeWidth={2.25} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
            Tên gợi nhớ (tùy chọn)
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Facebook Ads"
            className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
            Spreadsheet ID
          </span>
          <input
            type="text"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            placeholder="1aBcD...xyz"
            className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
            Tên sheet
          </span>
          <input
            type="text"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            placeholder="Sheet1"
            className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 sm:w-32"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={addSource}
        disabled={saving || idInput.trim().length === 0}
        className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {saving ? "Đang thêm…" : "Thêm sheet"}
      </button>

      {msg && <p className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>}
      {confirmDialog}
    </section>
  );
}
