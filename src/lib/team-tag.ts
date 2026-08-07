// P2 — Tên task đang mang tag chữ kiểu "[FB] - Bảng KPI..." rất dài.
// Tách tag ra để UI render thành chip màu, tên gọn lại — DB giữ nguyên.

export interface SplitTitle {
  tag: string | null;
  rest: string;
}

const TAG_RE = /^\[([^\]]{1,16})\]\s*[-–—]?\s*(.+)$/;

export function splitTeamTag(title: string): SplitTitle {
  const m = TAG_RE.exec(title.trim());
  if (!m) return { tag: null, rest: title };
  return { tag: m[1], rest: m[2] };
}

// Màu chip theo tag đã biết (khớp tag convention của từng team);
// tag lạ rơi về zinc. Class viết đủ chuỗi để Tailwind quét được.
const TAG_CLS: Record<string, string> = {
  CMO: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  Digi: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  FB: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Content:
    "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300",
  PR: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  TVOL: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
  TTNB: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  KSKD: "bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-300",
};

const TAG_FALLBACK_CLS =
  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

export function tagClass(tag: string): string {
  return TAG_CLS[tag] ?? TAG_FALLBACK_CLS;
}
