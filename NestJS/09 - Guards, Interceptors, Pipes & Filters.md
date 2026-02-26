# NestJS — Guards, Interceptors, Pipes & Filters

> **Bộ tứ Enhancers** — 4 khái niệm này tạo nên hệ thống xử lý request mạnh mẽ của NestJS. Hiểu đúng chúng giúp bạn viết code sạch, tách biệt cross-cutting concerns, và trả lời phỏng vấn chắc chắn.
>
> Tham khảo: [NestJS Official Docs](https://docs.nestjs.com)

---

## Mục lục

1. [Tổng quan — Request Lifecycle](#1-tổng-quan)
2. [Guards — Kiểm soát quyền truy cập](#2-guards)
3. [Interceptors — Biến đổi request/response](#3-interceptors)
4. [Pipes — Validate & Transform dữ liệu](#4-pipes)
5. [Exception Filters — Xử lý lỗi](#5-exception-filters)
6. [So sánh chi tiết 4 Enhancers](#6-so-sánh)
7. [Câu hỏi phỏng vấn](#7-câu-hỏi-phỏng-vấn)

---

# 1. Tổng quan

## Request Lifecycle trong NestJS

```
Request từ Client
  │
  ├─▶ Middleware              ← Xử lý chung (logging, cors)
  │
  ├─▶ Guards                  ← Cho phép/chặn request (auth, roles)
  │
  ├─▶ Interceptors (trước)    ← Biến đổi trước handler (cache, logging)
  │
  ├─▶ Pipes                   ← Validate/transform dữ liệu đầu vào
  │
  ├─▶ Route Handler           ← Controller method
  │
  ├─▶ Interceptors (sau)      ← Biến đổi response (wrap data, timing)
  │
  └─▶ Exception Filters       ← Bắt lỗi, format response lỗi
        (chạy khi có lỗi ở bất kỳ bước nào)
```

## Phạm vi áp dụng (Scope)

Mỗi enhancer có thể áp dụng ở 3 mức:

| Scope | Cách dùng | Ảnh hưởng |
|-------|----------|-----------|
| **Method** | Decorator trên method | Chỉ 1 route handler |
| **Controller** | Decorator trên class | Tất cả handler trong controller |
| **Global** | `app.useGlobal*()` hoặc `APP_*` provider | Tất cả route trong app |

---

# 2. Guards

## Guard là gì?

Guard quyết định **request có được phép đi tiếp hay không**. Trả về `true` → cho qua, `false` hoặc ném exception → chặn.

Khác middleware: Guard có **ExecutionContext** — biết request đang đi đến handler nào, có metadata gì.

## Tạo Guard

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = request.headers.authorization?.replace('Bearer ', '')

    if (!token) return false

    try {
      const payload = await this.tokenService.verify(token)
      request.user = payload  // Gắn user vào request
      return true             // Cho phép đi tiếp
    } catch {
      return false            // Chặn request
    }
  }
}
```

## Guard với Metadata — Roles Guard

```typescript
// Tạo decorator custom để gắn metadata
import { SetMetadata } from '@nestjs/common'
export const Roles = (...roles: string[]) => SetMetadata('roles', roles)

// Guard đọc metadata từ ExecutionContext
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Đọc metadata 'roles' từ handler
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),   // Kiểm tra trên method trước
      context.getClass(),     // Rồi kiểm tra trên class
    ])

    if (!requiredRoles) return true  // Không yêu cầu role → cho qua

    const { user } = context.switchToHttp().getRequest()
    return requiredRoles.some(role => user.roles?.includes(role))
  }
}
```

## Sử dụng Guard

```typescript
@Controller('users')
@UseGuards(AuthGuard)  // Áp dụng cho tất cả handler trong controller
export class UserController {

  @Get()
  findAll() { /* ... */ }  // Cần AuthGuard

  @Delete(':id')
  @Roles('admin')                    // Metadata: chỉ admin
  @UseGuards(AuthGuard, RolesGuard)  // Guard kiểm tra auth + role
  remove(@Param('id') id: string) { /* ... */ }
}
```

## Guard toàn cục

```typescript
// Cách 1: trong main.ts (KHÔNG có DI)
app.useGlobalGuards(new AuthGuard())

// Cách 2: trong module (CÓ DI — khuyến khích)
@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

---

# 3. Interceptors

## Interceptor là gì?

Interceptor **bọc quanh** route handler — có thể chạy logic **trước** và **sau** handler. Dùng RxJS Observable.

**Khả năng**:
- Biến đổi response trước khi trả về client
- Thêm logic trước/sau handler (logging, cache, timing)
- Xử lý exception
- Override hoàn toàn handler (cache hit → không gọi handler)

## Tạo Interceptor

### Logging Interceptor — Đo thời gian xử lý

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const { method, url } = request
    const now = Date.now()

    console.log(`[Request] ${method} ${url}`)

    return next.handle().pipe(
      tap(() => {
        console.log(`[Response] ${method} ${url} - ${Date.now() - now}ms`)
      }),
    )
  }
}
```

### Response Transform — Bọc response vào format chuẩn

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T; statusCode: number }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        statusCode: context.switchToHttp().getResponse().statusCode,
        data,
        timestamp: new Date().toISOString(),
      })),
    )
  }
}

// Trước: handler trả { name: "An" }
// Sau:   client nhận { statusCode: 200, data: { name: "An" }, timestamp: "..." }
```

### Cache Interceptor — Trả response cache, không gọi handler

```typescript
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private cacheService: CacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const key = context.switchToHttp().getRequest().url
    const cached = await this.cacheService.get(key)

    if (cached) {
      return of(cached)  // Trả cache — KHÔNG gọi handler
    }

    return next.handle().pipe(
      tap(data => this.cacheService.set(key, data, 60)),  // Lưu cache 60s
    )
  }
}
```

## 3.1 RxJS Operators trong Interceptor

Interceptor dùng **RxJS Observable** — `next.handle()` trả về Observable chứa response data. Bạn dùng `.pipe()` với các operators để xử lý:

### Bảng các operators thường dùng

| Operator | Import | Mục đích | Thay đổi data? |
|----------|--------|----------|---------|
| **`tap`** | `rxjs/operators` | Side-effect (logging, cache), **KHÔNG thay đổi** data | ❌ Không |
| **`map`** | `rxjs/operators` | **Biến đổi** data trước khi trả về client | ✅ Có |
| **`catchError`** | `rxjs/operators` | Bắt lỗi từ handler, trả error khác hoặc fallback | ✅ Có (error) |
| **`timeout`** | `rxjs/operators` | Giới hạn thời gian xử lý, ném `TimeoutError` nếu quá hạn | ❌ Không |
| **`switchMap`** | `rxjs/operators` | Chuyển sang Observable khác (ít dùng trong NestJS) | ✅ Có |
| **`of`** | `rxjs` | Tạo Observable từ giá trị — dùng khi trả cache, mock | ✅ Có |

### `tap` — Side-effect, KHÔNG thay đổi data

```typescript
// tap: "nhìn" data nhưng KHÔNG THAY ĐỔI nó
// Dùng cho: logging, lưu cache, ghi metrics
return next.handle().pipe(
  tap({
    next: (data) => {
      // data ở đây là response từ handler
      console.log('Response data:', data)    // Chỉ log, KHÔNG sửa
      this.cacheService.set(key, data, 60)  // Lưu cache, KHÔNG sửa
    },
    error: (err) => {
      console.error('Handler error:', err)   // Log lỗi
    },
  }),
)
// Client nhận ĐÚNG data gốc từ handler, không bị thay đổi
```

### `map` — Biến đổi data

```typescript
// map: THAY ĐỔI data trước khi trả về client
// Dùng cho: wrap response, xóa field nhạy cảm, format data
return next.handle().pipe(
  map(data => ({
    success: true,
    data,                              // Wrap vào object mới
    timestamp: new Date().toISOString(),
  })),
)
// Handler trả: { name: "Phuc" }
// Client nhận: { success: true, data: { name: "Phuc" }, timestamp: "..." }
```

### `catchError` — Bắt lỗi và xử lý

```typescript
import { catchError } from 'rxjs/operators'
import { throwError } from 'rxjs'

// catchError: bắt lỗi từ handler, biến đổi hoặc thay thế
return next.handle().pipe(
  catchError(err => {
    // Log lỗi chi tiết (side-effect)
    this.logger.error(`[${request.method}] ${request.url}`, err.stack)

    // Có thể trả lỗi mới
    return throwError(() => new InternalServerErrorException('Lỗi hệ thống'))

    // Hoặc trả fallback data
    // return of({ data: null, error: 'Service unavailable' })
  }),
)
```

### `timeout` — Giới hạn thời gian

```typescript
import { timeout, catchError } from 'rxjs/operators'
import { TimeoutError, throwError } from 'rxjs'

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),  // 5 giây — ném TimeoutError nếu quá hạn
      catchError(err => {
        if (err instanceof TimeoutError) {
          return throwError(() =>
            new RequestTimeoutException('Request xử lý quá lâu')
          )
        }
        return throwError(() => err)
      }),
    )
  }
}
```

### Kết hợp nhiều operators

```typescript
// Thực tế: thường kết hợp nhiều operators trong 1 pipe
return next.handle().pipe(
  timeout(5000),                               // 1. Giới hạn 5s
  tap(data => this.logger.log('Success', data)), // 2. Log (side-effect)
  map(data => ({ success: true, data })),        // 3. Wrap response
  catchError(err => {                            // 4. Bắt lỗi
    this.logger.error('Error', err)
    return throwError(() => err)
  }),
)
```

> ⚠️ **Nhớ**: `tap` = **nhìn nhưng không sờ** (side-effect). `map` = **biến đổi** (transform). Đây là điểm khác biệt quan trọng nhất — hay bị hỏi phỏng vấn.

## Sử dụng Interceptor

```typescript
// Trên method
@Get()
@UseInterceptors(LoggingInterceptor)
findAll() { /* ... */ }

// Trên controller
@Controller('users')
@UseInterceptors(TransformInterceptor)
export class UserController { /* ... */ }

// Toàn cục (có DI)
@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
```

## Thứ tự khi dùng nhiều Interceptors

```typescript
// Interceptors chạy theo thứ tự khai báo (TRƯỚC handler)
// và NGƯỢC thứ tự (SAU handler) — giống stack LIFO

@UseInterceptors(A, B, C)
findAll() { /* ... */ }

// TRƯỚC handler: A.before → B.before → C.before
// Handler chạy
// SAU handler:  C.after  → B.after  → A.after
//
// Giống try-catch nesting:
// A { B { C { handler } C } B } A
```

---

# 4. Pipes

## Pipe là gì?

Pipe xử lý **dữ liệu đầu vào** trước khi đến handler. Hai mục đích:

1. **Validation** — Kiểm tra dữ liệu có hợp lệ không
2. **Transformation** — Chuyển đổi kiểu dữ liệu (string → number, string → Date...)

## Pipes có sẵn trong NestJS

| Pipe | Mục đích |
|------|---------|
| `ValidationPipe` | Validate body/query/param theo class-validator hoặc Zod |
| `ParseIntPipe` | Chuyển string → integer |
| `ParseFloatPipe` | Chuyển string → float |
| `ParseBoolPipe` | Chuyển string → boolean |
| `ParseUUIDPipe` | Kiểm tra và parse UUID |
| `ParseArrayPipe` | Parse mảng |
| `DefaultValuePipe` | Gán giá trị mặc định nếu undefined |

## Sử dụng Pipe có sẵn

```typescript
@Controller('users')
export class UserController {
  // ParseIntPipe: "123" → 123, "abc" → lỗi 400
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id)
  }

  // ParseUUIDPipe: kiểm tra format UUID
  @Get(':uuid')
  findByUuid(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.userService.findByUuid(uuid)
  }

  // DefaultValuePipe: nếu không truyền page → mặc định 1
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.userService.findAll(page, limit)
  }
}
```

## Tạo Pipe Custom

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common'

// Pipe validate và trim string
@Injectable()
export class TrimPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Giá trị phải là chuỗi')
    }
    return value.trim()
  }
}

// Pipe validate với Zod
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException(result.error.format())
    }
    return result.data
  }
}

// Sử dụng
@Post()
create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserDto) {
  return this.userService.create(dto)
}
```

## ValidationPipe toàn cục

```typescript
// main.ts — phổ biến nhất
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,          // Loại bỏ field không có trong DTO
  forbidNonWhitelisted: true, // Ném lỗi nếu có field không hợp lệ
  transform: true,          // Tự động chuyển kiểu (string → number)
}))
```

---

# 5. Exception Filters

## Exception Filter là gì?

Exception Filter **bắt lỗi** từ bất kỳ bước nào (middleware, guard, interceptor, pipe, handler) và **format response lỗi** trả về client.

NestJS có **Exception Filter mặc định** — tự động xử lý `HttpException`. Bạn tạo custom filter khi cần format lỗi riêng.

## Exception Filter mặc định

```typescript
// Ném exception trong code — NestJS tự format
throw new NotFoundException('Không tìm thấy người dùng')
// → { statusCode: 404, message: "Không tìm thấy người dùng", error: "Not Found" }

throw new BadRequestException('Email không hợp lệ')
// → { statusCode: 400, message: "Email không hợp lệ", error: "Bad Request" }

throw new UnauthorizedException()
// → { statusCode: 401, message: "Unauthorized" }

throw new ForbiddenException('Không có quyền')
// → { statusCode: 403, message: "Không có quyền", error: "Forbidden" }
```

## Tạo Custom Exception Filter

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'

@Catch()  // Bắt TẤT CẢ exception (không chỉ HttpException)
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const message = exception instanceof HttpException
      ? exception.message
      : 'Lỗi máy chủ nội bộ'

    // Log lỗi
    this.logger.error(`${request.method} ${request.url} - ${status}`, exception)

    // Format response chuẩn
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    })
  }
}
```

## Filter cho Exception cụ thể

```typescript
@Catch(HttpException)  // Chỉ bắt HttpException
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const status = exception.getStatus()

    response.status(status).json({
      success: false,
      statusCode: status,
      message: exception.message,
      errors: exception.getResponse()['message'],  // Chi tiết validation errors
    })
  }
}
```

## Sử dụng Exception Filter

```typescript
// Trên method
@Post()
@UseFilters(HttpExceptionFilter)
create(@Body() dto: CreateUserDto) { /* ... */ }

// Trên controller
@Controller('users')
@UseFilters(AllExceptionsFilter)
export class UserController { /* ... */ }

// Toàn cục (có DI)
@Module({
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
```

---

# 6. So sánh

## 6.1 Bảng so sánh 4 Enhancers

| | Guard | Interceptor | Pipe | Filter |
|-|-------|-------------|------|--------|
| **Interface** | `CanActivate` | `NestInterceptor` | `PipeTransform` | `ExceptionFilter` |
| **Mục đích** | Cho phép / chặn | Biến đổi req/res | Validate / transform | Xử lý lỗi |
| **Khi nào chạy** | Trước interceptor | Bọc quanh handler | Trước handler | Khi có exception |
| **Return type** | `boolean` / `Promise<boolean>` | `Observable<any>` | Giá trị đã transform | `void` |
| **Có DI?** | ✅ | ✅ | ✅ | ✅ |
| **Có ExecutionContext?** | ✅ | ✅ `CallHandler` | ❌ Chỉ có `ArgumentMetadata` | ✅ `ArgumentsHost` |
| **Chạy trước handler?** | ✅ | ✅ (before) | ✅ | ❌ Chỉ khi có lỗi |
| **Chạy sau handler?** | ❌ | ✅ (after, qua RxJS) | ❌ | ❌ |
| **Có thể skip handler?** | ✅ (return false) | ✅ (return `of(cached)`) | ❌ (chỉ throw) | ❌ |
| **Global token** | `APP_GUARD` | `APP_INTERCEPTOR` | `APP_PIPE` | `APP_FILTER` |
| **Decorator** | `@UseGuards()` | `@UseInterceptors()` | `@UsePipes()` | `@UseFilters()` |

## 6.2 Middleware vs Guard vs Interceptor — So sánh chi tiết

Đây là 3 thứ **dễ nhầm nhất** khi phỏng vấn:

| Tiêu chí | Middleware | Guard | Interceptor |
|----------|-----------|-------|---------|
| **Biết handler đích?** | ❌ Không | ✅ Có (`ExecutionContext`) | ✅ Có (`ExecutionContext`) |
| **Đọc metadata?** | ❌ Không | ✅ Có (`Reflector`) | ✅ Có (`Reflector`) |
| **Thay đổi response?** | ❌ Chỉ req | ❌ Chỉ cho phép/chặn | ✅ Có (qua RxJS `map`) |
| **Chạy code sau handler?** | ❌ | ❌ | ✅ Có (qua RxJS `tap`, `map`) |
| **Dùng RxJS?** | ❌ | ❌ | ✅ Bắt buộc |
| **NestJS-specific?** | ❌ (giống Express) | ✅ | ✅ |
| **Có thể dùng DI?** | ✅ (functional: ❌) | ✅ | ✅ |
| **Use case chính** | CORS, body parsing, logging đơn giản | Auth, RBAC, rate limiting | Response transform, timing, cache |

> 💡 **Quy tắc ngón tay cái:**
> - Cần **req/res/next** đơn giản, không cần biết handler → **Middleware**
> - Cần **quyết định cho phép hay chặn** dựa trên metadata → **Guard**
> - Cần **biến đổi response** hoặc **chạy logic sau handler** → **Interceptor**

## 6.3 Guard vs Pipe — Khi nào dùng gì?

| Scenario | Dùng gì | Lý do |
|----------|---------|-------|
| Kiểm tra JWT token hợp lệ | **Guard** | Đây là authorization, không phải data validation |
| Kiểm tra body DTO hợp lệ | **Pipe** | Đây là input validation |
| Kiểm tra user có role admin | **Guard** | Role-based access control |
| Chuyển `"123"` → `123` | **Pipe** | Data transformation |
| Kiểm tra user sở hữu resource | **Guard** | Business authorization |
| Validate email format | **Pipe** | Input validation |

## 6.4 Flowchart quyết định

```
Bạn cần xử lý gì?
│
├─ "Request có được phép không?"           → Guard
│    └─ Dựa trên token, role, permission
│
├─ "Dữ liệu đầu vào hợp lệ không?"       → Pipe
│    └─ Validate DTO, transform types
│
├─ "Cần thay đổi response format?"         → Interceptor (map)
│    └─ Wrap data, remove sensitive fields
│
├─ "Cần side-effect (log, cache)?"         → Interceptor (tap)
│    └─ Logging thời gian, lưu cache
│
├─ "Cần format lỗi riêng?"                → Exception Filter
│    └─ Custom error response format
│
└─ "Cần xử lý chung cho mọi request?"     → Middleware
     └─ CORS, body parsing, helmet
```

## 6.5 Ví dụ thực tế — Kết hợp tất cả

```typescript
@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)          // 1. Auth + Role check
@UseInterceptors(TransformInterceptor)     // 4. Wrap response
export class OrderController {

  @Post()
  @Roles('customer')                       // Metadata cho RolesGuard
  @UseInterceptors(LoggingInterceptor)     // 3. Log timing
  @UseFilters(HttpExceptionFilter)         // 5. Format error
  create(
    @Body(new ZodValidationPipe(CreateOrderSchema))  // 2. Validate input
    dto: CreateOrderDto,
  ) {
    return this.orderService.create(dto)   // Handler
  }
}

// Luồng thực thi:
// Request → AuthGuard (token?) → RolesGuard (role customer?)
//         → LoggingInterceptor.before (start timer)
//         → TransformInterceptor.before
//         → ZodValidationPipe (validate body)
//         → Handler (create order)
//         → TransformInterceptor.after (wrap { success, data })
//         → LoggingInterceptor.after (log "POST /orders - 45ms")
//         → Response to client
//
// Nếu lỗi ở bất kỳ bước nào → HttpExceptionFilter bắt
```

---

# 7. Câu hỏi phỏng vấn

## Câu 1: Thứ tự thực thi của các enhancers?

**Trả lời**: "Middleware → Guards → Interceptors (trước) → Pipes → Handler → Interceptors (sau). Exception Filter bắt lỗi ở bất kỳ bước nào. Nếu có nhiều cùng loại, chạy theo thứ tự khai báo — trừ interceptor SAU handler thì chạy **ngược** (LIFO)."

## Câu 2: Guard khác Middleware thế nào?

**Trả lời**: "Guard có `ExecutionContext` — biết request đang đi đến handler nào, đọc được metadata (roles, permissions) bằng `Reflector`. Middleware không biết handler, chỉ biết req/res/next giống Express. Dùng guard khi cần kiểm tra quyền dựa trên route metadata."

## Câu 3: Interceptor có thể thay thế response hoàn toàn không?

**Trả lời**: "Có. Interceptor có thể trả Observable mà không gọi `next.handle()` — ví dụ cache interceptor: nếu cache hit, trả `of(cachedData)` mà không gọi handler. Đây là khả năng mà Middleware, Guard, và Pipe đều không có."

## Câu 4: Tại sao dùng `APP_GUARD` provider thay vì `app.useGlobalGuards()`?

**Trả lời**: "Dùng `APP_GUARD` provider trong module thì guard nằm trong DI container — có thể inject service qua constructor. Dùng `app.useGlobalGuards()` trong `main.ts` thì guard nằm ngoài DI container — không inject được."

## Câu 5: Pipe chạy khi nào? Trước hay sau guard?

**Trả lời**: "Pipe chạy SAU guard và SAU interceptor (trước handler). Thứ tự: Guard kiểm tra quyền → Interceptor xử lý trước → Pipe validate dữ liệu → Handler xử lý nghiệp vụ."

## Câu 6: `tap` và `map` trong Interceptor khác nhau thế nào?

**Trả lời**: "`tap` là side-effect — nhìn data nhưng **không thay đổi** nó. Dùng cho logging, lưu cache, ghi metrics. `map` **biến đổi data** trước khi trả về client — dùng cho wrap response, xóa field nhạy cảm, format data. Cách nhớ: `tap` = nhìn nhưng không sờ, `map` = biến đổi."

## Câu 7: Interceptor khác Pipe thế nào?

**Trả lời**: "Pipe xử lý **dữ liệu đầu vào** (validate body, transform params) — chạy **trước** handler. Interceptor xử lý cả **trước và sau** handler — đặc biệt có thể biến đổi **response** bằng RxJS operators. Pipe không thể thay đổi response, Interceptor không thể validate từng parameter."

## Câu 8: Khi có nhiều Exception Filter, filter nào được ưu tiên?

**Trả lời**: "Filter cụ thể hơn sẽ chạy trước. Ví dụ nếu có `@Catch(NotFoundException)` và `@Catch(HttpException)`, khi ném `NotFoundException` thì filter cụ thể chạy. Nếu ném lỗi khác (không phải NotFoundException) thì filter `HttpException` chạy. Filter `@Catch()` (không tham số) bắt tất cả — chạy cuối cùng nếu không filter nào khác bắt được."

## Câu 9: NestJS xử lý lỗi mặc định như thế nào nếu không có Exception Filter?

**Trả lời**: "NestJS có **Global Exception Filter mặc định** xử lý mọi lỗi chưa được bắt. Nếu là `HttpException` → trả status code + message tương ứng. Nếu là lỗi khác → trả 500 Internal Server Error. Custom Filter chỉ cần khi muốn format lỗi khác mặc định — ví dụ thêm `timestamp`, `path`, hoặc log chi tiết."

## Câu 10: Cho ví dụ kết hợp Guard + Interceptor + Pipe thực tế?

**Trả lời**: "Endpoint tạo order: `AuthGuard` kiểm tra JWT token → `RolesGuard` đọc metadata `@Roles('customer')` để chỉ cho customer → `LoggingInterceptor` đo thời gian xử lý (dùng `tap`) → `ZodValidationPipe` validate body theo schema → Handler tạo order → `TransformInterceptor` wrap response thành `{ success: true, data }` (dùng `map`). Nếu lỗi ở bất kỳ bước nào → `HttpExceptionFilter` format lỗi trả về."

---

## Tham khảo

| Nguồn | Đường dẫn |
|-------|-----------|
| Guards | [docs.nestjs.com/guards](https://docs.nestjs.com/guards) |
| Interceptors | [docs.nestjs.com/interceptors](https://docs.nestjs.com/interceptors) |
| Pipes | [docs.nestjs.com/pipes](https://docs.nestjs.com/pipes) |
| Exception Filters | [docs.nestjs.com/exception-filters](https://docs.nestjs.com/exception-filters) |
| RxJS Operators | [rxjs.dev/api](https://rxjs.dev/api) |
