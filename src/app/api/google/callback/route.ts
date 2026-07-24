import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { GOOGLE_ACCOUNT_ID, getOAuthClient } from "@/lib/google-auth";
import { ensureSerynCalendar } from "@/lib/google-sync";

export const dynamic = "force-dynamic";

// GET /api/google/callback — Google redirect về đây sau khi sếp bấm "Cho phép"
export async function GET(req: NextRequest) {
  const settingsUrl = new URL("/settings", req.nextUrl.origin);
  try {
    const code = req.nextUrl.searchParams.get("code");
    const oauthError = req.nextUrl.searchParams.get("error");
    if (oauthError) {
      settingsUrl.searchParams.set("error", oauthError);
      return NextResponse.redirect(settingsUrl);
    }
    if (!code) {
      settingsUrl.searchParams.set("error", "Không nhận được mã xác thực từ Google");
      return NextResponse.redirect(settingsUrl);
    }

    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      // Google chỉ cấp refresh_token lần đầu chấp thuận — nếu thiếu, sếp cần
      // vào Google Account > Security > Third-party access, gỡ app rồi thử lại
      settingsUrl.searchParams.set(
        "error",
        "Google không cấp refresh token — vào Tài khoản Google, gỡ quyền truy cập app này rồi kết nối lại",
      );
      return NextResponse.redirect(settingsUrl);
    }
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: userinfo } = await oauth2.userinfo.get();
    if (!userinfo.email) {
      settingsUrl.searchParams.set("error", "Không lấy được email tài khoản Google");
      return NextResponse.redirect(settingsUrl);
    }

    const calendarId = await ensureSerynCalendar(client);

    await prisma.googleAccount.upsert({
      where: { id: GOOGLE_ACCOUNT_ID },
      create: {
        id: GOOGLE_ACCOUNT_ID,
        email: userinfo.email,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        accessTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarId,
      },
      update: {
        email: userinfo.email,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        accessTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarId,
        syncToken: null, // đổi tài khoản/kết nối lại — full resync cho chắc
        lastError: null,
      },
    });

    settingsUrl.searchParams.set("connected", "1");
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error("[GoogleAuth] callback thất bại:", error);
    settingsUrl.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Lỗi không rõ",
    );
    return NextResponse.redirect(settingsUrl);
  }
}
