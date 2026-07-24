import { alertStatus } from "./alerts";
import { PARTNER_LABELS, type Partner } from "./constants";
import { prisma } from "./db";
import { getNotifications } from "./notifications";
import type { NotifyItem } from "./notify-core";
import { formatVN } from "./timezone";

// I2 — Cảnh báo Dependency trễ SLA cho bot Telegram, KHÔNG đụng notifications.ts
// (chuông trong app) — kênh riêng, tránh ảnh hưởng hành vi web đã test kỹ.

/** Dependency đang mở (chưa CLOSED) mà đã quá SLA → tier HIGH. */
export async function getDependencyAlerts(
  now: Date = new Date(),
): Promise<NotifyItem[]> {
  const open = await prisma.dependency.findMany({
    where: { status: { not: "CLOSED" } },
  });

  const items: NotifyItem[] = [];
  for (const d of open) {
    if (
      alertStatus({ status: d.status, deadline: d.slaDate }, now) !==
      "OVERDUE"
    ) {
      continue;
    }
    const partnerLabel = PARTNER_LABELS[d.partner as Partner] ?? d.partner;
    items.push({
      id: `dep-${d.id}`,
      tier: "HIGH",
      title: `🔗 Trễ SLA: ${d.title}`,
      detail: `Phối hợp ${partnerLabel} · SLA ${formatVN(d.slaDate!, "dd/MM")}`,
      href: "/dependencies",
    });
  }
  return items;
}

/** Gộp cảnh báo Task (F1 có sẵn) + Dependency trễ SLA cho bot Telegram. */
export async function getCombinedAlerts(
  now: Date = new Date(),
): Promise<NotifyItem[]> {
  const [taskItems, depItems] = await Promise.all([
    getNotifications(now),
    getDependencyAlerts(now),
  ]);
  return [...taskItems, ...depItems];
}
