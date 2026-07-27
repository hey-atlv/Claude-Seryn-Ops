import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { TEAMS, TEAM_LABELS, type Channel } from "../src/lib/constants";

// Seed: 6 leader + 9 recurring templates (bảng 2.1.f + 2 template DB3)
// + dữ liệu [DEMO] để kiểm tra formula/view. Idempotent: đã có leader thì bỏ qua.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL chưa được cấu hình — kiểm tra file .env");
}
const adapter = new PrismaLibSql({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });
const DAY = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);

async function main() {
  if ((await prisma.leader.count()) > 0) {
    console.log("Seed đã chạy trước đó — bỏ qua.");
    return;
  }

  // ── Leader: 5 team 1 leader (tên tạm), Digital 3 leader theo kênh ──
  const leaderId: Record<string, string> = {};
  for (const team of TEAMS) {
    if (team === "DIGITAL") continue; // Digital xử lý riêng bên dưới (3 kênh)
    const l = await prisma.leader.create({
      data: { name: `Leader ${TEAM_LABELS[team]}`, team },
    });
    leaderId[team] = l.id;
  }

  // Team Digital tách theo kênh — mỗi kênh 1 leader (tên thật từ sếp).
  const digitalLeaders: Array<{ channel: Channel; name: string }> = [
    { channel: "FACEBOOK", name: "Ánh" },
    { channel: "ZALO", name: "Toàn" },
    { channel: "GOOGLE", name: "Chung" },
  ];
  for (const d of digitalLeaders) {
    const l = await prisma.leader.create({
      data: { name: d.name, team: "DIGITAL", channel: d.channel },
    });
    // leaderId.DIGITAL dùng cho task demo bên dưới — gán leader kênh đầu (Facebook/Ánh).
    leaderId.DIGITAL ??= l.id;
  }

  // ── 7 database templates cho Task (bảng 2.1.f) ──
  const taskTemplates: Array<{
    name: string;
    scheduleType: string;
    scheduleDay: number | null;
    defaults: Record<string, string>;
    subItems?: string[];
  }> = [
    {
      name: "Báo cáo KPI tuần — Digital",
      scheduleType: "WEEKLY",
      scheduleDay: 1,
      defaults: { team: "DIGITAL", category: "KPI/ROAS", revenueImpact: "HIGH" },
    },
    {
      name: "Báo cáo content hiệu quả — Content",
      scheduleType: "WEEKLY",
      scheduleDay: 1,
      defaults: { team: "CONTENT", category: "Content hiệu quả" },
    },
    {
      name: "Báo cáo chỉ số TVOL",
      scheduleType: "WEEKLY",
      scheduleDay: 1,
      defaults: { team: "TVOL", category: "Chỉ số CSKH/Chuyển đổi" },
    },
    {
      name: "Báo cáo doanh thu/chi tiêu — KSKD&KT",
      scheduleType: "WEEKLY",
      scheduleDay: 1,
      defaults: {
        team: "KSKD_KT",
        category: "Doanh thu/Chi tiêu",
        revenueImpact: "HIGH",
      },
    },
    {
      name: "PR metrics tháng",
      scheduleType: "MONTHLY",
      scheduleDay: 1,
      defaults: { team: "PR_TRADE_EVENT", category: "PR metrics" },
    },
    {
      name: "Dự án mới (khung Project)",
      scheduleType: "NONE",
      scheduleDay: null,
      defaults: { type: "PROJECT" },
      subItems: ["Kế hoạch", "Triển khai", "Review", "Nghiệm thu"],
    },
    {
      name: "🔴 Khủng hoảng",
      scheduleType: "NONE",
      scheduleDay: null,
      defaults: { priority: "CRITICAL", revenueImpact: "HIGH" },
    },
  ];
  for (const t of taskTemplates) {
    await prisma.recurringTemplate.create({
      data: {
        name: t.name,
        targetDb: "TASK",
        scheduleType: t.scheduleType,
        scheduleDay: t.scheduleDay,
        defaults: JSON.stringify(t.defaults),
        subItemsTemplate: t.subItems ? JSON.stringify(t.subItems) : null,
      },
    });
  }

  // ── 2 template báo cáo DB3: weekly thứ 6, monthly ngày 1 ──
  await prisma.recurringTemplate.create({
    data: {
      name: "Weekly quick update",
      targetDb: "REPORT",
      scheduleType: "WEEKLY",
      scheduleDay: 5,
      defaults: JSON.stringify({ type: "WEEKLY" }),
    },
  });
  await prisma.recurringTemplate.create({
    data: {
      name: "Monthly full report",
      targetDb: "REPORT",
      scheduleType: "MONTHLY",
      scheduleDay: 1,
      defaults: JSON.stringify({ type: "MONTHLY" }),
    },
  });

  // ── Dữ liệu [DEMO] — nhận diện bằng prefix [DEMO] để xóa sau go-live ──
  await prisma.task.create({
    data: {
      title: "[DEMO] [DIG] Báo cáo ROAS tuần 29",
      team: "DIGITAL",
      leaderId: leaderId.DIGITAL,
      category: "KPI/ROAS",
      status: "IN_PROGRESS",
      deadline: inDays(-1),
      priority: "HIGH",
      revenueImpact: "HIGH",
      lastUpdateAt: inDays(-2),
      lastUpdateNote: "Đã gom số liệu 4/6 chiến dịch",
    },
  });
  await prisma.task.create({
    data: {
      title: "[DEMO] 🔴 Xử lý phản ánh tiêu cực trên fanpage",
      team: "PR_TRADE_EVENT",
      leaderId: leaderId.PR_TRADE_EVENT,
      category: "Dự án/Hoạt động",
      status: "IN_PROGRESS",
      deadline: inDays(1),
      priority: "CRITICAL",
      revenueImpact: "HIGH",
      lastUpdateAt: inDays(0),
      lastUpdateNote: "Đã có draft thông cáo, chờ duyệt",
    },
  });
  await prisma.task.create({
    data: {
      title: "[DEMO] [CT] Duyệt 5 content ads tháng 8",
      team: "CONTENT",
      leaderId: leaderId.CONTENT,
      category: "Sản xuất content",
      status: "REVIEW",
      deadline: inDays(1),
      priority: "NORMAL",
      revenueImpact: "MEDIUM",
    },
  });
  await prisma.task.create({
    data: {
      title: "[DEMO] [TVOL] Báo cáo chỉ số CSKH tuần",
      team: "TVOL",
      leaderId: leaderId.TVOL,
      category: "Chỉ số CSKH/Chuyển đổi",
      status: "TODO",
      deadline: inDays(4),
      priority: "NORMAL",
      revenueImpact: "MEDIUM",
    },
  });
  await prisma.task.create({
    data: {
      title: "[DEMO] [TNNB] Bản tin nội bộ tháng 8",
      team: "TNNB",
      leaderId: leaderId.TNNB,
      category: "Bản tin nội bộ",
      status: "IN_PROGRESS",
      deadline: inDays(12),
      priority: "NORMAL",
      revenueImpact: "LOW",
      lastUpdateAt: inDays(-10), // im lặng >7 ngày → phải xuất hiện ở view 🤫
    },
  });
  await prisma.task.create({
    data: {
      title: "[DEMO] [KSKD] Báo cáo doanh thu tuần 28",
      team: "KSKD_KT",
      leaderId: leaderId.KSKD_KT,
      category: "Doanh thu/Chi tiêu",
      status: "DONE",
      deadline: inDays(0),
      priority: "NORMAL",
      revenueImpact: "HIGH",
      completedAt: new Date(),
    },
  });
  // Project demo + 4 sub-item giai đoạn
  const project = await prisma.task.create({
    data: {
      title: "[DEMO] [PR] 🗂 Event khai trương CN mới — T9",
      type: "PROJECT",
      team: "PR_TRADE_EVENT",
      leaderId: leaderId.PR_TRADE_EVENT,
      category: "Event",
      status: "IN_PROGRESS",
      deadline: inDays(45),
      priority: "HIGH",
      revenueImpact: "HIGH",
      lastUpdateAt: inDays(-1),
    },
  });
  const stages = ["Kế hoạch", "Triển khai", "Review", "Nghiệm thu"];
  for (let i = 0; i < stages.length; i++) {
    await prisma.task.create({
      data: {
        title: `[DEMO] ${stages[i]} — Event khai trương`,
        team: "PR_TRADE_EVENT",
        leaderId: leaderId.PR_TRADE_EVENT,
        category: "Event",
        status: i === 0 ? "DONE" : "TODO",
        deadline: inDays(10 * (i + 1)),
        parentId: project.id,
      },
    });
  }

  // ── DB2 demo ──
  await prisma.dependency.create({
    data: {
      title: "[DEMO] [CEC] Phản hồi chất lượng data tuần 29",
      partner: "CEC",
      direction: "PARTNER_TO_MKT",
      cooperationType: "Phản hồi chất lượng data",
      mktTeam: "DIGITAL",
      status: "WAITING",
      createdAt: inDays(-4), // chờ >3 ngày → phải hiện ở view "đi đòi"
    },
  });
  await prisma.dependency.create({
    data: {
      title: "[DEMO] [TC-KT] Thanh toán chi phí event T7",
      partner: "TC_KT",
      direction: "MKT_TO_PARTNER",
      cooperationType: "Việc phát sinh (bắt buộc có deadline)",
      mktTeam: "PR_TRADE_EVENT",
      status: "PROCESSING",
      followsProcess: false, // lệch quy trình → view "Lệch quy trình"
      slaDate: inDays(2),
    },
  });

  // ── DB3 demo ──
  await prisma.report.create({
    data: {
      title: "[DEMO] Update tuần 29/2026",
      type: "WEEKLY",
      dueDate: inDays(3),
      status: "NOT_STARTED",
    },
  });

  const counts = {
    leaders: await prisma.leader.count(),
    templates: await prisma.recurringTemplate.count(),
    tasks: await prisma.task.count(),
    dependencies: await prisma.dependency.count(),
    reports: await prisma.report.count(),
  };
  console.log("Seed xong:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
