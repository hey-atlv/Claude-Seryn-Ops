"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Send } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import {
  REPORT_STATUS_LABELS,
  type ReportStatus,
} from "@/lib/constants";
import type { ReportRow } from "@/lib/report-row";
import { formatVN } from "@/lib/timezone";
import {
  CHECKLIST_ITEMS,
  REPORT_TYPE_LABELS,
  ReportForm,
} from "./report-form";

// E2 — Danh sách báo cáo ban lãnh đạo + form checklist.

const STATUS_STYLES: Record<ReportStatus, string> = {
  NOT_STARTED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  GATHERING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  DRAFTING: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  SUBMITTED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

interface ReportsClientProps {
  reports: ReportRow[];
}

export function ReportsClient({ reports }: ReportsClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<{ open: boolean; report: ReportRow | null }>(
    { open: false, report: null },
  );
  const [sending, setSending] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  async function sendTelegram(reportId: string) {
    setSending(reportId);
    setSendMsg(null);
    const res = await apiCall("/api/export/telegram", "POST", {
      type: "report",
      id: reportId,
    });
    setSending(null);
    setSendMsg(res.success ? "✅ Đã gửi qua Telegram" : `⚠️ ${res.error}`);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setForm({ open: true, report: null })}
          className="rounded-md bg-brand-700 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
        >
          ➕ Tạo báo cáo
        </button>
      </header>

      {sendMsg && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{sendMsg}</p>
      )}

      {reports.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
          Chưa có báo cáo nào — báo cáo tuần/tháng sẽ tự sinh theo lịch
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <th className="px-3 py-2.5">Tên báo cáo</th>
                <th className="px-3 py-2.5">Loại</th>
                <th className="px-3 py-2.5">Hạn nộp</th>
                <th className="px-3 py-2.5">Trạng thái</th>
                <th className="px-3 py-2.5">Checklist</th>
                <th className="px-3 py-2.5">Link</th>
                <th className="px-3 py-2.5">Feedback lãnh đạo</th>
                <th className="px-3 py-2.5">Xuất</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const done = CHECKLIST_ITEMS.filter((i) => r[i.key]).length;
                return (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/50"
                  >
                    <td className="max-w-xs px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                      <button
                        type="button"
                        onClick={() => setForm({ open: true, report: r })}
                        className="text-left hover:underline"
                      >
                        {r.title}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {REPORT_TYPE_LABELS[r.type] ?? r.type}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {r.dueDate
                        ? formatVN(new Date(r.dueDate), "dd/MM/yyyy")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[r.status as ReportStatus] ??
                          STATUS_STYLES.NOT_STARTED
                        }`}
                      >
                        {REPORT_STATUS_LABELS[r.status as ReportStatus] ??
                          r.status}
                      </span>
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-2.5 font-mono text-xs"
                      title={CHECKLIST_ITEMS.map(
                        (i) => `${r[i.key] ? "✓" : "✗"} ${i.label}`,
                      ).join(" · ")}
                    >
                      <span
                        className={
                          done === 5
                            ? "font-semibold text-emerald-600"
                            : "text-zinc-500"
                        }
                      >
                        {done}/5 ✓
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.reportLink ? (
                        <a
                          href={r.reportLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Mở 🔗
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-[16rem] truncate px-3 py-2.5 text-zinc-500">
                      {r.boardFeedback ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/export/pdf?type=report&id=${r.id}`}
                          title="Xuất PDF"
                          className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:border-brand-500 hover:text-brand-800 dark:border-zinc-700 dark:text-zinc-400"
                        >
                          <FileDown size={14} strokeWidth={2.25} aria-hidden />
                        </a>
                        <button
                          type="button"
                          onClick={() => sendTelegram(r.id)}
                          disabled={sending === r.id}
                          title="Gửi qua Telegram"
                          className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:border-brand-500 hover:text-brand-800 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
                        >
                          <Send size={14} strokeWidth={2.25} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form.open && (
        <ReportForm
          report={form.report}
          onClose={() => setForm({ open: false, report: null })}
          onSaved={() => {
            setForm({ open: false, report: null });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
