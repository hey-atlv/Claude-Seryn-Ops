import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  googleLoginEnabled,
  safeNextPath,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

// Chỉ xin quyền tối thiểu để xác minh danh tính — KHÔNG động tới quyền Calendar
// (đăng nhập không cần offline/refresh token, chỉ cần email 1 lần).
const LOGIN_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** Redirect URI cho luồng đăng nhập — override bằng env, mặc định theo origin request. */
function loginRedirectUri(origin: string): string {
  return (
    process.env.GOOGLE_LOGIN_REDIRECT_URI ?? `${origin}/api/auth/google/callback`
  );
}

// GET /api/auth/google — bấm "Đăng nhập bằng Google" ở /login sẽ vào đây.
// Nằm ngoài matcher của proxy (được phép truy cập khi chưa đăng nhập).
export async function GET(req: NextRequest) {
  if (!googleLoginEnabled()) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("error", "Chưa cấu hình đăng nhập Google");
    return NextResponse.redirect(loginUrl);
  }

  const next = safeNextPath(
    req.nextUrl.searchParams.get("next"),
    req.nextUrl.origin,
  );
  const nonce = randomUUID();

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    loginRedirectUri(req.nextUrl.origin),
  );

  const url = client.generateAuthUrl({
    access_type: "online",
    prompt: "select_account", // cho phép chọn tài khoản, không ép cấp lại quyền
    scope: LOGIN_SCOPES,
    state: `${nonce}|${encodeURIComponent(next)}`,
  });

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
  });
  return res;
}
