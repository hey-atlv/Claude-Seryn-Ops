import type { Priority, RevenueImpact } from "./constants";
import { daysUntilVN } from "./timezone";

// Công thức 2.1.c trong tài liệu thiết kế:
// Critical = 999 (luôn đầu bảng). Còn lại = điểm khẩn cấp theo deadline (tối đa 50)
// + điểm tác động doanh thu (tối đa 30). Deadline trước, doanh thu sau.

export const CRITICAL_SCORE = 999;

const IMPACT_POINTS: Record<RevenueImpact, number> = {
  HIGH: 30,
  MEDIUM: 20,
  LOW: 10,
};

function urgencyPoints(daysLeft: number): number {
  if (daysLeft <= 0) return 50; // quá hạn hoặc đến hạn hôm nay
  if (daysLeft <= 2) return 40;
  if (daysLeft <= 5) return 30;
  if (daysLeft <= 10) return 20;
  return 10;
}

export interface PriorityInput {
  priority: Priority | string;
  deadline: Date | null;
  revenueImpact: RevenueImpact | string;
}

export function priorityScore(
  input: PriorityInput,
  now: Date = new Date(),
): number {
  if (input.priority === "CRITICAL") return CRITICAL_SCORE;
  if (!input.deadline) return 0;
  const urgency = urgencyPoints(daysUntilVN(input.deadline, now));
  const impact =
    IMPACT_POINTS[input.revenueImpact as RevenueImpact] ?? IMPACT_POINTS.LOW;
  return urgency + impact;
}

// Diễn giải thang điểm (dùng cho UI):
// 999 — Critical · 60-80 — xử lý trong ngày · 40-59 — kế hoạch tuần này · <40 — theo dõi
export function scoreBand(
  score: number,
): "CRITICAL" | "TODAY" | "THIS_WEEK" | "NORMAL" {
  if (score >= CRITICAL_SCORE) return "CRITICAL";
  if (score >= 60) return "TODAY";
  if (score >= 40) return "THIS_WEEK";
  return "NORMAL";
}
