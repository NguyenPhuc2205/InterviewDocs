# NestJS Dependency Injection — Deep Dive Toàn Tập (Part 1)

## Nền tảng & Cơ chế hoạt động

> Tài liệu giải phẫu hệ thống DI bên trong NestJS, dựa trên **source code thực tế**:
> - [NestJS Core — `packages/core/injector/`](https://github.com/nestjs/nest/tree/88b3ce7d/packages/core/injector)
> - [DeepWiki — NestJS DI System](https://deepwiki.com/nestjs/nest/3.1-dependency-injection-system)
> - [NestJS Official Docs](https://docs.nestjs.com/providers)

---

## MỤC LỤC PART 1

**Phần I — Nền tảng tư tưởng**

1. [IoC & DI — Bản chất, không phải định nghĩa](#1-ioc--di--bản-chất-không-phải-định-nghĩa)
2. [What NestJS DI is NOT — Đính chính hiểu lầm phổ biến](#2-what-nestjs-di-is-not)

**Phần II — Kiến trúc Container**

3. [NestContainer Architecture — 3 tầng quản lý](#3-nestcontainer-architecture--3-tầng-quản-lý)
4. [InstanceWrapper — Trái tim DI system](#4-instancewrapper--trái-tim-di-system)

**Phần III — Bootstrap Process**

5. [Bootstrap — 4 Phase từ code nguội đến app sẵn sàng](#5-bootstrap--4-phase)
6. [Dependency Resolution — 6 bước resolve chi tiết](#6-dependency-resolution--6-bước-resolve-chi-tiết)

**Phần IV — Provider System**

7. [Provider Types — 4 cách đăng ký provider](#7-provider-types--4-cách-đăng-ký-provider)
8. [Injection Tokens — Chìa khóa để Container tìm provider](#8-injection-tokens)

**Phần V — Module System**

9. [Module Encapsulation — providers vs exports vs @Global](#9-module-encapsulation)
10. [Dynamic Modules — forRoot / forFeature / forRootAsync](#10-dynamic-modules)

---

> Part 2 bao gồm: Injection Scopes, Scope Bubbling, Durable Providers, Circular Dependencies, forwardRef, Optional Dependencies, LazyModuleLoader, ModuleRef, Lifecycle Hooks, Request Pipeline & DI, Module Distance, Practical Examples, Common Myths, Interview Q&A (20+ câu).

---

# PHẦN I — NỀN TẢNG TƯ TƯỞNG

---

# 1. IoC & DI — Bản chất, không phải định nghĩa

## 1.1 Vấn đề gốc rễ: Tại sao cần DI?

Trước khi nói về DI, phải hiểu **vấn đề thực tế** mà nó giải quyết. Nếu không hiểu vấn đề, bạn sẽ chỉ thuộc lòng định nghĩa mà không biết tại sao nó tồn tại — và trong phỏng vấn, người ta nghe ra ngay.

Giả sử bạn đang viết `AuthService` cho một hệ thống e-commerce. AuthService cần gửi email xác thực, nên nó cần `MailService`. Cách viết truyền thống:

```typescript
class AuthService {
  private mailService: MailService

  constructor() {
    // AuthService phải TỰ TẠO toàn bộ dependency chain:
    const apiKey = process.env.RESEND_API_KEY!
    const resendClient = new Resend(apiKey)
    const resendAdapter = new ResendAdapter(resendClient)
    const mailAdapter = new MailAdapter(resendAdapter)
    this.mailService = new MailService(mailAdapter)
  }

  async register(email: string, password: string) {
    // ... tạo user
    await this.mailService.sendVerificationEmail(email)
  }
}
```

Nhìn qua thì code chạy đúng. Nhưng nó tạo ra **3 vấn đề nghiêm trọng** mà khi hệ thống lớn lên sẽ trở thành ác mộng:

### Vấn đề 1: Tight Coupling — "Biết quá nhiều"

AuthService là class xử lý **authentication** — đăng ký, đăng nhập, refresh token. Nhưng trong constructor, nó phải biết:
- Resend API key lấy từ environment variable nào
- Cách tạo Resend client
- Cách tạo ResendAdapter
- Cách tạo MailAdapter
- Cách tạo MailService

Đây là **kiến thức không liên quan** đến authentication. AuthService đang vi phạm **Single Responsibility Principle** — ngoài việc lo authentication, nó còn phải lo **quản lý lifecycle** của mail infrastructure.

**Hậu quả thực tế**: Ngày mai bạn đổi từ Resend sang SendGrid. AuthService phải sửa. `UsersService` cũng dùng mail? Cũng phải sửa. `OrdersService`? Cũng sửa. Một thay đổi infrastructure ảnh hưởng N classes không liên quan.

### Vấn đề 2: Khó test — "Không mock được"

Muốn unit test `register()` method mà **không gửi email thật**:

```typescript
// Bạn muốn test logic register, KHÔNG MUỐN gửi email
describe('AuthService.register', () => {
  it('should create user and send verification email', () => {
    const authService = new AuthService()
    // Oops — constructor đã tạo THẬT Resend client, kết nối API thật
    // Không có cách nào truyền mock MailService vào
  })
})
```

Vì `AuthService` tự `new` dependencies trong constructor, bạn **không có cách nào** truyền mock vào. Muốn mock phải dùng hacks như monkey-patching module imports hoặc mock toàn bộ chain `Resend → ResendAdapter → MailAdapter → MailService` — phức tạp, dễ vỡ, chậm.

### Vấn đề 3: Code trùng lặp — "Copy-paste chain"

`UsersService` cũng cần gửi email chào mừng? Copy toàn bộ đoạn khởi tạo. `OrdersService` cần gửi email xác nhận đơn hàng? Copy lần nữa. 3 classes, 3 bản copy của cùng một đoạn code. Sửa 1 chỗ phải sửa 3 chỗ. Quên sửa 1 chỗ = bug.

### Gốc rễ của cả 3 vấn đề

Một câu tóm gọn: **class đang tự chịu trách nhiệm tạo và quản lý dependencies của mình**. Đây là root cause — và DI giải quyết chính xác vấn đề này.

## 1.2 IoC — Inversion of Control

**Inversion of Control** là **nguyên lý** (principle) giải quyết vấn đề trên bằng cách: **đảo ngược quyền kiểm soát** — thay vì class tự quyết định tạo dependencies khi nào và thế nào, một **thành phần bên ngoài** (framework/container) nhận toàn bộ trách nhiệm đó.

```typescript
// TRƯỚC IoC — class TỰ KIỂM SOÁT dependencies
class AuthService {
  constructor() {
    this.mailService = new MailService(new MailAdapter(new ResendAdapter(...)))
    // AuthService QUYẾT ĐỊNH: tạo gì, tạo khi nào, tạo thế nào
  }
}

// SAU IoC — FRAMEWORK KIỂM SOÁT dependencies
@Injectable()
class AuthService {
  constructor(private readonly mailService: MailService) {}
  // AuthService CHỈ KHAI BÁO: "tôi cần MailService"
  // Framework QUYẾT ĐỊNH: tạo MailService thế nào, khi nào, inject vào đâu
}
```

**"Inversion" (đảo ngược) cụ thể là gì?**

| Trước IoC | Sau IoC |
|-----------|---------|
| Class **tự tạo** dependencies | Framework **tạo hộ** dependencies |
| Class **biết** cách tạo dependencies | Class **không biết** — chỉ biết interface |
| Class **quyết định** khi nào tạo | Framework **quyết định** thời điểm tạo |
| Class **quản lý** lifecycle của dependencies | Framework **quản lý** toàn bộ lifecycle |

Nói cách khác: quyền tạo, quản lý, và cung cấp objects đã **chuyển từ code của bạn sang framework**. Bạn mất quyền kiểm soát (và đó là điều tốt — vì bạn không nên kiểm soát cái này).

**IoC KHÔNG CHỈ có trong NestJS.** Đây là nguyên lý chung của nhiều frameworks:
- **Spring (Java)**: ApplicationContext là IoC container
- **Angular**: Injector là IoC container
- **NestJS**: NestContainer là IoC container
- Thậm chí **React hooks** cũng áp dụng IoC — React quyết định khi nào component render, không phải bạn

## 1.3 DI — Dependency Injection: Cách thực hiện IoC

IoC là **nguyên lý trừu tượng** — "framework kiểm soát lifecycle". Nhưng nguyên lý cần **kỹ thuật cụ thể** để thực hiện. Có nhiều kỹ thuật implement IoC:

| Kỹ thuật | Cách hoạt động | Ví dụ |
|----------|----------------|-------|
| **Dependency Injection** | Framework truyền dependencies vào class | NestJS, Spring, Angular |
| **Service Locator** | Class tự gọi container để lấy dependency | Một số legacy frameworks |
| **Template Method** | Framework gọi hook methods do bạn define | React lifecycle methods |
| **Event-driven** | Framework publish events, bạn subscribe | EventEmitter pattern |

**Dependency Injection** là kỹ thuật phổ biến nhất và được NestJS chọn. Cơ chế: framework nhìn vào constructor parameters → xác định class cần gì → resolve từng dependency → **truyền (inject) vào constructor** khi tạo instance.

### Constructor Injection — Cách NestJS dùng

```typescript
@Injectable()
class AuthService {
  // NestJS nhìn constructor → thấy cần MailService và HashingService
  // → resolve cả hai → gọi new AuthService(mailServiceInstance, hashingServiceInstance)
  constructor(
    private readonly mailService: MailService,
    private readonly hashingService: HashingService,
  ) {}
}
```

### Tại sao Constructor Injection là lựa chọn chính?

NestJS chọn Constructor Injection (thay vì setter injection, interface injection, hay property injection) vì nó có **3 đặc tính vượt trội**:

**1. Immutable (Bất biến):**
Dependencies gán **1 lần duy nhất** trong constructor, sau đó `readonly` — không ai có thể thay đổi giữa chừng. Bạn không bao giờ gặp bug kiểu "MailService tự nhiên bị null sau khi chạy 5 phút" vì không có code nào có thể reassign nó.

```typescript
constructor(private readonly mailService: MailService) {}
// readonly = TypeScript sẽ lỗi compile nếu ai đó viết: this.mailService = null
```

**2. Explicit (Tường minh):**
Nhìn constructor signature là biết **ngay** class phụ thuộc vào những gì — không cần đọc toàn bộ code:

```typescript
// Nhìn đây là biết: AuthService cần 4 thứ để hoạt động
constructor(
  private readonly usersRepo: UsersRepository,
  private readonly mailService: MailService,
  private readonly hashingService: HashingService,
  private readonly tokenService: TokenService,
) {}
```

Nếu constructor quá dài (>5 params) → tín hiệu class đang làm quá nhiều việc → cần refactor. Constructor Injection **tự động expose** vấn đề thiết kế.

**3. Testable (Dễ test):**
Muốn unit test? Truyền mock vào constructor:

```typescript
describe('AuthService', () => {
  it('should send verification email on register', async () => {
    const mockMail = { sendVerificationEmail: jest.fn() }
    const mockHashing = { hash: jest.fn().mockResolvedValue('hashed') }
    const authService = new AuthService(mockUsersRepo, mockMail, mockHashing, mockToken)
    // Không cần framework, không cần container — plain JavaScript
    await authService.register('test@example.com', 'password')
    expect(mockMail.sendVerificationEmail).toHaveBeenCalledWith('test@example.com')
  })
})
```

## 1.4 Tổng kết — Cách trình bày cho phỏng vấn

> "IoC — Inversion of Control — là **nguyên lý** đảo ngược quyền kiểm soát: thay vì class tự tạo và quản lý dependencies, framework nhận toàn bộ trách nhiệm đó. Class chỉ **khai báo** cần gì, framework lo **cung cấp**.
>
> DI — Dependency Injection — là **kỹ thuật** cụ thể để thực hiện IoC. NestJS dùng Constructor Injection: framework đọc constructor parameters, resolve từng dependency, rồi truyền vào khi tạo instance.
>
> Lý do dùng Constructor Injection: dependencies là immutable (readonly, gán 1 lần), explicit (nhìn constructor biết class cần gì), và dễ test (truyền mock vào constructor, không cần framework)."

---

# 2. What NestJS DI is NOT — Đính chính hiểu lầm phổ biến

> Trong phỏng vấn, nhiều ứng viên giải thích DI nhưng diễn đạt sai bản chất — lẫn lộn với Service Locator, nghĩ metadata sinh ra bằng "magic", hoặc hiểu sai thời điểm tạo instance. Người phỏng vấn senior sẽ nhận ra ngay. Phần này giúp bạn **phân biệt rõ ràng**.

## 2.1 KHÔNG phải Service Locator Pattern

Đây là hiểu lầm **phổ biến nhất**. Nhiều người giải thích DI nhưng mô tả lại đúng Service Locator.

### Service Locator — Class chủ động đi tìm dependency

```typescript
class AuthService {
  doSomething() {
    // Service Locator: class BIẾT container tồn tại, CHỦ ĐỘNG gọi
    const mail = Container.get(MailService)
    mail.send(...)
  }
}
```

### Dependency Injection — Class không biết container tồn tại

```typescript
@Injectable()
class AuthService {
  // DI: class KHÔNG BIẾT container là gì, KHÔNG GỌI container
  // "ai đó" đưa MailService cho tôi qua constructor, tôi không hỏi "ai"
  constructor(private readonly mail: MailService) {}

  doSomething() {
    this.mail.send(...)  // dùng dependency đã được inject
  }
}
```

### Khác biệt then chốt

| Tiêu chí | Service Locator | Dependency Injection |
|----------|-----------------|---------------------|
| **Ai tìm dependency?** | Class tự đi tìm | Framework đưa cho class |
| **Class biết container?** | Có — phải import và gọi | Không — không biết container tồn tại |
| **Dependency ẩn hay hiện?** | **Ẩn** — đọc method body mới thấy | **Hiện** — nhìn constructor biết ngay |
| **Test thế nào?** | Phải mock cả container | Truyền mock vào constructor |
| **Coupling** | Class coupling vào container (infrastructure) | Class chỉ coupling vào interface |

### Tại sao Service Locator là anti-pattern?

1. **Hidden dependencies**: Nhìn class signature không biết nó cần gì — phải đọc toàn bộ code mới biết
2. **Coupling vào infrastructure**: Class phụ thuộc trực tiếp vào Container class — đổi framework phải sửa toàn bộ code
3. **Test phức tạp**: Phải setup mock container trước khi test — overhead lớn

**Lưu ý quan trọng**: NestJS **có cung cấp** `ModuleRef.get()` — đây thực chất là Service Locator pattern. Nhưng NestJS coi đây là **escape hatch** cho trường hợp đặc biệt (dynamic resolution, factory pattern), **không phải** cách dùng chính. Constructor Injection vẫn là default.

## 2.2 KHÔNG phải Runtime Reflection "Magic"

Một hiểu lầm khác: "NestJS scan source code lúc runtime để đoán kiểu dữ liệu". **Không phải.**

### Thực tế: Compile-time Metadata

Khi bạn bật `emitDecoratorMetadata: true` trong `tsconfig.json`, **TypeScript compiler** (không phải NestJS) tự động ghi thêm metadata khi compile class có decorator:

```typescript
// ─── Code bạn viết ───
@Injectable()
class AuthService {
  constructor(
    private readonly mailService: MailService,
    private readonly hashingService: HashingService,
  ) {}
}

// ─── Sau khi TypeScript compile (bạn KHÔNG THẤY trong source, nhưng nó tồn tại trong JS output) ───
Reflect.defineMetadata('design:paramtypes', [MailService, HashingService], AuthService)
// TypeScript ghi: "constructor của AuthService có 2 params: MailService ở index 0, HashingService ở index 1"
```

NestJS Injector sau đó **đọc** metadata này:

```typescript
const deps = Reflect.getMetadata('design:paramtypes', AuthService)
// deps = [MailService, HashingService]
// Injector biết: param 0 cần MailService, param 1 cần HashingService
```

### Tại sao cần `@Injectable()` trên class?

`@Injectable()` bản thân **không sinh metadata gì**. Nhưng nó là **decorator** — và TypeScript chỉ emit `design:paramtypes` khi class **có ít nhất 1 decorator**. Không có decorator → TypeScript không emit → Injector không biết constructor cần gì → `UnknownDependenciesException`.

```typescript
// KHÔNG có @Injectable() → TypeScript KHÔNG emit design:paramtypes
class AuthService {
  constructor(private mail: MailService) {}
}
// Kết quả: Reflect.getMetadata('design:paramtypes', AuthService) === undefined
// → NestJS không biết constructor cần gì → LỖI

// CÓ @Injectable() → TypeScript emit design:paramtypes
@Injectable()
class AuthService {
  constructor(private mail: MailService) {}
}
// Kết quả: Reflect.getMetadata('design:paramtypes', AuthService) === [MailService]
// → NestJS biết: cần inject MailService ở param 0 → OK
```

**Quá trình hoàn toàn deterministic**: cùng source code → cùng metadata → cùng kết quả mọi lần. Không có "scan", không có "guess", không có "magic".

### Trường hợp TypeScript metadata không đủ

TypeScript `design:paramtypes` **chỉ ghi kiểu** tại compile time. Có 3 trường hợp nó **không đủ thông tin** và bạn cần `@Inject()`:

```typescript
// 1. Interface — TypeScript erase interfaces khi compile sang JS
// design:paramtypes chỉ ghi Object — NestJS không biết inject gì
constructor(private mail: IMailService) {}  // ❌ IMailService biến mất ở runtime

// 2. Primitive types — string, number, boolean
// design:paramtypes ghi String — NestJS không biết inject string NÀO
constructor(private apiKey: string) {}  // ❌ String quá generic

// 3. Custom token (string/Symbol)
// design:paramtypes không ghi custom token
constructor(private client: Resend) {}  // ❌ Nếu provide bằng string token

// ─── Giải pháp: @Inject() khai báo tường minh ───
constructor(
  @Inject('MAIL_SERVICE') private mail: IMailService,     // ✅
  @Inject('RESEND_API_KEY') private apiKey: string,        // ✅
  @Inject('RESEND_CLIENT') private client: Resend,         // ✅
) {}
```

## 2.3 KHÔNG lazy-load providers mặc định

Tất cả Singleton providers (scope DEFAULT) được tạo **ngay khi app bootstrap** — **trước** khi app nhận bất kỳ request nào.

```
NestFactory.create(AppModule)
│
├── Phase 1-3: Scan, Wrap, Resolve (nhanh — chỉ đọc metadata)
│
├── Phase 4: Loading — TẠO TẤT CẢ providers
│   ├── new PrismaService()     → kết nối database (có thể mất 2s)
│   ├── new RedisService()      → kết nối Redis (có thể mất 500ms)
│   ├── new MailService()       → khởi tạo mail client
│   ├── new AuthService()       → inject PrismaService, MailService đã tạo
│   └── ... toàn bộ providers trong app
│
└── App sẵn sàng nhận request
```

**Hệ quả**: Nếu `PrismaService` mất 2 giây kết nối database, app chậm khởi động 2 giây — dù chưa có request nào cần database. Đây là trade-off có chủ ý: NestJS **hy sinh startup time** để đổi lấy **runtime performance** (không cần tạo instance on-the-fly khi request đến).

**Ngoại lệ**: NestJS cung cấp `LazyModuleLoader` (chi tiết ở Part 2) — API opt-in cho deferred loading. Nhưng đây **không phải** hành vi mặc định.

## 2.4 KHÔNG "scan" toàn bộ project files

NestJS **không scan cả folder** để tìm providers (khác với Angular CLI hoặc một số Spring auto-scan). Nó chỉ đọc metadata từ **module tree** bắt đầu từ root module. Provider nào không nằm trong `providers[]` của bất kỳ module nào → NestJS không biết nó tồn tại.

```typescript
// File tồn tại nhưng KHÔNG ĐĂNG KÝ vào module nào
@Injectable()
class OrphanService {}

// NestJS KHÔNG BIẾT OrphanService tồn tại
// Phải thêm vào providers[] của một module:
@Module({ providers: [OrphanService] })
```

---

# PHẦN II — KIẾN TRÚC CONTAINER

---

# 3. NestContainer Architecture — 3 tầng quản lý

NestJS DI system có cấu trúc phân cấp **3 tầng**. Đây là kiến trúc cốt lõi — hiểu 3 tầng này là hiểu toàn bộ cách NestJS tổ chức, lưu trữ, và truy xuất providers.

## 3.1 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│  NestContainer (1 instance duy nhất cho toàn app)               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ModulesContainer: Map<string, Module>                    │   │
│  │                                                           │   │
│  │  ┌─ Module: AppModule ──────────────────────────────┐    │   │
│  │  │  _providers:   Map<token, InstanceWrapper>        │    │   │
│  │  │  _controllers: Map<token, InstanceWrapper>        │    │   │
│  │  │  _injectables: Map<token, InstanceWrapper>        │    │   │
│  │  │  _imports:     Set<Module>                        │    │   │
│  │  │  _exports:     Set<token>                         │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                           │   │
│  │  ┌─ Module: AuthModule ─────────────────────────────┐    │   │
│  │  │  _providers: { AuthService → InstanceWrapper,     │    │   │
│  │  │               AuthRepository → InstanceWrapper }  │    │   │
│  │  │  _controllers: { AuthController → InstanceWrapper }│    │   │
│  │  │  _imports: { CoreModule }                         │    │   │
│  │  │  _exports: { AuthService }                        │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │                                                           │   │
│  │  ┌─ Module: MailModule ─────────────────────────────┐    │   │
│  │  │  _providers: { ResendClient → IW,                 │    │   │
│  │  │               ResendAdapter → IW,                 │    │   │
│  │  │               MailAdapter → IW,                   │    │   │
│  │  │               MailService → IW }                  │    │   │
│  │  │  _exports: { MailService }                        │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  globalModules: Set<Module>    ← modules có @Global()           │
│  dynamicModulesMetadata: Map   ← metadata cho dynamic modules   │
└─────────────────────────────────────────────────────────────────┘
```

## 3.2 Tầng 1: NestContainer — Registry trung tâm

**Source**: [`packages/core/injector/container.ts#L31-L363`](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/container.ts#L31-L363)

`NestContainer` là object **duy nhất** cho toàn app, được tạo ra đầu tiên khi bạn gọi `NestFactory.create(AppModule)`.

**Trách nhiệm chính:**

| Method | Làm gì |
|--------|--------|
| `addModule()` | Đăng ký module mới vào container. Tạo Module object, generate token qua `ModuleTokenFactory` |
| `addProvider()` | Delegate cho Module — thêm provider vào module tương ứng |
| `bindGlobalScope()` | Đăng ký module vào `globalModules` Set — auto-available cho mọi module |
| `getModules()` | Trả về `ModulesContainer` (Map chứa tất cả modules) |

**Bên trong**:

```typescript
// Simplified từ source
class NestContainer {
  private readonly modules = new ModulesContainer()  // Map<string, Module>
  private readonly globalModules = new Set<Module>()
  private readonly dynamicModulesMetadata = new Map<string, Partial<DynamicModule>>()

  async addModule(metatype: Type, scope: Type[]): Promise<{moduleRef, inserted}> {
    // 1. ModuleCompiler compile → generate token
    const { type, dynamicMetadata, token } = await this.moduleCompiler.compile(metatype)
    // 2. Kiểm tra module đã tồn tại chưa (tránh duplicate)
    if (this.modules.has(token)) return { moduleRef: this.modules.get(token), inserted: false }
    // 3. Tạo Module object mới, lưu vào Map
    const moduleRef = new Module(type, this)
    this.modules.set(token, moduleRef)
    // 4. Nếu là @Global() → thêm vào globalModules
    if (this.isGlobalModule(type, dynamicMetadata)) this.addGlobalModule(moduleRef)
    return { moduleRef, inserted: true }
  }
}
```

**ModuleTokenFactory** — Generate unique token cho mỗi module:
- Static module: token dựa trên class name + random hash → `AppModule_abc123`
- Dynamic module: token dựa trên class name + deep hash of config → đảm bảo cùng config = cùng token

## 3.3 Tầng 2: Module — Namespace cho providers

**Source**: [`packages/core/injector/module.ts#L44-L675`](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/module.ts#L44-L675)

Mỗi class có `@Module()` decorator → framework tạo **1 Module object** bên trong container. Module object là **namespace** — nó đóng gói và quản lý tất cả providers, controllers, imports, exports của module đó.

### 5 bộ sưu tập bên trong Module

| Collection | Kiểu | Chứa gì | Ý nghĩa |
|------------|------|---------|---------|
| `_providers` | `Map<token, InstanceWrapper>` | Services, Repositories, Factories | "Kho nội bộ" — tất cả providers đăng ký trong module |
| `_controllers` | `Map<token, InstanceWrapper>` | HTTP Controllers | Route handlers xử lý request |
| `_injectables` | `Map<token, InstanceWrapper>` | Guards, Interceptors, Pipes, Filters | Enhancers — middleware-like components |
| `_imports` | `Set<Module>` | Modules đã import | "Cửa nối" — cho phép truy cập providers từ module khác |
| `_exports` | `Set<token>` | Tokens được export | "Public API" — providers nào bên ngoài nhìn thấy |

### 3 provider tự động được thêm vào mỗi module

Khi Module object được tạo, NestJS tự động thêm **3 core providers**:

```typescript
// Bên trong Module constructor (simplified)
class Module {
  constructor(metatype, container) {
    // 1. Module class chính nó — inject Module nếu cần
    this.addProvider({ provide: metatype, useValue: moduleInstance })

    // 2. ModuleRef — cho phép dynamic resolution trong module
    this.addProvider({ provide: ModuleRef, useValue: moduleRefInstance })

    // 3. HttpAdapterHost — reference đến HTTP server
    this.addProvider({ provide: HttpAdapterHost, useValue: adapterHost })
  }
}
```

Điều này có nghĩa: trong bất kỳ module nào, bạn đều có thể inject `ModuleRef` mà không cần đăng ký:

```typescript
@Injectable()
class MyService {
  constructor(private moduleRef: ModuleRef) {}  // auto-available
}
```

### addProvider() — Phân loại provider khi đăng ký

```typescript
// Simplified từ source
addProvider(provider: Provider): string {
  if (this.isCustomProvider(provider)) {
    // provider có dạng { provide: ..., useClass/useValue/useFactory/useExisting: ... }
    return this.addCustomProvider(provider)
  }
  // provider là class đơn giản: [MailService] → shorthand cho { provide: MailService, useClass: MailService }
  return this.addStandardProvider(provider)
}

addCustomProvider(provider) {
  if ('useClass' in provider)    return this.addCustomClass(provider)
  if ('useValue' in provider)    return this.addCustomValue(provider)
  if ('useFactory' in provider)  return this.addCustomFactory(provider)
  if ('useExisting' in provider) return this.addCustomUseExisting(provider)
}
```

## 3.4 Tầng 3: InstanceWrapper — Chi tiết ở Section 4

Mỗi provider khi đăng ký vào module **không được lưu trực tiếp** — nó được bọc trong `InstanceWrapper`. Đây là tầng quan trọng nhất, giải thích chi tiết ở section tiếp theo.

> **Cách trình bày cho phỏng vấn**: "NestJS Container có 3 tầng. NestContainer là **registry gốc**, chứa Map của tất cả modules, quản lý global modules. Mỗi Module là **namespace** chứa 5 collections: providers, controllers, injectables, imports, exports. Mỗi provider được bọc trong InstanceWrapper — **metadata container** quản lý instance thật cùng scope, lifecycle state, và dependencies."

---

# 4. InstanceWrapper — Trái tim DI system

## 4.1 InstanceWrapper KHÔNG PHẢI instance thật

Hiểu lầm phổ biến: "InstanceWrapper là wrapper pattern đơn giản, chỉ bọc instance". Không phải — InstanceWrapper là **metadata container phức tạp** quản lý toàn bộ lifecycle của provider.

**Tại sao NestJS không lưu instance trực tiếp?** Vì container cần biết **nhiều hơn** chỉ instance:

| Câu hỏi container cần trả lời | Thông tin cần | Nếu chỉ lưu instance thì... |
|-------------------------------|---------------|------------------------------|
| "Provider này thuộc scope nào?" | `scope` field | Không biết → không quản lý lifecycle đúng |
| "Đã được khởi tạo xong chưa?" | `isResolved` field | Không biết → có thể inject instance chưa sẵn sàng |
| "Class constructor là gì?" | `metatype` field | Không có → không thể tạo instance mới cho REQUEST scope |
| "Dependencies là gì?" | `inject[]` field | Không biết → không resolve được factory providers |
| "Instance nào cho request nào?" | `values` WeakMap | Không phân biệt → singleton cho tất cả → sai logic |
| "Có dùng forwardRef không?" | `forwardRef` field | Không biết → không xử lý circular dependency |

## 4.2 Cấu trúc chi tiết bên trong

```typescript
// Source: packages/core/injector/instance-wrapper.ts#L60-L96 (simplified)
class InstanceWrapper<T = any> {

  // ══════════════ IDENTITY ══════════════
  // Provider này là ai? Container dùng thông tin này để tìm và quản lý

  readonly name: string                    // Tên class: 'MailService'
  readonly token: InjectionToken           // Key để lookup: class reference, string, hoặc Symbol
  readonly metatype: Type<T> | Function    // Class constructor — dùng để gọi "new"
  readonly id: string                      // UUID unique — phân biệt wrapper trong internal operations

  // ══════════════ LIFECYCLE STATE ══════════════
  // Trạng thái hiện tại — container kiểm tra trước khi trả instance

  scope: Scope = Scope.DEFAULT             // DEFAULT | REQUEST | TRANSIENT
  isResolved: boolean = false              // true = instance đã tạo xong, sẵn sàng inject
  durable: boolean = false                 // true = persist qua request boundaries (cho multi-tenancy)
  isAlias: boolean = false                 // true = useExisting provider (alias)

  // ══════════════ INSTANCE STORAGE ══════════════
  // Instance thật nằm ở đây — KHÔNG phải this.instance đơn giản

  // Singleton: values.get(STATIC_CONTEXT) → instance
  // Request:   values.get(requestContextId) → instance cho request đó
  private readonly values = new WeakMap<ContextId, InstancePerContext<T>>()

  // Transient: transientMap.get(inquirerId).get(contextId) → instance cho consumer + request đó
  private readonly transientMap = new Map<string, WeakMap<ContextId, InstancePerContext<T>>>()

  // ══════════════ DEPENDENCY INFO ══════════════
  // NestJS cần biết provider này phụ thuộc vào gì

  inject?: (InjectionToken | OptionalFactoryDependency)[]  // explicit deps cho factory
  forwardRef: boolean = false              // true = dùng forwardRef() giải quyết circular

  // ══════════════ METHODS ══════════════

  getInstanceByContextId(contextId: ContextId): InstancePerContext<T> {
    // Singleton: luôn trả về values.get(STATIC_CONTEXT)
    // Request: trả về values.get(contextId) — mỗi request instance riêng
    // Nếu chưa có → tạo InstancePerContext rỗng { instance: undefined, isResolved: false }
  }

  getInstanceByInquirerId(contextId: ContextId, inquirerId: string): InstancePerContext<T> {
    // Chỉ dùng cho TRANSIENT scope
    // Tìm trong transientMap bằng cặp (inquirerId, contextId)
  }

  setInstanceByContextId(contextId: ContextId, value: InstancePerContext<T>): void {
    // Lưu instance sau khi tạo xong
  }

  setInstanceByInquirerId(contextId: ContextId, inquirerId: string, value: InstancePerContext<T>): void {
    // Lưu transient instance
  }
}
```

## 4.3 InstancePerContext — Wrapper cho mỗi context

Mỗi slot trong `values` WeakMap không lưu instance trực tiếp. Nó lưu một `InstancePerContext` object:

```typescript
interface InstancePerContext<T> {
  instance: T             // instance thật (hoặc undefined nếu chưa tạo)
  isResolved: boolean     // context này đã resolve chưa
  donePromise?: Promise<void>  // promise để chờ async resolution hoàn tất
}
```

## 4.4 Tại sao dùng WeakMap? — Giải thích kỹ

Đây là quyết định thiết kế quan trọng, liên quan đến **memory management**.

**Vấn đề nếu dùng Map thường:**

```
Request #1 → contextId_1 → instance_1
Request #2 → contextId_2 → instance_2
...
Request #10000 → contextId_10000 → instance_10000
// Map vẫn giữ reference đến TẤT CẢ 10000 instances
// Kể cả request đã kết thúc từ lâu → MEMORY LEAK
// Phải tự viết cleanup logic → phức tạp, dễ quên
```

**Với WeakMap:**

```
Request #1 → contextId_1 → instance_1
Request #1 kết thúc → contextId_1 object không còn ai reference
→ V8 GC tự dọn contextId_1 khỏi WeakMap
→ instance_1 cũng bị dọn (không còn reference)
→ ZERO memory leak, ZERO manual cleanup
```

**Key insight**: WeakMap cho phép GC dọn entry khi **key** (contextId) không còn ai reference. Đây là lý do NestJS dùng **object** làm contextId (không phải string/number) — vì chỉ object mới là WeakMap key.

## 4.5 Storage strategy cho mỗi scope

| Scope | Storage location | Key | Tạo khi nào | Dọn khi nào |
|-------|-----------------|-----|-------------|-------------|
| **DEFAULT** (Singleton) | `values.get(STATIC_CONTEXT)` | `STATIC_CONTEXT` — object cố định, tồn tại suốt app | Lúc bootstrap (1 lần) | Khi app shutdown |
| **REQUEST** | `values.get(requestContextId)` | `ContextId` mới từ `ContextIdFactory.create()` mỗi request | Khi request đến | GC dọn sau request kết thúc |
| **TRANSIENT** | `transientMap.get(inquirerId).get(contextId)` | Cặp (inquirer UUID + ContextId) | Mỗi lần inject | GC dọn khi context hết reference |

> **Source**: [`instance-wrapper.ts#L77-L83`](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/instance-wrapper.ts#L77-L83)

---

# PHẦN III — BOOTSTRAP PROCESS

---

# 5. Bootstrap — 4 Phase từ code nguội đến app sẵn sàng

Khi bạn gọi `NestFactory.create(AppModule)`, NestJS thực hiện **4 phase tuần tự**. Mỗi phase có **class chuyên biệt** chịu trách nhiệm. Hiểu 4 phase này là hiểu toàn bộ quá trình từ source code → app chạy.

```
NestFactory.create(AppModule)
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Phase 1: SCANNING                                   │
│  Ai: DependenciesScanner                             │
│  Làm: Đọc @Module() metadata, duyệt đệ quy,        │
│       xây module dependency graph                    │
│  Output: Biết mọi module, mọi provider, mọi import  │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  Phase 2: WRAPPING                                   │
│  Ai: Module.addProvider()                            │
│  Làm: Tạo InstanceWrapper rỗng cho mỗi provider     │
│  Output: Mỗi provider có wrapper, instance = null    │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  Phase 3: RESOLUTION                                 │
│  Ai: Injector                                        │
│  Làm: Đọc constructor metadata, xây dependency graph,│
│       tính thứ tự tạo instance (topological sort)    │
│  Output: Biết ai cần ai, tạo ai trước ai            │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  Phase 4: LOADING                                    │
│  Ai: InstanceLoader                                  │
│  Làm: Tạo instances thật, inject vào nhau            │
│  Output: Tất cả providers resolved, app sẵn sàng    │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│  Post-bootstrap: LIFECYCLE HOOKS                     │
│  onModuleInit() → onApplicationBootstrap()           │
│  → HTTP server listen() → Nhận request               │
└─────────────────────────────────────────────────────┘
```

## 5.1 Phase 1: Scanning — Đọc metadata, xây module graph

**Class chịu trách nhiệm**: `DependenciesScanner` — [`packages/core/scanner.ts#L86-L104`](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/scanner.ts#L86-L104)

### Scanner làm gì?

Bắt đầu từ `AppModule`, Scanner duyệt **đệ quy** toàn bộ cây module:

```
AppModule
├── imports: [CoreModule, AuthModule, UsersModule]
│   │
│   ├── CoreModule
│   │   ├── imports: [DatabaseModule, MailModule, HashingModule]
│   │   │   ├── DatabaseModule → providers: [PrismaService], exports: [PrismaService]
│   │   │   ├── MailModule → providers: [ResendClient, MailService, ...], exports: [MailService]
│   │   │   └── HashingModule → providers: [BcryptService], exports: [BcryptService]
│   │   └── exports: [DatabaseModule, MailModule, HashingModule]  ← re-export
│   │
│   ├── AuthModule
│   │   ├── imports: [CoreModule]
│   │   ├── providers: [AuthService, AuthRepository]
│   │   ├── controllers: [AuthController]
│   │   └── exports: [AuthService]
│   │
│   └── UsersModule
│       ├── imports: [CoreModule]
│       ├── providers: [UsersService, UsersRepository]
│       └── controllers: [UsersController]
```

### Chi tiết quá trình scan

Scanner sử dụng `iterare` library để duyệt và `reflect-metadata` để đọc decorator metadata:

```typescript
// Simplified từ source
class DependenciesScanner {
  private readonly ctxRegistry: Type[] = []  // tracking để tránh circular modules

  async scanForModules(moduleDefinition: Type, scope: Type[] = []) {
    // 1. Compile module → generate token
    const { moduleRef, inserted } = await this.container.addModule(moduleDefinition, scope)

    // 2. Nếu module đã scan rồi (duplicate import) → skip
    if (!inserted) return moduleRef

    // 3. Đọc imports từ @Module() metadata
    const importedModules = this.reflectImports(moduleDefinition)

    // 4. Duyệt đệ quy từng imported module
    for (const importedModule of importedModules) {
      await this.scanForModules(importedModule, [...scope, moduleDefinition])
    }

    return moduleRef
  }

  async scan(module: Type) {
    // Sau khi scan modules xong, scan các thành phần khác
    await this.scanForModules(module)
    await this.scanModulesForDependencies()
    // scanModulesForDependencies gọi:
    // - reflectProviders() → đọc providers[] từ metadata
    // - reflectControllers() → đọc controllers[]
    // - reflectExports() → đọc exports[]
    // - reflectImports() → đọc imports[]
    this.calculateModulesDistance()  // tính topology distance cho mỗi module
  }
}
```

### Circular module detection

Scanner dùng `ctxRegistry` array để track modules đang trong call stack. Nếu gặp lại module đã track → circular import → xử lý đặc biệt (thay vì infinite recursion).

### Module compilation & token generation

Trước khi đăng ký module, `ModuleCompiler` compile nó:

```typescript
class ModuleCompiler {
  async compile(metatype: Type | DynamicModule): Promise<ModuleFactory> {
    // 1. Nếu là DynamicModule (có forRoot/forFeature) → extract metadata
    const { type, dynamicMetadata } = this.extractMetadata(metatype)

    // 2. Generate unique token
    const token = this.moduleTokenFactory.create(type, dynamicMetadata)
    // Static module: "AppModule_a1b2c3"
    // Dynamic module: "ConfigModule_hash(config)" → cùng config = cùng token

    return { type, dynamicMetadata, token }
  }
}
```

**Kết quả Phase 1**: `NestContainer` chứa **toàn bộ Module objects** với metadata đã đọc. Scanner biết: ai import ai, ai có providers gì, ai export gì. Nhưng **chưa có instance nào** — chỉ có metadata.

## 5.2 Phase 2: Wrapping — Tạo InstanceWrapper rỗng

**Class chịu trách nhiệm**: `Module.addProvider()`, `Module.addController()`, `Module.addInjectable()`

Với mỗi provider/controller/injectable đã scan, framework tạo `InstanceWrapper` — nhưng **chưa tạo instance thật**:

```typescript
// Bên trong Module.addProvider()
const wrapper = new InstanceWrapper({
  name: 'MailService',
  metatype: MailService,         // lưu class constructor
  token: MailService,            // key để lookup
  instance: undefined,           // CHƯA CÓ instance!
  isResolved: false,             // CHƯA resolve dependencies!
  scope: Scope.DEFAULT,          // Singleton mặc định
  host: this,                    // module chứa provider này
})

// Lưu vào Map
this._providers.set(MailService, wrapper)
```

**Điểm cực kỳ quan trọng**: Phase 2 kết thúc mà **chưa có bất kỳ instance nào được tạo**. Tất cả InstanceWrapper đều có `instance: undefined`, `isResolved: false`. Đăng ký trong `providers[]` **không phải** tạo instance — đó chỉ là khai báo "module này có provider này, hãy chuẩn bị quản lý nó".

**Tại sao tách Phase 2 ra?** Vì NestJS cần **đăng ký tất cả providers trước** rồi mới resolve — vì provider A có thể phụ thuộc provider B ở module khác. Nếu tạo instance ngay khi đăng ký, có thể A cần B nhưng B chưa đăng ký → lỗi.

## 5.3 Phase 3: Resolution — Phân tích dependency graph

**Class chịu trách nhiệm**: `Injector` — [`packages/core/injector/injector.ts#L85-L993`](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/injector.ts#L85-L993)

Injector phân tích constructor metadata của mỗi class → xác định **ai cần ai** → xây dependency graph → tính thứ tự tạo instance.

Chi tiết 6 bước resolve ở [Section 6](#6-dependency-resolution--6-bước-resolve-chi-tiết).

## 5.4 Phase 4: Loading — Tạo instances thật

**Class chịu trách nhiệm**: `InstanceLoader` — [`packages/core/injector/instance-loader.ts#L1-L60`](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/instance-loader.ts#L1-L60)

InstanceLoader iterate qua **tất cả modules** trong NestContainer, và với mỗi module gọi **3 methods theo thứ tự cố định**:

```typescript
// Simplified từ source
class InstanceLoader {
  async createInstancesOfDependencies(modules: Map<string, Module>) {
    // Duyệt qua TỪNG module
    for (const [token, moduleRef] of modules) {
      // 1. Tạo tất cả providers (services, repos, factories)
      await this.createInstancesOfProviders(moduleRef)
      // 2. Tạo controllers (inject providers đã tạo ở bước 1)
      await this.createInstancesOfControllers(moduleRef)
      // 3. Tạo injectables — guards, interceptors, pipes, filters
      await this.createInstancesOfInjectables(moduleRef)
    }
  }

  private async createInstancesOfProviders(moduleRef: Module) {
    const providers = moduleRef.providers  // Map<token, InstanceWrapper>
    for (const [token, wrapper] of providers) {
      // Delegate cho Injector — resolve deps rồi tạo instance
      await this.injector.loadProvider(wrapper, moduleRef)
    }
  }
}
```

**Thứ tự providers → controllers → injectables có lý do:**

1. **Providers** (services) là nền móng — không phụ thuộc gì khác trong module
2. **Controllers** inject providers → phải tạo providers trước
3. **Injectables** (guards, pipes...) có thể inject cả providers lẫn controllers → tạo cuối cùng

Sau Phase 4: tất cả InstanceWrapper đều có `instance !== undefined`, `isResolved = true`.

## 5.5 Post-bootstrap: Lifecycle Hooks & Server Start

Sau 4 phase, NestJS chạy lifecycle hooks theo **module distance order** (module xa root trước, root module cuối):

```
1. OnModuleInit hooks    → các module init nội bộ (kết nối DB, warmup cache...)
2. OnApplicationBootstrap → app-level initialization
3. RoutesResolver         → đăng ký routes từ tất cả controllers
4. HTTP server listen()   → app sẵn sàng nhận request
```

> **Cách trình bày cho phỏng vấn**: "NestJS bootstrap qua 4 phase. Scanner **đệ quy đọc** `@Module()` metadata từ AppModule, xây module graph. Module **tạo InstanceWrapper rỗng** cho mỗi provider — chưa có instance. Injector **phân tích** constructor metadata, xây dependency graph, tính thứ tự bottom-up. InstanceLoader **tạo instances thật**: providers trước, controllers sau, injectables cuối. Thứ tự này cố định vì controllers inject providers, injectables có thể inject cả hai."

---

# 6. Dependency Resolution — 6 bước resolve chi tiết

Đây là phần **cốt lõi nhất** của DI system. Khi InstanceLoader cần tạo instance cho một provider, `Injector.loadInstance()` thực hiện 6 bước.

## Bước 1: Đọc Constructor Metadata — "Class này cần inject gì?"

### Cách TypeScript emit metadata

Khi TypeScript compile class có **bất kỳ decorator nào** (và `emitDecoratorMetadata: true`):

```typescript
// ─── Source code ───
@Injectable()
export class MailService {
  constructor(
    private readonly mailAdapter: MailAdapter,
    @Inject('MAIL_CONFIG') private readonly config: MailConfig,
  ) {}
}

// ─── TypeScript compiler output (simplified) ───
// 1. design:paramtypes — kiểu của TẤT CẢ params
Reflect.defineMetadata('design:paramtypes', [MailAdapter, Object], MailService)
// MailAdapter ở index 0 → class reference ✅
// MailConfig ở index 1 → Object (vì MailConfig là interface, erase khi compile) ❌

// 2. SELF_DECLARED_DEPS_METADATA — từ @Inject() decorators
// @Inject('MAIL_CONFIG') ghi: { index: 1, param: 'MAIL_CONFIG' }
```

### Injector đọc metadata thế nào?

```typescript
// Injected từ source (simplified)
class Injector {
  resolveConstructorParams(wrapper: InstanceWrapper, moduleRef: Module) {
    const metatype = wrapper.metatype  // class constructor

    // 1. Đọc design:paramtypes — kiểu mặc định từ TypeScript
    const paramtypes = Reflect.getMetadata('design:paramtypes', metatype) || []

    // 2. Đọc SELF_DECLARED_DEPS_METADATA — từ @Inject() decorators
    const selfDeps = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, metatype) || []

    // 3. Đọc OPTIONAL_DEPS_METADATA — từ @Optional() decorators
    const optionalDeps = Reflect.getMetadata(OPTIONAL_DEPS_METADATA, metatype) || []

    // 4. Merge: selfDeps GHI ĐÈ paramtypes tại index tương ứng
    const dependencies = paramtypes.map((type, index) => {
      const selfDep = selfDeps.find(d => d.index === index)
      if (selfDep) return selfDep.param  // @Inject('TOKEN') ghi đè design:paramtypes
      return type                         // fallback về design:paramtypes
    })

    return dependencies  // [MailAdapter, 'MAIL_CONFIG']
  }
}
```

**Thứ tự ưu tiên metadata:**

| Ưu tiên | Source | Khi nào dùng |
|---------|--------|-------------|
| 1 (cao nhất) | `SELF_DECLARED_DEPS_METADATA` (từ `@Inject()`) | Khi bạn khai báo token tường minh |
| 2 (fallback) | `design:paramtypes` (từ TypeScript) | Khi không có `@Inject()` — dùng class reference |

## Bước 2: Tìm trong module hiện tại — "Provider có trong cùng module không?"

```typescript
// Injector.lookupComponent()
lookupComponent(token: InjectionToken, moduleRef: Module): InstanceWrapper | null {
  // Tìm trong _providers Map của module hiện tại
  const provider = moduleRef.providers.get(token)
  if (provider) return provider

  // Không tìm thấy → chuyển sang Bước 3
  return null
}
```

Nếu `MailAdapter` nằm trong **cùng module** với `MailService` → tìm thấy ngay trong `_providers` Map → lấy InstanceWrapper.

## Bước 3: Tìm trong imported modules — "Provider có ở module đã import không?"

Nếu Bước 2 không tìm thấy, Injector duyệt qua `_imports` Set:

```typescript
// Simplified từ source
lookupComponentInImports(token: InjectionToken, moduleRef: Module): InstanceWrapper | null {
  const moduleRegistry: string[] = []  // tránh infinite loop khi circular imports

  for (const importedModule of moduleRef.imports) {
    // Tránh duyệt module đã visit (circular protection)
    if (moduleRegistry.includes(importedModule.id)) continue
    moduleRegistry.push(importedModule.id)

    // Kiểm tra 2 ĐIỀU KIỆN ĐỒNG THỜI:
    const hasProvider = importedModule.providers.has(token)  // tồn tại?
    const isExported = importedModule.exports.has(token)     // được export?

    if (hasProvider && isExported) {
      return importedModule.providers.get(token)  // tìm thấy!
    }

    // Nếu không → tìm đệ quy trong imports của imported module
    const found = this.lookupComponentInImports(token, importedModule)
    if (found) return found
  }

  // Cuối cùng: check global modules
  for (const globalModule of this.container.globalModules) {
    const hasProvider = globalModule.providers.has(token)
    const isExported = globalModule.exports.has(token)
    if (hasProvider && isExported) return globalModule.providers.get(token)
  }

  return null  // không tìm thấy → Bước 3 thất bại
}
```

**Hai điều kiện đồng thời — then chốt:**

1. `module._providers.has(token)` — provider **tồn tại** trong module đó
2. `module._exports.has(token)` — provider **được export** ra ngoài

**Cả hai phải TRUE.** Provider tồn tại nhưng không export → **invisible** → Injector bỏ qua. Đây chính là cơ chế **encapsulation** của NestJS.

Nếu duyệt hết imports + global modules mà vẫn không thấy → throw `UnknownDependenciesException`. Message dạng:

```
Nest can't resolve dependencies of the MailService (?). Please make sure that the
argument MailAdapter at index [0] is available in the MailModule context.
```

## Bước 4: Tạo instance — "Lắp ráp"

Sau khi **tất cả** dependencies resolved (mỗi dependency đã có instance sẵn sàng):

```typescript
// Simplified
async instantiateClass(instances: any[], wrapper: InstanceWrapper) {
  const metatype = wrapper.metatype

  if (wrapper.isFactory) {
    // Factory provider: gọi function với resolved deps
    const instance = await wrapper.metatype(...instances)
    return instance
  }

  // Class provider: gọi constructor
  const instance = new metatype(...instances)
  return instance
  // VD: new MailService(mailAdapterInstance) — mailAdapterInstance đã resolve ở trên
}
```

## Bước 5: Property Injection (nếu có)

Ngoài constructor injection, NestJS hỗ trợ inject qua `@Inject()` trên property:

```typescript
@Injectable()
class AuthService {
  @Inject(MailService)
  private mailService: MailService  // inject qua property, không qua constructor
}
```

Injector gọi `resolveProperties()` → đọc `PROPERTY_DEPS_METADATA` → tìm và inject dependencies vào properties:

```typescript
// Simplified
async resolveProperties(wrapper: InstanceWrapper, moduleRef: Module) {
  const properties = Reflect.getMetadata(PROPERTY_DEPS_METADATA, wrapper.metatype) || []
  for (const prop of properties) {
    const resolved = await this.lookupComponent(prop.type, moduleRef)
    if (resolved) {
      wrapper.instance[prop.key] = resolved.instance
    }
  }
}
```

**Property injection ít dùng hơn constructor injection** vì:
- Dependencies không explicit trong constructor signature
- Không immutable (có thể reassign)
- Khó test hơn (phải set properties manually thay vì truyền vào constructor)

Nhưng hữu ích trong **circular dependency** — khi 2 classes cần nhau, một dùng constructor injection, một dùng property injection.

## Bước 6: Settlement — "Đánh dấu hoàn tất"

```typescript
// Sau khi tạo instance xong
wrapper.instance = instance
wrapper.isResolved = true

// Notify các dependencies đang chờ instance này
settlementSignal.complete()
// Các providers khác đang chờ (trong circular dependency) sẽ được notify
// và tiếp tục resolve
```

`SettlementSignal.complete()` quan trọng cho **circular dependency resolution** — khi A chờ B, B chờ A, signal cho phép coordinate quá trình tạo.

## Sơ đồ tổng hợp

```
Injector.loadInstance(MailService, MailModule)
  │
  ├── Bước 1: Đọc metadata
  │   ├── design:paramtypes → [MailAdapter]
  │   ├── SELF_DECLARED_DEPS → (không có @Inject)
  │   └── Kết quả: cần inject [MailAdapter] ở param 0
  │
  ├── Bước 2: Tìm trong MailModule._providers
  │   ├── providers.has(MailAdapter)? → YES
  │   └── Lấy InstanceWrapper của MailAdapter
  │       └── MailAdapter đã resolved? → YES → có instance sẵn
  │
  ├── Bước 3: (skip — đã tìm thấy ở Bước 2)
  │
  ├── Bước 4: new MailService(mailAdapterInstance)
  │
  ├── Bước 5: Property injection (không có)
  │
  └── Bước 6: MailService.isResolved = true
              SettlementSignal.complete()
```

---

# PHẦN IV — PROVIDER SYSTEM

---

# 7. Provider Types — 4 cách đăng ký provider

NestJS hỗ trợ **4 loại provider**, mỗi loại giải quyết use case khác nhau. Bên trong, Module class có method riêng cho mỗi loại: `addCustomClass()`, `addCustomValue()`, `addCustomFactory()`, `addCustomUseExisting()`.

## 7.1 Standard Class — `useClass`

```typescript
// Shorthand (phổ biến nhất)
providers: [MailService]

// Full syntax (tương đương)
providers: [{ provide: MailService, useClass: MailService }]
```

**Bên trong NestJS xử lý:**

1. `Module.addCustomClass()` tạo InstanceWrapper với `metatype = MailService`
2. Lúc resolve: Injector đọc `design:paramtypes` từ `MailService`
3. Resolve từng dependency
4. Gọi `new MailService(dep1, dep2, ...)`

**Token**: class reference `MailService` (dùng làm key trong `_providers` Map)

**Khi nào dùng**: 99% trường hợp — provider là class bình thường cần DI.

**Ứng dụng nâng cao — Swap implementation:**

```typescript
// Dev dùng mock, production dùng real
providers: [{
  provide: MailService,
  useClass: process.env.NODE_ENV === 'test'
    ? MockMailService    // class khác, nhưng cùng interface
    : MailService,
}]
// Tất cả class inject MailService → nhận MockMailService trong test
```

**Ứng dụng — Abstract class / Interface token:**

```typescript
// Abstract class làm token (vì interface bị erase ở runtime)
abstract class IMailService {
  abstract send(to: string, body: string): Promise<void>
}

providers: [{ provide: IMailService, useClass: ResendMailService }]

// Inject bằng abstract class
constructor(private readonly mail: IMailService) {}
// Nhận ResendMailService instance — nhưng code chỉ biết IMailService interface
```

## 7.2 Value — `useValue`

```typescript
providers: [
  { provide: 'APP_NAME', useValue: 'My Ecommerce' },
  { provide: 'DATABASE_CONFIG', useValue: { host: 'localhost', port: 5432, database: 'ecommerce' } },
  { provide: 'FEATURE_FLAGS', useValue: Object.freeze({ emailVerification: true, sms: false }) },
]
```

**Bên trong NestJS xử lý:**

1. `Module.addCustomValue()` tạo InstanceWrapper
2. Set **instance ngay lập tức**: `wrapper.instance = useValue`
3. Set `isResolved = true` — không cần resolve gì
4. Không đọc constructor metadata, không DI, không gọi `new`

**Token**: giá trị bạn truyền vào `provide` (thường là string)

**Khi nào dùng:**

| Use case | Ví dụ |
|----------|-------|
| Constants / Config | `{ provide: 'APP_PORT', useValue: 3000 }` |
| External library instances | `{ provide: 'REDIS_CLIENT', useValue: new Redis({ host: 'localhost' }) }` |
| Mock trong testing | `{ provide: MailService, useValue: { send: jest.fn() } }` |
| Frozen objects | `{ provide: 'CORS_OPTIONS', useValue: Object.freeze({ origin: '*' }) }` |

## 7.3 Factory — `useFactory`

```typescript
providers: [{
  provide: 'RESEND_CLIENT',
  useFactory: (config: ConfigService) => {
    const apiKey = config.get('RESEND_API_KEY')
    if (!apiKey) throw new Error('RESEND_API_KEY is required')
    return new Resend(apiKey)
  },
  inject: [ConfigService],  // PHẢI khai báo dependencies tường minh
}]
```

**Bên trong NestJS xử lý:**

1. `Module.addCustomFactory()` tạo InstanceWrapper
2. Lưu factory function vào `metatype`, dependencies vào `inject`
3. Lúc resolve: Injector resolve `inject` dependencies trước
4. Gọi `factory(resolvedDep1, resolvedDep2, ...)`
5. Kết quả là instance

**Tại sao phải khai báo `inject[]` riêng?**

Đây là câu hỏi phỏng vấn hay. TypeScript **chỉ emit** `design:paramtypes` cho **class constructors có decorator**. `useFactory` là **function** — TypeScript **không emit metadata** cho function parameters. NestJS không có cách nào biết factory cần dependencies gì, nên bạn phải khai báo tường minh.

```typescript
// Class: TypeScript emit metadata (vì có @Injectable() decorator)
@Injectable()
class MailService {
  constructor(private adapter: MailAdapter) {}  // design:paramtypes = [MailAdapter] ✅
}

// Function: TypeScript KHÔNG emit metadata
const factory = (config: ConfigService) => new Resend(config.get('KEY'))
// Không có design:paramtypes → NestJS không biết cần gì → phải dùng inject[]
```

**Factory hỗ trợ async:**

```typescript
providers: [{
  provide: 'MONGO_CONNECTION',
  useFactory: async (config: ConfigService) => {
    const uri = config.get('MONGO_URI')
    const connection = await mongoose.connect(uri)
    return connection
  },
  inject: [ConfigService],
  // NestJS chờ Promise resolve trước khi coi provider là ready
}]
```

**Factory với optional dependencies:**

```typescript
providers: [{
  provide: 'NOTIFICATION_SERVICE',
  useFactory: (mail: MailService, slack?: SlackService) => {
    return new NotificationService(mail, slack)
  },
  inject: [MailService, { token: 'SLACK_SERVICE', optional: true }],
  // Nếu SLACK_SERVICE không đăng ký → slack = undefined (không lỗi)
}]
```

**Khi nào dùng**: Khi cần **logic** để tạo instance — conditional, config-based, async initialization, complex setup.

## 7.4 Alias — `useExisting`

```typescript
providers: [
  MailService,
  { provide: 'LEGACY_MAILER', useExisting: MailService },
  { provide: AbstractMailService, useExisting: MailService },
]
```

**Bên trong NestJS xử lý:**

1. `Module.addCustomUseExisting()` tạo InstanceWrapper với `inject = [MailService]` (1 phần tử)
2. Lúc resolve: Injector tìm MailService → lấy **cùng InstanceWrapper**
3. Kết quả: cả 3 tokens (`MailService`, `'LEGACY_MAILER'`, `AbstractMailService`) → **cùng 1 instance**

**Khác biệt quan trọng với `useClass`:**

```typescript
// useClass → TẠO INSTANCE MỚI
{ provide: 'MAIL_A', useClass: MailService }   // instance #1
{ provide: 'MAIL_B', useClass: MailService }   // instance #2 (KHÁC!)

// useExisting → ALIAS đến instance đã có
{ provide: 'MAIL_A', useExisting: MailService } // cùng instance
{ provide: 'MAIL_B', useExisting: MailService } // cùng instance
```

**Khi nào dùng:**
- **Migration**: đổi tên token mà không break code cũ
- **Interface binding**: token abstract class → instance concrete class
- **Multiple names**: cần nhiều tên cho cùng 1 service

---

# 8. Injection Tokens — Chìa khóa để Container tìm provider

## 8.1 Token là gì?

Mỗi provider khi đăng ký vào module cần **1 key duy nhất** để container lưu và tìm lại. Key này gọi là **Injection Token**. Token nằm trong property `provide` khi đăng ký:

```typescript
providers: [
  { provide: MailService, ... },      // token = class reference
  { provide: 'API_KEY', ... },        // token = string
  { provide: MAIL_OPTIONS, ... },     // token = Symbol
]
```

## 8.2 Ba loại token

### Class reference (phổ biến nhất)

```typescript
// Khai báo
providers: [MailService]  // token = MailService class

// Inject — KHÔNG cần @Inject()
constructor(private mailService: MailService) {}
// TypeScript emit design:paramtypes = [MailService]
// NestJS dùng MailService class reference làm key tìm trong _providers Map
```

Đây là cách phổ biến nhất vì:
- Không cần `@Inject()` — TypeScript tự emit type
- Type-safe — IDE autocomplete
- Refactor-friendly — đổi tên class → tự động update

### String token

```typescript
// Khai báo
providers: [{ provide: 'RESEND_API_KEY', useValue: 'sk-xxx' }]

// Inject — PHẢI dùng @Inject() vì TypeScript chỉ emit String (generic)
constructor(@Inject('RESEND_API_KEY') private apiKey: string) {}
```

**Tại sao cần `@Inject()` ở đây?** Khi TypeScript compile `private apiKey: string`, `design:paramtypes` ghi `String` — không phải `'RESEND_API_KEY'`. `String` là kiểu generic, NestJS không biết bạn muốn inject string nào. `@Inject('RESEND_API_KEY')` ghi vào `SELF_DECLARED_DEPS_METADATA` → ghi đè `design:paramtypes` → Injector biết chính xác token.

**Nhược điểm string token**: dễ typo, không refactor-friendly, IDE không check.

### Symbol token

```typescript
// Define
export const MAIL_OPTIONS = Symbol('MAIL_OPTIONS')

// Khai báo
providers: [{ provide: MAIL_OPTIONS, useValue: { from: 'noreply@app.com' } }]

// Inject
constructor(@Inject(MAIL_OPTIONS) private options: MailOptions) {}
```

**Ưu điểm:** Symbol **guaranteed unique** — `Symbol('a') !== Symbol('a')`. Tránh collision khi nhiều library dùng cùng string token.

**Khi nào dùng**: Trong shared libraries, packages — nơi string token có thể trùng giữa các packages.

## 8.3 Thứ tự ưu tiên khi Injector tìm token

Với mỗi constructor parameter, Injector quyết định token theo thứ tự:

```
Parameter có @Inject(token)?
├── YES → dùng token từ @Inject() (SELF_DECLARED_DEPS_METADATA)
└── NO  → dùng class reference từ design:paramtypes
          └── design:paramtypes là primitive (String/Number/Object)?
              ├── YES → KHÔNG thể resolve → lỗi nếu không có @Inject()
              └── NO  → dùng class reference làm token
```

## 8.4 Trường hợp cần `@Inject()` bắt buộc

| Tình huống | design:paramtypes ghi gì | Cần @Inject()? |
|-----------|--------------------------|----------------|
| `constructor(private mail: MailService)` | `MailService` (class) | Không — class reference đủ |
| `constructor(private apiKey: string)` | `String` (generic) | **Có** — String không phải token cụ thể |
| `constructor(private count: number)` | `Number` (generic) | **Có** |
| `constructor(private mail: IMailService)` | `Object` (interface erased) | **Có** — interface biến mất ở runtime |
| `constructor(private client: Resend)` | `Resend` (class) | Tùy — nếu provide bằng string token thì Có |

---

# PHẦN V — MODULE SYSTEM

---

# 9. Module Encapsulation — providers vs exports vs @Global

## 9.1 `providers[]` — Kho nội bộ

Tất cả providers trong `providers[]` của cùng module **nhìn thấy nhau** — inject lẫn nhau tự do, **không cần export**:

```typescript
@Module({
  providers: [
    ResendClient,      // private — module bên ngoài không thấy
    ResendAdapter,     // inject ResendClient ✅ (cùng module)
    SmtpTransporter,   // private
    SmtpAdapter,       // inject SmtpTransporter ✅ (cùng module)
    MailAdapter,       // inject ResendAdapter + SmtpAdapter ✅ (cùng module)
    MailService,       // inject MailAdapter ✅ (cùng module)
  ],
  exports: [MailService],  // CHỈ MailService là public
})
export class MailModule {}
```

**Bên trong**: Khi Injector resolve `MailAdapter` (cần `ResendAdapter`), nó tìm trong `MailModule._providers` → thấy `ResendAdapter` → lấy luôn. Không cần check `_exports` vì cùng module.

## 9.2 `exports[]` — Public API của module

Mặc định, **mọi provider là private**. Module bên ngoài **không inject được** provider trừ khi nó nằm trong `exports[]`.

```
┌─ MailModule ──────────────────────────────────────────┐
│                                                        │
│  _providers Map:                                       │
│    ResendClient     → InstanceWrapper  [PRIVATE]       │
│    SmtpTransporter  → InstanceWrapper  [PRIVATE]       │
│    ResendAdapter    → InstanceWrapper  [PRIVATE]       │
│    SmtpAdapter      → InstanceWrapper  [PRIVATE]       │
│    MailAdapter      → InstanceWrapper  [PRIVATE]       │
│    MailService      → InstanceWrapper  [EXPORTED] ──→  │
│                                                        │
│  _exports Set: { MailService }                         │
└────────────────────────────────────────────────────────┘

AuthModule imports MailModule:
  inject MailService?     → ✅ (exported)
  inject ResendAdapter?   → ❌ UnknownDependenciesException (not exported)
  inject MailAdapter?     → ❌ (not exported)
```

### Export validation

NestJS validate khi bạn khai báo exports:
- Provider export phải **tồn tại** trong `_providers` — không thể export thứ không có
- Module export phải **tồn tại** trong `_imports` — không thể re-export module chưa import

```typescript
// ❌ Lỗi: ResendAdapter không nằm trong providers
@Module({
  providers: [MailService],
  exports: [ResendAdapter],  // Error: ResendAdapter is not a valid provider
})
```

### Tại sao encapsulation quan trọng?

| Không có encapsulation | Có encapsulation |
|------------------------|-----------------|
| AuthModule inject trực tiếp ResendAdapter | AuthModule chỉ biết MailService.send() |
| Đổi ResendAdapter sang SendGridAdapter → AuthModule phải sửa | Đổi implementation → chỉ sửa MailModule |
| N modules phụ thuộc internal details → coupling cao | Modules phụ thuộc public API → coupling thấp |
| Refactor MailModule = sửa toàn bộ app | Refactor MailModule = sửa nội bộ MailModule |

Đây chính là **encapsulation** — giống `public`/`private` trong OOP nhưng ở **module level**.

## 9.3 Re-export — Forward nguyên module

```typescript
@Module({
  imports: [MailModule, DatabaseModule, HashingModule],
  exports: [MailModule, DatabaseModule, HashingModule],  // re-export tất cả
})
export class CoreModule {}
```

Khi export **một module** (thay vì provider), tất cả exports của module đó được "forward":

```
CoreModule exports MailModule
→ MailModule exports MailService
→ Module nào import CoreModule → inject được MailService

// AuthModule chỉ cần import CoreModule thay vì import từng module
@Module({
  imports: [CoreModule],  // thay vì [MailModule, DatabaseModule, HashingModule]
})
export class AuthModule {}
```

**Khi nào dùng**: Tạo "umbrella module" (CoreModule) gộp nhiều infrastructure modules. Feature modules chỉ cần import 1 CoreModule thay vì N modules.

## 9.4 `@Global()` — Và tại sao nên hạn chế

```typescript
@Global()
@Module({
  imports: [DatabaseModule],
  exports: [DatabaseModule],
})
export class CoreModule {}
```

**Bên trong**: `NestContainer.bindGlobalScope()` thêm module vào `globalModules` Set. Khi Injector tìm dependency, sau khi tìm trong module hiện tại và imports, nó **luôn check** global modules. Tương đương như **mọi module đều import global module**.

**Lưu ý quan trọng từ source code**: Global modules có `distance = Number.MAX_VALUE` — nghĩa là chúng khởi tạo **cuối cùng** trong module distance order, nhưng lifecycle hooks chạy **đầu tiên** (vì hooks chạy ascending distance).

### Tại sao hạn chế `@Global()`?

| Vấn đề | Giải thích |
|--------|------------|
| **Implicit dependencies** | Nhìn module không biết nó depend on gì — dependency "ẩn" từ global |
| **Debug khó** | `UnknownDependenciesException` → bạn check imports[] nhưng dependency thực ra từ global module không thấy trong imports |
| **Test isolation khó** | Phải mock cả global providers khi test, kể cả module đang test không trực tiếp dùng |
| **Refactor rủi ro** | Muốn tách module ra package/microservice riêng → không biết nó ngầm depend on global gì |
| **Team coordination** | Developer mới không biết dependency đến từ đâu — implicit knowledge |

### Quy tắc thực tế

| Nên `@Global()` | Nên explicit import |
|-----------------|-------------------|
| `ConfigModule` — hầu hết modules cần config | `MailModule` — chỉ vài features gửi mail |
| `LoggerModule` — mọi nơi cần log | `HashingModule` — chỉ auth cần hash |
| `DatabaseModule` — đa số features cần DB | `TokenModule` — chỉ auth cần JWT |
| `CacheModule` — nếu dùng rộng rãi | `PaymentModule` — chỉ orders cần |

---

# 10. Dynamic Modules — forRoot / forFeature / forRootAsync

## 10.1 Vấn đề: Module cần configuration từ bên ngoài

Static module (`@Module({ providers: [...] })`) fixed mọi thứ tại compile time. Nhưng nhiều module cần **config từ bên ngoài**:

- `DatabaseModule` cần connection URL — khác nhau giữa dev/staging/production
- `MailModule` cần API key — sensitive, không hardcode
- `CacheModule` cần TTL, max size — tùy feature

Bạn **không thể hardcode** config vì mỗi app/environment dùng config khác nhau.

## 10.2 Dynamic Module — Module tạo metadata tại runtime

Dynamic Module là module có **static method** trả về `DynamicModule` object — chứa metadata giống `@Module()` nhưng được **quyết định tại runtime** dựa trên config.

```typescript
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,        // PHẢI có: reference đến module class
      global: true,                  // optional: biến thành @Global()
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,          // config truyền vào → provider
        },
        PrismaService,               // service sử dụng config
      ],
      exports: [PrismaService],      // public API
    }
  }
}

// Sử dụng:
@Module({
  imports: [DatabaseModule.forRoot({ url: 'postgres://localhost:5432/ecommerce' })],
})
export class AppModule {}
```

**Bên trong NestJS xử lý thế nào?**

1. `DependenciesScanner` gặp `DatabaseModule.forRoot(...)` → gọi method → nhận `DynamicModule` object
2. `ModuleCompiler.compile()` tách `DynamicModule` thành `type` (DatabaseModule class) + `dynamicMetadata` (providers, exports, imports, global)
3. `ModuleTokenFactory` generate token dựa trên class + **deep hash of config** → cùng config = cùng token = cùng module (tránh duplicate)
4. Dynamic metadata **merge** với static metadata từ `@Module()` decorator
5. Từ Phase 2 trở đi: **hoàn toàn giống** static module

## 10.3 Convention: forRoot vs forFeature

Đây là **naming convention** (không bắt buộc bởi framework) nhưng được adopt rộng rãi:

### `forRoot()` — Config toàn app, import 1 lần

```typescript
// AppModule — root module
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'ecommerce',
    }),
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
```

- Import **1 lần** ở root module
- Thường tạo connection, khởi tạo core infrastructure
- Thường kết hợp `global: true` để auto-available

### `forFeature()` — Config riêng cho từng feature

```typescript
// UsersModule — feature module
@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile]),  // đăng ký entities riêng
    ConfigModule.forFeature(usersConfig),            // đăng ký config namespace riêng
  ],
})
export class UsersModule {}

// OrdersModule — feature module khác
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),    // entities khác
    ConfigModule.forFeature(ordersConfig),            // config namespace khác
  ],
})
export class OrdersModule {}
```

- Import **nhiều lần** ở feature modules
- Mỗi feature đăng ký entities/config riêng
- Không tạo connection mới — dùng connection từ `forRoot()`

### `forRootAsync()` — Async config, inject dependencies

```typescript
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class AppModule {}
```

- Như `forRoot()` nhưng config là **async** — cần inject `ConfigService` để lấy config
- NestJS resolve ConfigService trước, rồi gọi factory, rồi dùng kết quả làm config

## 10.4 `ConfigModule.forFeature()` — Namespaced config

```typescript
// mail.config.ts
export default registerAs('mail', () => ({
  from: process.env.MAIL_FROM || 'noreply@example.com',
  resendApiKey: process.env.RESEND_API_KEY,
}))

// mail.module.ts
@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [MailService],
})
export class MailModule {}

// mail.service.ts
@Injectable()
export class MailService {
  constructor(
    @Inject(mailConfig.KEY) private config: ConfigType<typeof mailConfig>,
  ) {
    console.log(this.config.from)        // 'noreply@example.com'
    console.log(this.config.resendApiKey) // 'sk-xxx'
  }
}
```

`forFeature(mailConfig)` bên trong tạo provider:
```typescript
{ provide: mailConfig.KEY, useFactory: () => resolveConfig('mail') }
```

Mỗi module có **namespace config riêng** — mail module inject `mailConfig.KEY`, database module inject `databaseConfig.KEY`. Type-safe, isolated, dễ test.

## 10.5 Tổng kết Dynamic Modules

```
┌─────────────────────────────────────────────────────────┐
│  Static Module:  @Module({ providers: [...] })          │
│  → Config fixed lúc compile                             │
│                                                          │
│  Dynamic Module: Module.forRoot(config): DynamicModule   │
│  → Config dynamic lúc runtime                            │
│  → NestJS merge dynamic metadata vào module              │
│  → Từ đó xử lý giống static module                      │
│                                                          │
│  forRoot    → config toàn app, import 1 lần ở root      │
│  forFeature → config riêng, import nhiều lần ở features  │
│  forRootAsync → async config, inject dependencies        │
└─────────────────────────────────────────────────────────┘
```

> **Cách trình bày cho phỏng vấn**: "Dynamic Module có static method trả về `DynamicModule` object chứa metadata. Scanner gọi method, nhận object, merge metadata vào Module, rồi xử lý giống static module. Convention: `forRoot()` cho config toàn app import 1 lần, `forFeature()` cho config riêng import nhiều lần, `forRootAsync()` khi config cần inject dependencies."

---

> **Tiếp theo Part 2**: Injection Scopes (deep dive), Scope Bubbling & Lifetime Mismatch, Durable Providers, Circular Dependencies & forwardRef, Optional Dependencies, LazyModuleLoader & ModuleRef, Lifecycle Hooks & DI, Module Distance & Topology Tree, Practical Examples, Common Myths, Interview Q&A (20+ câu).

---

## References (Part 1)

| Resource | URL |
|----------|-----|
| DeepWiki — DI System | [deepwiki.com/nestjs/nest/3.1](https://deepwiki.com/nestjs/nest/3.1-dependency-injection-system) |
| DeepWiki — Module System | [deepwiki.com/nestjs/nest/3.2](https://deepwiki.com/nestjs/nest/3.2-module-system) |
| DeepWiki — Instance Management | [deepwiki.com/nestjs/nest/3.3](https://deepwiki.com/nestjs/nest/3.3-instance-creation-and-management) |
| DeepWiki — Core Architecture | [deepwiki.com/nestjs/nest/2](https://deepwiki.com/nestjs/nest/2-core-architecture) |
| NestJS Docs — Providers | [docs.nestjs.com/providers](https://docs.nestjs.com/providers) |
| NestJS Docs — Modules | [docs.nestjs.com/modules](https://docs.nestjs.com/modules) |
| NestJS Docs — Custom Providers | [docs.nestjs.com/fundamentals/custom-providers](https://docs.nestjs.com/fundamentals/custom-providers) |
| Source — Container | [container.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/container.ts) |
| Source — Module | [module.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/module.ts) |
| Source — InstanceWrapper | [instance-wrapper.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/instance-wrapper.ts) |
| Source — Injector | [injector.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/injector.ts) |
| Source — Scanner | [scanner.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/scanner.ts) |
| Source — InstanceLoader | [instance-loader.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/instance-loader.ts) |

---

> Dựa trên: NestJS source code @ commit `88b3ce7d`, DeepWiki, Official Docs
