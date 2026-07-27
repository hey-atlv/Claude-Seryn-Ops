import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

// Singleton PrismaClient — tránh tạo nhiều connection khi Next.js hot-reload ở dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  let url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.warn("⚠️ DATABASE_URL chưa được cấu hình. Sử dụng url SQLite mặc định.");
    url = process.platform === "win32" 
      ? "file:C:/SerynOps/data/seryn.db" 
      : "file:./seryn.db";
  }
  const adapter = new PrismaLibSql({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
