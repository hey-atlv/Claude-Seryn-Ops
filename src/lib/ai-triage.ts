import Anthropic from "@anthropic-ai/sdk";
import { buildTriageSystemPrompt, TRIAGE_MODEL } from "./ai-core";
import { CATEGORY_BY_TEAM, PRIORITIES, TEAMS, type Team } from "./constants";

// Giai đoạn L3 — dùng Haiku (rẻ, nhanh) phân loại 1 dòng text thô thành gợi ý
// task đầy đủ hơn guessDraftFromLine (thêm team/category/priority, không chỉ
// deadline). Best-effort tuyệt đối: bất kỳ lỗi API/parse nào đều trả null,
// caller tự fallback về rule-based guess đã có sẵn (không làm hỏng Inbox).

export interface TriageDraft {
  title: string;
  deadline: string | null;
  team: Team | null;
  category: string | null;
  priority: string | null;
}

const MAX_INPUT_CHARS = 2000;

function isTeam(v: unknown): v is Team {
  return typeof v === "string" && (TEAMS as readonly string[]).includes(v);
}

function extractJsonObject(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : text);
  if (typeof parsed !== "object" || parsed === null) throw new Error("Không phải object");
  return parsed as Record<string, unknown>;
}

export async function proposeTriage(
  rawText: string,
  now: Date = new Date(),
): Promise<TriageDraft | null> {
  const text = rawText.trim();
  if (!process.env.ANTHROPIC_API_KEY || !text) return null;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: TRIAGE_MODEL,
      max_tokens: 300,
      system: buildTriageSystemPrompt(now),
      messages: [{ role: "user", content: text.slice(0, MAX_INPUT_CHARS) }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = extractJsonObject(textBlock.text);
    const title =
      typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : text;
    const deadline =
      typeof parsed.deadline === "string" && !Number.isNaN(Date.parse(parsed.deadline))
        ? parsed.deadline
        : null;
    const team = isTeam(parsed.team) ? parsed.team : null;
    const categoryRaw = typeof parsed.category === "string" ? parsed.category : null;
    const category =
      team && categoryRaw && CATEGORY_BY_TEAM[team].includes(categoryRaw) ? categoryRaw : null;
    const priority =
      typeof parsed.priority === "string" &&
      (PRIORITIES as readonly string[]).includes(parsed.priority)
        ? parsed.priority
        : null;

    return { title, deadline, team, category, priority };
  } catch (error) {
    console.error("[AiTriage]", error);
    return null;
  }
}
