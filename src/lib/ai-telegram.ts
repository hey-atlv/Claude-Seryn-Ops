import Anthropic from "@anthropic-ai/sdk";
import { CHAT_MODEL } from "./ai-core";
import type { DailySummary } from "./daily-summary";
import type { NotifyItem } from "./notify-core";
import { buildAlertMessage, buildEodMessage } from "./telegram-core";
import { formatVN } from "./timezone";

// Giai đoạn L5 — viết lại cảnh báo/tóm tắt cuối ngày qua Telegram tự nhiên
// hơn (nêu liên hệ/rủi ro nếu thấy RÕ trong dữ liệu, không suy diễn thêm).
// Best-effort tuyệt đối: lỗi API/nội dung rỗng đều rớt về template thuần code
// đã có sẵn (buildAlertMessage/buildEodMessage) — bot không bao giờ im lặng
// vì lỗi AI.

const ALERT_SYSTEM_PROMPT = `Bạn viết lại 1 tin nhắn Telegram cảnh báo công việc cho CMO của Seryn từ
danh sách cảnh báo JSON có sẵn (mỗi item đã có tier Khẩn cấp/Ưu tiên cao/Sắp
đến hạn, title, detail, href). Yêu cầu:
- Tiếng Việt, ngắn gọn, đi thẳng vào việc, đọc thoải mái trên điện thoại.
- Giữ đủ thông tin của MỌI item trong dữ liệu (tên việc, chi tiết/ai phụ
  trách, khối liên quan) — không bỏ sót, không bịa thêm việc không có.
- Sắp theo tier, Khẩn cấp lên đầu.
- CHỈ nêu liên hệ/rủi ro dây chuyền (ví dụ nhiều việc cùng team trễ,
  dependency chờ lâu có thể chặn báo cáo khác) nếu thấy RÕ trong dữ liệu
  được cung cấp — KHÔNG suy diễn thông tin không có trong dữ liệu.
- Không lời chào/lời kết, không markdown phức tạp (Telegram không render
  ** hay ##), có thể giữ emoji đã có trong dữ liệu.
- Trả về ĐÚNG nội dung tin nhắn, không giải thích gì thêm.`;

const EOD_SYSTEM_PROMPT = `Bạn viết lại tóm tắt cuối ngày qua Telegram cho CMO của Seryn từ dữ liệu
JSON có sẵn (topTomorrow + 4 nhóm: doneToday/inProgress/overdue/dueSoon).
Yêu cầu:
- Tiếng Việt, giọng tự nhiên như đang tóm tắt cho sếp, không liệt kê khô cứng.
- Giữ đủ tên việc, người phụ trách, hạn của MỌI item trong dữ liệu — không
  bỏ sót, không bịa thêm việc không có trong dữ liệu.
- Nêu bật topTomorrow (việc quan trọng nhất sáng mai) lên đầu, nếu có.
- Nhóm overdue: nêu ai cần được hỏi thăm; CHỈ nêu liên hệ nếu nhiều việc quá
  hạn thấy RÕ cùng 1 leader/team trong dữ liệu — không suy diễn thêm.
- Không lời chào/lời kết, không markdown phức tạp.
- Trả về ĐÚNG nội dung tin nhắn, không giải thích gì thêm.`;

async function callClaude(system: string, payload: unknown): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: CHAT_MODEL,
      // claude-sonnet-5 bật adaptive thinking mặc định — nếu không tắt, với
      // max_tokens nhỏ model tiêu hết token vào thinking và KHÔNG trả text block
      // (callClaude rớt về null → luôn dùng template). Đây là việc format thuần
      // nên tắt thinking; budget_tokens đã bị bỏ trên Sonnet 5 (gửi vào lỗi 400).
      thinking: { type: "disabled" },
      max_tokens: 2048, // đủ cho danh sách dài (nhiều task) trong 1 tin nhắn
      system,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text" || !block.text.trim()) return null;
    return block.text.trim();
  } catch (error) {
    console.error("[AiTelegram]", error);
    return null;
  }
}

export async function buildAiAlertMessage(items: NotifyItem[]): Promise<string> {
  if (items.length === 0) return "";
  const text = await callClaude(ALERT_SYSTEM_PROMPT, items);
  return text ?? buildAlertMessage(items);
}

interface SlimTask {
  title: string;
  leader: string | null;
  deadline: string | null;
  priority: string;
}

function slimTask(t: {
  title: string;
  leader: { name: string } | null;
  deadline: Date | null;
  priority: string;
}): SlimTask {
  return {
    title: t.title,
    leader: t.leader?.name ?? null,
    deadline: t.deadline ? formatVN(t.deadline, "dd/MM") : null,
    priority: t.priority,
  };
}

export async function buildAiEodMessage(summary: DailySummary): Promise<string> {
  const payload = {
    topTomorrow: summary.topTomorrow ? slimTask(summary.topTomorrow) : null,
    doneToday: summary.doneToday.map(slimTask),
    inProgress: summary.inProgress.map(slimTask),
    overdue: summary.overdue.map(slimTask),
    dueSoon: summary.dueSoon.map(slimTask),
  };
  const text = await callClaude(EOD_SYSTEM_PROMPT, payload);
  return text ?? buildEodMessage(summary);
}
