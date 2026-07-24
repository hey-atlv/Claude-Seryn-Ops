import {
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type Priority,
  type TaskStatus,
} from "@/lib/constants";

const BADGE =
  "inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold";

const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  IN_PROGRESS: "bg-blue-600/15 text-blue-800 dark:bg-blue-400/20 dark:text-blue-200",
  REVIEW: "bg-amber-500/20 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200",
  DONE: "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as TaskStatus;
  return (
    <span className={`${BADGE} ${STATUS_STYLES[s] ?? STATUS_STYLES.TODO}`}>
      {TASK_STATUS_LABELS[s] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "NORMAL") return null;
  const style =
    priority === "CRITICAL"
      ? "bg-red-600 text-white dark:bg-red-500"
      : "bg-amber-500 text-amber-950 dark:bg-amber-400";
  return (
    <span className={`${BADGE} ${style}`}>
      {PRIORITY_LABELS[priority as Priority] ?? priority}
    </span>
  );
}
