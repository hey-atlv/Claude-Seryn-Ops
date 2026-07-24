import { handleApiError, ok } from "@/lib/api";
import { getNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getNotifications());
  } catch (error) {
    return handleApiError(error);
  }
}
