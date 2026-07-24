"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  COOPERATION_BY_PARTNER,
  DEPENDENCY_STATUSES,
  DEPENDENCY_STATUS_LABELS,
  DIRECTIONS,
  DIRECTION_LABELS,
  PARTNER_LABELS,
  PARTNERS,
  TEAM_LABELS,
  TEAMS,
  type Partner,
} from "@/lib/constants";
import { apiCall } from "@/lib/api-client";
import type { DepRow } from "@/lib/dep-row";
import { formatVN } from "@/lib/timezone";
import { useConfirm } from "@/components/ui/confirm-dialog";

// Modal tạo/sửa phối hợp liên phòng (DB2) — loại phối hợp lọc theo khối,
// TC-KT "Việc phát sinh" bắt buộc SLA (server enforce, hiện lỗi inline).

interface DepFormProps {
  dep: DepRow | null; // null = tạo mới
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  title: string;
  partner: Partner;
  cooperationType: string;
  direction: string;
  contactPerson: string;
  mktTeam: string;
  status: string;
  followsProcess: boolean;
  slaDateInput: string; // "yyyy-MM-dd"
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

function initialState(dep: DepRow | null): FormState {
  if (!dep) {
    return {
      title: "",
      partner: PARTNERS[0],
      cooperationType: "",
      direction: "TWO_WAY",
      contactPerson: "",
      mktTeam: "",
      status: "WAITING",
      followsProcess: true,
      slaDateInput: "",
      note: "",
    };
  }
  return {
    title: dep.title,
    partner: dep.partner as Partner,
    cooperationType: dep.cooperationType ?? "",
    direction: dep.direction,
    contactPerson: dep.contactPerson ?? "",
    mktTeam: dep.mktTeam ?? "",
    status: dep.status,
    followsProcess: dep.followsProcess,
    slaDateInput: dep.slaDate
      ? formatVN(new Date(dep.slaDate), "yyyy-MM-dd")
      : "",
    note: dep.note ?? "",
  };
}

// SLA lưu cuối ngày giờ VN — nhất quán với deadline của task
const slaIso = (d: string) =>
  d ? new Date(`${d}T23:59:59+07:00`).toISOString() : null;

export function DepForm({ dep, onClose, onSaved }: DepFormProps) {
  const [form, setForm] = useState<FormState>(() => initialState(dep));
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
      partner: form.partner,
      cooperationType: form.cooperationType || null,
      direction: form.direction,
      contactPerson: form.contactPerson.trim() || null,
      mktTeam: form.mktTeam || null,
      status: form.status,
      followsProcess: form.followsProcess,
      slaDate: slaIso(form.slaDateInput),
      note: form.note.trim() || null,
    };
    const res = dep
      ? await apiCall(`/api/dependencies/${dep.id}`, "PATCH", payload)
      : await apiCall("/api/dependencies", "POST", payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Lỗi không rõ");
      return;
    }
    onSaved();
  }

  async function remove() {
    if (!dep) return;
    const ok = await confirm(`Xóa phối hợp "${dep.title}"?`, {
      detail: "Không hoàn tác được.",
      confirmLabel: "Xóa phối hợp",
    });
    if (!ok) return;
    setSaving(true);
    const res = await apiCall(`/api/dependencies/${dep.id}`, "DELETE");
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Xóa thất bại");
      return;
    }
    onSaved();
  }

  const cooperationOptions = COOPERATION_BY_PARTNER[form.partner] ?? [];

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
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {dep ? "✏️ Sửa phối hợp" : "➕ Tạo phối hợp liên phòng"}
        </h2>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <Field label="Nội dung phối hợp *">
          <input
            required
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="VD: Đề nghị TC-KT duyệt ngân sách event tháng 8"
            className={INPUT}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Khối *">
            <select
              value={form.partner}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  partner: e.target.value as Partner,
                  cooperationType: "",
                }))
              }
              className={INPUT}
            >
              {PARTNERS.map((p) => (
                <option key={p} value={p}>
                  {PARTNER_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Loại phối hợp (theo khối)">
            <select
              value={form.cooperationType}
              onChange={(e) => set("cooperationType", e.target.value)}
              className={INPUT}
            >
              <option value="">— chưa phân loại —</option>
              {cooperationOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chiều">
            <select
              value={form.direction}
              onChange={(e) => set("direction", e.target.value)}
              className={INPUT}
            >
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {DIRECTION_LABELS[d]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Người đầu mối phía khối">
            <input
              value={form.contactPerson}
              onChange={(e) => set("contactPerson", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Team MKT liên quan">
            <select
              value={form.mktTeam}
              onChange={(e) => set("mktTeam", e.target.value)}
              className={INPUT}
            >
              <option value="">— không —</option>
              {TEAMS.map((t) => (
                <option key={t} value={t}>
                  {TEAM_LABELS[t]}
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
              {DEPENDENCY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {DEPENDENCY_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="SLA / Ngày cần kết quả (giờ VN)">
            <input
              type="date"
              value={form.slaDateInput}
              onChange={(e) => set("slaDateInput", e.target.value)}
              className={INPUT}
            />
          </Field>
          <label className="flex items-end gap-2 pb-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.followsProcess}
              onChange={(e) => set("followsProcess", e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            Đúng quy trình
          </label>
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
          {dep ? (
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
              {saving ? "Đang lưu…" : dep ? "Lưu thay đổi" : "Tạo phối hợp"}
            </button>
          </div>
        </div>
      </form>
      {confirmDialog}
    </div>
  );
}
