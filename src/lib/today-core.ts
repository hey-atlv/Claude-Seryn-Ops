import type { AlertStatus } from "./alerts";
import { daysUntilVN } from "./timezone";

// Logic thuần cho màn "Hôm nay" (phương án 15 phút) — tách để test độc lập.

export const TODAY_LIST_LIMIT = 7;
const DAY_MS = 86_400_000;
const PROJECT_STUCK_DAYS = 14;

export interface TodayPickInput {
  priority: string; // NORMAL | HIGH | CRITICAL
  alertStatus: AlertStatus;
  deadline: Date | null;
  priorityScore: number;
}

/**
 * Khối ② "Hôm nay làm gì": Critical → quá hạn → đến hạn hôm nay,
 * trong mỗi nhóm sort theo score, tối đa 7 việc. Task xuất hiện ở nhóm
 * đầu tiên khớp (không lặp).
 */
export function pickTodayTasks<T extends TodayPickInput>(
  tasks: T[],
  now: Date = new Date(),
): T[] {
  const rank = (t: T): number => {
    if (t.priority === "CRITICAL") return 0;
    if (t.alertStatus === "OVERDUE") return 1;
    if (t.deadline && daysUntilVN(t.deadline, now) === 0) return 2;
    return -1; // không thuộc danh sách hôm nay
  };
  return tasks
    .map((t) => ({ t, r: rank(t) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || b.t.priorityScore - a.t.priorityScore)
    .slice(0, TODAY_LIST_LIMIT)
    .map((x) => x.t);
}

export type ProjectLight = "RED" | "YELLOW" | "GREEN";

export const PROJECT_LIGHT_META: Record<
  ProjectLight,
  { icon: string; label: string }
> = {
  RED: { icon: "🔴", label: "2 tuần không nhích" },
  YELLOW: { icon: "🟡", label: "Có việc con trễ" },
  GREEN: { icon: "🟢", label: "Ổn" },
};

export interface ProjectSubInput {
  status: string;
  deadline: Date | null;
  updatedAt: Date;
  completedAt: Date | null;
}

/**
 * Đèn tiến độ dự án (khối ③):
 * 🔴 nếu mốc nhích gần nhất (max updatedAt/completedAt của sub-items,
 *    fallback mốc của chính project khi chưa có sub-item) quá 14 ngày
 * 🟡 nếu có việc con chưa xong đã quá deadline
 * 🟢 còn lại. RED thắng YELLOW.
 */
export function projectLight(
  subItems: ProjectSubInput[],
  projectMovedAt: Date,
  now: Date = new Date(),
): ProjectLight {
  let lastMoved = subItems.length === 0 ? projectMovedAt.getTime() : 0;
  for (const s of subItems) {
    lastMoved = Math.max(
      lastMoved,
      s.updatedAt.getTime(),
      s.completedAt?.getTime() ?? 0,
    );
  }
  if (now.getTime() - lastMoved > PROJECT_STUCK_DAYS * DAY_MS) return "RED";

  const hasLateChild = subItems.some(
    (s) =>
      s.status !== "DONE" && s.deadline && s.deadline.getTime() < now.getTime(),
  );
  return hasLateChild ? "YELLOW" : "GREEN";
}

/** % hoàn thành dự án theo sub-items DONE (0 khi chưa có sub-item) */
export function projectProgress(subItems: { status: string }[]): {
  done: number;
  total: number;
  pct: number;
} {
  const total = subItems.length;
  const done = subItems.filter((s) => s.status === "DONE").length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/** Số ngày một task nằm ở trạng thái hiện tại (khối ④ "Chờ sếp quyết") */
export function daysSitting(updatedAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / DAY_MS));
}
