import { fail, handleApiError, ok } from "@/lib/api";
import { listExternalCalendarEvents } from "@/lib/google-sync";

export const dynamic = "force-dynamic";

// GET /api/google/calendar-events?year=2026&month=7 — event Google KHÔNG do app
// tạo trong 1 tháng, cho Calendar view (/tasks?view=calendar) hiển thị + nút
// "tạo task từ event" (J3). Chưa kết nối Google → trả mảng rỗng (không phải lỗi).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return fail("year/month không hợp lệ");
    }
    const events = await listExternalCalendarEvents(year, month);
    return ok(events);
  } catch (error) {
    return handleApiError(error);
  }
}
