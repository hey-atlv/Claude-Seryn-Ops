// Xác thực app — 2 cách: 1 mật khẩu (APP_PASSWORD) HOẶC "Đăng nhập bằng Google"
// giới hạn theo danh sách email admin (AUTH_ALLOWED_EMAILS). Chạy local, single-user.
// Cookie phiên CHỈ chứa token băm, không bao giờ lưu mật khẩu/email thô.
// Hash thuần JS (FNV-1a) để dùng được cả trong proxy lẫn route handler mà không
// cần node:crypto — token Google có trộn thêm secret nên không giả mạo được từ mã nguồn.

export const SESSION_COOKIE = "seryn_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày (giây)

// Cookie tạm giữ nonce chống CSRF cho vòng OAuth Google (sống ngắn, chỉ trong lúc redirect)
export const OAUTH_STATE_COOKIE = "seryn_oauth_state";
export const OAUTH_STATE_MAX_AGE = 60 * 10; // 10 phút

// Email admin mặc định — override bằng AUTH_ALLOWED_EMAILS (ngăn cách bởi dấu phẩy)
const DEFAULT_ADMIN_EMAILS = ["atlv@seryn.vn"];

function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // nhân FNV prime 16777619, giữ trong 32-bit không dấu
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Token phiên = ghép 4 vòng băm có salt khác nhau của mật khẩu → chuỗi 32 hex
 * ổn định, đủ dài để không đoán được, dùng cho so sánh bằng nhau (equality).
 */
export function sessionToken(password: string): string {
  return ["a", "b", "c", "d"]
    .map((salt) => fnv1aHex(`seryn::${salt}::${password}`))
    .join("");
}

/** Token kỳ vọng theo APP_PASSWORD trong .env; null nếu chưa cấu hình mật khẩu. */
export function expectedToken(): string | null {
  const pw = process.env.APP_PASSWORD;
  return pw ? sessionToken(pw) : null;
}

/**
 * Đường dẫn quay lại sau khi đăng nhập — chỉ nhận đích nội bộ cùng origin.
 * Để chính URL parser phán quyết thay vì so khớp chuỗi: kiểm thủ công kiểu
 * `startsWith("//")` bỏ lọt `/\evil.com` (chuẩn URL coi `\` như `/` với scheme
 * http) lẫn `/<tab>/evil.com` (parser xóa tab/CR/LF rồi mới thành `//evil.com`).
 */
export function safeNextPath(
  raw: string | null | undefined,
  origin: string,
): string {
  if (!raw) return "/";
  try {
    const url = new URL(raw, origin);
    return url.origin === origin ? url.pathname + url.search + url.hash : "/";
  } catch {
    return "/";
  }
}

/** Chuẩn hóa email để so sánh: bỏ khoảng trắng, hạ chữ thường. */
function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Danh sách email admin được phép đăng nhập bằng Google. */
export function adminEmails(): string[] {
  const raw = process.env.AUTH_ALLOWED_EMAILS;
  return raw
    ? raw.split(",").map(normEmail).filter(Boolean)
    : DEFAULT_ADMIN_EMAILS.map(normEmail);
}

/** Email này có nằm trong danh sách admin không. */
export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(normEmail(email));
}

/**
 * Token phiên cho đăng nhập Google — băm (email + secret) với namespace "google"
 * tách khỏi token mật khẩu. Trộn GOOGLE_CLIENT_SECRET để không thể giả mạo token
 * chỉ từ mã nguồn (kẻ đọc source vẫn không biết secret).
 */
export function googleSessionToken(email: string): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const norm = normEmail(email);
  return ["a", "b", "c", "d"]
    .map((salt) => fnv1aHex(`seryn::google::${salt}::${secret}::${norm}`))
    .join("");
}

/** Đăng nhập Google có khả dụng không (đã cấu hình OAuth client). */
export function googleLoginEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Có bật mật khẩu không. */
export function passwordEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

/**
 * Có khóa app không. Bật khi đặt APP_PASSWORD HOẶC AUTH_ALLOWED_EMAILS (chọn
 * khóa bằng Google). Chưa đặt gì → không khóa (tránh tự khóa mình khi chưa cấu hình,
 * kể cả khi GOOGLE_CLIENT_ID đã có sẵn cho việc đồng bộ Calendar).
 */
export function authConfigured(): boolean {
  return passwordEnabled() || Boolean(process.env.AUTH_ALLOWED_EMAILS);
}

/** Cookie phiên có hợp lệ không: khớp token mật khẩu HOẶC token của 1 admin Google. */
export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const pwToken = expectedToken();
  if (pwToken && token === pwToken) return true;
  if (googleLoginEnabled()) {
    for (const email of adminEmails()) {
      if (token === googleSessionToken(email)) return true;
    }
  }
  return false;
}
