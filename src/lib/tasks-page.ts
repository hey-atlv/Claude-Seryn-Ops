import type { Leader, Task } from "@/generated/prisma/client";
import { alertStatus, isSilent } from "./alerts";
import { prisma } from "./db";
import { leaderLabel } from "./leader-core";
import { priorityScore } from "./priority";
import { generateRecurring } from "./recurring";
import type {
  SubItemRow,
  TaskRow,
  TasksPageData,
} from "./task-row";

// Data loader cho trang /tasks (Giai đoạn D) — chạy trên server, serialize
// Date → ISO string để truyền xuống client components (types ở task-row.ts).

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toTaskRow(
  task: Task & { leader: Leader | null; subItems: Task[] },
  now: Date,
): TaskRow {
  const subItems: SubItemRow[] = task.subItems
    .map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      deadline: iso(s.deadline),
    }))
    .sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    team: task.team,
    leaderId: task.leaderId,
    leaderName: task.leader ? leaderLabel(task.leader) : null,
    category: task.category,
    status: task.status,
    startDate: iso(task.startDate),
    deadline: iso(task.deadline),
    priority: task.priority,
    revenueImpact: task.revenueImpact,
    lastUpdateAt: iso(task.lastUpdateAt),
    lastUpdateNote: task.lastUpdateNote,
    outputLink: task.outputLink,
    note: task.note,
    hiddenAt: iso(task.hiddenAt),
    createdAt: task.createdAt.toISOString(),
    priorityScore: priorityScore(task, now),
    alertStatus: alertStatus(task, now),
    isSilent: isSilent(task, now),
    subItems,
  };
}

export async function getTasksPageData(
  now: Date = new Date(),
): Promise<TasksPageData> {
  // Trang /tasks có thể được mở trước Dashboard — vẫn sinh việc định kỳ (idempotent)
  await generateRecurring(now);

  const [tasks, leaders, templates] = await Promise.all([
    prisma.task.findMany({
      where: { parentId: null },
      include: { leader: true, subItems: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leader.findMany({ orderBy: { name: "asc" } }),
    prisma.recurringTemplate.findMany({
      where: { targetDb: "TASK", active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    tasks: tasks.map((t) => toTaskRow(t, now)),
    leaders: leaders.map((l) => ({
      id: l.id,
      name: l.name,
      team: l.team,
      channel: l.channel,
    })),
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      defaults: t.defaults,
      subItemsTemplate: t.subItemsTemplate,
    })),
  };
}
