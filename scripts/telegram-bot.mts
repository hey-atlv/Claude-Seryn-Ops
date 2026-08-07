import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Bot, type Context } from "grammy";
import {
  ATTACHMENT_EXT_TO_TYPE,
  attachmentsDir,
  extOf,
  MAX_ATTACHMENT_BYTES,
  safeAttachmentName,
} from "../src/lib/attachments";
import { buildAiAlertMessage, buildAiEodMessage } from "../src/lib/ai-telegram";
import { proposeTriage } from "../src/lib/ai-triage";
import { getDailySummary } from "../src/lib/daily-summary";
import { prisma } from "../src/lib/db";
import { extractText } from "../src/lib/inbox-parse";
import { getCombinedAlerts } from "../src/lib/telegram-alerts";
import { filterDue } from "../src/lib/notify-core";
import {
  buildMorningMessage,
  draftFromTelegramText,
  isAuthorizedChat,
  shouldSendEodSummary,
  shouldSendMorningBrief,
} from "../src/lib/telegram-core";
import { formatVN } from "../src/lib/timezone";

// Giai đoạn I — bot Telegram 2 chiều, chạy long-polling (không cần domain/HTTPS
// public). Đứng ngoài Next.js: import "dotenv/config" để tự nạp .env, import
// hàm thuần/DB từ src/lib bằng relative path (giống prisma/seed.mts). Mọi lỗi
// bị bọc try/catch riêng theo pattern "never break" của google-sync.ts — 1 tin
// nhắn/1 lần gửi cảnh báo lỗi không được làm chết vòng lặp poll.

const TELEGRAM_STATE_ID = "default";
const TICK_MS = 5 * 60_000; // khớp nhịp poll chuông trong app (F1)

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} chưa được cấu hình — kiểm tra file .env`);
  return v;
}

const BOT_TOKEN = requireEnv("TELEGRAM_BOT_TOKEN");
const bot = new Bot(BOT_TOKEN);

function allowedChatId(): string | undefined {
  return process.env.TELEGRAM_CHAT_ID;
}

async function logError(context: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[TelegramBot] ${context}:`, err);
  await prisma.telegramState
    .upsert({
      where: { id: TELEGRAM_STATE_ID },
      create: { id: TELEGRAM_STATE_ID, lastError: message },
      update: { lastError: message },
    })
    .catch(() => {});
}

/** I4 — chỉ chat ID whitelist mới được xử lý; chưa cấu hình thì trả chat ID để bootstrap. */
async function authorize(chatId: string, ctx: Context): Promise<boolean> {
  const allowed = allowedChatId();
  if (!allowed) {
    await ctx.reply(
      `Chưa cấu hình TELEGRAM_CHAT_ID. Chat ID của bạn là: ${chatId}\n` +
        `Dán vào .env (TELEGRAM_CHAT_ID) rồi khởi động lại bot.`,
    );
    return false;
  }
  return isAuthorizedChat(chatId, allowed); // sai chat ID → im lặng, không phản hồi
}

async function saveInboxItem(data: {
  rawText: string | null;
  fileUrl: string | null;
  fileType: string | null;
}): Promise<void> {
  // L3 — ưu tiên gợi ý AI (Haiku, thêm team/category/priority), rớt về
  // rule-based (chỉ title/deadline) nếu AI lỗi/chưa cấu hình key.
  const draft = data.rawText
    ? (await proposeTriage(data.rawText)) ?? draftFromTelegramText(data.rawText)
    : null;
  await prisma.inboxItem.create({
    data: {
      source: "TELEGRAM",
      rawText: data.rawText,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      parsedDraft: draft ? JSON.stringify(draft) : null,
    },
  });
}

async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  const file = await bot.api.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tải file Telegram thất bại: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** I1/H2/H4 — validate + lưu file (tái dùng attachments.ts + inbox-parse.ts của Giai đoạn H). */
async function saveFileAttachment(
  buffer: Buffer,
  fileName: string,
  caption: string | null,
): Promise<{ fileUrl: string; fileType: string; rawText: string | null }> {
  if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `File vượt quá ${Math.floor(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB`,
    );
  }
  const ext = extOf(fileName);
  const fileType = ATTACHMENT_EXT_TO_TYPE[ext];
  if (!fileType) {
    throw new Error(
      `Không hỗ trợ file .${ext || "?"} — chỉ nhận xlsx/csv/docx/pdf/ảnh`,
    );
  }
  const savedName = safeAttachmentName(fileName);
  await writeFile(join(attachmentsDir(), savedName), buffer);

  let rawText: string | null = null;
  try {
    rawText = await extractText(buffer, fileType);
  } catch (err) {
    console.error("[TelegramBot] Lỗi trích text:", err);
  }
  return { fileUrl: savedName, fileType, rawText: rawText ?? caption };
}

// I1 — text/link/forward-text
bot.on("message:text", async (ctx) => {
  try {
    const chatId = ctx.message.chat.id.toString();
    if (!(await authorize(chatId, ctx))) return;
    await saveInboxItem({
      rawText: ctx.message.text,
      fileUrl: null,
      fileType: null,
    });
    await ctx.reply("✅ Đã lưu vào Inbox — xem trong tab Inbox của /notes");
  } catch (err) {
    await logError("Lỗi xử lý tin nhắn text", err);
    await ctx.reply("⚠️ Có lỗi khi lưu, thử lại sau.").catch(() => {});
  }
});

// I1 — ảnh (Telegram luôn nén thành .jpg, không có filename gốc)
bot.on("message:photo", async (ctx) => {
  try {
    const chatId = ctx.message.chat.id.toString();
    if (!(await authorize(chatId, ctx))) return;
    const photo = ctx.message.photo.at(-1);
    if (!photo) return;
    const buffer = await downloadTelegramFile(photo.file_id);
    const saved = await saveFileAttachment(
      buffer,
      "anh.jpg",
      ctx.message.caption ?? null,
    );
    await saveInboxItem({
      rawText: saved.rawText,
      fileUrl: saved.fileUrl,
      fileType: saved.fileType,
    });
    await ctx.reply("✅ Đã lưu ảnh vào Inbox");
  } catch (err) {
    await logError("Lỗi xử lý ảnh", err);
    await ctx
      .reply(`⚠️ ${err instanceof Error ? err.message : "Lỗi khi lưu ảnh"}`)
      .catch(() => {});
  }
});

// I1 — file văn bản (xlsx/csv/docx/pdf) + forward giữ nguyên document/caption
bot.on("message:document", async (ctx) => {
  try {
    const chatId = ctx.message.chat.id.toString();
    if (!(await authorize(chatId, ctx))) return;
    const doc = ctx.message.document;
    const buffer = await downloadTelegramFile(doc.file_id);
    const saved = await saveFileAttachment(
      buffer,
      doc.file_name ?? "file",
      ctx.message.caption ?? null,
    );
    await saveInboxItem({
      rawText: saved.rawText,
      fileUrl: saved.fileUrl,
      fileType: saved.fileType,
    });
    await ctx.reply("✅ Đã lưu file vào Inbox");
  } catch (err) {
    await logError("Lỗi xử lý file", err);
    await ctx
      .reply(`⚠️ ${err instanceof Error ? err.message : "Lỗi khi lưu file"}`)
      .catch(() => {});
  }
});

bot.catch((err) => {
  console.error("[TelegramBot] Lỗi không bắt được:", err);
});

/** I2 + I3 — 1 tick mỗi 5 phút: cảnh báo đến hạn + tóm tắt cuối ngày (nếu đến giờ). */
async function tick(): Promise<void> {
  const chatId = allowedChatId();
  if (!chatId) return; // chưa xác thực xong (chưa có TELEGRAM_CHAT_ID) — chưa gửi được gì

  const state = await prisma.telegramState.findUnique({
    where: { id: TELEGRAM_STATE_ID },
  });
  const now = new Date();

  try {
    const lastShown: Record<string, number> = state?.lastShownJson
      ? JSON.parse(state.lastShownJson)
      : {};
    const items = await getCombinedAlerts(now);
    const due = filterDue(items, lastShown, now.getTime());
    if (due.length > 0) {
      await bot.api.sendMessage(chatId, await buildAiAlertMessage(due));
      for (const item of due) lastShown[item.id] = now.getTime();
      await prisma.telegramState.upsert({
        where: { id: TELEGRAM_STATE_ID },
        create: { id: TELEGRAM_STATE_ID, lastShownJson: JSON.stringify(lastShown) },
        update: { lastShownJson: JSON.stringify(lastShown) },
      });
    }
  } catch (err) {
    await logError("Lỗi gửi cảnh báo", err);
  }

  // P1-d — bản tin sáng 07:30: CMO nắm quá hạn/sắp hạn/đang làm trước khi mở máy
  try {
    const nowHHmm = formatVN(now, "HH:mm");
    const todayVN = formatVN(now, "yyyy-MM-dd");
    if (shouldSendMorningBrief(nowHHmm, todayVN, state?.lastMorningDate ?? null)) {
      const summary = await getDailySummary(now);
      await bot.api.sendMessage(chatId, buildMorningMessage(summary));
      await prisma.telegramState.upsert({
        where: { id: TELEGRAM_STATE_ID },
        create: { id: TELEGRAM_STATE_ID, lastMorningDate: todayVN },
        update: { lastMorningDate: todayVN },
      });
    }
  } catch (err) {
    await logError("Lỗi gửi bản tin sáng", err);
  }

  try {
    const nowHHmm = formatVN(now, "HH:mm");
    const todayVN = formatVN(now, "yyyy-MM-dd");
    if (shouldSendEodSummary(nowHHmm, todayVN, state?.lastEodDate ?? null)) {
      const summary = await getDailySummary(now);
      await bot.api.sendMessage(chatId, await buildAiEodMessage(summary));
      await prisma.telegramState.upsert({
        where: { id: TELEGRAM_STATE_ID },
        create: { id: TELEGRAM_STATE_ID, lastEodDate: todayVN },
        update: { lastEodDate: todayVN },
      });
    }
  } catch (err) {
    await logError("Lỗi gửi tóm tắt cuối ngày", err);
  }
}

setInterval(() => {
  tick().catch((err) => console.error("[TelegramBot] Lỗi tick:", err));
}, TICK_MS);

process.once("SIGINT", () => void bot.stop());
process.once("SIGTERM", () => void bot.stop());

console.log("[TelegramBot] Đang khởi động (long polling)...");
bot
  .start({
    onStart: () =>
      console.log("[TelegramBot] Đã kết nối Telegram, sẵn sàng nhận tin."),
  })
  .catch((err) => {
    console.error(
      "[TelegramBot] Không khởi động được — kiểm tra TELEGRAM_BOT_TOKEN:",
      err,
    );
    process.exit(1);
  });
