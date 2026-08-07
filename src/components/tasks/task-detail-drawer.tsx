"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { TEAM_LABELS, type Team } from "@/lib/constants";
import type { TaskRow } from "@/lib/task-row";
import { formatVN } from "@/lib/timezone";
import { patchTask } from "./task-api";
import { TitleWithTag } from "./tag-chip";

// P1-a — Drawer chi tiết task: click task ở mọi view mở drawer này (xem trước,
// sửa sau) thay vì nhảy thẳng vào form. Update tiến độ nhanh ngay tại chỗ.

interface TaskDetailDrawerProps {
  task: TaskRow;
  onClose: () => void;
  onEdit: (task: TaskRow) => void;
  onChanged: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DONE: "Done",
};

const PRIORITY_LABELS: Record<string, string> = {
  NORMAL: "Bình thường",
  HIGH: "⬆ Cao",
  CRITICAL: "🔴 Critical",
};

const ALERT_LABELS: Record<string, { text: string; cls: string }> = {
  OVERDUE: { text: "🔴 Quá hạn", cls: "text-red-600 dark:text-red-400" },
  DUE_SOON: { text: "🟡 Sắp hạn", cls: "text-amber-600 dark:text-amber-400" },
  ON_TRACK: { text: "🟢 Đúng tiến độ", cls: "text-emerald-600 dark:text-emerald-400" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-28 shrink-0 text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-zinc-900 dark:text-zinc-100">
        {children}
      </span>
    </div>
  );
}

const fmtDay = (iso: string | null) =>
  iso ? formatVN(new Date(iso), "dd/MM/yyyy") : "—";

export function TaskDetailDrawer({
  task,
  onClose,
  onEdit,
  onChanged,
}: TaskDetailDrawerProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveUpdate() {
    if (!note.trim()) return;
    setSaving(true);
    setError(null);
    const res = await patchTask(task.id, {
      lastUpdateAt: new Date().toISOString(),
      lastUpdateNote: note.trim(),
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Lỗi không rõ");
      return;
    }
    setNote("");
    onChanged();
  }

  async function markDone() {
    setSaving(true);
    setError(null);
    const res = await patchTask(task.id, { status: "DONE" });
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Lỗi không rõ");
      return;
    }
    onChanged();
    onClose();
  }

  const alert = ALERT_LABELS[task.alertStatus];
  const subDone = task.subItems.filter((s) => s.status === "DONE").length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay — click ra ngoài để đóng */}
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl dark:bg-zinc-900">
        <header className="sticky top-0 flex items-start gap-2 border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-snug text-zinc-900 dark:text-zinc-50">
              {task.type === "PROJECT" ? "🗂 " : ""}
              <TitleWithTag title={task.title} />
            </h2>
            <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-zinc-500">
              <span>{TEAM_LABELS[task.team as Team] ?? task.team}</span>
              {task.leaderName && <span>· {task.leaderName}</span>}
              <span>· {STATUS_LABELS[task.status] ?? task.status}</span>
              {alert && task.status !== "DONE" && (
                <span className={alert.cls}>· {alert.text}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-4 p-4">
          <div className="space-y-1.5">
            <Row label="Ưu tiên">{PRIORITY_LABELS[task.priority] ?? task.priority}</Row>
            <Row label="Bắt đầu">{fmtDay(task.startDate)}</Row>
            <Row label="Deadline">
              <span className={task.alertStatus === "OVERDUE" ? "font-semibold text-red-600 dark:text-red-400" : undefined}>
                {fmtDay(task.deadline)}
              </span>
            </Row>
            {task.category && <Row label="Nhóm việc">{task.category}</Row>}
            {task.outputLink && (
              <Row label="Link output">
                <a
                  href={task.outputLink}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-brand-700 underline dark:text-brand-300"
                >
                  {task.outputLink}
                </a>
              </Row>
            )}
            {task.note && <Row label="Ghi chú">{task.note}</Row>}
          </div>

          {/* Update tiến độ — xem gần nhất + ghi mới ngay tại chỗ */}
          <section className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <p className="text-xs font-semibold uppercase text-zinc-500">
              Update tiến độ
            </p>
            {task.lastUpdateAt ? (
              <p className="mt-1.5 text-sm text-zinc-800 dark:text-zinc-200">
                <span className="text-xs text-zinc-500">
                  {formatVN(new Date(task.lastUpdateAt), "dd/MM HH:mm")} —{" "}
                </span>
                {task.lastUpdateNote ?? "(không có ghi chú)"}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-zinc-400">
                Chưa có update nào từ leader
              </p>
            )}
            {task.status !== "DONE" && (
              <div className="mt-2 flex gap-1.5">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveUpdate();
                  }}
                  placeholder="Tiến độ hiện tại…"
                  className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                <button
                  type="button"
                  onClick={saveUpdate}
                  disabled={saving || !note.trim()}
                  className="rounded-md bg-brand-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
            )}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </section>

          {/* Giai đoạn con của project */}
          {task.type === "PROJECT" && (
            <section className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Giai đoạn ({subDone}/{task.subItems.length})
              </p>
              {task.subItems.length === 0 ? (
                <p className="mt-1.5 text-sm text-zinc-400">
                  Chưa có giai đoạn con — thêm ở view Dự án
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {task.subItems.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
                    >
                      <span aria-hidden>
                        {s.status === "DONE" ? "✅" : "⬜"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      {s.deadline && (
                        <span className="text-xs text-zinc-500">
                          {formatVN(new Date(s.deadline), "dd/MM")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <footer className="sticky bottom-0 flex gap-2 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-brand-500 hover:text-brand-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-brand-300"
          >
            <Pencil size={13} aria-hidden />
            Sửa chi tiết
          </button>
          {task.status !== "DONE" && (
            <button
              type="button"
              onClick={markDone}
              disabled={saving}
              className="ml-auto rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              ✅ Chốt xong
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
