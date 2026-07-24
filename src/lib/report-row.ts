// Kiểu dữ liệu thuần (Date → ISO string) cho trang /reports.

export interface ReportRow {
  id: string;
  title: string;
  type: string; // WEEKLY | MONTHLY
  dueDate: string | null;
  status: string; // 4 bước NOT_STARTED → SUBMITTED
  hasRevenue: boolean;
  hasRoas: boolean;
  hasData: boolean;
  hasProjects: boolean;
  hasRisks: boolean;
  reportLink: string | null;
  boardFeedback: string | null;
  createdAt: string;
}
