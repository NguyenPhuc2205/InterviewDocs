# NestJS Request Lifecycle

> **Câu hỏi phỏng vấn kinh điển**: "Middleware, Guard, Interceptor, Pipe, Filter — khác nhau thế nào và dùng khi nào?"

---

## 1. Bức tranh tổng thể

Hãy tưởng tượng một request vào NestJS giống như khách vào một tòa nhà bảo mật — phải qua nhiều lớp kiểm tra theo thứ tự cố định:

```
HTTP Request
    │
    ▼
┌─────────────┐
│ MIDDLEWARE  │  "Tiền xử lý" — logging, parse token, CORS
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   GUARD     │  "Bảo vệ" — mày có quyền vào không?
└──────┬──────┘  (true → đi tiếp, false → 403)
       │
       ▼
┌─────────────┐
│ INTERCEPTOR │  "Bọc" — ghi lại thời gian, chuẩn bị cache
│   (trước)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    PIPE     │  "Kiểm tra & chuẩn hóa data" — email đúng chưa?
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   HANDLER   │  Code thật của bạn chạy ở đây
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ INTERCEPTOR │  "Bọc response" — format lại trước khi trả về
│   (sau)     │
└──────┬──────┘
       │
       ▼
HTTP Response

⚡ Nếu lỗi xảy ra ở BẤT KỲ bước nào:
┌─────────────┐
│   FILTER    │  Bắt exception → format error response
└─────────────┘
```

---

## 2. Phân biệt 5 thành phần — bằng 1 câu

| Thành phần | Vai trò trong 1 câu | Ví dụ |
|---|---|---|
| **Middleware** | Chạy đầu tiên, xử lý ở tầng HTTP, không biết NestJS bên trong | Logging, parse JWT từ header, CORS |
| **Guard** | Trả `true/false` — cho vào hay chặn, biết đang vào route nào | Kiểm tra token, kiểm tra role |
| **Interceptor** | Bọc quanh handler — chạy cả trước lẫn sau | Wrap response, đo thời gian, cache |
| **Pipe** | Kiểm tra + chuyển đổi data đầu vào | `'123'` → `123`, validate DTO |
| **Filter** | Bắt exception, format error response | `{ success: false, message: '...' }` |

---

## 3. Tại sao không chỉ dùng Middleware như Express?

### Vấn đề: Express dùng 1 pattern cho mọi thứ

Trong Express, **tất cả đều là middleware** — xác thực, phân quyền, validate, xử lý lỗi — đều dùng cùng pattern `(req, res, next)`:

```typescript
// Express — mọi thứ đều gọi là "middleware"
app.use(loggerMiddleware);         // Logging        ← middleware
app.use(authMiddleware);           // Xác thực       ← cũng middleware
app.use(roleCheckMiddleware);      // Phân quyền     ← cũng middleware
app.use(validateBodyMiddleware);   // Validate       ← cũng middleware
app.post('/users', createUser);    // Handler
app.use(errorHandlerMiddleware);   // Xử lý lỗi     ← cũng middleware

// Tất cả trông giống nhau, nhưng MỤC ĐÍCH hoàn toàn khác nhau
```

### NestJS tách ra thành các thành phần chuyên biệt

NestJS nhận ra mỗi bước trong quá trình xử lý request có **mục đích khác nhau**, nên tạo ra các thành phần riêng biệt — mỗi cái chỉ lo **đúng 1 việc**:

| Trách nhiệm | Express dùng gì? | NestJS dùng gì? | Lý do? |
|---|---|---|---|
| Tiền xử lý (log, parse) | Middleware | **Middleware** — giữ nguyên | Đúng mục đích gốc |
| Xác thực + phân quyền | Middleware | **Guard** | Cần biết vào route nào, đọc decorator |
| Bọc logic trước/sau | Middleware | **Interceptor** | Cần chạy cả 2 chiều (vào + ra) |
| Validate + transform data | Middleware | **Pipe** | Chuyên xử lý data, tách riêng cho rõ |
| Xử lý lỗi | Middleware | **Exception Filter** | Tầng bắt lỗi riêng, chuẩn hóa response |

### Điểm cốt lõi: Middleware "không biết gì" về NestJS

Tài liệu NestJS viết:

> **"Middleware, by its nature, is dumb. It doesn't know which handler will be executed after calling the `next()` function."**
>
> (Middleware, về bản chất, là "ngốc". Nó không biết handler nào sẽ được thực thi sau khi gọi `next()`.)

Ngược lại, Guard, Interceptor, Pipe, Filter đều có quyền truy cập `ExecutionContext` — biết đầy đủ:
- Đang vào **controller nào**, **handler nào**
- Có **decorator gì** trên handler (ví dụ `@Roles('admin')`)
- Request đến từ **HTTP, WebSocket, hay Microservice**

> Xem chi tiết về `ExecutionContext` trong tài liệu [02.1 - Execution Context](./02.1%20-%20Execution%20Context.md).

---

## 4. Từng thành phần — chi tiết

---

### 4.1. Middleware

**Định nghĩa theo NestJS docs:**

> "Middleware is a function which is called **before** the route handler."
>
> (Middleware là hàm được gọi **trước** route handler.)

Middleware truy cập được `req` (request), `res` (response), và `next()` — giống hệt Express middleware. NestJS giữ lại middleware vì nó kế thừa từ Express/Fastify.

**Đặc điểm quan trọng:**

- **Phải gọi `next()`** để chuyển tiếp — không gọi thì request bị treo
- Có thể thay đổi `req` và `res`
- Hỗ trợ Dependency Injection (inject service, config...)
- **Không biết handler nào sẽ chạy sau** — đây là khác biệt cốt lõi so với Guard

**Dùng khi nào?**

Những việc **không cần biết NestJS context** — không cần biết request đi đến controller/route nào:
- Logging mọi request (IP, method, URL)
- Parse JWT từ header → gắn vào `req.user` (chỉ decode, chưa authorize)
- CORS, Helmet, Rate limiting
- Nén/giải nén request body

```typescript
// Class middleware — dùng khi cần Dependency Injection
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${req.method}] ${req.url}`);
    next(); // ← BẮT BUỘC — không gọi thì request bị treo
  }
}

// Đăng ký trong module — qua method configure()
@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // áp dụng cho tất cả routes
  }
}

// Functional middleware — dùng khi không cần inject gì
export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`Request...`);
  next();
}
```

---

### 4.2. Guard

**Định nghĩa theo NestJS docs:**

> "A guard is a class annotated with the `@Injectable()` decorator, which implements the `CanActivate` interface."
>
> "Guards have a **single responsibility**. They determine whether a given request will be handled by the route handler or not."
>
> (Guard có đúng 1 trách nhiệm: quyết định request có được phép vào handler hay không.)

**Tại sao Guard chứ không phải Middleware?**

NestJS docs giải thích:

> "Middleware, by its nature, is dumb. It doesn't know which handler will be executed after calling `next()`."
>
> "On the other hand, **Guards have access to the `ExecutionContext` instance**, and thus know exactly what's going to be executed next."
>
> (Guard có quyền truy cập `ExecutionContext`, nên biết chính xác handler nào sắp chạy.)

Guard biết đầy đủ context:
- Biết request đang đi đến **controller nào**, **handler nào**
- Đọc được **metadata** từ decorator (ví dụ `@Roles('admin')`, `@Public()`)
- Dùng `Reflector` để lấy custom metadata

**Cách hoạt động:**

Method `canActivate()` trả về:
- `true` → request được xử lý tiếp
- `false` → NestJS tự động chặn (throw `ForbiddenException`, status 403)

Có thể trả về `boolean`, `Promise<boolean>`, hoặc `Observable<boolean>`.

**Dùng khi nào?**

- **Xác thực (Authentication)**: Token JWT có hợp lệ không?
- **Phân quyền (Authorization)**: User có đúng role không?
- Bất cứ khi nào cần **cho phép** hoặc **từ chối** request

```typescript
// Auth Guard — kiểm tra JWT
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) return false; // → 403

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload; // gắn user vào request
      return true;
    } catch {
      return false; // token lỗi → 403
    }
  }
}

// Roles Guard — kiểm tra quyền, đọc metadata từ decorator
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Đọc metadata @Roles() gắn trên handler
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true; // không yêu cầu role → cho qua

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}

// Sử dụng — thứ tự quan trọng: Auth chạy trước, Roles chạy sau
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Get('/admin')
getAdminDashboard() {
  return 'Admin only';
}
```

---

### 4.3. Interceptor

**Định nghĩa theo NestJS docs:**

> "An interceptor is a class annotated with the `@Injectable()` decorator and implements the `NestInterceptor` interface."
>
> "Interceptors are inspired by the **Aspect-Oriented Programming (AOP)** technique."

**5 khả năng của Interceptor (theo docs):**

1. Thêm logic **trước/sau** handler
2. **Transform** kết quả trả về từ handler
3. **Transform** exception thrown từ handler
4. **Mở rộng** hành vi cơ bản của function
5. **Ghi đè hoàn toàn** function trong tình huống nhất định (ví dụ: cache hit → trả luôn, không gọi handler)

**Cơ chế hoạt động:**

Method `intercept()` nhận 2 tham số:
- `ExecutionContext` — context thực thi (giống Guard)
- `CallHandler` — object có method `handle()` gọi handler thật

```
// Dòng chảy trong interceptor:
code TRƯỚC next.handle()  →  handler chạy  →  code SAU trong pipe()
```

`next.handle()` trả về RxJS `Observable` chứa kết quả handler. Dùng RxJS operators (`map`, `tap`, `catchError`...) để xử lý response.

**Dùng khi nào?**

- Wrap response thành format chuẩn `{ success: true, data: ... }`
- Đo thời gian thực thi
- Cache response
- Timeout cho request chậm

```typescript
// Wrap mọi response thành format chuẩn
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();

    return next.handle().pipe(     // next.handle() = gọi handler thật
      map(data => ({               // map = xử lý SAU handler trả về
        success: true,
        data,
        duration: `${Date.now() - start}ms`,
      })),
    );
  }
}

// Kết quả:
// Trước: GET /users → [{ id: 1, name: 'Nguyễn' }]
// Sau:   GET /users → { success: true, data: [...], duration: '12ms' }

// Timeout — hủy request nếu quá lâu
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(5000),
      catchError(err => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException();
        }
        throw err;
      }),
    );
  }
}
```

---

### 4.4. Pipe

**Định nghĩa theo NestJS docs:**

> "A pipe is a class annotated with the `@Injectable()` decorator, which implements the `PipeTransform` interface."

**Hai mục đích chính:**

1. **Transformation**: chuyển đổi data đầu vào (ví dụ: chuỗi `'123'` → số `123`)
2. **Validation**: kiểm tra data — hợp lệ thì cho qua, không hợp lệ thì throw exception

Pipe hoạt động trên **arguments** của handler — chạy **ngay trước** khi handler được gọi. Handler nhận arguments đã được pipe xử lý.

**Dùng khi nào?**

- Parse params: `ParseIntPipe`, `ParseUUIDPipe`, `ParseBoolPipe`
- Validate request body qua DTO (`ValidationPipe` + `class-validator`)
- Đặt giá trị mặc định (`DefaultValuePipe`)
- Tự viết pipe chuyển đổi riêng

```typescript
// Pipe có sẵn — dùng thường xuyên nhất
@Get(':id')
findOne(
  @Param('id', ParseIntPipe) id: number
  //           ↑ '123' → 123 | 'abc' → throw 400 Bad Request
) {}

// ValidationPipe + DTO — phổ biến nhất trong thực tế
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}

@Post()
create(@Body() dto: CreateUserDto) {
  // Nếu vào được đây → data ĐÃ hợp lệ
  return this.usersService.create(dto);
}

// Bật ValidationPipe cho toàn app (main.ts) — chỉ cần làm 1 lần
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // tự loại bỏ fields không có trong DTO
  forbidNonWhitelisted: true, // throw 400 nếu gửi fields lạ
  transform: true,            // tự chuyển đổi kiểu theo DTO
}));
```

---

### 4.5. Exception Filter

**Định nghĩa theo NestJS docs:**

> "NestJS comes with a built-in **exceptions layer** which is responsible for processing all unhandled exceptions across an application."
>
> "When an exception is not handled by your application code, it is caught by this layer, which then automatically sends an appropriate user-friendly response."

**Cách hoạt động:**

- NestJS có sẵn **global exception filter** xử lý `HttpException` và các subclass
- Nếu exception **không phải** `HttpException` → trả default 500 Internal Server Error
- Có thể tạo **custom filter** để kiểm soát format error response

**Exception có sẵn:**

| Exception | Status | Dùng khi |
|---|---|---|
| `BadRequestException` | 400 | Data không hợp lệ |
| `UnauthorizedException` | 401 | Chưa đăng nhập / token hết hạn |
| `ForbiddenException` | 403 | Không có quyền |
| `NotFoundException` | 404 | Không tìm thấy resource |
| `ConflictException` | 409 | Xung đột (email trùng) |
| `InternalServerErrorException` | 500 | Lỗi server |

**Dùng khi nào?**

- Chuẩn hóa error response format cho toàn app
- Log lỗi tập trung
- Xử lý lỗi từ database, API bên ngoài, v.v.
- Gửi thông báo khi có lỗi nghiêm trọng

```typescript
// Throw exception ở bất kỳ đâu (service, controller, guard...)
throw new NotFoundException('User không tồn tại');    // → 404
throw new ConflictException('Email đã được sử dụng'); // → 409

// Custom filter — chuẩn hóa error response
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      success: false,
      statusCode: status,
      message: exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

// Catch tất cả (kể cả lỗi không phải HttpException)
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
    });
  }
}
```

---

## 5. Thứ tự thực thi khi có nhiều instances

Khi bạn khai báo guard, interceptor, pipe, filter ở nhiều cấp (global, controller, route), thứ tự như sau:

### Chiều đi vào (tiền xử lý): Global → Controller → Route

```
Middleware:   Global → Module-bound (theo thứ tự đăng ký)
Guard:        Global → Controller → Route
Interceptor:  Global → Controller → Route
Pipe:         Global → Controller → Route → Parameter
              (nhiều param? chạy từ param CUỐI → param ĐẦU)
```

### Chiều đi ra (hậu xử lý): NGƯỢC LẠI — Route → Controller → Global

```
Interceptor (response): Route → Controller → Global
Exception Filter:       Route → Controller → Global
```

> 💡 **Dễ nhớ**: Vào từ **ngoài vào trong** (Global → Route). Ra từ **trong ra ngoài** (Route → Global). Giống **ngăn xếp (stack)**: vào trước, ra sau.

**Ví dụ:**

```typescript
// Global guard (cấp 1)
app.useGlobalGuards(new AuthGuard());

// Controller guard (cấp 2)
@UseGuards(LoggingGuard)
@Controller('users')
export class UsersController {

  // Route guard (cấp 3)
  @UseGuards(RolesGuard)
  @Get('admin')
  getAdmin() { ... }
}

// Thứ tự: AuthGuard → LoggingGuard → RolesGuard
```

**Pipe parameter — thứ tự đặc biệt:**

```typescript
@Get(':category/:id')
findOne(
  @Param('category') category: string,    // Param 1
  @Param('id', ParseIntPipe) id: number,  // Param 2
) { ... }

// Pipe chạy từ param CUỐI → param ĐẦU:
// ParseIntPipe(id) chạy TRƯỚC → validate 'category' chạy SAU
```

**Filter — filter đầu tiên match sẽ xử lý:**

```typescript
// Route-level filter → kiểm tra trước
@UseFilters(ValidationExceptionFilter)
@Post()
create() { ... }

// Controller-level filter → nếu route filter không bắt
@UseFilters(HttpExceptionFilter)
@Controller('users')
export class UsersController { ... }

// Global filter → fallback cuối cùng
app.useGlobalFilters(new AllExceptionsFilter());

// Filter đầu tiên @Catch() match exception → xử lý → DỪNG
```

---

## 6. Ví dụ thực tế — toàn bộ flow

```
POST /users/profile (cần auth, role: user)
Body: { email: "test", password: "123" }  ← data lỗi
```

```
Bước 1 — LoggerMiddleware
  → Log: "POST /users/profile"
  → Gọi next()

Bước 2 — AuthGuard (Global)
  → Đọc token từ header → verify JWT → hợp lệ
  → Gắn user vào req.user = { id: 1, role: 'user' }
  → Return true ✅

Bước 3 — RolesGuard (Route)
  → Đọc metadata: @Roles('user')
  → req.user.role === 'user' → đúng
  → Return true ✅

Bước 4 — TransformInterceptor (Global — phần TRƯỚC)
  → Ghi start time = Date.now()

Bước 5 — ValidationPipe (Global)
  → Validate body theo DTO
  → email: "test" → KHÔNG hợp lệ (thiếu @)
  → ❌ Throw BadRequestException("email must be an email")

Bước 6 — Handler
  → ❌ KHÔNG chạy (pipe đã throw lỗi)

Bước 7 — HttpExceptionFilter
  → Bắt BadRequestException
  → Trả về:
  {
    "success": false,
    "statusCode": 400,
    "message": "email must be an email",
    "path": "/users/profile"
  }
```

---

## 7. Đăng ký ở đâu?

```typescript
// ===== GLOBAL (áp dụng toàn bộ app) =====

// Cách 1: Trong main.ts — KHÔNG có Dependency Injection
app.useGlobalPipes(new ValidationPipe());
app.useGlobalFilters(new HttpExceptionFilter());
app.useGlobalInterceptors(new TransformInterceptor());
app.useGlobalGuards(new AuthGuard());  // ← không inject được JwtService!

// Cách 2: Trong AppModule — CÓ Dependency Injection (dùng cách này)
@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },           // inject JwtService ✅
    { provide: APP_PIPE, useClass: ValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})

// ===== CONTROLLER (tất cả routes trong controller) =====
@UseGuards(AuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('users')
export class UsersController {}

// ===== ROUTE (chỉ 1 endpoint) =====
@UseGuards(RolesGuard)
@Roles('admin')
@Delete(':id')
deleteUser(@Param('id') id: string) {}
```

> ⚠️ **`app.useGlobalGuards()` vs `APP_GUARD` trong module:**
> - `app.useGlobalGuards(new AuthGuard())` → tạo instance **ngoài DI container** → **không inject** được `JwtService`, `ConfigService`...
> - `{ provide: APP_GUARD, useClass: AuthGuard }` → NestJS tạo instance **trong DI container** → inject được mọi dependency. **Luôn dùng cách này cho production.**

---

## 8. Câu hỏi phỏng vấn

### Câu hỏi cơ bản

| Câu hỏi | Trả lời |
|---|---|
| Thứ tự lifecycle? | Middleware → Guard → Interceptor (trước) → Pipe → Handler → Interceptor (sau). Exception ở bất kỳ đâu → Exception Filter |
| Middleware khác Guard thế nào? | Middleware: chạy ở tầng HTTP, có `req/res/next`, **không biết** handler nào sẽ chạy. Guard: chạy ở tầng NestJS, có `ExecutionContext`, **biết đầy đủ** controller/handler/metadata |
| Tại sao không chỉ dùng Middleware? | Middleware "ngốc" — không biết context. NestJS tách trách nhiệm: Guard cho xác thực/phân quyền, Pipe cho validate data, Interceptor cho transform, Filter cho xử lý lỗi |

### Câu hỏi nâng cao

| Câu hỏi | Trả lời |
|---|---|
| Guard khác Interceptor? | Guard chặn **trước** handler (trả true/false). Interceptor bọc **cả trước lẫn sau** handler (dùng RxJS Observable), có thể transform response |
| Pipe khác Interceptor? | Pipe xử lý **data đầu vào** (arguments). Interceptor xử lý **cả request lẫn response**. Pipe throw → 400. Interceptor có thể catch/transform exception |
| Interceptor post chạy ngược? | Giống ngăn xếp — Global vào trước nhưng response đi ra sau cùng. Route → Controller → Global |
| `useGlobalGuards` vs `APP_GUARD`? | `useGlobal`: không có DI, tạo instance thủ công. `APP_GUARD`: có DI, inject dependencies được |
| Filter match thế nào? | Filter đầu tiên có `@Catch()` khớp exception type sẽ xử lý. Route → Controller → Global. Match 1 cái → dừng |
| Pipe parameter chạy thứ tự nào? | Từ param **cuối** → param **đầu** |

### Câu hỏi tình huống

**Hỏi: Cho ví dụ tại sao Guard phải chạy trước Pipe?**

Trả lời: Guard kiểm tra JWT và gắn `user` vào request. Pipe validate DTO. Nếu Pipe chạy trước Guard → request chưa xác thực mà đã tốn resource validate data vô nghĩa. Guard chạy trước → chặn sớm request không hợp lệ → tiết kiệm tài nguyên.

**Hỏi: Khi nào dùng Middleware thay vì Guard?**

Trả lời: Khi logic không cần biết NestJS context — ví dụ: logging mọi request (không cần biết route nào), parse JWT từ header (chỉ decode, chưa phân quyền), rate limiting toàn app (chỉ đếm request/IP). Những thứ này không cần biết handler, metadata, hay decorator.
