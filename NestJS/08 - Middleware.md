# NestJS — Middleware Chi Tiết

> **Middleware** là hàm xử lý được gọi **trước khi** request đến route handler. Hiểu đúng middleware giúp bạn kiểm soát luồng request, implement logging, authentication, rate limiting...
>
> Tham khảo: [NestJS Official Docs — Middleware](https://docs.nestjs.com/middleware)

---

## Mục lục

1. [Middleware là gì?](#1-middleware-là-gì)
2. [Cách tạo Middleware trong NestJS](#2-cách-tạo-middleware)
3. [Functional Middleware](#3-functional-middleware)
4. [Áp dụng Middleware](#4-áp-dụng-middleware)
5. [Middleware toàn cục](#5-middleware-toàn-cục)
6. [Thứ tự thực thi](#6-thứ-tự-thực-thi)
7. [So sánh Middleware vs Guard vs Interceptor](#7-so-sánh)
8. [Các trường hợp sử dụng phổ biến](#8-trường-hợp-sử-dụng)
9. [Câu hỏi phỏng vấn](#9-câu-hỏi-phỏng-vấn)

---

# 1. Middleware là gì?

## Khái niệm

Middleware là hàm có quyền truy cập vào:
- **Request** (`req`) — dữ liệu từ client
- **Response** (`res`) — dữ liệu trả về client
- **Next** (`next()`) — hàm gọi middleware tiếp theo

```
Client ──▶ Middleware 1 ──▶ Middleware 2 ──▶ ... ──▶ Route Handler ──▶ Response
              │                  │
              ▼                  ▼
        (có thể chặn,     (có thể sửa đổi
         redirect,          request/response)
         hoặc gọi next)
```

## Middleware trong NestJS vs Express

NestJS xây dựng trên Express (hoặc Fastify), nên middleware NestJS **tương đương** middleware Express, nhưng có 2 cách viết:

| Cách | Dùng khi |
|------|---------|
| **Class middleware** | Cần inject dependency (service, repository) — dùng DI |
| **Functional middleware** | Logic đơn giản, không cần DI |

---

# 2. Cách tạo Middleware

## Class Middleware — Có DI

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  // Có thể inject service qua constructor (DI)
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req
    const start = Date.now()

    // Sau khi response hoàn tất
    res.on('finish', () => {
      const duration = Date.now() - start
      const { statusCode } = res
      this.logger.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms`)
    })

    next()  // ← BẮT BUỘC gọi next() để chuyển tiếp
  }
}
```

**Điểm quan trọng**:
- Implement `NestMiddleware` interface
- Dùng `@Injectable()` → có thể inject dependency qua constructor
- **Phải gọi `next()`** — nếu không, request sẽ bị treo (hang)

## Middleware xác thực (Authentication)

```typescript
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly tokenService: TokenService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      throw new UnauthorizedException('Thiếu access token')
    }

    try {
      const payload = await this.tokenService.verify(token)
      req['user'] = payload  // Gắn thông tin user vào request
      next()
    } catch {
      throw new UnauthorizedException('Token không hợp lệ')
    }
  }
}
```

---

# 3. Functional Middleware

Khi logic đơn giản, không cần inject service → dùng hàm:

```typescript
import { Request, Response, NextFunction } from 'express'

// Middleware đo thời gian xử lý
export function timingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} - ${Date.now() - start}ms`)
  })
  next()
}

// Middleware thêm request ID
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req['requestId'] = crypto.randomUUID()
  res.setHeader('X-Request-Id', req['requestId'])
  next()
}
```

---

# 4. Áp dụng Middleware

## Trong Module — Dùng `configure()`

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'

@Module({
  controllers: [UserController, OrderController],
  providers: [UserService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)     // Áp dụng middleware nào
      .forRoutes('*')              // Cho route nào

    consumer
      .apply(AuthMiddleware)
      .exclude(                     // Loại trừ route
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
      )
      .forRoutes('*')              // Áp dụng cho tất cả trừ login/register
  }
}
```

## Các cách chỉ định route

```typescript
// 1. Tất cả route
consumer.apply(LoggerMiddleware).forRoutes('*')

// 2. Route cụ thể
consumer.apply(AuthMiddleware).forRoutes('users')           // /users, /users/123...
consumer.apply(AuthMiddleware).forRoutes('users', 'orders') // Nhiều route

// 3. Route + Method cụ thể
consumer.apply(AuthMiddleware).forRoutes(
  { path: 'users', method: RequestMethod.GET },
  { path: 'users', method: RequestMethod.DELETE },
)

// 4. Controller cụ thể
consumer.apply(AuthMiddleware).forRoutes(UserController)

// 5. Wildcard
consumer.apply(LoggerMiddleware).forRoutes('ab*cd')  // abcd, abXcd, abYZcd...
```

## Nhiều middleware cùng lúc

```typescript
consumer
  .apply(RequestIdMiddleware, LoggerMiddleware, AuthMiddleware)  // Thứ tự quan trọng!
  .forRoutes('*')
// Thực thi: RequestId → Logger → Auth → Handler
```

---

# 5. Middleware toàn cục

## Dùng `app.use()` trong `main.ts`

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Middleware toàn cục — KHÔNG thể inject dependency (vì ngoài DI container)
  app.use(timingMiddleware)
  app.use(helmet())   // Bảo mật HTTP headers
  app.use(cors())     // Cross-Origin Resource Sharing

  await app.listen(3000)
}
```

**Lưu ý**: Middleware đăng ký qua `app.use()`:
- ✅ Áp dụng cho **tất cả** route
- ❌ **Không** thể inject dependency (nằm ngoài module system)
- Thường dùng cho middleware bên thứ 3 (helmet, cors, compression)

---

# 6. Thứ tự thực thi

```
Request
  │
  ├──▶ Global middleware (app.use)
  │
  ├──▶ Module middleware (configure)
  │       Thứ tự: theo thứ tự .apply()
  │
  ├──▶ Guards
  │
  ├──▶ Interceptors (trước)
  │
  ├──▶ Pipes
  │
  ├──▶ Route Handler
  │
  ├──▶ Interceptors (sau)
  │
  └──▶ Exception Filters (nếu có lỗi)
```

**Middleware chạy ĐẦU TIÊN** — trước cả Guard và Interceptor.

---

# 7. So sánh

| Đặc điểm | Middleware | Guard | Interceptor |
|-----------|-----------|-------|-------------|
| **Khi nào chạy** | Đầu tiên | Sau middleware | Sau guard |
| **Mục đích chính** | Xử lý request/response chung | Kiểm tra quyền truy cập | Biến đổi request/response |
| **Có DI?** | Có (class middleware) | Có | Có |
| **Biết route handler?** | Không | Có (`ExecutionContext`) | Có (`ExecutionContext`) |
| **Có thể chặn request?** | Có | Có (return false) | Có |
| **Ví dụ** | Logger, CORS, Helmet | AuthGuard, RolesGuard | Cache, Logging, Transform |

**Quy tắc chọn**:
- Cần xử lý chung, không cần biết route → **Middleware**
- Cần kiểm tra quyền, cần biết route/handler → **Guard**
- Cần biến đổi response hoặc đo thời gian xử lý → **Interceptor**

---

# 8. Trường hợp sử dụng

## Rate Limiting

```typescript
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, { count: number; resetAt: number }>()

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip
    const now = Date.now()
    const windowMs = 60_000  // 1 phút
    const maxRequests = 100

    const record = this.requests.get(ip)
    if (!record || now > record.resetAt) {
      this.requests.set(ip, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (record.count >= maxRequests) {
      throw new HttpException('Quá nhiều yêu cầu', HttpStatus.TOO_MANY_REQUESTS)
    }

    record.count++
    next()
  }
}
```

## Request Logging với Correlation ID

```typescript
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID()
    req['correlationId'] = correlationId
    res.setHeader('X-Correlation-Id', correlationId)
    next()
  }
}
```

---

# 9. Câu hỏi phỏng vấn

## Câu 1: Middleware trong NestJS khác Express?

**Trả lời**: "Về bản chất giống nhau — đều là hàm nhận req, res, next. Khác biệt: NestJS hỗ trợ class middleware với DI (inject service qua constructor), có thể giới hạn theo route/controller/method cụ thể qua `MiddlewareConsumer`, và nằm trong module system."

## Câu 2: Khi nào dùng Middleware thay vì Guard?

**Trả lời**: "Middleware dùng cho xử lý chung không cần biết route handler (logging, CORS, parse body). Guard dùng khi cần kiểm tra quyền truy cập và cần biết route handler thông qua `ExecutionContext` (lấy metadata như roles). Nếu cần `@SetMetadata()` thì phải dùng Guard."

## Câu 3: Tại sao phải gọi `next()` trong middleware?

**Trả lời**: "Nếu không gọi `next()`, request sẽ bị treo (hang) — client chờ mãi không có response. `next()` chuyển tiếp request sang middleware tiếp theo hoặc route handler. Nếu muốn chặn request, ném exception thay vì bỏ `next()`."

## Câu 4: Middleware toàn cục có inject service được không?

**Trả lời**: "Nếu đăng ký qua `app.use()` trong `main.ts` — không, vì nằm ngoài DI container. Nếu muốn middleware toàn cục có DI, đăng ký trong `AppModule.configure()` với `.forRoutes('*')`."

---

## Tham khảo

| Nguồn | Đường dẫn |
|-------|-----------|
| NestJS Middleware | [docs.nestjs.com/middleware](https://docs.nestjs.com/middleware) |
