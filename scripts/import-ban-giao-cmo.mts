import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { type Team } from "../src/lib/constants";

// Nhập checklist bàn giao CMO (file 260724_Đóng gói công việc GĐMKT_View.xlsx)
// vào DB THẬT. Chạy: `npx tsx scripts/import-ban-giao-cmo.mts`
//
// Tạo: (1) SopDoc "Checklist bàn giao hệ thống — GĐ Marketing" (Sheet 0 + Sheet 2.1)
//      (2) Task PROJECT "Bàn giao công việc GĐ Marketing (CMO)" + 22 sub-task
// Idempotent — đã có bản ghi cùng tiêu đề thì bỏ qua, chạy lại không tạo trùng.

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Thiếu TURSO_DATABASE_URL/DATABASE_URL trong .env");
const adapter = new PrismaLibSql({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const prisma = new PrismaClient({ adapter });

const PROJECT_TITLE = "Bàn giao công việc GĐ Marketing (CMO) — Nhật Minh → nhóm kế nhiệm";
const SOP_TITLE = "Checklist bàn giao hệ thống — GĐ Marketing (CMO)";

interface ChecklistItem {
  stt: string;
  group: string;
  title: string;
  team: Team;
  pic: string; // tên PIC theo file — map sang leaderId nếu trùng tên leader trong DB
  support?: string;
  join?: string;
  approve?: string;
  doc?: string; // tên tài liệu + định dạng
  note?: string;
}

const ITEMS: ChecklistItem[] = [
  // Team đặt theo team của PIC (convention app: leader thuộc đúng team của task);
  // các mục PIC = Ất để team DIGITAL dù nội dung thiên KSKD/PR.
  { stt: "1", group: "Sơ đồ tổ chức", title: "SĐTC — Sơ đồ tổ chức khối Marketing", team: "DIGITAL", pic: "Ất", support: "Trâm", approve: "Judy", doc: "1. Sơ đồ tổ chức.pdf (PDF)", note: "Bản SĐTC mới update" },
  { stt: "2", group: "Quy trình — Kế hoạch năm", title: "Set khoán Doanh thu hệ thống", team: "KSKD_KT", pic: "Judy", support: "Trâm", doc: "1. Set khoán hệ thống và data (Excel)", note: "Ms Judy thông báo cho Thu, Ất, Trâm về khoán: (i) Dthu tổng (ii) Tỷ trọng KHM/KHC" },
  { stt: "3", group: "Quy trình — Kế hoạch năm", title: "Khoán Khách hàng & Data", team: "KSKD_KT", pic: "Trâm", support: "Ất", approve: "Judy", doc: "1. Set khoán hệ thống và data (Excel)", note: "Theo công thức" },
  { stt: "4", group: "Quy trình — Kế hoạch năm", title: "Khoán Digital", team: "DIGITAL", pic: "Ất", support: "Trâm", doc: "G - Digital - T7.2026 (Excel)" },
  { stt: "6", group: "Quy trình — Kế hoạch năm", title: "KPI Content MKT — KPI sản xuất", team: "CONTENT", pic: "Mai Anh", approve: "Ất", doc: "2026_Content MKT Plan (Word)", note: "Email Kế hoạch Content MKT" },
  { stt: "7", group: "Quy trình — Kế hoạch năm", title: "Kế hoạch PR & Trade", team: "PR_TRADE_EVENT", pic: "Hà", approve: "Ất", doc: "PR_2026_KẾ HOẠCH HÀNG THÁNG (Excel)" },
  { stt: "8", group: "Quy trình — Kế hoạch năm", title: "Kế hoạch TTNB", team: "TNNB", pic: "Phương", approve: "Ất", doc: "Năm 2026 (Excel)" },
  { stt: "9", group: "Quy trình — Kế hoạch năm", title: "Kế hoạch ngân sách MKT", team: "DIGITAL", pic: "Ất", support: "Trâm", approve: "Judy", doc: "2. Kế hoạch ngân sách (Excel)", note: "(i) Định mức ngân sách toàn MKT + quy định hiện hành; (ii) Kế hoạch Dthu, kế hoạch Data, kế hoạch các phòng ban" },
  { stt: "10", group: "Quy trình — Vận hành", title: "Quy trình theo dõi và tối ưu kết quả QC (ROAS)", team: "DIGITAL", pic: "Ất", support: "Trâm", doc: "2026_Báo cáo roas (Excel)" },
  { stt: "11", group: "Quy trình — Vận hành", title: "Quy trình theo dõi & điều chỉnh sử dụng chi phí", team: "DIGITAL", pic: "Ất", support: "Trâm", doc: "2. Kế hoạch ngân sách (Excel)" },
  { stt: "12", group: "Quy trình — Vận hành", title: "Quy trình thanh toán & quyết toán", team: "KSKD_KT", pic: "Trâm", approve: "Ất", doc: "251003_Cải tiến quy trình thanh toán - MKT x TCKT (PDF)" },
  { stt: "14", group: "Quy trình — Vận hành", title: "Quy trình xây dựng sản phẩm mới (R&D)", team: "DIGITAL", pic: "Ất", support: "Hà", join: "Hoa Lee", approve: "Judy", doc: "Quy trình R&D Product (Excel)" },
  { stt: "15", group: "Quy trình riêng bộ phận", title: "Bộ quy trình, quy định Digital", team: "DIGITAL", pic: "Ất", doc: "2026 - Digital - Checklist" },
  { stt: "16", group: "Quy trình riêng bộ phận", title: "Bộ quy trình, quy định Content MKT", team: "CONTENT", pic: "Mai Anh", approve: "Ất", doc: "Quy trình_Content QC" },
  { stt: "17", group: "Quy trình riêng bộ phận", title: "Bộ quy trình, quy định TVOL", team: "TVOL", pic: "Dung", approve: "Ất", doc: "Tổng hợp quy trình TVOL" },
  { stt: "18", group: "Quy trình riêng bộ phận", title: "Bộ quy trình, quy định PR & Trade", team: "PR_TRADE_EVENT", pic: "Hà", approve: "Ất", doc: "QUY TRÌNH & QUY ĐỊNH", note: "Minh work với Kiều trong phần Kiều → Hà (Ất và Mai Anh cũng nắm thông tin)" },
  { stt: "19", group: "Quy trình riêng bộ phận", title: "Bộ quy trình, quy định KSKD & KT", team: "KSKD_KT", pic: "Trâm", approve: "Ất", doc: "(Trâm update)" },
  { stt: "20", group: "Quy trình riêng bộ phận", title: "Bộ quy trình, quy định TTNB", team: "TNNB", pic: "Phương", approve: "Ất", doc: "Quy trình TTNB" },
  { stt: "21", group: "Quy trình riêng bộ phận", title: "Các nhóm quy trình, quy định khác", team: "DIGITAL", pic: "Ất", doc: "(Trâm update)" },
  { stt: "22a", group: "Cẩm nang phân quyền", title: "Cẩm nang phân quyền TCKT", team: "KSKD_KT", pic: "Judy", support: "Ất", doc: "270923_Cẩm nang phân quyền Khối Tài chính - Kế toán Gangnam.xlsx (Excel)", note: "Cần update lại cẩm nang phân quyền" },
  { stt: "22b", group: "Cẩm nang phân quyền", title: "Cẩm nang phân quyền HR", team: "KSKD_KT", pic: "Judy", support: "Ất", doc: "251009_HaMo_Cẩm nang phân quyền HR.xlsx (Excel)", note: "Cần update lại cẩm nang phân quyền" },
  { stt: "23", group: "Hệ thống báo cáo", title: "Hệ thống báo cáo Marketing", team: "KSKD_KT", pic: "Trâm", approve: "Ất", doc: "CHỨC NĂNG PHÒNG KẾ TOÁN VÀ KIỂM SOÁT KINH DOANH (Link)", note: "Danh mục hệ thống báo cáo kèm links" },
];

function buildNote(it: ChecklistItem): string {
  const roles = [
    `PIC: ${it.pic}`,
    it.support ? `Support: ${it.support}` : null,
    it.join ? `Tham gia: ${it.join}` : null,
    it.approve ? `Check duyệt: ${it.approve}` : null,
  ].filter(Boolean).join(" · ");
  const lines = [
    `[Bàn giao CMO — mục ${it.stt} · ${it.group}]`,
    roles,
    it.doc ? `Tài liệu: ${it.doc}` : null,
    it.note ? `Ghi chú: ${it.note}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

function buildSopContent(): string {
  const rows = ITEMS.map((it) =>
    `| ${it.stt} | ${it.group} | ${it.title} | ${it.doc ?? "—"} | ${it.pic} | ${it.support ?? "—"} | ${it.join ?? "—"} | ${it.approve ?? "—"} | ${it.note ?? ""} |`
  ).join("\n");
  return `# Checklist bàn giao hệ thống — GĐ Marketing (CMO)

> Nguồn: file "260724_Đóng gói công việc GĐMKT_View.xlsx" (Sheet 0 + Sheet 2.1). Hệ thống hoá toàn bộ phạm vi, hệ thống và con người để bàn giao cho người kế nhiệm. Theo dõi tiến độ từng hạng mục tại Project **"${PROJECT_TITLE}"** trên trang Công việc.

## Thông tin bàn giao

- **Người bàn giao (CMO hiện tại):** Mr. Nhật Minh
- **Người nhận bàn giao (Leader kế nhiệm):** Mr. Lê Văn Ất · Ms. Judy · Ms. Trâm · Ms. Hoa Lee
- **Ngày bắt đầu / hoàn tất dự kiến / người phê duyệt (BGĐ):** chưa điền trong file gốc

## Chú giải vai trò

| Vai trò | Ý nghĩa |
|---|---|
| PIC | Người chịu trách nhiệm chính, trực tiếp thực thi hạng mục |
| Support | Người hỗ trợ, cung cấp dữ liệu/nguồn lực cho PIC |
| Tham gia | Người tham gia đóng góp, phối hợp thực hiện |
| Check duyệt | Người rà soát & phê duyệt cuối cùng (thường là CMO/BGĐ) |

## Chú giải trạng thái bàn giao

Chưa bắt đầu → Đang chuẩn bị → Đã bàn giao → **Hoàn tất** (người nhận đã nắm & tự vận hành được).
Trong app: TODO = Chưa bắt đầu · In progress = Đang chuẩn bị · Review = Đã bàn giao · Done = Hoàn tất.

## Checklist 22 hạng mục (theo pha Strategy → Plan → Execution → Report & Change)

| STT | Nhóm | Hạng mục | Tài liệu | PIC | Support | Tham gia | Check duyệt | Ghi chú |
|---|---|---|---|---|---|---|---|---|
${rows}

## Lưu ý từ file gốc

- Cột "Trạng thái bàn giao" trong file đang **trống toàn bộ** — theo dõi trạng thái bằng Project trong app.
- STT gốc nhảy số (thiếu 5, 13) — có thể đã xoá dòng trong file.
- Một số tài liệu chưa có link thật, ghi "(Trâm update)".
- Sơ đồ tổ chức + 13 chức năng nhiệm vụ CMO: xem tài liệu Sổ tay "Phạm vi & Chức năng CMO".
`;
}

async function main() {
  const leaders = await prisma.leader.findMany();
  const leaderIdByName = new Map(leaders.map((l) => [l.name, l.id]));

  // (1) SopDoc
  const existingSop = await prisma.sopDoc.findFirst({ where: { title: SOP_TITLE } });
  if (existingSop) {
    console.log("SopDoc đã có — bỏ qua:", SOP_TITLE);
  } else {
    await prisma.sopDoc.create({
      data: { title: SOP_TITLE, category: "Bàn giao", content: buildSopContent() },
    });
    console.log("Đã tạo SopDoc:", SOP_TITLE);
  }

  // (2) Project + sub-tasks
  const existingProject = await prisma.task.findFirst({ where: { title: PROJECT_TITLE } });
  if (existingProject) {
    console.log("Project đã có — bỏ qua:", PROJECT_TITLE);
    return;
  }
  const project = await prisma.task.create({
    data: {
      title: PROJECT_TITLE,
      type: "PROJECT",
      team: "DIGITAL",
      leaderId: leaderIdByName.get("Ất") ?? null,
      status: "TODO",
      priority: "HIGH",
      revenueImpact: "HIGH",
      startDate: new Date(),
      note:
        "Nguồn: 260724_Đóng gói công việc GĐMKT_View.xlsx (Sheet 2.1).\n" +
        "22 hạng mục bàn giao hệ thống vận hành từ CMO Nhật Minh cho nhóm kế nhiệm (Ất, Judy, Trâm, Hoa Lee).\n" +
        "Chi tiết vai trò & tài liệu: xem Sổ tay › Bàn giao › Checklist bàn giao hệ thống.",
    },
  });
  console.log("Đã tạo Project:", project.id);

  for (const it of ITEMS) {
    await prisma.task.create({
      data: {
        title: `Bàn giao: ${it.title}`,
        type: "TASK",
        team: it.team,
        leaderId: leaderIdByName.get(it.pic) ?? null,
        status: "TODO",
        priority: "NORMAL",
        parentId: project.id,
        note: buildNote(it),
      },
    });
    console.log(`  + [${it.stt}] ${it.title} (${it.team}${leaderIdByName.has(it.pic) ? " · " + it.pic : " · PIC ngoài DB: " + it.pic})`);
  }
  console.log(`Xong — 1 project + ${ITEMS.length} sub-task.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
