"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Columns3,
  FileDown,
  Grid2x2,
  Plus,
} from "lucide-react";
import { TEAM_LABELS, TEAMS, type TaskStatus, type Team } from "@/lib/constants";
import type { ExternalCalendarEvent } from "@/lib/google-calendar-core";
import type { TaskRow, TasksPageData } from "@/lib/task-row";
import { CalendarView } from "./calendar-view";
import { EisenhowerView } from "./eisenhower-view";
import { TaskForm } from "./task-form";
import { TeamBoard } from "./team-board";

// Trang /tasks còn 3 views (phương án 15 phút): Ma trận (mặc định) ·
// Theo Team · Calendar. Các ?view= cũ (priority/today/alerts/silent/projects)
// tự rơi về Ma trận — không 404.

const VIEWS = [
  { key: "matrix", label: "Ma trận", icon: Grid2x2 },
  { key: "team", label: "Theo Team", icon: Columns3 },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

const isViewKey = (v: string | undefined): v is ViewKey =>
  VIEWS.some((x) => x.key === v);

interface TasksClientProps {
  data: TasksPageData;
  initialView?: string;
  initialTeam?: string;
}

export function TasksClient({ data, initialView, initialTeam }: TasksClientProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewKey>(
    isViewKey(initialView) ? initialView : "matrix",
  );
  const [team, setTeam] = useState<Team | "">(
    TEAMS.includes(initialTeam as Team) ? (initialTeam as Team) : "",
  );
  const [tasks, setTasks] = useState(data.tasks);
  const [form, setForm] = useState<{
    open: boolean;
    task: TaskRow | null;
    initial?: { title: string; deadlineDate: string };
  }>({
    open: false,
    task: null,
  });

  // Server refresh xong → đồng bộ lại state cục bộ (đè các optimistic update).
  // Pattern "adjust state during render" của React thay cho setState trong effect.
  const [prevTasks, setPrevTasks] = useState(data.tasks);
  if (prevTasks !== data.tasks) {
    setPrevTasks(data.tasks);
    setTasks(data.tasks);
  }

  // Giữ URL khớp tab/filter để share hoặc F5 quay lại đúng chỗ (shallow, không gọi server)
  useEffect(() => {
    const q = new URLSearchParams();
    if (view !== "matrix") q.set("view", view);
    if (team) q.set("team", team);
    const qs = q.toString();
    window.history.replaceState(null, "", qs ? `/tasks?${qs}` : "/tasks");
  }, [view, team]);

  const refresh = () => router.refresh();
  const openCreate = () => setForm({ open: true, task: null });
  const openEdit = (t: TaskRow) => setForm({ open: true, task: t });
  const openCreateFromEvent = (e: ExternalCalendarEvent) =>
    setForm({
      open: true,
      task: null,
      initial: { title: e.title, deadlineDate: e.dateKey },
    });
  const onStatusChange = (id: string, status: TaskStatus) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));

  const filtered = useMemo(
    () => (team ? tasks.filter((t) => t.team === team) : tasks),
    [tasks, team],
  );
  const openTasks = useMemo(
    () => filtered.filter((t) => t.status !== "DONE"),
    [filtered],
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Công việc
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/import"
            title="Import CSV"
            className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-medium text-zinc-600 hover:border-brand-500 hover:text-brand-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-brand-300"
          >
            <FileDown size={14} strokeWidth={2.25} aria-hidden />
            Import
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-md bg-brand-700 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
          >
            <Plus size={15} strokeWidth={2.5} aria-hidden />
            Tạo task
          </button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px dark:border-zinc-800">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-md border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v.key
                ? "border-brand-600 bg-brand-50/60 text-brand-800 dark:bg-brand-950/40 dark:text-brand-300"
                : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <v.icon size={14} strokeWidth={2.25} aria-hidden />
            {v.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTeam("")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            team === ""
              ? "bg-brand-700 text-white shadow-sm dark:bg-brand-600"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          }`}
        >
          Tất cả team
        </button>
        {TEAMS.map((tm) => (
          <button
            key={tm}
            type="button"
            onClick={() => setTeam(tm)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              team === tm
                ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {TEAM_LABELS[tm]}
          </button>
        ))}
      </div>

      {view === "matrix" && (
        <EisenhowerView tasks={openTasks} onEdit={openEdit} />
      )}
      {view === "team" && (
        <TeamBoard
          tasks={filtered}
          onEdit={openEdit}
          onStatusChange={onStatusChange}
          onChanged={refresh}
        />
      )}
      {view === "calendar" && (
        <CalendarView
          tasks={filtered}
          onEdit={openEdit}
          onCreateFromEvent={openCreateFromEvent}
        />
      )}

      {form.open && (
        <TaskForm
          task={form.task}
          leaders={data.leaders}
          templates={data.templates}
          initial={form.initial}
          onClose={() => setForm({ open: false, task: null })}
          onSaved={() => {
            setForm({ open: false, task: null });
            refresh();
          }}
        />
      )}
    </main>
  );
}
