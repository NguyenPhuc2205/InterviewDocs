# Tích hợp cơ sở dữ liệu & Prisma — Database & Prisma Integration

> Tài liệu ôn tập phỏng vấn — bao gồm: ORM là gì (ánh xạ đối tượng-quan hệ), cơ chế PrismaClient (kiến trúc bên trong), thiết lập PrismaService trong NestJS, giao dịch (transactions), xoá mềm (soft delete), phân trang (pagination), và xử lý lỗi.

---

## Mục lục

0. [ORM và cơ chế PrismaClient](#0-orm-và-cơ-chế-prismaclient)
1. [PrismaService — Thiết lập chuẩn](#1-prismaservice--thiết-lập-chuẩn)
2. [PrismaModule — Mẫu module](#2-prismamodule--mẫu-module)
3. [Transactions — Giao dịch](#3-transactions--giao-dịch)
4. [Pagination — Phân trang](#4-pagination--phân-trang)
5. [Soft Delete — Xoá mềm](#5-soft-delete--xoá-mềm)
6. [Xử lý lỗi với Prisma](#6-xử-lý-lỗi-với-prisma)
7. [Câu hỏi phỏng vấn thường gặp](#7-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 0. ORM và cơ chế PrismaClient

## ORM (Object-Relational Mapping — Ánh xạ đối tượng-quan hệ) là gì?

**ORM** là kỹ thuật lập trình **ánh xạ dữ liệu** giữa hai thế giới khác nhau:
- **Cơ sở dữ liệu quan hệ:** bảng (table), dòng (row), cột (column)
- **Lập trình hướng đối tượng:** lớp (class), đối tượng (object), thuộc tính (property)

```
Không có ORM:
  Lập trình viên viết SQL thủ công → nhận mảng dữ liệu thô → tự chuyển đổi thành đối tượng

Có ORM:
  Lập trình viên thao tác qua đối tượng → ORM TỰ ĐỘNG sinh SQL → tự chuyển đổi kết quả thành đối tượng
```

## 3 cách tiếp cận chính

### Active Record — "Model tự biết cách lưu chính nó"

```typescript
// Model VỪA chứa dữ liệu VỪA chứa logic cơ sở dữ liệu
const user = new User();
user.name = "Alice";
user.email = "alice@test.com";
await user.save();         // ← model tự gọi INSERT INTO users ...
await user.remove();       // ← model tự gọi DELETE FROM users ...
// Đại diện: Sequelize, TypeORM (chế độ Active Record)
```

### Data Mapper — "Tách model khỏi logic cơ sở dữ liệu"

```typescript
// Model CHỈ chứa dữ liệu, Repository lo việc lưu trữ
const user = new User();
user.name = "Alice";
await userRepository.save(user);   // ← Repository lo INSERT
await userRepository.remove(user); // ← Repository lo DELETE
// Đại diện: TypeORM (chế độ Data Mapper)
```

### Schema-first — "Khai báo schema trước, tool tự sinh code"

```prisma
// Khai báo schema trong file riêng (schema.prisma):
model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
}
// → Chạy `prisma generate` → sinh ra Typed Client hoàn chỉnh
// Đại diện: Prisma
```

## Cơ chế hoạt động bên trong của PrismaClient

```
                    Luồng hoạt động của Prisma
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ① schema.prisma                                                │
│     Lập trình viên khai báo models, relations, datasource       │
│                    │                                            │
│                    ▼                                            │
│  ② npx prisma generate                                         │
│     Prisma CLI đọc schema → sinh ra:                           │
│     • PrismaClient class (trong node_modules/.prisma/client)   │
│     • Typed interfaces cho mọi model                           │
│     • Typed methods: findMany, create, update, delete...       │
│                    │                                            │
│                    ▼                                            │
│  ③ PrismaClient (trong code ứng dụng)                          │
│     prisma.user.findMany({...})                                │
│     ↓ TypeScript method call                                   │
│     → Chuyển đổi thành AST truy vấn nội bộ                    │
│     → Gửi tới Query Engine                                     │
│                    │                                            │
│                    ▼                                            │
│  ④ Query Engine                                                │
│     Prisma v6: Rust binary (file riêng, nặng ~15MB)            │
│     Prisma v7: TypeScript thuần (nhẹ hơn ~90%)                 │
│     → Nhận AST → Sinh SQL thật → Gửi tới Database             │
│                    │                                            │
│                    ▼                                            │
│  ⑤ Database (PostgreSQL, MySQL, SQLite, v.v.)                  │
│     → Thực thi SQL → Trả kết quả                              │
│     → Query Engine chuyển kết quả thành typed objects          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Prisma v7 — Thay đổi quan trọng

| | Prisma v6 trở về trước | Prisma v7 |
|---|---|---|
| **Query Engine** | Rust binary riêng biệt (~15MB) | TypeScript thuần (không cần binary) |
| **Driver** | Prisma tự quản lý kết nối | **Driver Adapter bắt buộc** — dùng driver native (pg, mysql2...) |
| **Kích thước** | Nặng (Rust binary + engine) | Nhẹ hơn ~90% |
| **Ý nghĩa** | Khó debug (Rust), cold start chậm | Dễ debug, tối ưu cho serverless/edge |

---

# 1. PrismaService — Setup chuẩn

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();  // Kết nối DB khi module khởi tạo
  }

  async onModuleDestroy() {
    await this.$disconnect();  // Ngắt kết nối khi app tắt
  }
}
```

## Tại sao extends PrismaClient?

```
PrismaService KẾ THỪA PrismaClient
  → Dùng được: this.prisma.user.findMany()
  → Thêm lifecycle hooks (onModuleInit/Destroy)
  → Có thể thêm methods tuỳ chỉnh (soft delete, logging...)
  → Injectable vào bất kỳ service nào qua DI
```

---

# 2. PrismaModule — Module pattern

```typescript
@Global()  // Accessible everywhere
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

// app.module.ts
@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
})
export class AppModule {}

// Bất kỳ service nào đều inject được
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
}
```

---

# 3. Transactions — Giao dịch

## Khi nào cần transaction?

Khi **nhiều thao tác** phải thành công **cùng lúc** hoặc thất bại **cùng lúc** (all or nothing).

```typescript
// Ví dụ: Chuyển tiền — trừ người gửi VÀ cộng người nhận
async transferMoney(fromId: string, toId: string, amount: number) {
  // Nếu không dùng transaction:
  // 1. Trừ tiền người gửi ✅
  // 2. Server crash!
  // 3. Cộng tiền người nhận ❌ → Tiền mất!

  // Dùng transaction — tất cả hoặc không gì
  return this.prisma.$transaction(async (tx) => {
    // tx = transactional client, dùng thay this.prisma
    const sender = await tx.user.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });

    if (sender.balance < 0) {
      throw new BadRequestException('Không đủ tiền');
      // → Transaction tự ROLLBACK → không ai bị trừ/cộng tiền
    }

    await tx.user.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });

    return { success: true };
  });
}
```

## Hai cách dùng transaction

```typescript
// 1. Interactive transaction (phổ biến — logic phức tạp)
await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { ... } });
  await tx.profile.create({ data: { userId: user.id, ... } });
});

// 2. Sequential operations (đơn giản — batch)
await this.prisma.$transaction([
  this.prisma.user.create({ data: { ... } }),
  this.prisma.post.updateMany({ where: { ... }, data: { ... } }),
]);
```

---

# 4. Pagination — Phân trang

```typescript
// Cursor-based pagination (hiệu suất tốt cho danh sách lớn)
async findAll(cursor?: string, take = 20) {
  const items = await this.prisma.product.findMany({
    take: take + 1,  // Lấy thêm 1 để biết còn trang sau không
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,  // Bỏ qua item cursor
    }),
    orderBy: { createdAt: 'desc' },
  });

  const hasNextPage = items.length > take;
  const data = hasNextPage ? items.slice(0, -1) : items;

  return {
    data,
    nextCursor: hasNextPage ? data[data.length - 1].id : null,
    hasNextPage,
  };
}

// Offset-based pagination (đơn giản, phổ biến hơn)
async findAll(page = 1, limit = 20) {
  const [data, total] = await Promise.all([
    this.prisma.product.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.product.count(),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

| | Offset pagination | Cursor pagination |
|---|---|---|
| **Cách dùng** | `skip` + `take` | `cursor` + `take` |
| **URL** | `?page=3&limit=20` | `?cursor=abc123&limit=20` |
| **Nhảy trang** | ✅ Có | ❌ Chỉ next/prev |
| **Hiệu suất** | Chậm khi page lớn | ✅ Ổn định |
| **Data thay đổi** | Có thể lặp/mất item | ✅ Ổn định |

---

# 5. Soft Delete — Xoá mềm

```prisma
// Prisma schema
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  deletedAt DateTime? // null = active, có giá trị = đã xoá
}
```

```typescript
// Soft delete
async softDelete(id: string) {
  return this.prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// Query chỉ lấy active records
async findActive() {
  return this.prisma.user.findMany({
    where: { deletedAt: null },  // Chỉ user chưa bị xoá
  });
}

// Có thể dùng Prisma middleware để tự động filter
this.prisma.$use(async (params, next) => {
  if (params.action === 'findMany' || params.action === 'findFirst') {
    params.args.where = { ...params.args.where, deletedAt: null };
  }
  return next(params);
});
```

---

# 6. Error Handling với Prisma

```typescript
import { Prisma } from '@prisma/client';

async createUser(dto: CreateUserDto) {
  try {
    return await this.prisma.user.create({ data: dto });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':  // Unique constraint violation
          throw new ConflictException('Email đã tồn tại');
        case 'P2025':  // Record not found
          throw new NotFoundException('Không tìm thấy');
        default:
          throw new InternalServerErrorException();
      }
    }
    throw error;
  }
}
```

| Error Code | Ý nghĩa | HTTP Status |
|---|---|---|
| **P2002** | Unique constraint failed | 409 Conflict |
| **P2025** | Record not found | 404 Not Found |
| **P2003** | Foreign key constraint failed | 400 Bad Request |

---

# 7. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Tại sao PrismaService extends PrismaClient? | Kế thừa tất cả methods + thêm NestJS lifecycle (onModuleInit connect, onModuleDestroy disconnect) + injectable qua DI |
| Transaction dùng khi nào? | Khi nhiều thao tác DB phải all-or-nothing. Ví dụ: chuyển tiền, tạo user + profile. Nếu 1 thao tác thất bại → rollback tất cả |
| Cursor vs Offset pagination? | Offset: đơn giản, nhảy trang được, chậm khi page lớn. Cursor: ổn định, hiệu suất tốt, chỉ next/prev |
| Soft delete là gì? | Không xoá thật từ DB, thêm trường deletedAt. Query filter `deletedAt: null`. Có thể khôi phục, giữ audit trail |
| Prisma error code P2002? | Unique constraint violation — ví dụ email trùng. Nên catch và throw ConflictException (409) |
