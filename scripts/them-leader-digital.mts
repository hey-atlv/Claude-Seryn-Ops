import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { type Channel } from "../src/lib/constants";

// Bổ sung/cập nhật 3 leader theo kênh cho Team Digital (Facebook/Zalo/Google) vào
// DB THẬT. Chạy: `npx tsx scripts/them-leader-digital.mts` (dùng DATABASE_URL trong .env).
//
// Idempotent — chạy nhiều lần không tạo trùng:
//  - Đã có leader cho kênh đó → chỉ cập nhật tên.
//  - Chưa có → "nhận nuôi" leader placeholder cũ của Digital (channel = null) thành
//    kênh này để KHÔNG bỏ mồ côi task đã gán cho placeholder; hết placeholder thì tạo mới.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL chưa được cấu hình — kiểm tra file .env");
}
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const DIGITAL_LEADERS: Array<{ channel: Channel; name: string }> = [
  { channel: "FACEBOOK", name: "Ánh" },
  { channel: "ZALO", name: "Toàn" },
  { channel: "GOOGLE", name: "Chung" },
];

async function main() {
  for (const { channel, name } of DIGITAL_LEADERS) {
    const existing = await prisma.leader.findFirst({
      where: { team: "DIGITAL", channel },
    });
    if (existing) {
      await prisma.leader.update({ where: { id: existing.id }, data: { name } });
      console.log(`Cập nhật: Digital/${channel} → ${name}`);
      continue;
    }
    const placeholder = await prisma.leader.findFirst({
      where: { team: "DIGITAL", channel: null },
    });
    if (placeholder) {
      await prisma.leader.update({
        where: { id: placeholder.id },
        data: { name, channel },
      });
      console.log(`Chuyển placeholder cũ → Digital/${channel} = ${name}`);
    } else {
      await prisma.leader.create({ data: { team: "DIGITAL", name, channel } });
      console.log(`Tạo mới: Digital/${channel} = ${name}`);
    }
  }
  const total = await prisma.leader.count({ where: { team: "DIGITAL" } });
  console.log(`Xong. Team Digital hiện có ${total} leader.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
