// Giai đoạn L1 — chuyển messages thô lưu trong AiConversation.messagesJson
// (mảng theo shape Anthropic MessageParam, gồm cả block tool_use/tool_result)
// sang danh sách hiển thị gọn cho UI. Thuần, không đụng DB — dễ test.

export interface DisplayChatMessage {
  role: "user" | "assistant";
  text: string;
  tools: string[];
}

interface RawContentBlock {
  type: string;
  text?: string;
  name?: string;
}

interface RawMessage {
  role: string;
  content: string | RawContentBlock[];
}

export function toDisplayMessages(raw: unknown[]): DisplayChatMessage[] {
  const out: DisplayChatMessage[] = [];
  for (const item of raw as RawMessage[]) {
    if (item.role === "user") {
      // Turn user gửi tool_result (content là array) không phải câu hỏi thật — bỏ qua
      if (typeof item.content === "string") {
        out.push({ role: "user", text: item.content, tools: [] });
      }
      continue;
    }
    if (item.role === "assistant" && Array.isArray(item.content)) {
      let text = "";
      const tools: string[] = [];
      for (const block of item.content) {
        if (block.type === "text" && block.text) text += block.text;
        if (block.type === "tool_use" && block.name) tools.push(block.name);
      }
      if (text || tools.length > 0) out.push({ role: "assistant", text, tools });
    }
  }
  return out;
}
