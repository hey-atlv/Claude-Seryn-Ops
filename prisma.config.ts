import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: connection URL cho Migrate nằm ở đây (không còn trong schema.prisma).
// Runtime client dùng driver adapter — xem src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.mts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
