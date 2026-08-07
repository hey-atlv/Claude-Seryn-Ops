"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Play, Plus, Power, Trash2, X } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import {
  CATEGORY_BY_TEAM,
  ISO_WEEKDAYS,
  ISO_WEEKDAY_LABELS,
  MONTH_DAY_MAX,
  MONTH_DAY_MIN,
  PRIORITIES,
  PRIORITY_LABELS,
  RECURRING_SCHEDULES,
  RECURRING_SCHEDULE_LABELS,
  RECURRING_TARGETS,
  RECURRING_TARGET_LABELS,
  REPORT_TYPES,
  REVENUE_IMPACTS,
  REVENUE_IMPACT_LABELS,
  TASK_TYPES,
  TEAMS,
  TEAM_LABELS,
  type Team,
} from "@/lib/constants";
import type { RecurringTemplateRow } from "@/lib/recurring-page";
import { formatVN } from "@/lib/timezone";
import { useConfirm } from "@/components/ui/confirm-dialog";

// Cài đặt › Việc định kỳ — thêm/sửa/tắt template sinh Task & Báo cáo theo kỳ.

// Nhãn của defaults.type — ý nghĩa khác nhau theo loại đích nên để riêng ở đây
// thay vì gộp vào constants dùng chung.
const TASK_TYPE_LABELS: Record<string, string> = {
  TASK: "Công việc lẻ",
  PROJECT: "Dự án (có sub-item)",
};
const REPORT_TYPE_LABELS: Record<string, string> = {
  WEEKLY: "Báo cáo tuần",
  MONTHLY: "Báo cáo tháng",
};

const INPUT =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const LABEL = "mb-1 block text-xs text-zinc-500 dark:text-zinc-400";

interface FormState {
  name: string;
  targetDb: string;
  scheduleType: string;
  weekday: string; // 1..7 (ISO) — giữ riêng để đổi qua lại tuần/tháng không mất lựa chọn
  monthDay: string; // 1..31
  taskType: string;
  reportType: string;
  team: string;
  category: string;
  priority: string;
  revenueImpact: string;
  deadlineDay: string; // MONTHLY: ngày deadline riêng (rỗng = trùng ngày sinh)
  note: string; // ghi chú điền sẵn cho bản ghi sinh ra
  subItemsText: string; // mỗi dòng 1 sub-item
  active: boolean;
}

function toFormState(row: RecurringTemplateRow | null): FormState {
  const d = row?.defaults ?? {};
  const isReport = row?.targetDb === "REPORT";
  return {
    name: row?.name ?? "",
    targetDb: row?.targetDb ?? "TASK",
    scheduleType: row?.scheduleType ?? "MONTHLY",
    weekday: String(row?.scheduleType === "WEEKLY" ? (row.scheduleDay ?? 1) : 1),
    monthDay: String(row?.scheduleType === "MONTHLY" ? (row.scheduleDay ?? 1) : 1),
    taskType: (!isReport && d.type) || "TASK",
    reportType: (isReport && d.type) || "WEEKLY",
    team: d.team ?? "",
    category: d.category ?? "",
    priority: d.priority ?? "NORMAL",
    revenueImpact: d.revenueImpact ?? "MEDIUM",
    deadlineDay: d.deadlineDay ?? "",
    note: d.note ?? "",
    subItemsText: (row?.subItems ?? []).join("\n"),
    active: row?.active ?? true,
  };
}

function scheduleDayOf(form: FormState): number | null {
  if (form.scheduleType === "WEEKLY") return Number(form.weekday);
  if (form.scheduleType === "MONTHLY") return Number(form.monthDay);
  return null;
}

function TemplateForm({
  row,
  onCancel,
  onSaved,
}: {
  row: RecurringTemplateRow | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(row));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReport = form.targetDb === "REPORT";
  const categories = CATEGORY_BY_TEAM[form.team as Team] ?? [];

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Đổi team thì nhóm việc cũ không còn thuộc danh mục hợp lệ nữa → bỏ chọn
  function setTeam(team: string) {
    setForm((f) => ({
      ...f,
      team,
      category: (CATEGORY_BY_TEAM[team as Team] ?? []).includes(f.category)
        ? f.category
        : "",
    }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      targetDb: form.targetDb,
      scheduleType: form.scheduleType,
      scheduleDay: scheduleDayOf(form),
      defaults: isReport
        ? { type: form.reportType }
        : {
            type: form.taskType,
            team: form.team || undefined,
            category: form.category || undefined,
            priority: form.priority,
            revenueImpact: form.revenueImpact,
            deadlineDay:
              form.scheduleType === "MONTHLY"
                ? form.deadlineDay.trim() || undefined
                : undefined,
            note: form.note.trim() || undefined,
          },
      subItems: isReport
        ? []
        : form.subItemsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
      active: form.active,
    };

    const res = row
      ? await apiCall(`/api/recurring/${row.id}`, "PATCH", payload)
      : await apiCall("/api/recurring", "POST", payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Lưu thất bại");
      return;
    }
    onSaved();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-brand-300 bg-zinc-50 p-4 dark:border-brand-500 dark:bg-zinc-950"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
          {row ? `Sửa: ${row.name}` : "Template mới"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng"
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X size={16} strokeWidth={2.25} aria-hidden />
        </button>
      </div>

      <label className="block">
        <span className={LABEL}>Tên template</span>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Báo cáo ROAS tuần — Digital"
          className={INPUT}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Sinh ra</span>
          <select
            value={form.targetDb}
            onChange={(e) => set("targetDb", e.target.value)}
            className={INPUT}
          >
            {RECURRING_TARGETS.map((t) => (
              <option key={t} value={t}>
                {RECURRING_TARGET_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>Lịch lặp</span>
          <select
            value={form.scheduleType}
            onChange={(e) => set("scheduleType", e.target.value)}
            className={INPUT}
          >
            {RECURRING_SCHEDULES.map((s) => (
              <option key={s} value={s}>
                {RECURRING_SCHEDULE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        {form.scheduleType === "WEEKLY" && (
          <label className="block">
            <span className={LABEL}>Sinh vào thứ</span>
            <select
              value={form.weekday}
              onChange={(e) => set("weekday", e.target.value)}
              className={INPUT}
            >
              {ISO_WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {ISO_WEEKDAY_LABELS[d]}
                </option>
              ))}
            </select>
          </label>
        )}
        {form.scheduleType === "MONTHLY" && (
          <label className="block">
            <span className={LABEL}>Sinh vào ngày</span>
            <input
              type="number"
              min={MONTH_DAY_MIN}
              max={MONTH_DAY_MAX}
              value={form.monthDay}
              onChange={(e) => set("monthDay", e.target.value)}
              className={INPUT}
            />
          </label>
        )}

        {isReport ? (
          <label className="block">
            <span className={LABEL}>Loại báo cáo</span>
            <select
              value={form.reportType}
              onChange={(e) => set("reportType", e.target.value)}
              className={INPUT}
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REPORT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="block">
              <span className={LABEL}>Loại việc</span>
              <select
                value={form.taskType}
                onChange={(e) => set("taskType", e.target.value)}
                className={INPUT}
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TASK_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={LABEL}>Team nhận việc</span>
              <select
                value={form.team}
                onChange={(e) => setTeam(e.target.value)}
                className={INPUT}
              >
                <option value="">— Chưa chọn —</option>
                {TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {TEAM_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={LABEL}>Nhóm việc</span>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                disabled={!form.team}
                className={`${INPUT} disabled:opacity-50`}
              >
                <option value="">— Không đặt —</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={LABEL}>Mức ưu tiên</span>
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
            </label>

            <label className="block">
              <span className={LABEL}>Ảnh hưởng doanh thu</span>
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
            </label>

            {form.scheduleType === "MONTHLY" && (
              <label className="block">
                <span className={LABEL}>
                  Deadline vào ngày (bỏ trống = trùng ngày sinh; 31 = cuối tháng)
                </span>
                <input
                  type="number"
                  min={MONTH_DAY_MIN}
                  max={MONTH_DAY_MAX}
                  value={form.deadlineDay}
                  onChange={(e) => set("deadlineDay", e.target.value)}
                  placeholder="31"
                  className={INPUT}
                />
              </label>
            )}
          </>
        )}
      </div>

      {!isReport && (
        <label className="block">
          <span className={LABEL}>Ghi chú điền sẵn cho task sinh ra</span>
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Checklist đầu việc chi tiết, đầu mối phối hợp…"
            className={`${INPUT} text-xs`}
          />
        </label>
      )}

      {!isReport && (
        <label className="block">
          <span className={LABEL}>
            Sub-item (mỗi dòng 1 mục — dùng cho khung Dự án)
          </span>
          <textarea
            rows={3}
            value={form.subItemsText}
            onChange={(e) => set("subItemsText", e.target.value)}
            placeholder={"Kế hoạch\nTriển khai\nReview"}
            className={`${INPUT} font-mono text-xs`}
          />
        </label>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set("active", e.target.checked)}
          className="h-4 w-4 rounded border-zinc-400"
        />
        Đang bật (tắt thì ngừng sinh, template vẫn giữ để dùng lại)
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || form.name.trim().length === 0}
          className="rounded-md bg-brand-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {saving ? "Đang lưu…" : row ? "Lưu thay đổi" : "Tạo template"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 px-3.5 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

function TemplateItem({
  row,
  onEdit,
  onToggle,
  onDelete,
  busy,
}: {
  row: RecurringTemplateRow;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const d = row.defaults;
  const facts = [
    row.targetDb === "REPORT"
      ? REPORT_TYPE_LABELS[d.type ?? ""]
      : TASK_TYPE_LABELS[d.type ?? "TASK"],
    d.team ? TEAM_LABELS[d.team as Team] : null,
    d.category,
  ].filter(Boolean);

  return (
    <li
      className={`space-y-1.5 rounded-lg border p-3 ${
        row.active
          ? "border-zinc-200 dark:border-zinc-800"
          : "border-dashed border-zinc-300 opacity-60 dark:border-zinc-700"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {RECURRING_TARGET_LABELS[row.targetDb as "TASK" | "REPORT"] ?? row.targetDb}
        </span>
        <p className="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100">
          {row.name}
        </p>
        {!row.active && (
          <span className="text-xs font-semibold text-zinc-500">Đã tắt</span>
        )}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {row.scheduleText}
        {facts.length > 0 && ` · ${facts.join(" · ")}`}
      </p>

      <p className="text-xs text-zinc-500">
        {row.nextRunAt ? (
          <>
            Kỳ {row.currentPeriodLabel}:{" "}
            {row.generatedThisPeriod ? "✓ đã sinh" : "chưa tới hạn"} · Ngày hẹn kế
            tiếp {formatVN(new Date(row.nextRunAt), "dd/MM/yyyy")}
          </>
        ) : (
          <>Không tự sinh — dùng ở nút &quot;Tạo từ template&quot; trang Công việc</>
        )}
        {row.generatedCount > 0 && ` · Đã sinh ${row.generatedCount} lần`}
        {row.lastGeneratedAt &&
          ` (gần nhất ${formatVN(new Date(row.lastGeneratedAt), "dd/MM/yyyy")})`}
      </p>

      <div className="flex gap-1 pt-0.5">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Pencil size={13} strokeWidth={2.25} aria-hidden />
          Sửa
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Power size={13} strokeWidth={2.25} aria-hidden />
          {row.active ? "Tắt" : "Bật"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-critical/15 hover:text-critical disabled:opacity-50"
        >
          <Trash2 size={13} strokeWidth={2.25} aria-hidden />
          Xóa
        </button>
      </div>
    </li>
  );
}

interface RecurringClientProps {
  templates: RecurringTemplateRow[];
}

export function RecurringClient({ templates }: RecurringClientProps) {
  const router = useRouter();
  // null = đóng · "new" = đang tạo · id = đang sửa template đó
  const [editing, setEditing] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  function closeAndRefresh() {
    setEditing(null);
    router.refresh();
  }

  async function runNow() {
    setRunning(true);
    setMsg(null);
    const res = await apiCall<{ created: number }>("/api/recurring/run", "POST");
    setRunning(false);
    if (!res.success) {
      setMsg(`Sinh thất bại: ${res.error}`);
      return;
    }
    const created = res.data?.created ?? 0;
    setMsg(
      created > 0
        ? `Đã sinh ${created} bản ghi cho kỳ hiện tại.`
        : "Không có gì để sinh — các kỳ đến hạn đều đã có bản ghi.",
    );
    router.refresh();
  }

  async function toggleActive(row: RecurringTemplateRow) {
    setBusyId(row.id);
    setMsg(null);
    const res = await apiCall(`/api/recurring/${row.id}`, "PATCH", {
      active: !row.active,
    });
    setBusyId(null);
    if (!res.success) {
      setMsg(`Cập nhật thất bại: ${res.error}`);
      return;
    }
    router.refresh();
  }

  async function remove(row: RecurringTemplateRow) {
    const ok = await confirm(`Xóa template "${row.name}"?`, {
      detail:
        "Công việc/báo cáo đã sinh trước đó vẫn giữ nguyên. Nếu chỉ muốn tạm dừng, hãy dùng nút Tắt.",
      confirmLabel: "Xóa template",
    });
    if (!ok) return;
    setBusyId(row.id);
    const res = await apiCall(`/api/recurring/${row.id}`, "DELETE");
    setBusyId(null);
    if (!res.success) {
      setMsg(`Xóa thất bại: ${res.error}`);
      return;
    }
    router.refresh();
  }

  const editingRow =
    editing && editing !== "new"
      ? (templates.find((t) => t.id === editing) ?? null)
      : null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden />
          Thêm template
        </button>
        <button
          type="button"
          onClick={runNow}
          disabled={running}
          className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3.5 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Play size={15} strokeWidth={2.25} aria-hidden />
          {running ? "Đang sinh…" : "Sinh ngay"}
        </button>
      </div>

      {msg && <p className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>}

      {editing && (
        <TemplateForm
          key={editing}
          row={editingRow}
          onCancel={() => setEditing(null)}
          onSaved={closeAndRefresh}
        />
      )}

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Chưa có template nào. Thêm một cái để việc lặp lại tự sinh mỗi kỳ.
        </p>
      ) : (
        <ul className="space-y-2">
          {templates.map((row) => (
            <TemplateItem
              key={row.id}
              row={row}
              busy={busyId === row.id}
              onEdit={() => setEditing(row.id)}
              onToggle={() => toggleActive(row)}
              onDelete={() => remove(row)}
            />
          ))}
        </ul>
      )}

      {confirmDialog}
    </section>
  );
}
