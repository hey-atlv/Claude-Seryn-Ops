"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { apiCall } from "@/lib/api-client";
import {
  buildDrafts,
  guessMapping,
  parseCsv,
  IMPORT_FIELDS,
  IMPORT_FIELD_LABELS,
  type ImportField,
  type LeaderRef,
} from "@/lib/import-core";
import { PreviewTable } from "./preview-table";

// G1 — Wizard import CSV từ Google Sheets cũ: dán/upload → mapping cột →
// preview từng dòng (lỗi/cảnh báo) → import các dòng hợp lệ qua /api/import.

interface ImportClientProps {
  leaders: LeaderRef[];
}

type Step = "input" | "mapping" | "done";

const BOX =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";
const SELECT =
  "rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const BTN_PRIMARY =
  "rounded-md bg-brand-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50";
const BTN_GHOST =
  "rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800";

export function ImportClient({ leaders }: ImportClientProps) {
  const [step, setStep] = useState<Step>("input");
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<(ImportField | null)[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  const results = useMemo(
    () => (rows.length > 1 ? buildDrafts(rows, mapping, leaders) : []),
    [rows, mapping, leaders],
  );
  const validDrafts = results.filter((r) => r.draft !== null);
  const errorCount = results.length - validDrafts.length;

  function loadCsv(text: string) {
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setError("CSV cần ít nhất 1 dòng header + 1 dòng dữ liệu");
      return;
    }
    setError(null);
    setRows(parsed);
    setMapping(guessMapping(parsed[0]));
    setStep("mapping");
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadCsv(String(reader.result ?? ""));
    reader.onerror = () => setError("Không đọc được file — thử dán nội dung");
    reader.readAsText(file, "utf-8");
  }

  function setColumnField(colIndex: number, field: ImportField | "") {
    setMapping((m) =>
      m.map((cur, i) => {
        if (i === colIndex) return field === "" ? null : field;
        // 1 field chỉ gán 1 cột — cột khác đang giữ field này thì nhả ra
        return cur === field ? null : cur;
      }),
    );
  }

  async function runImport() {
    setImporting(true);
    setError(null);
    const res = await apiCall<{ created: number }>("/api/import", "POST", {
      tasks: validDrafts.map((r) => r.draft),
    });
    setImporting(false);
    if (!res.success) {
      setError(res.error ?? "Import thất bại");
      return;
    }
    setCreatedCount(res.data?.created ?? validDrafts.length);
    setStep("done");
  }

  function reset() {
    setStep("input");
    setCsvText("");
    setRows([]);
    setMapping([]);
    setError(null);
    setCreatedCount(0);
  }

  if (step === "done") {
    return (
      <div className={`${BOX} space-y-3 text-center`}>
        <p className="text-3xl">✅</p>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Đã tạo {createdCount} task từ CSV
        </p>
        <div className="flex justify-center gap-2">
          <a href="/tasks" className={BTN_PRIMARY}>
            Mở trang Công việc
          </a>
          <button onClick={reset} className={BTN_GHOST}>
            Import file khác
          </button>
        </div>
      </div>
    );
  }

  if (step === "input") {
    return (
      <div className={`${BOX} space-y-3`}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Từ Google Sheets cũ: <b>File → Download → CSV</b>, rồi upload file
          hoặc copy toàn bộ bảng dán vào ô dưới (dòng đầu là tên cột).
        </p>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={onFile}
          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-800 dark:text-zinc-400"
        />
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={10}
          placeholder={
            "Tên việc,Team,Trạng thái,Deadline,Ưu tiên\nTối ưu ads tháng 8,Digital,Đang làm,20/08/2026,Cao"
          }
          className="w-full rounded-md border border-zinc-300 bg-white p-2.5 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <button
            onClick={() => loadCsv(csvText)}
            disabled={!csvText.trim()}
            className={BTN_PRIMARY}
          >
            Tiếp tục → Mapping cột
          </button>
        </div>
      </div>
    );
  }

  // step === "mapping": chọn field cho từng cột + preview kết quả ngay bên dưới
  const usedFields = new Set(mapping.filter((f): f is ImportField => !!f));
  const missingRequired = (["title", "team"] as const).filter(
    (f) => !usedFields.has(f),
  );

  return (
    <div className="space-y-4">
      <div className={`${BOX} space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
            2. Ghép cột CSV → field task ({rows.length - 1} dòng dữ liệu)
          </h2>
          <button onClick={reset} className={BTN_GHOST}>
            ← Chọn file khác
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows[0].map((header, i) => (
            <label
              key={i}
              className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm dark:border-zinc-800"
            >
              <span
                className="truncate font-medium text-zinc-700 dark:text-zinc-300"
                title={header}
              >
                {header || `(cột ${i + 1})`}
              </span>
              <select
                value={mapping[i] ?? ""}
                onChange={(e) =>
                  setColumnField(i, e.target.value as ImportField | "")
                }
                className={SELECT}
              >
                <option value="">— bỏ qua —</option>
                {IMPORT_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {IMPORT_FIELD_LABELS[f]}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {missingRequired.length > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Chưa ghép cột bắt buộc:{" "}
            {missingRequired.map((f) => IMPORT_FIELD_LABELS[f]).join(", ")}
          </p>
        )}
      </div>

      {missingRequired.length === 0 && (
        <div className={`${BOX} space-y-3`}>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
            3. Kiểm tra & import
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ✅ {validDrafts.length} dòng hợp lệ
            {errorCount > 0 && (
              <>
                {" · "}
                <span className="text-red-600 dark:text-red-400">
                  🔴 {errorCount} dòng lỗi sẽ bị bỏ qua
                </span>
              </>
            )}
            {" — "}dòng ⚠️ vẫn được import với giá trị mặc định.
          </p>
          <PreviewTable results={results} rows={rows} leaders={leaders} />
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <button
              onClick={runImport}
              disabled={importing || validDrafts.length === 0}
              className={BTN_PRIMARY}
            >
              {importing
                ? "Đang import…"
                : `Import ${validDrafts.length} task`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
