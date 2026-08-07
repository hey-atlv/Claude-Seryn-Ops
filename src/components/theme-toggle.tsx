"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Nút chuyển Dark/Light. Nguồn sự thật là class `dark` trên <html> (script
// inline trong layout đặt trước khi paint từ localStorage["seryn-theme"]).
// State ở đây chỉ để render đúng icon — đọc lại từ DOM sau khi mount.

const STORAGE_KEY = "seryn-theme";

export function ThemeToggle() {
  // SSR luôn render dark (layout đặt class dark mặc định) nên khởi tạo true.
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage bị chặn (private mode) — theme vẫn đổi trong phiên này
    }
  }

  const label = isDark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-hair text-dim transition-colors hover:bg-panel-2 hover:text-text"
    >
      {isDark ? (
        <Sun size={16} strokeWidth={2.1} aria-hidden />
      ) : (
        <Moon size={16} strokeWidth={2.1} aria-hidden />
      )}
    </button>
  );
}
