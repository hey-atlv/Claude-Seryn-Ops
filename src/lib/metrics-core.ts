// Trang "Sức khỏe hệ thống" (Phase 2 kế hoạch) — phần thuần (không đụng DB) để
// test dễ; loader DB nằm ở metrics.ts. Các chỉ số tự đo, không đếm tay.

export const REVIEW_STUCK_DAYS = 2; // task ở REVIEW quá số ngày này = "kẹt duyệt"

export interface DoneRate {
  onTime: number;
  total: number;
  pct: number | null; // null khi chưa có task DONE nào đủ điều kiện tính
}

/**
 * % task hoàn thành đúng hạn: trong các task DONE có ĐỦ cả deadline lẫn
 * completedAt, bao nhiêu % có completedAt <= deadline. Task thiếu 1 trong 2
 * mốc bị loại khỏi mẫu (không đủ dữ kiện để kết luận đúng/trễ hạn).
 */
export function doneOnTimeRate(
  tasks: { deadline: Date | null; completedAt: Date | null }[],
): DoneRate {
  const eligible = tasks.filter(
    (t): t is { deadline: Date; completedAt: Date } =>
      t.deadline !== null && t.completedAt !== null,
  );
  const onTime = eligible.filter(
    (t) => t.completedAt.getTime() <= t.deadline.getTime(),
  ).length;
  const total = eligible.length;
  return {
    onTime,
    total,
    pct: total === 0 ? null : Math.round((onTime / total) * 100),
  };
}
