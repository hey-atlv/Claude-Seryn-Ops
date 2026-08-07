// Danh mục cố định của hệ thống — nguồn sự thật duy nhất cho validation
// (SQLite không hỗ trợ enum nên các field lưu String, validate bằng các hằng số này)

export const TEAMS = [
  "DIGITAL",
  "CONTENT",
  "PR_TRADE_EVENT",
  "TVOL",
  "TNNB",
  "KSKD_KT",
  "CMO",
] as const;
export type Team = (typeof TEAMS)[number];

export const TEAM_LABELS: Record<Team, string> = {
  DIGITAL: "Digital",
  CONTENT: "Content",
  PR_TRADE_EVENT: "PR&Trade&Event",
  TVOL: "TVOL",
  TNNB: "TNNB",
  KSKD_KT: "KSKD&KT",
  CMO: "CMO",
};

// Tag ngắn của team — TaskForm tự gắn vào đầu Tên việc: "[Digi] - …"
// (chỉ khi người dùng chưa tự gõ tag "[...]" riêng).
export const TEAM_TAGS: Record<Team, string> = {
  DIGITAL: "Digi",
  CONTENT: "Content",
  PR_TRADE_EVENT: "PR",
  TVOL: "TVOL",
  TNNB: "TNNB",
  KSKD_KT: "KSKD",
  CMO: "CMO",
};

// Kênh của Team Digital — Digital tách theo kênh, mỗi kênh 1 leader.
// (Các team khác không chia kênh — Leader.channel = null.)
export const CHANNELS = ["FACEBOOK", "ZALO", "GOOGLE"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABELS: Record<Channel, string> = {
  FACEBOOK: "Facebook",
  ZALO: "Zalo",
  GOOGLE: "Google",
};

// Bảng 2.1.b — Nhóm việc theo team
export const CATEGORY_BY_TEAM: Record<Team, string[]> = {
  DIGITAL: [
    "KPI/ROAS",
    "Data (ngân sách-giá-chất lượng)",
    "Content hiệu quả",
    "Dự án tháng",
    "Tài nguyên hệ thống",
  ],
  CONTENT: [
    "Sản xuất content",
    "Content hiệu quả",
    "Dự án tháng",
    "Ý tưởng/Thử nghiệm mới",
  ],
  PR_TRADE_EVENT: ["Dự án/Hoạt động", "Event", "PR metrics", "Trade"],
  TVOL: ["Chỉ số CSKH/Chuyển đổi", "Kịch bản/Thử nghiệm mới"],
  TNNB: ["Bản tin nội bộ", "Sự kiện nội bộ"],
  KSKD_KT: [
    "Doanh thu/Chi tiêu",
    "Báo cáo liên phòng",
    "Kiểm soát chi phí",
    "BCTC nội bộ",
    "Rủi ro tài chính",
  ],
  // Việc cấp CMO/GĐ khối — theo 12 nhóm chức năng nhiệm vụ trong file bàn giao
  CMO: [
    "Kế hoạch & Chiến lược",
    "Ngân sách & Chi phí",
    "Cơ chế & Nhân sự",
    "Sản phẩm mới",
    "Báo cáo BGĐ",
    "Phối hợp liên khối",
  ],
};

export const TASK_TYPES = ["TASK", "PROJECT"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DONE: "Done",
};

export const PRIORITIES = ["NORMAL", "HIGH", "CRITICAL"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABELS: Record<Priority, string> = {
  NORMAL: "Bình thường",
  HIGH: "Cao",
  CRITICAL: "🔴 Critical",
};

export const REVENUE_IMPACTS = ["HIGH", "MEDIUM", "LOW"] as const;
export type RevenueImpact = (typeof REVENUE_IMPACTS)[number];
export const REVENUE_IMPACT_LABELS: Record<RevenueImpact, string> = {
  HIGH: "Cao",
  MEDIUM: "Trung bình",
  LOW: "Thấp",
};

// DB2 — Cross-team Dependencies
export const PARTNERS = ["TC_KT", "CEC", "SALE"] as const;
export type Partner = (typeof PARTNERS)[number];
export const PARTNER_LABELS: Record<Partner, string> = {
  TC_KT: "Tài chính-KT",
  CEC: "CEC",
  SALE: "Sale",
};

// Bảng 2.2.b — Loại phối hợp theo khối
export const COOPERATION_BY_PARTNER: Record<Partner, string[]> = {
  TC_KT: [
    "Quy trình vận hành định kỳ",
    "Việc phát sinh (bắt buộc có deadline)",
  ],
  CEC: [
    "Báo cáo chỉ số từ CEC",
    "Phản hồi chất lượng data",
    "MKT update ads đang chạy cho CEC",
  ],
  SALE: [
    "Sale phản hồi hiệu quả lead",
    "Sale yêu cầu hỗ trợ (data/chính sách/ưu đãi)",
  ],
};

export const DIRECTIONS = [
  "MKT_TO_PARTNER",
  "PARTNER_TO_MKT",
  "TWO_WAY",
] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const DIRECTION_LABELS: Record<Direction, string> = {
  MKT_TO_PARTNER: "MKT → Khối",
  PARTNER_TO_MKT: "Khối → MKT",
  TWO_WAY: "2 chiều",
};

export const DEPENDENCY_STATUSES = ["WAITING", "PROCESSING", "CLOSED"] as const;
export type DependencyStatus = (typeof DEPENDENCY_STATUSES)[number];
export const DEPENDENCY_STATUS_LABELS: Record<DependencyStatus, string> = {
  WAITING: "Chờ phản hồi",
  PROCESSING: "Đang xử lý",
  CLOSED: "Đã chốt",
};

// DB3 — Board Reporting
export const REPORT_TYPES = ["WEEKLY", "MONTHLY"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = [
  "NOT_STARTED",
  "GATHERING",
  "DRAFTING",
  "SUBMITTED",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  GATHERING: "Đang gom số liệu",
  DRAFTING: "Đang soạn",
  SUBMITTED: "Đã nộp",
};

// Template việc lặp lại (bảng 2.1.f) — quản lý ở Cài đặt › Việc định kỳ
export const RECURRING_TARGETS = ["TASK", "REPORT"] as const;
export type RecurringTarget = (typeof RECURRING_TARGETS)[number];
export const RECURRING_TARGET_LABELS: Record<RecurringTarget, string> = {
  TASK: "Công việc",
  REPORT: "Báo cáo",
};

// NONE = không tự sinh, chỉ làm khung cho nút "Tạo từ template" ở trang Công việc
export const RECURRING_SCHEDULES = ["WEEKLY", "MONTHLY", "NONE"] as const;
export type RecurringSchedule = (typeof RECURRING_SCHEDULES)[number];
export const RECURRING_SCHEDULE_LABELS: Record<RecurringSchedule, string> = {
  WEEKLY: "Hằng tuần",
  MONTHLY: "Hằng tháng",
  NONE: "Không tự sinh",
};

/** Thứ trong tuần ISO-8601 (1 = thứ 2 … 7 = chủ nhật) — khớp scheduleDay của lịch tuần */
export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const ISO_WEEKDAY_LABELS: Record<number, string> = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  7: "Chủ nhật",
};

export const MONTH_DAY_MIN = 1;
export const MONTH_DAY_MAX = 31; // ngày vượt số ngày của tháng sẽ lùi về ngày cuối tháng
export const RECURRING_MAX_SUB_ITEMS = 20;

// Inbox
export const INBOX_SOURCES = [
  "TELEGRAM",
  "UPLOAD",
  "PASTE",
  "GSHEET",
  "GCAL",
] as const;
export type InboxSource = (typeof INBOX_SOURCES)[number];

export const INBOX_STATUSES = ["PENDING", "CONVERTED", "DISMISSED"] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

// Backlog ý tưởng — vòng đời NEW → VALIDATING → APPROVED → PROJECT.
// DROPPED là ngõ ra ở bất kỳ bước nào (loại thẳng, vẫn giữ để sau tra cứu).
export const IDEA_STATUSES = [
  "NEW",
  "VALIDATING",
  "APPROVED",
  "PROJECT",
  "DROPPED",
] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];
export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  NEW: "Mới",
  VALIDATING: "Đang thẩm định",
  APPROVED: "Đã duyệt",
  PROJECT: "Đã thành dự án",
  DROPPED: "Đã loại",
};

/** Bước tiếp theo hợp lệ của mỗi trạng thái — chặn nhảy cóc sai luồng. */
export const IDEA_STATUS_FLOW: Record<IdeaStatus, IdeaStatus[]> = {
  NEW: ["VALIDATING", "APPROVED", "DROPPED"],
  VALIDATING: ["APPROVED", "DROPPED", "NEW"],
  APPROVED: ["PROJECT", "VALIDATING", "DROPPED"],
  PROJECT: [], // đã thành dự án — vòng đời khép lại, theo dõi tiếp ở Task
  DROPPED: ["NEW"], // hồi sinh khi bối cảnh đổi
};

/** Trạng thái duy nhất được phép sinh Task PROJECT. */
export const IDEA_PROMOTABLE_FROM: IdeaStatus = "APPROVED";

// Ngưỡng nghiệp vụ
export const SILENT_TASK_DAYS = 7; // task im lặng (mục 3.4)
export const DEPENDENCY_STALE_DAYS = 3; // dependency chờ phản hồi quá lâu
