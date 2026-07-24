"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Inbox as InboxIcon, X } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import type { LeaderOption } from "@/lib/task-row";
import { formatVN } from "@/lib/timezone";
import { TaskForm } from "@/components/tasks/task-form";

// H1/H2/H3 — Inbox: quick capture text, upload file, review từng item →
// convert 1 chạm sang task (mở lại TaskForm đã có, preview-confirm trước khi ghi)
// hoặc bỏ qua.

export interface InboxItemRow {
  id: string;
  source: string;
  rawText: string | null;
  fileUrl: string | null;
  fileType: string | null;
  parsedDraft: string | null;
  createdAt: string;
}

interface InboxClientProps {
  initialItems: InboxItemRow[];
  leaders: LeaderOption[];
}

const SOURCE_LABELS: Record<string, string> = {
  TELEGRAM: "Telegram",
  UPLOAD: "File",
  PASTE: "Dán nhanh",
  GSHEET: "Google Sheets",
  GCAL: "Google Calendar",
};

const CARD =
  "rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900";
const BTN_PRIMARY =
  "rounded-md bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50";
const BTN_GHOST =
  "rounded-md px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800";

interface ParsedDraft {
  title?: string;
  deadline?: string | null;
  team?: string | null;
  category?: string | null;
  priority?: string | null;
}

function parseDraft(raw: string | null): ParsedDraft {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ParsedDraft;
  } catch {
    return {};
  }
}

export function InboxClient({ initialItems, leaders }: InboxClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captureText, setCaptureText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertItem, setConvertItem] = useState<InboxItemRow | null>(null);

  async function submitCapture() {
    if (!captureText.trim()) return;
    setBusy(true);
    setError(null);
    const res = await apiCall("/api/inbox/capture", "POST", {
      text: captureText,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Thêm vào Inbox thất bại");
      return;
    }
    setCaptureText("");
    router.refresh();
  }

  async function uploadFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/inbox/upload", { method: "POST", body: form });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) {
        setError(json.error ?? "Upload thất bại");
      } else {
        router.refresh();
      }
    } catch {
      setError("Không kết nối được máy chủ — kiểm tra dev server");
    }
    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function dismiss(item: InboxItemRow) {
    setBusy(true);
    const res = await apiCall(`/api/inbox/${item.id}`, "PATCH", {
      status: "DISMISSED",
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "Bỏ qua thất bại");
      return;
    }
    router.refresh();
  }

  async function onTaskCreated() {
    if (!convertItem) return;
    await apiCall(`/api/inbox/${convertItem.id}`, "PATCH", {
      status: "CONVERTED",
    });
    setConvertItem(null);
    router.refresh();
  }

  const draft = convertItem ? parseDraft(convertItem.parsedDraft) : null;

  return (
    <div className="space-y-4">
      <div className={`${CARD} space-y-3`}>
        <textarea
          value={captureText}
          onChange={(e) => setCaptureText(e.target.value)}
          rows={3}
          placeholder={"Dán nhanh — mỗi dòng 1 việc, có thể kèm ngày (vd 20/08/2026)"}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-400">
            <FileUp size={14} aria-hidden />
            Upload xlsx/csv/docx/pdf/ảnh
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.docx,.pdf,.jpg,.jpeg,.png,.webp,.gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={submitCapture}
            disabled={busy || !captureText.trim()}
            className={BTN_PRIMARY}
          >
            Thêm vào Inbox
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          File Excel có cấu trúc cột rõ ràng? Dùng trang{" "}
          <a href="/import" className="underline hover:text-brand-700">
            Import
          </a>{" "}
          thay vì đây.
        </p>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
      </div>

      {initialItems.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          <InboxIcon size={22} aria-hidden />
          Inbox sạch — chưa có việc nào chờ review
        </div>
      )}

      <ul className="space-y-2">
        {initialItems.map((item) => (
          <li key={item.id} className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-500">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">
                    {SOURCE_LABELS[item.source] ?? item.source}
                  </span>
                  {item.fileType && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">
                      {item.fileType}
                    </span>
                  )}
                  <span>{formatVN(new Date(item.createdAt), "dd/MM HH:mm")}</span>
                </div>
                {item.rawText ? (
                  <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                    {item.rawText}
                  </p>
                ) : (
                  <p className="text-sm italic text-zinc-500">
                    (không trích được text — mở file để xem)
                  </p>
                )}
                {item.fileUrl && (
                  <a
                    href={`/api/inbox/${item.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-brand-700 underline hover:text-brand-800 dark:text-brand-400"
                  >
                    Mở file gốc ↗
                  </a>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setConvertItem(item)}
                  disabled={busy}
                  className={BTN_PRIMARY}
                >
                  ➡️ Chuyển thành task
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(item)}
                  disabled={busy}
                  className={`${BTN_GHOST} flex items-center justify-center gap-1`}
                >
                  <X size={12} aria-hidden />
                  Bỏ qua
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {convertItem && (
        <TaskForm
          task={null}
          leaders={leaders}
          templates={[]}
          initial={{
            title: draft?.title ?? convertItem.rawText ?? "",
            note: convertItem.rawText ?? "",
            deadlineDate: draft?.deadline
              ? formatVN(new Date(draft.deadline), "yyyy-MM-dd")
              : "",
            team: draft?.team ?? undefined,
            category: draft?.category ?? undefined,
            priority: draft?.priority ?? undefined,
          }}
          onClose={() => setConvertItem(null)}
          onSaved={onTaskCreated}
        />
      )}
    </div>
  );
}
