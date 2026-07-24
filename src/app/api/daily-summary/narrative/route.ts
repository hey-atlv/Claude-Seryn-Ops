import { NextResponse } from "next/server";
import { buildAiEodMessage } from "@/lib/ai-telegram";
import { getDailySummary } from "@/lib/daily-summary";

export const dynamic = "force-dynamic";

// GET /api/daily-summary/narrative — Claude viết lại tóm tắt cuối ngày tự nhiên
// (F3). Best-effort: buildAiEodMessage tự rớt về template thuần nếu chưa có
// ANTHROPIC_API_KEY hoặc API lỗi, nên route luôn trả được text.
export async function GET() {
  try {
    const summary = await getDailySummary(new Date());
    const text = await buildAiEodMessage(summary);
    return NextResponse.json({ success: true, data: { text } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi tạo tóm tắt";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
