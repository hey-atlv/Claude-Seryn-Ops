import type { DailySummary } from "./daily-summary";
import { guessDraftFromLine, type QuickCaptureDraft } from "./inbox-core";
import type { NotifyItem, NotifyTier } from "./notify-core";
import { formatVN } from "./timezone";

// I — Lõi thuần cho bot Telegram: xác thực chat ID, giờ gửi tóm tắt cuối ngày,
// format tin nhắn cảnh báo/tóm tắt. Không đụng DB/API Telegram để test được.

/** I4 — chỉ xử lý tin nhắn từ đúng 1 chat ID whitelist trong .env. */
export function isAuthorizedChat(
  chatId: string,
  allowedChatId: string | undefined,
): boolean {
  return allowedChatId !== undefined && chatId === allowedChatId;
}

/**
 * I3 — gửi tóm tắt cuối ngày đúng 1 lần/ngày, từ 17:30 giờ VN trở đi.
 * `lastEodDate !== todayVN` tự debounce, chịu được restart/lệch giờ tick.
 */
export function shouldSendEodSummary(
  nowHHmm: string,
  todayVN: string,
  lastEodDate: string | null,
): boolean {
  return nowHHmm >= "17:30" && lastEodDate !== todayVN;
}

const TIER_ORDER: NotifyTier[] = ["CRITICAL", "HIGH", "NORMAL"];

const TIER_LABEL: Record<NotifyTier, string> = {
  CRITICAL: "🔴 Khẩn cấp",
  HIGH: "🟠 Ưu tiên cao",
  NORMAL: "🟡 Sắp đến hạn",
};

/** I2 — gộp các NotifyItem đã lọc theo tầng thành 1 tin nhắn Telegram. */
export function buildAlertMessage(items: NotifyItem[]): string {
  if (items.length === 0) return "";

  const byTier = new Map<NotifyTier, NotifyItem[]>();
  for (const item of items) {
    const list = byTier.get(item.tier) ?? [];
    list.push(item);
    byTier.set(item.tier, list);
  }

  const sections = TIER_ORDER.filter((tier) => byTier.has(tier)).map(
    (tier) => {
      const lines = byTier
        .get(tier)!
        .map((item) => `• ${item.title} — ${item.detail}`);
      return `${TIER_LABEL[tier]}\n${lines.join("\n")}`;
    },
  );

  return `📋 Cảnh báo Seryn Ops\n\n${sections.join("\n\n")}`;
}

interface SummaryTaskLike {
  title: string;
  leader: { name: string } | null;
  deadline: Date | null;
}

function taskLine(t: SummaryTaskLike): string {
  const who = t.leader?.name ?? "chưa gán leader";
  const deadlineTxt = t.deadline
    ? `hạn ${formatVN(t.deadline, "dd/MM")}`
    : "chưa có deadline";
  return `• ${t.title} — ${who} · ${deadlineTxt}`;
}

function group(label: string, tasks: SummaryTaskLike[], emptyText: string): string {
  const body = tasks.length ? tasks.map(taskLine).join("\n") : emptyText;
  return `${label} (${tasks.length})\n${body}`;
}

/** I3 — format tóm tắt cuối ngày: 4 nhóm + việc quan trọng nhất sáng mai. */
export function buildEodMessage(summary: DailySummary): string {
  const parts = ["🌙 Tóm tắt cuối ngày — Seryn Ops"];

  if (summary.topTomorrow) {
    parts.push(
      `⭐ Việc quan trọng nhất sáng mai:\n${taskLine(summary.topTomorrow)}`,
    );
  }

  parts.push(group("✅ Hoàn thành hôm nay", summary.doneToday, "chưa có"));
  parts.push(group("🔄 Đang làm", summary.inProgress, "không có"));
  parts.push(group("🔴 Quá hạn", summary.overdue, "không có, tốt!"));
  parts.push(group("⚠️ Sắp đến hạn", summary.dueSoon, "không có"));

  return parts.join("\n\n");
}

/**
 * P1-d — gửi bản tin sáng đúng 1 lần/ngày, từ 07:30 giờ VN trở đi.
 * Cùng cơ chế debounce với tóm tắt cuối ngày (lastMorningDate !== todayVN).
 */
export function shouldSendMorningBrief(
  nowHHmm: string,
  todayVN: string,
  lastMorningDate: string | null,
): boolean {
  return nowHHmm >= "07:30" && lastMorningDate !== todayVN;
}

/**
 * P1-d — format bản tin sáng cho CMO: việc quan trọng nhất, quá hạn,
 * sắp hạn, đang làm — nắm tình hình trước khi mở máy.
 */
export function buildMorningMessage(summary: DailySummary): string {
  const parts = ["☀️ Bản tin sáng — Seryn Ops"];

  if (summary.topTomorrow) {
    parts.push(
      `⭐ Việc quan trọng nhất hôm nay:\n${taskLine(summary.topTomorrow)}`,
    );
  }

  parts.push(group("🔴 Quá hạn — hỏi leader ngay", summary.overdue, "không có, tốt!"));
  parts.push(group("⚠️ Đến hạn ≤2 ngày", summary.dueSoon, "không có"));
  parts.push(group("🔄 Đang làm", summary.inProgress, "không có"));

  return parts.join("\n\n");
}

/** I1 — tách deadline khỏi text/caption nhận từ Telegram, tái dùng H3. */
export function draftFromTelegramText(text: string): QuickCaptureDraft {
  return guessDraftFromLine(text.trim());
}
