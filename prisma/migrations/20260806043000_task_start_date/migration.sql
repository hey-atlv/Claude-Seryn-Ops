-- AlterTable
-- Ngày bắt đầu theo kế hoạch — dùng vẽ thanh ở view "Dòng thời gian" (/tasks).
-- Cột nullable, NULL = chưa điền → view tự lùi về ngày tạo, mọi dòng có sẵn
-- giữ nguyên hành vi cũ.
ALTER TABLE "Task" ADD COLUMN "startDate" DATETIME;
