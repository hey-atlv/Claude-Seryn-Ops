import { describe, expect, it } from "vitest";
import { toDisplayMessages } from "../src/lib/ai-conversation-view";

describe("toDisplayMessages", () => {
  it("giữ user message dạng string, bỏ user message là tool_result (array)", () => {
    const raw = [
      { role: "user", content: "Team Digital có bao nhiêu việc quá hạn?" },
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "t1", name: "get_team_summary", input: {} }],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "t1", content: "{}" }],
      },
      { role: "assistant", content: [{ type: "text", text: "Có 2 việc quá hạn." }] },
    ];
    expect(toDisplayMessages(raw)).toEqual([
      { role: "user", text: "Team Digital có bao nhiêu việc quá hạn?", tools: [] },
      { role: "assistant", text: "", tools: ["get_team_summary"] },
      { role: "assistant", text: "Có 2 việc quá hạn.", tools: [] },
    ]);
  });

  it("mảng rỗng trả mảng rỗng", () => {
    expect(toDisplayMessages([])).toEqual([]);
  });

  it("assistant chỉ có text, không tool", () => {
    const raw = [
      { role: "user", content: "Xin chào" },
      { role: "assistant", content: [{ type: "text", text: "Chào sếp!" }] },
    ];
    expect(toDisplayMessages(raw)).toEqual([
      { role: "user", text: "Xin chào", tools: [] },
      { role: "assistant", text: "Chào sếp!", tools: [] },
    ]);
  });
});
