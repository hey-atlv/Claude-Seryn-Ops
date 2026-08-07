import type { Report } from "@/generated/prisma/client";
import { alertStatus } from "./alerts";
import { prisma } from "./db";
import { projectProgress } from "./today-core";
import { formatVN } from "./timezone";

// P1-c — Tự dựng nháp báo cáo tuần/tháng từ dữ liệu sẵn có trong DB:
// xong gì, trễ gì, chỉ số ra sao, dự án tới đâu, rủi ro nào — CMO chỉ sửa
// 10% rồi gửi, thay vì điền tay 5 checklist từ số 0.

const DAY_MS = 86_400_000;

export interface ReportDraftResult {
  draft: string; // markdown
  // Checklist tự tick theo dữ liệu thật sự có trong nháp
  checklist: {
    hasRevenue: boolean;
    hasRoas: boolean;
    hasData: boolean;
    hasProjects: boolean;
    hasRisks: boolean;
  };
}

const fmtDay = (d: Date | null) => (d ? formatVN(d, "dd/MM") : "chưa có hạn");

function taskLine(t: {
  title: string;
  leader: { name: string } | null;
  deadline: Date | null;
}): string {
  return `- ${t.title} — ${t.leader?.name ?? "chưa gán"} · hạn ${fmtDay(t.deadline)}`;
}

/**
 * Kỳ báo cáo = cửa sổ lùi từ hạn nộp: tuần 7 ngày, tháng 30 ngày.
 * (Báo cáo tuần nộp thứ 2 → cover tuần trước; đủ đúng cho bản nháp.)
 */
export function draftPeriod(
  report: Pick<Report, "type" | "dueDate">,
  now: Date,
): { start: Date; end: Date } {
  const end = report.dueDate ?? now;
  const days = report.type === "MONTHLY" ? 30 : 7;
  return { start: new Date(end.getTime() - days * DAY_MS), end };
}

export async function buildReportDraft(
  report: Report,
  now: Date = new Date(),
): Promise<ReportDraftResult> {
  const { start, end } = draftPeriod(report, now);

  const [doneTasks, openTasks, stats] = await Promise.all([
    prisma.task.findMany({
      where: {
        parentId: null,
        status: "DONE",
        completedAt: { gte: start, lte: end },
      },
      include: { leader: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { parentId: null, status: { not: "DONE" } },
      include: { leader: true, subItems: true },
    }),
    prisma.weeklyStat.findMany({
      orderBy: { weekKey: "desc" },
      take: report.type === "MONTHLY" ? 5 : 2,
    }),
  ]);

  const overdue = openTasks.filter((t) => alertStatus(t, now) === "OVERDUE");
  const inProgress = openTasks.filter((t) => t.status === "IN_PROGRESS");
  const reviews = openTasks.filter((t) => t.status === "REVIEW");
  const projects = openTasks.filter((t) => t.type === "PROJECT");
  const latestStat = stats[0] ?? null;

  const lines: string[] = [
    `# ${report.title}`,
    `_Kỳ ${formatVN(start, "dd/MM")} → ${formatVN(end, "dd/MM/yyyy")} · nháp tự sinh ${formatVN(now, "dd/MM HH:mm")}_`,
    "",
  ];

  // 📊 Chỉ số
  if (latestStat) {
    lines.push("## 📊 Chỉ số");
    for (const s of [...stats].reverse()) {
      const parts = [
        s.revenue != null ? `doanh thu lũy kế ${s.revenue}tr` : null,
        s.planPct != null ? `${s.planPct}% khoán` : null,
        s.roas != null ? `ROAS ${s.roas}` : null,
        s.note ? `(${s.note})` : null,
      ].filter(Boolean);
      if (parts.length > 0)
        lines.push(`- Tuần ${s.weekKey.slice(5)}: ${parts.join(" · ")}`);
    }
    lines.push("");
  }

  lines.push(`## ✅ Hoàn thành trong kỳ (${doneTasks.length})`);
  lines.push(
    doneTasks.length > 0
      ? doneTasks.map(taskLine).join("\n")
      : "- Chưa chốt xong việc nào trong kỳ",
  );
  lines.push("");

  if (projects.length > 0) {
    lines.push(`## 📁 Tiến độ dự án (${projects.length})`);
    for (const p of projects) {
      const prog = projectProgress(p.subItems);
      lines.push(
        `- ${p.title} — ${prog.done}/${prog.total} giai đoạn (${prog.pct}%) · ${p.leader?.name ?? "chưa gán"}`,
      );
    }
    lines.push("");
  }

  lines.push(`## 🔄 Đang làm (${inProgress.length})`);
  lines.push(
    inProgress.length > 0
      ? inProgress.map(taskLine).join("\n")
      : "- Không có",
  );
  lines.push("");

  const hasRisks = overdue.length > 0 || reviews.length > 0;
  lines.push("## ⚠️ Rủi ro & tồn đọng");
  if (overdue.length > 0) {
    lines.push(`**Quá hạn (${overdue.length}):**`);
    lines.push(overdue.map(taskLine).join("\n"));
  }
  if (reviews.length > 0) {
    lines.push(`**Chờ duyệt (${reviews.length}):**`);
    lines.push(reviews.map(taskLine).join("\n"));
  }
  if (!hasRisks) lines.push("- Không có — các đầu việc trong tầm kiểm soát");

  return {
    draft: lines.join("\n"),
    checklist: {
      hasRevenue: latestStat?.revenue != null,
      hasRoas: latestStat?.roas != null,
      hasData: latestStat?.planPct != null,
      hasProjects: projects.length > 0,
      hasRisks,
    },
  };
}
