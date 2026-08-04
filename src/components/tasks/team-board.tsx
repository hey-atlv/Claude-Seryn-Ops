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
import { EyeOff } from "lucide-react";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TEAM_LABELS,
  TEAMS,
  type TaskStatus,
  type Team,
} from "@/lib/constants";
import { canHide } from "@/lib/task-hidden";
import type { TaskRow } from "@/lib/task-row";
import { formatVN } from "@/lib/timezone";
import { patchTask } from "./task-api";

// D1 — Board theo Team: mỗi team một dải 4 cột trạng thái, kéo thả card
// sang cột khác để đổi status (chỉ trong cùng team).
//
// Mỗi cột là một "bảng" khép kín: tiêu đề đứng yên ở đỉnh, thân cột tự cuộn
// khi quá cao. Trước đây cột dài bao nhiêu thì trang dài bấy nhiêu — team 20+
// việc là phải kéo hết màn hình mới sang được team kế tiếp.

const DONE_DISPLAY_LIMIT = 8;
// Trần chiều cao thân cột — đủ thấy ~8-9 card, phần dư cuộn trong cột
const COLUMN_BODY_MAX_H = "max-h-[56vh]";

interface TeamBoardProps {
  tasks: TaskRow[];
  onEdit: (task: TaskRow) => void;
  onStatusChange: (id: string, status: TaskStatus) => void; // optimistic ở parent
  onHide: (id: string) => void; // ẩn việc đã xong khỏi bảng (không xóa)
  onChanged: () => void;
}

const cellId = (team: string, status: string) => `${team}::${status}`;

// Card là <div> chứ không phải <button>: việc đã xong có thêm nút con mắt ở góc,
// mà button lồng trong button là HTML không hợp lệ. Phần thân (sửa + kéo thả)
// vẫn là một button riêng chiếm gần trọn card.
function BoardCard({
  task,
  onEdit,
  onHide,
}: {
  task: TaskRow;
  onEdit: (task: TaskRow) => void;
  onHide: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  const hideable = canHide(task);
  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={`group relative rounded-md border border-l-[3px] shadow-sm transition-shadow hover:shadow-md hover:ring-1 hover:ring-brand-500/40 ${
        isDragging ? "z-30 opacity-90 shadow-lg" : ""
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
      <button
        type="button"
        {...listeners}
        {...attributes}
        onClick={() => onEdit(task)}
        className={`w-full cursor-grab p-2 text-left ${hideable ? "pr-7" : ""}`}
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
      {hideable && (
        // Màn cảm ứng không có hover nên để hiện sẵn; từ sm trở lên mới nấp đi
        <button
          type="button"
          onClick={() => onHide(task.id)}
          title="Ẩn khỏi bảng (không xóa)"
          aria-label={`Ẩn "${task.title}" khỏi bảng`}
          className="absolute right-1 top-1 grid size-5 place-items-center rounded text-zinc-400 transition-opacity hover:bg-zinc-200 hover:text-zinc-700 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        >
          <EyeOff size={12} strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </div>
  );
}

function BoardCell({
  team,
  status,
  tasks,
  onEdit,
  onHide,
}: {
  team: Team;
  status: TaskStatus;
  tasks: TaskRow[];
  onEdit: (task: TaskRow) => void;
  onHide: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: cellId(team, status) });
  const shown =
    status === "DONE" ? tasks.slice(0, DONE_DISPLAY_LIMIT) : tasks;
  return (
    // Droppable bao cả cột (kể cả tiêu đề) để thả vào đâu trong cột cũng ăn
    <div
      ref={setNodeRef}
      className={`flex flex-col overflow-hidden rounded-lg border transition-colors ${
        isOver
          ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30"
          : "border-zinc-200 bg-zinc-100/70 dark:border-zinc-700/60 dark:bg-zinc-800/40"
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-zinc-200 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-700/60 dark:text-zinc-400">
        <span className="truncate">{TASK_STATUS_LABELS[status]}</span>
        <span className="tabular-nums text-zinc-400 dark:text-zinc-500">
          {tasks.length}
        </span>
      </div>
      <div className={`min-h-16 flex-1 space-y-1.5 overflow-y-auto p-1.5 ${COLUMN_BODY_MAX_H}`}>
        {shown.map((t) => (
          <BoardCard key={t.id} task={t} onEdit={onEdit} onHide={onHide} />
        ))}
        {tasks.length > shown.length && (
          <p className="px-1 text-[10px] text-zinc-400">
            +{tasks.length - shown.length} việc đã xong nữa
          </p>
        )}
      </div>
    </div>
  );
}

export function TeamBoard({
  tasks,
  onEdit,
  onStatusChange,
  onHide,
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
              {/* Không đặt items-start: 4 cột cao bằng nhau cho ra dáng bảng,
                  chiều cao lấy theo cột dài nhất (đã bị trần 56vh chặn) */}
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {TASK_STATUSES.map((status) => (
                  <BoardCell
                    key={status}
                    team={team}
                    status={status}
                    tasks={teamTasks.filter((t) => t.status === status)}
                    onEdit={onEdit}
                    onHide={onHide}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </DndContext>
  );
}
