"use client";

import {
  DIRECTION_LABELS,
  PARTNER_LABELS,
  PARTNERS,
  TEAM_LABELS,
  type Direction,
  type Team,
} from "@/lib/constants";
import type { DepRow } from "@/lib/dep-row";
import { formatVN } from "@/lib/timezone";
import { apiCall } from "@/lib/api-client";
import { DepStatusBadge } from "./dep-badge";

// E1a — Board theo Khối: 3 cột TC-KT / CEC / Sale.

interface DepBoardProps {
  deps: DepRow[];
  onEdit: (dep: DepRow) => void;
  onChanged: () => void;
  onCreate: (partner: string) => void;
}

function DepCard({
  dep,
  onEdit,
  onChanged,
}: {
  dep: DepRow;
  onEdit: (dep: DepRow) => void;
  onChanged: () => void;
}) {
  async function close() {
    const res = await apiCall(`/api/dependencies/${dep.id}`, "PATCH", {
      status: "CLOSED",
    });
    if (!res.success) {
      window.alert(`Chốt thất bại: ${res.error}`);
      return;
    }
    onChanged();
  }
  return (
    <div
      className={`rounded-md border p-2 shadow-sm ${
        dep.isStale
          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
          : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      <button
        type="button"
        onClick={() => onEdit(dep)}
        className="w-full text-left text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
      >
        {dep.title}
      </button>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
        <DepStatusBadge status={dep.status} />
        {dep.status === "WAITING" && (
          <span className={dep.isStale ? "font-semibold text-red-600" : ""}>
            ⏰ chờ {dep.waitingDays} ngày
          </span>
        )}
        {dep.slaDate && (
          <span>SLA {formatVN(new Date(dep.slaDate), "dd/MM")}</span>
        )}
        {dep.offProcess && <span className="text-orange-600">⚠️ lệch quy trình</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-zinc-400">
        {dep.cooperationType && <span>{dep.cooperationType}</span>}
        <span>{DIRECTION_LABELS[dep.direction as Direction] ?? dep.direction}</span>
        {dep.contactPerson && <span>👤 {dep.contactPerson}</span>}
        {dep.mktTeam && <span>{TEAM_LABELS[dep.mktTeam as Team] ?? dep.mktTeam}</span>}
      </div>
      {dep.status !== "CLOSED" && (
        <button
          type="button"
          onClick={close}
          className="mt-1.5 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          ✔ Chốt xong
        </button>
      )}
    </div>
  );
}

export function DepBoard({ deps, onEdit, onChanged, onCreate }: DepBoardProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {PARTNERS.map((partner) => {
        const cards = deps.filter((d) => d.partner === partner);
        const open = cards.filter((d) => d.status !== "CLOSED").length;
        return (
          <section
            key={partner}
            className="rounded-lg bg-zinc-100/70 p-2 dark:bg-zinc-800/40"
          >
            <h3 className="mb-2 px-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {PARTNER_LABELS[partner]}{" "}
              <span className="font-normal text-zinc-400">· {open} đang mở</span>
            </h3>
            <div className="space-y-1.5">
              {cards.map((d) => (
                <DepCard key={d.id} dep={d} onEdit={onEdit} onChanged={onChanged} />
              ))}
              {cards.length === 0 && (
                <div className="px-1 py-3 text-center">
                  <p className="text-xs text-zinc-400">Chưa có phối hợp nào</p>
                  {/* P2 — empty state có lối đi luôn thay vì ngõ cụt */}
                  <button
                    type="button"
                    onClick={() => onCreate(partner)}
                    className="mt-1.5 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
                  >
                    ➕ Tạo phối hợp với {PARTNER_LABELS[partner]}
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
