"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { apiCall } from "@/lib/api-client";
import { formatVN } from "@/lib/timezone";
import { useConfirm } from "@/components/ui/confirm-dialog";

// E3 — SOP & Templates: danh sách bên trái, editor markdown đơn giản bên phải
// (textarea + tab xem trước bằng react-markdown).

export interface SopRow {
  id: string;
  title: string;
  category: string | null;
  content: string;
  updatedAt: string;
}

interface SopClientProps {
  docs: SopRow[];
}

interface EditorState {
  id: string | null; // null = tạo mới
  title: string;
  category: string;
  content: string;
}

const INPUT =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

export function SopClient({ docs }: SopClientProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  function openDoc(doc: SopRow) {
    setEditor({
      id: doc.id,
      title: doc.title,
      category: doc.category ?? "",
      content: doc.content,
    });
    setPreview(true); // mở tài liệu có sẵn → xem trước; bấm Sửa để vào editor
    setError(null);
  }

  function openNew() {
    setEditor({ id: null, title: "", category: "", content: "" });
    setPreview(false);
    setError(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editor) return;
    setSaving(true);
    setError(null);
    const payload = {
      title: editor.title.trim(),
      category: editor.category.trim() || null,
      content: editor.content,
    };
    const res = editor.id
      ? await apiCall(`/api/sop/${editor.id}`, "PATCH", payload)
      : await apiCall<{ id: string }>("/api/sop", "POST", payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Lỗi không rõ");
      return;
    }
    if (!editor.id && res.data) {
      setEditor((ed) => (ed ? { ...ed, id: (res.data as { id: string }).id } : ed));
    }
    setPreview(true);
    router.refresh();
  }

  async function remove() {
    if (!editor?.id) return;
    const ok = await confirm(`Xóa tài liệu "${editor.title}"?`, {
      detail: "Không hoàn tác được.",
      confirmLabel: "Xóa tài liệu",
    });
    if (!ok) return;
    setSaving(true);
    const res = await apiCall(`/api/sop/${editor.id}`, "DELETE");
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Xóa thất bại");
      return;
    }
    setEditor(null);
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          📚 SOP &amp; Templates
        </h1>
        <button
          type="button"
          onClick={openNew}
          className="rounded-md bg-brand-700 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
        >
          ➕ Tài liệu mới
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <aside className="space-y-1">
          {docs.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400 dark:border-zinc-800">
              Chưa có tài liệu — bấm &quot;➕ Tài liệu mới&quot;
            </p>
          )}
          {docs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => openDoc(d)}
              className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                editor?.id === d.id
                  ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                {d.title}
              </span>
              <span className="mt-0.5 block text-[11px] text-zinc-400">
                {d.category ? `${d.category} · ` : ""}
                {formatVN(new Date(d.updatedAt), "dd/MM/yyyy")}
              </span>
            </button>
          ))}
        </aside>

        <section className="min-h-64 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {!editor ? (
            <p className="py-10 text-center text-sm text-zinc-400">
              Chọn tài liệu bên trái hoặc tạo mới
            </p>
          ) : (
            <form onSubmit={save} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPreview(false)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      !preview
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview(true)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      preview
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    👁 Xem
                  </button>
                </div>
                <div className="flex gap-2">
                  {editor.id && (
                    <button
                      type="button"
                      onClick={remove}
                      disabled={saving}
                      className="rounded-md px-2.5 py-1 text-xs text-critical hover:bg-critical/15 disabled:opacity-50"
                    >
                      🗑 Xóa
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-brand-700 px-3 py-1 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                  >
                    {saving ? "Đang lưu…" : "💾 Lưu"}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}

              {preview ? (
                <>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {editor.title || "(chưa có tiêu đề)"}
                  </h2>
                  <div className="sop-markdown text-sm leading-6 text-zinc-800 dark:text-zinc-200 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-500 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] dark:[&_code]:bg-zinc-800 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:font-semibold [&_hr]:my-3 [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_table]:my-2 [&_td]:border [&_td]:border-zinc-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-zinc-200 [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc">
                    <ReactMarkdown>{editor.content}</ReactMarkdown>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                    <input
                      required
                      value={editor.title}
                      onChange={(e) =>
                        setEditor((ed) =>
                          ed ? { ...ed, title: e.target.value } : ed,
                        )
                      }
                      placeholder="Tiêu đề tài liệu *"
                      className={INPUT}
                    />
                    <input
                      value={editor.category}
                      onChange={(e) =>
                        setEditor((ed) =>
                          ed ? { ...ed, category: e.target.value } : ed,
                        )
                      }
                      placeholder="Nhóm (SOP / Template…)"
                      className={INPUT}
                    />
                  </div>
                  <textarea
                    value={editor.content}
                    onChange={(e) =>
                      setEditor((ed) =>
                        ed ? { ...ed, content: e.target.value } : ed,
                      )
                    }
                    rows={18}
                    placeholder={"# Tiêu đề\n\nViết nội dung markdown ở đây…"}
                    className={`${INPUT} font-mono text-[13px] leading-5`}
                  />
                </>
              )}
            </form>
          )}
        </section>
      </div>
      {confirmDialog}
    </main>
  );
}
