import Database from "better-sqlite3";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";

// G5 — Backup SQLite định kỳ. Dùng backup API của better-sqlite3 (snapshot
// nhất quán, an toàn khi app đang ghi) thay vì copy file thô.
// Chạy: npm run backup — hoặc Windows Task Scheduler gọi hằng ngày.

const KEEP_BACKUPS = 14;

function dbPathFromEnv() {
  // Script chạy ngoài Next.js nên .env không tự nạp — đọc tay khi env trống
  if (!process.env.DATABASE_URL && existsSync(".env")) {
    const match = readFileSync(".env", "utf-8").match(
      /^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m,
    );
    if (match) process.env.DATABASE_URL = match[1];
  }
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:")) {
    throw new Error(`DATABASE_URL không hợp lệ: ${url ?? "(trống)"}`);
  }
  return url.slice("file:".length);
}

async function main() {
  const dbPath = dbPathFromEnv();
  if (!existsSync(dbPath)) {
    throw new Error(`Không thấy file DB: ${dbPath}`);
  }

  // C:/SerynOps/data/seryn.db → C:/SerynOps/backups/seryn-yyyy-mm-dd.db
  const backupDir = join(dirname(dirname(dbPath)), "backups");
  mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toLocaleDateString("sv-SE"); // yyyy-mm-dd theo giờ máy
  const target = join(backupDir, `seryn-${stamp}.db`);

  const db = new Database(dbPath, { readonly: true });
  try {
    await db.backup(target);
  } finally {
    db.close();
  }

  // Tên file chứa ngày nên sort theo tên = sort theo thời gian
  const old = readdirSync(backupDir)
    .filter((f) => /^seryn-\d{4}-\d{2}-\d{2}\.db$/.test(f))
    .sort()
    .slice(0, -KEEP_BACKUPS);
  for (const f of old) unlinkSync(join(backupDir, f));

  // H4 — mirror file đính kèm Inbox cùng nhịp với DB (file gốc vẫn còn trên
  // đĩa nên chỉ cần 1 bản mirror, không cần giữ nhiều phiên bản như DB)
  const attachmentsDir = join(dirname(dirname(dbPath)), "attachments");
  let attachmentCount = 0;
  if (existsSync(attachmentsDir)) {
    const mirrorDir = join(backupDir, "attachments");
    cpSync(attachmentsDir, mirrorDir, { recursive: true });
    attachmentCount = readdirSync(mirrorDir).length;
  }

  console.log(
    `[backup-db] OK → ${target} (giữ ${KEEP_BACKUPS} bản, xóa ${old.length} bản cũ, ` +
      `mirror ${attachmentCount} file đính kèm)`,
  );
}

main().catch((err) => {
  console.error("[backup-db] LỖI:", err instanceof Error ? err.message : err);
  process.exit(1);
});
