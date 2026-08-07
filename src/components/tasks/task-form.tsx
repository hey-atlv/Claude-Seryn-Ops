"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  CATEGORY_BY_TEAM,
  PRIORITIES,
  PRIORITY_LABELS,
  REVENUE_IMPACTS,
  REVENUE_IMPACT_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_TYPES,
  TEAM_LABELS,
  TEAM_TAGS,
  TEAMS,
  type Team,
} from "@/lib/constants";
import type { LeaderOption, TaskRow, TemplateOption } from "@/lib/task-row";
import { leaderLabel } from "@/lib/leader-core";
import { formatVN } from "@/lib/timezone";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { createTask, deleteTask, patchTask } from "./task-api";

// D8 — Modal tạo/sửa task: Nhóm việc lọc theo Team, nút "Tạo từ template"
// (RecurringTemplate targetDb=TASK), template Project sinh kèm sub-items.

interface TaskFormProps {
  task: TaskRow | null; // null = tạo mới
  leaders: LeaderOption[];
  templates: TemplateOption[];
  onClose: () => void;
  onSaved: () => void;
  // Prefill khi tạo mới từ nguồn khác (VD: convert Inbox item, gợi ý AI triage L3)
  // — bỏ qua khi task !== null. team/category/priority chỉ áp dụng nếu hợp lệ.
  initial?: {
    title?: string;
    note?: string;
    deadlineDate?: string;
    team?: string;
    category?: string;
    priority?: string;
  };
}

interface FormState {
  title: string;
  type: string;
  team: Team;
  leaderId: string;
  category: string;
  status: string;
  startDateDate: string; // "yyyy-MM-dd" theo lịch VN — mốc bắt đầu ở view Dòng thời gian
  deadlineDate: string; // "yyyy-MM-dd" theo lịch VN
  priority: string;
  revenueImpact: string;
  outputLink: string;
  note: string;
}

const INPUT =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function initialState(
  task: TaskRow | null,
  leaders: LeaderOption[],
  initial?: TaskFormProps["initial"],
): FormState {
  if (!task) {
    const team = (TEAMS as readonly string[]).includes(initial?.team ?? "")
      ? (initial!.team as Team)
      : TEAMS[0];
    const category =
      initial?.category && CATEGORY_BY_TEAM[team].includes(initial.category)
        ? initial.category
        : "";
    const priority = (PRIORITIES as readonly string[]).includes(initial?.priority ?? "")
      ? (initial!.priority as string)
      : "NORMAL";
    return {
      title: initial?.title ?? "",
      type: "TASK",
      team,
      leaderId: leaders.find((l) => l.team === team)?.id ?? "",
      category,
      status: "TODO",
      startDateDate: "",
      deadlineDate: initial?.deadlineDate ?? "",
      priority,
      revenueImpact: "MEDIUM",
      outputLink: "",
      note: initial?.note ?? "",
    };
  }
  return {
    title: task.title,
    type: task.type,
    team: task.team as Team,
    leaderId: task.leaderId ?? "",
    category: task.category ?? "",
    status: task.status,
    startDateDate: task.startDate
      ? formatVN(new Date(task.startDate), "yyyy-MM-dd")
      : "",
    deadlineDate: task.deadline
      ? formatVN(new Date(task.deadline), "yyyy-MM-dd")
      : "",
    priority: task.priority,
    revenueImpact: task.revenueImpact,
    outputLink: task.outputLink ?? "",
    note: task.note ?? "",
  };
}

// Deadline lưu cuối ngày theo giờ VN (23:59:59 +07) — khớp daysUntilVN và ô calendar
const deadlineIso = (d: string) =>
  d ? new Date(`${d}T23:59:59+07:00`).toISOString() : null;
// Ngày bắt đầu lưu đầu ngày VN (00:00 +07) — thanh Dòng thời gian phủ trọn ngày đó
const startIso = (d: string) =>
  d ? new Date(`${d}T00:00:00+07:00`).toISOString() : null;

export function TaskForm({
  task,
  leaders,
  templates,
  onClose,
  onSaved,
  initial,
}: TaskFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(task, leaders, initial));
  const [pendingSubItems, setPendingSubItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function changeTeam(team: Team) {
    // Đổi team → reset Nhóm việc + gán leader mặc định của team đó
    setForm((f) => ({
      ...f,
      team,
      category: "",
      leaderId: leaders.find((l) => l.team === team)?.id ?? "",
    }));
  }

  function applyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    try {
      const defs = JSON.parse(tpl.defaults) as Partial<
        Record<"title" | "type" | "team" | "category" | "priority" | "revenueImpact", string>
      >;
      setForm((f) => {
        const team = (defs.team as Team) ?? f.team;
        return {
          ...f,
          title: f.title.trim() || defs.title || tpl.name,
          type: defs.type ?? f.type,
          team,
          category: defs.category ?? (defs.team ? "" : f.category),
          priority: defs.priority ?? f.priority,
          revenueImpact: defs.revenueImpact ?? f.revenueImpact,
          leaderId: defs.team
            ? (leaders.find((l) => l.team === team)?.id ?? "")
            : f.leaderId,
        };
      });
      setPendingSubItems(
        tpl.subItemsTemplate ? (JSON.parse(tpl.subItemsTemplate) as string[]) : [],
      );
      setError(null);
    } catch {
      setError(`Template "${tpl.name}" có defaults không hợp lệ`);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    // Tên việc tự gắn tag team ở đầu — "[Digi] - …". Người dùng tự gõ tag
    // "[...]" riêng (vd [FB], [CMO]) thì tôn trọng, không chèn thêm.
    const rawTitle = form.title.trim();
    const autoTitle =
      rawTitle && !rawTitle.startsWith("[")
        ? `[${TEAM_TAGS[form.team]}] - ${rawTitle}`
        : rawTitle;
    const payload = {
      title: autoTitle,
      type: form.type,
      team: form.team,
      leaderId: form.leaderId || null,
      category: form.category || null,
      status: form.status,
      startDate: startIso(form.startDateDate),
      deadline: deadlineIso(form.deadlineDate),
      priority: form.priority,
      revenueImpact: form.revenueImpact,
      outputLink: form.outputLink.trim() || null,
      note: form.note.trim() || null,
    };
    const res = task
      ? await patchTask(task.id, payload)
      : await createTask(payload);
    if (!res.success) {
      setSaving(false);
      setError(res.error ?? "Lỗi không rõ");
      return;
    }
    // Template Project: tạo tiếp các giai đoạn con sau khi có id cha
    if (!task && pendingSubItems.length > 0) {
      const parent = res.data as { id: string };
      for (const title of pendingSubItems) {
        const sub = await createTask({
          title,
          team: form.team,
          parentId: parent.id,
        });
        if (!sub.success) {
          setSaving(false);
          setError(`Tạo giai đoạn "${title}" thất bại: ${sub.error}`);
          return;
        }
      }
    }
    setSaving(false);
    onSaved();
  }

  async function remove() {
    if (!task) return;
    const subCount = task.subItems?.length ?? 0;
    const ok = await confirm(`Xóa "${task.title}"?`, {
      detail:
        subCount > 0
          ? `Xóa kèm ${subCount} giai đoạn con. Không hoàn tác được.`
          : "Không hoàn tác được.",
      confirmLabel: "Xóa task",
    });
    if (!ok) return;
    setSaving(true);
    const res = await deleteTask(task.id);
    if (!res.success) {
      setSaving(false);
      setError(res.error ?? "Xóa thất bại");
      return;
    }
    onSaved();
  }

  const categories = CATEGORY_BY_TEAM[form.team] ?? [];
  const teamLeaders = leaders.filter((l) => l.team === form.team);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {task ? "✏️ Sửa task" : "➕ Tạo task mới"}
          </h2>
          {!task && templates.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && applyTemplate(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="">📋 Tạo từ template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {pendingSubItems.length > 0 && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            Sẽ tạo kèm {pendingSubItems.length} giai đoạn:{" "}
            {pendingSubItems.join(" · ")}{" "}
            <button
              type="button"
              onClick={() => setPendingSubItems([])}
              className="ml-1 underline"
            >
              bỏ
            </button>
          </p>
        )}

        <Field label="Tên việc *">
          <input
            required
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="VD: Tối ưu chiến dịch lead tháng 8"
            className={INPUT}
          />
          {form.title.trim().length > 0 && !form.title.trim().startsWith("[") && (
            <p className="mt-1 text-xs text-zinc-400">
              Sẽ lưu thành:{" "}
              <span className="font-medium text-zinc-500 dark:text-zinc-300">
                [{TEAM_TAGS[form.team]}] - {form.title.trim()}
              </span>
            </p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Loại">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className={INPUT}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "TASK" ? "Task" : "Project (dự án dài hơi)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Team *">
            <select
              value={form.team}
              onChange={(e) => changeTeam(e.target.value as Team)}
              className={INPUT}
            >
              {TEAMS.map((t) => (
                <option key={t} value={t}>
                  {TEAM_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Leader">
            <select
              value={form.leaderId}
              onChange={(e) => set("leaderId", e.target.value)}
              className={INPUT}
            >
              <option value="">— không gán —</option>
              {teamLeaders.map((l) => (
                <option key={l.id} value={l.id}>
                  {leaderLabel(l)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nhóm việc (theo team)">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={INPUT}
            >
              <option value="">— chưa phân nhóm —</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ưu tiên">
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
              className={INPUT}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ảnh hưởng doanh thu">
            <select
              value={form.revenueImpact}
              onChange={(e) => set("revenueImpact", e.target.value)}
              className={INPUT}
            >
              {REVENUE_IMPACTS.map((r) => (
                <option key={r} value={r}>
                  {REVENUE_IMPACT_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trạng thái">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className={INPUT}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ngày bắt đầu (giờ VN)">
            <input
              type="date"
              value={form.startDateDate}
              max={form.deadlineDate || undefined}
              onChange={(e) => set("startDateDate", e.target.value)}
              title="Để trống thì view Dòng thời gian lùi về ngày tạo task"
              className={INPUT}
            />
          </Field>
          <Field label="Deadline (giờ VN)">
            <input
              type="date"
              value={form.deadlineDate}
              min={form.startDateDate || undefined}
              onChange={(e) => set("deadlineDate", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Link output">
            <input
              value={form.outputLink}
              onChange={(e) => set("outputLink", e.target.value)}
              placeholder="https://…"
              className={INPUT}
            />
          </Field>
        </div>

        <Field label="Ghi chú">
          <textarea
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            rows={2}
            className={INPUT}
          />
        </Field>

        <div className="flex items-center justify-between pt-1">
          {task ? (
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="rounded-md px-3 py-1.5 text-sm text-critical hover:bg-critical/15 disabled:opacity-50"
            >
              🗑 Xóa task
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brand-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {saving ? "Đang lưu…" : task ? "Lưu thay đổi" : "Tạo task"}
            </button>
          </div>
        </div>
      </form>
      {confirmDialog}
    </div>
  );
}
