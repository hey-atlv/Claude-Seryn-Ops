import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  googleSessionToken,
  isAdminEmail,
  safeNextPath,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

function loginRedirectUri(origin: string): string {
  return (
    process.env.GOOGLE_LOGIN_REDIRECT_URI ?? `${origin}/api/auth/google/callback`
  );
}

// GET /api/auth/google/callback — Google redirect về đây sau khi chọn tài khoản.
// Kiểm state chống CSRF → đổi code lấy email → chỉ cho phép email trong whitelist.
export async function GET(req: NextRequest) {
  const loginUrl = new URL("/login", req.nextUrl.origin);
  const clearState = (res: NextResponse) => {
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };
  const failTo = (message: string) => {
    loginUrl.searchParams.set("error", message);
    return clearState(NextResponse.redirect(loginUrl));
  };

  try {
    const oauthError = req.nextUrl.searchParams.get("error");
    if (oauthError) return failTo("Bạn đã hủy đăng nhập Google");

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state") ?? "";
    if (!code) return failTo("Không nhận được mã xác thực từ Google");

    // Chống CSRF: nonce trong state phải khớp cookie đã đặt lúc bắt đầu
    const [nonce, encodedNext = ""] = state.split("|");
    const cookieNonce = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
    if (!nonce || !cookieNonce || nonce !== cookieNonce) {
      return failTo("Phiên đăng nhập không hợp lệ — thử lại");
    }
    const next = safeNextPath(
      decodeURIComponent(encodedNext),
      req.nextUrl.origin,
    );

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      loginRedirectUri(req.nextUrl.origin),
    );
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: userinfo } = await oauth2.userinfo.get();
    const email = userinfo.email;
    if (!email) return failTo("Không lấy được email tài khoản Google");

    if (!isAdminEmail(email)) {
      return failTo(`Tài khoản ${email} không có quyền truy cập`);
    }

    const target = new URL(next, req.nextUrl.origin);
    const res = NextResponse.redirect(target);
    res.cookies.set(SESSION_COOKIE, googleSessionToken(email), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return clearState(res);
  } catch (error) {
    console.error("[AuthGoogle] callback thất bại:", error);
    return failTo("Đăng nhập Google thất bại — thử lại");
  }
}
