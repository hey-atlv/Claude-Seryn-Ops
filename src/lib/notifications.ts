import { alertStatus } from "./alerts";
import { prisma } from "./db";
import { daysUntilVN, formatVN } from "./timezone";
import type { NotifyItem } from "./notify-core";

// F1 — quét task đang mở, sinh danh sách nhắc việc theo 3 tầng:
// CRITICAL: mọi task Critical đang mở
// HIGH: task quá hạn (mọi ưu tiên), kẹt duyệt REVIEW ≥2 ngày,
//       hoặc task Cao sắp đến hạn (≤2 ngày)
// NORMAL: task có deadline hôm nay hoặc ngày mai
// Mỗi task chỉ sinh đúng 1 thông báo — nhánh đầu tiên khớp thắng.

const TIER_ORDER: Record<NotifyItem["tier"], number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
};

export async function getNotifications(
  now: Date = new Date(),
): Promise<NotifyItem[]> {
  const open = await prisma.task.findMany({
    where: { status: { not: "DONE" }, parentId: null },
    include: { leader: true },
  });

  const items: NotifyItem[] = [];
  for (const t of open) {
    const alert = alertStatus(t, now);
    const who = t.leader?.name ?? "chưa gán leader";
    const deadlineTxt = t.deadline
      ? `deadline ${formatVN(t.deadline, "dd/MM")}`
      : "chưa có deadline";

    const reviewDays = Math.floor(
      (now.getTime() - t.updatedAt.getTime()) / 86_400_000,
    );
    const dueDays = t.deadline ? daysUntilVN(t.deadline, now) : null;

    if (t.priority === "CRITICAL") {
      items.push({
        id: `crit-${t.id}`,
        tier: "CRITICAL",
        title: `🔴 ${t.title}`,
        detail: `Critical · ${who} · ${deadlineTxt}`,
        href: "/tasks",
      });
    } else if (t.status === "REVIEW" && reviewDays >= 2) {
      items.push({
        id: `review-${t.id}`,
        tier: "HIGH",
        title: `⏳ Kẹt duyệt ${reviewDays} ngày: ${t.title}`,
        detail: `Chờ sếp quyết · ${who} · ${deadlineTxt}`,
        href: "/tasks",
      });
    } else if (alert === "OVERDUE") {
      items.push({
        id: `over-${t.id}`,
        tier: "HIGH",
        title: `⏰ Quá hạn: ${t.title}`,
        detail: `${who} · ${deadlineTxt}`,
        href: "/tasks",
      });
    } else if (t.priority === "HIGH" && alert === "DUE_SOON") {
      items.push({
        id: `high-${t.id}`,
        tier: "HIGH",
        title: `🟡 Sắp hạn: ${t.title}`,
        detail: `Ưu tiên cao · ${who} · ${deadlineTxt}`,
        href: "/tasks",
      });
    } else if (t.deadline && (dueDays === 0 || dueDays === 1)) {
      items.push({
        // id kèm ngày deadline → đổi deadline là nhắc lại như thông báo mới
        id: `due-${t.id}-${formatVN(t.deadline, "yyyy-MM-dd")}`,
        tier: "NORMAL",
        title: `📅 ${t.title}`,
        detail: `Deadline ${dueDays === 0 ? "hôm nay" : "ngày mai"} · ${who}`,
        href: "/tasks?view=calendar",
      });
    }
  }

  return items.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
}
