"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, RefreshCw, Unplug } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import { useConfirm } from "@/components/ui/confirm-dialog";

// UI kết nối Google Calendar — đúng 1 tài khoản, đúng 1 lịch phụ "Seryn Ops".

interface GoogleStatus {
  email: string;
  calendarId: string;
  lastSyncAt: string | null;
  lastError: string | null;
}

interface SettingsClientProps {
  google: GoogleStatus | null;
  connected: boolean;
  oauthError: string | null;
}

export function SettingsClient({ google, connected, oauthError }: SettingsClientProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  async function syncNow() {
    setSyncing(true);
    setMsg(null);
    const res = await apiCall("/api/google/sync", "POST");
    setSyncing(false);
    if (!res.success) {
      setMsg(`Đồng bộ thất bại: ${res.error}`);
      return;
    }
    setMsg("Đã đồng bộ xong.");
    router.refresh();
  }

  async function disconnect() {
    const ok = await confirm("Ngắt kết nối Google Calendar?", {
      detail: "Lịch/event đã tạo trên Google sẽ được giữ nguyên.",
      confirmLabel: "Ngắt kết nối",
    });
    if (!ok) return;
    setDisconnecting(true);
    await apiCall("/api/google/disconnect", "POST");
    setDisconnecting(false);
    router.refresh();
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center gap-2">
        <CalendarCheck size={18} strokeWidth={2.25} className="text-brand-700 dark:text-brand-400" aria-hidden />
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          Google Calendar
        </h2>
      </header>

      {connected && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          ✓ Kết nối thành công
        </p>
      )}
      {oauthError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          Lỗi kết nối: {oauthError}
        </p>
      )}

      {!google ? (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Chưa kết nối. Deadline Task/Project sẽ tự đồng bộ 2 chiều với 1 lịch
            phụ &quot;Seryn Ops&quot; trên Google Calendar của bạn.
          </p>
          <a
            href="/api/google/auth"
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-700 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
          >
            Kết nối Google Calendar
          </a>
        </>
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-zinc-500">Tài khoản</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{google.email}</dd>
            <dt className="text-zinc-500">Lịch</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">Seryn Ops</dd>
            <dt className="text-zinc-500">Đồng bộ gần nhất</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {google.lastSyncAt
                ? new Date(google.lastSyncAt).toLocaleString("vi-VN")
                : "Chưa có"}
            </dd>
          </dl>

          {google.lastError && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              ⚠ Lần gần nhất bị lỗi: {google.lastError}
            </p>
          )}
          {msg && <p className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={syncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              <RefreshCw size={14} strokeWidth={2.25} aria-hidden />
              {syncing ? "Đang đồng bộ…" : "Đồng bộ ngay"}
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:border-critical hover:text-critical disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
            >
              <Unplug size={14} strokeWidth={2.25} aria-hidden />
              Ngắt kết nối
            </button>
          </div>
        </>
      )}
      {confirmDialog}
    </section>
  );
}
