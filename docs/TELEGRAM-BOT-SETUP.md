# Kết nối bot Telegram — hướng dẫn 1 lần

Bot Telegram giúp bạn gửi việc vào Inbox từ điện thoại (nhắn text, gửi ảnh/file,
forward tin nhắn) và tự nhận cảnh báo quá hạn + tóm tắt cuối ngày 17h30 ngay trên
Telegram, không cần mở app. Làm 1 lần, mất khoảng 5 phút.

## Bước 1 — Tạo bot qua @BotFather

1. Mở Telegram, tìm và chat với **@BotFather** (tài khoản chính thức của Telegram
   để tạo bot).
2. Gõ lệnh `/newbot`, làm theo hướng dẫn: đặt tên hiển thị (vd "Seryn Ops"), rồi
   đặt username cho bot (phải kết thúc bằng `bot`, vd `seryn_ops_bot`).
3. BotFather trả về 1 dòng **token** dạng `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   — copy dòng này.

## Bước 2 — Dán token vào `.env`

Mở file `.env` ở thư mục gốc project, bỏ dấu `#` và điền token vừa copy:

```
TELEGRAM_BOT_TOKEN="123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## Bước 3 — Chạy bot lần đầu để lấy Chat ID

1. Chạy `npm run bot` (hoặc nếu đã dùng PM2: `pm2 start ecosystem.config.js`,
   `pm2 restart seryn-telegram-bot`).
2. Mở Telegram, tìm bot theo đúng username vừa tạo ở Bước 1, bấm **Start**, gửi
   1 tin nhắn bất kỳ (vd "hi").
3. Bot sẽ trả lời kèm **Chat ID** của bạn, dạng:
   ```
   Chưa cấu hình TELEGRAM_CHAT_ID. Chat ID của bạn là: 123456789
   Dán vào .env (TELEGRAM_CHAT_ID) rồi khởi động lại bot.
   ```

## Bước 4 — Dán Chat ID vào `.env`

```
TELEGRAM_CHAT_ID="123456789"
```

Khởi động lại bot (`Ctrl+C` rồi `npm run bot` lại, hoặc `pm2 restart seryn-telegram-bot`).

## Từ giờ hoạt động thế nào?

- **Nhắn text/link, gửi ảnh, gửi file (xlsx/csv/docx/pdf), hoặc forward tin nhắn**
  cho bot → xuất hiện ngay trong tab **Inbox** của trang `/notes`, bấm "➡️ Chuyển
  thành task" để tạo task thật (giống hệt cách dùng ô dán nhanh trên web).
- **Cảnh báo**: mỗi 5 phút bot kiểm tra 1 lần, gửi khi có việc Critical/quá hạn/sắp
  hạn hoặc phối hợp trễ SLA — tần suất nhắc lại theo tầng (Critical mỗi 2h · Ưu
  tiên cao mỗi 12h · Bình thường 1 lần), không spam liên tục.
- **Tóm tắt cuối ngày**: tự động gửi 1 lần sau 17h30 giờ VN mỗi ngày (4 nhóm việc +
  việc quan trọng nhất sáng mai) — giống hệt nội dung trang `/daily-summary`.
- **Chỉ chat của bạn** (đúng Chat ID trong `.env`) mới được bot xử lý/gửi tin —
  tin từ người khác bị bỏ qua âm thầm.

## Nếu gặp lỗi

Bot không tự thông báo lỗi ra Telegram (tránh spam khi mất mạng) — nếu nghi ngờ bot
không chạy, kiểm tra log: `pm2 logs seryn-telegram-bot` (hoặc terminal đang chạy
`npm run bot`). Lỗi thường gặp: sai/thiếu `TELEGRAM_BOT_TOKEN` (bot thoát ngay khi
khởi động, log có dòng "Không khởi động được").
