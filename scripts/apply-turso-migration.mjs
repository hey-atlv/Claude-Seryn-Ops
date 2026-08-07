import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

// Áp một file migration .sql lên DB Turso.
//
// Vì sao cần script này: prisma.config.ts trỏ Migrate vào file SQLite local,
// còn app lúc chạy lại đọc Turso (src/lib/db.ts) — nên `prisma migrate deploy`
// KHÔNG chạm tới DB thật. Script chạy thẳng từng câu lệnh lên Turso.
//
//   node scripts/apply-turso-migration.mjs prisma/migrations/<tên>/migration.sql
//
// Chỉ dùng cho migration additive (ADD COLUMN / CREATE …). Đọc kỹ nội dung file
// trước khi chạy — script không tự chặn lệnh phá dữ liệu.

const file = process.argv[2];
if (!file) {
  console.error("Thiếu đường dẫn file migration.");
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Chưa cấu hình TURSO_DATABASE_URL trong .env");
  process.exit(1);
}

// Bỏ comment và dòng trống, tách theo dấu ; — đủ cho các migration additive
const statements = readFileSync(file, "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

if (statements.length === 0) {
  console.error(`${file} không có câu lệnh nào.`);
  process.exit(1);
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

// ADD COLUMN chạy lần hai sẽ báo "duplicate column" — bỏ qua để script chạy lại được
const alreadyApplied = (message) =>
  /duplicate column|already exists/i.test(message);

try {
  for (const sql of statements) {
    console.log(`→ ${sql}`);
    try {
      await client.execute(sql);
      console.log("  ✔ xong");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!alreadyApplied(message)) throw error;
      console.log("  ↷ đã có từ trước, bỏ qua");
    }
  }
  console.log(`\nĐã áp ${file} lên Turso.`);
} catch (error) {
  console.error("\n✖ Thất bại:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.close();
}
