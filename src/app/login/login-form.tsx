"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Form đăng nhập — mật khẩu và/hoặc "Đăng nhập bằng Google". Server component cha
// (page.tsx) quyết định hiển thị phương thức nào qua props theo cấu hình .env.
// Đọc ?next= và ?error= từ location (client-only) để khỏi cần useSearchParams + Suspense.

function safeNext(): string {
  if (typeof window === "undefined") return "/";
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

function queryError(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("error");
}

interface LoginFormProps {
  passwordEnabled: boolean;
  googleEnabled: boolean;
}

export default function LoginForm({
  passwordEnabled,
  googleEnabled,
}: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(queryError());
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({ success: false }))) as {
        success: boolean;
        error?: string;
      };
      if (data.success) {
        router.replace(safeNext());
        router.refresh();
        return;
      }
      setError(data.error ?? "Đăng nhập thất bại");
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setBusy(false);
    }
  }

  function signInWithGoogle() {
    const next = encodeURIComponent(safeNext());
    window.location.href = `/api/auth/google?next=${next}`;
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-[16px] border border-hair bg-panel p-6 shadow-elevated">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_0_4px_rgba(201,177,132,0.16)]" />
          <span className="text-[16px] font-bold tracking-wide text-text">
            Seryn Ops
          </span>
        </div>

        {passwordEnabled && (
          <form onSubmit={submit}>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-medium text-dim"
            >
              Mật khẩu truy cập
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[10px] border border-hair bg-panel-2 px-3 py-2.5 text-sm text-text outline-none focus:border-gold"
              placeholder="Nhập mật khẩu"
            />
            <button
              type="submit"
              disabled={busy || password.length === 0}
              className="mt-4 w-full rounded-[10px] bg-gold px-3 py-2.5 text-sm font-semibold text-[#1a1a1a] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Đang kiểm tra…" : "Đăng nhập"}
            </button>
          </form>
        )}

        {passwordEnabled && googleEnabled && (
          <div className="my-4 flex items-center gap-3 text-[12px] text-dim">
            <span className="h-px flex-1 bg-hair" />
            hoặc
            <span className="h-px flex-1 bg-hair" />
          </div>
        )}

        {googleEnabled && (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-hair bg-panel-2 px-3 py-2.5 text-sm font-semibold text-text transition-colors hover:border-gold"
          >
            <GoogleGlyph />
            Đăng nhập bằng Google
          </button>
        )}

        {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}
      </div>
    </div>
  );
}

// Logo "G" 4 màu chuẩn của Google (inline SVG, không cần asset ngoài)
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
