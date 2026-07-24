import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { buildChatSystemPrompt, CHAT_MODEL } from "@/lib/ai-core";
import { fail } from "@/lib/api";
import { AI_TOOLS, runAiTool } from "@/lib/ai-tools";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Giai đoạn L1 — chat panel streaming (SSE thủ công qua ReadableStream) + L2
// tool loop thủ công (không dùng tool runner beta để dễ bridge sang SSE riêng
// và lưu lịch sử). Mỗi dòng gửi về client dạng `data: <json>\n\n`:
//   {type:"text_delta", text} | {type:"tool_call", name, input}
//   {type:"tool_result", name, error?} | {type:"done", conversationId}
//   {type:"error", message}
// messages lưu lại đầy đủ (kể cả block tool_use/tool_result) = log mọi tool call (L2).

const MAX_TOOL_ITERATIONS = 6;
const MAX_TOKENS = 4096;

type ChatMessage = Anthropic.MessageParam;

function sseLine(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail("Chưa cấu hình ANTHROPIC_API_KEY trong .env", 400);
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return fail("Thiếu nội dung câu hỏi");
  const conversationId =
    typeof body?.conversationId === "string" ? body.conversationId : null;

  const existing = conversationId
    ? await prisma.aiConversation.findUnique({ where: { id: conversationId } })
    : null;

  const history: ChatMessage[] = existing
    ? (JSON.parse(existing.messagesJson) as ChatMessage[])
    : [];
  const messages: ChatMessage[] = [...history, { role: "user", content: message }];

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(sseLine(event)));

      try {
        for (let iterations = 0; iterations < MAX_TOOL_ITERATIONS; iterations++) {
          const anthropicStream = client.messages.stream({
            model: CHAT_MODEL,
            max_tokens: MAX_TOKENS,
            system: buildChatSystemPrompt(),
            tools: AI_TOOLS,
            messages,
          });
          anthropicStream.on("text", (delta) => send({ type: "text_delta", text: delta }));

          const final = await anthropicStream.finalMessage();
          messages.push({ role: "assistant", content: final.content });

          if (final.stop_reason !== "tool_use") break;

          const toolUseBlocks = final.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of toolUseBlocks) {
            send({ type: "tool_call", name: block.name, input: block.input });
            try {
              const result = await runAiTool(block.name, block.input as Record<string, unknown>);
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
              send({ type: "tool_result", name: block.name });
            } catch (error) {
              const msg = error instanceof Error ? error.message : "Lỗi tool";
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: msg,
                is_error: true,
              });
              send({ type: "tool_result", name: block.name, error: msg });
            }
          }
          messages.push({ role: "user", content: toolResults });
        }

        const title = existing?.title ?? message.slice(0, 80);
        const saved = existing
          ? await prisma.aiConversation.update({
              where: { id: existing.id },
              data: { messagesJson: JSON.stringify(messages), title },
            })
          : await prisma.aiConversation.create({
              data: { messagesJson: JSON.stringify(messages), title },
            });

        send({ type: "done", conversationId: saved.id });
      } catch (error) {
        console.error("[AssistantChat]", error);
        const msg = error instanceof Error ? error.message : "Lỗi trợ lý AI — thử lại sau";
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
