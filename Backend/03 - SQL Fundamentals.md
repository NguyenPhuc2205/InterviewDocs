# SQL Fundamentals

> **Chủ đề phỏng vấn kinh điển** — JOINs, Indexing, Subqueries, Normalization. Kiến thức áp dụng cho PostgreSQL, MySQL, và bất kỳ RDBMS nào.

---

# 1. JOIN — Kết hợp bảng

## Tại sao cần JOIN?

Dữ liệu được **chuẩn hóa** (normalization) → tách thành nhiều bảng → cần JOIN để kết hợp lại.

## Các loại JOIN

```
Giả sử:
  users: [1-Alice, 2-Bob, 3-Charlie]
  orders: [order1→user1, order2→user1, order3→user4(không tồn tại)]
```

### INNER JOIN — Chỉ lấy records khớp ở CẢ HAI bảng

```sql
SELECT u.name, o.id AS order_id
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

```
Kết quả: Alice - order1, Alice - order2
(Bob không có order → loại. order3 không có user → loại)
```

```
   users          orders
  ┌─────┐       ┌─────┐
  │     │       │     │
  │  ███████████████  │    ← Chỉ phần giao
  │     │       │     │
  └─────┘       └─────┘
```

### LEFT JOIN — Tất cả bên trái + khớp bên phải (NULL nếu không có)

```sql
SELECT u.name, o.id AS order_id
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

```
Kết quả: Alice - order1, Alice - order2, Bob - NULL, Charlie - NULL
(Giữ TẤT CẢ users, kể cả không có order)
```

```
   users          orders
  ┌─────┐       ┌─────┐
  │█████████████████  │    ← Tất cả trái + giao
  │█████│       │     │
  └─────┘       └─────┘
```

### RIGHT JOIN — Tất cả bên phải + khớp bên trái

```sql
SELECT u.name, o.id AS order_id
FROM users u
RIGHT JOIN orders o ON u.id = o.user_id;
```

```
Kết quả: Alice - order1, Alice - order2, NULL - order3
(Giữ TẤT CẢ orders, kể cả không có user)
```

### FULL OUTER JOIN — Tất cả từ cả hai bảng

```sql
SELECT u.name, o.id AS order_id
FROM users u
FULL OUTER JOIN orders o ON u.id = o.user_id;
```

```
Kết quả: Alice - order1, Alice - order2, Bob - NULL, Charlie - NULL, NULL - order3
```

### CROSS JOIN — Mỗi record bên trái × mỗi record bên phải (Cartesian product)

```sql
SELECT u.name, o.id FROM users u CROSS JOIN orders o;
-- 3 users × 3 orders = 9 rows
```

### Self JOIN — Bảng join với chính nó

```sql
-- Tìm employees và manager của họ (cùng bảng employees)
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

## Bảng tổng kết JOIN

| JOIN | Giữ gì |
|---|---|
| **INNER** | Chỉ records khớp cả 2 bên |
| **LEFT** | Tất cả trái + khớp phải (NULL nếu không có) |
| **RIGHT** | Tất cả phải + khớp trái (NULL nếu không có) |
| **FULL OUTER** | Tất cả cả 2 bên |
| **CROSS** | Mọi tổ hợp (A × B) |

---

# 2. Indexing — Tăng tốc truy vấn

## Index là gì?

**Khái niệm**: Index là một **cấu trúc dữ liệu phụ** (auxiliary data structure), được tạo riêng biệt khỏi bảng chính. Nó lưu **bản sao đã sắp xếp** của giá trị một hoặc nhiều column, kèm theo **pointer** trỏ về vị trí row thực tế trong bảng. Nhờ đó, database không cần quét toàn bộ bảng (Sequential Scan) mà có thể **định vị trực tiếp** row cần tìm (Index Scan) với độ phức tạp thấp hơn.

> 💡 **Analogy**: Giống **mục lục cuốn sách** — thay vì đọc từng trang để tìm nội dung, bạn tra mục lục → đi thẳng tới trang cần tìm.

**Trade-off**: Index tăng tốc **đọc** (SELECT) nhưng làm **chậm ghi** (INSERT, UPDATE, DELETE) — vì mỗi lần ghi, database phải cập nhật cả bảng chính lẫn index. Ngoài ra, index chiếm thêm **disk space**.

## Các loại Index trong PostgreSQL

### B-tree (mặc định, phổ biến nhất)

```sql
CREATE INDEX idx_users_email ON users(email);
-- PostgreSQL mặc định tạo B-tree index
```

**Dùng cho**: `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, `IN`, `ORDER BY`, `LIKE 'abc%'`

```
              [M]                   ← Root
            /     \
         [D, H]   [P, T]           ← Branch
        / | \     / | \
    [A-C][E-G][I-L][N-O][Q-S][U-Z] ← Leaf (chứa pointer tới data)
```

Tìm 'G': Root → D<G<H → Branch [E-G] → tìm thấy. **O(log n)** thay vì O(n)

### Hash Index

```sql
CREATE INDEX idx_users_email_hash ON users USING HASH (email);
```

**Dùng cho**: Chỉ `=` (exact equality). **KHÔNG** hỗ trợ range queries, sorting.
**Khi nào**: Key rất dài, chỉ cần tìm chính xác.

### GIN (Generalized Inverted Index)

```sql
-- Full-text search
CREATE INDEX idx_posts_content ON posts USING GIN (to_tsvector('english', content));

-- JSONB queries
CREATE INDEX idx_data_jsonb ON documents USING GIN (data);
```

**Dùng cho**: JSONB, Arrays, Full-text search — data chứa **nhiều giá trị** trong 1 column.

### BRIN (Block Range Index)

```sql
CREATE INDEX idx_logs_created ON logs USING BRIN (created_at);
```

**Dùng cho**: Bảng **rất lớn** với data **tự nhiên có thứ tự** (time-series, logs). Index size **cực nhỏ**.

## Composite Index (Multi-column)

```sql
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

**Quy tắc quan trọng — "Leftmost prefix"**: Index `(A, B, C)` hỗ trợ:
- ✅ Query trên `A`
- ✅ Query trên `A, B`
- ✅ Query trên `A, B, C`
- ❌ Query chỉ trên `B` hoặc `C` → **không dùng được index**

```sql
-- ✅ Dùng index
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM orders WHERE user_id = 1 AND created_at > '2024-01-01';

-- ❌ KHÔNG dùng index (thiếu user_id — cột đầu tiên)
SELECT * FROM orders WHERE created_at > '2024-01-01';
```

## Partial Index

```sql
-- Chỉ index active users → index nhỏ hơn, nhanh hơn
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';
```

## Covering Index (INCLUDE)

```sql
-- Index cover cả email VÀ name → không cần truy cập bảng chính (Index-Only Scan)
CREATE INDEX idx_users_email_incl ON users(email) INCLUDE (name);
```

## Khi nào KHÔNG nên tạo Index?

- Bảng **nhỏ** (< vài trăm rows) → Seq Scan nhanh hơn
- Column có **ít giá trị unique** (low cardinality) — vd: `gender` (chỉ M/F)
- Bảng **write-heavy** → index làm chậm INSERT/UPDATE
- Query **hiếm khi dùng** column đó trong WHERE/JOIN/ORDER BY

---

# 3. Subqueries & CTE

## Subquery (truy vấn con)

```sql
-- Tìm users có order
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders);

-- Tìm users có tổng order > 1000
SELECT * FROM users
WHERE id IN (
  SELECT user_id FROM orders
  GROUP BY user_id
  HAVING SUM(total) > 1000
);
```

## CTE (Common Table Expression) — WITH

```sql
-- Đọc dễ hơn subquery lồng nhau
WITH high_spenders AS (
  SELECT user_id, SUM(total) AS total_spent
  FROM orders
  GROUP BY user_id
  HAVING SUM(total) > 1000
)
SELECT u.name, hs.total_spent
FROM users u
JOIN high_spenders hs ON u.id = hs.user_id;
```

**CTE vs Subquery:**
- CTE dễ đọc hơn, đặc biệt khi query phức tạp
- CTE có thể **recursive** (duyệt cây, hierarchy)
- Performance thường tương đương (PostgreSQL tự optimize)

## Window Functions

```sql
-- Xếp hạng users theo tổng chi tiêu
SELECT
  u.name,
  SUM(o.total) AS total_spent,
  RANK() OVER (ORDER BY SUM(o.total) DESC) AS rank,
  ROW_NUMBER() OVER (ORDER BY SUM(o.total) DESC) AS row_num
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

**Các Window Functions phổ biến:**
| Function | Mô tả |
|---|---|
| `ROW_NUMBER()` | Số thứ tự duy nhất (1, 2, 3...) |
| `RANK()` | Xếp hạng (có thể trùng: 1, 2, 2, 4) |
| `DENSE_RANK()` | Xếp hạng liên tục (1, 2, 2, 3) |
| `LAG(col, n)` | Giá trị của row trước đó n bước |
| `LEAD(col, n)` | Giá trị của row sau đó n bước |
| `SUM() OVER()` | Running total |

---

# 4. Normalization — Chuẩn hóa dữ liệu

## Tại sao cần chuẩn hóa?

Giảm **data redundancy** (trùng lặp) và **anomalies** (bất thường khi INSERT/UPDATE/DELETE).

## Các cấp chuẩn hóa

### 1NF (First Normal Form)
- Mỗi cell chỉ chứa **1 giá trị** (atomic)
- Mỗi row phải **unique** (có primary key)

```
❌ Vi phạm 1NF:
| id | name  | phones            |
|----|-------|-------------------|
| 1  | Alice | 0901234, 0907890  |  ← 2 giá trị trong 1 cell

✅ Đúng 1NF:
| id | name  | phone   |
|----|-------|---------|
| 1  | Alice | 0901234 |
| 1  | Alice | 0907890 |
(hoặc tạo bảng phones riêng)
```

### 2NF
- Đạt 1NF
- Mọi non-key column phụ thuộc vào **toàn bộ** primary key (không phụ thuộc một phần)

```
❌ Vi phạm 2NF (composite key: student_id + course_id):
| student_id | course_id | student_name | grade |
|           → student_name chỉ phụ thuộc student_id, không phụ thuộc course_id

✅ Tách ra: bảng students (id, name) + bảng enrollments (student_id, course_id, grade)
```

### 3NF
- Đạt 2NF
- Không có **transitive dependency** (A → B → C thì C phụ thuộc gián tiếp A)

```
❌ Vi phạm 3NF:
| employee_id | department_id | department_name |
|           → department_name phụ thuộc department_id, không phải employee_id

✅ Tách: bảng employees (id, department_id) + bảng departments (id, name)
```

> 💡 **Phỏng vấn**: "Khi nào KHÔNG nên chuẩn hóa?" → Khi cần **read performance** cao. Denormalization (thêm redundancy có chủ đích) giảm JOINs → query nhanh hơn. Ví dụ: lưu `order_total` thay vì tính lại từ `order_items`.

---

# 5. EXPLAIN ANALYZE — Đọc Query Plan

## Cách dùng

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@test.com';
```

## Đọc output

```
Seq Scan on users  (cost=0.00..24.50 rows=1 width=100) (actual time=0.015..0.204 rows=1 loops=1)
  Filter: (email = 'alice@test.com'::text)
  Rows Removed by Filter: 999
Planning Time: 0.082 ms
Execution Time: 0.230 ms
```

| Thông tin | Giải thích |
|---|---|
| **Seq Scan** | Quét TOÀN BỘ bảng (chậm nếu bảng lớn) → cần index! |
| **cost=0.00..24.50** | Startup cost..Total cost (đơn vị tương đối) |
| **rows=1** | Estimated rows (estimate, có thể sai) |
| **actual time** | Thời gian thực tế (ms) |
| **Rows Removed by Filter: 999** | Quét 1000 rows, bỏ 999, giữ 1 → rất lãng phí! |

**Sau khi thêm index:**

```sql
CREATE INDEX idx_users_email ON users(email);
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@test.com';
```

```
Index Scan using idx_users_email on users  (cost=0.28..8.30 rows=1 width=100) (actual time=0.020..0.021 rows=1 loops=1)
  Index Cond: (email = 'alice@test.com'::text)
Planning Time: 0.090 ms
Execution Time: 0.042 ms
```

| Scan type | Ý nghĩa | Performance |
|---|---|---|
| **Seq Scan** | Quét toàn bộ bảng | 🔴 Chậm (bảng lớn) |
| **Index Scan** | Dùng index → đi thẳng tới row | 🟢 Nhanh |
| **Index Only Scan** | Lấy data từ index luôn (covering) | 🟢 Nhanh nhất |
| **Bitmap Index Scan** | Dùng index tạo bitmap → batch lookup | 🟡 Trung bình |

---

# 6. ORM — Object-Relational Mapping

## ORM là gì?

**ORM (Object-Relational Mapping)** là một **kỹ thuật lập trình** thực hiện **ánh xạ dữ liệu** giữa cơ sở dữ liệu quan hệ (relational database) và các đối tượng (objects) trong ngôn ngữ lập trình hướng đối tượng (OOP). Nhờ ORM, lập trình viên thao tác dữ liệu qua objects thay vì viết SQL thủ công.

### Quy tắc ánh xạ

| Database (Relational) | Code (OOP) |
|---|---|
| Table | Class |
| Row (record) | Object (instance) |
| Column | Property / Field |
| Foreign key / JOIN | Relationship (reference) |

```
  Database                          Code
  ┌────────────────────┐            ┌─────────────────────┐
  │ Table: users       │            │ Class: User         │
  │ ┌──┬────────┬────┐ │            │                     │
  │ │id│ name   │age │ │    ánh     │   user.id    = 1    │
  │ ├──┼────────┼────┤ │  ◄═══►     │   user.name  = "N"  │
  │ │1 │ Nguyen │ 25 │ │    xạ      │   user.age   = 25   │
  │ └──┴────────┴────┘ │            │   user.posts → []   │
  └────────────────────┘            └─────────────────────┘
     row = object                     column = property
```

### Tại sao cần ORM?

Trong OOP, dữ liệu tồn tại dưới dạng objects (có properties, methods, relationships). Database quan hệ lưu dữ liệu dưới dạng rows trong tables — hai hệ thống kiểu dữ liệu **không tương thích trực tiếp**. ORM tự động hóa việc chuyển đổi qua lại giữa chúng.

```typescript
// Không có ORM — tự viết SQL, tự map kết quả
const result = await db.query("SELECT * FROM users WHERE id = 1")
const user = { id: result.rows[0].id, name: result.rows[0].name } // tự map

// Có ORM — thao tác qua objects, ORM lo SQL + mapping
const user = await prisma.user.findUnique({ where: { id: 1 } })
// → ORM sinh SQL, gửi tới DB, nhận rows, map thành typed object
```

### Ưu điểm

- **Giảm SQL thủ công** — viết code OOP thay vì SQL, tăng năng suất phát triển
- **Type-safety** — ORM sinh types tự động (đặc biệt Prisma), bắt lỗi lúc compile
- **Database-independent** — chuyển đổi MySQL ↔ PostgreSQL dễ dàng hơn (ORM sinh đúng SQL dialect)
- **Quản lý transaction, connection pool** — ORM xử lý tự động
- **Domain visibility** — code tập trung vào business logic, không bị SQL chi phối

### Nhược điểm

- **Performance** — ORM có thể sinh queries kém hiệu quả (N+1 problem, unnecessary JOINs). Với truy vấn phức tạp, raw SQL thường nhanh hơn
- **Abstraction leak** — khi cần tối ưu, vẫn phải hiểu SQL bên dưới. ORM không thay thế được kiến thức SQL
- **"Magic"** — ORM che giấu SQL thật → khó debug khi query chậm hoặc sai kết quả
- **Overhead** — thêm một lớp xử lý, tốn thêm memory cho object mapping

## ORM xử lý query như thế nào? — Luồng bên trong

Khi bạn viết code ORM, đằng sau diễn ra một chuỗi biến đổi:

```
1. CODE                         2. ORM PARSE                    3. SQL GENERATION
─────────────                   ──────────────                  ─────────────────
prisma.user.findMany({          ORM phân tích:                  SELECT u.id, u.name, u.email
  where: {                      - Model: User → table "users"   FROM users u
    email: {                    - Filter: email CONTAINS        WHERE u.email LIKE '%@gmail%'
      contains: '@gmail'        - Relation: posts (1-N)         ;
    }                           - Include: JOIN posts
  },                                     ↓                     SELECT p.id, p.title, p.authorId
  include: { posts: true }      Xây dựng query plan             FROM posts p
})                                                              WHERE p.authorId IN (1, 2, 5)
                                                                ;
         ↓                               ↓                              ↓
4. EXECUTE                      5. RESULT MAPPING               6. RETURN OBJECTS
──────────                      ─────────────────               ────────────────
Gửi SQL tới database            Nhận rows từ DB:                Trả về typed objects:
qua database driver             | 1 | Nguyen | n@..  |         [
(pg, mysql2, ...)               | 2 | Trang  | t@..  |           {
                                      ↓                             id: 1,
                                Map rows → objects                   name: "Nguyen",
                                Gắn relations                        email: "n@...",
                                Chuyển kiểu dữ liệu                 posts: [{ ... }]
                                (Date, JSON, enum...)              }
                                                                ]
```

**Tóm lại:** Code → ORM parse → Generate SQL → Execute qua driver → Map kết quả → Trả objects.

## Hai design patterns chính: Active Record vs Data Mapper

Hai mô hình thiết kế ORM chính thức, được Martin Fowler định nghĩa trong *Patterns of Enterprise Application Architecture* (PoEAA, 2003):

### Active Record — "Model tự biết cách lưu chính nó"

**Định nghĩa (Martin Fowler):** *"An object that wraps a row in a database table, encapsulates the database access, and adds domain logic on that data."*

Model class = table, instance = row. Model chứa **cả** business logic **lẫn** DB logic.

```typescript
// Active Record (Sequelize, TypeORM với BaseEntity)
const user = new User()
user.name = "Nguyen"
await user.save()           // ← model TỰ gọi DB
await User.findAll()        // ← static method trên model
```

### Data Mapper — "Model chỉ là data, Repository lo việc DB"

**Định nghĩa (Martin Fowler):** *"A layer of mappers that moves data between objects and a database while keeping them independent of each other."*

Điểm cốt lõi: **model objects hoàn toàn không biết gì về database**. Chúng chỉ là plain objects. Một lớp riêng (repository/mapper) lo việc persist.

```typescript
// Data Mapper (TypeORM với Repository)
const user = new User()     // ← entity "dumb", không biết DB
user.name = "Nguyen"

await userRepository.save(user)  // ← repository lo việc DB
```

### So sánh

| | Active Record | Data Mapper |
|---|---|---|
| **Triết lý** | Model tự lo DB | Tách model khỏi DB logic |
| **Model biết DB?** | **Có** — chứa save(), find()... | **Không** — chỉ là data thuần |
| **Ai xử lý DB?** | Chính model | Repository / Mapper riêng |
| **Coupling** | Tight — đổi schema → sửa model | Loose — model độc lập DB |
| **Đại diện** | Sequelize, Laravel Eloquent, Rails | TypeORM (repo mode), Doctrine, Hibernate |
| **Phù hợp** | CRUD đơn giản, MVP, greenfield | Business phức tạp, Clean Architecture |

> 💡 **Phỏng vấn**: TypeORM hỗ trợ **cả hai** pattern — Active Record (extend `BaseEntity`) và Data Mapper (dùng repositories). Với NestJS, Data Mapper là pattern phổ biến nhất.

## Prisma — Cách tiếp cận Schema-first

Prisma **không** thuộc Active Record hay Data Mapper. Đây là cách tiếp cận riêng: **khai báo schema → tool auto-generate typed client**.

```
┌──────────────────────────────────────────────────────────┐
│  schema.prisma                                           │
│                                                          │
│  model User {                                            │
│    id    Int    @id @default(autoincrement())             │
│    name  String                                          │
│    posts Post[]                                          │
│  }                                                       │
└──────────────────┬───────────────────────────────────────┘
                   │ npx prisma generate
                   ↓
┌──────────────────────────────────────────────────────────┐
│  Generated Prisma Client (100% type-safe)                │
│                                                          │
│  prisma.user.findMany({ where: { name: "..." } })       │
│  prisma.user.create({ data: { name: "..." } })          │
│  → Tự sinh types, auto-complete, compile-time check      │
└──────────────────────────────────────────────────────────┘
```

Prisma tự gọi mình là "next-generation ORM" nhưng thực tế gần **query builder + code generator** hơn — không có class entity, không có instances kiểu truyền thống.

## Prisma v7 — Kiến trúc mới (Rust-free)

Prisma v7 (tháng 11/2025) thay đổi kiến trúc cốt lõi:

### Trước (v6): Query Engine bằng Rust

```
Code (TypeScript)
      ↓
Prisma Client (JS)
      ↓
┌─────────────────────────┐
│  Prisma Query Engine     │ ← Binary Rust (~15-30MB)
│  (Rust native binary)    │    Xử lý: parse query → SQL → connection pool
└────────────┬────────────┘
             ↓
         Database
```

**Vấn đề**: Binary Rust nặng, khó deploy lên serverless/edge, cần đúng platform binary.

### Sau (v7): TypeScript-only + Driver Adapters

```
Code (TypeScript)
      ↓
Prisma Client (JS/TS)      ← Nhẹ hơn ~90%, không cần Rust binary
      ↓
┌─────────────────────────┐
│  Driver Adapter          │ ← @prisma/adapter-pg, adapter-mysql, ...
│  (BẮT BUỘC trong v7)    │    Dùng Node.js driver (pg, mysql2) trực tiếp
└────────────┬────────────┘
             ↓
         Database
```

### Thay đổi quan trọng trong v7

| Thay đổi | v6 | v7 |
|---|---|---|
| **Query Engine** | Rust binary (~15-30MB) | TypeScript-only (nhẹ ~90%) |
| **Driver Adapter** | Tuỳ chọn (preview) | **Bắt buộc** |
| **Connection pool** | Prisma tự quản lý | Dùng pool của Node.js driver (pg, mysql2) |
| **Config** | `schema.prisma` chứa URL | `prisma.config.ts` riêng |
| **Env loading** | Tự đọc `.env` | Phải tự load (dotenv) |
| **Client output** | Generate vào `node_modules` | Phải chỉ định `output` rõ ràng |

```typescript
// Prisma v7 — khởi tạo với driver adapter (BẮT BUỘC)
import { PrismaClient } from './prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
```

> 💡 Driver Adapter cho phép Prisma dùng **trực tiếp** Node.js database drivers (pg, mysql2, better-sqlite3...) — nhờ đó tương thích tốt hơn với serverless, edge functions, và các môi trường không chạy được Rust binary.

---

# 7. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| INNER vs LEFT JOIN? | INNER: chỉ khớp cả 2. LEFT: tất cả trái + khớp phải (NULL nếu không có) |
| Index là gì? Trade-off? | Cấu trúc dữ liệu tăng tốc đọc, nhưng làm chậm ghi và tốn storage |
| B-tree vs Hash index? | B-tree: equality + range + sorting. Hash: chỉ equality |
| Composite index leftmost prefix? | Index (A,B,C) chỉ dùng được cho queries bắt đầu từ A |
| Khi nào KHÔNG tạo index? | Bảng nhỏ, low cardinality, write-heavy, query hiếm khi filter column đó |
| CTE vs Subquery? | CTE dễ đọc hơn, có thể recursive. Performance thường tương đương |
| Normalization là gì? | Giảm data redundancy. 1NF: atomic. 2NF: no partial dependency. 3NF: no transitive dependency |
| Khi nào denormalize? | Read performance quan trọng hơn → giảm JOINs → nhanh hơn |
| EXPLAIN ANALYZE cho biết gì? | Scan type, cost, actual time, rows scanned. Seq Scan trên bảng lớn → cần index |
| ORM là gì? | Kỹ thuật lập trình ánh xạ dữ liệu giữa DB quan hệ (table/row/column) và objects trong OOP (class/object/property). Thao tác objects, ORM sinh SQL |
| Active Record vs Data Mapper? | AR: model tự lo DB (simple, coupled). DM: tách model khỏi DB (clean, phức tạp hơn) |
| Prisma thuộc pattern nào? | Không thuộc AR hay DM — schema-first approach, gần query builder + code generator |
| Prisma v7 thay đổi gì? | Bỏ Rust engine → TypeScript-only, driver adapter bắt buộc, nhẹ hơn ~90% |
