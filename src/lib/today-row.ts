import type { AlertStatus } from "./alerts";
import type { ProjectLight } from "./today-core";

// Kiểu thuần (Date → ISO string) cho màn "Hôm nay" — client components
// import không kéo prisma vào bundle (giống task-row.ts).

export interface BannerItemRow {
  id: string;
  title: string;
  sub: string; // dòng phụ: team · leader · hạn/số ngày
  href: string; // nơi xử lý khi bấm
}

export interface TodayTaskRow {
  id: string;
  title: string;
  leaderName: string | null;
  deadline: string | null;
  priority: string;
  alertStatus: AlertStatus;
}

export interface ProjectRow {
  id: string;
  title: string;
  teamLabel: string;
  team: string;
  leaderName: string | null;
  light: ProjectLight;
  done: number;
  total: number;
  pct: number;
}

export interface ReviewRow {
  id: string;
  title: string;
  teamLabel: string;
  leaderName: string | null;
  days: number; // số ngày nằm chờ duyệt
}

export interface WeeklyStatRow {
  revenue: number | null;
  planPct: number | null;
  roas: number | null;
  note: string | null;
}

export interface TodayData {
  generatedNow: number;
  overdue: BannerItemRow[];
  silent: BannerItemRow[];
  staleDeps: BannerItemRow[];
  todayTasks: TodayTaskRow[];
  projects: ProjectRow[];
  reviews: ReviewRow[];
  weekKey: string; // "2026-W30"
  weekLabel: string; // "tuần 30/2026"
  weeklyStat: WeeklyStatRow | null;
}
