"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Send, Wand2, X } from "lucide-react";
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

  // P1-c — nháp tự sinh từ dữ liệu DB: modal xem + copy, checklist tự tick
  const [drafting, setDrafting] = useState<string | null>(null);
  const [draftModal, setDraftModal] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function makeDraft(r: ReportRow) {
    setDrafting(r.id);
    setSendMsg(null);
    const res = await apiCall<{ draft: string }>(
      `/api/reports/${r.id}/draft`,
      "POST",
    );
    setDrafting(null);
    if (!res.success || !res.data) {
      setSendMsg(`⚠️ ${res.error ?? "Không dựng được nháp"}`);
      return;
    }
    setCopied(false);
    setDraftModal({ title: r.title, text: res.data.draft });
    router.refresh(); // checklist/status vừa được tự cập nhật
  }

  async function copyDraft() {
    if (!draftModal) return;
    try {
      await navigator.clipboard.writeText(draftModal.text);
      setCopied(true);
    } catch {
      setCopied(false);
      window.alert("Không copy được — hãy bôi đen và copy thủ công");
    }
  }

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
                        <button
                          type="button"
                          onClick={() => makeDraft(r)}
                          disabled={drafting === r.id}
                          title="Điền tự động từ dữ liệu"
                          className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:border-brand-500 hover:text-brand-800 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
                        >
                          <Wand2 size={14} strokeWidth={2.25} aria-hidden />
                        </button>
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

      {draftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setDraftModal(null)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl dark:bg-zinc-900">
            <header className="flex items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
              <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                🪄 Nháp: {draftModal.title}
              </h3>
              <button
                type="button"
                onClick={copyDraft}
                className="rounded-md bg-brand-700 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-800"
              >
                {copied ? "✓ Đã copy" : "Copy markdown"}
              </button>
              <button
                type="button"
                onClick={() => setDraftModal(null)}
                title="Đóng"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={15} aria-hidden />
              </button>
            </header>
            <textarea
              readOnly
              value={draftModal.text}
              className="min-h-72 flex-1 resize-none bg-transparent p-3 font-mono text-xs text-zinc-800 focus:outline-none dark:text-zinc-200"
            />
            <p className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
              Checklist đã tự tick theo dữ liệu — dán nháp vào Google Docs, sửa
              rồi gắn link vào cột Link.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
