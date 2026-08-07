import { z } from "zod";
import {
  CATEGORY_BY_TEAM,
  COOPERATION_BY_PARTNER,
  DEPENDENCY_STATUSES,
  DIRECTIONS,
  IDEA_STATUSES,
  INBOX_SOURCES,
  INBOX_STATUSES,
  MONTH_DAY_MAX,
  MONTH_DAY_MIN,
  PARTNERS,
  PRIORITIES,
  RECURRING_MAX_SUB_ITEMS,
  RECURRING_SCHEDULES,
  RECURRING_TARGETS,
  REPORT_STATUSES,
  REPORT_TYPES,
  REVENUE_IMPACTS,
  TASK_STATUSES,
  TASK_TYPES,
  TEAM_LABELS,
  TEAMS,
  type Partner,
  type ReportType,
  type Team,
} from "./constants";
import { IDEA_SCALE_MAX, IDEA_SCALE_MIN } from "./idea-score";
import type { RecurringTemplateInput } from "./recurring-core";

// Validate ở ranh giới API — mọi giá trị phân loại phải nằm trong constants.

export function categoryValidForTeam(
  team: string,
  category: string | null | undefined,
): boolean {
  if (!category) return true;
  return CATEGORY_BY_TEAM[team as Team]?.includes(category) ?? false;
}

export function cooperationValidForPartner(
  partner: string,
  cooperationType: string | null | undefined,
): boolean {
  if (!cooperationType) return true;
  return (
    COOPERATION_BY_PARTNER[partner as Partner]?.includes(cooperationType) ??
    false
  );
}

/** Loại phối hợp TC-KT bắt buộc có SLA (quy tắc bảng 2.2.b) */
export const TCKT_ADHOC_TYPE = COOPERATION_BY_PARTNER.TC_KT[1];

const nullableDate = z.coerce.date().nullish();
const nullableStr = (max: number) => z.string().trim().max(max).nullish();

/**
 * Schema cho PATCH: mọi field optional VÀ bỏ hết .default().
 *
 * Vì sao cần: `shape.partial()` không gỡ default — field vắng mặt vẫn được Zod
 * điền giá trị mặc định, nên một PATCH `{ status }` sẽ âm thầm ghi đè
 * priority/revenueImpact… về mặc định và làm mất dữ liệu người dùng đã nhập.
 * Ở đây gỡ lớp ZodDefault trước rồi mới partial → field không gửi thì không ghi.
 */
type Undefaulted<F> = F extends z.ZodDefault<infer Inner> ? Inner : F;
type UndefaultedShape<T extends z.ZodRawShape> = { [K in keyof T]: Undefaulted<T[K]> };

function patchSchemaOf<T extends z.ZodRawShape>(shape: z.ZodObject<T>) {
  const stripped = {} as UndefaultedShape<T>;
  for (const key of Object.keys(shape.shape) as (keyof T)[]) {
    const field = shape.shape[key];
    stripped[key] = (
      field instanceof z.ZodDefault ? field.unwrap() : field
    ) as UndefaultedShape<T>[keyof T];
  }
  return z.object(stripped).partial();
}

const taskShape = z.object({
  title: z.string().trim().min(1, "Tên việc không được trống").max(300),
  type: z.enum(TASK_TYPES).default("TASK"),
  team: z.enum(TEAMS),
  leaderId: nullableStr(50),
  category: nullableStr(100),
  status: z.enum(TASK_STATUSES).default("TODO"),
  startDate: nullableDate,
  deadline: nullableDate,
  priority: z.enum(PRIORITIES).default("NORMAL"),
  revenueImpact: z.enum(REVENUE_IMPACTS).default("MEDIUM"),
  lastUpdateAt: nullableDate,
  lastUpdateNote: nullableStr(2000),
  outputLink: nullableStr(1000),
  note: nullableStr(5000),
  parentId: nullableStr(50),
});

export const taskCreateSchema = taskShape.superRefine((v, ctx) => {
  if (!categoryValidForTeam(v.team, v.category)) {
    ctx.addIssue({
      code: "custom",
      path: ["category"],
      message: `Nhóm việc "${v.category}" không thuộc team ${TEAM_LABELS[v.team]}`,
    });
  }
});
// PATCH: các field đều optional; ràng buộc chéo team↔category check trong handler
// sau khi merge với bản ghi hiện có.
// `hidden` là cờ ý định, không phải cột DB — handler quy ra mốc `hiddenAt`
// (true → now, false → null). Để ngoài taskShape nên form tạo task không nhận.
export const taskUpdateSchema = patchSchemaOf(taskShape).extend({
  hidden: z.boolean().optional(),
});

const dependencyShape = z.object({
  title: z.string().trim().min(1, "Nội dung phối hợp không được trống").max(300),
  partner: z.enum(PARTNERS),
  direction: z.enum(DIRECTIONS).default("TWO_WAY"),
  cooperationType: nullableStr(100),
  contactPerson: nullableStr(100),
  mktTeam: z.enum(TEAMS).nullish(),
  status: z.enum(DEPENDENCY_STATUSES).default("WAITING"),
  followsProcess: z.boolean().default(true),
  slaDate: nullableDate,
  note: nullableStr(5000),
});

export const dependencyCreateSchema = dependencyShape.superRefine((v, ctx) => {
  if (!cooperationValidForPartner(v.partner, v.cooperationType)) {
    ctx.addIssue({
      code: "custom",
      path: ["cooperationType"],
      message: `Loại phối hợp "${v.cooperationType}" không thuộc khối đã chọn`,
    });
  }
  if (
    v.partner === "TC_KT" &&
    v.cooperationType === TCKT_ADHOC_TYPE &&
    !v.slaDate
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["slaDate"],
      message: "Việc phát sinh với Tài chính-KT bắt buộc điền SLA",
    });
  }
});
export const dependencyUpdateSchema = patchSchemaOf(dependencyShape);

const reportShape = z.object({
  title: z.string().trim().min(1, "Tên báo cáo không được trống").max(300),
  type: z.enum(REPORT_TYPES),
  dueDate: nullableDate,
  status: z.enum(REPORT_STATUSES).default("NOT_STARTED"),
  hasRevenue: z.boolean().default(false),
  hasRoas: z.boolean().default(false),
  hasData: z.boolean().default(false),
  hasProjects: z.boolean().default(false),
  hasRisks: z.boolean().default(false),
  reportLink: nullableStr(1000),
  boardFeedback: nullableStr(5000),
});

export const reportCreateSchema = reportShape;
export const reportUpdateSchema = patchSchemaOf(reportShape);

const sopShape = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được trống").max(300),
  category: nullableStr(100),
  content: z.string().max(100_000).default(""),
});

export const sopCreateSchema = sopShape;
export const sopUpdateSchema = patchSchemaOf(sopShape);

const noteShape = z.object({
  content: z.string().trim().min(1, "Ghi chú không được trống").max(10_000),
  pinned: z.boolean().default(false),
});

export const noteCreateSchema = noteShape;
export const noteUpdateSchema = patchSchemaOf(noteShape);

// Chỉ số tuần nhập tay (màn "Hôm nay") — upsert theo weekKey
const nullableNum = z.coerce.number().finite().nullish();

export const weeklyStatUpsertSchema = z.object({
  weekKey: z
    .string()
    .regex(/^\d{4}-W\d{2}$/, "weekKey phải dạng 2026-W30"),
  revenue: nullableNum,
  planPct: nullableNum,
  roas: nullableNum,
  note: nullableStr(1000),
});

// Giai đoạn H — Inbox
export const inboxCaptureSchema = z.object({
  text: z.string().trim().min(1, "Nội dung dán không được trống").max(20_000),
});

export const inboxItemCreateSchema = z.object({
  source: z.enum(INBOX_SOURCES),
  rawText: nullableStr(20_000),
  fileUrl: nullableStr(300),
  fileType: nullableStr(20),
  parsedDraft: nullableStr(5000),
});

export const inboxStatusUpdateSchema = z.object({
  status: z.enum(INBOX_STATUSES),
});

// Backlog ý tưởng — impact/effort giới hạn thang 1..5 (khớp idea-score.ts)
const scaleField = z.coerce
  .number()
  .int("Điểm phải là số nguyên")
  .min(IDEA_SCALE_MIN, `Điểm thấp nhất là ${IDEA_SCALE_MIN}`)
  .max(IDEA_SCALE_MAX, `Điểm cao nhất là ${IDEA_SCALE_MAX}`);

const ideaShape = z.object({
  title: z.string().trim().min(1, "Tên ý tưởng không được trống").max(300),
  description: nullableStr(5000),
  status: z.enum(IDEA_STATUSES).default("NEW"),
  impact: scaleField.default(3),
  effort: scaleField.default(3),
  team: z.enum(TEAMS).nullish(),
  source: nullableStr(200),
  decisionNote: nullableStr(2000),
});

export const ideaCreateSchema = ideaShape;
export const ideaUpdateSchema = patchSchemaOf(ideaShape);

// Giai đoạn J2 — thêm 1 sheet nguồn đọc vào Inbox (nhiều sheet cùng lúc)
export const googleSheetSourceCreateSchema = z.object({
  label: nullableStr(100),
  sheetId: z.string().trim().min(1, "Thiếu Spreadsheet ID").max(200),
  sheetRange: z.string().trim().min(1).max(200).default("Sheet1"),
});

// Template việc lặp lại — màn Cài đặt › Việc định kỳ.
// `defaults` nhận object có cấu trúc (không phải chuỗi JSON) để validate được
// từng field; tầng route mới serialize về cột `defaults` của DB.
const recurringDefaultsShape = z.object({
  type: z.string().trim().max(20).optional(),
  team: z.string().trim().max(30).optional(),
  category: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(20).optional(),
  revenueImpact: z.string().trim().max(20).optional(),
  deadlineDay: z.string().trim().max(2).optional(),
  note: z.string().trim().max(2000).optional(),
});

const recurringShape = z.object({
  name: z.string().trim().min(1, "Tên template không được trống").max(200),
  targetDb: z.enum(RECURRING_TARGETS).default("TASK"),
  scheduleType: z.enum(RECURRING_SCHEDULES).default("MONTHLY"),
  scheduleDay: z.coerce
    .number()
    .int("Ngày hẹn phải là số nguyên")
    .min(MONTH_DAY_MIN)
    .max(MONTH_DAY_MAX)
    .nullish(),
  defaults: recurringDefaultsShape.default({}),
  subItems: z
    .array(z.string().trim().min(1).max(200))
    .max(RECURRING_MAX_SUB_ITEMS, `Tối đa ${RECURRING_MAX_SUB_ITEMS} sub-item`)
    .default([]),
  active: z.boolean().default(true),
});

export const recurringTemplateCreateSchema = recurringShape;
// PATCH: ràng buộc chéo (lịch ↔ ngày hẹn, loại đích ↔ defaults) kiểm tra trong
// handler sau khi merge với bản ghi hiện có — xem validateRecurringTemplate.
export const recurringTemplateUpdateSchema = patchSchemaOf(recurringShape);

/**
 * Ràng buộc chéo của template định kỳ. Nhận input ĐÃ chuẩn hóa
 * (normalizeRecurringInput) — trả về thông báo lỗi tiếng Việt, null nếu hợp lệ.
 */
export function validateRecurringTemplate(
  input: RecurringTemplateInput,
): string | null {
  const { targetDb, scheduleType, scheduleDay, defaults } = input;

  if (scheduleType === "WEEKLY" && (scheduleDay == null || scheduleDay < 1 || scheduleDay > 7)) {
    return "Lịch hằng tuần phải chọn thứ trong tuần (thứ 2 → chủ nhật)";
  }
  if (
    scheduleType === "MONTHLY" &&
    (scheduleDay == null || scheduleDay < MONTH_DAY_MIN || scheduleDay > MONTH_DAY_MAX)
  ) {
    return `Lịch hằng tháng phải chọn ngày trong tháng (${MONTH_DAY_MIN}–${MONTH_DAY_MAX})`;
  }

  if (targetDb === "REPORT") {
    if (!defaults.type || !REPORT_TYPES.includes(defaults.type as ReportType)) {
      return "Template báo cáo phải chọn loại báo cáo (tuần hoặc tháng)";
    }
    return null;
  }

  if (defaults.type && !TASK_TYPES.includes(defaults.type as (typeof TASK_TYPES)[number])) {
    return "Loại công việc không hợp lệ";
  }
  if (defaults.team && !TEAMS.includes(defaults.team as Team)) {
    return "Team không hợp lệ";
  }
  // Template tự sinh không có người nhận thì task sinh ra sẽ rơi vào team mặc định
  // — bắt chọn team ngay từ đầu để không phải phân lại thủ công mỗi kỳ.
  if (scheduleType !== "NONE" && !defaults.team) {
    return "Template tự sinh phải chọn team nhận việc";
  }
  if (defaults.category) {
    if (!defaults.team) return "Chọn team trước khi chọn nhóm việc";
    if (!categoryValidForTeam(defaults.team, defaults.category)) {
      return `Nhóm việc "${defaults.category}" không thuộc team ${TEAM_LABELS[defaults.team as Team]}`;
    }
  }
  if (defaults.priority && !PRIORITIES.includes(defaults.priority as (typeof PRIORITIES)[number])) {
    return "Mức ưu tiên không hợp lệ";
  }
  if (
    defaults.revenueImpact &&
    !REVENUE_IMPACTS.includes(defaults.revenueImpact as (typeof REVENUE_IMPACTS)[number])
  ) {
    return "Ảnh hưởng doanh thu không hợp lệ";
  }
  if (defaults.deadlineDay !== undefined) {
    const day = Number(defaults.deadlineDay);
    if (!Number.isInteger(day) || day < MONTH_DAY_MIN || day > MONTH_DAY_MAX) {
      return `Ngày deadline phải trong khoảng ${MONTH_DAY_MIN}–${MONTH_DAY_MAX}`;
    }
    if (scheduleType !== "MONTHLY") {
      return "Ngày deadline riêng chỉ dùng cho lịch hằng tháng";
    }
  }
  return null;
}
