import { googleLoginEnabled, passwordEnabled } from "@/lib/auth";
import LoginForm from "./login-form";

// Trang đăng nhập — server component đọc cấu hình .env để quyết định hiển thị
// mật khẩu và/hoặc nút "Đăng nhập bằng Google". force-dynamic vì phụ thuộc env
// lúc chạy (không được cache tĩnh). Overlay toàn màn che sidebar shell.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <LoginForm
      passwordEnabled={passwordEnabled()}
      googleEnabled={googleLoginEnabled()}
    />
  );
}
