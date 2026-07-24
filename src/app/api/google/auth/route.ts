import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { GOOGLE_SCOPES, getOAuthClient } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

// GET /api/google/auth — bấm "Kết nối Google Calendar" ở /settings sẽ vào đây
export async function GET() {
  try {
    const client = getOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline", // bắt buộc để nhận refresh_token
      prompt: "consent", // luôn hỏi lại để chắc chắn có refresh_token (kể cả đã từng cấp)
      scope: GOOGLE_SCOPES,
    });
    return NextResponse.redirect(url);
  } catch (error) {
    return handleApiError(error);
  }
}
