// Logic thuần cho OAuth token — KHÔNG import googleapis/prisma nên unit test được.

// Chỉ lấy đúng 3 field cần từ Credentials của google-auth-library (tất cả optional).
export interface OAuthTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

// Field ánh xạ sang cột GoogleAccount trong Prisma.
export interface GoogleAccountTokenUpdate {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiry?: Date;
}

/**
 * Dựng data cập nhật GoogleAccount từ sự kiện "tokens" khi google-auth-library
 * tự refresh. Chỉ đưa vào field thực sự có giá trị (không ghi đè null).
 *
 * QUAN TRỌNG — refresh_token: Google có thể xoay vòng refresh_token; nếu bỏ qua,
 * token cũ trong DB thành vô hiệu và mất uỷ quyền vĩnh viễn (phải kết nối lại tay).
 * Ngược lại, mất một lần ghi access_token không nguy hiểm vì lần request sau sẽ
 * tự refresh lại — nên việc ghi ở handler "tokens" chấp nhận best-effort được.
 */
export function tokensToAccountData(tokens: OAuthTokens): GoogleAccountTokenUpdate {
  const data: GoogleAccountTokenUpdate = {};
  if (tokens.access_token) data.accessToken = tokens.access_token;
  if (tokens.refresh_token) data.refreshToken = tokens.refresh_token;
  if (tokens.expiry_date) data.accessTokenExpiry = new Date(tokens.expiry_date);
  return data;
}
