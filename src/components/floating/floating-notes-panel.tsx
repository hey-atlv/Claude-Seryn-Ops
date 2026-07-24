"use client";

import { useEffect, useState } from "react";
import { Loader2, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import { formatVN } from "@/lib/timezone";
import type { NoteRow } from "@/components/notes/notes-client";
import { useConfirm } from "@/components/ui/confirm-dialog";

// Widget nổi ghi chú nhanh: tự fetch/CRUD riêng (không qua router.refresh vì
// widget này sống ngoài cây trang hiện tại, có thể mở ở bất kỳ route nào).

export function FloatingNotesPanel() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiCall<NoteRow[]>("/api/notes");
      if (!cancelled && res.success && res.data) setNotes(res.data);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function sortNotes(list: NoteRow[]): NoteRow[] {
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  async function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await action();
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Có lỗi — thử lại");
      return false;
    }
    return true;
  }

  async function addNote() {
    const content = draft.trim();
    if (!content) return;
    const res = await apiCall<NoteRow>("/api/notes", "POST", { content });
    setBusy(false);
    if (res.success && res.data) {
      setNotes((prev) => sortNotes([res.data as NoteRow, ...prev]));
      setDraft("");
    } else {
      setError(res.error ?? "Có lỗi — thử lại");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const id = editing.id;
    const content = editing.content.trim();
    const ok = await run(() => apiCall(`/api/notes/${id}`, "PATCH", { content }));
    if (ok) {
      setNotes((prev) =>
        sortNotes(prev.map((n) => (n.id === id ? { ...n, content } : n))),
      );
      setEditing(null);
    }
  }

  async function togglePin(n: NoteRow) {
    const ok = await run(() =>
      apiCall(`/api/notes/${n.id}`, "PATCH", { pinned: !n.pinned }),
    );
    if (ok) {
      setNotes((prev) =>
        sortNotes(
          prev.map((x) => (x.id === n.id ? { ...x, pinned: !n.pinned } : x)),
        ),
      );
    }
  }

  async function remove(n: NoteRow) {
    const confirmed = await confirm("Xóa ghi chú này?", {
      detail: "Không hoàn tác được.",
      confirmLabel: "Xóa ghi chú",
    });
    if (!confirmed) return;
    const ok = await run(() => apiCall(`/api/notes/${n.id}`, "DELETE"));
    if (ok) setNotes((prev) => prev.filter((x) => x.id !== n.id));
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <div className="flex gap-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote();
          }}
          rows={2}
          placeholder="Ghi nhanh… (Ctrl+Enter để lưu)"
          className="flex-1 resize-none rounded-md border border-hair bg-panel-2 px-2.5 py-1.5 text-xs text-text placeholder:text-faint focus:border-gold/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={addNote}
          disabled={busy || !draft.trim()}
          className="flex shrink-0 items-center gap-1 self-start rounded-md bg-gold/[0.14] px-2.5 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/25 disabled:opacity-50"
        >
          <Plus size={13} strokeWidth={2.5} aria-hidden />
          Lưu
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-critical/[0.12] px-2.5 py-1.5 text-xs text-critical">
          {error}
        </p>
      )}

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {loading && (
          <p className="flex items-center gap-1.5 py-4 text-xs text-muted">
            <Loader2 size={13} className="animate-spin" aria-hidden /> Đang tải...
          </p>
        )}

        {!loading && notes.length === 0 && (
          <p className="rounded-lg border border-dashed border-hair px-3 py-6 text-center text-xs text-faint">
            Chưa có ghi chú nào
          </p>
        )}

        {notes.map((n) => (
          <div
            key={n.id}
            className={`rounded-lg border p-2 text-xs ${
              n.pinned
                ? "border-gold/40 bg-gold/[0.06]"
                : "border-hair-soft bg-panel-2"
            }`}
          >
            {editing?.id === n.id ? (
              <div className="space-y-1.5">
                <textarea
                  autoFocus
                  value={editing.content}
                  onChange={(e) => setEditing({ id: n.id, content: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-hair bg-panel-2 px-2 py-1 text-xs text-text focus:border-gold/60 focus:outline-none"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-md px-2 py-0.5 text-[11px] text-muted hover:bg-panel-3 hover:text-text"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={busy || !editing.content.trim()}
                    className="rounded-md bg-gold/[0.14] px-2.5 py-0.5 text-[11px] font-semibold text-gold hover:bg-gold/25 disabled:opacity-50"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing({ id: n.id, content: n.content })}
                  title="Bấm để sửa"
                  className="min-w-0 flex-1 whitespace-pre-wrap text-left text-dim"
                >
                  {n.content}
                  <span className="mt-0.5 block text-[10px] text-faint">
                    {formatVN(new Date(n.updatedAt), "dd/MM HH:mm")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => togglePin(n)}
                  title={n.pinned ? "Bỏ ghim" : "Ghim lên đầu"}
                  className={`shrink-0 rounded-md p-1 ${
                    n.pinned
                      ? "text-gold hover:bg-gold/15"
                      : "text-faint hover:bg-panel-3 hover:text-text"
                  }`}
                >
                  {n.pinned ? <PinOff size={13} aria-hidden /> : <Pin size={13} aria-hidden />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(n)}
                  title="Xóa"
                  className="shrink-0 rounded-md p-1 text-faint hover:bg-critical/[0.12] hover:text-critical"
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {confirmDialog}
    </div>
  );
}
