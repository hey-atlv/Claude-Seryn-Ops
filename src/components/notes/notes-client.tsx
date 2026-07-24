"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import { formatVN } from "@/lib/timezone";
import { useConfirm } from "@/components/ui/confirm-dialog";

// CRUD ghi chú cá nhân: quick-add ở trên, ghim nổi lên đầu, sửa inline.

export interface NoteRow {
  id: string;
  content: string;
  pinned: boolean;
  updatedAt: string; // ISO
}

interface NotesClientProps {
  initialNotes: NoteRow[];
}

const CARD =
  "rounded-lg border bg-white p-3 dark:bg-zinc-900 transition-colors";

export function NotesClient({ initialNotes }: NotesClientProps) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  async function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await action();
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Có lỗi — thử lại");
      return false;
    }
    router.refresh();
    return true;
  }

  async function addNote() {
    if (!draft.trim()) return;
    const ok = await run(() =>
      apiCall("/api/notes", "POST", { content: draft.trim() }),
    );
    if (ok) setDraft("");
  }

  async function saveEdit() {
    if (!editing) return;
    const ok = await run(() =>
      apiCall(`/api/notes/${editing.id}`, "PATCH", {
        content: editing.content.trim(),
      }),
    );
    if (ok) setEditing(null);
  }

  const togglePin = (n: NoteRow) =>
    run(() => apiCall(`/api/notes/${n.id}`, "PATCH", { pinned: !n.pinned }));

  const remove = async (n: NoteRow) => {
    const ok = await confirm("Xóa ghi chú này?", {
      detail: "Không hoàn tác được.",
      confirmLabel: "Xóa ghi chú",
    });
    if (!ok) return;
    await run(() => apiCall(`/api/notes/${n.id}`, "DELETE"));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote();
          }}
          rows={2}
          placeholder="Ghi nhanh… (Ctrl+Enter để lưu)"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={addNote}
          disabled={busy || !draft.trim()}
          className="flex items-center gap-1.5 self-start rounded-md bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden />
          Lưu
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {initialNotes.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Chưa có ghi chú nào — gõ vào ô trên rồi bấm Lưu
        </p>
      )}

      <ul className="space-y-2">
        {initialNotes.map((n) => (
          <li
            key={n.id}
            className={`${CARD} ${
              n.pinned
                ? "border-brand-400 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/20"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            {editing?.id === n.id ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={editing.content}
                  onChange={(e) =>
                    setEditing({ id: n.id, content: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-md px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={busy || !editing.content.trim()}
                    className="rounded-md bg-brand-700 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setEditing({ id: n.id, content: n.content })}
                  title="Bấm để sửa"
                  className="min-w-0 flex-1 whitespace-pre-wrap text-left text-sm text-zinc-800 dark:text-zinc-200"
                >
                  {n.content}
                  <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-500">
                    {formatVN(new Date(n.updatedAt), "dd/MM HH:mm")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => togglePin(n)}
                  title={n.pinned ? "Bỏ ghim" : "Ghim lên đầu"}
                  className={`rounded-md p-1.5 ${
                    n.pinned
                      ? "text-brand-700 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-950/50"
                      : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                  }`}
                >
                  {n.pinned ? (
                    <PinOff size={15} aria-hidden />
                  ) : (
                    <Pin size={15} aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(n)}
                  title="Xóa"
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-critical/15 hover:text-critical"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {confirmDialog}
    </div>
  );
}
