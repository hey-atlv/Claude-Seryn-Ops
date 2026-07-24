import type { Dependency, Leader, Task } from "@/generated/prisma/client";
import { alertStatus, isSilent, type AlertStatus } from "./alerts";
import { DEPENDENCY_STALE_DAYS, TEAM_LABELS, TEAMS, type Team } from "./constants";
import { prisma } from "./db";
import { priorityScore } from "./priority";
import { generateRecurring } from "./recurring";
import { endOfTodayVN, startOfTodayVN } from "./timezone";

// Dữ liệu 4 khối Home Dashboard (mục 2.4 tài liệu) — dùng chung cho trang chủ
// (server component) và endpoint /api/dashboard.

const DAY_MS = 86_400_000;

export type TaskWithMeta = Task & {
  leader: Leader | null;
  priorityScore: number;
  alertStatus: AlertStatus;
  isSilent: boolean;
};

export type DependencyWithMeta = Dependency & { waitingDays: number };

export interface DashboardData {
  generatedNow: number;
  byTeam: { team: Team; label: string; count: number }[];
  important: TaskWithMeta[];
  today: TaskWithMeta[];
  alerts: { tasks: TaskWithMeta[]; dependencies: DependencyWithMeta[] };
  silent: TaskWithMeta[];
}

export async function getDashboardData(
  now: Date = new Date(),
): Promise<DashboardData> {
  // Sinh task/báo cáo định kỳ đến hạn — idempotent theo kỳ
  const generatedNow = await generateRecurring(now);

  const openTasks = await prisma.task.findMany({
    where: { status: { not: "DONE" }, parentId: null },
    include: { leader: true },
  });
  const withMeta: TaskWithMeta[] = openTasks.map((t) => ({
    ...t,
    priorityScore: priorityScore(t, now),
    alertStatus: alertStatus(t, now),
    isSilent: isSilent(t, now),
  }));

  const byTeam = TEAMS.map((team) => ({
    team,
    label: TEAM_LABELS[team],
    count: withMeta.filter((t) => t.team === team).length,
  }));

  const important = withMeta
    .filter((t) => t.priority === "HIGH" || t.priority === "CRITICAL")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const todayStart = startOfTodayVN(now);
  const todayEnd = endOfTodayVN(now);
  const today = withMeta.filter(
    (t) => t.deadline && t.deadline >= todayStart && t.deadline <= todayEnd,
  );

  const alertTasks = withMeta
    .filter((t) => t.alertStatus === "OVERDUE" || t.alertStatus === "DUE_SOON")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const staleDeps = await prisma.dependency.findMany({
    where: {
      status: "WAITING",
      createdAt: { lt: new Date(now.getTime() - DEPENDENCY_STALE_DAYS * DAY_MS) },
    },
    orderBy: { createdAt: "asc" },
  });
  const dependencies: DependencyWithMeta[] = staleDeps.map((d) => ({
    ...d,
    waitingDays: Math.floor((now.getTime() - d.createdAt.getTime()) / DAY_MS),
  }));

  const silent = withMeta.filter((t) => t.isSilent);

  return {
    generatedNow,
    byTeam,
    important,
    today,
    alerts: { tasks: alertTasks, dependencies },
    silent,
  };
}
