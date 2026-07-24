import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// H4 — Thư mục lưu file upload của Inbox, ngoài OneDrive sync, cùng convention
// với DATABASE_URL (C:/SerynOps/data/seryn.db → C:/SerynOps/attachments/),
// giống cách scripts/backup-db.mjs suy ra thư mục backups/.

export function attachmentsDir(): string {
  // Ưu tiên ATTACHMENTS_DIR (đặt tường minh khi deploy, vd Render/Postgres).
  const explicit = process.env.ATTACHMENTS_DIR;
  if (explicit) {
    mkdirSync(explicit, { recursive: true });
    return explicit;
  }
  // Local SQLite: suy ra cạnh file DB (C:/SerynOps/data/seryn.db → .../attachments).
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("file:")) {
    const dbPath = url.slice("file:".length);
    const dir = join(dirname(dirname(dbPath)), "attachments");
    mkdirSync(dir, { recursive: true });
    return dir;
  }
  // Postgres/khác mà không set ATTACHMENTS_DIR → mặc định ./data/attachments.
  const dir = join(process.cwd(), "data", "attachments");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const ATTACHMENT_EXT_TO_TYPE: Record<string, string> = {
  xlsx: "XLSX",
  xls: "XLSX",
  csv: "XLSX",
  docx: "DOCX",
  pdf: "PDF",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  png: "IMAGE",
  webp: "IMAGE",
  gif: "IMAGE",
};

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15MB

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function extOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function contentTypeFor(ext: string): string {
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
}

/** Tên file an toàn để lưu đĩa: chỉ giữ chữ/số/._- , thêm timestamp chống trùng. */
export function safeAttachmentName(originalName: string): string {
  const ext = extOf(originalName);
  const base = originalName
    .slice(0, originalName.length - ext.length - 1)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 80);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${stamp}-${base || "file"}.${ext}`;
}

export function attachmentExists(fileName: string): boolean {
  return existsSync(join(attachmentsDir(), fileName));
}
