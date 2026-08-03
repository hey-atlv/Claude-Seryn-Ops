import { handleApiError, ok } from "@/lib/api";
import { generateRecurring } from "@/lib/recurring";

export const dynamic = "force-dynamic";

/**
 * Sinh ngay các bản ghi định kỳ đến hạn — nút bấm tay ở Cài đặt › Việc định kỳ.
 * Bình thường việc này chạy tự động khi mở Dashboard/Công việc; nút này để kiểm
 * tra template vừa tạo mà không phải chuyển trang. Idempotent: bấm nhiều lần
 * không sinh trùng (chặn bởi unique (templateId, kỳ)).
 *
 * Lưu ý route: segment tĩnh "run" được ưu tiên hơn "[id]" nên không đụng nhau —
 * id template là cuid nên không bao giờ trùng chuỗi "run".
 */
export async function POST() {
  try {
    const created = await generateRecurring();
    return ok({ created });
  } catch (error) {
    return handleApiError(error);
  }
}
