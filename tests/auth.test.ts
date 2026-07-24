import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminEmails,
  authConfigured,
  expectedToken,
  googleLoginEnabled,
  googleSessionToken,
  isAdminEmail,
  isValidSessionToken,
  passwordEnabled,
  safeNextPath,
  sessionToken,
} from "../src/lib/auth";

// Lưu env trước mỗi test rồi khôi phục — các hàm auth đọc process.env trực tiếp
const KEYS = [
  "APP_PASSWORD",
  "AUTH_ALLOWED_EMAILS",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("sessionToken — token mật khẩu", () => {
  it("ổn định và dài 32 hex", () => {
    const t = sessionToken("matkhau");
    expect(t).toBe(sessionToken("matkhau"));
    expect(t).toMatch(/^[0-9a-f]{32}$/);
  });

  it("khác mật khẩu → khác token", () => {
    expect(sessionToken("a")).not.toBe(sessionToken("b"));
  });
});

describe("adminEmails / isAdminEmail — whitelist", () => {
  it("mặc định là atlv@seryn.vn khi chưa đặt env", () => {
    expect(adminEmails()).toEqual(["atlv@seryn.vn"]);
    expect(isAdminEmail("ATLV@Seryn.vn")).toBe(true); // không phân biệt hoa/thường
    expect(isAdminEmail("nguoila@gmail.com")).toBe(false);
  });

  it("override + tách dấu phẩy + chuẩn hóa", () => {
    process.env.AUTH_ALLOWED_EMAILS = " Boss@Seryn.vn , tro-ly@seryn.vn ";
    expect(adminEmails()).toEqual(["boss@seryn.vn", "tro-ly@seryn.vn"]);
    expect(isAdminEmail("boss@seryn.vn")).toBe(true);
    expect(isAdminEmail("atlv@seryn.vn")).toBe(false); // đã bị override
  });
});

describe("googleSessionToken — token đăng nhập Google", () => {
  it("phụ thuộc secret nên khác nhau khi secret khác", () => {
    process.env.GOOGLE_CLIENT_SECRET = "secret-1";
    const a = googleSessionToken("atlv@seryn.vn");
    process.env.GOOGLE_CLIENT_SECRET = "secret-2";
    const b = googleSessionToken("atlv@seryn.vn");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });

  it("khác token mật khẩu dù cùng chuỗi đầu vào", () => {
    process.env.GOOGLE_CLIENT_SECRET = "";
    expect(googleSessionToken("x")).not.toBe(sessionToken("x"));
  });
});

describe("cờ cấu hình", () => {
  it("passwordEnabled theo APP_PASSWORD", () => {
    expect(passwordEnabled()).toBe(false);
    process.env.APP_PASSWORD = "pw";
    expect(passwordEnabled()).toBe(true);
  });

  it("googleLoginEnabled cần cả CLIENT_ID lẫn SECRET", () => {
    expect(googleLoginEnabled()).toBe(false);
    process.env.GOOGLE_CLIENT_ID = "id";
    expect(googleLoginEnabled()).toBe(false);
    process.env.GOOGLE_CLIENT_SECRET = "sec";
    expect(googleLoginEnabled()).toBe(true);
  });

  it("authConfigured bật khi có mật khẩu HOẶC AUTH_ALLOWED_EMAILS", () => {
    expect(authConfigured()).toBe(false);
    // Có sẵn GOOGLE_CLIENT_* (cho Calendar) KHÔNG được tự khóa app
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "sec";
    expect(authConfigured()).toBe(false);
    process.env.AUTH_ALLOWED_EMAILS = "atlv@seryn.vn";
    expect(authConfigured()).toBe(true);
  });
});

describe("isValidSessionToken — kiểm cookie phiên", () => {
  it("từ chối token rỗng/sai", () => {
    process.env.APP_PASSWORD = "pw";
    expect(isValidSessionToken(undefined)).toBe(false);
    expect(isValidSessionToken("")).toBe(false);
    expect(isValidSessionToken("linh-tinh")).toBe(false);
  });

  it("chấp nhận token mật khẩu đúng", () => {
    process.env.APP_PASSWORD = "pw";
    expect(isValidSessionToken(expectedToken()!)).toBe(true);
    expect(isValidSessionToken(sessionToken("pw"))).toBe(true);
  });

  it("chấp nhận token Google của admin khi login Google bật", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "sec";
    process.env.AUTH_ALLOWED_EMAILS = "atlv@seryn.vn";
    expect(isValidSessionToken(googleSessionToken("atlv@seryn.vn"))).toBe(true);
    expect(isValidSessionToken(googleSessionToken("nguoila@gmail.com"))).toBe(
      false,
    );
  });

  it("không chấp nhận token Google khi chưa cấu hình OAuth client", () => {
    process.env.AUTH_ALLOWED_EMAILS = "atlv@seryn.vn";
    // thiếu GOOGLE_CLIENT_ID/SECRET → googleLoginEnabled = false
    expect(isValidSessionToken(googleSessionToken("atlv@seryn.vn"))).toBe(false);
  });
});

// Chống open redirect: ?next= do người dùng truyền, sau đăng nhập được resolve
// rồi redirect tới. Kiểm bằng so khớp chuỗi bỏ lọt vài dạng — khóa lại ở đây.
describe("safeNextPath — đích quay lại sau đăng nhập", () => {
  const ORIGIN = "http://localhost:4000";

  it("giữ đường dẫn nội bộ, kèm query và hash", () => {
    expect(safeNextPath("/tasks", ORIGIN)).toBe("/tasks");
    expect(safeNextPath("/tasks?team=MKT#top", ORIGIN)).toBe("/tasks?team=MKT#top");
  });

  it("trả về / khi next rỗng hoặc không có", () => {
    expect(safeNextPath(null, ORIGIN)).toBe("/");
    expect(safeNextPath(undefined, ORIGIN)).toBe("/");
    expect(safeNextPath("", ORIGIN)).toBe("/");
  });

  it("chặn URL tuyệt đối và protocol-relative ra ngoài", () => {
    expect(safeNextPath("https://evil.com", ORIGIN)).toBe("/");
    expect(safeNextPath("//evil.com", ORIGIN)).toBe("/");
    expect(safeNextPath("http://localhost:4001/tasks", ORIGIN)).toBe("/");
  });

  // Chuẩn URL coi "\" như "/" với scheme http → "/\evil.com" hóa "//evil.com"
  it("chặn backslash", () => {
    expect(safeNextPath("/\\evil.com", ORIGIN)).toBe("/");
    expect(safeNextPath("/\\\\evil.com", ORIGIN)).toBe("/");
  });

  // URL parser xóa tab/CR/LF TRƯỚC khi phân tích → "/<tab>/evil.com" cũng thành
  // "//evil.com". Đây là dạng mà fix bằng regex bỏ lọt.
  it("chặn tab/CR/LF chèn giữa", () => {
    expect(safeNextPath("/\t/evil.com", ORIGIN)).toBe("/");
    expect(safeNextPath("/\n/evil.com", ORIGIN)).toBe("/");
    expect(safeNextPath("/\r/evil.com", ORIGIN)).toBe("/");
  });
});
