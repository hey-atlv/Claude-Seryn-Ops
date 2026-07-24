import { google } from "googleapis";
import { prisma } from "./db";
import { tokensToAccountData } from "./google-auth-core";

// Lấy type từ chính googleapis (không import "google-auth-library" riêng) —
// googleapis lồng bên trong 1 bản google-auth-library khác instance, cài thêm
// gói ngoài gây xung đột kiểu TS dù cùng version (private field khác khai báo).
export type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

// OAuth2 cho đồng bộ Google Calendar — 1 tài khoản duy nhất (GoogleAccount id="default").
// getOAuthClient(): dùng cho luồng /api/google/auth + callback (chưa có token).
// getAuthedClient(): dùng cho push/pull sync — tự refresh access token khi hết hạn
// và lưu lại token mới vào DB (google-auth-library tự gọi refresh khi cần).

export const GOOGLE_ACCOUNT_ID = "default";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets.readonly", // J2 — đọc Sheets vào Inbox
  "https://www.googleapis.com/auth/userinfo.email",
];

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} chưa được cấu hình — kiểm tra file .env`);
  return v;
}

export function getOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI"),
  );
}

/** null = chưa kết nối Google — nơi gọi phải bỏ qua sync, không throw */
export async function getAuthedClient(): Promise<OAuth2Client | null> {
  const account = await prisma.googleAccount.findUnique({
    where: { id: GOOGLE_ACCOUNT_ID },
  });
  if (!account) return null;

  const client = getOAuthClient();
  client.setCredentials({
    refresh_token: account.refreshToken,
    access_token: account.accessToken ?? undefined,
    expiry_date: account.accessTokenExpiry?.getTime(),
  });

  // google-auth-library tự refresh access token khi gọi API mà token hết hạn —
  // bắt sự kiện để lưu token mới, tránh phải refresh lại ở mỗi request sau.
  // Lưu CẢ refresh_token khi Google xoay vòng (nếu bỏ qua sẽ mất uỷ quyền vĩnh
  // viễn). Ghi ở đây là best-effort/fire-and-forget: event của google-auth-library
  // không await được từ nơi gọi, nhưng mất một lần ghi access_token thì request
  // sau tự refresh lại — chỉ refresh_token mới là thứ bắt buộc phải giữ.
  client.on("tokens", (tokens) => {
    const data = tokensToAccountData(tokens);
    if (Object.keys(data).length === 0) return;
    prisma.googleAccount
      .update({ where: { id: GOOGLE_ACCOUNT_ID }, data })
      .catch((err: unknown) =>
        console.error("[GoogleAuth] Lưu token mới thất bại:", err),
      );
  });

  return client;
}

/**
 * Best-effort: gọi endpoint revoke của Google để cắt uỷ quyền phía Google —
 * revoke refresh_token sẽ vô hiệu cả access token dẫn xuất, đúng nghĩa "ngắt
 * kết nối". Nếu lỗi (mạng, token đã hết hạn/đã bị thu hồi) chỉ log rồi bỏ qua:
 * không để việc này cản trở xóa liên kết app-side ở /api/google/disconnect.
 */
export async function revokeGoogleAccess(): Promise<void> {
  const account = await prisma.googleAccount.findUnique({
    where: { id: GOOGLE_ACCOUNT_ID },
  });
  if (!account) return; // chưa kết nối — không có gì để revoke
  try {
    await getOAuthClient().revokeToken(account.refreshToken);
  } catch (err: unknown) {
    console.error(
      "[GoogleAuth] Revoke uỷ quyền phía Google thất bại (bỏ qua):",
      err,
    );
  }
}

export async function markSyncError(message: string): Promise<void> {
  await prisma.googleAccount
    .update({ where: { id: GOOGLE_ACCOUNT_ID }, data: { lastError: message } })
    .catch(() => {});
}

export async function markSyncOk(): Promise<void> {
  await prisma.googleAccount
    .update({
      where: { id: GOOGLE_ACCOUNT_ID },
      data: { lastSyncAt: new Date(), lastError: null },
    })
    .catch(() => {});
}
