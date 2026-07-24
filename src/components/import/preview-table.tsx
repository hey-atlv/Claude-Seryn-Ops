"use client";

import {
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TEAM_LABELS,
  type Priority,
  type TaskStatus,
  type Team,
} from "@/lib/constants";
import type { DraftResult, LeaderRef } from "@/lib/import-core";
import { formatVN } from "@/lib/timezone";

// Bảng preview kết quả parse CSV: dòng lỗi đỏ (bị bỏ qua), dòng cảnh báo vàng
// (vẫn import với mặc định), dòng sạch hiển thị giá trị đã chuyển sang hệ thống.

interface PreviewTableProps {
  results: DraftResult[];
  rows: string[][]; // rows[0] là header — dùng hiện giá trị gốc cho dòng lỗi
  leaders: LeaderRef[];
}

const TD = "px-2 py-1.5 align-top";

export function PreviewTable({ results, rows, leaders }: PreviewTableProps) {
  const leaderName = (id: string | null) =>
    leaders.find((l) => l.id === id)?.name ?? "—";

  return (
    <div className="max-h-96 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="sticky top-0 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <tr>
            <th className={TD}>#</th>
            <th className={TD}>Tên việc</th>
            <th className={TD}>Team</th>
            <th className={TD}>Leader</th>
            <th className={TD}>Trạng thái</th>
            <th className={TD}>Deadline</th>
            <th className={TD}>Ưu tiên</th>
            <th className={TD}>Lỗi / cảnh báo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 text-zinc-800 dark:divide-zinc-800 dark:text-zinc-200">
          {results.map((r) => {
            const hasError = r.draft === null;
            const rowClass = hasError
              ? "bg-red-50 dark:bg-red-950/30"
              : r.warnings.length > 0
                ? "bg-amber-50 dark:bg-amber-950/20"
                : "";
            const raw = rows[r.rowIndex + 1] ?? [];
            return (
              <tr key={r.rowIndex} className={rowClass}>
                <td className={`${TD} text-zinc-400`}>{r.rowIndex + 2}</td>
                <td className={`${TD} max-w-56 truncate font-medium`}>
                  {r.draft?.title ?? raw.join(" · ").slice(0, 60)}
                </td>
                <td className={TD}>
                  {r.draft ? TEAM_LABELS[r.draft.team as Team] : "—"}
                </td>
                <td className={TD}>
                  {r.draft ? leaderName(r.draft.leaderId) : "—"}
                </td>
                <td className={TD}>
                  {r.draft
                    ? TASK_STATUS_LABELS[r.draft.status as TaskStatus]
                    : "—"}
                </td>
                <td className={TD}>
                  {r.draft?.deadline
                    ? formatVN(new Date(r.draft.deadline), "dd/MM/yyyy")
                    : "—"}
                </td>
                <td className={TD}>
                  {r.draft
                    ? PRIORITY_LABELS[r.draft.priority as Priority]
                    : "—"}
                </td>
                <td className={`${TD} max-w-72`}>
                  {r.errors.map((e, i) => (
                    <p key={`e${i}`} className="text-red-600 dark:text-red-400">
                      🔴 {e}
                    </p>
                  ))}
                  {r.warnings.map((w, i) => (
                    <p
                      key={`w${i}`}
                      className="text-amber-600 dark:text-amber-400"
                    >
                      ⚠️ {w}
                    </p>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
