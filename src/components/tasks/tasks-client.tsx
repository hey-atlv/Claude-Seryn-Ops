"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Columns3,
  EyeOff,
  FileDown,
  FolderKanban,
  Grid2x2,
  Plus,
} from "lucide-react";
import { TEAM_LABELS, TEAMS, type TaskStatus, type Team } from "@/lib/constants";
import type { ExternalCalendarEvent } from "@/lib/google-calendar-core";
import { splitHidden } from "@/lib/task-hidden";
import type { TaskRow, TasksPageData } from "@/lib/task-row";
import { CalendarView } from "./calendar-view";
import { EisenhowerView } from "./eisenhower-view";
import { HiddenTasksDialog } from "./hidden-tasks-dialog";
import { ProjectsView } from "./projects-view";
import { patchTask } from "./task-api";
import { TaskForm } from "./task-form";
import { TeamBoard } from "./team-board";
import { TimelineView } from "./timeline-view";

// Trang /tasks có 4 views: Ma trận (mặc định, gồm Dòng thời gian ở trên và
// 4 ô Eisenhower ở dưới) · Theo Team · Dự án (card + tick giai đoạn con) ·
// Calendar. Các ?view= cũ (timeline/priority/today/alerts/silent) tự rơi về
// Ma trận — không 404.

const VIEWS = [
  { key: "matrix", label: "Ma trận", icon: Grid2x2 },
  { key: "team", label: "Theo Team", icon: Columns3 },
  { key: "projects", label: "Dự án", icon: FolderKanban },
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
  const [hiddenOpen, setHiddenOpen] = useState(false);
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

  const setHiddenAt = (id: string, hiddenAt: string | null) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, hiddenAt } : t)));

  // Ẩn/bỏ ẩn: cập nhật lạc quan cho bảng gọn ngay, API hỏng thì trả lại như cũ.
  // Chỉ đổi cột hiddenAt — task vẫn nguyên trong DB.
  const setHidden = (id: string, hidden: boolean) => {
    const previous = tasks.find((t) => t.id === id)?.hiddenAt ?? null;
    setHiddenAt(id, hidden ? new Date().toISOString() : null);
    patchTask(id, { hidden }).then((res) => {
      if (!res.success) {
        setHiddenAt(id, previous);
        window.alert(`${hidden ? "Ẩn" : "Bỏ ẩn"} thất bại: ${res.error}`);
        return;
      }
      refresh();
    });
  };

  const filtered = useMemo(
    () => (team ? tasks.filter((t) => t.team === team) : tasks),
    [tasks, team],
  );
  // Ẩn ăn vào cả 3 view: lọc một lần ở đây, view nào cũng chỉ nhận phần đang hiện
  const visible = useMemo(() => splitHidden(filtered).visible, [filtered]);
  const openTasks = useMemo(
    () => visible.filter((t) => t.status !== "DONE"),
    [visible],
  );
  // Danh sách quản lý lấy trên toàn bộ task (không theo bộ lọc team) để việc đã
  // ẩn không bao giờ nằm ngoài tầm với
  const hiddenTasks = useMemo(() => splitHidden(tasks).hidden, [tasks]);

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

        <button
          type="button"
          onClick={() => setHiddenOpen(true)}
          disabled={hiddenTasks.length === 0}
          title="Quản lý việc đã ẩn"
          className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-zinc-600 transition-colors enabled:hover:bg-zinc-200 disabled:cursor-default disabled:text-zinc-400 dark:text-zinc-400 dark:enabled:hover:bg-zinc-800 dark:disabled:text-zinc-600"
        >
          <EyeOff size={13} strokeWidth={2.25} aria-hidden />
          Đã ẩn ({hiddenTasks.length})
        </button>
      </div>

      {view === "matrix" && (
        <div className="space-y-5">
          {/* Toàn cảnh tháng trước, rồi mới tới việc phải xử lý hôm nay */}
          <TimelineView tasks={visible} onEdit={openEdit} />
          <EisenhowerView tasks={openTasks} onEdit={openEdit} />
        </div>
      )}
      {view === "team" && (
        <TeamBoard
          tasks={visible}
          onEdit={openEdit}
          onStatusChange={onStatusChange}
          onHide={(id) => setHidden(id, true)}
          onChanged={refresh}
        />
      )}
      {view === "projects" && (
        <ProjectsView
          projects={visible.filter((t) => t.type === "PROJECT")}
          onEdit={openEdit}
          onChanged={refresh}
        />
      )}
      {view === "calendar" && (
        <CalendarView
          tasks={visible}
          onEdit={openEdit}
          onCreateFromEvent={openCreateFromEvent}
        />
      )}
      {hiddenOpen && (
        <HiddenTasksDialog
          tasks={hiddenTasks}
          onClose={() => setHiddenOpen(false)}
          onUnhide={(id) => setHidden(id, false)}
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
