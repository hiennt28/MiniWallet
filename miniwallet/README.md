# MiniWallet – Ví điện tử mini

Ứng dụng web mô phỏng ví điện tử: xem số dư, thống kê chi tiêu, tra cứu lịch sử giao dịch và **chuyển tiền có xác thực OTP**.
Dữ liệu là giả lập và chạy hoàn toàn trên trình duyệt, nên không cần backend: tải về là chạy được, deploy chỉ cần một bước.

> Demo: _(thêm link Vercel sau khi deploy)_

![Trang tổng quan](docs/screenshots/dashboard.png)

## Tính năng

**Tổng quan**
- Số dư ví, có nút ẩn/hiện. Trạng thái ẩn được nhớ cho lần mở sau.
- Tổng tiền vào, tiền ra trong tháng.
- Biểu đồ tròn chi tiêu theo danh mục, **tự vẽ bằng SVG**, không dùng thư viện biểu đồ.
- 5 giao dịch gần nhất.

**Lịch sử giao dịch**
- Tìm kiếm **không phân biệt dấu**: gõ "ca phe" vẫn ra "Cà phê sáng". Tìm được theo tên, lời nhắn và số điện thoại.
- Lọc theo loại (tiền vào/ra), danh mục và khoảng ngày.
- Có phân trang, giao dịch được gom theo ngày.
- Bộ lọc **lưu trên URL** (`?q=&type=&page=`): tải lại trang hoặc bấm Back vẫn giữ nguyên, và có thể gửi link cho người khác.
- Chờ người dùng ngừng gõ 300 ms mới tìm (debounce), không gọi API theo từng phím.
- Trang chi tiết riêng cho từng giao dịch (`/transactions/:id`).

**Chuyển tiền, 3 bước:** nhập thông tin → xác nhận → nhập OTP
- Chọn nhanh người nhận từ danh bạ, chọn nhanh số tiền. Ô số tiền tự thêm dấu chấm khi gõ (`1.250.000`).
- Kiểm tra dữ liệu: số điện thoại Việt Nam hợp lệ, không chuyển cho chính mình, tối thiểu 10.000 ₫, tối đa 50.000.000 ₫/lần, không vượt số dư, lời nhắn tối đa 100 ký tự.
- OTP 6 số hết hạn sau 2 phút, gửi lại được sau 30 giây. **Sai 3 lần thì giao dịch bị hủy.**
- "Server" giả lập kiểm tra lại toàn bộ dữ liệu, không tin hoàn toàn vào form.
- Có biên lai sau khi chuyển thành công. Số dư và lịch sử tự cập nhật.

**Cài đặt:** chế độ sáng/tối (mặc định theo hệ điều hành), ẩn số dư, khôi phục dữ liệu mẫu (có hộp thoại xác nhận).

**Chất lượng giao diện**
- Responsive: máy tính dùng thanh bên, điện thoại dùng thanh điều hướng dưới đáy.
- Đủ trạng thái **đang tải (skeleton) / rỗng / lỗi (có nút thử lại)** ở mọi màn hình.
- Truy cập được bằng bàn phím và trình đọc màn hình: nhãn cho mọi ô nhập, lỗi gắn với ô qua `aria-describedby`, hộp thoại đóng bằng Esc và trả focus về chỗ cũ, link "Bỏ qua tới nội dung chính", tôn trọng cài đặt giảm chuyển động.

| Chế độ tối | Xác thực OTP | Điện thoại |
|---|---|---|
| ![Chế độ tối](docs/screenshots/dashboard-dark.png) | ![OTP](docs/screenshots/transfer-otp.png) | ![Mobile](docs/screenshots/mobile-transfer.png) |

## Công nghệ

| | |
|---|---|
| Ngôn ngữ | TypeScript (`strict`, `noUncheckedIndexedAccess`) |
| Giao diện | React 18 (function component + hooks), Vite |
| Điều hướng | React Router 6 (route lồng nhau, tham số `:id`, `useSearchParams`) |
| Quản lý state | Context API + `useReducer` (state ví dùng chung; luồng chuyển tiền là một máy trạng thái riêng) |
| Gọi dữ liệu | API giả lập trả về Promise có độ trễ 0,3–0,7 giây và lỗi có mã (`ApiError`), cùng hook `useAsync` tự viết |
| Lưu trữ | `localStorage` (có xử lý khi trình duyệt chặn) |
| Giao diện | CSS thuần + CSS variables cho chế độ sáng/tối, không dùng thư viện UI |
| Kiểm thử | Vitest: 41 test cho hàm định dạng, validate, lọc/phân trang, reducer và toàn bộ luồng chuyển tiền của API |

Chỉ dùng 3 thư viện khi chạy: `react`, `react-dom`, `react-router-dom`.

## Cài đặt và chạy

Yêu cầu Node.js 18 trở lên.

```bash
npm install
npm run dev      # mở http://localhost:5173
npm test         # chạy test
npm run typecheck # kiểm tra kiểu TypeScript
npm run build    # kiểm tra kiểu rồi build production vào thư mục dist/
npm run preview  # xem thử bản build
```

## Các tình huống để thử

| Muốn thử | Cách làm |
|---|---|
| Chuyển tiền thành công | Chọn một người trong danh bạ, nhập số tiền, lấy mã OTP trong khung "Tin nhắn giả lập" |
| Lỗi validate | Bấm "Tiếp tục" khi chưa nhập gì, hoặc nhập số tiền lớn hơn số dư |
| Sai OTP 3 lần | Nhập sai mã 3 lần, giao dịch bị hủy và quay về bước đầu |
| Lỗi máy chủ | Chuyển tới số **0999999999** |
| Người nhận chưa có trong danh bạ | Nhập một số hợp lệ bất kỳ, màn xác nhận sẽ hiện cảnh báo |
| Dữ liệu ban đầu | Cài đặt → Khôi phục dữ liệu mẫu |

## Luồng chuyển tiền

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant UI as TransferPage
    participant API as walletApi (giả lập)
    participant DB as db (localStorage)

    U->>UI: Nhập SĐT, số tiền, lời nhắn
    UI->>UI: validateTransfer() phía client
    U->>UI: Bấm "Xác nhận chuyển"
    UI->>API: createTransfer()
    API->>API: Kiểm tra lại dữ liệu, tạo OTP (hạn 2 phút)
    API-->>UI: transferId + OTP (hiện dạng tin nhắn giả lập)
    U->>UI: Nhập OTP
    UI->>API: confirmTransfer(transferId, otp)
    alt OTP đúng và đủ số dư
        API->>DB: Trừ số dư, thêm giao dịch
        API-->>UI: Giao dịch mới
        UI->>UI: Hiện biên lai, làm mới số dư
    else Sai OTP (lần 1–2)
        API-->>UI: OTP_INVALID: còn N lần thử
    else Sai lần 3 / hết hạn / không đủ tiền
        API-->>UI: OTP_LOCKED / OTP_EXPIRED / INSUFFICIENT_BALANCE
    end
```

Các bước của form được quản lý bằng reducer (`components/transfer/transferReducer.ts`):

```
form ──Tiếp tục──▶ confirm ──Xác nhận──▶ otp ──OTP đúng──▶ success
  ▲                   │                    │
  └────Quay lại───────┘◀──Hủy / sai 3 lần──┘
```

## Cấu trúc thư mục

```
src/
├── api/
│   ├── db.ts                 # "Cơ sở dữ liệu": bộ nhớ + localStorage
│   └── walletApi.ts          # API giả lập: độ trễ, kiểm tra dữ liệu, OTP, ApiError
├── components/
│   ├── common/               # Button, Field, Modal, Switch, Money, Pagination, States...
│   ├── charts/DonutChart.tsx # Biểu đồ tròn SVG
│   ├── layout/Layout.tsx     # Thanh bên / thanh dưới + <Outlet />
│   ├── transaction/          # TransactionItem
│   └── transfer/             # Các bước chuyển tiền + transferReducer
├── context/
│   ├── WalletContext.tsx     # Provider + hook useWallet()
│   └── walletReducer.ts
├── data/                     # Danh mục, dữ liệu mẫu (sinh ngẫu nhiên có seed cố định)
├── hooks/                    # useAsync, useNow, useTheme
├── pages/                    # Dashboard, Transactions, TransactionDetail, TransferPage, Settings, NotFound
├── styles/                   # base.css (biến màu, bố cục), components.css, pages.css
├── utils/                    # format tiền/ngày, validators, lọc/phân trang/thống kê
└── types.ts                  # Kiểu dữ liệu dùng chung: Transaction, Database, OtpTicket...
```

Test nằm cạnh file được test (`*.test.ts`).

## Một số quyết định khi làm

- **Tách logic khỏi giao diện.** Định dạng, validate, lọc và thống kê là hàm thuần trong `utils/`, nên test dễ mà không cần render component. Hàm `validateTransfer` dùng chung cho form và "server".
- **API giả lập nhưng hành xử như thật.** Có độ trễ, lỗi có mã, và kiểm tra lại dữ liệu ở server. Nhờ vậy giao diện phải xử lý đủ loading và lỗi. Muốn nối backend thật thì chỉ cần thay `api/walletApi.ts`, các trang giữ nguyên.
- **Tránh hiện sai dữ liệu khi đổi bộ lọc nhanh.** `useAsync` bỏ qua kết quả của lần gọi cũ nếu đã có lần gọi mới hơn.
- **Để TypeScript chặn trạng thái sai.** Action của reducer là union có phân biệt (discriminated union), mã lỗi API là kiểu liệt kê `ApiErrorCode`, và dữ liệu đọc từ URL hay localStorage được kiểm tra trước khi dùng (`isCategoryKey`, `isDatabase`).
- **Tiền luôn là số nguyên (đồng).** Chỉ định dạng khi hiển thị, tránh lỗi làm tròn số thực.

## Deploy lên Vercel

1. Đưa code lên GitHub.
2. Vào [vercel.com](https://vercel.com), chọn **Add New → Project** rồi chọn repo. Vercel tự nhận Vite (build: `npm run build`, output: `dist`).
3. File `vercel.json` đã cấu hình để các đường dẫn như `/transactions/abc` không bị lỗi 404 khi tải lại trang.

## Hướng phát triển

- Thêm test giao diện với React Testing Library.
- Nối với backend thật (Spring Boot + JWT).
- Thêm tính năng nạp tiền và xuất lịch sử ra CSV.
