// K3 — gửi file qua Telegram Bot API trực tiếp bằng fetch (KHÔNG qua tiến trình
// bot riêng ở scripts/telegram-bot.mts) — route API chạy trong tiến trình Next,
// không có quyền truy cập instance grammy Bot của tiến trình bot; dùng chung
// TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID đã có trong .env nên không cần bot đang chạy.

export async function sendTelegramDocument(
  buffer: Buffer,
  filename: string,
  caption?: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error(
      "Chưa cấu hình TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID trong .env",
    );
  }

  const form = new FormData();
  form.append("chat_id", chatId);
  if (caption) form.append("caption", caption);
  form.append("document", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), filename);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gửi Telegram thất bại (${res.status}): ${body}`);
  }
}
