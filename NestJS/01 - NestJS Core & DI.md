# NestJS Core & Dependency Injection

> **Chủ đề phỏng vấn trọng tâm** — Nếu apply vị trí NestJS, DI và Module system sẽ được hỏi gần như chắc chắn. Bao gồm: Modules, Providers, DI container, Injection Scopes, Dynamic Modules.

---

# 1. NestJS Architecture Overview

```
┌─────────────────────────── NestJS Application ───────────────────────────┐
│                                                                          │
│  ┌──── AppModule (Root) ──────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌── UsersModule ──────────┐    ┌── AuthModule ─────────────────┐ │  │
│  │  │  Controller             │    │  Controller                   │ │  │
│  │  │  Service                │    │  Service                      │ │  │
│  │  │  Repository             │◄───│  imports: [UsersModule]       │ │  │
│  │  │  exports: [UsersService]│    │  Guard                        │ │  │
│  │  └─────────────────────────┘    └────────────────────────────────┘ │  │
│  │                                                                    │  │
│  │  ┌── SharedModule ─────────┐                                      │  │
│  │  │  @Global()              │  ← Providers accessible everywhere   │  │
│  │  │  LoggerService          │                                      │  │
│  │  │  ConfigService          │                                      │  │
│  │  └─────────────────────────┘                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key concepts:**
- **Module** = Container tổ chức code (controllers, providers, imports, exports)
- **Controller** = Nhận requests, trả responses
- **Provider** = Class có `@Injectable()` — services, repositories, guards, pipes...
- **DI Container** = NestJS tự tạo và inject instances

---

# 2. Module System

```typescript
@Module({
  imports: [TypeOrmModule],        // Import modules khác → dùng providers của chúng
  controllers: [UsersController],   // Controllers thuộc module này
  providers: [UsersService],        // Providers (services) → chỉ accessible TRONG module
  exports: [UsersService],          // Cho phép modules khác dùng UsersService
})
export class UsersModule {}
```

### Quy tắc Module

| Quy tắc | Giải thích |
|---|---|
| **Encapsulation** | Provider chỉ accessible trong module khai báo nó, TRỪ KHI được `exports` |
| **imports** | Để dùng provider của module khác, module đó phải `exports` provider |
| **@Global()** | Module global → providers accessible ở MỌI NƠI mà không cần import |
| **Mỗi provider là singleton** | Mặc định, 1 instance duy nhất cho toàn app (scope DEFAULT) |

```typescript
// Module A exports ServiceA
@Module({ providers: [ServiceA], exports: [ServiceA] })
class ModuleA {}

// Module B imports ModuleA → có thể inject ServiceA
@Module({ imports: [ModuleA], providers: [ServiceB] })
class ModuleB {}

// ServiceB inject ServiceA
@Injectable()
class ServiceB {
  constructor(private readonly serviceA: ServiceA) {} // ✅ Được vì ModuleA exports ServiceA
}
```

---

# 3. Dependency Injection — Deep Dive

## DI là gì?

DI = **Inversion of Control** — thay vì class tự tạo dependencies, NestJS container **inject** dependencies vào qua constructor.

```typescript
// ❌ Không có DI — UserService tự tạo dependency
class UserService {
  private db = new DatabaseService(); // tight coupling!
  private logger = new LoggerService();
}

// ✅ Có DI — NestJS inject dependencies
@Injectable()
class UserService {
  constructor(
    private readonly db: DatabaseService,   // ← NestJS inject
    private readonly logger: LoggerService, // ← NestJS inject
  ) {}
}
```

**Lợi ích:**
- **Loose coupling** — dễ thay đổi implementation
- **Testable** — inject mock khi test
- **Reusable** — share instances giữa các modules

## Custom Providers

### useClass — Thay thế implementation

```typescript
@Module({
  providers: [
    {
      provide: DatabaseService,       // Token
      useClass: PostgresDatabaseService, // Implementation thực tế
    },
  ],
})
// Khi inject DatabaseService → nhận PostgresDatabaseService instance
```

### useValue — Inject giá trị cụ thể

```typescript
@Module({
  providers: [
    { provide: 'API_KEY', useValue: 'my-secret-key' },
    { provide: 'CONFIG', useValue: { port: 3000, host: 'localhost' } },
  ],
})

// Inject
@Injectable()
class ApiService {
  constructor(@Inject('API_KEY') private apiKey: string) {}
}
```

### useFactory — Tạo provider động (async, dependencies)

```typescript
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        });
        await client.ping(); // verify connection
        return client;
      },
      inject: [ConfigService], // inject dependencies cho factory function
    },
  ],
})
```

### useExisting — Alias cho provider khác

```typescript
@Module({
  providers: [
    NewLoggerService,
    { provide: OldLoggerService, useExisting: NewLoggerService },
    // Inject OldLoggerService → nhận NewLoggerService instance
  ],
})
```

## Injection Token types

```typescript
// 1. Class-based token (phổ biến nhất)
constructor(private userService: UserService) {} // Token = UserService class

// 2. String token
constructor(@Inject('API_KEY') private key: string) {} // Token = 'API_KEY'

// 3. Symbol token (unique, tránh xung đột tên)
const DB_TOKEN = Symbol('DATABASE');
constructor(@Inject(DB_TOKEN) private db: Database) {}

// 4. InjectionToken (type-safe)
const CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
```

---

# 4. Injection Scopes

| Scope | Lifetime | Ví dụ |
|---|---|---|
| **DEFAULT** (Singleton) | 1 instance cho toàn app | Database connection, ConfigService |
| **REQUEST** | 1 instance mới cho mỗi HTTP request | Request-scoped logger, user context |
| **TRANSIENT** | 1 instance mới mỗi lần inject | Nơi cần state riêng biệt |

```typescript
@Injectable({ scope: Scope.DEFAULT })   // Singleton — mặc định
class ConfigService {}

@Injectable({ scope: Scope.REQUEST })   // Mỗi request 1 instance mới
class RequestLoggerService {
  constructor(@Inject(REQUEST) private request: Request) {
    // Có thể access request object
  }
}

@Injectable({ scope: Scope.TRANSIENT }) // Mỗi injection 1 instance mới
class HelperService {}
```

> ⚠️ **Chú ý**: Khi inject REQUEST-scoped provider vào SINGLETON → singleton cũng buộc trở thành REQUEST-scoped! Hiệu ứng "bubble up" này ảnh hưởng performance. Dùng `@Inject(REQUEST)` cẩn thận.

---

# 5. Circular Dependency

## Vấn đề

```typescript
// UserService inject AuthService
@Injectable()
class UserService {
  constructor(private authService: AuthService) {} // AuthService chưa được tạo!
}

// AuthService inject UserService
@Injectable()
class AuthService {
  constructor(private userService: UserService) {} // UserService chưa được tạo!
}
// → Error: Circular dependency detected
```

## Giải pháp — forwardRef

```typescript
@Injectable()
class UserService {
  constructor(
    @Inject(forwardRef(() => AuthService)) // ← forwardRef
    private authService: AuthService,
  ) {}
}

@Injectable()
class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService)) // ← forwardRef
    private userService: UserService,
  ) {}
}

// Module level
@Module({
  imports: [forwardRef(() => AuthModule)], // ← forwardRef cho module imports
})
class UserModule {}
```

> 💡 **Best practice**: Circular dependency thường là dấu hiệu code cần **refactor**. Tách logic chung vào module thứ 3 (SharedModule) thay vì forwardRef.

---

# 6. Dynamic Modules

```typescript
// Static module — config cố định
@Module({ providers: [DatabaseService] })
class DatabaseModule {}

// Dynamic module — config linh hoạt
@Module({})
class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        { provide: 'DB_OPTIONS', useValue: options },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }

  static forFeature(entities: any[]): DynamicModule {
    return {
      module: DatabaseModule,
      providers: entities.map(entity => ({
        provide: `${entity.name}_REPOSITORY`,
        useFactory: (db: DatabaseService) => db.getRepository(entity),
        inject: [DatabaseService],
      })),
      exports: entities.map(e => `${e.name}_REPOSITORY`),
    };
  }
}

// Sử dụng
@Module({
  imports: [
    DatabaseModule.forRoot({ host: 'localhost', port: 5432 }), // Root config
    DatabaseModule.forFeature([User, Post]),                     // Feature config
  ],
})
class AppModule {}
```

**Pattern phổ biến:**
- `forRoot()` — config 1 lần ở AppModule (global)
- `forFeature()` — config riêng cho từng feature module
- `forRootAsync()` — config bất đồng bộ (inject ConfigService)

---

# 7. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| DI là gì? Lợi ích? | Inversion of Control — container inject dependencies thay vì class tự tạo. Lợi ích: loose coupling, testable, reusable |
| Module imports/exports hoạt động thế nào? | Provider chỉ dùng trong module trừ khi exports. Module khác phải imports mới inject được |
| 4 custom providers? | useClass (thay implementation), useValue (inject constant), useFactory (tạo động), useExisting (alias) |
| 3 Injection Scopes? | DEFAULT (singleton), REQUEST (per request), TRANSIENT (mỗi inject mới). REQUEST scope bubble up |
| Circular dependency? | 2 providers inject lẫn nhau. Fix: forwardRef(). Best: refactor tách module thứ 3 |
| forRoot vs forFeature? | forRoot: config toàn app (1 lần). forFeature: config cho từng module |
| @Global() dùng khi nào? | Providers cần accessible everywhere (Logger, Config). Không nên lạm dụng |
