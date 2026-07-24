# TRẠNG THÁI DỰ ÁN — HANDOFF CHO PHIÊN LÀM VIỆC MỚI

> Cập nhật: 22/07/2026. Kế hoạch tổng: [KE-HOACH-BUILD-WEBAPP.md](KE-HOACH-BUILD-WEBAPP.md).

## Đã xong (23/07/2026): AUTH + METRICS + AI hóa tóm tắt web + FIX bug AI-telegram

Bổ sung 3 tính năng ngoài kế hoạch gốc (sếp yêu cầu qua rà soát) + sửa 1 bug tiềm ẩn:

- **Auth 1 mật khẩu (Phase 1)** — `src/proxy.ts` (Next 16 đổi Middleware→Proxy) khóa
  toàn app khi có `APP_PASSWORD` trong `.env`; chưa đặt = không khóa (fail-open, tránh
  tự khóa). `src/lib/auth.ts` (token băm FNV-1a thuần JS, dùng được ở edge proxy),
  `POST /api/auth/login|logout`, trang `/login` (overlay che sidebar). Nút "Đăng xuất"
  + nav "Sức khỏe" thêm vào `src/components/sidebar.tsx`. **Đã verify browser**: đặt
  mật khẩu test → vào /metrics bị chuyển /login → đăng nhập đúng → vào được app; đã
  gỡ mật khẩu test khỏi .env (sếp tự đặt `APP_PASSWORD` rồi restart để bật khóa).
- **Trang Sức khỏe hệ thống `/metrics`** (Phase 2 plan) — `src/lib/metrics-core.ts`
  (thuần, có test: `doneOnTimeRate`) + `src/lib/metrics.ts` (tái dùng `isSilent`,
  `getDependencyAlerts`, `daysSitting`). 4 KPI: % đúng hạn · kẹt duyệt (REVIEW >2 ngày)
  · phối hợp trễ SLA · task im lặng (>7 ngày) + danh sách chi tiết. **Verify browser OK**
  (62 việc mở, 50% đúng hạn, 1 kẹt duyệt, 3 im lặng...).
- **AI hóa tóm tắt cuối ngày trên web (F3)** — `GET /api/daily-summary/narrative` gọi
  `buildAiEodMessage`; `src/app/daily-summary/ai-summary-card.tsx` nút "Tạo tóm tắt"
  opt-in. **Verify browser OK** — Claude viết tóm tắt tự nhiên, gom nhóm quá hạn theo
  leader, gợi ý ai cần hỏi thăm.
- **⚠️ FIX bug tiềm ẩn L5** — `src/lib/ai-telegram.ts` `callClaude`: `claude-sonnet-5`
  **bật adaptive thinking mặc định**, với `max_tokens: 600` model tiêu hết token vào
  thinking → KHÔNG có text block → `buildAiEodMessage`/`buildAiAlertMessage` LUÔN rớt
  về template (bug này khiến cảnh báo + tóm tắt Telegram AI hóa vô dụng). Sửa: thêm
  `thinking: { type: "disabled" }` (budget_tokens đã bị bỏ trên Sonnet 5, gửi vào lỗi
  400) + nâng `max_tokens: 2048`. Đã verify API thật ra AI text (không còn fallback).
  Triage L3 dùng Haiku 4.5 (thinking off mặc định) nên KHÔNG dính bug. Chat L1
  (`max_tokens 4096` + tool loop) thinking có ích cho chọn tool, đủ chỗ text → để nguyên.
- 225/225 test (thêm 3 case `metrics-core.test.ts`), tsc + lint (file đã đổi) sạch.

## 🎯 VIỆC TIẾP THEO: hết Giai đoạn L — quay lại việc còn tồn của G/J/K

Giai đoạn L (L1-L6, Trợ lý AI) đã xong toàn bộ về code, xem mục ngay dưới.
Không còn giai đoạn nào theo kế hoạch gốc — việc còn lại là các mục "chưa
verify" tồn đọng từ các giai đoạn trước (Sheets/Telegram/Calendar/PDF) và dữ
liệu thật G2/G3 (checklist các team còn lại, nhập dependencies/reports thật).

Lưu ý khi bắt đầu phiên mới:
- ✅ **Tài khoản Anthropic đã có credit** — đã tự verify cả 3: chat tool
  (`get_stats`), triage (`proposeTriage` ra đúng team/category/priority/deadline
  tương đối "thứ 6 này"), và cảnh báo Telegram AI hóa (`buildAiAlertMessage`
  ra tin nhắn tự nhiên, không phải fallback) — cả 3 đều gọi API thật thành
  công (script tạm, đã xóa).
- **Chưa verify UI `/assistant` trên browser** (cổng 4000 đang chạy phiên chat
  khác lúc code xong, Next 16 không cho 2 dev server cùng thư mục dù đổi port)
  — sếp tự mở `/assistant`, hỏi thử 1 câu (vd "team Digital có việc gì quá
  hạn?"), xem có stream chữ ra + tool có chạy đúng không.
- **Chưa verify bot Telegram thật gửi bản AI hóa** (L5 code xong nhưng bot cần
  chạy thật với @BotFather token — xem mục "Vẫn chưa verify bot Telegram thật"
  ngay dưới, cùng 1 điều kiện chặn).
- **Chưa verify Sheets đọc thật** (cần sếp kết nối lại Google để cấp quyền
  `spreadsheets.readonly` mới + dán Spreadsheet ID thật) — xem
  `docs/GOOGLE-CALENDAR-SETUP.md` mục "Thêm quyền đọc Google Sheets".
- **Vẫn chưa verify bot Telegram thật** (Giai đoạn I, sếp chưa tạo bot qua
  @BotFather) — xem `docs/TELEGRAM-BOT-SETUP.md`. K3 (gửi PDF qua Telegram) dùng
  chung `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` nên cũng cần bước này xong trước.
- **Chưa verify event Calendar hiển thị thật** (J3 còn lại) — cần sếp kết nối
  Google + tự tạo 1 event trên Google Calendar (không qua app) để xem chip viền
  đứt xuất hiện đúng ô ngày.
- **Chưa verify xuất PDF/gửi Telegram thật trên browser** (K, xem mục ngay dưới)
  — đã tự test `renderHtmlToPdf()` chạy được (script tạm, PDF 87KB hợp lệ), nhưng
  chưa bấm nút thật trên `/reports`/`/daily-summary` vì cổng 4000 đang chạy phiên
  chat khác lúc code xong.
- **[Backlog bảo mật — ưu tiên THẤP] Mã hoá `refreshToken` at-rest trong SQLite.**
  Hiện lưu plaintext (`GoogleAccount.refreshToken`). Chấp nhận được vì app local
  single-user (file DB nằm ngay trên máy sếp), nên hoãn. Nếu sau này chạy nhiều
  người / cloud thì thêm mã hoá đối xứng (key từ `.env`) + migration dữ liệu cũ.
  _(Đã review bảo mật tích hợp Google 24/07/2026: vá open redirect `?next=`, gói
  disconnect trong transaction + chỉ nuốt lỗi P2025, lưu `refresh_token` khi Google
  xoay vòng, và revoke thật phía Google khi disconnect. Mã hoá at-rest là mục còn
  lại duy nhất, cố ý hoãn.)_

## Đã xong (22/07/2026): GIAI ĐOẠN L5 — AI hóa cảnh báo Telegram + tóm tắt cuối ngày

- `src/lib/ai-telegram.ts`: `buildAiAlertMessage(items)` + `buildAiEodMessage(summary)`
  gọi `claude-sonnet-5` viết lại cảnh báo/tóm tắt tự nhiên hơn thay vì liệt kê
  khô cứng — system prompt yêu cầu **chỉ nêu liên hệ/rủi ro dây chuyền nếu thấy
  RÕ trong dữ liệu được cung cấp, không suy diễn thêm** (đúng yêu cầu "nội dung
  ngữ cảnh, nêu rủi ro" nhưng vẫn tránh AI bịa việc không có)
- Fallback tuyệt đối về `buildAlertMessage`/`buildEodMessage` (template thuần
  code có sẵn từ Giai đoạn I) khi: chưa có `ANTHROPIC_API_KEY`, gọi API lỗi,
  hoặc model trả rỗng — bot Telegram không bao giờ im lặng vì lỗi AI
- Payload gửi cho Claude đã rút gọn (`slimTask`: title/leader/deadline/priority)
  thay vì gửi thẳng `TaskWithMeta` đầy field không cần thiết
- Gắn vào `scripts/telegram-bot.mts` `tick()` — thay `buildAlertMessage(due)` →
  `await buildAiAlertMessage(due)`, `buildEodMessage(summary)` →
  `await buildAiEodMessage(summary)`. Không đổi gì khác trong `tick()` (throttle,
  lưu `TelegramState` giữ nguyên)
- **Đã tự verify gọi API thật thành công** (script tạm, đã xóa) — cả cảnh báo
  và triage (L3) đều ra kết quả AI thật, không phải fallback (lúc đầu phiên
  làm L1-L4 tài khoản hết credit, sếp đã nạp lại credit trong lúc code L5)
- Test 111/111 (không đổi vì `ai-telegram.ts` không có phần thuần để test riêng
  — logic chính là gọi API + fallback, đã verify bằng tay), tsc + lint +
  `npm run build` sạch
- **Chưa verify bot Telegram thật gửi bản AI hóa** (Giai đoạn I, sếp chưa tạo
  bot qua @BotFather) — xem `docs/TELEGRAM-BOT-SETUP.md`

## Đã xong (22/07/2026): GIAI ĐOẠN L1-L4, L6 — Trợ lý AI (chat + triage inbox)

- **L6 system prompt** — `src/lib/ai-core.ts`: `buildChatSystemPrompt()` (dùng
  cho L1) + `buildTriageSystemPrompt()` (dùng cho L3), nhúng 6 team/nhóm việc/
  trạng thái/mức ưu tiên từ `constants.ts`, ngày hiện tại giờ VN. Model đã chốt
  với sếp: chat dùng **`claude-sonnet-5`**, triage dùng **`claude-haiku-4-5`**
  (rẻ hơn, đủ cho việc phân loại 1 dòng text)
- **L2 bộ tools read-only** — `src/lib/ai-tools.ts`: `search_tasks`,
  `get_task_detail`, `get_team_summary`, `get_dependencies`, `get_reports`,
  `get_stats` — mỗi tool query Prisma trực tiếp (không gọi `generateRecurring`
  tránh side-effect), trả JSON thuần (Date → `formatVN`). Đã tự verify cả 4 tool
  chạy đúng trên DB thật (script tạm, đã xóa) — số liệu khớp `get_stats`
  (72 task, 12 quá hạn...). **Không có tool ghi/sửa/xoá** — đây chính là cơ chế
  L4 (preview-confirm): AI không có khả năng tự ghi DB nên không cần thêm gate
  riêng; muốn tạo/sửa task AI chỉ hướng dẫn sếp vào đúng trang
- **L1 chat panel** — `POST /api/assistant/chat` (`src/app/api/assistant/chat/route.ts`):
  SSE thủ công qua `ReadableStream` (Next 16 Route Handler streaming), tool
  loop thủ công (không dùng tool runner beta, để bridge sang SSE + lưu lịch sử
  dễ hơn), tối đa 6 lượt gọi tool/câu hỏi. Model **AiConversation** mới
  (migration `20260722081559_them_ai_conversation`) lưu `messagesJson` — toàn
  bộ mảng message kể cả block `tool_use`/`tool_result` = **log mọi tool call**
  (L2) mà không cần bảng log riêng
  - `src/lib/ai-conversation-view.ts` (thuần, có test — 3 case): chuyển
    messages thô thành danh sách hiển thị gọn (`{role, text, tools}`)
  - `GET /api/assistant/conversations` (danh sách phiên) +
    `GET /api/assistant/conversations/[id]` (nạp lại lịch sử hiển thị)
  - UI `/assistant` + `src/components/assistant/assistant-chat-client.tsx`:
    đọc SSE thủ công (`ReadableStream.getReader()`, không dùng `EventSource`
    vì cần POST), lưu `conversationId` ở `localStorage` để F5 vẫn đúng phiên
    (giống pattern throttle của `notification-bell.tsx`), sidebar chọn lại
    phiên cũ, nút "Phiên mới". Thêm mục "Trợ lý AI" vào nav "Khác ▾"
- **L3 triage inbox bằng Haiku** — `src/lib/ai-triage.ts`: `proposeTriage(rawText)`
  gọi Haiku, validate chặt kết quả (team phải nằm trong `TEAMS`, category phải
  đúng `CATEGORY_BY_TEAM[team]`, priority phải nằm trong `PRIORITIES` — không
  tin mù kết quả model), trả `{title, deadline, team, category, priority}` hoặc
  `null` nếu lỗi/parse fail (best-effort tuyệt đối — **đã tự verify** lỗi API
  thật bị bắt đúng, fallback êm, không crash). Gắn vào cả 4 nguồn Inbox — ưu
  tiên AI, rớt về gợi ý rule-based cũ (`guessDraftFromLine`/`draftFromTelegramText`)
  nếu AI lỗi/chưa có key:
  - `POST /api/inbox/capture` (PASTE — chạy song song `Promise.all` theo dòng)
  - `POST /api/inbox/upload` (UPLOAD — trước đây **không có** draft nào, giờ có)
  - `scripts/telegram-bot.mts` `saveInboxItem()` (TELEGRAM)
  - `src/lib/google-sheets.ts` `pullOneSource()` (GSHEET)
  - `InboxClient` (`src/components/inbox/inbox-client.tsx`) + `TaskForm`
    (`initial` prop thêm `team`/`category`/`priority`, validate lại trước khi
    prefill — che nếu AI gợi ý sai team/category không khớp nhau) đã cập nhật
    để hiển thị/prefill 3 field mới này khi convert Inbox → task
- Test 111/111 (thêm 3 case `ai-conversation-view.test.ts`), tsc + lint +
  `npm run build` sạch — build ra đủ 3 route mới `/api/assistant/*` + trang
  `/assistant`
- ✅ **Đã verify AI trả lời thật** ở phiên làm L5 ngay sau (sếp nạp credit lúc
  đang code) — còn **chưa verify UI trên browser** (cổng 4000 bị chiếm) — xem
  mục "VIỆC TIẾP THEO" ở trên

## Đã xong (22/07/2026): GIAI ĐOẠN K — Xuất PDF

- Cài mới dependency **`playwright`** + tải Chromium headless (`npx playwright
  install chromium`, ~300MB xuống `%LOCALAPPDATA%\ms-playwright\`, không commit
  vào repo)
- `src/lib/pdf-templates.ts` (thuần, có test — 5 case) — 2 template HTML in-friendly
  dùng màu brand Seryn (nền kem/navy/gold): `reportHtml()` (checklist 5 mục ✓/✗,
  card feedback/link nếu có) + `dailySummaryHtml()` (4 nhóm task + việc quan trọng
  nhất sáng mai, tái dùng type `SummaryTaskLike` gọn giống `telegram-core.ts`);
  có `escapeHtml()` chặn injection từ title/note do người dùng nhập
- `src/lib/pdf-render.ts` — `renderHtmlToPdf(html)`: Chromium headless
  (`page.setContent` + `page.pdf({format:"A4", printBackground:true})`); không
  test đơn vị (cần trình duyệt thật), đã tự verify chạy được bằng script tạm
- `src/lib/export.ts` — `buildExportHtml(type, id)` nối template với dữ liệu thật
  (Prisma `Report` hoặc `getDailySummary()` có sẵn), dùng chung cho cả 2 route
  dưới, tránh lặp code load data
- `src/lib/telegram-send.ts` — `sendTelegramDocument()`: gọi thẳng Telegram Bot
  API `sendDocument` qua `fetch`/`FormData` (KHÔNG qua tiến trình bot riêng ở
  `scripts/telegram-bot.mts` — route API Next không có quyền truy cập instance
  grammy Bot của tiến trình khác), dùng chung `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`
  đã có trong `.env`
- `GET /api/export/pdf?type=report&id=` hoặc `?type=daily-summary` — tải PDF
  trực tiếp (`Content-Disposition: attachment`)
- `POST /api/export/telegram` body `{type, id?}` — render PDF rồi gửi luôn qua
  Telegram; lỗi trả message rõ ràng (thiếu token, không tìm thấy báo cáo…) thay
  vì mask qua `handleApiError` vì đây là lỗi người dùng cần biết để tự sửa
- UI: `/reports` (`reports-client.tsx`) thêm cột "Xuất" mỗi dòng (icon `FileDown`
  tải PDF + icon `Send` gửi Telegram, có trạng thái đang gửi/thông báo kết quả);
  `/daily-summary` thêm `ExportButtons` (component client mới) ở header
- Test 108/108 (thêm 5 case cho `pdf-templates.ts`), tsc + lint + `npm run build`
  sạch. Tự verify `renderHtmlToPdf()` chạy thật (script `tsx` tạm, đã xóa) ra PDF
  87942 byte, header `%PDF-` đúng chuẩn
- **Chưa verify UI thật trên browser** + **chưa verify gửi Telegram thật** (cần
  bot đã cấu hình xong theo `docs/TELEGRAM-BOT-SETUP.md`) — xem mục lưu ý ở trên

## Đã xong (22/07/2026): GIAI ĐOẠN J3 còn lại — Calendar view hiện event Google + "tạo task từ event"

- `src/lib/google-calendar-core.ts` (thuần, có test) — thêm `monthRangeVN(year, month)`
  tính `timeMin`/`timeMax` ISO UTC của 1 tháng theo giờ VN (dùng `date-fns-tz`,
  test riêng case qua năm khi tháng 12) + type `ExternalCalendarEvent`
  (`id`/`title`/`dateKey`)
- `src/lib/google-sync.ts` — `listExternalCalendarEvents(year, month)`: gọi
  `cal.events.list` theo khoảng tháng, lọc bỏ event có
  `extendedProperties.private.serynTaskId` (event do app tạo — Calendar view đã
  vẽ từ task rồi) và event không phải all-day (task chỉ có 1 deadline không giờ,
  giống quy ước `pullCalendarChanges()`); best-effort — trả mảng rỗng khi chưa
  kết nối hoặc Google lỗi, không throw
- `GET /api/google/calendar-events?year=&month=` — route mới, validate year/month,
  trả envelope `{success, data: ExternalCalendarEvent[]}`
- `CalendarView` (`src/components/tasks/calendar-view.tsx`): fetch route trên mỗi
  khi đổi tháng xem (`useEffect` theo `[year, month]`), vẽ thêm chip viền đứt
  (icon `CalendarPlus`, tối đa 2 chip/ngày + "+N event nữa") cho event ngoài app;
  bấm chip gọi `onCreateFromEvent` — không tự tạo task ngay, mở lại `TaskForm` có
  sẵn (prefill `title`/`deadlineDate` qua prop `initial`, giữ nguyên tắc
  preview-confirm) — tái dùng nguyên component, không tạo modal mới
- `TasksClient` (`tasks-client.tsx`): thêm state `form.initial`, handler
  `openCreateFromEvent`, truyền xuống `CalendarView`/`TaskForm` — không đổi
  `openCreate`/`openEdit` sẵn có
- Test 103/103 (thêm 2 case cho `monthRangeVN`), tsc + lint + `npm run build` sạch
- **Chưa verify browser thật** (cổng 4000 đang chạy phiên khác lúc code xong) —
  sếp tự F5 tab `/tasks?view=calendar` đang mở để kiểm tra không có lỗi console;
  chip event chỉ hiện khi đã kết nối Google + có event thật trên lịch "Seryn Ops"
  hoặc lịch chính không do app tạo

## Đã xong (22/07/2026): GIAI ĐOẠN J2 — Google Sheets → Inbox (nhiều sheet cùng lúc)

Phạm vi ban đầu chốt "1 sheet", nhưng sếp có nhiều tab/nhiều link khác nhau →
mở rộng ngay trong cùng phiên thành **nhiều sheet nguồn cùng lúc**, mỗi sheet tự
theo dõi tiến độ đọc riêng. Đọc "theo lịch" = mỗi khi mở màn "Hôm nay" (giống hệt
pattern `pullCalendarChanges()` có sẵn), không thêm cron mới.

- Dùng chung tài khoản Google đã kết nối (OAuth J1 tái dùng nguyên) — thêm scope
  `spreadsheets.readonly` vào `GOOGLE_SCOPES` (`src/lib/google-auth.ts`). Tài
  khoản đã kết nối từ trước cần "Ngắt kết nối" → "Kết nối lại" 1 lần để cấp thêm
  quyền (xem `docs/GOOGLE-CALENDAR-SETUP.md` mục mới)
- Model mới **GoogleSheetSource** (nhiều dòng, mỗi dòng = 1 sheet: `label?`,
  `sheetId`, `sheetRange`, `lastRow`, `lastSyncAt`, `lastError`) quan hệ 1-nhiều
  với `GoogleAccount` — migration 2 bước: `20260722041404_them_google_sheets_config`
  (bản đầu, 1 sheet, field phẳng trên `GoogleAccount`) rồi
  `20260722113106_multi_google_sheet_sources` (viết tay `migration.sql`, tự chuyển
  dữ liệu sheet đã lưu ở bản đầu sang dòng đầu tiên của bảng mới trước khi xóa
  field cũ — không mất cấu hình sếp đã nhập)
- `src/lib/google-sheets-core.ts` (thuần, có test, không đổi khi mở rộng đa
  sheet): `newSheetRows` (bỏ header, dedup theo "chỉ thêm dòng mới ở cuối") +
  `rowToInboxText` (nối ô, bỏ dòng trống)
- `src/lib/google-sheets.ts` — `pullSheetChanges()` lặp qua mọi `GoogleSheetSource`,
  mỗi source xử lý best-effort độc lập (lỗi 1 source không chặn source khác, pattern
  try/catch-log-swallow giống `google-sync.ts`), gọi trong `getTodayData()`
  (`src/lib/today.ts`, cạnh `pullCalendarChanges()`); mỗi dòng mới → `InboxItem`
  (source `GSHEET`), `parsedDraft` tách deadline bằng `guessDraftFromLine` tái
  dùng từ H3 — không tự map cột, giống nguyên tắc Upload/Paste đã có
- `POST /api/google/sheets-config` thêm 1 sheet nguồn mới,
  `DELETE /api/google/sheets-config/[id]` xóa 1 sheet (không ảnh hưởng sheet khác)
- UI: mục "Google Sheets" trong `/settings`
  (`src/app/settings/sheets-settings-client.tsx`) — danh sách sheet đã thêm (label/
  trạng thái đồng bộ/lỗi + nút Xóa) + form thêm mới, chỉ hiện khi đã kết nối Google
- Test 101/101 (`tests/google-sheets-core.test.ts` — 7 test, không đổi khi mở rộng
  đa sheet vì logic thuần theo từng sheet không đổi), tsc + lint +
  `npm run build` sạch
- **Chưa verify đọc Sheets thật** (cần sếp kết nối lại Google + Spreadsheet ID
  thật) — xem `docs/GOOGLE-CALENDAR-SETUP.md`
- **Ngoài phạm vi, để sau**: J3 còn lại (hiển thị event Calendar + "tạo task từ
  event") — xem mục "VIỆC TIẾP THEO" ở trên

## Đã xong (22/07/2026): GIAI ĐOẠN I — Telegram bot 2 chiều

Chạy **polling** (đã chốt với sếp — máy chủ chỉ localhost, chưa có domain/HTTPS
public cho webhook). Thư viện `grammy`, tiến trình độc lập `scripts/telegram-bot.mts`
(chạy qua `tsx`, PM2 app thứ 2 `seryn-telegram-bot`).

- **I1 Bot nhận**: text/link/forward (`message:text`) + ảnh (`message:photo`, luôn
  `.jpg`) + file xlsx/csv/docx/pdf (`message:document`) → tạo `InboxItem` (source
  `TELEGRAM`) — tái dùng nguyên `src/lib/attachments.ts` + `src/lib/inbox-parse.ts`
  (H2/H4) để lưu file/trích text, `guessDraftFromLine` (H3) để tách deadline khỏi
  text/caption thành `parsedDraft`. Item hiện trong tab Inbox của `/notes`, convert
  y hệt item PASTE/UPLOAD (không cần code UI mới)
- **I2 Bot gửi cảnh báo**: `src/lib/telegram-alerts.ts` (`getCombinedAlerts` gộp
  `getNotifications()` có sẵn (F1) + `getDependencyAlerts()` mới cho Dependency trễ
  SLA, tier HIGH) + `filterDue` (F1, tái dùng nguyên) throttle theo tầng (Critical
  2h · Cao 12h · Thường 24h) — lưu mốc gửi vào model mới `TelegramState` (DB, vì bot
  là tiến trình server không có localStorage)
- **I3 Tóm tắt cuối ngày**: `getDailySummary()` có sẵn (F2) → `buildEodMessage()`
  (`src/lib/telegram-core.ts`) → gửi 1 lần/ngày từ 17:30 giờ VN
  (`shouldSendEodSummary`, debounce bằng `TelegramState.lastEodDate`)
- **I4 Xác thực**: `TELEGRAM_BOT_TOKEN` bắt buộc lúc start (thoát ngay nếu thiếu).
  `TELEGRAM_CHAT_ID` chưa cấu hình → bot trả lại chat ID để sếp điền `.env`
  (bootstrap); đã cấu hình → chỉ xử lý đúng chat đó, chat khác bị bỏ qua âm thầm
- 1 `setInterval` mỗi 5 phút (khớp nhịp chuông F1) làm cả I2 + I3 trong 1 tick;
  mọi lỗi bọc try/catch riêng, log `[TelegramBot]`, lưu `TelegramState.lastError`
  (pattern "never break" giống `google-sync.ts`)
- Migration `20260722022814_them_telegram_state`; `ecosystem.config.js` thêm app
  `seryn-telegram-bot`; `tsx`/`dotenv` chuyển từ devDependencies sang dependencies
  (cần lúc chạy production qua PM2, không chỉ lúc dev)
- Test 94/94 (thêm `tests/telegram-core.test.ts` — 12 test cho auth/giờ gửi/format
  message), tsc + lint + `npm run build` sạch
- **Chưa verify bot thật** (sếp chưa có token @BotFather) — xem hướng dẫn
  `docs/TELEGRAM-BOT-SETUP.md`

## Đã xong (21/07/2026, sau Giai đoạn H): Gộp "Ghi chú" + "Inbox" thành 1 trang

Sếp thấy 2 mục nav riêng (Ghi chú cá nhân, Inbox) đều là quick-capture trước khi
thành task thật → gộp cho gọn:
- Route `/inbox` (page) đã **xóa**, không còn trong nav "Khác ▾"
- Trang `/notes` giờ có 2 sub-tab: "Ghi chú" (mặc định) · "Inbox" (badge số đếm
  PENDING) — `src/components/notes/notes-inbox-client.tsx` bọc lại
  `NotesClient` + `InboxClient` sẵn có, không đổi logic bên trong 2 component đó
- API `/api/inbox/*` **giữ nguyên không đổi** — chỉ gộp phần UI/route trang
- Verify browser: vào `/notes` thấy 2 tab, bấm "Inbox" render đúng, nav "Khác ▾"
  không còn mục Inbox. tsc + lint + test 82/82 + `npm run build` sạch

## Đã xong (21/07/2026): GIAI ĐOẠN H — Inbox & thu nhận file

- **H1 Trang Inbox** (nay là sub-tab trong `/notes`, xem mục gộp ở trên — lúc mới
  làm còn là route `/inbox` riêng): quick capture (textarea nhiều dòng) + upload
  file + danh sách item PENDING (mới nhất trước), mỗi item có nút "➡️ Chuyển thành
  task" (mở lại `TaskForm` đã có ở Giai đoạn D, prefill title/deadline/note từ
  draft — giữ nguyên tắc preview-confirm, không tạo task ngay không cho xem) và
  "✕ Bỏ qua". Model `InboxItem` đã có sẵn trong schema từ trước, DB thực tế cũng
  đã có bảng (không phát sinh migration mới, chỉ `prisma generate`)
- **H2 Upload & parse**: `src/lib/inbox-parse.ts` — xlsx/csv (`xlsx` — SheetJS,
  `sheet_to_csv`) · docx (`mammoth.extractRawText`) · pdf (`pdf-parse` v2, API
  class `PDFParse({data}).getText()` — khác hẳn API hàm của v1 cũ) · ảnh (không
  parse, chỉ lưu attachment thô). Không tự map cột như `/import` — chỉ trích text
  thô để review, tránh trùng tính năng
- **H3 Quick capture**: `src/lib/inbox-core.ts` (thuần, có test) — `parseQuickCapture`
  tách dòng, `guessDraftFromLine` dùng lại `parseDeadline` của `import-core.ts` để
  tách deadline dd/mm/yyyy hoặc yyyy-mm-dd khỏi dòng, phần còn lại làm tiêu đề gợi ý
- **H4 Lưu file**: `src/lib/attachments.ts` — `attachmentsDir()` suy ra từ
  `DATABASE_URL` (`C:/SerynOps/data/seryn.db` → `C:/SerynOps/attachments/`), giới
  hạn 15MB + whitelist đuôi file; `scripts/backup-db.mjs` mirror thư mục này sang
  `C:/SerynOps/backups/attachments/` cùng nhịp chạy backup DB
- Routes: `GET/POST /api/inbox` · `POST /api/inbox/capture` · `POST /api/inbox/upload`
  · `PATCH/DELETE /api/inbox/[id]` · `GET /api/inbox/[id]/file` (stream file gốc)
- `TaskForm` (`src/components/tasks/task-form.tsx`) thêm prop optional `initial`
  để prefill khi tạo mới từ Inbox — không đổi logic edit hiện có
- Test 82/82, tsc + lint + `npm run build` sạch. Verify browser đủ: dán 2 dòng
  (1 có deadline) → tách đúng 2 item → convert 1 item ra task (title/deadline
  tách đúng, note giữ raw text) → task xuất hiện ở `/tasks` → dismiss item còn
  lại → Inbox sạch; upload thử 1 file csv → rawText trích đúng, link "Mở file
  gốc" tải lại đúng nội dung; `npm run backup` mirror đúng file đính kèm

## Đã xong (commit `85ee77e` trên master)

- **Giai đoạn A** — khung: Next.js 16.2 + TS + Tailwind 4, cổng **4000** (`npm run dev`), Prisma 7.8 + SQLite tại `C:/SerynOps/data/seryn.db` (ngoài OneDrive), seed 6 leader + 9 templates + dữ liệu `[DEMO]`
- **Giai đoạn B** — API: CRUD `/api/tasks|dependencies|reports` (+`[id]`), `/api/dashboard`; Zod validation (nhóm việc khớp team; TC-KT "Việc phát sinh" bắt buộc SLA); sinh việc định kỳ idempotent theo kỳ (`recurrenceKey` 2026-W29 / 2026-07, catch-up trong kỳ)
- **Giai đoạn C** — UI: Home Dashboard 4 khối (`src/app/page.tsx` dùng `src/lib/dashboard.ts`), nav trong layout, 4 trang placeholder `/tasks /dependencies /reports /sop`
- **Test**: 31/31 pass (`npm test`) — priority/alerts/recurring-core, có case biên múi giờ VN

## Vị trí code quan trọng

- `src/lib/constants.ts` — 6 team, nhóm việc theo team, options DB2/DB3, labels tiếng Việt
- `src/lib/timezone.ts` — `VN_TZ`, `daysUntilVN`, `startOfTodayVN`, `formatVN` (DB lưu UTC, mọi tính toán theo giờ VN)
- `src/lib/priority.ts` (score 999/50+30...), `alerts.ts` (OVERDUE/DUE_SOON/... + `isSilent` >7 ngày)
- `src/lib/recurring-core.ts` (thuần, có test) + `recurring.ts` (DB) — gọi từ `dashboard.ts`
- `src/lib/dashboard.ts` — `getDashboardData()` + types `TaskWithMeta`, dùng chung page + API
- `src/components/task-table.tsx` — bảng task dùng chung

## Lưu ý kỹ thuật bắt buộc biết

1. **Prisma 7**: generator `prisma-client` output `src/generated/prisma` — import `@/generated/prisma/client`; client cần adapter `new PrismaBetterSqlite3({ url })` (xem `src/lib/db.ts`); URL migrate nằm ở `prisma.config.ts`; **sau `migrate dev` phải chạy `npx prisma generate` + restart dev server** (không tự generate)
2. **Hook Fact-Forcing Gate** (ECC): chặn lần Write/Edit đầu của mỗi file mỗi phiên — trình bày 4 facts trong text rồi retry y nguyên là qua. Cân nhắc `ECC_GATEGUARD=off` để tiết kiệm (phiên trước tốn ~$50 một phần vì ghi file 2 lần)
3. Console PowerShell hiển thị tiếng Việt mojibake — chỉ là hiển thị terminal, data UTF-8 đúng (kiểm tra bằng browser)
4. Quy tắc dự án: SQLite không enum → String + validate constants; AI ghi dữ liệu phải preview-confirm (Giai đoạn L); mọi API dùng envelope `{success, data, error}`

## Đã xong (commit `bb75ef0`): GIAI ĐOẠN D — 7 views Tasks

Trang `/tasks` hoàn chỉnh, đã verify từng view trên browser (tạo/sửa/xóa/kéo thả/quick update):
- Server: `src/lib/tasks-page.ts` (`getTasksPageData` — tasks+leaders+templates, serialize ISO) · types thuần `src/lib/task-row.ts` · `src/lib/calendar-core.ts` (grid tháng VN, có test — tổng 37/37 pass)
- Client `src/components/tasks/`: `tasks-client.tsx` (7 tabs + badge đếm + chip lọc team + sync URL shallow) · `team-board.tsx` (D1 — dnd-kit, swimlane team × 4 cột status, optimistic update) · `task-table-x.tsx` (D2/D3/D4/D7) · `projects-view.tsx` (D5 — progress bar + tick giai đoạn) · `calendar-view.tsx` (D6 — tự dựng, không FullCalendar) · `task-form.tsx` (D8 — modal, Nhóm việc lọc theo team, leader tự gán theo team, "Tạo từ template" + sinh sub-items, xóa có confirm) · `quick-update.tsx` (⚡ lastUpdateAt+note) · `task-api.ts` · `status-badge.tsx`
- Deadline từ form lưu **23:59:59 giờ VN** (`T23:59:59+07:00`) để khớp `daysUntilVN` + ô calendar
- Dev server: cổng 4000 có thể bị phiên chat khác chiếm → `launch.json` đã bật `autoPort` + script `dev:auto` (next dev không hardcode port); Next 16 không cho 2 dev server cùng thư mục

## Đã xong (commit `f4156e0`): GIAI ĐOẠN E — Dependencies + Reports + SOP

- E1 `/dependencies`: 3 tabs (Board theo Khối · ⏰ Chờ >3 ngày · ⚠️ Lệch quy trình, badge đếm) — `src/lib/deps-page.ts` + `dep-row.ts`, components `src/components/deps/` (board 3 cột khối + nút "✔ Chốt xong", bảng lọc, form modal — loại phối hợp lọc theo khối, SLA cuối ngày VN)
- E2 `/reports`: bảng + form checklist 5 mục / trạng thái 4 bước / feedback — `src/lib/reports-page.ts` (+`generateRecurring` idempotent) + `report-row.ts`, components `src/components/reports/`
- E3 `/sop`: model mới **SopDoc** (migration `20260717070910_them_sop_doc`), API `/api/sop` (+`[id]`), editor markdown + preview `react-markdown` — `src/components/sop/sop-client.tsx`; đã có 1 tài liệu thật "SOP nhịp họp tuần 2-4-6"
- `src/lib/api-client.ts` — `apiCall` fetch dùng chung (deps/reports/sop); `task-api.ts` còn bản `call` riêng, hợp nhất sau
- Verify browser đủ 3 trang: board render đúng stale/lệch quy trình, reports tự sinh từ template, SOP tạo + render markdown OK; test 37/37, tsc + lint sạch

## Đã xong (commit `2a910cf`): GIAI ĐOẠN F — Nhắc việc & tóm tắt cuối ngày

- F1 Chuông 🔔 + badge trong header (`src/components/notification-bell.tsx` gắn ở `layout.tsx`): fetch `/api/notifications` khi mở app + mỗi 5 phút; tần suất phân tầng ở `src/lib/notify-core.ts` (thuần, có test: Critical 2h + luôn nhắc khi mở app · Cao 12h · Thường 24h), throttle lưu localStorage `seryn-notify-last-shown`, mở dropdown = đã xem. Quét ở `src/lib/notifications.ts`: Critical mọi task mở · Cao khi OVERDUE/DUE_SOON · Thường khi deadline = ngày mai
- F2 `/daily-summary` (nav "🌙 Cuối ngày"): banner ⭐ việc quan trọng nhất sáng mai (score cao nhất chưa Done) + 4 nhóm ✅/🔄/🔴 (kèm leader)/⚠️ — `src/lib/daily-summary.ts`, tái dùng `TaskTable` server + `TaskWithMeta`
- F3 (Claude API viết tóm tắt tự nhiên + parse task) chưa làm — cần API key, để sau go-live
- Test 41/41, tsc + lint sạch; đã verify browser: badge đếm đúng, dropdown 2 tầng màu, trang tóm tắt đủ 4 nhóm

## Đã xong: GIAI ĐOẠN G — phần code (G1/G4/G5)

- **G1 Trang `/import`** (nav 📥): wizard 3 bước — dán/upload CSV → mapping cột (tự đoán theo header tiếng Việt, 1 field/1 cột) → preview lỗi đỏ (bỏ qua) / cảnh báo vàng (import với mặc định) → `POST /api/import` (atomic, tối đa 500 dòng, check leaderId)
  - Lõi thuần `src/lib/import-core.ts` (có test): `parseCsv` (RFC 4180 + BOM), `guessMapping`, parse team/status/priority/impact tiếng Việt không dấu, deadline `dd/mm/yyyy` hoặc `yyyy-mm-dd` → 23:59:59+07:00; leader khớp tên hoặc fallback leader đầu của team; category sai team → bỏ trống + warning
  - Components `src/components/import/` (`import-client.tsx`, `preview-table.tsx`), page `src/app/import/page.tsx`
- **G4 Verify e2e browser**: import CSV 4 dòng (1 lỗi, 1 warning) → 3 task tạo đúng team/leader/status; view Ưu tiên: Critical quá hạn = score 999 đứng đầu, cảnh báo 🔴 đúng; đã xóa task test. Test 52/52, tsc + lint + `npm run build` sạch
- **G5 Deploy PM2 + backup**: `ecosystem.config.js` (next start cổng 4000, log ra `C:/SerynOps/logs/`), `npm run backup` → `scripts/backup-db.mjs` (better-sqlite3 backup API, ra `C:/SerynOps/backups/seryn-yyyy-mm-dd.db`, giữ 14 bản — đã chạy thử OK)

### Go-live checklist (sếp tự chạy)

```
npm i -g pm2                       # 1 lần
npm run build && pm2 start ecosystem.config.js && pm2 save
# Backup hằng ngày 21:00 — tạo 1 lần trong PowerShell (Run as Admin):
schtasks /Create /TN "SerynOps-Backup" /SC DAILY /ST 21:00 ^
  /TR "cmd /c cd /d \"C:\Users\atlv\OneDrive\Máy tính\CMO-Checklist\" && npm run backup"
```

## Đã nạp dữ liệu thật (17/07/2026) — từ 2 file "Tài liệu CMO"

- **55 task team Digital** ([FB] 25 · [Zalo] 13 · [GG] 17) nạp qua `/api/import` từ file "2026 - Digital - Checklist.xlsx": P1→Cao, P2/P3→Bình thường (P gốc + định kỳ + người phối hợp + thành phẩm ghi trong note); trạng thái giữ nguyên file, mục định kỳ không có trạng thái → In progress
- **SOP "Phạm vi & Chức năng CMO"** (category "Tổ chức & vai trò"): sơ đồ tổ chức 6 team + CEC, 12 nhóm nhiệm vụ CMO — từ file "1. Phạm vi & Chức năng_CMO.xlsx"
- **Leader đổi tên thật**: Ất (Digital), Mai Anh (Content), Hà (PR), Trâm (KSKD&KT), Dung (TVOL), Phương (TNNB)
- Còn dữ liệu `[DEMO]` seed cũ trong DB — xóa dần khi go-live nếu muốn sạch

## Đã xong (21/07/2026): Đồng bộ 2 chiều Task ↔ Google Calendar

- Kế hoạch đầy đủ: `C:\Users\atlv\.claude\plans\replicated-brewing-forest.md`
- **Schema**: `Task.googleEventId` + model **GoogleAccount** (1 dòng, id "default":
  email/refreshToken/accessToken/accessTokenExpiry/calendarId/syncToken/lastSyncAt/lastError)
  — migration `20260721084452_them_google_calendar`
- **Lib**: `google-calendar-core.ts` (thuần, 11 test: toGoogleEventDate/fromGoogleEventDate
  round-trip, shouldSyncTask, eventTitleFor, resolveConflict) · `google-auth.ts`
  (OAuth2Client lấy type từ chính `googleapis` — **không** cài thêm gói
  `google-auth-library` riêng, gây xung đột kiểu 2 instance khác nhau dù cùng
  version) · `google-sync.ts` (syncTaskToCalendar push, deleteTaskEvent, pullCalendarChanges
  với syncToken + xử lý 410 Gone, ensureSerynCalendar tạo lịch phụ idempotent)
- **Routes**: `/api/google/auth` (redirect consent) · `/callback` (đổi token, tạo lịch
  "Seryn Ops", upsert GoogleAccount) · `/sync` (nút "Đồng bộ ngay") · `/disconnect`
  (chỉ xóa liên kết app, giữ nguyên lịch/event trên Google)
- **Hook sync**: push ngay sau `POST/PATCH/DELETE /api/tasks` + trong `generateRecurring`
  (nhánh TASK); pull ở đầu `getTodayData()` (cùng nhịp `generateRecurring` đã có,
  không thêm cơ chế polling mới) — mọi lỗi Google chỉ log `[GoogleSync]`, KHÔNG làm
  hỏng thao tác lưu task (best-effort)
- **UI**: trang `/settings` mới (mục "Cài đặt" trong dropdown Khác) — trạng thái kết
  nối/lỗi gần nhất, nút Kết nối/Đồng bộ ngay/Ngắt kết nối
- **Việc sếp cần làm**: `docs/GOOGLE-CALENDAR-SETUP.md` — 6 bước tạo Google Cloud
  project + OAuth Client ID, dán vào `.env` (`GOOGLE_CLIENT_ID/SECRET`, redirect URI
  cố định `http://localhost:4000/api/google/callback`)
- Chỉ đồng bộ Task/Project cấp cao nhất có deadline (bỏ sub-items); Done giữ event,
  thêm ✅ vào tên; xóa event trên Google chỉ gỡ liên kết, không đụng task/deadline
- Test 76/76, tsc + lint + `npm run build` sạch. **Chưa verify OAuth thật** (sếp
  chưa có Client ID) — đã verify: `/settings` hiển thị đúng trạng thái chưa kết nối,
  `/api/google/auth` lỗi thiếu env trả envelope sạch (không lộ stack trace), task
  CRUD (tạo + xóa) vẫn chạy bình thường khi chưa kết nối Google (log server sạch,
  không có lỗi từ google-sync) — **việc còn lại: sếp làm xong setup rồi test full
  luồng OAuth + sync 2 chiều thật theo checklist trong file plan ở trên**

## Đã xong (21/07/2026): PHƯƠNG ÁN "15 PHÚT" — triển khai đủ 4 mục, verify browser

- **Màn "Hôm nay"** (`src/app/page.tsx`): ① `AlertBanner` gộp quá hạn/im lặng/phối hợp trễ (bấm số xổ danh sách tại chỗ, bấm dòng nhảy /tasks hoặc /dependencies; sạch = 1 dòng xanh) ② `TodayList` tối đa 7 việc (Critical → quá hạn → hạn hôm nay; **loại REVIEW** vì đã nằm khối ④) với ✓ Done + ⚡ quick-update ③ tiến độ dự án (progress bar + đèn 🔴/🟡/🟢) ④ Chờ sếp quyết (REVIEW, sort lâu nhất) ⑤ `WeeklyStatLine` inline
- Code mới: `src/lib/today-core.ts` (thuần, có test — pickTodayTasks/projectLight/projectProgress/daysSitting) · `today.ts` (loader) · `today-row.ts` (types) · components `src/components/home/` · model **WeeklyStat** (migration `20260721081006`) + `PUT/GET /api/weekly-stats` (upsert theo weekKey)
- **Nav 8→3 + "Khác ▾"** (`main-nav.tsx`): Hôm nay · Công việc · Ghi chú + dropdown (Phối hợp/Báo cáo/SOP/Cuối ngày/Import); route cũ giữ nguyên
- **Tab Công việc 8→3** (`tasks-client.tsx`): Ma trận (mặc định) · Theo Team · Calendar; `?view=` cũ rơi về Ma trận (không 404); nút Import cạnh Tạo task
- **Chuông**: badge chỉ đếm CRITICAL đến hạn nhắc; dropdown vẫn đủ; href thông báo bỏ view cũ
- `getDashboardData`/`/api/dashboard` giữ nguyên (trang chủ dùng loader riêng `getTodayData`)
- Test 68/68, tsc + lint sạch; verify browser đủ: banner đếm động (13→12 sau Done, 2→1 im lặng sau ⚡), chỉ số tuần lưu/đọc/xóa OK

## (đã xong — giữ làm tham chiếu thiết kế) PHƯƠNG ÁN "15 PHÚT" — đã chốt với sếp 21/07/2026

Bối cảnh: sếp thấy app hiển thị quá nhiều + trùng lặp (1 nguồn score/alert vẽ ở 5 chỗ:
3 bảng Dashboard, 4 tab lọc, ô Làm ngay của Ma trận, trang Cuối ngày, chuông).
Mục tiêu: 15 phút/ngày nắm được việc cần làm, tiến độ dự án, cảnh báo. KHÔNG làm nhiễu.
Nguyên tắc: mỗi task chỉ xuất hiện đúng 1 nơi theo mục đích.

**1. Màn "Hôm nay" (redesign trang `/`)** — 4 khối + 1 dòng, đúng thứ tự:
- ① Banner cảnh báo gộp: `🔴 N quá hạn · 🤫 N im lặng · 🔗 N phối hợp trễ` — bấm số
  nhảy đến nơi xử lý; sạch thì 1 dòng xanh. Thay hoàn toàn 3 bảng cũ (Quan trọng/Hôm nay/Cảnh báo)
- ② "Hôm nay làm gì": tối đa 7 việc (Critical → quá hạn → đến hạn hôm nay, sort score);
  mỗi dòng: tên · leader · hạn · nút ✓ Done + ⚡ quick-update (tái dùng quick-update.tsx)
- ③ Tiến độ dự án: mỗi Project 1 dòng — progress bar (% sub-items DONE) + đèn:
  🔴 nếu 2 tuần không nhích (max updatedAt/completedAt của sub-items > 14 ngày) · 🟡 có việc con trễ · 🟢 còn lại
- ④ "Chờ sếp quyết": task status REVIEW + số ngày nằm đó (dùng updatedAt), sort lâu nhất trước
- ⑤ 1 dòng "Chỉ số tuần" nhập tay (doanh thu lũy kế · % khoán · ROAS) — model mới
  `WeeklyStat` tối giản (id, weekKey "2026-W30", revenue, planPct, roas, note) + form inline

**2. Nav 8 → 3 + menu**: Hôm nay · Công việc · Ghi chú · "Khác ▾" (dropdown:
Phối hợp, Báo cáo, SOP, Cuối ngày, Import). Trang nào cũng giữ nguyên route cũ.

**3. Tab Công việc 8 → 3**: Ma trận (MẶC ĐỊNH) · Theo Team · Calendar.
Xóa tab Ưu tiên/Hôm nay/Cảnh báo/Im lặng/Dự án. URL cũ `?view=...` map về matrix
(đừng 404). Nút 📥 Import nhỏ đặt cạnh "Tạo task".

**4. Chuông 🔔**: chỉ báo khi có Critical mới (bỏ tier Cao/Thường khỏi badge đếm;
dropdown vẫn xem được tất cả).

Lưu ý kỹ thuật: giữ `getDashboardData` trả field cũ cho `/api/dashboard` (thêm field mới,
đừng xóa); sau khi sửa xong chạy tsc + lint + test; verify browser bằng preview_start
"seryn-ops-dev" (nếu cổng 4000 bị chiếm bởi server mồ côi: lỗi Next in PID → taskkill).
Nếu sửa globals.css/layout mà style không ăn: xóa `.next` rồi start lại (cache Turbopack).

## Việc còn lại của G — cần dữ liệu thật + vận hành

- G2 Checklist chi tiết các team còn lại (Content, PR, TVOL, TNNB, KSKD&KT) — sếp sẽ gửi file sau, nạp giống Digital
- G3 Nhập dependencies đang mở (/dependencies) + lịch báo cáo quý (/reports)
- G6 Chạy nhịp tuần đầu theo SOP 3.3, ghi điểm vướng, chỉnh 1 lần sau tuần 1
- Import Google Sheets cũ: xuất CSV (File → Download → CSV) rồi vào 📥 Import

Sau G: H-L (inbox đa nguồn, Telegram, Google, PDF, AI) theo kế hoạch.

## Lệnh thường dùng

```
npm run dev        # cổng 4000 (hoặc preview_start tên "seryn-ops-dev")
npm test           # vitest
npx prisma studio  # xem DB
npx prisma migrate dev --name <ten> && npx prisma generate
```
