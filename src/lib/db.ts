import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Singleton PrismaClient — tránh tạo nhiều connection khi Next.js hot-reload ở dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  let url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("⚠️ DATABASE_URL chưa được cấu hình. Sử dụng url Postgres mặc định cho build phase.");
    url = "postgresql://postgres:postgres@localhost:5432/seryn";
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
