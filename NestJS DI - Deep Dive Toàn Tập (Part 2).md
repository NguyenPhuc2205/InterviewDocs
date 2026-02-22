# NestJS Dependency Injection — Deep Dive Toàn Tập (Part 2)

## Advanced DI, Lifecycle & Phỏng vấn

> Tiếp nối Part 1 (Nền tảng & Cơ chế). Part 2 bao gồm các chủ đề nâng cao và toàn bộ nội dung chuẩn bị phỏng vấn.

---

## MỤC LỤC PART 2

**Phần VI — Injection Scopes (Deep Dive)**

11. [Injection Scopes — DEFAULT / REQUEST / TRANSIENT](#11-injection-scopes)
12. [Scope Bubbling & Lifetime Mismatch — Hiệu ứng dây chuyền](#12-scope-bubbling--lifetime-mismatch)
13. [Durable Providers — Giải pháp cho REQUEST scope overhead](#13-durable-providers)

**Phần VII — Circular Dependencies**

14. [Circular Dependencies & forwardRef — Giải phẫu đầy đủ](#14-circular-dependencies--forwardref)

**Phần VIII — Dynamic Resolution**

15. [Optional Dependencies — @Optional()](#15-optional-dependencies)
16. [LazyModuleLoader & ModuleRef — Resolution tại runtime](#16-lazymoduleloader--moduleref)

**Phần IX — Lifecycle & Request Pipeline**

17. [Lifecycle Hooks & DI — Thứ tự khởi tạo và shutdown](#17-lifecycle-hooks--di)
18. [Module Distance & Topology Tree](#18-module-distance--topology-tree)
19. [Enhancers (Guards, Interceptors, Pipes, Filters) & DI](#19-enhancers--di)

**Phần X — Thực hành & Phỏng vấn**

20. [Thực hành: Phân tích MailModule từ dự án thật](#20-thực-hành-phân-tích-mailmodule)
21. [Common Myths — 10 hiểu lầm phổ biến](#21-common-myths)
22. [Cách trả lời phỏng vấn — 20 câu Q&A mẫu](#22-interview-qa)

---

# PHẦN VI — INJECTION SCOPES (DEEP DIVE)

---

# 11. Injection Scopes — DEFAULT / REQUEST / TRANSIENT

## 11.1 Tổng quan 3 scopes

NestJS hỗ trợ 3 scope levels. Scope quyết định **khi nào** instance được tạo, **bao lâu** nó tồn tại, và **bao nhiêu** instance tồn tại cùng lúc.

```typescript
@Injectable({ scope: Scope.DEFAULT })    // Singleton — mặc định
@Injectable({ scope: Scope.REQUEST })    // Mỗi request 1 instance
@Injectable({ scope: Scope.TRANSIENT })  // Mỗi lần inject 1 instance mới
```

| Scope | Số instance | Tạo khi nào | Tồn tại bao lâu | Storage |
|-------|------------|-------------|------------------|---------|
| **DEFAULT** | 1 cho toàn app | Lúc bootstrap | Suốt app lifetime | `values.get(STATIC_CONTEXT)` |
| **REQUEST** | 1 per request | Khi request đến | Đến khi request kết thúc | `values.get(requestContextId)` |
| **TRANSIENT** | 1 per injection point | Mỗi lần inject | Theo lifecycle của consumer | `transientMap.get(inquirerId).get(contextId)` |

## 11.2 DEFAULT (Singleton) — Chi tiết

**Chỉ 1 instance duy nhất** cho toàn bộ app. Tạo lúc bootstrap, tồn tại mãi mãi.

```
App Start
│
├── InstanceLoader tạo 1 PrismaService instance
│
├── AuthRepository inject PrismaService → instance #1
├── UsersRepository inject PrismaService → CÙNG instance #1
├── RolesRepository inject PrismaService → VẪN instance #1
│
├── Request 1 đến → AuthService dùng → instance #1
├── Request 2 đến → UsersService dùng → CÙNG instance #1
├── ...
├── Request 10000 → vẫn instance #1
│
└── App shutdown → PrismaService.onModuleDestroy() → dọn dẹp
```

**Bên trong InstanceWrapper:**

```typescript
// Singleton lưu tại STATIC_CONTEXT — object cố định, không bao giờ đổi
const STATIC_CONTEXT: ContextId = Object.freeze({ id: 1 })

// Lúc bootstrap
wrapper.setInstanceByContextId(STATIC_CONTEXT, { instance: prismaService, isResolved: true })

// Mỗi lần inject
wrapper.getInstanceByContextId(STATIC_CONTEXT)
// → luôn trả về cùng instance
```

**Tại sao mặc định là Singleton?**

Hầu hết services — PrismaService, MailService, AuthService — là **stateless**: nhận input → xử lý → trả output. Chúng không giữ state riêng per-request. Tạo mới mỗi lần inject = lãng phí memory + CPU + time.

Ví dụ: `PrismaService` quản lý **connection pool** — 1 pool phục vụ hàng nghìn requests. Tạo mới mỗi request = mở connection mới = nhanh chóng hết connection limit.

## 11.3 REQUEST — Chi tiết

**Instance mới mỗi HTTP request.** Mỗi request có `ContextId` riêng.

```
Request #1 arrive
│ └── ContextIdFactory.create() → contextId_1
│     └── Container tạo MỚI: TenantService #1 (cho request #1)
│     └── TenantService #1 lưu tenant info từ request header
│
Request #2 arrive (cùng lúc, khác tenant)
│ └── ContextIdFactory.create() → contextId_2
│     └── Container tạo MỚI: TenantService #2 (cho request #2)
│     └── TenantService #2 lưu tenant info KHÁC
│
Request #1 kết thúc → contextId_1 hết reference → GC dọn → TenantService #1 bị dọn
Request #2 kết thúc → contextId_2 hết reference → GC dọn → TenantService #2 bị dọn
```

**Bên trong:**

```typescript
// Mỗi request
const contextId = ContextIdFactory.create()  // unique context object

// Đăng ký request object với contextId
moduleRef.registerRequestByContextId(request, contextId)
// → REQUEST token inject sẽ trả về request object này

// Resolve provider cho request này
const tenantService = await wrapper.getInstanceByContextId(contextId)
// Nếu chưa tạo → Injector tạo mới → lưu vào values WeakMap với key = contextId
// Nếu đã tạo (cùng request, provider khác cũng cần) → trả về instance đã tạo
```

**Inject request object:**

```typescript
@Injectable({ scope: Scope.REQUEST })
class TenantService {
  constructor(@Inject(REQUEST) private request: Request) {
    // request object của HTTP request hiện tại
    this.tenantId = request.headers['x-tenant-id']
  }
}
```

**Khi nào dùng REQUEST scope:**

| Use case | Giải thích |
|----------|------------|
| **Multi-tenancy** | Mỗi request từ tenant khác nhau, service cần biết đang serve tenant nào |
| **Request-scoped caching** | Cache data trong 1 request (tránh query DB trùng), reset sau mỗi request |
| **Audit logging** | Logger kèm request metadata: user ID, IP, trace ID, timestamp |
| **Per-request transaction** | Database transaction scope theo request — rollback nếu request fail |

## 11.4 TRANSIENT — Chi tiết

**Instance mới mỗi lần inject** — kể cả cùng request, mỗi consumer nhận instance riêng.

```
AuthService inject Logger   → Logger instance #1 (cho AuthService)
UsersService inject Logger  → Logger instance #2 (cho UsersService - KHÁC!)
MailService inject Logger   → Logger instance #3 (cho MailService - KHÁC!)

// Kể cả trong CÙNG request:
Request #1:
  AuthService → Logger #1a
  UsersService → Logger #2a

Request #2:
  AuthService → Logger #1b (KHÁC #1a vì khác request)
  UsersService → Logger #2b
```

**Bên trong InstanceWrapper:**

```typescript
// Transient dùng transientMap — key là (inquirerId, contextId)
// inquirerId = UUID của consumer (AuthService, UsersService...)
// contextId = request context

const instance = wrapper.getInstanceByInquirerId(contextId, authServiceId)
// Mỗi cặp (consumer + request) → instance riêng
```

**Khi nào dùng TRANSIENT:**

| Use case | Giải thích |
|----------|------------|
| **Prefixed Logger** | Mỗi service có Logger với prefix riêng: `[AuthService] message`, `[MailService] message` |
| **Stateful utility** | Utility giữ state không nên share: buffer, counter, accumulator |
| **Strategy pattern** | Mỗi consumer cần strategy instance riêng với config khác nhau |

---

# 12. Scope Bubbling & Lifetime Mismatch

## 12.1 Lifetime Mismatch — Vấn đề cốt lõi

**Lifetime Mismatch** xảy ra khi provider có lifetime **dài hơn** inject provider có lifetime **ngắn hơn**.

```typescript
// AuthService là Singleton (lifetime = toàn app)
@Injectable()  // scope: DEFAULT
class AuthService {
  constructor(private logger: RequestLogger) {}
  // ❌ RequestLogger là REQUEST scope (lifetime = 1 request)
  // AuthService giữ reference đến RequestLogger từ... request nào?
}
```

**Vấn đề**: AuthService (Singleton) được tạo **1 lần** lúc bootstrap. Constructor nhận `RequestLogger` instance — nhưng instance đó thuộc request nào? Lúc bootstrap chưa có request! Và khi request #1 đến, AuthService vẫn dùng RequestLogger từ lúc bootstrap. Request #2 đến, AuthService vẫn dùng **cùng RequestLogger cũ**. Data từ request #1 leak sang request #2 → **sai logic, sai tenant, sai user**.

## 12.2 Scope Bubbling — NestJS tự động "nâng" scope

NestJS giải quyết Lifetime Mismatch bằng **Scope Bubbling**: nếu provider A depend on provider B có scope "ngắn hơn", NestJS tự động **nâng** A lên scope của B.

```
Dependency chain:
AuthController → AuthService → MailService → Logger (REQUEST scope)

Scope bubbling:
Logger         = REQUEST (khai báo)
MailService    = REQUEST (nâng lên — vì depend on Logger REQUEST)
AuthService    = REQUEST (nâng lên — vì depend on MailService REQUEST)
AuthController = REQUEST (nâng lên — vì depend on AuthService REQUEST)
```

**Quy tắc bubbling:**

```
Scope của provider = MAX(scope của chính nó, scope của TẤT CẢ dependencies)

Trong đó: TRANSIENT > REQUEST > DEFAULT

Ví dụ:
- AuthService(DEFAULT) depend on Logger(REQUEST)
  → scope = MAX(DEFAULT, REQUEST) = REQUEST
  → AuthService "bị nâng" lên REQUEST

- MailService(DEFAULT) depend on TransientLogger(TRANSIENT)
  → scope = MAX(DEFAULT, TRANSIENT) = TRANSIENT
  → MailService "bị nâng" lên TRANSIENT
```

## 12.3 Tại sao phải nâng? — Giải thích bản chất

Hình dung cụ thể:

```
Giả sử AuthService KHÔNG bị nâng (vẫn Singleton):

App Start → tạo AuthService (Singleton) → inject Logger từ... đâu?
  → Lúc bootstrap chưa có request → Logger REQUEST scope không thể tạo
  → NestJS buộc phải tạo Logger "giả" hoặc... không tạo → lỗi

Hoặc nếu AuthService tạo xong với Logger từ request #1:

Request #1 → AuthService dùng Logger #1 (data: user=Alice, ip=1.1.1.1) ✅
Request #2 → AuthService VẪN dùng Logger #1 (data: user=Alice, ip=1.1.1.1) ❌
             Logger lẫn data từ request #1 → WRONG!

NestJS giải quyết: nâng AuthService lên REQUEST scope
→ Mỗi request tạo AuthService MỚI → inject Logger MỚI → data đúng
```

## 12.4 Impact thực tế — Performance

**Scope Bubbling tạo cascade effect:**

Một REQUEST-scoped Logger nhỏ → MailService phải tạo mới mỗi request → AuthService phải tạo mới → AuthController phải tạo mới → **toàn bộ chain** tạo mới mỗi request.

```
Singleton (bình thường):
  App có 50 providers → tạo 50 lần lúc bootstrap → xong
  1000 requests → dùng 50 instances cũ → 0 instance mới

Với 1 REQUEST-scoped provider ở cuối chain:
  Chain depth = 10 providers bị bubbling
  1000 requests × 10 providers = 10,000 instances tạo mới
  + constructor injection overhead × 10,000
  + GC phải dọn 10,000 instances
  → Performance tụt đáng kể
```

## 12.5 Best practices để giảm Scope Bubbling

| Strategy | Giải thích |
|----------|------------|
| **Hạn chế REQUEST scope** | Chỉ dùng khi THẬT SỰ cần state per-request |
| **Đặt ở cuối chain** | REQUEST-scoped provider nên ít dependencies nhất có thể |
| **Dùng Durable Providers** | Cache instance theo tenant → giảm tạo mới |
| **Inject REQUEST object trực tiếp** | Thay vì toàn service là REQUEST scope, chỉ inject request object khi cần |
| **Event-driven thay thế** | Emit event chứa request context thay vì inject request-scoped service |

---

# 13. Durable Providers — Giải pháp cho REQUEST scope overhead

## 13.1 Vấn đề mà Durable Providers giải quyết

REQUEST scope tạo instance mới **mỗi request** — kể cả 1000 requests từ **cùng tenant** đều tạo 1000 instances giống nhau. Lãng phí.

## 13.2 Durable Provider — Cache theo context

```typescript
@Injectable({ scope: Scope.REQUEST, durable: true })
export class TenantService {
  constructor(@Inject(REQUEST) private request: Request) {
    this.tenantId = request.headers['x-tenant-id']
  }
}
```

**Bên trong**: `InstanceWrapper.durable = true` → NestJS **cache** instance theo tenant/context ID. Requests từ cùng tenant reuse instance thay vì tạo mới.

```
Durable Provider behavior:

Tenant A - Request #1 → tạo MỚI TenantService (tenant=A)
Tenant A - Request #2 → REUSE TenantService (tenant=A) ← cache hit!
Tenant A - Request #3 → REUSE ← cache hit!
Tenant B - Request #4 → tạo MỚI TenantService (tenant=B)
Tenant B - Request #5 → REUSE (tenant=B) ← cache hit!
```

## 13.3 Custom ContextIdStrategy

Để Durable Providers hoạt động, bạn cần nói cho NestJS biết cách xác định context nào = context nào:

```typescript
// Đăng ký strategy
ContextIdFactory.apply({
  attach(contextId: ContextId, request: Request) {
    const tenantId = request.headers['x-tenant-id']
    // Nếu cùng tenantId → trả về cùng contextId → reuse instances
    if (tenantIdToContextId.has(tenantId)) {
      return tenantIdToContextId.get(tenantId)
    }
    tenantIdToContextId.set(tenantId, contextId)
    return contextId
  },
})
```

**Khi nào dùng**: Multi-tenancy applications nơi nhiều requests từ cùng tenant nên share instances. Giảm overhead đáng kể so với REQUEST scope thuần.

---

# PHẦN VII — CIRCULAR DEPENDENCIES

---

# 14. Circular Dependencies & forwardRef — Giải phẫu đầy đủ

## 14.1 Vấn đề: Bế tắc "con gà - quả trứng"

```typescript
@Injectable()
class AuthService {
  constructor(private usersService: UsersService) {}
  // AuthService cần UsersService: kiểm tra user tồn tại khi login
}

@Injectable()
class UsersService {
  constructor(private authService: AuthService) {}
  // UsersService cần AuthService: validate token khi update profile
}
```

Tạo ai trước?
- `AuthService` cần `UsersService` instance sẵn sàng
- `UsersService` cần `AuthService` instance sẵn sàng
- **Bế tắc** — không ai có thể tạo trước

## 14.2 NestJS phát hiện cycle thế nào?

Khi Injector chạy **không có** `forwardRef`:

```
1. Injector bắt đầu resolve AuthService
2. SettlementSignal.insertRef(AuthService) → ghi nhận "đang resolve AuthService"
3. Đọc constructor → cần UsersService → resolve UsersService
4. SettlementSignal.insertRef(UsersService) → ghi nhận "đang resolve UsersService"
5. Đọc constructor → cần AuthService → resolve AuthService
6. SettlementSignal.insertRef(AuthService) → AuthService ĐÃ CÓ trong chain!
7. isCycle() → TRUE → throw CircularDependencyException
```

`SettlementSignal` duy trì **resolution chain** — mỗi lần bắt đầu resolve, nó ghi token vào chain. Gặp lại token đã ghi = cycle.

## 14.3 `forwardRef()` — "Tạo tôi trước, inject sau"

```typescript
@Injectable()
class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
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

`forwardRef(() => UsersService)` nói với NestJS: "Tôi cần UsersService, nhưng **đừng chờ** nó resolve xong mới tạo tôi. Cứ tạo tôi trước — inject UsersService vào **sau**."

## 14.4 7 bước xử lý bên trong — Source code thật

**Source**: `SettlementSignal` ([`settlement-signal.ts`](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/settlement-signal.ts)) + `Injector` ([`injector.ts`](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/injector.ts))

**Bước 1 — Phát hiện forwardRef**: Injector gặp param có `forwardRef` property → gọi `resolveParamToken()` → đánh dấu `wrapper.forwardRef = true`.

**Bước 2 — Evaluate callback**: Gọi `param.forwardRef()` → callback `() => UsersService` trả về class `UsersService`. Callback hoạt động vì **closure** + **JavaScript hoisting** — class đã defined tại thời điểm callback execute (khác với thời điểm decorator evaluate). Đây là lý do dùng `() => UsersService` thay vì `UsersService` trực tiếp.

**Bước 3 — Phát hiện cycle**: `SettlementSignal.insertRef(AuthService)` → resolve chain gặp lại AuthService → `isCycle() = true`.

**Bước 4 — Defer resolution**: Trong `resolveComponentHost()`:

```typescript
if (!instanceHost.isResolved && instanceWrapper.forwardRef) {
  // UsersService chưa sẵn sàng, nhưng có forwardRef
  // → KHÔNG chờ, tiến hành tạo AuthService trước
  // → Dùng donePromise.then() để inject UsersService sau
}
```

**Bước 5 — Tạo AuthService "tạm"**: NestJS gọi `new AuthService(undefined)` — param `usersService` = `undefined` tạm thời. AuthService tồn tại trong memory, nhưng chưa đầy đủ.

**Bước 6 — Tạo UsersService**: Resolve UsersService → cần AuthService → AuthService **đã tồn tại** (bước 5, kể cả chưa đầy đủ) → inject thành công → `new UsersService(authServiceInstance)`.

**Bước 7 — Backfill**: Quay lại AuthService → **gán** `usersService` = UsersService instance vừa tạo. `SettlementSignal.complete()` đánh dấu cả hai resolved.

```
Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Resolve AuthService
2. Phát hiện: cần UsersService (forwardRef) → cycle detected
3. Tạo AuthService(undefined) → instance tồn tại, chưa đầy đủ
4. Resolve UsersService
5. UsersService cần AuthService → ĐÃ CÓ (từ bước 3) → inject
6. new UsersService(authInstance) → OK
7. Backfill: authService.usersService = usersInstance
8. Cả hai resolved hoàn tất
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 14.5 Circular ở cấp module

```typescript
@Module({
  imports: [forwardRef(() => ModuleBModule)],
})
export class ModuleAModule {}

@Module({
  imports: [forwardRef(() => ModuleAModule)],
})
export class ModuleBModule {}
```

Cơ chế tương tự — Scanner dùng `ctxRegistry` phát hiện circular imports, `forwardRef` defer resolution.

## 14.6 Khi nào forwardRef KHÔNG đủ — Dấu hiệu redesign

`forwardRef` là **workaround** — nó cho phép code chạy nhưng **không fix** vấn đề thiết kế. Circular dependency là **code smell** — 2 classes có responsibilities chồng chéo.

**Giải pháp kiến trúc:**

| Approach | Cách làm | Ví dụ |
|----------|----------|-------|
| **Extract shared logic** | Tách logic cả A và B cần vào service thứ 3 (C). A và B depend on C, không depend on nhau | AuthService và UsersService cùng cần validate → tách `ValidationService` |
| **Event-driven** | A emit event → B lắng nghe. Không compile-time dependency | AuthService emit `UserLoggedIn` → UsersService subscribe |
| **Mediator pattern** | Tạo mediator class phối hợp A và B | `UserAuthMediator` gọi cả AuthService và UsersService |
| **Xem lại boundaries** | Có thể A và B nên merge (nếu quá liên quan) hoặc tách khác (nếu responsibilities sai) | — |

---

# PHẦN VIII — DYNAMIC RESOLUTION

---

# 15. Optional Dependencies — @Optional()

## 15.1 Vấn đề

Đôi khi dependency **có thể không tồn tại** — và bạn muốn service vẫn hoạt động, chỉ bỏ qua feature đó.

## 15.2 Cách dùng

```typescript
@Injectable()
class NotificationService {
  constructor(
    private readonly mailService: MailService,  // bắt buộc — lỗi nếu không có
    @Optional() @Inject('SLACK_CLIENT') private slackClient?: SlackClient,  // optional
    @Optional() @Inject('SMS_SERVICE') private smsService?: SmsService,     // optional
  ) {}

  async notify(userId: string, message: string) {
    // Mail luôn gửi (bắt buộc)
    await this.mailService.send(userId, message)

    // Slack gửi nếu có client
    if (this.slackClient) {
      await this.slackClient.postMessage(message)
    }

    // SMS gửi nếu có service
    if (this.smsService) {
      await this.smsService.send(userId, message)
    }
  }
}
```

## 15.3 Bên trong NestJS xử lý

`@Optional()` ghi metadata vào `OPTIONAL_DEPS_METADATA` tại index tương ứng.

Khi Injector chạy `resolveConstructorParams()`:

```
Với mỗi constructor parameter:
  1. Thử resolve dependency bình thường (lookupComponent)
  2. Nếu tìm thấy → inject như bình thường
  3. Nếu KHÔNG tìm thấy:
     ├── Check: optionalDependenciesIds.includes(paramIndex)?
     │   ├── YES (có @Optional()) → trả về undefined, KHÔNG throw
     │   └── NO  (không có @Optional()) → throw UnknownDependenciesException
```

## 15.4 Optional trong Factory providers

```typescript
providers: [{
  provide: 'NOTIFICATION_SERVICE',
  useFactory: (mail: MailService, slack?: SlackClient) => {
    return new NotificationService(mail, slack)
  },
  inject: [
    MailService,
    { token: 'SLACK_CLIENT', optional: true },  // optional factory dep
  ],
}]
```

Khi `token: 'SLACK_CLIENT'` không có provider → `slack` = `undefined` thay vì lỗi.

**Khi nào dùng**: Plugin system, conditional features, optional integrations — nơi feature availability phụ thuộc vào config hoặc environment.

---

# 16. LazyModuleLoader & ModuleRef — Resolution tại runtime

## 16.1 LazyModuleLoader — Load module khi cần

Mặc định NestJS load tất cả modules lúc bootstrap. Một số modules nặng (report generation, analytics, data migration) không cần ngay → lãng phí startup time.

```typescript
@Injectable()
class ReportController {
  constructor(private lazyModuleLoader: LazyModuleLoader) {}

  @Get('generate')
  async generateReport() {
    // ReportModule chỉ load KHI CẦN — không lúc bootstrap
    const moduleRef = await this.lazyModuleLoader.load(() => ReportModule)
    const reportService = moduleRef.get(ReportService)
    return reportService.generate()
  }
}
```

**Bên trong**: `LazyModuleLoader.load()` chạy **mini-bootstrap** cho module đó:
1. Scan ReportModule (và transitive imports)
2. Wrap providers
3. Resolve dependencies
4. Load instances
5. Trả về `ModuleRef` cho module vừa load

Module lazy-loaded **không nằm** trong initial module graph — NestJS không biết nó tồn tại cho đến khi `.load()` gọi.

**Khi nào dùng:**
- Serverless/cold-start optimization — load modules theo demand
- Heavy modules ít dùng — report, migration, analytics
- Plugin architecture — load plugins dynamically

**Lưu ý**: Lazy-loaded modules **không trigger** lifecycle hooks (`OnModuleInit`, `OnApplicationBootstrap`). Chỉ eager-loaded modules mới chạy hooks.

## 16.2 ModuleRef — Dynamic resolution

`ModuleRef` cho phép **resolve provider tại runtime** thay vì chỉ qua constructor. Mỗi module tự động có `ModuleRef` available.

```typescript
@Injectable()
class DynamicService {
  constructor(private moduleRef: ModuleRef) {}

  async doSomething() {
    // 1. get() — Lấy Singleton instance (đã tạo sẵn)
    const mailService = this.moduleRef.get(MailService)
    // Synchronous — chỉ cho DEFAULT scope
    // Lỗi nếu provider là REQUEST/TRANSIENT

    // 2. resolve() — Resolve scoped instance
    const logger = await this.moduleRef.resolve(RequestLogger)
    // Asynchronous — cho REQUEST/TRANSIENT scope
    // Mỗi lần gọi có thể trả về instance khác

    // 3. create() — Tạo instance mới ngoài container
    const temp = await this.moduleRef.create(TempService)
    // Instance KHÔNG được quản lý bởi container
    // Không có lifecycle hooks, không auto-dispose
  }
}
```

### `get()` vs `resolve()` vs `create()`

| Method | Scope support | Sync/Async | Container quản lý? | Use case |
|--------|--------------|------------|--------------------|---------|
| `get(token)` | DEFAULT only | Sync | Có | Lấy singleton đã tạo |
| `resolve(token, contextId?)` | All scopes | Async | Có | Resolve scoped instances |
| `create(type)` | N/A | Async | **Không** | Tạo instance độc lập |

### `get()` với `strict` option

```typescript
// strict: true (default) — chỉ tìm trong module hiện tại
this.moduleRef.get(MailService)  // Lỗi nếu MailService không trong module này

// strict: false — tìm toàn bộ container
this.moduleRef.get(MailService, { strict: false })  // Tìm xuyên modules
```

**Lưu ý quan trọng**: `ModuleRef.get()` và `resolve()` thực chất là **Service Locator pattern** — class biết container và chủ động gọi. Chỉ dùng khi **constructor injection không đủ** (ví dụ: runtime strategy selection, factory pattern). Ưu tiên constructor injection trong mọi trường hợp có thể.

---

# PHẦN IX — LIFECYCLE & REQUEST PIPELINE

---

# 17. Lifecycle Hooks & DI — Thứ tự khởi tạo và shutdown

## 17.1 Tổng quan 5 lifecycle hooks

NestJS cung cấp 5 hooks cho phép providers/controllers/modules tham gia vào quá trình khởi tạo và shutdown:

| Hook | Interface | Khi nào chạy | Thứ tự modules |
|------|-----------|-------------|----------------|
| `onModuleInit()` | `OnModuleInit` | Sau khi dependencies của module đã resolve | Ascending distance (xa root → gần root) |
| `onApplicationBootstrap()` | `OnApplicationBootstrap` | Sau khi TẤT CẢ modules init xong | Ascending distance |
| `onModuleDestroy()` | `OnModuleDestroy` | Trước khi module bị cleanup | **Descending** distance (gần root → xa root) |
| `beforeApplicationShutdown(signal?)` | `BeforeApplicationShutdown` | Trước khi server connections close | Descending distance |
| `onApplicationShutdown(signal?)` | `OnApplicationShutdown` | Sau khi tất cả cleanup xong | Descending distance |

## 17.2 Thứ tự thực thi — Startup

```
1. Phase 1-4: Scan → Wrap → Resolve → Load (tạo instances)
2. onModuleInit() — theo ascending distance
   ├── DatabaseModule.onModuleInit()     (distance=3, chạy trước)
   ├── MailModule.onModuleInit()         (distance=2)
   ├── AuthModule.onModuleInit()         (distance=1)
   └── AppModule.onModuleInit()          (distance=0, chạy cuối)
3. onApplicationBootstrap() — theo ascending distance
   ├── DatabaseModule.onApplicationBootstrap()
   └── ... (cùng thứ tự)
4. Listen for connections (HTTP server start)
```

**Tại sao ascending distance?** Module xa root (foundation modules) init trước để modules gần root (feature modules) có thể dùng. Ví dụ: DatabaseModule phải init connection trước khi AuthModule dùng.

**Bên trong mỗi module**, hooks chạy theo thứ tự: **providers → controllers → injectables** — giống Phase 4 Loading.

## 17.3 Thứ tự thực thi — Shutdown

```
1. onModuleDestroy() — theo descending distance (NGƯỢC với startup)
   ├── AppModule.onModuleDestroy()       (distance=0, chạy TRƯỚC)
   ├── AuthModule.onModuleDestroy()      (distance=1)
   └── DatabaseModule.onModuleDestroy()  (distance=3, chạy CUỐI)
2. beforeApplicationShutdown(signal) — descending distance
3. Close server connections (HTTP server stop)
4. onApplicationShutdown(signal) — descending distance
```

**Tại sao descending distance?** Feature modules cleanup trước, foundation modules cleanup cuối. Ví dụ: AuthModule phải ngừng dùng DB connection trước khi DatabaseModule đóng connection.

## 17.4 Enable shutdown hooks

```typescript
const app = await NestFactory.create(AppModule)
app.enableShutdownHooks()  // PHẢI gọi — mặc định OFF
await app.listen(3000)
```

`enableShutdownHooks()` đăng ký process signal listeners (`SIGTERM`, `SIGINT`). Khi app nhận signal → trigger shutdown sequence → cleanup gracefully.

## 17.5 Ví dụ thực tế

```typescript
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client: PrismaClient

  async onModuleInit() {
    // Kết nối database SAU KHI instance đã tạo xong
    this.client = new PrismaClient()
    await this.client.$connect()
  }

  async onModuleDestroy() {
    // Đóng connection TRƯỚC KHI app shutdown
    await this.client.$disconnect()
  }
}
```

---

# 18. Module Distance & Topology Tree

## 18.1 Module Distance là gì?

Mỗi module có **distance** — khoảng cách từ root module (AppModule). NestJS dùng distance để:
1. **Xác định thứ tự lifecycle hooks** (ascending/descending)
2. **Ưu tiên provider lookup** khi nhiều modules export cùng token

## 18.2 Cách tính distance

`TopologyTree` class duyệt module graph bằng **depth-first traversal**:

```
AppModule (distance: 0)
├── CoreModule (distance: 1)
│   ├── DatabaseModule (distance: 2)
│   ├── MailModule (distance: 2)
│   └── HashingModule (distance: 2)
├── AuthModule (distance: 1)
└── UsersModule (distance: 1)

@Global() modules → distance: Number.MAX_VALUE (khởi tạo cuối)
```

**Source**: [`topology-tree.ts`](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/topology-tree/topology-tree.ts#L4-L53)

## 18.3 Provider lookup priority

Khi 2 modules export **cùng token**, module **gần root hơn** (distance nhỏ hơn) được ưu tiên. Nếu cùng distance → phụ thuộc insertion order — **không nên dựa vào**.

**Best practice**: Tránh export cùng token từ nhiều modules. Dùng custom injection token (string/Symbol) nếu cần phân biệt.

---

# 19. Enhancers (Guards, Interceptors, Pipes, Filters) & DI

## 19.1 Enhancers tham gia DI thế nào?

Guards, Interceptors, Pipes, Filters đều là **providers** — chúng inject dependencies qua constructor giống services bình thường.

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  // Guard inject TokenService — DI bình thường
  constructor(private tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const token = context.switchToHttp().getRequest().headers.authorization
    return this.tokenService.verify(token)
  }
}
```

## 19.2 Enhancers trong DI Container

Enhancers đăng ký vào `_injectables` collection (không phải `_providers`):

```typescript
// Module._injectables: Map<token, InstanceWrapper>
// Mỗi enhancer có subtype: 'guard' | 'interceptor' | 'pipe' | 'filter'
```

Phase 4 Loading tạo injectables **cuối cùng** (sau providers và controllers) — đảm bảo dependencies đã sẵn sàng.

## 19.3 Request Pipeline & DI Context

```
Request arrive
│
├── Middleware (Express/Fastify level — KHÔNG tham gia NestJS DI)
│
├── Guards — DI-resolved, inject services bình thường
│   └── AuthGuard(tokenService) → canActivate()
│
├── Interceptors (pre-handler) — DI-resolved
│   └── LoggingInterceptor(logger) → intercept()
│
├── Pipes — DI-resolved
│   └── ValidationPipe(validator) → transform()
│
├── Route Handler — Controller method
│   └── AuthController(authService) → login()
│
├── Interceptors (post-handler)
│   └── Response transformation
│
└── Exception Filters — DI-resolved
    └── HttpExceptionFilter(logger) → catch()
```

**Key insight**: Tất cả enhancers (trừ middleware Express/Fastify) đều tham gia DI system — có thể inject services, repositories, config.

---

# PHẦN X — THỰC HÀNH & PHỎNG VẤN

---

# 20. Thực hành: Phân tích MailModule từ dự án thật

```typescript
@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [ResendClient, SmtpTransporter, ResendAdapter, SmtpAdapter, MailAdapter, MailService],
  exports: [MailService],
})
export class MailModule {}
```

### Phase 1 — Scanning
Scanner tìm MailModule trong CoreModule.imports → đọc metadata → 6 providers, 1 dynamic import (ConfigModule.forFeature), 1 export.

### Phase 2 — Wrapping
6 InstanceWrappers rỗng: tất cả `isResolved: false`, `instance: undefined`.

### Phase 3 — Resolution (dependency graph)

```
MailService       → [MailAdapter]
MailAdapter       → [ResendAdapter, SmtpAdapter, ConfigService]
ResendAdapter     → [ResendClient]
SmtpAdapter       → [SmtpTransporter]
ResendClient      → [ConfigService]      ← từ ConfigModule (imported)
SmtpTransporter   → [ConfigService]      ← từ ConfigModule (imported)
```

ConfigService không trong MailModule._providers → tìm trong _imports → ConfigModule (dynamic) export ConfigService → resolved.

### Phase 4 — Loading (bottom-up)

```
1. ConfigService đã sẵn (từ ConfigModule)
2. new ResendClient(configService)       → isResolved = true
3. new SmtpTransporter(configService)    → isResolved = true
4. new ResendAdapter(resendClient)       → isResolved = true
5. new SmtpAdapter(smtpTransporter)      → isResolved = true
6. new MailAdapter(resend, smtp, config) → isResolved = true
7. new MailService(mailAdapter)          → isResolved = true
```

### Cross-module injection: AuthService → MailService

```
1. Injector tìm MailService → AuthModule._providers → KHÔNG CÓ
2. AuthModule._imports → CoreModule → re-exports MailModule
3. MailModule._providers.has(MailService) → YES
4. MailModule._exports.has(MailService) → YES
5. Lấy InstanceWrapper → values.get(STATIC_CONTEXT) → singleton instance (bước 7)
6. Inject vào AuthService constructor
```

---

# 21. Common Myths — 10 hiểu lầm phổ biến

| # | Hiểu lầm | Sự thật |
|---|-----------|---------|
| 1 | "Provider tạo khi inject lần đầu" | Singleton tạo khi **bootstrap**, trước mọi request. Không lazy |
| 2 | "Controller tạo trước Service" | InstanceLoader tạo **providers trước**, controllers sau — luôn luôn |
| 3 | "`forwardRef` giải quyết mọi circular" | Chỉ workaround. Circular hầu hết là **design smell** cần redesign |
| 4 | "`@Injectable()` sinh metadata" | `@Injectable()` là **marker**. Metadata do **TypeScript compiler** emit khi class có decorator |
| 5 | "`@Global()` nhanh hơn explicit import" | Performance giống nhau. `@Global()` chỉ tự động available — Injector vẫn lookup qua Map |
| 6 | "Thứ tự trong `providers[]` quan trọng" | Không. Injector dựa **dependency graph**, không phải thứ tự khai báo |
| 7 | "Không `@Injectable()` thì không inject được" | Class không có deps trong constructor vẫn inject được. Nhưng **nên luôn dùng** |
| 8 | "REQUEST scope chỉ ảnh hưởng 1 provider" | **Scope Bubbling** lan ngược toàn chain. 1 REQUEST Logger → cả chain tạo mới mỗi request |
| 9 | "NestJS scan toàn bộ project files" | NestJS chỉ đọc **module tree** từ root. Provider không đăng ký = không tồn tại |
| 10 | "`ModuleRef.get()` là DI" | Đó là **Service Locator** pattern. DI thật = constructor injection |

---

# 22. Cách trả lời phỏng vấn — 20 câu Q&A mẫu

> Mỗi câu trả lời viết theo format phỏng vấn thật — ngắn gọn, đi thẳng bản chất, có dẫn chứng kỹ thuật.

---

### Q1: "IoC và DI khác nhau thế nào?"

> IoC — Inversion of Control — là **nguyên lý**: đảo ngược quyền kiểm soát từ code sang framework. Thay vì class tự tạo dependencies, framework nhận trách nhiệm đó.
>
> DI — Dependency Injection — là **kỹ thuật cụ thể** implement IoC. NestJS dùng Constructor Injection: framework đọc constructor parameters, resolve từng dependency, rồi truyền vào khi tạo instance.
>
> IoC là "cái gì" (nguyên lý). DI là "làm thế nào" (kỹ thuật). NestJS implement cả hai.

---

### Q2: "NestJS provider mặc định là Singleton hay tạo mới?"

> Mặc định **Singleton** — scope `DEFAULT`. 1 instance duy nhất, tạo lúc bootstrap, shared cho toàn app.
>
> Bên trong, instance lưu trong `InstanceWrapper.values` với key `STATIC_CONTEXT` cố định. `PrismaService` chỉ mở 1 connection pool cho toàn app nhờ Singleton.
>
> Nếu cần scope khác: `Scope.REQUEST` tạo mới per-request, `Scope.TRANSIENT` tạo mới per-injection. Nhưng cẩn thận **Scope Bubbling** — REQUEST scope lan ngược toàn chain.

---

### Q3: "`providers` và `exports` khác nhau thế nào?"

> `providers` đăng ký class vào Container **nội bộ** module. Providers cùng module inject nhau tự do, không cần export.
>
> `exports` chỉ định providers nào **public** cho bên ngoài. Provider không export = invisible.
>
> Ví dụ: MailModule có 6 providers nhưng chỉ export MailService. Module ngoài chỉ biết `send()`, không biết dùng Resend hay SMTP. Đây là **encapsulation** — đổi implementation bên trong không ảnh hưởng bên ngoài.

---

### Q4: "`@Injectable()` thực sự làm gì?"

> `@Injectable()` đóng 2 vai trò. **Thứ nhất**: marker cho Scanner nhận diện class là provider. **Thứ hai**, quan trọng hơn: vì nó là decorator, TypeScript compiler emit `design:paramtypes` metadata — chứa kiểu constructor params. Injector đọc metadata này biết cần inject gì.
>
> Không có decorator → TypeScript không emit → Injector không biết constructor cần gì → `UnknownDependenciesException`.

---

### Q5: "InstanceWrapper là gì? Tại sao cần?"

> InstanceWrapper là **metadata container** bọc quanh provider. Nó quản lý instance thật cùng scope, lifecycle state, dependencies.
>
> Container cần wrapper vì phải biết nhiều hơn chỉ instance: scope nào? Đã resolve chưa? Instance nào cho request nào?
>
> Bên trong dùng `WeakMap<ContextId, Instance>`. Singleton dùng key `STATIC_CONTEXT` cố định. REQUEST dùng requestId. Dùng WeakMap để GC tự dọn khi request kết thúc — tránh memory leak.

---

### Q6: "Giải thích Scope Bubbling?"

> Scope Bubbling xảy ra khi Singleton depend on REQUEST-scoped provider. NestJS buộc **nâng** Singleton lên REQUEST scope.
>
> Lý do: Singleton giữ reference đến REQUEST instance từ request #1. Request #2 đến, Singleton vẫn dùng instance cũ → lẫn data. Phải tạo mới Singleton mỗi request để inject đúng instance.
>
> Impact: 1 REQUEST-scoped Logger nhỏ → cả chain 10 providers tạo mới mỗi request. Best practice: hạn chế REQUEST scope, đặt cuối chain, cân nhắc Durable Providers.

---

### Q7: "NestJS xử lý circular dependency thế nào?"

> Circular: A cần B, B cần A — bế tắc. NestJS cung cấp `forwardRef()`.
>
> Cơ chế: `SettlementSignal` phát hiện cycle. NestJS tạo A với B = undefined (tạm). Tạo B inject A (đã tồn tại). Backfill B vào A. `SettlementSignal.complete()` đánh dấu hoàn tất.
>
> Nhưng `forwardRef` là workaround. Circular = code smell. Giải pháp đúng: tách logic chung vào service thứ 3, hoặc dùng event-driven pattern.

---

### Q8: "4 loại Provider?"

> **useClass** — phổ biến nhất. Container đọc metadata, resolve deps, gọi `new Class(deps)`.
>
> **useValue** — set instance trực tiếp. Cho constants, config, mock testing.
>
> **useFactory** — Container gọi function factory với resolved deps. Phải khai báo `inject[]` vì function không có TypeScript metadata. Cho logic phức tạp, async, conditional.
>
> **useExisting** — alias đến provider đã có, cùng instance. Cho migration, multiple names.

---

### Q9: "Bootstrap flow từ `NestFactory.create()` đến app sẵn sàng?"

> 4 phase: **Scanning** — DependenciesScanner đệ quy đọc @Module metadata, xây module graph. **Wrapping** — tạo InstanceWrapper rỗng, chưa có instance. **Resolution** — Injector phân tích constructor metadata, xây dependency graph bottom-up. **Loading** — InstanceLoader tạo instances: providers → controllers → injectables.
>
> Sau đó: lifecycle hooks chạy (OnModuleInit → OnApplicationBootstrap) → HTTP server listen.

---

### Q10: "Tại sao `useFactory` cần `inject[]` mà `useClass` thì không?"

> TypeScript chỉ emit `design:paramtypes` cho **class constructors có decorator**. `useFactory` là function — TypeScript không emit metadata cho function params. NestJS không có cách biết factory cần gì → phải khai báo tường minh qua `inject[]`.

---

### Q11: "Dynamic Module là gì?"

> Module có static method (forRoot/forFeature) trả về `DynamicModule` object chứa metadata. Scanner gọi method, nhận object, merge metadata vào Module, xử lý giống static module.
>
> Convention: `forRoot()` config toàn app import 1 lần, `forFeature()` config riêng import nhiều lần, `forRootAsync()` khi config cần inject dependencies.

---

### Q12: "`@Global()` module — nên hay không?"

> Hạn chế. `@Global()` phá vỡ explicit dependency graph — dependency "ẩn", debug khó, test khó, refactor khó. Chỉ dùng cho modules hầu hết features cần: Database, Logger, Config. Còn lại explicit import.

---

### Q13: "Optional dependency hoạt động thế nào?"

> `@Optional()` ghi metadata. Injector resolve thất bại → check optional → có thì trả `undefined` thay vì throw. Dùng cho conditional features: notification gửi Slack nếu client available, bỏ qua nếu không.

---

### Q14: "LazyModuleLoader dùng khi nào?"

> Khi module nặng nhưng ít dùng: report generation, data migration. `lazyModuleLoader.load(() => ReportModule)` chạy mini-bootstrap tại runtime. Không load lúc app start → giảm startup time. Quan trọng cho serverless/cold-start.

---

### Q15: "ModuleRef.get() vs ModuleRef.resolve()?"

> `get()` synchronous, chỉ cho Singleton — trả instance đã tạo. `resolve()` async, cho REQUEST/TRANSIENT — tạo/lấy instance theo context. `get()` với `strict: false` tìm xuyên modules.
>
> Lưu ý: cả hai là Service Locator pattern. Ưu tiên constructor injection.

---

### Q16: "Lifecycle hooks chạy theo thứ tự nào?"

> Startup: `OnModuleInit` → `OnApplicationBootstrap`. Cả hai chạy **ascending distance** — module xa root trước (foundation first).
>
> Shutdown: `OnModuleDestroy` → `BeforeApplicationShutdown` → close connections → `OnApplicationShutdown`. Cả ba chạy **descending distance** — feature modules cleanup trước foundation.
>
> Phải gọi `app.enableShutdownHooks()` để activate.

---

### Q17: "Static Resolution vs Context-based Resolution?"

> **Static**: cho Singleton. Resolve 1 lần lúc bootstrap. Key cố định (`STATIC_CONTEXT`). Nhanh.
>
> **Context-based**: cho REQUEST/TRANSIENT. Resolve mỗi request/injection. Key động (contextId, inquirerId). Chậm hơn nhưng cần cho state per-request.

---

### Q18: "Service Locator vs DI — khác nhau thế nào?"

> **DI**: class không biết container, dependencies được **đẩy vào** qua constructor. Test: truyền mock vào constructor.
>
> **Service Locator**: class biết container, **chủ động gọi** container.get(). Test: phải mock cả container.
>
> DI tốt hơn vì: dependencies explicit (nhìn constructor biết), không coupling vào container, test đơn giản.

---

### Q19: "Durable Provider là gì? Khi nào dùng?"

> REQUEST scope tạo mới mỗi request. Durable Provider **cache** instance theo context (ví dụ tenant ID). 100 requests từ cùng tenant → reuse 1 instance.
>
> Cần `ContextIdStrategy` custom để NestJS biết cách match requests. Dùng cho multi-tenancy giảm overhead.

---

### Q20: "Module Distance dùng làm gì?"

> Distance = khoảng cách module đến root. 2 mục đích: **thứ tự lifecycle hooks** (ascending cho startup, descending cho shutdown) và **ưu tiên provider lookup** (module gần root được ưu tiên khi nhiều modules export cùng token).
>
> Global modules có distance = `Number.MAX_VALUE`.

---

## References (Part 2)

| Resource | URL |
|----------|-----|
| DeepWiki — Scope Management | [deepwiki.com/nestjs/nest/3.4](https://deepwiki.com/nestjs/nest/3.4-scope-management) |
| DeepWiki — Application Lifecycle | [deepwiki.com/nestjs/nest/3.3](https://deepwiki.com/nestjs/nest/3.3-application-context-and-lifecycle) |
| NestJS Docs — Injection Scopes | [docs.nestjs.com/fundamentals/injection-scopes](https://docs.nestjs.com/fundamentals/injection-scopes) |
| NestJS Docs — Circular Dependency | [docs.nestjs.com/fundamentals/circular-dependency](https://docs.nestjs.com/fundamentals/circular-dependency) |
| NestJS Docs — Lazy Loading | [docs.nestjs.com/fundamentals/lazy-loading-modules](https://docs.nestjs.com/fundamentals/lazy-loading-modules) |
| NestJS Docs — Module Reference | [docs.nestjs.com/fundamentals/module-ref](https://docs.nestjs.com/fundamentals/module-ref) |
| NestJS Docs — Lifecycle Events | [docs.nestjs.com/fundamentals/lifecycle-events](https://docs.nestjs.com/fundamentals/lifecycle-events) |
| Source — Injector | [injector.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/injector.ts) |
| Source — InstanceWrapper | [instance-wrapper.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/instance-wrapper.ts) |
| Source — SettlementSignal | [settlement-signal.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/settlement-signal.ts) |
| Source — TopologyTree | [topology-tree.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/injector/topology-tree/topology-tree.ts) |
| Source — ContextIdFactory | [context-id-factory.ts](https://github.com/nestjs/nest/blob/88b3ce7d/packages/core/helpers/context-id-factory.ts) |

---

> Dựa trên: NestJS source code @ commit `88b3ce7d`, DeepWiki, Official Docs
