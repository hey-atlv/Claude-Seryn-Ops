import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/login — nhận { password }, so với APP_PASSWORD, đặt cookie phiên
// httpOnly nếu đúng. Route này nằm ngoài matcher của proxy (được phép truy cập
// khi chưa đăng nhập).
export async function POST(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) {
    return NextResponse.json(
      { success: false, error: "Chưa cấu hình APP_PASSWORD trong .env" },
      { status: 500 },
    );
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    password = undefined;
  }

  if (typeof password !== "string" || password !== pw) {
    return NextResponse.json(
      { success: false, error: "Mật khẩu không đúng" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, sessionToken(pw), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
