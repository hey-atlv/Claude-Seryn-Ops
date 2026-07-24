import { handleApiError, ok } from "@/lib/api";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

// GET /api/dashboard — 4 khối Home Dashboard (logic dùng chung ở lib/dashboard.ts)
export async function GET() {
  try {
    return ok(await getDashboardData());
  } catch (error) {
    return handleApiError(error);
  }
}
