"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { apiCall } from "@/lib/api-client";
import { TEAM_LABELS, type Team } from "@/lib/constants";
import { TitleWithTag } from "@/components/tasks/tag-chip";

// P2 — Command palette Ctrl+K: tìm task theo tên (không dấu cũng khớp) +
// điều hướng nhanh. Chọn task → /tasks?task=<id> mở thẳng drawer chi tiết.

interface TaskHit {
  id: string;
  title: string;
  team: string;
  status: string;
  parentId: string | null;
}

interface NavAction {
  label: string;
  href: string;
}

const NAV_ACTIONS: NavAction[] = [
  { label: "🏠 Hôm nay", href: "/" },
  { label: "➕ Tạo task mới", href: "/tasks?new=1" },
  { label: "📋 Công việc — Ma trận", href: "/tasks" },
  { label: "👥 Công việc — Theo người", href: "/tasks?view=people" },
  { label: "🗂 Công việc — Dự án", href: "/tasks?view=projects" },
  { label: "📅 Công việc — Calendar", href: "/tasks?view=calendar" },
  { label: "📝 Sổ tay", href: "/workspace" },
  { label: "🤝 Phối hợp & Báo cáo", href: "/ops" },
  { label: "⚙️ Cài đặt", href: "/settings" },
];

// Bỏ dấu tiếng Việt để gõ "bao cao" vẫn khớp "báo cáo"
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const MAX_TASK_HITS = 8;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskHit[] | null>(null);

  // Ctrl+K / Cmd+K mở, Escape đóng — lắng nghe toàn app
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Mở lần đầu mới fetch danh sách task (nhẹ, dùng lại giữa các lần mở)
  useEffect(() => {
    if (!open || tasks !== null) return;
    apiCall<TaskHit[]>("/api/tasks").then((res) => {
      if (res.success && res.data) {
        setTasks(res.data.filter((t) => t.parentId === null));
      }
    });
  }, [open, tasks]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      // Deep-link ?task=/?new= cần server render lại với searchParams mới;
      // push cùng pathname bị client cache nuốt query → dùng full navigation.
      if (href.includes("?task=") || href.includes("?new=")) {
        window.location.assign(href);
        return;
      }
      router.push(href);
    },
    [router],
  );

  if (!open) return null;
  // Nội dung tách component con: unmount khi đóng → query/active tự reset
  return (
    <PaletteContent tasks={tasks} go={go} onClose={() => setOpen(false)} />
  );
}

function PaletteContent({
  tasks,
  go,
  onClose,
}: {
  tasks: TaskHit[] | null;
  go: (href: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = fold(query.trim());
  const navHits = q
    ? NAV_ACTIONS.filter((a) => fold(a.label).includes(q))
    : NAV_ACTIONS;
  const taskHits = q
    ? (tasks ?? [])
        .filter((t) => fold(t.title).includes(q))
        .sort((a, b) => Number(b.status !== "DONE") - Number(a.status !== "DONE"))
        .slice(0, MAX_TASK_HITS)
    : [];
  const total = navHits.length + taskHits.length;

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && total > 0) {
      e.preventDefault();
      const i = Math.min(active, total - 1);
      if (i < navHits.length) go(navHits[i].href);
      else go(`/tasks?task=${taskHits[i - navHits.length].id}`);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh]">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-hair bg-panel shadow-elevated">
        <div className="flex items-center gap-2 border-b border-hair-soft px-3">
          <Search size={15} className="text-faint" aria-hidden />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Tìm task hoặc gõ lệnh… (Ctrl+K)"
            className="w-full bg-transparent py-3 text-sm text-text placeholder:text-faint focus:outline-none"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {navHits.map((a, i) => (
            <li key={a.href}>
              <button
                type="button"
                onClick={() => go(a.href)}
                onMouseEnter={() => setActive(i)}
                className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm text-text ${
                  active === i ? "bg-gold/[0.14]" : "hover:bg-panel-2"
                }`}
              >
                {a.label}
              </button>
            </li>
          ))}
          {taskHits.length > 0 && (
            <li className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-faint">
              Task ({taskHits.length})
            </li>
          )}
          {taskHits.map((t, j) => {
            const i = navHits.length + j;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => go(`/tasks?task=${t.id}`)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-text ${
                    active === i ? "bg-gold/[0.14]" : "hover:bg-panel-2"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    <TitleWithTag title={t.title} />
                  </span>
                  <span className="flex-none text-xs text-faint">
                    {TEAM_LABELS[t.team as Team] ?? t.team}
                    {t.status === "DONE" ? " · ✓" : ""}
                  </span>
                </button>
              </li>
            );
          })}
          {q && total === 0 && (
            <li className="px-2.5 py-4 text-center text-sm text-faint">
              Không tìm thấy gì cho “{query}”
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
