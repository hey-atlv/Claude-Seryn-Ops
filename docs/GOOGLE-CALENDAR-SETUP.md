# Kết nối Google Calendar (2 chiều) — hướng dẫn 1 lần

App tự đồng bộ deadline Task/Project với 1 lịch phụ **"Seryn Ops"** trong Google
Calendar của bạn (không đụng lịch cá nhân). Vì app chạy trên máy bạn (`localhost`),
Google yêu cầu vài bước thủ công dưới đây — làm 1 lần duy nhất, mất khoảng 5-10 phút.

## Bước 1 — Tạo project trên Google Cloud Console

1. Vào https://console.cloud.google.com/ (đăng nhập bằng tài khoản Google muốn
   đồng bộ lịch).
2. Góc trên bên trái, bấm chọn project → **New Project**. Đặt tên gì cũng được,
   ví dụ "Seryn Ops". Bấm **Create**.
3. Sau khi tạo xong, chọn đúng project này (thanh chọn project ở đầu trang).

## Bước 2 — Bật Google Calendar API

1. Vào **APIs & Services → Library** (menu bên trái, hoặc gõ tìm "API Library").
2. Tìm **Google Calendar API** → bấm vào → bấm **Enable**.

## Bước 3 — Cấu hình màn hình xin quyền (OAuth consent screen)

1. Vào **APIs & Services → OAuth consent screen**.
2. Chọn **External** → Create.
3. Điền App name (vd "Seryn Ops"), User support email (email của bạn), Developer
   contact (email của bạn) → Save and Continue qua các bước Scopes/Test users
   (không cần thêm gì ở bước Scopes).
4. Ở bước **Test users**, bấm **Add users**, nhập chính email Google bạn đang dùng
   → Save.
5. Vì app chưa qua kiểm duyệt của Google (bình thường với app nội bộ 1 người),
   lúc đăng nhập ở Bước 6 bạn sẽ thấy màn hình cảnh báo "Google hasn't verified
   this app" — đây là **bình thường**, bấm **Advanced** → **Go to Seryn Ops
   (unsafe)** để tiếp tục.

## Bước 4 — Tạo OAuth Client ID

1. Vào **APIs & Services → Credentials** → **Create Credentials** →
   **OAuth client ID**.
2. Application type: **Web application**. Tên tùy chọn.
3. Mục **Authorized redirect URIs** → **Add URI**, dán chính xác:
   ```
   http://localhost:4000/api/google/callback
   ```
4. Bấm **Create**. Google hiện popup có **Client ID** và **Client secret** — copy
   cả hai (bấm icon copy, đừng gõ tay để tránh sai ký tự).

## Bước 5 — Dán vào file `.env`

Mở file `.env` ở thư mục gốc project, điền vào 2 dòng đã có sẵn:

```
GOOGLE_CLIENT_ID="dán Client ID vào đây"
GOOGLE_CLIENT_SECRET="dán Client secret vào đây"
```

Dòng `GOOGLE_REDIRECT_URI` đã có sẵn giá trị đúng, không cần sửa.

## Bước 6 — Kết nối trong app

1. Khởi động lại dev server (tắt rồi `npm run dev` — **phải chạy đúng cổng 4000**
   vì đó là redirect URI đã đăng ký ở Bước 4; nếu cổng 4000 đang bị chiếm bởi
   phiên cũ, đóng phiên đó trước).
2. Vào app → menu **"Khác" → Cài đặt**.
3. Bấm **"Kết nối Google Calendar"** → đăng nhập → bấm **Advanced → Go to Seryn
   Ops (unsafe)** nếu thấy cảnh báo (Bước 3.5) → bấm **Allow**.
4. Quay về trang Cài đặt thấy "✓ Kết nối thành công" kèm email của bạn — xong.
   App đã tự tạo lịch phụ **"Seryn Ops"** trong Google Calendar của bạn.

## Từ giờ hoạt động thế nào?

- **Tạo/sửa/xóa deadline trong app** → event trên lịch "Seryn Ops" cập nhật ngay.
- **Sửa ngày trên Google Calendar** (điện thoại hoặc web) → app cập nhật lại mỗi
  khi bạn mở màn "Hôm nay", hoặc bấm **"Đồng bộ ngay"** ở trang Cài đặt để thấy
  ngay lập tức.
- Task chuyển sang **Done** → event vẫn còn, chỉ thêm ✅ vào đầu tên (không xóa,
  để bạn xem lại lịch sử trên Google Calendar).
- Chỉ Task/Project **cấp cao nhất có deadline** được đồng bộ — giai đoạn con của
  Project và task chưa có deadline sẽ không lên lịch (đỡ dày đặc).

## Nếu gặp lỗi

Trang Cài đặt sẽ hiện dòng cảnh báo màu vàng nếu lần đồng bộ gần nhất bị lỗi
(vd token hết hạn, mất mạng). Thường chỉ cần bấm "Đồng bộ ngay" lại, hoặc nếu vẫn
lỗi thì "Ngắt kết nối" rồi "Kết nối Google Calendar" lại từ đầu (không mất dữ liệu
task, chỉ tạo lại kết nối).

## Thêm quyền đọc Google Sheets (Giai đoạn J2)

App có thể đọc nhiều Google Sheet/link khác nhau cùng lúc để tự đổ dòng mới vào
Inbox (xem mục "Google Sheets" ở trang Cài đặt). Tính năng này cần thêm quyền
`spreadsheets.readonly` so với lúc chỉ có Calendar.

- **Nếu bạn kết nối Google lần đầu sau khi tính năng này ra mắt**: không cần làm
  gì thêm, quyền đã được xin đủ ngay từ Bước 6.
- **Nếu bạn đã kết nối Google Calendar từ trước** (theo hướng dẫn ở trên): vào
  trang Cài đặt, bấm **"Ngắt kết nối"** rồi **"Kết nối Google Calendar"** lại 1 lần
  — màn hình cấp quyền của Google lần này sẽ có thêm dòng "Xem các file Google
  Sheets", bấm Allow như bình thường. Việc đồng bộ Calendar không bị ảnh hưởng.

Sau khi kết nối đủ quyền, vào mục "Google Sheets" ở Cài đặt, dán **Spreadsheet ID**
(lấy từ URL sheet, đoạn chuỗi dài giữa `/d/` và `/edit`, ví dụ
`docs.google.com/spreadsheets/d/`**`1aBcD...xyz`**`/edit`) và tên sheet (mặc định
"Sheet1") rồi bấm "Thêm sheet" — có thể lặp lại để thêm nhiều sheet/link khác nhau
cùng lúc (mỗi sheet theo dõi tiến độ đọc riêng, xóa 1 sheet không ảnh hưởng các
sheet khác). Từ giờ, mỗi khi mở màn "Hôm nay", app sẽ đọc các dòng mới của TẤT CẢ
sheet đã thêm, thêm vào **cuối** mỗi sheet (dòng đầu tiên luôn được coi là header,
không nhập) và đưa
vào tab Inbox của trang Ghi chú.
