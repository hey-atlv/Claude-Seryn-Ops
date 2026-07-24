// J2 — Lõi thuần cho đọc Google Sheets → Inbox: bỏ header, chỉ lấy dòng mới
// (dedup theo "chỉ thêm dòng mới ở cuối"), nối ô thành text thô. Không đụng
// Sheets API/DB để test được.

/**
 * Bỏ dòng 1 (header), trả các dòng dữ liệu chưa được nhập (sau `lastRow`).
 * `lastRow` = số dòng dữ liệu (không tính header) đã import ở lần trước.
 */
export function newSheetRows(values: string[][], lastRow: number): string[][] {
  const dataRows = values.slice(1); // bỏ header
  return dataRows.slice(lastRow);
}

/** Nối các ô không rỗng bằng " | ", trả null nếu cả dòng trống (bỏ qua). */
export function rowToInboxText(row: string[]): string | null {
  const cells = row.map((c) => c.trim()).filter((c) => c.length > 0);
  return cells.length > 0 ? cells.join(" | ") : null;
}
