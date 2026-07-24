import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { GOOGLE_ACCOUNT_ID } from "@/lib/google-auth";
import { googleSheetSourceCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// POST /api/google/sheets-config — thêm 1 sheet nguồn mới ở /settings (J2)
export async function POST(req: Request) {
  try {
    const account = await prisma.googleAccount.findUnique({
      where: { id: GOOGLE_ACCOUNT_ID },
    });
    if (!account) return fail("Chưa kết nối Google Calendar", 400);

    const body = await req.json().catch(() => null);
    if (!body) return fail("Body không phải JSON hợp lệ");
    const input = googleSheetSourceCreateSchema.parse(body);

    const source = await prisma.googleSheetSource.create({
      data: {
        accountId: GOOGLE_ACCOUNT_ID,
        label: input.label,
        sheetId: input.sheetId,
        sheetRange: input.sheetRange,
      },
    });
    return ok(source, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
