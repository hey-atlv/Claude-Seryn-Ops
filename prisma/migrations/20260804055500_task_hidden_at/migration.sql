-- AlterTable
-- Ẩn việc đã xong khỏi các bảng ở /tasks — CHỈ ẩn, không xóa.
-- Cột nullable, NULL = đang hiện → mọi dòng có sẵn giữ nguyên hành vi cũ.
ALTER TABLE "Task" ADD COLUMN "hiddenAt" DATETIME;
