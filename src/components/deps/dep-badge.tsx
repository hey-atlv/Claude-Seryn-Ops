import {
  DEPENDENCY_STATUS_LABELS,
  type DependencyStatus,
} from "@/lib/constants";

const STYLES: Record<DependencyStatus, string> = {
  WAITING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  CLOSED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function DepStatusBadge({ status }: { status: string }) {
  const s = status as DependencyStatus;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${STYLES[s] ?? STYLES.WAITING}`}
    >
      {DEPENDENCY_STATUS_LABELS[s] ?? status}
    </span>
  );
}
