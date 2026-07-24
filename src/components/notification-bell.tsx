"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import {
  filterDue,
  type NotifyItem,
  type NotifyTier,
} from "@/lib/notify-core";

// F1 — Chuông nhắc việc trong header: fetch /api/notifications khi mở app
// + mỗi 5 phút. Badge CHỈ đếm tier CRITICAL đến hạn nhắc (phương án 15 phút —
// đỡ nhiễu); dropdown vẫn xem được tất cả. Mở dropdown = đã xem (ghi lastShown).

const POLL_MS = 5 * 60_000;
const STORAGE_KEY = "seryn-notify-last-shown";

const TIER_DOT: Record<NotifyTier, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-400",
  NORMAL: "bg-blue-400",
};

function loadLastShown(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function saveLastShown(map: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage đầy/bị chặn — bỏ qua, chỉ mất throttle
  }
}

export function NotificationBell() {
  const [items, setItems] = useState<NotifyItem[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [open, setOpen] = useState(false);
  const itemsRef = useRef<NotifyItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function refresh(isAppOpen: boolean) {
      const res = await apiCall<NotifyItem[]>("/api/notifications");
      if (cancelled || !res.success || !res.data) return;
      itemsRef.current = res.data;
      setItems(res.data);
      const due = filterDue(
        res.data,
        loadLastShown(),
        Date.now(),
        isAppOpen ? { alwaysTiers: ["CRITICAL"] } : undefined,
      );
      setDueCount(due.filter((it) => it.tier === "CRITICAL").length);
    }

    refresh(true); // mỗi lần mở app — Critical luôn nhắc lại
    const timer = setInterval(() => refresh(false), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      // Mở dropdown = đã xem tất cả thông báo hiện tại
      const map = loadLastShown();
      const now = Date.now();
      for (const it of itemsRef.current) map[it.id] = now;
      saveLastShown(map);
      setDueCount(0);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        title="Nhắc việc"
        className="relative rounded-md p-2 text-zinc-700 hover:bg-brand-50 hover:text-brand-800 dark:text-zinc-300 dark:hover:bg-brand-950/60 dark:hover:text-brand-300"
      >
        <Bell size={18} strokeWidth={2.25} aria-hidden />
        {dueCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {dueCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-80 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-zinc-400">
            Nhắc việc ({items.length})
          </p>
          {items.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-zinc-400">
              Không có gì cần nhắc 🟢
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((it) => (
                <li key={it.id}>
                  <a
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="flex gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TIER_DOT[it.tier]}`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {it.title}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {it.detail}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
