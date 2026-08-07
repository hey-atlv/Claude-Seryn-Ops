import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { DUTIES, dutyNote } from "./nhiem-vu-cmo-data.mjs";

// Biến 12 nhóm chức năng nhiệm vụ CMO (Sheet 1B file 260724_Đóng gói công việc
// GĐMKT_View.xlsx) thành task công việc của Ất — người kế nhiệm.
// Chạy: `npx tsx scripts/import-nhiem-vu-cmo.mts`
//
// Mỗi nhiệm vụ = 1 task top-level (Digital · Ất) cho kỳ tháng 8/2026:
// startDate hôm nay, deadline cuối tháng (nhịp "Tháng" theo file; khía cạnh
// Quý/Năm ghi trong note). Idempotent — trùng tiêu đề thì bỏ qua.
// Dữ liệu 12 nhiệm vụ: scripts/nhiem-vu-cmo-data.mts (dùng chung với
// tao-template-cmo.mts — template định kỳ hằng tháng).

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Thiếu TURSO_DATABASE_URL/DATABASE_URL trong .env");
const adapter = new PrismaLibSql({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const prisma = new PrismaClient({ adapter });

// Khớp cách form app lưu mốc: start = 00:00 VN, deadline = 23:59:59 VN
const startVN = (d: string) => new Date(`${d}T00:00:00+07:00`);
const deadlineVN = (d: string) => new Date(`${d}T23:59:59+07:00`);
const START = "2026-08-07";
const DEADLINE = "2026-08-31";

async function main() {
  const at = await prisma.leader.findFirst({ where: { team: "DIGITAL", name: "Ất" } });

  let created = 0;
  for (const d of DUTIES) {
    const existing = await prisma.task.findFirst({ where: { title: d.title } });
    if (existing) {
      console.log(`Đã có — bỏ qua: ${d.title}`);
      continue;
    }
    await prisma.task.create({
      data: {
        title: d.title,
        type: "TASK",
        team: "DIGITAL",
        leaderId: at?.id ?? null,
        status: "TODO",
        priority: d.priority,
        revenueImpact: d.priority === "HIGH" ? "HIGH" : "MEDIUM",
        startDate: startVN(START),
        deadline: deadlineVN(DEADLINE),
        note: dutyNote(d),
      },
    });
    created++;
    console.log(`+ [${d.stt}] ${d.title} (${d.priority})`);
  }
  console.log(`Xong — tạo mới ${created}/${DUTIES.length} task nhiệm vụ CMO cho kỳ tháng 8/2026.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
