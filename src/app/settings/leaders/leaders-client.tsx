"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import {
  CHANNELS,
  CHANNEL_LABELS,
  TEAMS,
  TEAM_LABELS,
  TEAM_TAGS,
  type Channel,
  type Team,
} from "@/lib/constants";
import { useConfirm } from "@/components/ui/confirm-dialog";

// Cài đặt › Team & Leader — CRUD leader theo team (team là danh mục cố định).

interface LeaderRow {
  id: string;
  name: string;
  team: string;
  channel: string | null;
  chatHandle: string | null;
  taskCount: number;
}

const INPUT =
  "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const LABEL = "mb-1 block text-xs text-zinc-500 dark:text-zinc-400";

interface FormState {
  name: string;
  team: string;
  channel: string;
  chatHandle: string;
}

function LeaderForm({
  row,
  defaultTeam,
  onCancel,
  onSaved,
}: {
  row: LeaderRow | null;
  defaultTeam: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    name: row?.name ?? "",
    team: row?.team ?? defaultTeam,
    channel: row?.channel ?? "",
    chatHandle: row?.chatHandle ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      team: form.team,
      channel: form.team === "DIGITAL" && form.channel ? form.channel : null,
      chatHandle: form.chatHandle.trim() || null,
    };
    const res = row
      ? await apiCall(`/api/leaders/${row.id}`, "PATCH", payload)
      : await apiCall("/api/leaders", "POST", payload);
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
          {row ? `Sửa: ${row.name}` : "Leader mới"}
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

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Tên leader</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ất"
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className={LABEL}>Team</span>
          <select
            value={form.team}
            onChange={(e) => set("team", e.target.value)}
            className={INPUT}
          >
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {TEAM_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        {form.team === "DIGITAL" && (
          <label className="block">
            <span className={LABEL}>Kênh (riêng Digital)</span>
            <select
              value={form.channel}
              onChange={(e) => set("channel", e.target.value)}
              className={INPUT}
            >
              <option value="">— Không chia kênh —</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className={LABEL}>Telegram handle (tùy chọn)</span>
          <input
            type="text"
            value={form.chatHandle}
            onChange={(e) => set("chatHandle", e.target.value)}
            placeholder="@username"
            className={INPUT}
          />
        </label>
      </div>

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
          {saving ? "Đang lưu…" : row ? "Lưu thay đổi" : "Thêm leader"}
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

export function LeadersClient({ leaders }: { leaders: LeaderRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null); // "new" | id | null
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  function closeAndRefresh() {
    setEditing(null);
    router.refresh();
  }

  async function remove(row: LeaderRow) {
    const ok = await confirm(`Xóa leader "${row.name}"?`, {
      detail:
        row.taskCount > 0
          ? `Leader đang được gán ${row.taskCount} task — hệ thống sẽ chặn xóa.`
          : "Không hoàn tác được.",
      confirmLabel: "Xóa leader",
    });
    if (!ok) return;
    setBusyId(row.id);
    setMsg(null);
    const res = await apiCall(`/api/leaders/${row.id}`, "DELETE");
    setBusyId(null);
    if (!res.success) {
      setMsg(`Xóa thất bại: ${res.error}`);
      return;
    }
    router.refresh();
  }

  const editingRow =
    editing && editing !== "new"
      ? (leaders.find((l) => l.id === editing) ?? null)
      : null;

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setEditing("new")}
        className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        <Plus size={15} strokeWidth={2.5} aria-hidden />
        Thêm leader
      </button>

      {msg && <p className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>}

      {editing && (
        <LeaderForm
          key={editing}
          row={editingRow}
          defaultTeam={TEAMS[0]}
          onCancel={() => setEditing(null)}
          onSaved={closeAndRefresh}
        />
      )}

      {TEAMS.map((team) => {
        const teamLeaders = leaders.filter((l) => l.team === team);
        return (
          <div
            key={team}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                {TEAM_LABELS[team]}
              </h2>
              <span className="text-xs text-zinc-400">
                tag tên việc: [{TEAM_TAGS[team]}]
              </span>
            </div>
            {teamLeaders.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">Chưa có leader</p>
            ) : (
              <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
                {teamLeaders.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 py-1.5">
                    <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">
                      {l.name}
                      {l.channel && (
                        <span className="text-zinc-400">
                          {" "}
                          · {CHANNEL_LABELS[l.channel as Channel] ?? l.channel}
                        </span>
                      )}
                      {l.chatHandle && (
                        <span className="text-zinc-400"> · {l.chatHandle}</span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {l.taskCount} task
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditing(l.id)}
                      aria-label={`Sửa leader ${l.name}`}
                      className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                      <Pencil size={14} strokeWidth={2.25} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(l)}
                      disabled={busyId === l.id}
                      aria-label={`Xóa leader ${l.name}`}
                      className="rounded-md p-1 text-zinc-400 hover:bg-critical/15 hover:text-critical disabled:opacity-50"
                    >
                      <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {confirmDialog}
    </section>
  );
}
