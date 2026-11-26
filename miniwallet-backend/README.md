# MiniWallet Backend

REST API cho ví điện tử MiniWallet, viết bằng **Java 21 + Spring Boot 4**, dữ liệu lưu trong **PostgreSQL**.

| | |
|---|---|
| Framework | Spring Boot 4.2 (Spring MVC, Validation, Data JPA, Actuator) |
| Bảo mật | Spring Security, OAuth2 Resource Server (JWT HS256), BCrypt |
| Database | PostgreSQL 17, migration bằng Flyway |
| Tài liệu API | springdoc-openapi (Swagger UI) |
| Test | JUnit 5, MockMvc, integration test và test chạy song song trên PostgreSQL thật (83 test) |
| CI | GitHub Actions (service `postgres:17`) |

## Chạy ở máy

Yêu cầu: **JDK 21** và **PostgreSQL** (cài trực tiếp, không cần Docker). Maven không cần cài vì project có Maven Wrapper (`mvnw`).

### 1. Tạo database

Mở terminal tại thư mục `miniwallet-backend`, chạy bằng tài khoản `postgres` (nhập mật khẩu `postgres` đã đặt khi cài PostgreSQL). Thay `<mat-khau>` bằng mật khẩu bạn chọn cho user `miniwallet`:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -v app_password=<mat-khau> -f db/create-local-db.sql
```

Lệnh này tạo user `miniwallet` và hai database: `miniwallet` (chạy ứng dụng) và `miniwallet_test` (chạy test; bị xóa sạch mỗi lần test).

### 2. Cấu hình mật khẩu

```powershell
Copy-Item .env.example .env
```

Mở `.env` và điền:
- `DB_PASSWORD=<mat-khau>`
- `JWT_SECRET=` một chuỗi ngẫu nhiên Base64 dài tối thiểu 32 byte, tạo bằng `openssl rand -base64 48` (có sẵn trong Git Bash)

File `.env` đã nằm trong `.gitignore`, không bị commit.

### 3. Chạy

```powershell
.\mvnw spring-boot:run
```

- Swagger UI: http://localhost:8080/swagger-ui.html
- Health check: http://localhost:8080/actuator/health

Khi khởi động, Flyway tự chạy các file trong `src/main/resources/db/migration`.

Lần đầu chạy, ứng dụng tạo sẵn **tài khoản demo `0912345678`, PIN `147258`**, có khoảng 60 ngày giao dịch (giống dữ liệu mẫu của frontend). Cùng lúc ứng dụng tạo 4 người trong danh bạ, cũng là tài khoản thật dùng chung PIN đó. Muốn tắt thì đặt `DEMO_DATA=false`.

### 4. Test

```powershell
.\mvnw verify
```

## Cấu hình

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/miniwallet` | Database của ứng dụng |
| `DB_USERNAME` | `miniwallet` | |
| `DB_PASSWORD` | _(trống)_ | |
| `TEST_DB_URL` | `jdbc:postgresql://localhost:5432/miniwallet_test` | Database cho integration test |
| `JWT_SECRET` | _(bắt buộc)_ | Khóa ký access token, Base64, ≥ 32 byte |
| `DEMO_DATA` | `true` | Tạo tài khoản demo khi khởi động (nếu chưa có) |
| `EXPOSE_OTP` | `true` | Trả mã OTP trong response (bản demo không có SMS). Môi trường thật đặt `false` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Origin của frontend, nhiều giá trị cách nhau bằng dấu phẩy |

## API

Xem đầy đủ trên Swagger UI. Bấm **Authorize** và dán `accessToken` để gọi các endpoint cần đăng nhập.

| Method | Endpoint | Đăng nhập | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | | Đăng ký (tặng 500.000 ₫) và trả về token |
| POST | `/api/auth/login` | | Đăng nhập bằng số điện thoại + PIN |
| POST | `/api/auth/refresh` | | Đổi refresh token lấy cặp token mới |
| POST | `/api/auth/logout` | | Thu hồi refresh token |
| GET | `/api/me` | ✓ | Hồ sơ người dùng hiện tại |
| GET | `/api/wallet` | ✓ | Số dư, trạng thái khóa, hồ sơ, danh bạ gợi ý |
| POST | `/api/wallet/freeze` | ✓ | Khóa ví khẩn cấp (không cần PIN) |
| POST | `/api/wallet/unfreeze` | ✓ | Mở khóa ví (cần PIN) |
| GET | `/api/dashboard?month=2026-11` | ✓ | Tổng thu/chi tháng, chi tiêu theo danh mục, 5 giao dịch gần nhất |
| GET | `/api/transactions?q=&type=&category=&from=&to=&page=&pageSize=` | ✓ | Lịch sử giao dịch: lọc, tìm không dấu, phân trang |
| GET | `/api/transactions/{id}` | ✓ | Chi tiết giao dịch (của người khác thì trả 404) |
| POST | `/api/transfers` | ✓ | Chuyển tiền (cần PIN). Từ 5.000.000 ₫ trả về OTP ticket. Header `Idempotency-Key` tùy chọn |
| POST | `/api/transfers/{id}/confirm` | ✓ | Xác nhận bằng OTP |
| POST | `/api/transfers/{id}/otp/resend` | ✓ | Gửi lại OTP |

## Chuyển tiền

- **Luồng**: nhập thông tin → PIN → (nếu từ 5.000.000 ₫) OTP. Mỗi lần chuyển từ 10.000 ₫ đến 50.000.000 ₫, và chỉ chuyển được tới số đã đăng ký MiniWallet.
  - Dữ liệu được kiểm tra **trước** PIN, để gõ sai số tiền không làm mất lượt thử PIN.
  - Khoản lớn chưa bị trừ tiền khi đang chờ OTP.
- **OTP** hết hạn sau 2 phút, gửi lại được sau 30 giây, sai 3 lần thì lệnh bị hủy. DB chỉ lưu mã băm, so khớp bằng phép so sánh thời gian hằng định.
  - Việc gửi đi qua interface `OtpSender`: bản hiện tại chỉ ghi log, muốn gửi SMS thật thì viết thêm một implementation.
- **Đúng số dư khi nhiều lệnh chạy cùng lúc**: khi trừ/cộng tiền, hai ví bị khóa bằng `SELECT ... FOR UPDATE` và số dư được kiểm tra lại sau khi khóa. DB có thêm `CHECK (balance >= 0)` làm lớp chặn cuối.
- **Không deadlock**: hai ví luôn được khóa theo thứ tự id tăng dần, nên lệnh A→B và B→A chạy cùng lúc không chờ nhau.
- **Idempotency**: client gửi header `Idempotency-Key`. Gửi lại cùng key (mạng chập chờn, bấm hai lần) thì nhận lại đúng kết quả cũ, không bị trừ tiền lần nữa. Nhiều request cùng key chạy song song thì ràng buộc `UNIQUE` chặn, chỉ một request thành công.
- **Bộ đếm OTP sai vẫn được lưu**: khi OTP sai, transaction không ném exception mà trả về kết quả (sealed interface `ConfirmOutcome`), commit bộ đếm, rồi mới báo lỗi cho client.
- **Test chạy song song trên PostgreSQL thật** ([TransferConcurrencyTest](src/test/java/com/miniwallet/transfer/TransferConcurrencyTest.java)):
  - 20 lệnh từ ví 500.000 ₫: đúng 10 lệnh thành công, số dư về 0.
  - 10 người cùng chuyển cho 1 người: không mất lần cộng tiền nào.
  - 10 cặp lệnh A→B và B→A: không deadlock.
  - 5 request cùng `Idempotency-Key`: chỉ trừ tiền một lần.
  - Đã kiểm chứng test bắt được lỗi: bỏ khóa ví thì test báo mất tiền; khóa sai thứ tự thì PostgreSQL báo `deadlock detected`.

## Lịch sử giao dịch và thống kê

- **Tìm kiếm không dấu**: gõ "ca phe" vẫn ra "Cà phê sáng".
  - Cột `search_text` do PostgreSQL tự tính khi ghi: `unaccent(lower(tiêu đề + lời nhắn + SĐT))`.
  - Có index trigram (GIN) nên `LIKE '%...%'` vẫn dùng được index. Ký tự `%`, `_` người dùng gõ được escape.
- **Lọc động** bằng JPA `Specification`: chỉ ghép điều kiện nào người dùng thực sự gửi lên.
- **Thống kê** tính bằng `GROUP BY` trong SQL, không tải hết giao dịch lên Java để cộng. Rút tiền về ngân hàng của mình vẫn tính vào "tiền ra", nhưng không tính là chi tiêu.
- **Ngày và tháng theo giờ Việt Nam**, còn DB lưu UTC. Ví dụ giao dịch lúc 23:30 ngày 31/10 giờ VN thuộc tháng 10, dù server chạy ở múi giờ nào.
- **Phân trang**: `page` đánh số từ 1, sắp xếp ổn định (thời gian rồi đến id). Nếu xin trang vượt quá số trang thì server trả về trang cuối.
- **Danh bạ gợi ý** lấy từ những người đã chuyển/nhận tiền gần đây, không cần bảng riêng.

## Xác thực và bảo mật

- **PIN** băm bằng BCrypt (salt riêng cho từng người). Khi đăng ký, PIN phải đúng 6 chữ số và không dễ đoán (`111111`, `123456`...); luật này viết thành annotation `@StrongPin` dùng chung.
- **Sai PIN 5 lần thì khóa 5 phút**, áp dụng chung cho đăng nhập và các thao tác cần PIN.
  - Bộ đếm được ghi trong transaction riêng (`REQUIRES_NEW`), nên exception ném ra sau đó không rollback mất lần sai.
  - Dòng user bị khóa (`SELECT ... FOR UPDATE`) khi kiểm tra, nên gửi nhiều lần đoán song song không vượt được giới hạn. Có test bắn 10 request cùng lúc.
- **Đăng nhập sai số điện thoại hay sai PIN** đều nhận cùng một thông báo, và server vẫn chạy BCrypt với mã băm giả để thời gian phản hồi như nhau. Nhờ vậy không dò được số nào đã đăng ký.
- **Access token** là JWT sống 15 phút; server chỉ kiểm tra chữ ký, không cần tra DB.
- **Refresh token** là chuỗi ngẫu nhiên 256 bit, DB chỉ lưu SHA-256, sống 30 phút.
  - Mỗi lần refresh, token cũ bị hủy và cấp token mới (rotation). Vì vậy không thao tác quá 30 phút thì phải đăng nhập lại.
  - Nếu một token đã hủy bị dùng lại (dấu hiệu bị đánh cắp), server thu hồi **mọi** phiên của người đó.
- **Không dùng cookie** nên không cần chống CSRF. Mọi lỗi 401 từ Spring Security cũng trả về đúng định dạng JSON chung.

## Định dạng lỗi

Mọi lỗi đều trả về cùng một dạng JSON. Mã lỗi (`code`) trùng với `ApiErrorCode` của frontend:

```json
{
  "code": "VALIDATION",
  "message": "Dữ liệu không hợp lệ.",
  "fields": { "phone": "Số điện thoại không hợp lệ." }
}
```

| HTTP | Mã lỗi |
|---|---|
| 400 | `VALIDATION` |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| 404 | `NOT_FOUND` |
| 409 | `PHONE_TAKEN` |
| 422 | `PIN_INVALID`, `INSUFFICIENT_BALANCE`, `OTP_INVALID`, `OTP_EXPIRED`, `BANK_REJECTED`, `BANK_INSUFFICIENT` |
| 423 | `PIN_LOCKED`, `WALLET_FROZEN`, `OTP_LOCKED` |
| 429 | `TOO_SOON` |
| 500 | `SERVER_ERROR` (không bao giờ lộ stack trace hay câu SQL ra client) |

## Cấu trúc

```
src/main/java/com/miniwallet
├── auth/           Đăng ký, đăng nhập, PIN, JWT + refresh token
├── user/           Entity User (luật khóa PIN), /api/me
├── wallet/         Entity Wallet (credit/debit/freeze), khóa/mở ví
├── transaction/    Lịch sử giao dịch, Specification, truy vấn thống kê
├── transfer/       Chuyển tiền, OTP, idempotency
├── dashboard/      Tổng quan theo tháng
├── demo/           Tạo tài khoản demo khi khởi động
├── common/
│   ├── error/      ErrorCode, ApiException, GlobalExceptionHandler
│   ├── security/   AuthenticatedUser, 401 dạng JSON
│   ├── validation/ @VietnamPhone, @StrongPin
│   └── PageResponse
└── config/         Spring Security, CORS, Clock, OpenAPI
```
