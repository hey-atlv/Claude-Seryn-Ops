import { google } from "googleapis";
import { proposeTriage } from "./ai-triage";
import { prisma } from "./db";
import { GOOGLE_ACCOUNT_ID, getAuthedClient, type OAuth2Client } from "./google-auth";
import { newSheetRows, rowToInboxText } from "./google-sheets-core";
import { guessDraftFromLine } from "./inbox-core";

// J2 — Google Sheets → Inbox: đọc mỗi sheet nguồn (GoogleSheetSource, có thể
// nhiều sheet/link cùng lúc) mỗi khi mở "Hôm nay" (giống pattern
// pullCalendarChanges trong google-sync.ts), best-effort — lỗi 1 source không
// được phép chặn source khác hay làm hỏng luồng chính.

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Lỗi không rõ";
}

/** Đọc 1 sheet nguồn, tự cập nhật lastRow/lastSyncAt/lastError của riêng nó. */
async function pullOneSource(
  sourceId: string,
  sheetId: string,
  sheetRange: string,
  lastRow: number,
  auth: OAuth2Client,
): Promise<void> {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetRange,
    });
    const values = (res.data.values ?? []) as string[][];

    const rows = newSheetRows(values, lastRow);
    for (const row of rows) {
      const rawText = rowToInboxText(row);
      if (!rawText) continue; // dòng trống — vẫn tính vào lastRow bên dưới
      const draft = (await proposeTriage(rawText)) ?? guessDraftFromLine(rawText);
      await prisma.inboxItem.create({
        data: {
          source: "GSHEET",
          rawText,
          parsedDraft: JSON.stringify(draft),
        },
      });
    }

    await prisma.googleSheetSource.update({
      where: { id: sourceId },
      data: { lastRow: lastRow + rows.length, lastSyncAt: new Date(), lastError: null },
    });
  } catch (err) {
    console.error(`[GoogleSheets] pull source ${sourceId} thất bại:`, err);
    await prisma.googleSheetSource
      .update({ where: { id: sourceId }, data: { lastError: errorMessage(err) } })
      .catch(() => {});
  }
}

/** Google Sheets → App: đọc dòng mới của mọi sheet nguồn đã cấu hình. */
export async function pullSheetChanges(): Promise<void> {
  const sources = await prisma.googleSheetSource
    .findMany({ where: { accountId: GOOGLE_ACCOUNT_ID } })
    .catch(() => []);
  if (sources.length === 0) return; // chưa cấu hình sheet nào

  const auth = await getAuthedClient();
  if (!auth) return; // chưa kết nối Google

  for (const source of sources) {
    await pullOneSource(source.id, source.sheetId, source.sheetRange, source.lastRow, auth);
  }
}
