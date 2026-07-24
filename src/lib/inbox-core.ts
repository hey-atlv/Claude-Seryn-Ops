import { parseDeadline } from "./import-core";

// H3 — Lõi thuần cho quick capture: dán nhiều dòng text → tách thành từng dòng
// (mỗi dòng = 1 InboxItem draft) → đoán deadline (nếu có dd/mm/yyyy trong dòng)
// để gợi ý sẵn, phần còn lại của dòng làm tiêu đề. Không đụng DB, có test.

/** Tách text dán vào thành các dòng khác rỗng, đã trim. */
export function parseQuickCapture(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export interface QuickCaptureDraft {
  title: string;
  deadline: string | null; // ISO 23:59:59+07:00, null nếu không tìm thấy ngày trong dòng
}

const DATE_IN_LINE = /(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/;

/** Tách 1 dòng thành tiêu đề + deadline gợi ý (nếu dòng có chứa 1 mốc ngày). */
export function guessDraftFromLine(line: string): QuickCaptureDraft {
  const match = line.match(DATE_IN_LINE);
  if (!match) return { title: line, deadline: null };

  const deadline = parseDeadline(match[1]);
  if (!deadline) return { title: line, deadline: null };

  // Bỏ mốc ngày + dấu câu thừa quanh nó ra khỏi tiêu đề
  const title = line
    .replace(match[0], "")
    .replace(/[\s,;:.\-–—]+$/, "")
    .replace(/^[\s,;:.\-–—]+/, "")
    .trim();
  return { title: title || line, deadline };
}
