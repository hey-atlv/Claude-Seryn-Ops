import { prisma } from "./db";
import { syncTaskToCalendar } from "./google-sync";
import {
  isDue,
  isoWeek,
  periodKey,
  periodLabel,
  scheduledDeadlineVN,
  vnParts,
  type ScheduleType,
} from "./recurring-core";

// Sinh task/báo cáo định kỳ từ RecurringTemplate — idempotent theo (templateId, kỳ).
// Được gọi mỗi lần mở Dashboard; unique constraint trong DB chặn race condition.

export async function generateRecurring(now: Date = new Date()): Promise<number> {
  const templates = await prisma.recurringTemplate.findMany({
    where: { active: true, scheduleType: { in: ["WEEKLY", "MONTHLY"] } },
  });
  let created = 0;

  for (const tpl of templates) {
    const type = tpl.scheduleType as ScheduleType;
    const scheduleDay = tpl.scheduleDay ?? 1;
    if (!isDue(type, scheduleDay, now)) continue;

    const key = periodKey(type, now);
    const deadline = scheduledDeadlineVN(type, scheduleDay, now);
    const defaults = JSON.parse(tpl.defaults) as Record<string, string>;

    try {
      if (tpl.targetDb === "TASK") {
        const exists = await prisma.task.findFirst({
          where: { recurringTemplateId: tpl.id, recurrenceKey: key },
          select: { id: true },
        });
        if (exists) continue;
        const leader = defaults.team
          ? await prisma.leader.findFirst({ where: { team: defaults.team } })
          : null;
        const newTask = await prisma.task.create({
          data: {
            title: `${tpl.name} (${periodLabel(type, now)})`,
            type: defaults.type ?? "TASK",
            team: defaults.team ?? "DIGITAL",
            leaderId: leader?.id,
            category: defaults.category ?? null,
            priority: defaults.priority ?? "NORMAL",
            revenueImpact: defaults.revenueImpact ?? "MEDIUM",
            deadline,
            recurringTemplateId: tpl.id,
            recurrenceKey: key,
          },
        });
        await syncTaskToCalendar(newTask.id);
      } else {
        const exists = await prisma.report.findFirst({
          where: { recurringTemplateId: tpl.id, recurrenceKey: key },
          select: { id: true },
        });
        if (exists) continue;
        const p = vnParts(now);
        const w = isoWeek(p.year, p.month, p.day);
        // Quy ước đặt tên DB3 theo phụ lục tài liệu
        const title =
          defaults.type === "MONTHLY"
            ? `Báo cáo tháng ${p.month}/${p.year}`
            : `Update tuần ${w.week}/${w.year}`;
        await prisma.report.create({
          data: {
            title,
            type: defaults.type ?? "WEEKLY",
            dueDate: deadline,
            recurringTemplateId: tpl.id,
            recurrenceKey: key,
          },
        });
      }
      created++;
    } catch (error: unknown) {
      // P2002 = kỳ này vừa được sinh bởi request song song — bỏ qua an toàn
      if ((error as { code?: string })?.code !== "P2002") throw error;
    }
  }
  return created;
}
