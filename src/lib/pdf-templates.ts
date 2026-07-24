import { TEAM_LABELS, type Team } from "./constants";
import { formatVN } from "./timezone";

// K1 — Template HTML in-friendly cho báo cáo tuần/tháng (checklist 5 mục) và
// tóm tắt cuối ngày. Thuần (không đụng DB/Playwright) để test được — pdf-render.ts
// (cần Chromium thật, không test đơn vị) chỉ lo render chuỗi HTML này ra PDF.

const CHECKLIST_ITEMS = [
  { key: "hasRevenue", label: "Doanh thu" },
  { key: "hasRoas", label: "Tiến độ ROAS" },
  { key: "hasData", label: "Tiến độ data" },
  { key: "hasProjects", label: "Tiến độ dự án" },
  { key: "hasRisks", label: "Rủi ro/tồn đọng" },
] as const;

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return s.replace(/[&<>"']/g, (c) => map[c]!);
}

// Màu brand Seryn (globals.css): nền kem #F5F2EE, navy #1C2B3A, gold #C9A96E.
function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 22mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, "Be Vietnam Pro", sans-serif; color: #1c2b3a; background: #fff; margin: 0; }
  h1 { font-family: Georgia, "Cormorant Garamond", serif; font-weight: 400; font-size: 26px; margin: 0 0 4px; }
  .meta { color: #4e6b85; font-size: 12px; margin-bottom: 20px; }
  .card { background: #f5f2ee; border: 1px solid #e5ebf1; border-radius: 8px; padding: 14px 18px; margin-bottom: 14px; }
  .checklist { list-style: none; padding: 0; margin: 0; }
  .checklist li { padding: 5px 0; font-size: 14px; border-bottom: 1px solid #e5ebf1; }
  .checklist li:last-child { border-bottom: none; }
  .ok { color: #1c8a5e; font-weight: 600; }
  .no { color: #b5495b; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #c9a96e; color: #1c2b3a; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #4e6b85; font-size: 11px; text-transform: uppercase; padding: 4px 6px; border-bottom: 1px solid #c8d4df; }
  td { padding: 5px 6px; border-bottom: 1px solid #e5ebf1; vertical-align: top; }
  .empty { color: #8fa8be; font-style: italic; }
  footer { margin-top: 20px; font-size: 10px; color: #8fa8be; text-align: center; }
</style></head>
<body>${body}
<footer>Seryn Ops — xuất lúc ${escapeHtml(formatVN(new Date(), "HH:mm dd/MM/yyyy"))}</footer>
</body></html>`;
}

export interface ReportPdfInput {
  title: string;
  type: string; // WEEKLY | MONTHLY
  dueDate: string | null; // ISO
  hasRevenue: boolean;
  hasRoas: boolean;
  hasData: boolean;
  hasProjects: boolean;
  hasRisks: boolean;
  reportLink: string | null;
  boardFeedback: string | null;
}

export function reportHtml(report: ReportPdfInput): string {
  const typeLabel = report.type === "MONTHLY" ? "Báo cáo tháng" : "Báo cáo tuần";
  const items = CHECKLIST_ITEMS.map(
    (i) =>
      `<li>${report[i.key] ? '<span class="ok">✓</span>' : '<span class="no">✗</span>'} ${i.label}</li>`,
  ).join("");
  const body = `
    <h1>${escapeHtml(report.title)}</h1>
    <p class="meta"><span class="badge">${typeLabel}</span>${
      report.dueDate
        ? ` · Hạn nộp ${formatVN(new Date(report.dueDate), "dd/MM/yyyy")}`
        : ""
    }</p>
    <div class="card"><ul class="checklist">${items}</ul></div>
    ${
      report.boardFeedback
        ? `<div class="card"><strong>Feedback lãnh đạo</strong><p>${escapeHtml(report.boardFeedback)}</p></div>`
        : ""
    }
    ${
      report.reportLink
        ? `<div class="card"><strong>Link báo cáo chi tiết</strong><p>${escapeHtml(report.reportLink)}</p></div>`
        : ""
    }
  `;
  return page(report.title, body);
}

export interface SummaryTaskLike {
  title: string;
  team: string;
  leaderName: string | null;
  deadline: string | null; // ISO
}

export interface DailySummaryPdfInput {
  dateLabel: string; // "dd/MM/yyyy"
  topTomorrow: SummaryTaskLike | null;
  doneToday: SummaryTaskLike[];
  inProgress: SummaryTaskLike[];
  overdue: SummaryTaskLike[];
  dueSoon: SummaryTaskLike[];
}

function taskRows(tasks: SummaryTaskLike[]): string {
  if (tasks.length === 0) {
    return `<tr><td colspan="3" class="empty">Không có</td></tr>`;
  }
  return tasks
    .map((t) => {
      const teamLabel = TEAM_LABELS[t.team as Team] ?? t.team;
      const leaderLabel = t.leaderName ?? "chưa gán";
      const deadlineLabel = t.deadline
        ? formatVN(new Date(t.deadline), "dd/MM")
        : "—";
      return `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(teamLabel)} · ${escapeHtml(leaderLabel)}</td><td>${deadlineLabel}</td></tr>`;
    })
    .join("");
}

function section(title: string, tasks: SummaryTaskLike[]): string {
  return `<div class="card"><strong>${escapeHtml(title)} (${tasks.length})</strong>
    <table><thead><tr><th>Việc</th><th>Team · Leader</th><th>Hạn</th></tr></thead>
    <tbody>${taskRows(tasks)}</tbody></table></div>`;
}

export function dailySummaryHtml(input: DailySummaryPdfInput): string {
  const body = `
    <h1>🌙 Tóm tắt cuối ngày</h1>
    <p class="meta">${escapeHtml(input.dateLabel)}</p>
    ${
      input.topTomorrow
        ? `<div class="card"><strong>⭐ Việc quan trọng nhất sáng mai</strong><p>${escapeHtml(input.topTomorrow.title)}</p></div>`
        : ""
    }
    ${section("✅ Hoàn thành hôm nay", input.doneToday)}
    ${section("🔄 Đang làm", input.inProgress)}
    ${section("🔴 Quá hạn", input.overdue)}
    ${section("⚠️ Sắp đến hạn", input.dueSoon)}
  `;
  return page("Tóm tắt cuối ngày", body);
}
