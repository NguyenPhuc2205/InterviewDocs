# Tối ưu truy vấn & Vấn đề N+1 — Query Optimization & N+1 Problem

> Tài liệu ôn tập phỏng vấn — vấn đề N+1 là câu hỏi kinh điển trong mọi buổi phỏng vấn backend. Kết hợp với EXPLAIN ANALYZE (phân tích truy vấn), chiến lược phân trang (pagination), và tối ưu hiệu suất (performance tuning).

---

# 1. Vấn đề N+1 (N+1 Problem)

## Là gì?

Vấn đề N+1 xảy ra khi code thực hiện **1 truy vấn lấy danh sách** + **N truy vấn bổ sung** (mỗi phần tử 1 truy vấn riêng) thay vì 1 truy vấn hiệu quả duy nhất. Với 100 phần tử, hệ thống gửi 101 truy vấn thay vì 1-2 truy vấn — chậm gấp hàng chục lần.

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

### 1. Eager Loading (Tải trước — Prisma `include`)

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

# 2. Prisma: `include`, `select`, và JOIN

Prisma cung cấp hai cách chính để lấy dữ liệu quan hệ: `include` (lấy tất cả trường) và `select` (chỉ lấy trường cần thiết). Sự lựa chọn ảnh hưởng trực tiếp đến hiệu suất.

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

# 3. Chiến lược phân trang (Pagination Strategies)

## Phân trang theo độ lệch (Offset-based — truyền thống)

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

## Phân trang theo con trỏ (Cursor-based — hiệu quả hơn)

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

# 4. Connection Pooling (Nhóm kết nối)

## Vấn đề

Mỗi truy vấn cần 1 kết nối tới cơ sở dữ liệu. Tạo kết nối mới tốn thời gian (bắt tay TCP, xác thực...). Nếu 1000 yêu cầu cùng lúc → 1000 kết nối → cơ sở dữ liệu quá tải.

## Giải pháp — Nhóm kết nối (Connection Pool)

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

**Nhóm kết nối giữ sẵn N kết nối** → các yêu cầu mượn/trả kết nối → không cần tạo mới mỗi lần.

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

# 5. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Vấn đề N+1 là gì? | 1 truy vấn lấy danh sách + N truy vấn cho mỗi phần tử → rất chậm. Giải quyết bằng eager loading (Prisma `include`), JOIN, hoặc DataLoader |
| Prisma `include` khác `select` thế nào? | `include` lấy tất cả trường + quan hệ. `select` chỉ lấy các trường chỉ định → hiệu suất tốt hơn vì giảm dữ liệu truyền tải |
| Offset khác Cursor pagination thế nào? | Offset: đơn giản, cho phép nhảy trang, nhưng chậm ở trang lớn. Cursor: hiệu suất ổn định bất kể vị trí, nhưng không nhảy trang được |
| Nhóm kết nối (Connection Pooling) là gì? | Giữ sẵn một nhóm kết nối đã tạo → các yêu cầu mượn/trả kết nối thay vì tạo mới mỗi lần → giảm chi phí và tăng hiệu suất |
| PgBouncer dùng khi nào? | Khi có nhiều instance ứng dụng cần kết nối cơ sở dữ liệu — PgBouncer gộp nhiều kết nối ứng dụng thành vài kết nối thực tới PostgreSQL. Chế độ Transaction phổ biến nhất |
