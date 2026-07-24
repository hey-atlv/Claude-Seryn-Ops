// Predicate thuần cho mã lỗi Prisma — tách riêng để dùng chung và test được
// (không import Prisma runtime nên nhẹ, an toàn cho unit test).

/**
 * Prisma P2025 = "An operation failed because it depends on one or more records
 * that were required but not found" (bản ghi cần xóa/cập nhật không tồn tại).
 * Dùng để phân biệt lỗi idempotent (đã xóa từ trước) với lỗi hệ thống thật.
 */
export function isRecordNotFound(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2025";
}
