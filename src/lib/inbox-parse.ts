// H2 — Trích text thô từ file upload theo fileType, để review trong Inbox.
// KHÔNG tự map cột như /import (đã có cho CSV có cấu trúc) — chỉ lấy text
// để người dùng đọc rồi tự quyết convert sang task nào.

export async function extractText(
  buffer: Buffer,
  fileType: string,
): Promise<string | null> {
  switch (fileType) {
    case "XLSX": {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "buffer" });
      const first = wb.SheetNames[0];
      if (!first) return null;
      return XLSX.utils.sheet_to_csv(wb.Sheets[first]).trim() || null;
    }
    case "DOCX": {
      const mammoth = (await import("mammoth")).default;
      const { value } = await mammoth.extractRawText({ buffer });
      return value.trim() || null;
    }
    case "PDF": {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return result.text.trim() || null;
      } finally {
        await parser.destroy();
      }
    }
    default:
      return null; // IMAGE — không parse, lưu làm attachment thô
  }
}
