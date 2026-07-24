// Backlog ý tưởng — chấm điểm & xếp góc phần tư impact/effort.
// Cùng tinh thần với eisenhower.ts (phân loại từ dữ liệu đã có, không bắt nhập thêm),
// nhưng khác trục: eisenhower dùng cho VIỆC (khẩn/quan trọng), file này dùng cho
// Ý TƯỞNG (giá trị kỳ vọng / công sức bỏ ra).

export const IDEA_SCALE_MIN = 1;
export const IDEA_SCALE_MAX = 5;

/** Từ mức này trở lên coi là "giá trị cao" */
export const HIGH_IMPACT_MIN = 4;
/** Từ mức này trở xuống coi là "làm nhẹ" */
export const LOW_EFFORT_MAX = 2;

export const IDEA_BUCKETS = [
  "QUICK_WIN",
  "BIG_BET",
  "FILL_IN",
  "MONEY_PIT",
] as const;
export type IdeaBucket = (typeof IDEA_BUCKETS)[number];

export interface IdeaBucketMeta {
  title: string;
  hint: string;
}

export const IDEA_BUCKET_META: Record<IdeaBucket, IdeaBucketMeta> = {
  QUICK_WIN: {
    title: "Làm ngay",
    hint: "Giá trị cao, tốn ít — duyệt thẳng thành dự án",
  },
  BIG_BET: {
    title: "Đặt cược lớn",
    hint: "Giá trị cao nhưng nặng — validate trước khi cam kết",
  },
  FILL_IN: {
    title: "Làm khi rảnh",
    hint: "Nhẹ nhưng giá trị thấp — nhét vào chỗ trống, đừng ưu tiên",
  },
  MONEY_PIT: {
    title: "Cân nhắc bỏ",
    hint: "Tốn nhiều, được ít — cần lý do rất mạnh mới làm",
  },
};

export interface IdeaScoreInput {
  impact: number;
  effort: number;
}

/** Kẹp giá trị về thang 1..5 — chặn dữ liệu cũ/lỗi làm vỡ phép chia. */
export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return IDEA_SCALE_MIN;
  return Math.min(IDEA_SCALE_MAX, Math.max(IDEA_SCALE_MIN, Math.round(value)));
}

/**
 * Điểm = giá trị / công sức, làm tròn 2 số lẻ. Càng cao càng đáng làm.
 * Dùng xếp hạng trong cùng một góc phần tư.
 */
export function ideaScore({ impact, effort }: IdeaScoreInput): number {
  const value = clampScale(impact);
  const cost = clampScale(effort);
  return Math.round((value / cost) * 100) / 100;
}

export function classifyIdea({ impact, effort }: IdeaScoreInput): IdeaBucket {
  const highValue = clampScale(impact) >= HIGH_IMPACT_MIN;
  const lightLift = clampScale(effort) <= LOW_EFFORT_MAX;
  if (highValue && lightLift) return "QUICK_WIN";
  if (highValue) return "BIG_BET";
  if (lightLift) return "FILL_IN";
  return "MONEY_PIT";
}
