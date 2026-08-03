import { prisma } from "./db";
import {
  nextOccurrenceVN,
  parseDefaults,
  parseSubItems,
  periodKey,
  periodLabel,
  scheduleText,
  type RecurringDefaults,
  type ScheduleType,
} from "./recurring-core";

// Dữ liệu cho màn Cài đặt › Việc định kỳ: template + tình trạng sinh của từng cái.

export interface RecurringTemplateRow {
  id: string;
  name: string;
  targetDb: string;
  scheduleType: string;
  scheduleDay: number | null;
  defaults: RecurringDefaults;
  subItems: string[];
  active: boolean;
  /** Mô tả lịch cho UI, VD "Hằng tháng · ngày 1" */
  scheduleText: string;
  /** ISO — ngày hẹn kế tiếp; null khi template không tự sinh */
  nextRunAt: string | null;
  /** VD "tháng 8/2026"; null khi template không tự sinh */
  currentPeriodLabel: string | null;
  generatedThisPeriod: boolean;
  generatedCount: number;
  lastGeneratedAt: string | null;
}

interface GenerationStat {
  count: number;
  lastAt: Date | null;
  keys: Set<string>;
}

const EMPTY_STAT: GenerationStat = { count: 0, lastAt: null, keys: new Set() };

function isAutoSchedule(scheduleType: string): scheduleType is ScheduleType {
  return scheduleType === "WEEKLY" || scheduleType === "MONTHLY";
}

export async function getRecurringPageData(
  now: Date = new Date(),
): Promise<RecurringTemplateRow[]> {
  const templates = await prisma.recurringTemplate.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  if (templates.length === 0) return [];

  const ids = templates.map((t) => t.id);
  const select = {
    recurringTemplateId: true,
    recurrenceKey: true,
    createdAt: true,
  } as const;
  // Task và Report cùng shape (templateId, kỳ, thời điểm tạo) nên gộp thống kê một lượt
  const [tasks, reports] = await Promise.all([
    prisma.task.findMany({ where: { recurringTemplateId: { in: ids } }, select }),
    prisma.report.findMany({ where: { recurringTemplateId: { in: ids } }, select }),
  ]);

  const stats = new Map<string, GenerationStat>();
  for (const row of [...tasks, ...reports]) {
    if (!row.recurringTemplateId) continue;
    const stat = stats.get(row.recurringTemplateId) ?? {
      count: 0,
      lastAt: null,
      keys: new Set<string>(),
    };
    stat.count += 1;
    if (!stat.lastAt || row.createdAt > stat.lastAt) stat.lastAt = row.createdAt;
    if (row.recurrenceKey) stat.keys.add(row.recurrenceKey);
    stats.set(row.recurringTemplateId, stat);
  }

  return templates.map((tpl) => {
    const stat = stats.get(tpl.id) ?? EMPTY_STAT;
    // Gán ra biến const để type guard thu hẹp được kiểu ở các nhánh bên dưới
    const scheduleType = tpl.scheduleType;
    const auto = isAutoSchedule(scheduleType);
    const key = auto ? periodKey(scheduleType, now) : null;

    return {
      id: tpl.id,
      name: tpl.name,
      targetDb: tpl.targetDb,
      scheduleType: tpl.scheduleType,
      scheduleDay: tpl.scheduleDay,
      defaults: parseDefaults(tpl.defaults),
      subItems: parseSubItems(tpl.subItemsTemplate),
      active: tpl.active,
      scheduleText: scheduleText(tpl.scheduleType, tpl.scheduleDay),
      nextRunAt: auto
        ? nextOccurrenceVN(scheduleType, tpl.scheduleDay ?? 1, now).toISOString()
        : null,
      currentPeriodLabel: auto ? periodLabel(scheduleType, now) : null,
      generatedThisPeriod: key ? stat.keys.has(key) : false,
      generatedCount: stat.count,
      lastGeneratedAt: stat.lastAt ? stat.lastAt.toISOString() : null,
    };
  });
}
