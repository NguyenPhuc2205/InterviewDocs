# Error Handling — Node.js & NestJS

> **Xử lý lỗi** là kỹ năng phân biệt junior và senior. Tài liệu này giải thích cách xử lý lỗi đúng cách trong Node.js và NestJS — từ try/catch cơ bản đến custom exceptions, error hierarchy, và best practices.
>
> Tham khảo: [Node.js Errors](https://nodejs.org/api/errors.html), [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)

---

## Mục lục

1. [Lỗi trong JavaScript/Node.js](#1-lỗi-trong-javascript)
2. [Phân loại lỗi](#2-phân-loại-lỗi)
3. [Xử lý lỗi trong hàm bất đồng bộ](#3-xử-lý-lỗi-bất-đồng-bộ)
4. [Custom Error Classes](#4-custom-error-classes)
5. [Error Handling trong NestJS](#5-error-handling-nestjs)
6. [Best Practices](#6-best-practices)
7. [Câu hỏi phỏng vấn](#7-câu-hỏi-phỏng-vấn)

---

# 1. Lỗi trong JavaScript

## Error Object

```javascript
const error = new Error('Có lỗi xảy ra')

console.log(error.message)  // "Có lỗi xảy ra"
console.log(error.name)     // "Error"
console.log(error.stack)    // Stack trace — dòng nào gây lỗi
```

## Các loại Error có sẵn

| Loại | Khi nào xảy ra |
|------|---------------|
| `Error` | Class cơ sở cho mọi lỗi |
| `TypeError` | Sai kiểu dữ liệu (`null.method()`, `undefined.property`) |
| `RangeError` | Giá trị ngoài phạm vi (`new Array(-1)`) |
| `ReferenceError` | Biến chưa khai báo (`console.log(x)` khi x chưa define) |
| `SyntaxError` | Sai cú pháp (`JSON.parse('invalid')`) |

## Throw và Catch

```javascript
// Throw — ném lỗi
function divide(a, b) {
  if (b === 0) throw new Error('Không thể chia cho 0')
  return a / b
}

// Catch — bắt lỗi
try {
  const result = divide(10, 0)
} catch (error) {
  console.error('Lỗi:', error.message)  // "Không thể chia cho 0"
} finally {
  console.log('Luôn chạy — dọn dẹp tài nguyên')
}
```

---

# 2. Phân loại lỗi

## Operational Errors vs Programmer Errors

| | Operational Errors (Lỗi vận hành) | Programmer Errors (Lỗi lập trình) |
|---|---|---|
| **Là gì** | Lỗi **dự kiến được** — xảy ra trong quá trình vận hành | Lỗi **do code sai** — không nên xảy ra |
| **Ví dụ** | Mất kết nối DB, file không tồn tại, request timeout, validation thất bại | `null.property`, quên `await`, sai tên biến, logic sai |
| **Cách xử lý** | Bắt và **xử lý hợp lý** (retry, thông báo user, fallback) | **Sửa code** — không catch để che đậy |
| **Nên crash app?** | Không — xử lý và tiếp tục | Nên — để phát hiện và sửa sớm |

```javascript
// Operational error — xử lý hợp lý
try {
  await db.connect()
} catch (error) {
  logger.error('Mất kết nối DB, thử lại sau 5s...')
  await sleep(5000)
  await db.connect()  // Retry
}

// Programmer error — sửa code, đừng catch
const user = null
user.getName()  // TypeError — SỬA CODE, đừng catch
```

---

# 3. Xử lý lỗi bất đồng bộ

## Callback Pattern (cũ)

```javascript
// Error-first callback — convention Node.js
fs.readFile('data.txt', (error, data) => {
  if (error) {
    console.error('Lỗi đọc file:', error)
    return
  }
  console.log(data)
})
```

## Promise

```javascript
fetchUser(id)
  .then(user => console.log(user))
  .catch(error => console.error('Lỗi:', error))
  .finally(() => console.log('Dọn dẹp'))
```

## Async/Await — Khuyến khích

```javascript
async function getUser(id) {
  try {
    const user = await fetchUser(id)
    return user
  } catch (error) {
    // Xử lý lỗi cụ thể
    if (error.code === 'NOT_FOUND') {
      throw new NotFoundException(`User ${id} không tồn tại`)
    }
    throw error  // Re-throw lỗi không xử lý được
  }
}
```

## Unhandled Promise Rejection — Nguy hiểm!

```javascript
// ❌ NGUY HIỂM: Promise bị reject nhưng không ai catch
async function dangerousFunction() {
  const data = await fetch('https://api.example.com/data')
  // Nếu fetch thất bại → Unhandled Rejection → Node.js crash (v15+)
}

dangerousFunction()  // Quên await hoặc .catch()

// ✅ Bắt lỗi ở top level
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason)
  // Trong production: log lỗi, gửi alert, graceful shutdown
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  // PHẢI thoát process — state có thể không nhất quán
  process.exit(1)
})
```

---

# 4. Custom Error Classes

## Tại sao cần Custom Error?

Dùng chung `Error` → không phân biệt được **loại lỗi**:

```javascript
// ❌ Không biết lỗi gì
try {
  await createUser(data)
} catch (error) {
  // error.message = "Có lỗi" — lỗi gì? validation? DB? conflict?
}
```

## Tạo Error Hierarchy

```typescript
// Base error — tất cả lỗi ứng dụng kế thừa từ đây
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly isOperational: boolean = true,  // Lỗi vận hành hay lỗi code?
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

// Lỗi validation — 400
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly errors: Record<string, string[]> = {},
  ) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

// Không tìm thấy — 404
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} với id "${id}" không tồn tại`, 404, 'NOT_FOUND')
  }
}

// Lỗi xác thực — 401
export class AuthenticationError extends AppError {
  constructor(message = 'Chưa xác thực') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

// Lỗi phân quyền — 403
export class AuthorizationError extends AppError {
  constructor(message = 'Không có quyền truy cập') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

// Xung đột — 409
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR')
  }
}
```

## Sử dụng Custom Error

```typescript
class UserService {
  async findById(id: string) {
    const user = await this.userRepo.findById(id)
    if (!user) throw new NotFoundError('User', id)  // Rõ ràng
    return user
  }

  async create(data: CreateUserDto) {
    const existing = await this.userRepo.findByEmail(data.email)
    if (existing) throw new ConflictError('Email đã được sử dụng')

    return this.userRepo.create(data)
  }
}

// Bắt lỗi — phân biệt loại
try {
  await userService.create(data)
} catch (error) {
  if (error instanceof ValidationError) {
    // Trả về lỗi 400 + chi tiết validation
  } else if (error instanceof ConflictError) {
    // Trả về lỗi 409
  } else {
    // Lỗi không mong đợi — log + trả 500
  }
}
```

---

# 5. Error Handling trong NestJS

## HttpException — Lỗi HTTP có sẵn

```typescript
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common'

// NestJS tự format response lỗi
throw new NotFoundException('User không tồn tại')
// → { statusCode: 404, message: "User không tồn tại", error: "Not Found" }

throw new BadRequestException(['Email không hợp lệ', 'Mật khẩu quá ngắn'])
// → { statusCode: 400, message: ["Email không hợp lệ", "Mật khẩu quá ngắn"], error: "Bad Request" }
```

## Custom Exception trong NestJS

```typescript
// Kết hợp custom error với NestJS HttpException
export class UserNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super({
      statusCode: 404,
      error: 'USER_NOT_FOUND',
      message: `Người dùng với ID "${userId}" không tồn tại`,
    })
  }
}

export class EmailConflictException extends ConflictException {
  constructor(email: string) {
    super({
      statusCode: 409,
      error: 'EMAIL_CONFLICT',
      message: `Email "${email}" đã được sử dụng`,
    })
  }
}

// Sử dụng trong Service
@Injectable()
export class UserService {
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new UserNotFoundException(id)
    return user
  }
}
```

## Global Exception Filter — Bắt tất cả lỗi

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()

    let status = 500
    let message = 'Lỗi máy chủ nội bộ'
    let error = 'INTERNAL_ERROR'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()
      message = typeof res === 'string' ? res : (res as any).message
      error = (res as any).error || exception.name
    }

    // Log lỗi (lỗi 5xx → error level, 4xx → warn level)
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}`, exception)
    } else {
      this.logger.warn(`${request.method} ${request.url} - ${status}: ${message}`)
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    })
  }
}

// Đăng ký toàn cục
@Module({
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
```

---

# 6. Best Practices

## Quy tắc xử lý lỗi

| Quy tắc | Giải thích |
|---------|-----------|
| **Throw sớm, catch muộn** | Ném lỗi ngay khi phát hiện, bắt ở tầng ngoài cùng (controller/filter) |
| **Không nuốt lỗi** | Đừng `catch (e) {}` rỗng — ít nhất phải log |
| **Phân biệt lỗi vận hành / lỗi code** | Lỗi vận hành → xử lý. Lỗi code → sửa |
| **Dùng custom error** | Phân biệt loại lỗi rõ ràng, không dùng chung `Error` |
| **Log đầy đủ** | Log lỗi 5xx chi tiết (stack trace). Log lỗi 4xx ngắn gọn |
| **Không expose chi tiết nội bộ** | Client nhận message thân thiện, server log chi tiết |
| **Dùng error codes** | `USER_NOT_FOUND` rõ hơn `Not Found` — client dể xử lý |

## Ví dụ tổng hợp — Service Layer

```typescript
@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private paymentService: PaymentService,
    private logger: Logger,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 1. Validate nghiệp vụ — throw sớm
    const user = await this.userService.findById(userId)
    // findById đã throw UserNotFoundException nếu không tìm thấy

    if (dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống')
    }

    // 2. Xử lý trong transaction
    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({ data: { userId, ...dto } })

        // Thanh toán — có thể thất bại
        await this.paymentService.charge(user, order.total)

        return order
      })
    } catch (error) {
      // 3. Xử lý lỗi cụ thể
      if (error instanceof PaymentDeclinedException) {
        throw new BadRequestException('Thanh toán bị từ chối: ' + error.message)
      }

      // 4. Lỗi không mong đợi — log + throw generic error
      this.logger.error('Lỗi tạo đơn hàng', error)
      throw new InternalServerErrorException('Không thể tạo đơn hàng')
    }
  }
}
```

---

# 7. Câu hỏi phỏng vấn

## Câu 1: Phân biệt operational error và programmer error?

**Trả lời**: "Operational error là lỗi dự kiến trong quá trình vận hành — mất kết nối DB, file không tồn tại, validation thất bại. Cần bắt và xử lý hợp lý (retry, thông báo user). Programmer error là lỗi do code sai — TypeError, quên await, logic sai. Cần sửa code, không nên catch để che đậy."

## Câu 2: Xử lý unhandled promise rejection thế nào?

**Trả lời**: "Đăng ký handler `process.on('unhandledRejection')` để log lỗi và gửi alert. Từ Node.js 15+, unhandled rejection sẽ crash process theo mặc định. Tốt nhất là đảm bảo mọi Promise đều có `.catch()` hoặc nằm trong try/catch với async/await."

## Câu 3: Tại sao nên dùng custom error class?

**Trả lời**: "Custom error cho phép phân biệt loại lỗi bằng `instanceof`, thêm thuộc tính như error code và HTTP status, và xây dựng error hierarchy cho ứng dụng. Ví dụ: `NotFoundError`, `ValidationError`, `AuthenticationError` — mỗi loại có message, status code, và cách xử lý khác nhau."

## Câu 4: 'Throw sớm, catch muộn' nghĩa là gì?

**Trả lời**: "Throw sớm: phát hiện lỗi ở đâu thì ném ngay, đừng tiếp tục xử lý với dữ liệu sai. Catch muộn: bắt lỗi ở tầng ngoài cùng (controller, exception filter) thay vì bắt ở từng tầng. Ví dụ: service throw lỗi, để exception filter bắt và format response — không cần try/catch trong controller."

## Câu 5: NestJS xử lý exception thế nào?

**Trả lời**: "NestJS có Exception Filter layer bắt tất cả exception. Mặc định, HttpException được format thành JSON response với statusCode và message. Custom Exception Filter cho phép tùy chỉnh format response, thêm logging, và xử lý lỗi không phải HttpException. Đăng ký global filter qua `APP_FILTER` provider để có DI."

---

## Tham khảo

| Nguồn | Đường dẫn |
|-------|-----------|
| Node.js Errors | [nodejs.org/api/errors.html](https://nodejs.org/api/errors.html) |
| NestJS Exception Filters | [docs.nestjs.com/exception-filters](https://docs.nestjs.com/exception-filters) |
| Joyent Error Handling Guide | [joyent.com/node-js/production/design/errors](https://www.joyent.com/node-js/production/design/errors) |
