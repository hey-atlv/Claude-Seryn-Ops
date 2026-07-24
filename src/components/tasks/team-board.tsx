"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TEAM_LABELS,
  TEAMS,
  type TaskStatus,
  type Team,
} from "@/lib/constants";
import type { TaskRow } from "@/lib/task-row";
import { formatVN } from "@/lib/timezone";
import { patchTask } from "./task-api";

// D1 — Board theo Team: mỗi team một dải 4 cột trạng thái, kéo thả card
// sang cột khác để đổi status (chỉ trong cùng team).

const DONE_DISPLAY_LIMIT = 8;

interface TeamBoardProps {
  tasks: TaskRow[];
  onEdit: (task: TaskRow) => void;
  onStatusChange: (id: string, status: TaskStatus) => void; // optimistic ở parent
  onChanged: () => void;
}

const cellId = (team: string, status: string) => `${team}::${status}`;

function BoardCard({
  task,
  onEdit,
}: {
  task: TaskRow;
  onEdit: (task: TaskRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onEdit(task)}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={`w-full cursor-grab rounded-md border border-l-[3px] p-2 text-left shadow-sm transition-shadow hover:shadow-md hover:ring-1 hover:ring-brand-500/40 ${
        isDragging ? "relative z-30 opacity-90 shadow-lg" : ""
      } ${
        task.priority === "CRITICAL"
          ? "border-red-300 border-l-red-600 bg-red-50 dark:border-red-900 dark:border-l-red-500 dark:bg-red-950/40"
          : task.alertStatus === "OVERDUE" && task.status !== "DONE"
            ? "border-zinc-200 border-l-red-500 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            : task.alertStatus === "DUE_SOON" && task.status !== "DONE"
              ? "border-zinc-200 border-l-amber-400 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              : "border-zinc-200 border-l-zinc-300 bg-white dark:border-zinc-700 dark:border-l-zinc-600 dark:bg-zinc-900"
      }`}
    >
      <div
        className={`text-xs font-medium text-zinc-900 dark:text-zinc-100 ${
          task.status === "DONE" ? "text-zinc-400 line-through dark:text-zinc-500" : ""
        }`}
      >
        {task.type === "PROJECT" && "🗂 "}
        {task.title}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
        {task.priority === "CRITICAL" && <span>🔴 Critical</span>}
        {task.priority === "HIGH" && <span>⬆ Cao</span>}
        {task.deadline && (
          <span>📅 {formatVN(new Date(task.deadline), "dd/MM")}</span>
        )}
        {task.alertStatus === "OVERDUE" && <span>🔴 quá hạn</span>}
        {task.alertStatus === "DUE_SOON" && <span>🟡 sắp hạn</span>}
        {task.isSilent && <span>🤫 im lặng</span>}
        {task.leaderName && <span>{task.leaderName}</span>}
      </div>
    </button>
  );
}

function BoardCell({
  team,
  status,
  tasks,
  onEdit,
}: {
  team: Team;
  status: TaskStatus;
  tasks: TaskRow[];
  onEdit: (task: TaskRow) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: cellId(team, status) });
  const shown =
    status === "DONE" ? tasks.slice(0, DONE_DISPLAY_LIMIT) : tasks;
  return (
    <div
      ref={setNodeRef}
      className={`min-h-16 space-y-1.5 rounded-lg border border-dashed p-1.5 transition-colors ${
        isOver
          ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30"
          : "border-transparent bg-zinc-100/70 dark:bg-zinc-800/40"
      }`}
    >
      {shown.map((t) => (
        <BoardCard key={t.id} task={t} onEdit={onEdit} />
      ))}
      {tasks.length > shown.length && (
        <p className="px-1 text-[10px] text-zinc-400">
          +{tasks.length - shown.length} việc đã xong nữa
        </p>
      )}
    </div>
  );
}

export function TeamBoard({
  tasks,
  onEdit,
  onStatusChange,
  onChanged,
}: TeamBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visibleTeams = TEAMS.filter((tm) => tasks.some((t) => t.team === tm));
  if (visibleTeams.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
        Chưa có task nào — bấm &quot;➕ Tạo task&quot; để bắt đầu
      </p>
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const [team, status] = String(e.over.id).split("::");
    const task = tasks.find((t) => t.id === String(e.active.id));
    // Chỉ đổi trạng thái trong cùng team — kéo sang team khác thì bỏ qua
    if (!task || task.team !== team || task.status === status) return;
    const prevStatus = task.status as TaskStatus;
    onStatusChange(task.id, status as TaskStatus);
    patchTask(task.id, { status }).then((res) => {
      if (!res.success) {
        onStatusChange(task.id, prevStatus);
        window.alert(`Đổi trạng thái thất bại: ${res.error}`);
        return;
      }
      onChanged();
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {visibleTeams.map((team) => {
          const teamTasks = tasks.filter((t) => t.team === team);
          return (
            <section key={team}>
              <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {TEAM_LABELS[team]}{" "}
                <span className="font-normal text-zinc-400">
                  · {teamTasks.filter((t) => t.status !== "DONE").length} đang mở
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {TASK_STATUSES.map((status) => {
                  const cellTasks = teamTasks.filter(
                    (t) => t.status === status,
                  );
                  return (
                    <div key={status}>
                      <div className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        {TASK_STATUS_LABELS[status]} ({cellTasks.length})
                      </div>
                      <BoardCell
                        team={team}
                        status={status}
                        tasks={cellTasks}
                        onEdit={onEdit}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </DndContext>
  );
}
