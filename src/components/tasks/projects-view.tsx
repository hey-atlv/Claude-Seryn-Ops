"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TEAM_LABELS, type Team } from "@/lib/constants";
import type { SubItemRow, TaskRow } from "@/lib/task-row";
import { formatVN } from "@/lib/timezone";
import { StatusBadge } from "./status-badge";
import { createTask, deleteTask, patchTask } from "./task-api";

// D5 — Dự án dài hơi: mỗi Project một card, sub-items là các giai đoạn
// theo dòng thời gian, tick checkbox để chốt xong giai đoạn.
// Thêm/xóa giai đoạn ngay trên card — không cần tạo lại Project từ template.

interface ProjectsViewProps {
  projects: TaskRow[];
  onEdit: (task: TaskRow) => void;
  onChanged: () => void;
}

function SubItemLine({
  sub,
  onChanged,
}: {
  sub: SubItemRow;
  onChanged: () => void;
}) {
  const done = sub.status === "DONE";
  async function toggle() {
    const res = await patchTask(sub.id, { status: done ? "TODO" : "DONE" });
    if (!res.success) {
      window.alert(`Cập nhật giai đoạn thất bại: ${res.error}`);
      return;
    }
    onChanged();
  }
  async function remove() {
    if (!window.confirm(`Xóa giai đoạn "${sub.title}"? Không hoàn tác được.`)) return;
    const res = await deleteTask(sub.id);
    if (!res.success) {
      window.alert(`Xóa giai đoạn thất bại: ${res.error}`);
      return;
    }
    onChanged();
  }
  return (
    <li className="group flex items-center gap-2 py-1">
      <input
        type="checkbox"
        checked={done}
        onChange={toggle}
        className="h-4 w-4 accent-emerald-600"
      />
      <span
        className={`flex-1 text-sm ${
          done
            ? "text-zinc-400 line-through"
            : "text-zinc-800 dark:text-zinc-200"
        }`}
      >
        {sub.title}
      </span>
      <StatusBadge status={sub.status} />
      <span className="w-14 text-right text-xs text-zinc-400">
        {sub.deadline ? formatVN(new Date(sub.deadline), "dd/MM") : ""}
      </span>
      <button
        type="button"
        onClick={remove}
        aria-label={`Xóa giai đoạn ${sub.title}`}
        title="Xóa giai đoạn"
        className="rounded p-0.5 text-zinc-300 opacity-0 transition-opacity hover:text-critical focus-visible:opacity-100 group-hover:opacity-100 dark:text-zinc-600"
      >
        <Trash2 size={14} strokeWidth={2.25} aria-hidden />
      </button>
    </li>
  );
}

function AddSubItem({
  project,
  onChanged,
}: {
  project: TaskRow;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    // Giai đoạn con kế thừa team của Project — nhất quán với luồng tạo từ template
    const res = await createTask({
      title: trimmed,
      team: project.team,
      parentId: project.id,
    });
    setSaving(false);
    if (!res.success) {
      window.alert(`Thêm giai đoạn thất bại: ${res.error}`);
      return;
    }
    setTitle("");
    onChanged();
  }

  return (
    <form onSubmit={submit} className="mt-2 flex items-center gap-1.5">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thêm giai đoạn mới…"
        className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none dark:border-zinc-700 dark:text-zinc-200"
      />
      <button
        type="submit"
        disabled={saving || title.trim().length === 0}
        className="flex items-center gap-1 rounded-md bg-brand-700 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-40"
      >
        <Plus size={13} strokeWidth={2.5} aria-hidden />
        {saving ? "Đang thêm…" : "Thêm"}
      </button>
    </form>
  );
}

export function ProjectsView({ projects, onEdit, onChanged }: ProjectsViewProps) {
  if (projects.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
        Chưa có dự án dài hơi — tạo bằng template &quot;Dự án mới (khung
        Project)&quot; trong form tạo task
      </p>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {projects.map((p) => {
        const total = p.subItems.length;
        const doneCount = p.subItems.filter((s) => s.status === "DONE").length;
        const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
        return (
          <article
            key={p.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <header className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onEdit(p)}
                className="text-left font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
              >
                🗂 {p.title}
              </button>
              <StatusBadge status={p.status} />
            </header>
            <p className="mt-1 text-xs text-zinc-500">
              {TEAM_LABELS[p.team as Team] ?? p.team}
              {p.leaderName && ` · ${p.leaderName}`}
              {p.deadline &&
                ` · 📅 ${formatVN(new Date(p.deadline), "dd/MM/yyyy")}`}
            </p>

            {total > 0 ? (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    {doneCount}/{total} giai đoạn
                  </span>
                </div>
                <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {p.subItems.map((s) => (
                    <SubItemLine key={s.id} sub={s} onChanged={onChanged} />
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-xs text-zinc-400">
                Chưa có giai đoạn con — thêm bên dưới để theo dõi tiến độ
              </p>
            )}
            <AddSubItem project={p} onChanged={onChanged} />
          </article>
        );
      })}
    </div>
  );
}
