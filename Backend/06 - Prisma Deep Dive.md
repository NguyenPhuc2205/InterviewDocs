# Prisma Deep Dive

> **Chủ đề phỏng vấn thực tế** — Bạn dùng Prisma hàng ngày, interviewer chắc chắn hỏi. Bao gồm: Schema, Relations, Client API, Transactions, Extensions, Migrations, so sánh ORM.

---

# 1. Prisma là gì? — Khác gì các ORM khác?

## Các cách tiếp cận truy cập DB trong Node.js

Có hai **design patterns chính thức** (từ Martin Fowler — *Patterns of Enterprise Application Architecture*) và hai cách tiếp cận khác phổ biến trong hệ sinh thái Node.js:

### Active Record — "Model tự biết cách lưu chính nó"

**Định nghĩa (Martin Fowler):** *"An object that wraps a row in a database table or view, encapsulates the database access, and adds domain logic on that data."*

Mỗi model class đại diện một bảng, mỗi instance đại diện một row — model chứa **cả** business logic **lẫn** DB logic (save, find, delete...).

```typescript
// Sequelize / TypeORM Active Record
const user = new User()
user.name = "Nguyen"
await user.save()        // ← model tự gọi DB
```

- **Đại diện:** Sequelize, TypeORM (khi extend `BaseEntity`), Laravel Eloquent, Ruby on Rails
- **Ưu:** Đơn giản, trực quan, nhanh cho CRUD và MVP
- **Nhược:** Model bị "ô nhiễm" — business logic + DB logic lẫn lộn. Tightly coupled với database — thay đổi schema → phải sửa model

### Data Mapper — "Model chỉ là data thuần túy, Repository mới biết cách lưu"

**Định nghĩa (Martin Fowler):** *"A layer of mappers that moves data between objects and a database while keeping them independent of each other and the mapper itself."*

Điểm cốt lõi: **model objects hoàn toàn không biết gì về database** — không có SQL, không có knowledge về schema. Chúng chỉ là plain objects ("dumb" entities). Một lớp riêng (repository/mapper) lo việc chuyển data qua lại giữa objects và DB.

```typescript
// TypeORM Data Mapper
const user = new User()     // ← "dumb" entity, không biết gì về DB
user.name = "Nguyen"

await userRepository.save(user)  // ← repository lo việc DB
```

- **Đại diện:** TypeORM (khi dùng repositories), Doctrine (PHP), Hibernate (Java)
- **Ưu:** Tách biệt rõ ràng (SoC), phù hợp Clean Architecture, dễ test (mock repository)
- **Nhược:** Boilerplate nhiều hơn, learning curve cao hơn

### Query Builder — "Chỉ build SQL, không ánh xạ object"

> ⚠️ Query Builder **không phải ORM** — nó không ánh xạ object ↔ row. Knex.js tự gọi mình là "SQL Query Builder".

```typescript
// Knex.js — query builder
knex('users').where('id', 1).select('name')
// → SELECT name FROM users WHERE id = 1
```

- **Đại diện:** Knex.js, Kysely
- **Ưu:** Kiểm soát SQL tối đa, gần SQL nhưng chainable
- **Nhược:** Tự lo type-safety (trừ Kysely), không có entity/relation management

### Schema-first — "Khai báo schema, tool generate mọi thứ"

> ⚠️ Đây không phải design pattern từ PoEAA — là cách tiếp cận riêng của Prisma. Prisma tự gọi mình là "next-generation ORM" nhưng thực tế không map object ↔ row theo kiểu truyền thống (không có class entity, không có instances) — gần **query builder + code generator** hơn.

```prisma
model User {
  id   Int    @id
  name String
}
// → Prisma tự sinh prisma.user.findMany() với TypeScript types đầy đủ
```

- **Đại diện:** Prisma
- **Ưu:** Type-safety 100% auto-generated, DX rất tốt, không cần decorator
- **Nhược:** Ít kiểm soát SQL, phụ thuộc vào Prisma engine

### Bảng tóm tắt

| Cách tiếp cận | Triết lý | Pattern chính thức? |
|---|---|---|
| **Active Record** | "Model tự lo DB" | ✅ PoEAA (Martin Fowler) |
| **Data Mapper** | "Tách model và DB logic" | ✅ PoEAA (Martin Fowler) |
| **Query Builder** | "Chỉ build SQL thôi" | ❌ Không phải ORM |
| **Schema-first** | "Khai báo schema, tool lo hết" | ❌ Cách tiếp cận riêng Prisma |

### Khi nào dùng cái nào?

| Tình huống | Nên dùng |
|---|---|
| MVP, greenfield, CRUD đơn giản | Active Record |
| Ứng dụng lớn, business logic phức tạp, Clean Architecture | Data Mapper |
| Cần kiểm soát SQL tối đa | Query Builder |
| Muốn DX tốt nhất + type-safety tự động (Node.js/TypeScript) | Prisma (schema-first) |

## Prisma vs TypeORM vs Sequelize

| | Prisma | TypeORM | Sequelize |
|---|---|---|---|
| **Approach** | Schema-first, generated client | Active Record / Data Mapper | Active Record |
| **Type Safety** | 🟢 100% auto-generated types | 🟡 Manual decorators | 🔴 Loose types |
| **Schema** | `.prisma` file → generate | Decorators trên class | Model definition |
| **Migration** | `prisma migrate` (auto-gen) | TypeORM migrations | Sequelize CLI |
| **Raw SQL** | `$queryRaw` tagged template | `query()` | `sequelize.query()` |
| **Relations** | Khai báo trong schema → auto include | `@ManyToOne`, `@OneToMany` decorators | `hasMany`, `belongsTo` methods |
| **Learning curve** | 🟢 Dễ | 🟡 Trung bình | 🟡 Trung bình |
| **Performance** | 🟢 Tốt (generated queries) | 🟡 Tùy cách dùng | 🟡 Tùy cách dùng |

---

# 2. Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== MODELS ====================

model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String?                           // optional field
  role      Role      @default(USER)          // enum with default
  profile   Profile?                          // 1-1 relation
  posts     Post[]                            // 1-many relation
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([email])                            // index
  @@map("users")                              // table name trong DB
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId Int    @unique                       // 1-1: foreign key phải unique

  @@map("profiles")
}

model Post {
  id         Int        @id @default(autoincrement())
  title      String
  content    String?
  published  Boolean    @default(false)
  author     User       @relation(fields: [authorId], references: [id])
  authorId   Int
  tags       Tag[]                            // many-many (implicit)
  categories Category[]                       // many-many (explicit)
  createdAt  DateTime   @default(now())

  @@index([authorId, createdAt])              // composite index
  @@map("posts")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]                                // many-many (implicit → Prisma tạo join table tự động)
}

// Many-to-many explicit (join table thủ công — khi cần thêm fields)
model Category {
  id    Int                @id @default(autoincrement())
  name  String             @unique
  posts CategoriesOnPosts[]
}

model CategoriesOnPosts {
  post       Post     @relation(fields: [postId], references: [id])
  postId     Int
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId Int
  assignedAt DateTime @default(now())         // extra field trên join table

  @@id([postId, categoryId])                  // composite primary key
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

## Relations summary

| Relation | Schema cú pháp | Ví dụ |
|---|---|---|
| **1-1** | `@relation` + `@unique` trên FK | User ↔ Profile |
| **1-N** | `Type[]` + `@relation` | User → Post[] |
| **N-N implicit** | `Type[]` cả 2 phía | Post ↔ Tag (Prisma tạo `_PostToTag`) |
| **N-N explicit** | Join model thủ công | Post ↔ Category qua `CategoriesOnPosts` |

---

# 3. Client API — CRUD Operations

## Querying

```typescript
// findMany — lấy danh sách
const users = await prisma.user.findMany({
  where: {
    email: { contains: '@gmail.com' },
    role: 'ADMIN',
    createdAt: { gte: new Date('2024-01-01') },
  },
  orderBy: { createdAt: 'desc' },
  skip: 0,
  take: 20,
  include: { posts: true },
});

// findUnique — tìm 1 record (phải là unique field)
const user = await prisma.user.findUnique({
  where: { email: 'alice@test.com' },
});

// findFirst — tìm 1 record (không cần unique)
const admin = await prisma.user.findFirst({
  where: { role: 'ADMIN' },
});

// findUniqueOrThrow — throw nếu không tìm thấy
const user = await prisma.user.findUniqueOrThrow({
  where: { id: 999 },
}); // → NotFoundError nếu không có
```

## include vs select

```typescript
// include — lấy TẤT CẢ fields + relation
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true }, // → user.id, user.email, user.name, ..., user.posts
});

// select — CHỈ lấy fields chỉ định (performance tốt hơn)
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    name: true,
    posts: { select: { title: true } }, // chỉ lấy post.title
  },
}); // → { id: 1, name: 'Alice', posts: [{ title: '...' }] }

// ⚠️ KHÔNG dùng include + select cùng lúc → compile error
```

## Creating

```typescript
// create
const user = await prisma.user.create({
  data: {
    email: 'bob@test.com',
    name: 'Bob',
    profile: {
      create: { bio: 'Hello!' }, // nested create → tạo profile cùng lúc
    },
  },
  include: { profile: true },
});

// createMany — bulk insert
await prisma.user.createMany({
  data: [
    { email: 'a@test.com', name: 'A' },
    { email: 'b@test.com', name: 'B' },
  ],
  skipDuplicates: true, // bỏ qua nếu trùng unique field
});
```

## Updating

```typescript
// update
const user = await prisma.user.update({
  where: { id: 1 },
  data: {
    name: 'Alice Updated',
    role: 'ADMIN',
  },
});

// updateMany — update nhiều records
await prisma.user.updateMany({
  where: { role: 'USER' },
  data: { role: 'MODERATOR' },
});

// upsert — update nếu có, create nếu chưa
const user = await prisma.user.upsert({
  where: { email: 'bob@test.com' },
  update: { name: 'Bob Updated' },
  create: { email: 'bob@test.com', name: 'Bob' },
});
```

## Deleting

```typescript
// delete
await prisma.user.delete({ where: { id: 1 } });

// deleteMany
await prisma.user.deleteMany({ where: { role: 'USER' } });
```

## Atomic Operations

```typescript
// increment/decrement
await prisma.product.update({
  where: { id: 1 },
  data: { stock: { decrement: 1 } }, // stock = stock - 1 (atomic, tránh race condition)
});

// multiply
await prisma.product.update({
  where: { id: 1 },
  data: { price: { multiply: 1.1 } }, // tăng giá 10%
});
```

---

# 4. Transactions

```typescript
// Sequential — array of operations (chạy tuần tự, tất cả trong 1 transaction)
const [user, post] = await prisma.$transaction([
  prisma.user.create({ data: { email: 'new@test.com', name: 'New' } }),
  prisma.post.create({ data: { title: 'First Post', authorId: 1 } }),
]);

// Interactive — function (linh hoạt hơn, có thể logic giữa các operations)
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id: 1 } });
  if (!user) throw new Error('User not found'); // → ROLLBACK tất cả

  const post = await tx.post.create({
    data: { title: 'New Post', authorId: user.id },
  });

  return post;
}, {
  maxWait: 5000,       // thời gian chờ tối đa để bắt đầu transaction
  timeout: 10000,      // thời gian tối đa để hoàn thành transaction
  isolationLevel: 'Serializable',
});
```

---

# 5. Raw Queries

```typescript
// Tagged template (AN TOÀN — auto parameterized)
const email = 'alice@test.com';
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;
// → SELECT * FROM users WHERE email = $1  (parameterized!)

// executeRaw — cho INSERT/UPDATE/DELETE
const count = await prisma.$executeRaw`
  UPDATE users SET role = 'ADMIN' WHERE email = ${email}
`;
// → count = number of affected rows

// ⚠️ NGUY HIỂM — String interpolation (SQL Injection risk!)
// KHÔNG BAO GIỜ làm thế này:
const query = `SELECT * FROM users WHERE email = '${email}'`; // ❌
await prisma.$queryRawUnsafe(query); // ❌ Chỉ dùng khi dynamic table/column name
```

---

# 6. Prisma Extensions

```typescript
// Thêm methods custom cho model
const xprisma = prisma.$extends({
  model: {
    user: {
      async findByEmail(email: string) {
        return prisma.user.findUnique({ where: { email } });
      },
      async softDelete(id: number) {
        return prisma.user.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      },
    },
  },
});

// Sử dụng
const user = await xprisma.user.findByEmail('alice@test.com');
await xprisma.user.softDelete(1);
```

> 💡 `$extends` trả về **client mới** — KHÔNG mutate client cũ. Nếu dùng extension, phải dùng `xprisma` thay vì `prisma`.

---

# 7. Migration Workflow

```bash
# 1. Sửa schema.prisma

# 2. Tạo migration (dev)
npx prisma migrate dev --name add_profile_table
# → Tạo file SQL trong prisma/migrations/
# → Apply migration vào dev DB
# → Regenerate Prisma Client

# 3. Deploy migration (production)
npx prisma migrate deploy
# → Apply tất cả pending migrations

# 4. Reset DB (dev only!)
npx prisma migrate reset
# → Drop DB → Apply tất cả migrations → Run seed

# 5. Xem DB hiện tại
npx prisma studio
# → Mở GUI xem/sửa data
```

---

# 8. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| Prisma khác TypeORM/Sequelize thế nào? | Prisma dùng schema-first approach (không phải ORM truyền thống — gần query builder + code generator). TypeORM hỗ trợ cả Active Record và Data Mapper (2 design patterns chính thức từ PoEAA). Sequelize dùng Active Record |
| include vs select? | include: tất cả fields + relation. select: chỉ fields cần → performance tốt hơn |
| 2 loại transaction trong Prisma? | Sequential: `$transaction([...])`. Interactive: `$transaction(async (tx) => {...})` |
| N+1 trong Prisma? | Dùng `include` hoặc `select` với nested relations → Prisma tự tối ưu thành 2 queries |
| Raw query an toàn thế nào? | Dùng tagged template `$queryRaw\`...\`` → auto parameterized. KHÔNG dùng string interpolation |
| Prisma extension là gì? | `$extends` tạo client mới với custom methods. KHÔNG mutate client cũ |
| implicit vs explicit many-to-many? | Implicit: Prisma tạo join table tự động. Explicit: tạo join model thủ công (khi cần extra fields) |
