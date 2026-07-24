import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { GOOGLE_ACCOUNT_ID } from "@/lib/google-auth";
import { pullCalendarChanges } from "@/lib/google-sync";

export const dynamic = "force-dynamic";

// POST /api/google/sync — nút "Đồng bộ ngay" ở /settings
export async function POST() {
  try {
    const account = await prisma.googleAccount.findUnique({
      where: { id: GOOGLE_ACCOUNT_ID },
    });
    if (!account) return fail("Chưa kết nối Google Calendar", 400);
    await pullCalendarChanges();
    const updated = await prisma.googleAccount.findUnique({
      where: { id: GOOGLE_ACCOUNT_ID },
    });
    return ok({ lastSyncAt: updated?.lastSyncAt, lastError: updated?.lastError });
  } catch (error) {
    return handleApiError(error);
  }
}
