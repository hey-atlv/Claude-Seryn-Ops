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

/**
 * Vi phạm unique constraint có được phép bỏ qua không. Prisma engine cũ trả
 * P2002; driver adapter libsql (Turso) bọc thành P2039 kèm message SQLITE_CONSTRAINT
 * — phải nhận cả hai, nếu không race lúc mở Dashboard song song sẽ sập trang.
 */
function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  if (e?.code === "P2002") return true;
  return e?.code === "P2039" && (e?.message ?? "").includes("UNIQUE constraint failed");
}

export async function generateRecurring(now: Date = new Date()): Promise<number> {
  const templates = await prisma.recurringTemplate.findMany({
    where: { active: true, scheduleType: { in: ["WEEKLY", "MONTHLY"] } },
  });

  // Lọc danh sách template thực sự đến hạn hôm nay
  const dueTemplates = templates.filter(tpl => {
    const type = tpl.scheduleType as ScheduleType;
    const scheduleDay = tpl.scheduleDay ?? 1;
    return isDue(type, scheduleDay, now);
  });

  if (dueTemplates.length === 0) return 0;

  const tplIds = dueTemplates.map(t => t.id);
  const keys = dueTemplates.map(t => periodKey(t.scheduleType as ScheduleType, now));

  // Query gom cụm một lần để tránh truy vấn DB lặp lại trong vòng lặp (N+1 query)
  const [existingTasks, existingReports] = await Promise.all([
    prisma.task.findMany({
      where: {
        recurringTemplateId: { in: tplIds },
        recurrenceKey: { in: keys },
      },
      select: { recurringTemplateId: true, recurrenceKey: true },
    }),
    prisma.report.findMany({
      where: {
        recurringTemplateId: { in: tplIds },
        recurrenceKey: { in: keys },
      },
      select: { recurringTemplateId: true, recurrenceKey: true },
    }),
  ]);

  const taskExistsSet = new Set(existingTasks.map(t => `${t.recurringTemplateId}::${t.recurrenceKey}`));
  const reportExistsSet = new Set(existingReports.map(r => `${r.recurringTemplateId}::${r.recurrenceKey}`));

  let created = 0;

  for (const tpl of dueTemplates) {
    const type = tpl.scheduleType as ScheduleType;
    const scheduleDay = tpl.scheduleDay ?? 1;
    const key = periodKey(type, now);
    const deadline = scheduledDeadlineVN(type, scheduleDay, now);
    const defaults = JSON.parse(tpl.defaults) as Record<string, string>;

    try {
      if (tpl.targetDb === "TASK") {
        if (taskExistsSet.has(`${tpl.id}::${key}`)) continue;
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
        syncTaskToCalendar(newTask.id).catch((err) =>
          console.error("[GoogleSync] Sync task to calendar ngầm thất bại:", err)
        );
      } else {
        if (reportExistsSet.has(`${tpl.id}::${key}`)) continue;
        const p = vnParts(now);
        const w = isoWeek(p.year, p.month, p.day);
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
      // Kỳ này vừa được sinh bởi request song song — bỏ qua an toàn
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return created;
}