import { SILENT_TASK_DAYS } from "./constants";
import { daysUntilVN } from "./timezone";

// Công thức 2.1.d trong tài liệu thiết kế — trạng thái cảnh báo theo thời gian thực.
// Dùng chung cho Task (theo Deadline) và Dependency (theo SLA).

export type AlertStatus =
  | "DONE"
  | "NO_DEADLINE"
  | "OVERDUE"
  | "DUE_SOON"
  | "ON_TRACK";

export const ALERT_LABELS: Record<AlertStatus, string> = {
  DONE: "✅ Xong",
  NO_DEADLINE: "⚪ Chưa có deadline",
  OVERDUE: "🔴 QUÁ HẠN",
  DUE_SOON: "🟡 Sắp đến hạn (≤2 ngày)",
  ON_TRACK: "🟢 Đúng tiến độ",
};

const DUE_SOON_DAYS = 2;
const DAY_MS = 86_400_000;

export interface AlertInput {
  status: string; // TASK_STATUSES hoặc DEPENDENCY_STATUSES ("DONE"/"CLOSED" đều coi là xong)
  deadline: Date | null;
}

export function alertStatus(
  input: AlertInput,
  now: Date = new Date(),
): AlertStatus {
  if (input.status === "DONE" || input.status === "CLOSED") return "DONE";
  if (!input.deadline) return "NO_DEADLINE";
  if (input.deadline.getTime() < now.getTime()) return "OVERDUE";
  if (daysUntilVN(input.deadline, now) <= DUE_SOON_DAYS) return "DUE_SOON";
  return "ON_TRACK";
}

export interface SilenceInput {
  status: string;
  lastUpdateAt: Date | null;
  createdAt: Date;
}

/** Task im lặng: đang In progress nhưng >7 ngày không có update tiến độ (mục 3.4) */
export function isSilent(input: SilenceInput, now: Date = new Date()): boolean {
  if (input.status !== "IN_PROGRESS") return false;
  const lastSignal = input.lastUpdateAt ?? input.createdAt;
  return now.getTime() - lastSignal.getTime() > SILENT_TASK_DAYS * DAY_MS;
}
