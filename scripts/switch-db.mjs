import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const target = process.argv[2];

if (target !== 'sqlite' && target !== 'postgres') {
  console.error('Vui lòng chọn target: node scripts/switch-db.mjs [sqlite|postgres]');
  process.exit(1);
}

const rootDir = process.cwd();

// 1. Modify prisma/schema.prisma
const schemaPath = path.join(rootDir, 'prisma/schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');
if (target === 'sqlite') {
  schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
} else {
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
}
fs.writeFileSync(schemaPath, schemaContent, 'utf8');
console.log(`Updated schema.prisma to ${target}`);

// 2. Modify src/lib/db.ts
const dbPath = path.join(rootDir, 'src/lib/db.ts');
let dbContent = '';
if (target === 'sqlite') {
  dbContent = `import { PrismaLibSql } from "@prisma/adapter-libsql";
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
`;
} else {
  dbContent = `import { PrismaPg } from "@prisma/adapter-pg";
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
`;
}
fs.writeFileSync(dbPath, dbContent, 'utf8');
console.log(`Updated db.ts to ${target}`);

// 3. Modify prisma/seed.mts and scripts/them-leader-digital.mts
const seedPath = path.join(rootDir, 'prisma/seed.mts');
let seedContent = fs.readFileSync(seedPath, 'utf8');
const digitalLeaderPath = path.join(rootDir, 'scripts/them-leader-digital.mts');
let digitalLeaderContent = fs.readFileSync(digitalLeaderPath, 'utf8');

if (target === 'sqlite') {
  seedContent = seedContent.replace(/import\s*\{\s*PrismaPg\s*\}\s*from\s*"@prisma\/adapter-pg";/g, 'import { PrismaLibSql } from "@prisma/adapter-libsql";');
  seedContent = seedContent.replace(/const\s+adapter\s+=\s+new\s+PrismaPg\s*\(\{\s*connectionString:\s*databaseUrl\s*\}\);/g, 'const adapter = new PrismaLibSql({ url: databaseUrl, authToken: process.env.TURSO_AUTH_TOKEN });');

  digitalLeaderContent = digitalLeaderContent.replace(/import\s*\{\s*PrismaPg\s*\}\s*from\s*"@prisma\/adapter-pg";/g, 'import { PrismaLibSql } from "@prisma/adapter-libsql";');
  digitalLeaderContent = digitalLeaderContent.replace(/const\s+adapter\s+=\s+new\s+PrismaPg\s*\(\{\s*connectionString:\s*databaseUrl\s*\}\);/g, 'const adapter = new PrismaLibSql({ url: databaseUrl, authToken: process.env.TURSO_AUTH_TOKEN });');
} else {
  seedContent = seedContent.replace(/import\s*\{\s*PrismaLibSql\s*\}\s*from\s*"@prisma\/adapter-libsql";/g, 'import { PrismaPg } from "@prisma/adapter-pg";');
  seedContent = seedContent.replace(/const\s+adapter\s+=\s+new\s+PrismaLibSql\s*\(\s*\{[\s\S]*?\}\s*\);/g, 'const adapter = new PrismaPg({ connectionString: databaseUrl });');

  digitalLeaderContent = digitalLeaderContent.replace(/import\s*\{\s*PrismaLibSql\s*\}\s*from\s*"@prisma\/adapter-libsql";/g, 'import { PrismaPg } from "@prisma/adapter-pg";');
  digitalLeaderContent = digitalLeaderContent.replace(/const\s+adapter\s+=\s+new\s+PrismaLibSql\s*\(\s*\{[\s\S]*?\}\s*\);/g, 'const adapter = new PrismaPg({ connectionString: databaseUrl });');
}
fs.writeFileSync(seedPath, seedContent, 'utf8');
fs.writeFileSync(digitalLeaderPath, digitalLeaderContent, 'utf8');
console.log(`Updated seed.mts and them-leader-digital.mts to ${target}`);

// 4. Regenerate Prisma Client
console.log('Running npx prisma generate...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('Prisma Client regenerated successfully.');
} catch (e) {
  console.error('Failed to regenerate Prisma Client:', e);
}
