import { handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isRecordNotFound } from "@/lib/prisma-error";
import { GOOGLE_ACCOUNT_ID, revokeGoogleAccess } from "@/lib/google-auth";

export const dynamic = "force-dynamic";

// POST /api/google/disconnect — chỉ xóa liên kết trong app, KHÔNG xóa lịch/event
// đã tạo trên Google (an toàn — sếp tự quản lý lịch "Seryn Ops" trên Google nếu muốn dọn).
// Xóa GoogleSheetSource trước vì FK RESTRICT — sheet nguồn gắn với 1 tài khoản,
// mất kết nối thì cấu hình sheet cũng không dùng được nữa, cần thêm lại sau khi
// kết nối lại (đã ghi rõ trong docs/GOOGLE-CALENDAR-SETUP.md).
export async function POST() {
  try {
    // Best-effort: cắt uỷ quyền phía Google TRƯỚC khi xóa token khỏi DB (đúng
    // nghĩa "ngắt kết nối"). revokeGoogleAccess tự nuốt lỗi mạng/token nên không
    // cản việc dọn liên kết app-side bên dưới.
    await revokeGoogleAccess();
    // Gói 2 lệnh delete trong 1 transaction (dạng mảng — atomic, giữ thứ tự):
    // nếu xóa account hỏng sau khi đã xóa sheet, cả hai rollback. Tránh cảnh
    // mất sạch cấu hình sheet mà tài khoản vẫn còn kết nối (mất dữ liệu âm thầm).
    await prisma.$transaction([
      prisma.googleSheetSource.deleteMany({ where: { accountId: GOOGLE_ACCOUNT_ID } }),
      prisma.googleAccount.delete({ where: { id: GOOGLE_ACCOUNT_ID } }),
    ]);
    return ok({ disconnected: true });
  } catch (error) {
    // P2025 = tài khoản đã bị xóa từ trước → coi như đã ngắt kết nối (idempotent).
    // Mọi lỗi khác (DB lỗi, mất kết nối...) PHẢI báo thật, không nuốt rồi trả
    // disconnected:true giả như bản cũ (.catch(() => {})).
    if (isRecordNotFound(error)) return ok({ disconnected: true });
    return handleApiError(error);
  }
}
