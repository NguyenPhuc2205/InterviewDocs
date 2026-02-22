# Providers & Services — Deep Dive

> Tài liệu ôn tập phỏng vấn — Service patterns, Repository pattern, custom providers deep dive, provider tokens, async providers, provider lifetime.

---

## Mục lục

1. [Service trong NestJS](#1-service-trong-nestjs)
2. [Repository Pattern](#2-repository-pattern)
3. [Custom Providers — Chi tiết](#3-custom-providers--chi-tiết)
4. [Async Providers — Khởi tạo bất đồng bộ](#4-async-providers--khởi-tạo-bất-đồng-bộ)
5. [Provider Token — Các loại mã định danh](#5-provider-token--các-loại-mã-định-danh)
6. [Optional & Self Dependencies](#6-optional--self-dependencies)
7. [Câu hỏi phỏng vấn thường gặp](#7-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Service trong NestJS

## Service là gì?

Service là class gắn `@Injectable()`, chứa **business logic** chính. Controller nhận request, gọi Service xử lý, trả response.

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} không tồn tại`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) throw new ConflictException('Email đã tồn tại');

    return this.prisma.user.create({
      data: {
        ...dto,
        password: await hash(dto.password, 12),
      },
    });
  }
}
```

## Tại sao tách logic vào Service?

| Lý do | Giải thích |
|---|---|
| **Single Responsibility** | Controller lo nhận/trả HTTP, Service lo logic |
| **Reusable** | Service dùng được ở nhiều Controller, Guard, khác module |
| **Testable** | Test Service độc lập, mock dependencies dễ dàng |
| **DI** | NestJS tự inject Service khi cần |

---

# 2. Repository Pattern

## Repository là gì?

Lớp trung gian giữa Service và Database — **tách biệt** cách truy cập dữ liệu khỏi business logic. Service không biết dùng Prisma, TypeORM, hay MongoDB — chỉ gọi repository.

```typescript
// Repository — chịu trách nhiệm truy cập DB
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}

// Service — chỉ lo business logic
@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email đã tồn tại');

    return this.usersRepo.create({
      ...dto,
      password: await hash(dto.password, 12),
    });
  }
}
```

## Có cần Repository khi dùng Prisma?

| Cách | Ưu điểm | Nhược điểm |
|---|---|---|
| **Service → Prisma trực tiếp** | Đơn giản, ít code | Khó test, tight coupling |
| **Service → Repository → Prisma** | Dễ test, dễ đổi ORM | Thêm lớp trừu tượng |

> App nhỏ: inject Prisma trực tiếp. App lớn hoặc cần test nhiều: dùng Repository.

---

# 3. Custom Providers — Chi tiết

## Tóm tắt 4 loại

| Loại | Cú pháp | Dùng khi |
|---|---|---|
| **Standard** | `@Injectable()` class | Hầu hết trường hợp |
| **useClass** | `{ provide: Token, useClass: Impl }` | Thay đổi implementation (strategy pattern) |
| **useValue** | `{ provide: Token, useValue: value }` | Config, constants, mock |
| **useFactory** | `{ provide: Token, useFactory: fn, inject: [...] }` | Khởi tạo phức tạp, async, phụ thuộc runtime |
| **useExisting** | `{ provide: Token, useExisting: Other }` | Alias, backward compatibility |

## useClass — Strategy Pattern

```typescript
// Interface
interface IMailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

// Implementations
@Injectable()
class ResendMailService implements IMailService {
  async send(to, subject, body) { /* Resend API */ }
}

@Injectable()
class SmtpMailService implements IMailService {
  async send(to, subject, body) { /* SMTP */ }
}

// Module — chọn implementation dựa trên config
@Module({
  providers: [{
    provide: 'MAIL_SERVICE',
    useClass: process.env.MAIL_PROVIDER === 'smtp'
      ? SmtpMailService
      : ResendMailService,
  }],
})
```

## useFactory — Khởi tạo phức tạp

```typescript
@Module({
  providers: [{
    provide: 'REDIS_CLIENT',
    useFactory: async (config: ConfigService) => {
      const client = new Redis({
        host: config.get('REDIS_HOST'),
        port: config.get('REDIS_PORT'),
      });
      await client.ping();  // Verify connection
      return client;
    },
    inject: [ConfigService],  // Dependencies cho factory
  }],
  exports: ['REDIS_CLIENT'],
})
```

---

# 4. Async Providers — Khởi tạo bất đồng bộ

```typescript
// Provider cần async initialization (kết nối DB, load config từ API...)
@Module({
  providers: [{
    provide: 'DATABASE',
    useFactory: async () => {
      const connection = await createConnection({
        host: 'localhost',
        port: 5432,
      });
      console.log('Database connected!');
      return connection;
    },
  }],
})
// NestJS CHỜ async provider resolve xong mới khởi động app
```

---

# 5. Provider Token — Các loại mã định danh

```typescript
// 1. Class token (phổ biến nhất — TypeScript tự resolve)
constructor(private usersService: UsersService) {}

// 2. String token
{ provide: 'API_KEY', useValue: 'my-secret' }
constructor(@Inject('API_KEY') private apiKey: string) {}

// 3. Symbol token (unique, tránh xung đột)
export const DB_TOKEN = Symbol('DATABASE');
{ provide: DB_TOKEN, useValue: connection }
constructor(@Inject(DB_TOKEN) private db: Connection) {}

// 4. Abstract class (interface-like cho TypeScript)
abstract class AbstractMailService {
  abstract send(to: string, body: string): Promise<void>;
}
{ provide: AbstractMailService, useClass: ResendMailService }
constructor(private mail: AbstractMailService) {}
```

> Tại sao không dùng interface làm token? TypeScript interface **biến mất** sau compile → runtime không có gì để inject. Dùng abstract class thay thế.

---

# 6. Optional & Self Dependencies

```typescript
// Optional — không lỗi nếu dependency không tồn tại
@Injectable()
class NotificationService {
  constructor(
    @Optional() @Inject('SLACK_CLIENT') private slack?: SlackClient,
  ) {}

  async notify(message: string) {
    if (this.slack) {
      await this.slack.send(message);  // Chỉ gửi nếu Slack được cấu hình
    }
  }
}
```

---

# 7. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Provider là gì trong NestJS? | Class gắn @Injectable(), đăng ký trong module. NestJS DI container quản lý lifecycle và inject khi cần |
| 4 loại custom provider? | useClass (thay implementation), useValue (inject giá trị), useFactory (tạo động, async), useExisting (alias) |
| Tại sao không dùng interface làm injection token? | Interface biến mất sau compile TypeScript → runtime không có gì. Dùng abstract class hoặc string/Symbol token |
| Repository pattern là gì? | Lớp trung gian tách DB access khỏi business logic. Service gọi Repository, không biết ORM cụ thể. Dễ test, dễ đổi ORM |
| useFactory vs useClass? | useClass: đơn giản, chỉ cần class. useFactory: cần logic phức tạp, async, điều kiện runtime, inject dependencies |
