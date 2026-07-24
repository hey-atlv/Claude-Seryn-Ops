import type { AlertStatus } from "./alerts";

// Ma trận Eisenhower — phân loại từ dữ liệu sẵn có, không cần nhập thêm:
// Khẩn   = Critical, quá hạn, hoặc sắp hạn (≤2 ngày — trùng ngưỡng DUE_SOON)
// Quan trọng = ưu tiên Cao/Critical hoặc ảnh hưởng doanh thu Cao

export const QUADRANTS = ["DO", "SCHEDULE", "DELEGATE", "MONITOR"] as const;
export type Quadrant = (typeof QUADRANTS)[number];

export interface QuadrantMeta {
  title: string;
  hint: string;
}

export const QUADRANT_META: Record<Quadrant, QuadrantMeta> = {
  DO: { title: "Làm ngay", hint: "Khẩn & quan trọng — tự xử lý trước tiên" },
  SCHEDULE: {
    title: "Lên lịch",
    hint: "Quan trọng, chưa khẩn — đặt deadline/khung giờ",
  },
  DELEGATE: {
    title: "Giao việc",
    hint: "Khẩn, ít quan trọng — chuyển leader xử lý",
  },
  MONITOR: {
    title: "Theo dõi",
    hint: "Chưa khẩn, ít quan trọng — gom lại review định kỳ",
  },
};

export interface EisenhowerInput {
  priority: string;
  revenueImpact: string;
  alertStatus: AlertStatus;
}

export function isUrgent(t: EisenhowerInput): boolean {
  return (
    t.priority === "CRITICAL" ||
    t.alertStatus === "OVERDUE" ||
    t.alertStatus === "DUE_SOON"
  );
}

export function isImportant(t: EisenhowerInput): boolean {
  return (
    t.priority === "CRITICAL" ||
    t.priority === "HIGH" ||
    t.revenueImpact === "HIGH"
  );
}

export function classify(t: EisenhowerInput): Quadrant {
  const urgent = isUrgent(t);
  const important = isImportant(t);
  if (urgent && important) return "DO";
  if (important) return "SCHEDULE";
  if (urgent) return "DELEGATE";
  return "MONITOR";
}
