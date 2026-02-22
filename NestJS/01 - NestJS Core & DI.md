# NestJS — Kiến Trúc Cốt Lõi & Dependency Injection

> **Trọng tâm phỏng vấn** — Nếu apply vị trí NestJS, kiến trúc, DI và Module system sẽ được hỏi gần như chắc chắn. Tài liệu này giải thích chi tiết từng khái niệm dựa trên NestJS official docs.
>
> Tham khảo: [NestJS Official Docs](https://docs.nestjs.com), [NestJS Source Code](https://github.com/nestjs/nest)

---

## Mục lục

1. [NestJS là gì?](#1-nestjs-là-gì)
2. [Kiến trúc tổng quan — Các thành phần cốt lõi](#2-kiến-trúc-tổng-quan)
3. [Module — Đơn vị tổ chức code](#3-module--đơn-vị-tổ-chức-code)
4. [Controller — Xử lý yêu cầu HTTP](#4-controller--xử-lý-yêu-cầu-http)
5. [Provider & Service — Xử lý nghiệp vụ](#5-provider--service--xử-lý-nghiệp-vụ)
6. [Inversion of Control (IoC) — Đảo ngược quyền kiểm soát](#6-inversion-of-control-ioc)
7. [Dependency Injection (DI) — Cơ chế truyền phụ thuộc](#7-dependency-injection-di)
8. [Hệ thống Module chi tiết](#8-hệ-thống-module-chi-tiết)
9. [Các loại Provider nâng cao](#9-các-loại-provider-nâng-cao)
10. [Injection Scopes — Vòng đời của provider](#10-injection-scopes--vòng-đời-của-provider)
11. [Lifecycle Hooks — Các hook vòng đời](#11-lifecycle-hooks)
12. [Circular Dependency — Phụ thuộc vòng](#12-circular-dependency--phụ-thuộc-vòng)
13. [Câu hỏi phỏng vấn thường gặp](#13-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. NestJS là gì?

## Định nghĩa từ tài liệu chính thức

> *Nest (NestJS) là framework xây dựng ứng dụng phía server với Node.js, hiệu quả và dễ mở rộng. Nó sử dụng JavaScript tiến bộ, được xây dựng bằng TypeScript (nhưng vẫn hỗ trợ JavaScript thuần), và kết hợp các yếu tố của OOP (lập trình hướng đối tượng), FP (lập trình hàm) và FRP (lập trình phản ứng hàm).*

Nói đơn giản: NestJS là **framework** (khung ứng dụng) giúp bạn xây dựng phần backend của website hoặc API server. Nó chạy trên nền Node.js, viết bằng TypeScript, và cung cấp sẵn **cấu trúc rõ ràng** cho dự án.

## Tại sao cần NestJS? — So sánh với Express

Express (và Fastify) là **thư viện HTTP** — chúng giúp bạn nhận request và trả response, nhưng **không quy định** cách tổ chức code. Dự án nhỏ thì ổn, nhưng khi lớn lên:

```
Dự án Express lớn (không có cấu trúc):
├── routes/auth.js         ← 500 dòng, trộn lẫn logic, validation, DB query
├── routes/users.js        ← 800 dòng, copy-paste từ auth.js
├── routes/orders.js       ← import trực tiếp file khác, coupling chặt
├── middleware/auth.js      ← không biết dùng ở đâu
├── helpers/...             ← ai cũng import, không ai quản lý
└── Không ai biết bắt đầu đọc từ đâu
```

NestJS giải quyết vấn đề này bằng cách đặt ra **quy tắc tổ chức**:

| Vấn đề với Express thuần | NestJS giải quyết thế nào |
|---|---|
| Không có cấu trúc chuẩn | Module system tổ chức code thành từng nhóm rõ ràng |
| Không biết logic nằm ở đâu | Controller xử lý request, Service xử lý nghiệp vụ — tách bạch |
| Quản lý dependencies khó | DI Container tự động tạo và truyền dependencies |
| Validation, auth, logging rời rạc | Pipes, Guards, Interceptors, Filters — hệ thống có sẵn |
| Test khó vì coupling chặt | DI cho phép thay thế dependencies bằng mock dễ dàng |

**Bên dưới**, NestJS vẫn dùng Express (hoặc Fastify) làm nền tảng HTTP. Nó không thay thế Express — nó **bọc bên ngoài** Express và thêm kiến trúc cho bạn.

## Triết lý thiết kế

NestJS lấy cảm hứng rất nhiều từ **Angular** (framework frontend). Nếu bạn đã biết Angular, bạn sẽ thấy quen thuộc:

- **Decorator** (`@Module`, `@Controller`, `@Injectable`) để khai báo
- **Module** để tổ chức code
- **DI Container** để quản lý dependencies
- **TypeScript** là ngôn ngữ chính

---

# 2. Kiến trúc tổng quan

## Sơ đồ các thành phần

```
┌─────────────────────── Ứng dụng NestJS ────────────────────────┐
│                                                                  │
│  ┌── AppModule (Module gốc) ───────────────────────────────┐   │
│  │                                                          │   │
│  │  ┌── UsersModule ────────┐  ┌── AuthModule ───────────┐ │   │
│  │  │  UsersController      │  │  AuthController         │ │   │
│  │  │  UsersService         │  │  AuthService             │ │   │
│  │  │  UsersRepository      │◄─│  imports: [UsersModule]  │ │   │
│  │  │  exports: [UsersService]│ │  AuthGuard              │ │   │
│  │  └───────────────────────┘  └──────────────────────────┘ │   │
│  │                                                          │   │
│  │  ┌── SharedModule ───────┐                               │   │
│  │  │  @Global()            │ ← Có thể dùng ở mọi nơi     │   │
│  │  │  LoggerService        │                               │   │
│  │  │  ConfigService        │                               │   │
│  │  └───────────────────────┘                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Ba thành phần cốt lõi

NestJS xoay quanh 3 khái niệm chính:

| Thành phần | Vai trò | Ví dụ |
|---|---|---|
| **Module** | Hộp chứa — gom nhóm các thành phần liên quan | `UsersModule` chứa mọi thứ liên quan đến user |
| **Controller** | Người nhận — xử lý request HTTP, trả response | `UsersController` nhận `GET /users`, `POST /users` |
| **Provider** | Người làm — xử lý logic nghiệp vụ | `UsersService` chứa logic tạo user, tìm user |

Mỗi thành phần được đánh dấu bằng **decorator** (dấu `@` ở trên class):

```typescript
@Module({...})       // Đánh dấu class là Module
@Controller('users') // Đánh dấu class là Controller, xử lý route /users
@Injectable()        // Đánh dấu class là Provider, có thể được inject
```

---

# 3. Module — Đơn vị tổ chức code

## Module là gì?

Theo tài liệu NestJS:

> *Mỗi ứng dụng có ít nhất một module — module gốc (root module). Module gốc là điểm bắt đầu mà NestJS dùng để xây dựng đồ thị ứng dụng (application graph) — cấu trúc dữ liệu nội bộ mà NestJS sử dụng để phân giải các quan hệ và phụ thuộc giữa module và provider.*

Nói dễ hiểu: **Module là hộp chứa** — nó gom nhóm controller, service, và các thành phần liên quan lại với nhau. Mỗi tính năng (feature) của ứng dụng nên có module riêng.

```
Ứng dụng E-commerce:
├── AppModule (gốc)
│   ├── UsersModule      → quản lý user
│   ├── AuthModule       → xác thực, đăng nhập
│   ├── ProductsModule   → quản lý sản phẩm
│   ├── OrdersModule     → quản lý đơn hàng
│   └── CoreModule       → database, mail, config (hạ tầng chung)
```

## Khai báo Module

Module được tạo bằng decorator `@Module()` với 4 thuộc tính:

```typescript
@Module({
  imports: [DatabaseModule],          // ① Import module khác để dùng provider của chúng
  controllers: [UsersController],     // ② Các controller thuộc module này
  providers: [UsersService],          // ③ Các provider (service) — chỉ dùng được TRONG module
  exports: [UsersService],            // ④ Cho phép module khác dùng provider này
})
export class UsersModule {}
```

Giải thích từng thuộc tính:

| Thuộc tính | Ý nghĩa | Ví von |
|---|---|---|
| `imports` | Kéo module khác vào để dùng | Mời bạn vào nhà để dùng đồ của bạn |
| `controllers` | Đăng ký controller xử lý request | Cửa vào nhà nhận khách |
| `providers` | Đăng ký service/repository xử lý logic | Công nhân bên trong nhà làm việc |
| `exports` | Cho phép module khác dùng provider của mình | Cho hàng xóm mượn đồ |

## Quy tắc quan trọng nhất: Đóng gói (Encapsulation)

**Provider mặc định là riêng tư.** Module bên ngoài **không thể dùng** provider của module khác trừ khi provider đó nằm trong `exports`.

```typescript
// Module A xuất dịch vụ ServiceA ra ngoài
@Module({ providers: [ServiceA], exports: [ServiceA] })
class ModuleA {}

// Module B nhập ModuleA → có thể dùng ServiceA
@Module({ imports: [ModuleA], providers: [ServiceB] })
class ModuleB {}

// ServiceB inject ServiceA → ✅ Được vì ModuleA đã export ServiceA
@Injectable()
class ServiceB {
  constructor(private readonly serviceA: ServiceA) {}
}
```

Nếu `ModuleA` **không export** `ServiceA` → `ServiceB` inject sẽ **bị lỗi**:

```
Nest can't resolve dependencies of the ServiceB (?).
Please make sure that the argument ServiceA is available in the ModuleBModule context.
```

---

# 4. Controller — Xử lý yêu cầu HTTP

## Controller là gì?

Theo tài liệu NestJS:

> *Controller chịu trách nhiệm nhận các yêu cầu (request) đến và trả về phản hồi (response) cho phía client.*

Controller là **tầng tiếp nhận** — nó nhận request HTTP, gọi service xử lý, rồi trả kết quả:

```
Client → HTTP Request → Controller → Service → Database
                                  ↓
Client ← HTTP Response ← Controller
```

## Cách khai báo Controller

```typescript
@Controller('users')  // Decorator — xử lý các route bắt đầu bằng /users
export class UsersController {

  // Inject UsersService qua constructor (DI — giải thích chi tiết ở mục 7)
  constructor(private readonly usersService: UsersService) {}

  @Get()                    // GET /users → lấy danh sách user
  findAll() {
    return this.usersService.findAll()
  }

  @Get(':id')               // GET /users/123 → lấy user theo id
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id)
  }

  @Post()                   // POST /users → tạo user mới
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }
}
```

**Nguyên tắc:** Controller **không chứa logic nghiệp vụ**. Nó chỉ:
1. Nhận request (lấy data từ body, params, query)
2. Gọi service xử lý
3. Trả response

Logic phức tạp (validation dữ liệu, truy vấn database, gửi email...) để trong **Service**.

---

# 5. Provider & Service — Xử lý nghiệp vụ

## Provider là gì?

Theo tài liệu NestJS:

> *Provider là khái niệm cơ bản trong Nest. Nhiều class cơ bản của Nest có thể được coi là provider — services, repositories, factories, helpers, v.v. Ý tưởng chính của provider là nó có thể được **inject** (tiêm) như một dependency.*

Nói cách khác: **Provider là bất kỳ class nào mà NestJS có thể quản lý và truyền vào class khác.** Service chỉ là một loại provider phổ biến nhất.

```
Provider (khái niệm chung)
├── Service         → xử lý logic nghiệp vụ (AuthService, UsersService)
├── Repository      → tương tác với database (UsersRepository)
├── Factory         → tạo objects phức tạp
├── Helper/Utility  → chức năng hỗ trợ (HashingService)
├── Guard           → kiểm tra quyền truy cập
├── Pipe            → chuyển đổi/xác thực dữ liệu
├── Interceptor     → can thiệp trước/sau xử lý request
└── Filter          → xử lý lỗi/ngoại lệ
```

## Khai báo Provider — Decorator `@Injectable()`

Để một class trở thành provider, ta dùng decorator `@Injectable()`:

```typescript
@Injectable()  // ← Đánh dấu: "class này có thể được NestJS quản lý và inject"
export class UsersService {

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany()
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async create(data: CreateUserDto) {
    return this.prisma.user.create({ data })
  }
}
```

## Đăng ký Provider vào Module

Provider **phải được đăng ký** trong mảng `providers` của module. Nếu không đăng ký, NestJS không biết nó tồn tại:

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],    // ← Đăng ký UsersService vào module
  exports: [UsersService],      // ← Cho module khác dùng (nếu cần)
})
export class UsersModule {}
```

**Lưu ý quan trọng:** NestJS **không quét (scan) toàn bộ thư mục** để tìm provider (khác với một số framework Java). Nó chỉ đọc metadata từ cây module (module tree) bắt đầu từ module gốc. Provider nào không nằm trong `providers[]` của bất kỳ module nào → NestJS không biết nó tồn tại.

```typescript
// File tồn tại nhưng KHÔNG ĐĂNG KÝ vào module nào
@Injectable()
class OrphanService {}  // NestJS hoàn toàn không biết class này
```

## Vai trò của `@Injectable()` — Tại sao bắt buộc?

`@Injectable()` có 2 vai trò:

1. **Đánh dấu** cho NestJS biết class này là provider
2. **Kích hoạt TypeScript emit metadata** — khi class có decorator, TypeScript tự động ghi thông tin kiểu dữ liệu của constructor params. NestJS đọc metadata này để biết cần inject gì.

Không có `@Injectable()` → TypeScript không ghi metadata → NestJS không biết constructor cần inject gì → **lỗi `UnknownDependenciesException`**.

---

# 6. Inversion of Control (IoC)

## Vấn đề gốc rễ: Tại sao cần IoC?

Hãy tưởng tượng bạn viết `AuthService` cho ứng dụng e-commerce. AuthService cần gửi email xác thực, nên nó cần dùng `MailService`:

```typescript
// ❌ Cách truyền thống — class tự tạo dependency
class AuthService {
  private mailService: MailService

  constructor() {
    // AuthService phải TỰ TẠO toàn bộ chuỗi phụ thuộc:
    const apiKey = process.env.RESEND_API_KEY!
    const resendClient = new Resend(apiKey)
    this.mailService = new MailService(resendClient)
  }
}
```

Code này chạy đúng, nhưng tạo ra **3 vấn đề nghiêm trọng**:

### Vấn đề 1: Gắn chặt (Tight Coupling)

AuthService là class xử lý **xác thực** — đăng ký, đăng nhập, refresh token. Nhưng trong constructor, nó phải biết:
- API key của Resend lấy từ biến môi trường nào
- Cách tạo Resend client
- Cách tạo MailService

Đây là **kiến thức không liên quan** đến xác thực. Ngày mai đổi từ Resend sang SendGrid → AuthService phải sửa. `UsersService` cũng gửi mail? Cũng phải sửa. Một thay đổi hạ tầng ảnh hưởng N class không liên quan.

### Vấn đề 2: Khó test

```typescript
describe('AuthService', () => {
  it('nên tạo user và gửi email xác thực', () => {
    const authService = new AuthService()
    // Constructor đã tạo THẬT Resend client, kết nối API thật
    // Không có cách nào truyền MailService giả vào
  })
})
```

Vì class tự `new` dependency trong constructor, bạn **không có cách truyền mock** vào.

### Vấn đề 3: Trùng lặp code

`UsersService` cũng cần mail? Copy toàn bộ đoạn khởi tạo. `OrdersService` cần mail? Copy lần nữa. 3 class, 3 bản copy cùng đoạn code. Sửa 1 chỗ phải sửa 3 chỗ.

### Gốc rễ

Một câu tóm gọn: **class đang tự chịu trách nhiệm tạo và quản lý dependency của mình.** IoC giải quyết chính xác vấn đề này.

## IoC — Đảo ngược quyền kiểm soát

**Inversion of Control** (Đảo ngược quyền kiểm soát) là **nguyên lý** giải quyết vấn đề trên: **đảo ngược quyền kiểm soát** — thay vì class tự quyết định tạo dependency khi nào và thế nào, một **thành phần bên ngoài** (framework) nhận toàn bộ trách nhiệm đó.

```typescript
// TRƯỚC IoC — class TỰ KIỂM SOÁT dependency
class AuthService {
  constructor() {
    this.mailService = new MailService(new Resend(...))
    // AuthService QUYẾT ĐỊNH: tạo gì, tạo khi nào, tạo thế nào
  }
}

// SAU IoC — FRAMEWORK KIỂM SOÁT dependency
@Injectable()
class AuthService {
  constructor(private readonly mailService: MailService) {}
  // AuthService CHỈ KHAI BÁO: "tôi cần MailService"
  // Framework QUYẾT ĐỊNH: tạo MailService thế nào, khi nào, inject vào đâu
}
```

**"Đảo ngược" cụ thể là gì?**

| Trước IoC | Sau IoC |
|---|---|
| Class **tự tạo** dependency | Framework **tạo hộ** dependency |
| Class **biết** cách tạo dependency | Class **không biết** — chỉ biết cần gì |
| Class **quyết định** khi nào tạo | Framework **quyết định** thời điểm tạo |
| Class **quản lý** vòng đời của dependency | Framework **quản lý** toàn bộ vòng đời |

Quyền tạo, quản lý, và cung cấp object đã **chuyển từ code của bạn sang framework**. Bạn mất quyền kiểm soát (và đó là điều tốt — vì bạn không nên kiểm soát cái này).

---

# 7. Dependency Injection (DI)

## DI là gì?

IoC là **nguyên lý trừu tượng** — "framework kiểm soát vòng đời." Nhưng nguyên lý cần **kỹ thuật cụ thể** để thực hiện. Kỹ thuật phổ biến nhất là **Dependency Injection** (Tiêm phụ thuộc).

**DI** = framework nhìn vào constructor params → xác định class cần gì → tìm và tạo từng dependency → **truyền (inject) vào constructor** khi tạo instance.

```typescript
@Injectable()
class AuthService {
  // NestJS nhìn constructor → thấy cần MailService và HashingService
  // → tìm 2 provider tương ứng → gọi new AuthService(mailInstance, hashingInstance)
  constructor(
    private readonly mailService: MailService,
    private readonly hashingService: HashingService,
  ) {}
}
```

## Constructor Injection — Cách NestJS dùng

NestJS dùng **Constructor Injection** (tiêm qua constructor) làm phương pháp chính, vì 3 ưu điểm:

**1. Bất biến (Immutable):**

Dependency gán **1 lần duy nhất** trong constructor, sau đó `readonly` — không ai thay đổi giữa chừng:

```typescript
constructor(private readonly mailService: MailService) {}
// readonly = TypeScript báo lỗi nếu ai viết: this.mailService = null
```

**2. Tường minh (Explicit):**

Nhìn constructor là biết **ngay** class phụ thuộc vào những gì — không cần đọc toàn bộ code:

```typescript
// Nhìn đây biết: AuthService cần 4 thứ để hoạt động
constructor(
  private readonly usersRepo: UsersRepository,
  private readonly mailService: MailService,
  private readonly hashingService: HashingService,
  private readonly tokenService: TokenService,
) {}
```

**3. Dễ test:**

Muốn unit test? Truyền mock vào constructor, không cần framework:

```typescript
describe('AuthService', () => {
  it('nên gửi email xác thực khi đăng ký', async () => {
    const mockMail = { sendVerificationEmail: jest.fn() }
    const authService = new AuthService(mockRepo, mockMail, mockHashing, mockToken)
    await authService.register('test@example.com', 'password')
    expect(mockMail.sendVerificationEmail).toHaveBeenCalledWith('test@example.com')
  })
})
```

## DI Container — "Người quản gia" của ứng dụng

NestJS có một **DI Container** (bộ chứa phụ thuộc) quản lý tất cả provider. Hãy tưởng tượng Container như người quản gia:

1. **Đăng ký**: Khi app khởi động, NestJS đọc tất cả `@Module()` → biết có bao nhiêu provider
2. **Phân giải (Resolve)**: NestJS đọc constructor metadata → biết ai cần ai → tính thứ tự tạo
3. **Tạo instance**: NestJS tạo instance theo thứ tự đúng (dependency trước, class chính sau)
4. **Tiêm (Inject)**: NestJS truyền instance đã tạo vào constructor

```
Ví dụ: AuthService cần MailService, MailService cần ConfigService

Container xử lý:
1. Tạo ConfigService (không phụ thuộc gì)
2. Tạo MailService(configService)         ← inject ConfigService
3. Tạo AuthService(mailService)           ← inject MailService
```

**Lưu ý:**
- Tất cả provider Singleton (mặc định) được tạo **khi app khởi động** — trước khi nhận bất kỳ request nào
- Provider KHÔNG được tạo theo kiểu "lười" (lazy) — trừ khi bạn dùng `LazyModuleLoader` (tính năng nâng cao)

---

# 8. Hệ thống Module chi tiết

## Module chia sẻ (Shared Module)

Mặc định provider là riêng tư. Để module khác dùng được, phải **export**:

```typescript
@Module({
  providers: [
    ResendClient,      // riêng tư — module ngoài không nhìn thấy
    MailAdapter,       // riêng tư
    MailService,       // riêng tư — nhưng...
  ],
  exports: [MailService],  // ...được export → module ngoài inject được
})
export class MailModule {}
```

Khi `AuthModule` imports `MailModule`:
- `inject MailService` → ✅ Được (đã export)
- `inject ResendClient` → ❌ Lỗi (không export, là detail nội bộ)
- `inject MailAdapter` → ❌ Lỗi (không export)

**Tại sao đóng gói quan trọng?**

Giống `public`/`private` trong OOP nhưng ở **cấp module**. Nếu `AuthModule` inject trực tiếp `ResendClient` → khi đổi Resend sang SendGrid, phải sửa `AuthModule`. Nhưng nếu chỉ inject `MailService` → đổi implementation nội bộ `MailModule` hoàn toàn không ảnh hưởng bên ngoài.

## Xuất lại module (Re-export)

Bạn có thể xuất lại **cả một module** thay vì từng provider:

```typescript
@Module({
  imports: [MailModule, DatabaseModule, HashingModule],
  exports: [MailModule, DatabaseModule, HashingModule],  // xuất lại tất cả
})
export class CoreModule {}

// Giờ AuthModule chỉ cần import CoreModule thay vì 3 module riêng lẻ
@Module({
  imports: [CoreModule],  // thay vì [MailModule, DatabaseModule, HashingModule]
})
export class AuthModule {}
```

**Khi nào dùng:** Tạo "module ô" (umbrella module) gộp nhiều module hạ tầng. Feature module chỉ cần import 1 module thay vì N.

## Module toàn cục (@Global)

```typescript
@Global()
@Module({
  providers: [ConfigService, LoggerService],
  exports: [ConfigService, LoggerService],
})
export class CoreModule {}
```

Module đánh dấu `@Global()` → provider của nó **tự động có sẵn** ở mọi nơi mà không cần import. Tương đương như mọi module đều import nó.

**Hạn chế dùng `@Global()`:**

| Nên dùng | Không nên dùng |
|---|---|
| `ConfigModule` — hầu hết module cần config | `MailModule` — chỉ vài feature gửi mail |
| `LoggerModule` — mọi nơi cần log | `HashingModule` — chỉ auth cần hash |
| `DatabaseModule` — đa số feature cần DB | `PaymentModule` — chỉ orders cần |

Lý do hạn chế: `@Global()` tạo **dependency ẩn** — nhìn module không biết nó phụ thuộc gì vì dependency đến từ global. Debug khó, test khó, refactor rủi ro.

## Module động (Dynamic Module)

Module thường (static) cố định mọi thứ khi viết code. Nhưng nhiều module cần **cấu hình từ bên ngoài** — ví dụ `DatabaseModule` cần URL kết nối khác nhau giữa các môi trường (dev, staging, production).

**Module động** có static method trả về `DynamicModule` — metadata được quyết định **khi chạy** dựa trên cấu hình:

```typescript
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        { provide: 'DATABASE_OPTIONS', useValue: options },
        PrismaService,
      ],
      exports: [PrismaService],
    }
  }
}

// Sử dụng — truyền config cụ thể khi import
@Module({
  imports: [
    DatabaseModule.forRoot({ url: 'postgres://localhost:5432/ecommerce' }),
  ],
})
export class AppModule {}
```

### Quy ước đặt tên

Đây là **quy ước** (không bắt buộc) được dùng rộng rãi:

| Tên method | Ý nghĩa | Đặc điểm |
|---|---|---|
| `forRoot()` | Cấu hình toàn ứng dụng | Import **1 lần** ở module gốc, thường kèm `global: true` |
| `forFeature()` | Cấu hình riêng cho từng feature | Import **nhiều lần** ở các feature module |
| `forRootAsync()` | Như `forRoot()` nhưng bất đồng bộ | Khi config cần inject `ConfigService` |

```typescript
// forRoot — import 1 lần ở AppModule
TypeOrmModule.forRoot({ type: 'postgres', host: 'localhost' })

// forFeature — import nhiều lần ở các feature module
TypeOrmModule.forFeature([User])   // trong UsersModule
TypeOrmModule.forFeature([Order])  // trong OrdersModule

// forRootAsync — config bất đồng bộ, inject ConfigService
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get('DB_HOST'),
  }),
})
```

---

# 9. Các loại Provider nâng cao

## Tổng quan 4 loại Custom Provider

Khi viết `providers: [UsersService]`, đây là viết tắt của:
```typescript
providers: [{ provide: UsersService, useClass: UsersService }]
```

NestJS hỗ trợ **4 cách** đăng ký provider:

## useClass — Thay thế implementation

```typescript
@Module({
  providers: [{
    provide: DatabaseService,           // Token (key để tìm)
    useClass: PostgresDatabaseService,  // Implementation thực tế
  }],
})
// Khi inject DatabaseService → nhận PostgresDatabaseService instance
```

**Khi nào dùng:** Đổi implementation tùy môi trường:

```typescript
providers: [{
  provide: MailService,
  useClass: process.env.NODE_ENV === 'test'
    ? MockMailService    // class khác, nhưng cùng interface
    : MailService,
}]
```

## useValue — Truyền giá trị cụ thể

```typescript
@Module({
  providers: [
    { provide: 'API_KEY', useValue: 'my-secret-key' },
    { provide: 'CONFIG', useValue: { port: 3000, host: 'localhost' } },
  ],
})

// Inject — phải dùng @Inject() vì token là string
@Injectable()
class ApiService {
  constructor(@Inject('API_KEY') private apiKey: string) {}
}
```

**Khi nào dùng:** Hằng số, cấu hình, mock trong test, instance thư viện bên ngoài.

## useFactory — Tạo provider bằng hàm

```typescript
@Module({
  providers: [{
    provide: 'REDIS_CLIENT',
    useFactory: async (configService: ConfigService) => {
      const client = new Redis({
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
      })
      await client.ping()  // kiểm tra kết nối
      return client
    },
    inject: [ConfigService],  // khai báo dependency cho factory
  }],
})
```

**Tại sao `useFactory` cần `inject[]` riêng?**

TypeScript chỉ ghi metadata kiểu cho **constructor của class có decorator**. `useFactory` là **hàm** — TypeScript không ghi metadata cho tham số hàm. NestJS không có cách biết factory cần gì → phải khai báo tường minh qua `inject[]`.

**Khi nào dùng:** Logic phức tạp, khởi tạo bất đồng bộ, tạo có điều kiện.

## useExisting — Tên gọi khác (Alias)

```typescript
@Module({
  providers: [
    MailService,
    { provide: 'LEGACY_MAILER', useExisting: MailService },
  ],
})
// Inject 'LEGACY_MAILER' → nhận CÙNG instance MailService
```

**Khác biệt với useClass:**

```typescript
// useClass → TẠO instance MỚI
{ provide: 'MAIL_A', useClass: MailService }   // instance #1
{ provide: 'MAIL_B', useClass: MailService }   // instance #2 (KHÁC!)

// useExisting → CHỈ TẠO ALIAS, cùng instance
{ provide: 'MAIL_A', useExisting: MailService } // cùng instance
{ provide: 'MAIL_B', useExisting: MailService } // cùng instance
```

**Khi nào dùng:** Đổi tên token, migration, nhiều tên cho cùng 1 service.

## Injection Token — "Chìa khóa" để tìm provider

Mỗi provider cần **key duy nhất** (token) để Container lưu và tìm lại:

```typescript
// 1. Token kiểu class (phổ biến nhất) — không cần @Inject()
constructor(private userService: UserService) {}

// 2. Token kiểu string — PHẢI dùng @Inject()
constructor(@Inject('API_KEY') private key: string) {}

// 3. Token kiểu Symbol (đảm bảo duy nhất, tránh trùng tên)
const DB_TOKEN = Symbol('DATABASE')
constructor(@Inject(DB_TOKEN) private db: Database) {}
```

**Khi nào BẮT BUỘC dùng `@Inject()`?**

| Tình huống | TypeScript ghi metadata | Cần @Inject()? |
|---|---|---|
| `private mail: MailService` | `MailService` (class) | Không — class reference đủ |
| `private apiKey: string` | `String` (quá chung) | **Có** — NestJS không biết inject string nào |
| `private mail: IMailService` | `Object` (interface bị xóa khi compile) | **Có** — interface không tồn tại ở runtime |
| `private count: number` | `Number` (quá chung) | **Có** |

---

# 10. Injection Scopes — Vòng đời của Provider

## 3 loại Scope

NestJS hỗ trợ 3 scope quy định **khi nào** instance được tạo, **bao lâu** nó tồn tại:

```typescript
@Injectable({ scope: Scope.DEFAULT })    // Singleton — mặc định
@Injectable({ scope: Scope.REQUEST })    // Mỗi request 1 instance
@Injectable({ scope: Scope.TRANSIENT })  // Mỗi lần inject 1 instance mới
```

| Scope | Số instance | Tạo khi nào | Tồn tại bao lâu |
|---|---|---|---|
| **DEFAULT** (Singleton) | 1 cho toàn ứng dụng | Khi app khởi động | Suốt vòng đời ứng dụng |
| **REQUEST** | 1 mới mỗi request | Khi request đến | Đến khi request kết thúc |
| **TRANSIENT** | 1 mới mỗi lần inject | Mỗi lần inject | Theo vòng đời consumer |

## DEFAULT (Singleton) — Mặc định

**Chỉ 1 instance duy nhất** cho toàn ứng dụng. Tạo khi khởi động, tồn tại mãi mãi:

```
Khởi động → Container tạo 1 instance PrismaService

AuthRepository inject PrismaService  → instance #1
UsersRepository inject PrismaService → CÙNG instance #1
Request 1 đến → AuthService dùng    → CÙNG instance #1
Request 10000 → vẫn dùng            → CÙNG instance #1
```

**Tại sao mặc định là Singleton?** Hầu hết service là **stateless** (không trạng thái): nhận input → xử lý → trả output. Chúng không lưu giữ data riêng cho từng request. Ví dụ: `PrismaService` quản lý **connection pool** — 1 pool phục vụ hàng nghìn request. Tạo mới mỗi request = mở kết nối mới = nhanh chóng hết giới hạn kết nối.

## REQUEST — Mỗi request 1 instance

**Instance mới mỗi HTTP request**, cách ly hoàn toàn giữa các request:

```typescript
@Injectable({ scope: Scope.REQUEST })
class TenantService {
  constructor(@Inject(REQUEST) private request: Request) {
    // Truy cập request object hiện tại
    this.tenantId = request.headers['x-tenant-id']
  }
}
```

**Khi nào dùng:**

| Trường hợp | Giải thích |
|---|---|
| Multi-tenancy | Mỗi request từ tenant khác nhau, service cần biết đang phục vụ tenant nào |
| Log theo request | Logger kèm metadata request: user ID, IP, trace ID |
| Transaction theo request | Database transaction scope theo request |

## TRANSIENT — Mỗi lần inject 1 instance mới

**Instance mới mỗi lần inject** — kể cả trong cùng request, mỗi consumer nhận instance riêng:

```
AuthService inject Logger  → Logger instance #1
UsersService inject Logger → Logger instance #2 (KHÁC!)
MailService inject Logger  → Logger instance #3 (KHÁC!)
```

**Khi nào dùng:** Logger có prefix riêng mỗi service, utility giữ state không nên chia sẻ.

## Scope Bubbling — Hiệu ứng "nổi bọt"

⚠️ **Cực kỳ quan trọng:** Khi provider A (Singleton) inject provider B (REQUEST scope) → NestJS **buộc nâng** A lên REQUEST scope.

```
Chuỗi phụ thuộc:
AuthController → AuthService → MailService → Logger (REQUEST scope)

Sau Scope Bubbling:
Logger         = REQUEST (khai báo)
MailService    = REQUEST (nâng lên — vì phụ thuộc Logger)
AuthService    = REQUEST (nâng lên — vì phụ thuộc MailService)
AuthController = REQUEST (nâng lên — vì phụ thuộc AuthService)
```

**Quy tắc:** `Scope = MAX(scope bản thân, scope của TẤT CẢ dependency)`

**Hậu quả:** 1 REQUEST-scoped Logger nhỏ → toàn bộ chuỗi 10 provider tạo mới mỗi request → hiệu suất giảm. **Lời khuyên:** Hạn chế REQUEST scope, đặt ở cuối chuỗi, cân nhắc dùng Durable Providers cho multi-tenancy.

---

# 11. Lifecycle Hooks

NestJS cung cấp các hook (móc nối) cho phép provider/controller tham gia vào quá trình khởi tạo và tắt ứng dụng:

## Các hook khởi tạo (Startup)

```typescript
@Injectable()
export class PrismaService implements OnModuleInit, OnApplicationBootstrap {
  private client: PrismaClient

  async onModuleInit() {
    // Chạy sau khi dependency của module đã sẵn sàng
    this.client = new PrismaClient()
    await this.client.$connect()
  }

  onApplicationBootstrap() {
    // Chạy sau khi TẤT CẢ module đã khởi tạo xong
  }
}
```

## Các hook tắt ứng dụng (Shutdown)

```typescript
@Injectable()
export class PrismaService implements OnModuleDestroy {
  async onModuleDestroy() {
    // Dọn dẹp trước khi module bị hủy
    await this.client.$disconnect()
  }
}
```

## Bảng tổng hợp

| Hook | Khi nào chạy | Thứ tự |
|---|---|---|
| `onModuleInit()` | Sau khi dependency đã sẵn sàng | Module xa gốc chạy trước |
| `onApplicationBootstrap()` | Sau khi TẤT CẢ module init | Module xa gốc chạy trước |
| `onModuleDestroy()` | Trước khi module dọn dẹp | Module gần gốc chạy trước |
| `beforeApplicationShutdown()` | Trước khi đóng kết nối server | Module gần gốc chạy trước |
| `onApplicationShutdown()` | Sau khi dọn dẹp xong | Module gần gốc chạy trước |

**Thứ tự startup vs shutdown ngược nhau:** Module nền tảng (Database) khởi tạo **trước** để module tính năng (Auth) dùng. Khi tắt, module tính năng (Auth) dọn dẹp **trước**, rồi mới đóng database.

**Lưu ý:** Phải gọi `app.enableShutdownHooks()` để kích hoạt hook tắt ứng dụng:

```typescript
const app = await NestFactory.create(AppModule)
app.enableShutdownHooks()  // Bắt buộc — mặc định TẮT
await app.listen(3000)
```

---

# 12. Circular Dependency — Phụ thuộc vòng

## Vấn đề: Bế tắc "con gà — quả trứng"

```typescript
@Injectable()
class AuthService {
  constructor(private usersService: UsersService) {} // Cần UsersService
}

@Injectable()
class UsersService {
  constructor(private authService: AuthService) {}   // Cần AuthService
}
// → Lỗi: Circular dependency detected
```

Tạo ai trước? AuthService cần UsersService sẵn sàng, nhưng UsersService cần AuthService sẵn sàng → **bế tắc**.

## Giải pháp tạm: forwardRef

```typescript
@Injectable()
class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))  // "Tạo tôi trước, inject sau"
    private usersService: UsersService,
  ) {}
}

@Injectable()
class UsersService {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}
}
```

`forwardRef` nói với NestJS: "Đừng chờ dependency này sẵn sàng mới tạo tôi. Cứ tạo tôi trước — inject sau."

**Cơ chế bên trong:**
1. Tạo AuthService với usersService = undefined (tạm)
2. Tạo UsersService — inject AuthService (đã tồn tại từ bước 1) → thành công
3. Quay lại gán usersService = UsersService instance → cả hai hoàn tất

## Giải pháp đúng: Tái cấu trúc

`forwardRef` là **giải pháp tạm** — nó cho phép code chạy nhưng **không sửa** vấn đề thiết kế. Phụ thuộc vòng là **dấu hiệu** 2 class có trách nhiệm chồng chéo.

| Cách giải quyết | Làm thế nào |
|---|---|
| **Tách logic chung** | Tạo service thứ 3 chứa logic cả A lẫn B cần |
| **Dùng sự kiện** | A phát sự kiện → B lắng nghe. Không phụ thuộc biên dịch |
| **Xem lại ranh giới** | Có thể A và B nên gộp lại (nếu quá liên quan) hoặc tách khác (nếu trách nhiệm sai) |

---

# 13. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Ý trả lời |
|---|---|
| **DI là gì? Lợi ích?** | Kỹ thuật thực hiện IoC — container inject dependency thay vì class tự tạo. Lợi ích: kết nối lỏng, dễ test, tái sử dụng |
| **Module imports/exports hoạt động thế nào?** | Provider chỉ dùng trong module trừ khi exports. Module khác phải imports mới inject được |
| **4 loại custom provider?** | useClass (thay implementation), useValue (truyền hằng), useFactory (tạo động), useExisting (tên gọi khác) |
| **3 Injection Scope?** | DEFAULT (singleton), REQUEST (mỗi request), TRANSIENT (mỗi lần inject). REQUEST scope "nổi bọt" lên toàn chuỗi |
| **Phụ thuộc vòng?** | 2 provider inject lẫn nhau. Tạm: forwardRef(). Đúng: tái cấu trúc, tách service thứ 3 |
| **forRoot vs forFeature?** | forRoot: cấu hình toàn ứng dụng (1 lần). forFeature: cấu hình riêng cho từng feature module |
| **@Global() dùng khi nào?** | Provider cần dùng ở mọi nơi (Logger, Config). Không nên lạm dụng vì tạo dependency ẩn |
| **@Injectable() làm gì?** | Đánh dấu class là provider + kích hoạt TypeScript ghi metadata kiểu. Không có decorator → không có metadata → lỗi inject |
| **Scope Bubbling là gì?** | Singleton phụ thuộc REQUEST-scoped provider → bị nâng lên REQUEST. Toàn chuỗi phụ thuộc bị ảnh hưởng |
| **Lifecycle hooks chạy thứ tự nào?** | Khởi tạo: module xa gốc trước. Tắt: module gần gốc trước. Phải gọi `enableShutdownHooks()` |
| **Tại sao useFactory cần inject[]?** | TypeScript chỉ ghi metadata cho constructor class có decorator. useFactory là hàm — không có metadata → phải khai báo tường minh |
| **providers vs exports?** | providers = đăng ký nội bộ. exports = công khai cho bên ngoài. Provider không export = bên ngoài không nhìn thấy |
