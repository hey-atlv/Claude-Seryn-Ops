# KẾ HOẠCH BUILD WEBAPP — SERYN MARKETING OPS

> Chuyển đổi thiết kế hệ thống Notion (tài liệu 15/07/2026) thành webapp độc lập.
> Người dùng chính: Giám đốc Marketing (single-user ở Phase 1, mở quyền view cho 6 leader ở Phase 2).

---

## 0. Stack đề xuất

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Fullstack 1 codebase, dễ deploy Vercel hoặc chạy local |
| UI | **Tailwind CSS + shadcn/ui** | Dựng nhanh Board/Table/Calendar/Timeline, đẹp sẵn |
| Database | **SQLite (Phase 1) qua Prisma ORM** | 1 người dùng, zero-config; Prisma cho phép đổi sang Postgres khi mở cho leader (Phase 2) mà không sửa code |
| State/data | **TanStack Query** | Cache + refetch views |
| Lịch/kéo thả | FullCalendar (calendar view) + dnd-kit (board kéo thả) | |
| Auth Phase 1 | 1 password đơn giản (middleware) | Chỉ Sếp dùng |
| Deploy | Local (chạy `npm run dev`/PM2) hoặc Vercel + Turso | Tùy nhu cầu truy cập từ điện thoại |

**Lợi thế so với Notion:** webapp tự tính Priority Score/Cảnh báo real-time, tự sinh task lặp lại, tự tổng hợp tóm tắt cuối ngày (không cần copy-paste sang Claude), nhắc việc phân tầng theo priority — tức là làm được luôn phần Phase 2 automation của tài liệu.

**Múi giờ (đã chốt):** toàn hệ thống dùng **Asia/Ho_Chi_Minh (UTC+7)**.
- DB lưu UTC (chuẩn), mọi hiển thị + tính toán deadline/cảnh báo/"hôm nay" quy về giờ VN (date-fns-tz)
- Ranh giới ngày ("Việc hôm nay", "quá hạn") tính theo 00:00 giờ VN, không theo giờ máy chủ
- Job định kỳ (tóm tắt 17h30, sinh task thứ 2 hằng tuần, cảnh báo) đặt lịch theo giờ VN
- Test bắt buộc: task deadline 23h59 giờ VN không được báo "quá hạn" sớm/muộn do lệch UTC

---

## 1. Data model (map từ 3 database Notion)

### 1.1. `tasks` (DB1 — Tasks & Projects)
- `id`, `title` (Tên việc)
- `type`: enum `TASK | PROJECT`
- `team`: enum `DIGITAL | CONTENT | PR_TRADE_EVENT | TVOL | TNNB | KSKD_KT`
- `leaderId` → bảng `leaders` (6 leader)
- `category` (Nhóm việc): string — validate theo map team→options (bảng 2.1.b)
- `status`: enum `TODO | IN_PROGRESS | REVIEW | DONE`
- `deadline`: datetime nullable
- `priority`: enum `NORMAL | HIGH | CRITICAL`
- `revenueImpact`: enum `HIGH | MEDIUM | LOW`
- `lastUpdateAt`: date (Update gần nhất)
- `lastUpdateNote`: text (Nội dung update)
- `outputLink`: string (URL)
- `note`: text
- `parentId`: self-relation (sub-items cho Project)
- `recurringTemplateId`: nullable → bảng templates
- `createdAt`, `updatedAt`, `completedAt`

**Computed (không lưu DB, tính lúc query):**
- `priorityScore` — công thức 2.1.c: Critical = 999; còn lại urgency (≤0 ngày: 50, ≤2: 40, ≤5: 30, ≤10: 20, else 10) + impact (Cao 30 / TB 20 / Thấp 10)
- `alertStatus` — công thức 2.1.d: `DONE ✅ / NO_DEADLINE ⚪ / OVERDUE 🔴 / DUE_SOON 🟡 (≤2 ngày) / ON_TRACK 🟢`
- `isSilent` — In progress + lastUpdateAt > 7 ngày

### 1.2. `dependencies` (DB2 — Cross-team)
- `id`, `title`, `partner`: enum `TC_KT | CEC | SALE`
- `direction`: enum `MKT_TO_PARTNER | PARTNER_TO_MKT | TWO_WAY`
- `cooperationType`: string (validate theo map khối→options 2.2.b)
- `contactPerson`: string
- `mktTeam`: enum 6 team
- `status`: enum `WAITING | PROCESSING | CLOSED`
- `followsProcess`: boolean (Đúng quy trình?)
- `slaDate`: datetime (bắt buộc nếu partner = TC_KT + loại "phát sinh")
- `note`, `createdAt`
- Computed: `alertStatus` (dùng lại công thức, thay deadline = SLA), `isStale` (WAITING > 3 ngày)

### 1.3. `reports` (DB3 — Board Reporting)
- `id`, `title`, `type`: enum `WEEKLY | MONTHLY`
- `dueDate`, `status`: enum `NOT_STARTED | GATHERING | DRAFTING | SUBMITTED`
- 5 checkbox: `hasRevenue, hasRoas, hasData, hasProjects, hasRisks`
- `reportLink`, `boardFeedback`

### 1.4. `recurring_templates` (thay tính năng Repeat của Notion)
- `id`, `name`, `targetDb`: `TASK | REPORT`
- `schedule`: `WEEKLY (dayOfWeek) | MONTHLY (dayOfMonth)`
- `defaults`: JSON (team, category, priority, revenueImpact... điền sẵn theo bảng 2.1.f)
- `subItemsTemplate`: JSON (VD template Project sinh 4 sub-item: Kế hoạch → Triển khai → Review → Nghiệm thu)

### 1.5. `leaders`
- `id`, `name`, `team`, `chatHandle` (Phase 2 dùng cho Telegram)

---

## 2. Các bước thực hiện

### Giai đoạn A — Khung dự án (0.5 ngày)
```
A1. npx create-next-app (TypeScript, Tailwind, App Router) + shadcn/ui
A2. Setup Prisma + SQLite, viết schema theo mục 1, migrate
A3. Seed data: 6 leader, options Nhóm việc theo team, 7 recurring templates (2.1.f),
    2 template báo cáo Weekly/Monthly (DB3), 5-7 task giả để test
A4. Viết lib/priority.ts (priorityScore) + lib/alerts.ts (alertStatus) — VIẾT TEST TRƯỚC
    cho 2 hàm này vì là logic lõi (Critical=999, mốc 0/2/5/10 ngày, impact 30/20/10)
```

### Giai đoạn B — API + logic nghiệp vụ (1 ngày)
```
B1. CRUD /api/tasks, /api/dependencies, /api/reports (route handlers + Zod validation)
B2. Endpoint tổng hợp /api/dashboard: trả 4 khối (theo team / quan trọng / hôm nay / cảnh báo)
B3. Logic sinh task lặp lại: job chạy khi app mở (hoặc cron) — quét recurring_templates,
    sinh task tuần/tháng nếu chưa tồn tại (idempotent theo template+kỳ)
B4. Validation nghiệp vụ: Nhóm việc phải khớp team; dependency TC-KT loại "phát sinh"
    bắt buộc có SLA; task Critical mặc định nhảy priority
```

### Giai đoạn C — Home Dashboard (1 ngày)
Trang chủ đúng 4 khối theo thứ tự tài liệu (2.4):
```
C1. Khối 1 — Tổng quan theo team: board 6 cột, đếm task ≠ Done mỗi team
C2. Khối 2 — Việc quan trọng đang chạy: bảng filter Cao/Critical, sort priorityScore giảm dần
    (cột: Tên việc, Team, Deadline, Cảnh báo, Update gần nhất)
C3. Khối 3 — Việc hôm nay: deadline = today, status ≠ Done
C4. Khối 4 — Cảnh báo: task 🔴/🟡 + dependency chờ phản hồi >3 ngày
C5. Thanh điều hướng: Tasks · Dependencies · Reporting · SOP
```

### Giai đoạn D — 7 views của Tasks (1.5-2 ngày)
Trang /tasks với tab chuyển view (bảng 2.1.e):
```
D1. 📊 Theo Team — board group by team, kéo thả đổi status (dnd-kit)
D2. 🎯 Ưu tiên — table sort priorityScore, hàng Critical highlight đỏ
D3. 📅 Hôm nay — table filter deadline = today
D4. 🔴 Cảnh báo — table filter OVERDUE/DUE_SOON
D5. 🗂 Dự án dài hơi — timeline/Gantt các Project + sub-items theo giai đoạn
D6. 📆 Calendar — FullCalendar theo deadline
D7. 🤫 Task im lặng — filter isSilent (In progress + im >7 ngày)
D8. Form tạo/sửa task: dropdown Nhóm việc lọc theo Team đã chọn; nút "Tạo từ template"
    (7 templates 2.1.f); form update tiến độ nhanh (điền lastUpdateAt + note 1 chạm)
```

### Giai đoạn E — Dependencies + Reporting (1 ngày)
```
E1. /dependencies: 3 view — Board theo Khối · Chờ phản hồi >3 ngày · Lệch quy trình
    (TC-KT + followsProcess = false)
E2. /reports: danh sách + form checklist 5 mục (doanh thu, ROAS, data, dự án, rủi ro),
    trạng thái 4 bước, field feedback lãnh đạo
E3. Trang /sop: lưu SOP & templates dạng markdown (editor đơn giản)
```

### Giai đoạn F — Nhắc việc & tóm tắt (1 ngày) — thay Phase 2 automation của Notion
```
F1. Notification trong app: chuông + badge, quét theo tần suất phân tầng
    (Critical: mỗi lần mở app + mỗi 2h · Cao: 2 lần/ngày · Thường: 1 ngày trước deadline)
F2. Tóm tắt cuối ngày tự động (thay prompt 5.3): trang /daily-summary tự dựng 4 nhóm
    ✅ Xong hôm nay · 🔄 Đang làm · 🔴 Trễ (kèm leader cần hỏi) · ⚠️ Sắp hạn ≤2 ngày
    + 1 dòng "việc quan trọng nhất sáng mai" (task priorityScore cao nhất chưa Done)
F3. (Tùy chọn) Gọi Claude API để viết tóm tắt tự nhiên hơn + parse task thô (prompt 5.4)
    thành task — cần API key, làm sau khi core chạy ổn
```

### Giai đoạn G — Import & Go-live (1 ngày)
```
G1. Import CSV từ Google Sheets cũ → mapping cột → tasks (checklist B1 tài liệu)
G2. Nhập dự án dài hơi (PR, TNNB, Content) bằng template Project + sub-items
G3. Nhập dependencies đang mở + lịch báo cáo quý vào reports
G4. Test end-to-end: tạo task các mức ưu tiên, kiểm tra score/cảnh báo/view lọc đúng
G5. Deploy (local PM2 hoặc Vercel+Turso nếu cần mở từ điện thoại) + backup DB định kỳ
G6. Chạy nhịp tuần đầu (thứ 2-4-6 theo SOP 3.3), ghi điểm vướng, chỉnh 1 lần sau tuần 1
```

### Phase 2 (sau ≥1 tháng chạy ổn — theo đúng nguyên tắc tài liệu)
```
- Auth đa người dùng: 6 leader login, chỉ xem task team mình (role-based)
- Telegram bot: nhắc việc + nhận update tiến độ từ leader → tự điền lastUpdateAt
- Trang metrics sức khỏe hệ thống (Phần 7): % done đúng hạn, task Review >2 ngày,
  dependency trễ SLA, task im lặng — dashboard tự đo, không phải đếm tay
```

---

## 3. Nguồn dữ liệu vào & đầu ra (yêu cầu bổ sung)

### 3.1. Khái niệm lõi: INBOX (hàng chờ thu nhận)

Mọi nguồn vào đều đổ về 1 bảng `inbox_items` — Sếp review trong khung giờ duyệt rồi
chuyển thành task (1 chạm hoặc AI parse). Không nguồn nào ghi thẳng vào tasks
để tránh rác dữ liệu.

```
inbox_items: id, source (TELEGRAM|UPLOAD|PASTE|GSHEET|GCAL), rawText, fileUrl,
             fileType, parsedDraft (JSON — bản nháp task do parser đề xuất),
             status (PENDING|CONVERTED|DISMISSED), createdAt
```

### 3.2. Map từng nguồn vào

| Nguồn | Cơ chế | Ghi chú |
|---|---|---|
| Google Sheets | (a) Import 1 lần: upload CSV/xlsx → mapping cột → tasks. (b) Sync định kỳ: Google Sheets API đọc sheet chỉ định → inbox | (b) cần Google Cloud OAuth credentials |
| Google Calendar | Google Calendar API 2 chiều: đọc event → hiện trong Calendar view + nút "tạo task từ event"; đẩy deadline task lên Google Calendar (kèm reminder gốc của Google) | Cùng OAuth với Sheets |
| Excel (.xlsx) | Upload → parse bằng SheetJS → preview bảng → chọn dòng chuyển inbox | Thuần code, không cần AI |
| Word (.docx) | Upload → mammoth extract text → inbox (kèm file gốc làm attachment) | |
| PDF | Upload → pdf-parse extract text → inbox + attachment. PDF scan (ảnh) → cần AI vision (opt-in) | |
| Ảnh | Upload/gửi qua Telegram → lưu attachment. Trích nội dung ảnh thành task → Claude API vision (opt-in từng ảnh) | |
| Text thô | Ô "Quick capture" trên Dashboard: paste ghi chú → parser (rule-based hoặc Claude theo prompt 5.4) → inbox với parsedDraft | |
| Link/tin nhắn từ Telegram | **Telegram Bot**: forward tin nhắn, gửi link, ảnh, file cho bot → bot đẩy vào inbox qua API. Bot chạy long-polling nên máy local sau NAT vẫn dùng được, không cần public URL | Cần bot token từ @BotFather |

### 3.3. Đầu ra

| Đầu ra | Cơ chế |
|---|---|
| PDF | Render báo cáo (weekly/monthly DB3, tóm tắt cuối ngày) thành trang HTML in-friendly → Puppeteer/Playwright xuất PDF. Có nút "Xuất PDF" ở mọi báo cáo |
| Cảnh báo → Telegram | Bot chủ động gửi cho Sếp theo tần suất phân tầng: Critical ngay lập tức + nhắc mỗi buổi · Cao 2 lần trước deadline · Thường 1 ngày trước. Kèm cảnh báo QUÁ HẠN và dependency chờ >3 ngày |
| Tóm tắt cuối ngày → Telegram | Job 17h30 dựng bản tóm tắt 4 nhóm (✅🔄🔴⚠️) → gửi qua bot. Bản đầy đủ xem trên web, Telegram nhận bản rút gọn |
| Báo cáo tuần/tháng → Telegram | Gửi file PDF trực tiếp qua bot khi bấm "Nộp" |

### 3.4. Điều kiện cần chuẩn bị (phía Sếp/công ty)

1. **Telegram bot token** — tạo qua @BotFather, 5 phút, miễn phí
2. **Google Cloud project + OAuth credentials** — bật Sheets API + Calendar API,
   miễn phí ở quy mô này (chỉ cần nếu dùng sync tự động; import file thì không cần)
3. **Claude API key** — BẮT BUỘC (đã chốt): dùng cho trợ lý AI hỏi đáp/phân tích/
   phân luồng (mục 3.6) + parse ảnh/PDF scan/text thô
4. **Máy chạy app phải bật** trong giờ làm việc để bot gửi cảnh báo đúng giờ
   (hoặc deploy cloud — xem 3.5)

### 3.5. Ảnh hưởng đến quyết định lưu trữ

- **Local vẫn khả thi**: Telegram bot dùng long-polling (không cần mở port/public URL),
  Google API gọi ra ngoài bình thường. Ràng buộc duy nhất: máy phải bật để job
  cảnh báo/tóm tắt chạy đúng giờ.
- **Nếu cần cảnh báo cả khi máy tắt** → deploy VPS nhỏ hoặc Vercel (cron) + Turso.
  Code không đổi nhờ Prisma.

### 3.6. Trợ lý AI tích hợp (đã chốt — thành phần lõi)

Panel chat "Trợ lý" trong app, dùng Claude API với **tool use** — AI được cấp bộ công cụ
truy vấn dữ liệu thật trong DB, không trả lời chay:

| Nhu cầu | Cách AI thực hiện |
|---|---|
| Hỏi đáp kiểm tra công việc/tiến độ | Tools read-only: `search_tasks`, `get_task_detail`, `get_team_summary`, `get_dependencies`, `get_reports` — VD hỏi "Team Digital tuần này còn gì chưa xong?" → AI query DB rồi trả lời kèm link tới task |
| Phân tích | Tool `get_stats` (theo team/thời gian/trạng thái): tỉ lệ đúng hạn, task tồn ở Review, xu hướng trễ, leader nào hay im lặng — AI diễn giải + đề xuất hành động |
| Cảnh báo | AI dựng nội dung cảnh báo ngữ cảnh hóa (thay template khô): tóm tắt cuối ngày, cảnh báo Telegram, nêu rủi ro dây chuyền (task A trễ kéo theo dependency B) |
| Phân luồng công việc | Tool `propose_triage` trên inbox: AI đọc item thô → đề xuất Team/Leader/Nhóm việc/Mức ưu tiên/deadline theo đúng quy tắc tài liệu (khủng hoảng → Critical, không rõ deadline → đánh dấu CẦN HỎI LẠI, không bịa thông tin) |

**Nguyên tắc an toàn (bắt buộc):**
1. **AI đọc thoải mái, ghi phải qua xác nhận** — mọi thay đổi dữ liệu AI đề xuất
   hiển thị dạng preview, Sếp bấm Confirm mới ghi vào DB
2. System prompt tiếng Việt, nhúng ngữ cảnh hệ thống (6 team, quy tắc ưu tiên,
   nhóm việc hợp lệ) — không để AI bịa option ngoài danh sách
3. Model routing tiết kiệm: parse/triage inbox dùng Haiku; hỏi đáp/phân tích dùng
   Sonnet — chi phí ước tính vài USD/tháng với mức dùng 1 người
4. API key server-side (.env), log toàn bộ tool call của AI để truy vết
5. Lưu lịch sử hội thoại theo phiên (bảng `ai_conversations`) — hỏi tiếp nối được

---

## 4. Các giai đoạn bổ sung (sau A-G)

### Giai đoạn H — Inbox & thu nhận file (1.5 ngày)
```
H1. Bảng inbox_items + trang /inbox (review, convert 1 chạm, dismiss)
H2. Upload & parse: xlsx (SheetJS) · docx (mammoth) · pdf (pdf-parse) · ảnh (attachment)
H3. Quick capture: ô paste text trên Dashboard → parser rule-based tách dòng thành draft
H4. Lưu file: local folder data/attachments (ngoài OneDrive sync, backup cùng DB)
```

### Giai đoạn I — Telegram bot 2 chiều (1.5 ngày)
```
I1. Bot nhận: text/link/ảnh/file/forward → inbox (kèm nguồn + timestamp)
I2. Bot gửi: cảnh báo phân tầng theo priority + quá hạn + dependency trễ SLA
I3. Bot gửi tóm tắt cuối ngày 17h30 (4 nhóm + việc quan trọng nhất sáng mai)
I4. Xác thực: bot chỉ nhận/gửi với chat ID của Sếp (whitelist), token trong .env
```

### Giai đoạn J — Google Sheets + Calendar sync (1-1.5 ngày)
```
J1. OAuth flow Google (lưu refresh token mã hóa trong DB)
J2. Sheets: đọc sheet chỉ định theo lịch → dòng mới vào inbox
J3. Calendar: hiển thị event trong Calendar view + "tạo task từ event"
    + đẩy deadline task lên Google Calendar
```

### Giai đoạn K — Xuất PDF (1 ngày)
```
K1. Template HTML in-friendly cho: báo cáo tuần, báo cáo tháng (checklist 5 mục),
    tóm tắt cuối ngày
K2. Endpoint /api/export/pdf dùng Playwright render → trả file
K3. Nút "Xuất PDF" + "Gửi qua Telegram" trên trang báo cáo
```

### Giai đoạn L — Trợ lý AI (2 ngày)
```
L1. Panel chat trong app (streaming) + bảng ai_conversations lưu lịch sử phiên
L2. Bộ tools read-only: search_tasks, get_task_detail, get_team_summary,
    get_dependencies, get_reports, get_stats — Claude tool use, log mọi tool call
L3. Phân luồng inbox: propose_triage (Haiku) tự điền parsedDraft cho item mới
L4. Cơ chế preview-confirm cho mọi đề xuất ghi dữ liệu của AI
L5. AI hóa cảnh báo Telegram + tóm tắt cuối ngày (nội dung ngữ cảnh, nêu rủi ro
    dây chuyền) — fallback template thuần code nếu API lỗi
L6. System prompt tiếng Việt nhúng quy tắc hệ thống (6 team, nhóm việc, ưu tiên)
```

---

## 5. Tổng thời gian dự kiến (đã gồm yêu cầu vào/ra + AI)

| Giai đoạn | Thời gian |
|---|---|
| A — Khung + schema + logic lõi | 0.5 ngày |
| B — API | 1 ngày |
| C — Dashboard | 1 ngày |
| D — 7 views Tasks | 1.5-2 ngày |
| E — Dependencies + Reporting | 1 ngày |
| F — Nhắc việc + tóm tắt (in-app) | 1 ngày |
| G — Import + go-live core | 1 ngày |
| H — Inbox & thu nhận file | 1.5 ngày |
| I — Telegram bot 2 chiều | 1.5 ngày |
| J — Google Sheets + Calendar | 1-1.5 ngày |
| K — Xuất PDF | 1 ngày |
| L — Trợ lý AI | 2 ngày |
| **Tổng** | **~14-15 ngày làm việc** |

## 6. Thứ tự ưu tiên nếu muốn có bản dùng được sớm nhất (MVP ~6 ngày)
1. A + B (schema, logic score/cảnh báo, API — múi giờ VN test ngay từ A4)
2. C (Dashboard 4 khối) + D1/D2/D4 (board team, ưu tiên, cảnh báo) + form tạo task
3. I2/I3 (Telegram gửi cảnh báo + tóm tắt — giá trị tức thì hằng ngày)
4. L1/L2 (chat AI hỏi đáp tiến độ — dùng được ngay khi có data thật)
5. K (xuất PDF báo cáo tuần)
6. Còn lại (inbox file, Google sync, timeline, calendar) bổ sung khi đã dùng thật
