"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { QuickUpdate } from "@/components/tasks/quick-update";
import { patchTask } from "@/components/tasks/task-api";
import type { TodayTaskRow } from "@/lib/today-row";
import { formatVN } from "@/lib/timezone";

// Khối ② — "Hôm nay làm gì": tối đa 7 việc, mỗi dòng ✓ Done + ⚡ quick-update.
// Dark: mỗi việc là subcard panel-2 có stripe trạng thái + badge tint + avatar.

type Tone = "crit" | "over" | "soon";

function toneOf(task: TodayTaskRow): Tone {
  if (task.priority === "CRITICAL") return "crit";
  if (task.alertStatus === "OVERDUE") return "over";
  return "soon";
}

const STRIPE_CLS: Record<Tone, string> = {
  crit: "bg-critical",
  over: "bg-overdue",
  soon: "bg-soon",
};

const BADGE_CLS: Record<Tone, string> = {
  crit: "bg-critical/[0.18] text-critical",
  over: "bg-overdue/15 text-overdue",
  soon: "bg-soon/15 text-soon",
};

const BADGE_LABEL: Record<Tone, string> = {
  crit: "Critical",
  over: "Quá hạn",
  soon: "Hôm nay",
};

// Avatar màu người phụ trách — chọn từ bảng pastel-mờ theo hash tên.
const AVATAR_BG = ["#cf9aab", "#94a9cc", "#86bfa2", "#c9b184"];

function avatarColor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return AVATAR_BG[sum % AVATAR_BG.length];
}

function Row({ task }: { task: TodayTaskRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const tone = toneOf(task);

  async function markDone() {
    setSaving(true);
    const res = await patchTask(task.id, { status: "DONE" });
    setSaving(false);
    if (!res.success) {
      window.alert(`Không chốt xong được: ${res.error}`);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex items-center gap-3 rounded-[11px] border border-hair-soft bg-panel-2 px-3.5 py-3 transition-colors hover:border-hair-hover hover:bg-panel-hover">
      <span
        className={`w-[3px] self-stretch flex-none rounded ${STRIPE_CLS[tone]}`}
        aria-hidden
      />
      <span
        className={`flex-none whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${BADGE_CLS[tone]}`}
      >
        {BADGE_LABEL[tone]}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
        {task.title}
      </span>
      {task.leaderName && (
        <span className="flex flex-none items-center gap-1.5 text-xs text-dim">
          <span
            className="grid h-[22px] w-[22px] place-items-center rounded-full text-[10px] font-bold text-[#16161a]"
            style={{ background: avatarColor(task.leaderName) }}
            aria-hidden
          >
            {task.leaderName.charAt(0)}
          </span>
          {task.leaderName}
        </span>
      )}
      {task.deadline && (
        <span
          className={`w-11 flex-none whitespace-nowrap text-right text-xs tabular-nums ${
            task.alertStatus === "OVERDUE"
              ? "font-semibold text-overdue"
              : "text-muted"
          }`}
        >
          {formatVN(new Date(task.deadline), "dd/MM")}
        </span>
      )}
      <button
        type="button"
        onClick={markDone}
        disabled={saving}
        title="Chốt xong"
        className="flex flex-none items-center gap-1 rounded-lg border border-good/30 bg-good/[0.07] px-2.5 py-1 text-xs font-semibold text-good transition-colors hover:bg-good/[0.14] disabled:opacity-50"
      >
        <Check size={13} strokeWidth={3} aria-hidden />
        Done
      </button>
      <QuickUpdate taskId={task.id} onDone={() => router.refresh()} />
    </li>
  );
}

export function TodayList({ tasks }: { tasks: TodayTaskRow[] }) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-[11px] border border-dashed border-hair px-4 py-5 text-center text-sm text-faint">
        Không có việc gấp hôm nay 🎉
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {tasks.map((t) => (
        <Row key={t.id} task={t} />
      ))}
    </ul>
  );
}
