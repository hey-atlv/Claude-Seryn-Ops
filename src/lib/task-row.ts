import type { AlertStatus } from "./alerts";

// Kiểu dữ liệu thuần (Date → ISO string) truyền từ server component sang
// client components của trang /tasks. Không import prisma để client bundle sạch.

export interface SubItemRow {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
}

export interface TaskRow {
  id: string;
  title: string;
  type: string;
  team: string;
  leaderId: string | null;
  leaderName: string | null;
  category: string | null;
  status: string;
  startDate: string | null; // ngày bắt đầu theo kế hoạch; null = chưa điền
  deadline: string | null;
  priority: string;
  revenueImpact: string;
  lastUpdateAt: string | null;
  lastUpdateNote: string | null;
  outputLink: string | null;
  note: string | null;
  hiddenAt: string | null; // != null → đã ẩn khỏi 3 view của /tasks (không xóa)
  createdAt: string;
  priorityScore: number;
  alertStatus: AlertStatus;
  isSilent: boolean;
  subItems: SubItemRow[];
}

export interface LeaderOption {
  id: string;
  name: string;
  team: string;
  channel: string | null; // Digital: FACEBOOK/ZALO/GOOGLE; team khác: null
}

// RecurringTemplate targetDb=TASK — dùng cho nút "Tạo từ template" (D8)
export interface TemplateOption {
  id: string;
  name: string;
  defaults: string; // JSON field điền sẵn
  subItemsTemplate: string | null; // JSON array tên sub-item
}

export interface TasksPageData {
  tasks: TaskRow[];
  leaders: LeaderOption[];
  templates: TemplateOption[];
}
