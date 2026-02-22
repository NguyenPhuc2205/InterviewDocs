# Query Optimization & N+1 Problem

> **Chủ đề phỏng vấn thực chiến** — N+1 Problem là câu hỏi kinh điển. Kết hợp với EXPLAIN ANALYZE, pagination strategies, và performance tuning.

---

# 1. N+1 Problem

## Là gì?

N+1 xảy ra khi code thực hiện **1 query lấy danh sách** + **N queries bổ sung** (mỗi item 1 query) thay vì 1 query hiệu quả.

## Ví dụ

```typescript
// ❌ N+1 Problem — 1 + 100 queries = 101 queries!
const users = await prisma.user.findMany(); // Query 1: SELECT * FROM users (100 users)

for (const user of users) {
  const orders = await prisma.order.findMany({ // Query 2..101: mỗi user 1 query
    where: { userId: user.id },
  });
  console.log(user.name, orders.length);
}
```

```sql
-- Thực tế chạy:
SELECT * FROM users;                          -- 1 query
SELECT * FROM orders WHERE user_id = 1;       -- query 2
SELECT * FROM orders WHERE user_id = 2;       -- query 3
...
SELECT * FROM orders WHERE user_id = 100;     -- query 101
-- Tổng: 101 queries! Chậm kinh khủng với bảng lớn
```

## Giải pháp

### 1. Eager Loading (Prisma `include`)

```typescript
// ✅ 2 queries thay vì 101!
const users = await prisma.user.findMany({
  include: { orders: true }, // Prisma tự JOIN hoặc IN query
});
```

```sql
-- Prisma thực tế chạy:
SELECT * FROM users;
SELECT * FROM orders WHERE user_id IN (1, 2, 3, ..., 100);
-- Chỉ 2 queries!
```

### 2. JOIN (SQL thuần)

```sql
-- 1 query duy nhất
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

### 3. DataLoader Pattern (GraphQL)

```typescript
// Batch nhiều requests thành 1 query
import DataLoader from 'dataloader';

const orderLoader = new DataLoader(async (userIds: number[]) => {
  const orders = await prisma.order.findMany({
    where: { userId: { in: userIds } },
  });
  // Group orders by userId → trả về đúng thứ tự
  return userIds.map(id => orders.filter(o => o.userId === id));
});

// Sử dụng
const orders = await orderLoader.load(userId); // Tự batch nhiều .load() thành 1 query
```

### So sánh giải pháp

| Giải pháp | Queries | Khi nào dùng |
|---|---|---|
| **N+1 (lỗi)** | 1 + N | ❌ Không bao giờ |
| **Eager loading** | 2 | ✅ ORM (Prisma include) |
| **JOIN** | 1 | ✅ SQL thuần, quan hệ đơn giản |
| **DataLoader** | 1 (batched) | ✅ GraphQL, nhiều resolvers |

---

# 2. Prisma: `include` vs `select` vs JOIN

```typescript
// include — lấy tất cả fields + relations
const users = await prisma.user.findMany({
  include: { orders: true },
});
// → user.orders: Order[] (tất cả fields của Order)

// select — chỉ lấy fields cần thiết (performance tốt hơn)
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    orders: {
      select: { id: true, total: true }, // chỉ lấy id và total
    },
  },
});
// → user.orders: { id, total }[] (ít data hơn)

// Nested filtering
const users = await prisma.user.findMany({
  include: {
    orders: {
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 5, // chỉ lấy 5 orders gần nhất
    },
  },
});
```

> 💡 **Best practice**: Dùng `select` thay vì `include` khi chỉ cần vài fields → giảm data transfer, tăng performance.

---

# 3. Pagination Strategies

## Offset-based (truyền thống)

```typescript
// Page 3, 20 items/page
const users = await prisma.user.findMany({
  skip: 40,   // (page - 1) * pageSize = (3-1) * 20
  take: 20,
  orderBy: { createdAt: 'desc' },
});
```

```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 20 OFFSET 40;
```

**Ưu điểm**: Đơn giản, nhảy tới bất kỳ page nào.

**Nhược điểm**:
- **Chậm ở page lớn** — `OFFSET 10000` → DB phải quét 10000 rows rồi bỏ đi
- **Data inconsistency** — nếu có INSERT/DELETE giữa 2 requests → có thể bỏ sót hoặc trùng items

## Cursor-based (hiệu quả hơn)

```typescript
// Lần đầu
const users = await prisma.user.findMany({
  take: 20,
  orderBy: { createdAt: 'desc' },
});

// Lần sau — dùng ID cuối cùng làm cursor
const nextUsers = await prisma.user.findMany({
  take: 20,
  skip: 1,                        // skip cursor item
  cursor: { id: lastUser.id },    // bắt đầu từ đây
  orderBy: { createdAt: 'desc' },
});
```

```sql
-- Cursor-based thực tế:
SELECT * FROM users
WHERE created_at < '2024-01-15T10:00:00'  -- cursor condition
ORDER BY created_at DESC
LIMIT 20;
-- Không dùng OFFSET → nhanh bất kể page nào
```

### So sánh

| | Offset | Cursor |
|---|---|---|
| **Performance page lớn** | 🔴 Chậm (quét + bỏ) | 🟢 Nhanh (WHERE + LIMIT) |
| **Jump to page** | ✅ Có thể | ❌ Chỉ next/prev |
| **Data consistency** | 🔴 Có thể bị sai | 🟢 Ổn định |
| **Implementation** | Đơn giản | Phức tạp hơn |
| **Dùng khi** | Admin panel, ít data | Infinite scroll, feed, API công cộng |

---

# 4. Connection Pooling

## Vấn đề

Mỗi query cần 1 database connection. Tạo connection tốn thời gian (TCP handshake, auth...). Nếu 1000 requests cùng lúc → 1000 connections → database quá tải.

## Giải pháp — Connection Pool

```
Application                    Connection Pool              Database
   │                         ┌──────────────┐
   │── Request 1 ───────────►│ Connection 1 │──────────────► PostgreSQL
   │── Request 2 ───────────►│ Connection 2 │──────────────► PostgreSQL
   │── Request 3 ───────────►│ Connection 3 │──────────────► PostgreSQL
   │── Request 4 ─── WAIT ──►│ (pool full)  │               PostgreSQL
   │                         └──────────────┘
   │          Request 1 xong → trả connection về pool
   │── Request 4 ───────────►│ Connection 1 │──────────────► PostgreSQL (reuse!)
```

**Pool giữ sẵn N connections** → requests mượn/trả connection → không cần tạo mới mỗi lần.

```
// Prisma connection pool (schema.prisma)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ?connection_limit=10&pool_timeout=10
}
```

**PgBouncer**: External connection pooler cho PostgreSQL, đặt giữa app và DB:
- **Transaction mode**: Connection chỉ bị giữ trong transaction → reuse giữa các requests
- **Session mode**: Connection giữ cho cả session
- Cho phép **hàng ngàn app connections → vài chục DB connections**

---

# 5. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| N+1 problem là gì? | 1 query lấy list + N queries cho mỗi item. Giải quyết bằng eager loading, JOIN, DataLoader |
| Prisma include vs select? | include: lấy tất cả fields. select: chỉ fields cần → performance tốt hơn |
| Offset vs Cursor pagination? | Offset: đơn giản nhưng chậm page lớn. Cursor: nhanh nhưng không jump page |
| Connection pooling là gì? | Giữ sẵn N connections → reuse → tránh tạo mới mỗi request |
| PgBouncer dùng khi nào? | Nhiều app instances → ít DB connections. Transaction mode phổ biến nhất |
