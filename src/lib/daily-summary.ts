import type { Leader, Task } from "@/generated/prisma/client";
import { alertStatus, isSilent } from "./alerts";
import type { TaskWithMeta } from "./dashboard";
import { prisma } from "./db";
import { priorityScore } from "./priority";
import { endOfTodayVN, startOfTodayVN } from "./timezone";

// F2 — Tóm tắt cuối ngày (thay prompt 5.3 của quy trình cũ): 4 nhóm +
// "việc quan trọng nhất sáng mai" (task điểm ưu tiên cao nhất chưa Done).

export interface DailySummary {
  doneToday: TaskWithMeta[];
  inProgress: TaskWithMeta[];
  overdue: TaskWithMeta[];
  dueSoon: TaskWithMeta[];
  topTomorrow: TaskWithMeta | null;
}

export async function getDailySummary(
  now: Date = new Date(),
): Promise<DailySummary> {
  const withMeta = (t: Task & { leader: Leader | null }): TaskWithMeta => ({
    ...t,
    priorityScore: priorityScore(t, now),
    alertStatus: alertStatus(t, now),
    isSilent: isSilent(t, now),
  });

  const [doneRaw, openRaw] = await Promise.all([
    prisma.task.findMany({
      where: {
        status: "DONE",
        parentId: null,
        completedAt: { gte: startOfTodayVN(now), lte: endOfTodayVN(now) },
      },
      include: { leader: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { status: { not: "DONE" }, parentId: null },
      include: { leader: true },
    }),
  ]);

  const open = openRaw
    .map(withMeta)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    doneToday: doneRaw.map(withMeta),
    inProgress: open.filter((t) => t.status === "IN_PROGRESS"),
    overdue: open.filter((t) => t.alertStatus === "OVERDUE"),
    dueSoon: open.filter((t) => t.alertStatus === "DUE_SOON"),
    topTomorrow: open[0] ?? null,
  };
}
