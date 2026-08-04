"use client";

import { Eye, X } from "lucide-react";
import { TEAM_LABELS, type Team } from "@/lib/constants";
import type { TaskRow } from "@/lib/task-row";
import { formatVN } from "@/lib/timezone";

// Chỗ quản lý việc đã ẩn — mở từ nút "Đã ẩn (N)" cạnh bộ lọc team.
// Ẩn KHÔNG phải xóa: mọi việc đã ẩn đều nằm đủ ở đây, bỏ ẩn bằng đúng 1 nút.
// Danh sách cố tình KHÔNG theo bộ lọc team, để việc ẩn ở team này không biến mất
// khỏi tầm mắt khi đang lọc team khác.
//
// Dùng lại pattern overlay của useConfirm (Esc + bấm nền để đóng).

interface HiddenTasksDialogProps {
  tasks: TaskRow[]; // đã sắp sẵn: vừa ẩn lên đầu (splitHidden)
  onClose: () => void;
  onUnhide: (id: string) => void;
}

export function HiddenTasksDialog({
  tasks,
  onClose,
  onUnhide,
}: HiddenTasksDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Việc đã ẩn"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-hair bg-panel shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3 border-b border-hair-soft px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-text">
              Việc đã ẩn ({tasks.length})
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Chỉ ẩn khỏi bảng, dữ liệu vẫn còn nguyên — bỏ ẩn là hiện lại.
            </p>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Đóng"
            onClick={onClose}
            className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-panel-3 hover:text-text"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="space-y-1 overflow-y-auto px-3 py-3">
          {tasks.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted">
              Chưa ẩn việc nào.
            </p>
          )}
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-panel-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-text">
                  {task.type === "PROJECT" && "🗂 "}
                  {task.title}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {TEAM_LABELS[task.team as Team] ?? task.team}
                  {task.leaderName && ` · ${task.leaderName}`}
                  {task.hiddenAt &&
                    ` · ẩn ${formatVN(new Date(task.hiddenAt), "dd/MM/yyyy")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUnhide(task.id)}
                aria-label={`Bỏ ẩn "${task.title}"`}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-hair px-2.5 py-1 text-[11px] font-medium text-dim transition-colors hover:border-gold hover:text-text"
              >
                <Eye size={13} strokeWidth={2.25} aria-hidden />
                Bỏ ẩn
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
