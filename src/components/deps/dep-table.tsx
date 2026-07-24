"use client";

import {
  PARTNER_LABELS,
  TEAM_LABELS,
  type Partner,
  type Team,
} from "@/lib/constants";
import type { DepRow } from "@/lib/dep-row";
import { formatVN } from "@/lib/timezone";
import { DepStatusBadge } from "./dep-badge";

// Bảng dùng cho 2 view lọc: Chờ phản hồi >3 ngày · Lệch quy trình (E1b/E1c)

interface DepTableProps {
  deps: DepRow[];
  empty: string;
  onEdit: (dep: DepRow) => void;
}

export function DepTable({ deps, empty, onEdit }: DepTableProps) {
  if (deps.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800">
            <th className="px-3 py-2.5">Nội dung</th>
            <th className="px-3 py-2.5">Khối</th>
            <th className="px-3 py-2.5">Loại phối hợp</th>
            <th className="px-3 py-2.5">Đầu mối</th>
            <th className="px-3 py-2.5">Team MKT</th>
            <th className="px-3 py-2.5 text-right">Chờ (ngày)</th>
            <th className="px-3 py-2.5">SLA</th>
            <th className="px-3 py-2.5">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {deps.map((d) => (
            <tr
              key={d.id}
              className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800/50 ${
                d.isStale ? "bg-red-50 dark:bg-red-950/30" : ""
              }`}
            >
              <td className="max-w-xs px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                <button
                  type="button"
                  onClick={() => onEdit(d)}
                  className="text-left hover:underline"
                >
                  {d.title}
                </button>
                {d.offProcess && (
                  <span className="ml-1 text-xs text-orange-600">⚠️</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {PARTNER_LABELS[d.partner as Partner] ?? d.partner}
              </td>
              <td className="max-w-[12rem] px-3 py-2.5 text-zinc-500">
                {d.cooperationType ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {d.contactPerson ?? "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {d.mktTeam ? (TEAM_LABELS[d.mktTeam as Team] ?? d.mktTeam) : "—"}
              </td>
              <td
                className={`px-3 py-2.5 text-right font-mono font-semibold ${
                  d.isStale ? "text-red-600" : ""
                }`}
              >
                {d.status === "WAITING" ? d.waitingDays : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                {d.slaDate ? formatVN(new Date(d.slaDate), "dd/MM/yyyy") : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <DepStatusBadge status={d.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
