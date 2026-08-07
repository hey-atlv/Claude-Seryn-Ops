import { alertStatus, isSilent } from "./alerts";
import {
  DEPENDENCY_STALE_DAYS,
  PARTNER_LABELS,
  TEAM_LABELS,
  type Partner,
  type Team,
} from "./constants";
import { prisma } from "./db";
import { pullCalendarChanges } from "./google-sync";
import { pullSheetChanges } from "./google-sheets";
import { priorityScore } from "./priority";
import { generateRecurring } from "./recurring";
import { periodKey, periodLabel } from "./recurring-core";
import { formatVN } from "./timezone";
import {
  daysSitting,
  pickTodayTasks,
  projectLight,
  projectProgress,
} from "./today-core";
import type { BannerItemRow, TodayData } from "./today-row";

// Data loader màn "Hôm nay" (phương án 15 phút) — mỗi task chỉ xuất hiện
// đúng 1 khối theo mục đích. /api/dashboard vẫn dùng dashboard.ts cũ.

const DAY_MS = 86_400_000;

const teamLabel = (team: string) => TEAM_LABELS[team as Team] ?? team;

export async function getTodayData(now: Date = new Date()): Promise<TodayData> {
  const generatedNow = await generateRecurring(now);
  // Chạy ngầm không chặn luồng load trang chính để tối ưu tốc độ phản hồi
  pullCalendarChanges().catch((err) =>
    console.error("[GoogleSync] Kéo calendar changes ngầm thất bại:", err)
  );
  pullSheetChanges().catch((err) =>
    console.error("[GoogleSheets] Kéo sheet changes ngầm thất bại:", err)
  );
  const weekKey = periodKey("WEEKLY", now);

  const [tasks, staleDeps, stat] = await Promise.all([
    prisma.task.findMany({
      where: { parentId: null },
      include: { leader: true, subItems: true },
    }),
    prisma.dependency.findMany({
      where: {
        status: "WAITING",
        createdAt: {
          lt: new Date(now.getTime() - DEPENDENCY_STALE_DAYS * DAY_MS),
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.weeklyStat.findUnique({ where: { weekKey } }),
  ]);

  const open = tasks.filter((t) => t.status !== "DONE");
  const withMeta = open.map((t) => ({
    ...t,
    alertStatus: alertStatus(t, now),
    priorityScore: priorityScore(t, now),
  }));

  // ① Banner cảnh báo gộp
  const overdue: BannerItemRow[] = withMeta
    .filter((t) => t.alertStatus === "OVERDUE")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((t) => ({
      id: t.id,
      title: t.title,
      sub: `${teamLabel(t.team)} · ${t.leader?.name ?? "chưa gán leader"} · hạn ${formatVN(t.deadline!, "dd/MM")}`,
      href: "/tasks",
    }));

  const silent: BannerItemRow[] = withMeta
    .filter((t) => isSilent(t, now))
    .map((t) => {
      const lastSignal = t.lastUpdateAt ?? t.createdAt;
      const days = Math.floor((now.getTime() - lastSignal.getTime()) / DAY_MS);
      return {
        id: t.id,
        title: t.title,
        sub: `${teamLabel(t.team)} · ${t.leader?.name ?? "chưa gán leader"} · im lặng ${days} ngày`,
        href: "/tasks",
      };
    });

  const staleDepRows: BannerItemRow[] = staleDeps.map((d) => ({
    id: d.id,
    title: d.title,
    sub: `${PARTNER_LABELS[d.partner as Partner] ?? d.partner} · chờ ${Math.floor(
      (now.getTime() - d.createdAt.getTime()) / DAY_MS,
    )} ngày`,
    href: "/dependencies",
  }));

  // ② Hôm nay làm gì — tối đa 7 việc. Task REVIEW không vào đây:
  // nó đã nằm khối ④ "Chờ sếp quyết" (nguyên tắc mỗi task đúng 1 nơi).
  const actionable = withMeta.filter((t) => t.status !== "REVIEW");
  const todayTasks = pickTodayTasks(actionable, now).map((t) => ({
    id: t.id,
    title: t.title,
    leaderName: t.leader?.name ?? null,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    priority: t.priority,
    alertStatus: t.alertStatus,
  }));

  // ③ Tiến độ dự án — đèn 🔴 đứng im / 🟡 việc con trễ / 🟢
  const LIGHT_ORDER = { RED: 0, YELLOW: 1, GREEN: 2 } as const;
  const projects = open
    .filter((t) => t.type === "PROJECT")
    .map((p) => {
      const light = projectLight(
        p.subItems,
        p.lastUpdateAt ?? p.updatedAt,
        p.deadline,
        now,
      );
      const prog = projectProgress(p.subItems);
      return {
        id: p.id,
        title: p.title,
        teamLabel: teamLabel(p.team),
        team: p.team,
        leaderName: p.leader?.name ?? null,
        light,
        ...prog,
      };
    })
    .sort((a, b) => LIGHT_ORDER[a.light] - LIGHT_ORDER[b.light]);

  // ④ Chờ sếp quyết — status REVIEW, nằm lâu nhất trước
  const reviews = withMeta
    .filter((t) => t.status === "REVIEW")
    .map((t) => ({
      id: t.id,
      title: t.title,
      teamLabel: teamLabel(t.team),
      leaderName: t.leader?.name ?? null,
      days: daysSitting(t.updatedAt, now),
    }))
    .sort((a, b) => b.days - a.days);

  return {
    generatedNow,
    overdue,
    silent,
    staleDeps: staleDepRows,
    todayTasks,
    projects,
    reviews,
    weekKey,
    weekLabel: periodLabel("WEEKLY", now),
    weeklyStat: stat
      ? {
          revenue: stat.revenue,
          planPct: stat.planPct,
          roas: stat.roas,
          note: stat.note,
        }
      : null,
  };
}
