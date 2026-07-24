"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
  REPORT_TYPES,
} from "@/lib/constants";
import { apiCall } from "@/lib/api-client";
import type { ReportRow } from "@/lib/report-row";
import { formatVN } from "@/lib/timezone";
import { useConfirm } from "@/components/ui/confirm-dialog";

// E2 — Modal tạo/sửa báo cáo ban lãnh đạo: checklist 5 mục + trạng thái 4 bước
// + feedback lãnh đạo.

export const REPORT_TYPE_LABELS: Record<string, string> = {
  WEEKLY: "Tuần",
  MONTHLY: "Tháng",
};

export const CHECKLIST_ITEMS = [
  { key: "hasRevenue", label: "Doanh thu" },
  { key: "hasRoas", label: "Tiến độ ROAS" },
  { key: "hasData", label: "Tiến độ data" },
  { key: "hasProjects", label: "Tiến độ dự án" },
  { key: "hasRisks", label: "Rủi ro/tồn đọng" },
] as const;
type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];

interface ReportFormProps {
  report: ReportRow | null; // null = tạo mới
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  title: string;
  type: string;
  dueDateInput: string;
  status: string;
  checklist: Record<ChecklistKey, boolean>;
  reportLink: string;
  boardFeedback: string;
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

function initialState(r: ReportRow | null): FormState {
  return {
    title: r?.title ?? "",
    type: r?.type ?? "WEEKLY",
    dueDateInput: r?.dueDate ? formatVN(new Date(r.dueDate), "yyyy-MM-dd") : "",
    status: r?.status ?? "NOT_STARTED",
    checklist: {
      hasRevenue: r?.hasRevenue ?? false,
      hasRoas: r?.hasRoas ?? false,
      hasData: r?.hasData ?? false,
      hasProjects: r?.hasProjects ?? false,
      hasRisks: r?.hasRisks ?? false,
    },
    reportLink: r?.reportLink ?? "",
    boardFeedback: r?.boardFeedback ?? "",
  };
}

const dueIso = (d: string) =>
  d ? new Date(`${d}T23:59:59+07:00`).toISOString() : null;

export function ReportForm({ report, onClose, onSaved }: ReportFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(report));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      type: form.type,
      dueDate: dueIso(form.dueDateInput),
      status: form.status,
      ...form.checklist,
      reportLink: form.reportLink.trim() || null,
      boardFeedback: form.boardFeedback.trim() || null,
    };
    const res = report
      ? await apiCall(`/api/reports/${report.id}`, "PATCH", payload)
      : await apiCall("/api/reports", "POST", payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Lỗi không rõ");
      return;
    }
    onSaved();
  }

  async function remove() {
    if (!report) return;
    const ok = await confirm(`Xóa báo cáo "${report.title}"?`, {
      detail: "Không hoàn tác được.",
      confirmLabel: "Xóa báo cáo",
    });
    if (!ok) return;
    setSaving(true);
    const res = await apiCall(`/api/reports/${report.id}`, "DELETE");
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Xóa thất bại");
      return;
    }
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {report ? "✏️ Sửa báo cáo" : "➕ Tạo báo cáo"}
        </h2>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <Field label="Tên báo cáo *">
          <input
            required
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={INPUT}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Loại">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className={INPUT}
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REPORT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hạn nộp (giờ VN)">
            <input
              type="date"
              value={form.dueDateInput}
              onChange={(e) => set("dueDateInput", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Trạng thái">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className={INPUT}
            >
              {REPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REPORT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-zinc-500">
            Checklist 5 mục ban lãnh đạo luôn quan tâm
          </legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {CHECKLIST_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                <input
                  type="checkbox"
                  checked={form.checklist[item.key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      checklist: { ...f.checklist, [item.key]: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 accent-emerald-600"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Link báo cáo">
          <input
            value={form.reportLink}
            onChange={(e) => set("reportLink", e.target.value)}
            placeholder="https://…"
            className={INPUT}
          />
        </Field>

        <Field label="Ghi chú từ lãnh đạo (feedback)">
          <textarea
            value={form.boardFeedback}
            onChange={(e) => set("boardFeedback", e.target.value)}
            rows={2}
            className={INPUT}
          />
        </Field>

        <div className="flex items-center justify-between pt-1">
          {report ? (
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="rounded-md px-3 py-1.5 text-sm text-critical hover:bg-critical/15 disabled:opacity-50"
            >
              🗑 Xóa
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
              {saving ? "Đang lưu…" : report ? "Lưu thay đổi" : "Tạo báo cáo"}
            </button>
          </div>
        </div>
      </form>
      {confirmDialog}
    </div>
  );
}
