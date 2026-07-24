import { isSilent } from "./alerts";
import { prisma } from "./db";
import type { NotifyItem } from "./notify-core";
import { getDependencyAlerts } from "./telegram-alerts";
import { daysSitting } from "./today-core";
import { doneOnTimeRate, REVIEW_STUCK_DAYS, type DoneRate } from "./metrics-core";

// Loader DB cho trang "Sức khỏe hệ thống" — tái dùng nguyên isSilent (alerts.ts),
// getDependencyAlerts (telegram-alerts.ts) và daysSitting (today-core.ts) để
// không nhân bản logic đã test kỹ.

export interface HealthTaskItem {
  id: string;
  title: string;
  leader: string | null;
  days: number;
}

export interface HealthMetrics {
  doneRate: DoneRate;
  reviewStuck: HealthTaskItem[];
  depSlaBreached: NotifyItem[];
  silentTasks: HealthTaskItem[];
  openTaskCount: number;
}

export async function getHealthMetrics(
  now: Date = new Date(),
): Promise<HealthMetrics> {
  const [doneTasks, reviewTasks, inProgress, openTaskCount, depSlaBreached] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          status: "DONE",
          parentId: null,
          deadline: { not: null },
          completedAt: { not: null },
        },
        select: { deadline: true, completedAt: true },
      }),
      prisma.task.findMany({
        where: { status: "REVIEW", parentId: null },
        include: { leader: true },
      }),
      prisma.task.findMany({
        where: { status: "IN_PROGRESS", parentId: null },
        include: { leader: true },
      }),
      prisma.task.count({
        where: { status: { not: "DONE" }, parentId: null },
      }),
      getDependencyAlerts(now),
    ]);

  const reviewStuck: HealthTaskItem[] = reviewTasks
    .map((t) => ({
      id: t.id,
      title: t.title,
      leader: t.leader?.name ?? null,
      days: daysSitting(t.updatedAt, now),
    }))
    .filter((t) => t.days > REVIEW_STUCK_DAYS)
    .sort((a, b) => b.days - a.days);

  const silentTasks: HealthTaskItem[] = inProgress
    .filter((t) => isSilent(t, now))
    .map((t) => ({
      id: t.id,
      title: t.title,
      leader: t.leader?.name ?? null,
      days: daysSitting(t.lastUpdateAt ?? t.createdAt, now),
    }))
    .sort((a, b) => b.days - a.days);

  return {
    doneRate: doneOnTimeRate(doneTasks),
    reviewStuck,
    depSlaBreached,
    silentTasks,
    openTaskCount,
  };
}
