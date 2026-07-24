import { alertStatus } from "./alerts";
import { DEPENDENCY_STALE_DAYS, PARTNERS, TASK_STATUSES, TEAMS } from "./constants";
import { prisma } from "./db";
import { priorityScore } from "./priority";
import { formatVN } from "./timezone";

// Giai đoạn L2 — bộ tools READ-ONLY cho chat AI (L1). Mỗi tool trả JSON thuần
// (Date -> ISO string) để nhúng thẳng vào tool_result. Không có tool ghi/sửa/xoá
// dữ liệu — theo đúng nguyên tắc preview-confirm (L4): AI không tự ghi DB.

export interface AiToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const SEARCH_LIMIT_DEFAULT = 20;
const SEARCH_LIMIT_MAX = 50;

export const AI_TOOLS: AiToolDef[] = [
  {
    name: "search_tasks",
    description:
      "Tìm task/project theo từ khoá tiêu đề, team, trạng thái, mức ưu tiên. Dùng khi người dùng hỏi về danh sách việc, việc quá hạn, việc của 1 team...",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Từ khoá tìm trong tiêu đề (không bắt buộc)" },
        team: { type: "string", enum: TEAMS, description: "Lọc theo team" },
        status: { type: "string", enum: TASK_STATUSES, description: "Lọc theo trạng thái" },
        priority: { type: "string", enum: ["NORMAL", "HIGH", "CRITICAL"], description: "Lọc theo mức ưu tiên" },
        limit: { type: "number", description: `Số kết quả tối đa (mặc định ${SEARCH_LIMIT_DEFAULT}, tối đa ${SEARCH_LIMIT_MAX})` },
      },
    },
  },
  {
    name: "get_task_detail",
    description: "Lấy chi tiết đầy đủ 1 task/project theo id, gồm cả sub-item nếu là project.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "Id task" } },
      required: ["id"],
    },
  },
  {
    name: "get_team_summary",
    description: "Tóm tắt tình hình 1 team: số việc theo trạng thái, số quá hạn/critical, top việc ưu tiên cao nhất.",
    input_schema: {
      type: "object",
      properties: { team: { type: "string", enum: TEAMS } },
      required: ["team"],
    },
  },
  {
    name: "get_dependencies",
    description: "Danh sách việc phối hợp liên khối (Tài chính-KT, CEC, Sale), có thể lọc theo trạng thái/khối.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["WAITING", "PROCESSING", "CLOSED"] },
        partner: { type: "string", enum: PARTNERS },
      },
    },
  },
  {
    name: "get_reports",
    description: "Danh sách báo cáo tuần/tháng cho ban lãnh đạo, có thể lọc theo loại/trạng thái.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["WEEKLY", "MONTHLY"] },
        status: { type: "string", enum: ["NOT_STARTED", "GATHERING", "DRAFTING", "SUBMITTED"] },
      },
    },
  },
  {
    name: "get_stats",
    description: "Số liệu tổng quan toàn hệ thống: tổng task theo trạng thái/team, số quá hạn, số critical, số dependency đang chờ.",
    input_schema: { type: "object", properties: {} },
  },
];

interface SearchTasksInput {
  query?: string;
  team?: string;
  status?: string;
  priority?: string;
  limit?: number;
}

async function searchTasks(input: SearchTasksInput, now: Date) {
  const limit = Math.min(input.limit ?? SEARCH_LIMIT_DEFAULT, SEARCH_LIMIT_MAX);
  const tasks = await prisma.task.findMany({
    where: {
      parentId: null,
      ...(input.team ? { team: input.team } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.query ? { title: { contains: input.query } } : {}),
    },
    include: { leader: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    team: t.team,
    status: t.status,
    priority: t.priority,
    deadline: t.deadline ? formatVN(t.deadline, "yyyy-MM-dd") : null,
    leader: t.leader?.name ?? null,
    alertStatus: alertStatus(t, now),
    score: priorityScore(t, now),
  }));
}

async function getTaskDetail(input: { id: string }) {
  const task = await prisma.task.findUnique({
    where: { id: input.id },
    include: { leader: true, subItems: true },
  });
  if (!task) return { error: "Không tìm thấy task với id này" };
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    team: task.team,
    category: task.category,
    status: task.status,
    priority: task.priority,
    revenueImpact: task.revenueImpact,
    deadline: task.deadline ? formatVN(task.deadline) : null,
    leader: task.leader?.name ?? null,
    lastUpdateAt: task.lastUpdateAt ? formatVN(task.lastUpdateAt) : null,
    lastUpdateNote: task.lastUpdateNote,
    outputLink: task.outputLink,
    note: task.note,
    subItems: task.subItems.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      deadline: s.deadline ? formatVN(s.deadline, "yyyy-MM-dd") : null,
    })),
  };
}

async function getTeamSummary(input: { team: string }, now: Date) {
  const tasks = await prisma.task.findMany({
    where: { team: input.team, parentId: null },
    include: { leader: true },
  });
  const byStatus: Record<string, number> = {};
  for (const t of tasks) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  const open = tasks.filter((t) => t.status !== "DONE");
  const overdue = open.filter((t) => alertStatus(t, now) === "OVERDUE");
  const critical = open.filter((t) => t.priority === "CRITICAL");
  const top = [...open]
    .sort((a, b) => priorityScore(b, now) - priorityScore(a, now))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      deadline: t.deadline ? formatVN(t.deadline, "yyyy-MM-dd") : null,
      leader: t.leader?.name ?? null,
    }));
  return {
    team: input.team,
    total: tasks.length,
    byStatus,
    overdueCount: overdue.length,
    criticalCount: critical.length,
    topPriority: top,
  };
}

async function getDependencies(input: { status?: string; partner?: string }, now: Date) {
  const deps = await prisma.dependency.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.partner ? { partner: input.partner } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: SEARCH_LIMIT_MAX,
  });
  return deps.map((d) => {
    const waitingDays = Math.floor((now.getTime() - d.createdAt.getTime()) / 86_400_000);
    return {
      id: d.id,
      title: d.title,
      partner: d.partner,
      status: d.status,
      contactPerson: d.contactPerson,
      mktTeam: d.mktTeam,
      slaDate: d.slaDate ? formatVN(d.slaDate, "yyyy-MM-dd") : null,
      waitingDays,
      isStale: d.status === "WAITING" && waitingDays > DEPENDENCY_STALE_DAYS,
    };
  });
}

async function getReports(input: { type?: string; status?: string }) {
  const reports = await prisma.report.findMany({
    where: {
      ...(input.type ? { type: input.type } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: SEARCH_LIMIT_MAX,
  });
  return reports.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    dueDate: r.dueDate ? formatVN(r.dueDate, "yyyy-MM-dd") : null,
    reportLink: r.reportLink,
    boardFeedback: r.boardFeedback,
  }));
}

async function getStats(now: Date) {
  const [tasks, deps, reports] = await Promise.all([
    prisma.task.findMany({ where: { parentId: null } }),
    prisma.dependency.findMany(),
    prisma.report.findMany(),
  ]);
  const byStatus: Record<string, number> = {};
  const byTeam: Record<string, number> = {};
  let overdue = 0;
  let critical = 0;
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    byTeam[t.team] = (byTeam[t.team] ?? 0) + 1;
    if (t.status !== "DONE") {
      if (alertStatus(t, now) === "OVERDUE") overdue++;
      if (t.priority === "CRITICAL") critical++;
    }
  }
  const depsWaiting = deps.filter((d) => d.status === "WAITING").length;
  const reportsNotSubmitted = reports.filter((r) => r.status !== "SUBMITTED").length;
  return { totalTasks: tasks.length, byStatus, byTeam, overdue, critical, depsWaiting, reportsNotSubmitted };
}

/** Chạy 1 tool theo tên — ném lỗi nếu tên không hợp lệ, để caller trả is_error cho Claude. */
export async function runAiTool(
  name: string,
  input: Record<string, unknown>,
  now: Date = new Date(),
): Promise<unknown> {
  switch (name) {
    case "search_tasks":
      return searchTasks(input as SearchTasksInput, now);
    case "get_task_detail":
      return getTaskDetail(input as { id: string });
    case "get_team_summary":
      return getTeamSummary(input as { team: string }, now);
    case "get_dependencies":
      return getDependencies(input as { status?: string; partner?: string }, now);
    case "get_reports":
      return getReports(input as { type?: string; status?: string });
    case "get_stats":
      return getStats(now);
    default:
      throw new Error(`Tool không tồn tại: ${name}`);
  }
}
