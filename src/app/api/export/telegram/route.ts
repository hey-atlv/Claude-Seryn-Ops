import { fail, ok } from "@/lib/api";
import { buildExportHtml, type ExportType } from "@/lib/export";
import { renderHtmlToPdf } from "@/lib/pdf-render";
import { sendTelegramDocument } from "@/lib/telegram-send";

export const dynamic = "force-dynamic";

// POST /api/export/telegram  body { type: "report"|"daily-summary", id?: string }
// K3 — render PDF rồi gửi luôn qua Telegram (Bot API trực tiếp, không cần bot
// đang chạy). Lỗi trả message rõ ràng (thiếu token, chưa cấu hình…) — không mask
// qua handleApiError vì đây đều là lỗi người dùng cần biết để tự sửa.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const type = body?.type as ExportType | undefined;
  if (type !== "report" && type !== "daily-summary") {
    return fail("type không hợp lệ");
  }
  const id = typeof body?.id === "string" ? body.id : null;

  try {
    const { html, filename } = await buildExportHtml(type, id);
    const pdf = await renderHtmlToPdf(html);
    await sendTelegramDocument(pdf, filename);
    return ok({ sent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gửi Telegram thất bại";
    return fail(message, 400);
  }
}
