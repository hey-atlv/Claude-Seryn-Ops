import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { DUTIES, dutyNote } from "./nhiem-vu-cmo-data.mjs";

// Tạo 12 RecurringTemplate MONTHLY từ 12 nhiệm vụ CMO — mỗi đầu tháng app tự
// sinh task "(tháng M/YYYY)" với deadline cuối tháng (defaults.deadlineDay=31)
// và ghi chú checklist chi tiết (defaults.note).
// Chạy: `npx tsx scripts/tao-template-cmo.mts`
//
// Đồng thời link 12 task tháng 8/2026 đã tạo tay (import-nhiem-vu-cmo.mts) vào
// template với recurrenceKey "2026-08" — để kỳ tháng 8 KHÔNG bị sinh trùng.
// Idempotent — template trùng tên thì bỏ qua.

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Thiếu TURSO_DATABASE_URL/DATABASE_URL trong .env");
const adapter = new PrismaLibSql({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const prisma = new PrismaClient({ adapter });

const CURRENT_KEY = "2026-08"; // kỳ đã tạo task tay — khớp periodKey MONTHLY

async function main() {
  let created = 0;
  let linked = 0;
  for (const d of DUTIES) {
    let tpl = await prisma.recurringTemplate.findFirst({
      where: { name: d.title, targetDb: "TASK" },
    });
    if (tpl) {
      console.log(`Template đã có — bỏ qua: ${d.title}`);
    } else {
      tpl = await prisma.recurringTemplate.create({
        data: {
          name: d.title,
          targetDb: "TASK",
          scheduleType: "MONTHLY",
          scheduleDay: 1, // sinh ngày 1 hằng tháng
          defaults: JSON.stringify({
            type: "TASK",
            team: "DIGITAL",
            priority: d.priority,
            revenueImpact: d.priority === "HIGH" ? "HIGH" : "MEDIUM",
            deadlineDay: "31", // hạn cuối tháng (tự lùi theo số ngày thực)
            note: dutyNote(d),
          }),
          active: true,
        },
      });
      created++;
      console.log(`+ Template [${d.stt}] ${d.title}`);
    }

    // Link task tháng 8 đã tạo tay vào template — chặn sinh trùng kỳ này
    const augustTask = await prisma.task.findFirst({
      where: { title: d.title, recurringTemplateId: null },
    });
    if (augustTask) {
      await prisma.task.update({
        where: { id: augustTask.id },
        data: { recurringTemplateId: tpl.id, recurrenceKey: CURRENT_KEY },
      });
      linked++;
    }
  }
  console.log(
    `Xong — tạo ${created}/${DUTIES.length} template, link ${linked} task tháng 8 vào template (key ${CURRENT_KEY}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
