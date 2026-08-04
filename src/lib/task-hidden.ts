// Ẩn việc đã xong khỏi các bảng ở /tasks — CHỈ ẩn, KHÔNG xóa.
// Định nghĩa "đã ẩn" nằm gọn ở đây để cả 3 view (Ma trận · Theo Team · Calendar)
// và bảng quản lý việc đã ẩn hiểu giống nhau, và test được mà không cần DB.

/** Chỉ việc đã xong mới được ẩn — việc đang mở phải luôn nhìn thấy */
export const HIDE_ELIGIBLE_STATUS = "DONE";

export interface HideableTask {
  status: string;
  hiddenAt: string | null; // ISO-8601 UTC, null = đang hiện
}

export const isHidden = (task: HideableTask): boolean => task.hiddenAt !== null;

/** Có được phép bấm ẩn không — dùng để quyết định hiện nút con mắt trên card */
export const canHide = (task: HideableTask): boolean =>
  task.status === HIDE_ELIGIBLE_STATUS && !isHidden(task);

/**
 * Tách mảng task thành phần đang hiện và phần đã ẩn.
 * Phần đã ẩn xếp theo mốc ẩn giảm dần (vừa ẩn lên đầu) để tìm lại việc lỡ tay
 * ẩn cho nhanh; phần đang hiện giữ nguyên thứ tự đầu vào.
 */
export function splitHidden<T extends HideableTask>(
  tasks: readonly T[],
): { visible: T[]; hidden: T[] } {
  const visible: T[] = [];
  const hidden: T[] = [];
  for (const task of tasks) {
    if (isHidden(task)) hidden.push(task);
    else visible.push(task);
  }
  hidden.sort((a, b) => (b.hiddenAt ?? "").localeCompare(a.hiddenAt ?? ""));
  return { visible, hidden };
}
