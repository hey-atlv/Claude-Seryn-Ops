"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DepRow } from "@/lib/dep-row";
import { DepBoard } from "./dep-board";
import { DepForm } from "./dep-form";
import { DepTable } from "./dep-table";

// Điều phối 3 views trang /dependencies (E1) + modal form.

const VIEWS = [
  { key: "board", label: "🧭 Theo Khối" },
  { key: "stale", label: "⏰ Chờ >3 ngày" },
  { key: "offProcess", label: "⚠️ Lệch quy trình" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

interface DepsClientProps {
  deps: DepRow[];
}

export function DepsClient({ deps }: DepsClientProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewKey>("board");
  const [form, setForm] = useState<{ open: boolean; dep: DepRow | null }>({
    open: false,
    dep: null,
  });

  const refresh = () => router.refresh();
  const openEdit = (dep: DepRow) => setForm({ open: true, dep });

  const stale = useMemo(() => deps.filter((d) => d.isStale), [deps]);
  const offProcess = useMemo(
    () => deps.filter((d) => d.offProcess && d.status !== "CLOSED"),
    [deps],
  );
  const counts: Partial<Record<ViewKey, number>> = {
    stale: stale.length,
    offProcess: offProcess.length,
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setForm({ open: true, dep: null })}
          className="rounded-md bg-brand-700 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
        >
          ➕ Tạo phối hợp
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px dark:border-zinc-800">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v.key
                ? "border-blue-600 text-blue-700 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {v.label}
            {counts[v.key] ? (
              <span className="ml-1 rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                {counts[v.key]}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {view === "board" && (
        <DepBoard deps={deps} onEdit={openEdit} onChanged={refresh} />
      )}
      {view === "stale" && (
        <DepTable
          deps={stale}
          empty="Không có phối hợp nào chờ phản hồi quá 3 ngày 🟢"
          onEdit={openEdit}
        />
      )}
      {view === "offProcess" && (
        <DepTable
          deps={offProcess}
          empty="Không có việc TC-KT nào lệch quy trình 👏"
          onEdit={openEdit}
        />
      )}

      {form.open && (
        <DepForm
          dep={form.dep}
          onClose={() => setForm({ open: false, dep: null })}
          onSaved={() => {
            setForm({ open: false, dep: null });
            refresh();
          }}
        />
      )}
    </div>
  );
}
