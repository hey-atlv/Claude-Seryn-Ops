import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authConfigured, isValidSessionToken } from "@/lib/auth";

// Proxy (Next 16 đổi tên từ Middleware) — khóa toàn app bằng mật khẩu HOẶC đăng
// nhập Google (chạy local single-user). CHỈ bật khi đã đặt APP_PASSWORD hoặc
// AUTH_ALLOWED_EMAILS trong .env; chưa đặt thì không chặn gì (tránh tự khóa mình).
export function proxy(req: NextRequest) {
  if (!authConfigured()) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSessionToken(token)) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  // API khác (không phải /api/auth) → trả 401 JSON thay vì redirect HTML
  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { success: false, error: "Chưa đăng nhập" },
      { status: 401 },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search =
    pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Bỏ qua: route đăng nhập/đăng xuất, static assets, favicon. Mọi thứ khác
  // (trang + API còn lại) đều phải có phiên hợp lệ.
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
