# Transactions & ACID

> **Chủ đề phỏng vấn quan trọng** — ACID properties, Isolation Levels, Locking strategies, Deadlocks. Kiến thức nền tảng cho bất kỳ backend developer nào.

---

# 1. Transaction là gì?

Transaction là một **nhóm operations** được thực thi như **một đơn vị duy nhất** — hoặc **tất cả thành công**, hoặc **tất cả rollback** (quay lại trạng thái ban đầu).

```sql
-- Chuyển tiền từ Alice → Bob: 2 operations phải CÙNG thành công hoặc CÙNG thất bại
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE user_id = 'alice';
  UPDATE accounts SET balance = balance + 100 WHERE user_id = 'bob';
COMMIT;
-- Nếu bất kỳ step nào lỗi → ROLLBACK tất cả
```

**Nếu không có transaction**: Alice bị trừ tiền nhưng Bob chưa nhận → tiền "biến mất".

---

# 2. ACID Properties

| Property | Ý nghĩa | Ví dụ |
|---|---|---|
| **Atomicity** | Tất cả hoặc không gì cả | Chuyển tiền: trừ Alice + cộng Bob → cả 2 hoặc không |
| **Consistency** | DB luôn ở trạng thái hợp lệ trước và sau transaction | Tổng tiền trong hệ thống không đổi sau chuyển tiền |
| **Isolation** | Các transactions chạy đồng thời không ảnh hưởng nhau | 2 người cùng chuyển tiền không bị xung đột |
| **Durability** | Sau khi COMMIT, data tồn tại vĩnh viễn kể cả khi crash | Server tắt ngay sau COMMIT → data vẫn còn |

### Atomicity chi tiết

```
BEGIN
  ├── UPDATE accounts SET balance = balance - 100 WHERE user = 'alice'  ✅
  ├── UPDATE accounts SET balance = balance + 100 WHERE user = 'bob'    ❌ Lỗi!
  └── ROLLBACK → Hoàn tác step 1 → Alice vẫn còn 100
```

### Consistency chi tiết

```sql
-- Constraint: balance >= 0
BEGIN;
  UPDATE accounts SET balance = balance - 1000 WHERE user = 'alice';
  -- Alice chỉ có 500 → vi phạm constraint → Transaction ABORT
  -- DB vẫn consistent (balance không âm)
COMMIT;
```

### Durability chi tiết

PostgreSQL dùng **WAL (Write-Ahead Logging)**:
1. Trước khi thay đổi data → ghi vào WAL log trước
2. COMMIT → WAL flush vào disk
3. Nếu crash → recovery từ WAL → data không mất

---

# 3. Isolation Levels — Mức độ cô lập

## Vấn đề khi nhiều transactions chạy đồng thời

### Dirty Read

```
Transaction A:                     Transaction B:
BEGIN;                              
UPDATE accounts SET balance = 0     
WHERE user = 'alice';               
                                    BEGIN;
                                    SELECT balance FROM accounts
                                    WHERE user = 'alice';
                                    → Đọc balance = 0 (chưa COMMIT!)
ROLLBACK; → balance thực tế vẫn = 500
                                    → Transaction B đã đọc data SAI (dirty)
```

### Non-repeatable Read

```
Transaction A:                     Transaction B:
BEGIN;                              
SELECT balance FROM accounts        
WHERE user = 'alice';               
→ balance = 500                     
                                    BEGIN;
                                    UPDATE accounts SET balance = 0
                                    WHERE user = 'alice';
                                    COMMIT;
SELECT balance FROM accounts        
WHERE user = 'alice';               
→ balance = 0 ← KHÁC lần đọc trước!
```

### Phantom Read

```
Transaction A:                     Transaction B:
BEGIN;                              
SELECT COUNT(*) FROM orders          
WHERE status = 'pending';           
→ 5 orders                         
                                    BEGIN;
                                    INSERT INTO orders (status) VALUES ('pending');
                                    COMMIT;
SELECT COUNT(*) FROM orders          
WHERE status = 'pending';           
→ 6 orders ← ROW MỚI xuất hiện (phantom)!
```

## 4 Isolation Levels

| Isolation Level | Dirty Read | Non-repeatable Read | Phantom Read | Performance |
|---|---|---|---|---|
| **Read Uncommitted** | ❌ Có thể | ❌ Có thể | ❌ Có thể | 🟢 Nhanh nhất |
| **Read Committed** | ✅ Chặn | ❌ Có thể | ❌ Có thể | 🟢 Nhanh |
| **Repeatable Read** | ✅ Chặn | ✅ Chặn | ❌ Có thể* | 🟡 Trung bình |
| **Serializable** | ✅ Chặn | ✅ Chặn | ✅ Chặn | 🔴 Chậm nhất |

> 💡 **PostgreSQL mặc định**: **Read Committed**. Hầu hết ứng dụng dùng Read Committed là đủ.
>
> **Note**: PostgreSQL implementation của Repeatable Read thực tế cũng chặn Phantom Read (dùng MVCC snapshot), nên về thực tế nó gần như Serializable.

```sql
-- Đặt isolation level cho transaction
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
  SELECT * FROM accounts WHERE user = 'alice';
  -- ... operations ...
COMMIT;

-- Đặt mặc định cho session
SET default_transaction_isolation = 'serializable';
```

---

# 4. Locking Strategies

## Optimistic vs Pessimistic Locking

### Pessimistic Locking — "Khóa trước, làm sau"

```sql
-- Lock row → không ai sửa được cho đến khi COMMIT
BEGIN;
SELECT * FROM products WHERE id = 1 FOR UPDATE; -- ← LOCK row
-- ... tính toán, cập nhật ...
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT; -- ← UNLOCK
```

**Cơ chế**: SELECT ... FOR UPDATE → lock row → transaction khác phải **chờ** cho đến khi lock được giải phóng.

**Dùng khi**: High contention — nhiều transactions cùng sửa 1 row (ví dụ: giảm stock sản phẩm hot).

### Optimistic Locking — "Làm trước, check sau"

```sql
-- Không lock. Dùng version number để detect conflict.
-- Bước 1: Đọc data + version
SELECT stock, version FROM products WHERE id = 1;
-- → stock = 10, version = 3

-- Bước 2: Update với condition trên version
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 1 AND version = 3;  -- ← Check version chưa thay đổi

-- Nếu rows affected = 0 → version đã thay đổi (ai đó sửa rồi) → RETRY
-- Nếu rows affected = 1 → update thành công
```

```typescript
// Prisma optimistic locking
async function purchaseProduct(productId: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });

  try {
    await prisma.product.update({
      where: { id: productId, version: product.version }, // ← check version
      data: { stock: product.stock - 1, version: product.version + 1 },
    });
  } catch (e) {
    // Record not found (version changed) → retry
    throw new ConflictException('Product was modified, please retry');
  }
}
```

**Dùng khi**: Low contention — ít khi 2 transactions cùng sửa 1 row.

### So sánh

| | Pessimistic | Optimistic |
|---|---|---|
| **Cơ chế** | Lock row → block transactions khác | Không lock, check version khi update |
| **Conflict handling** | Prevent conflicts (block) | Detect conflicts (retry) |
| **Performance** | 🔴 Có thể bottleneck (lock wait) | 🟢 Không block (nhưng retry nếu conflict) |
| **Dùng khi** | High contention, short transactions | Low contention, read-heavy |
| **Ví dụ** | Giảm stock sản phẩm hot, chuyển tiền | Edit profile, update settings |

## Row-level vs Table-level Locks

| | Row-level | Table-level |
|---|---|---|
| **Lock gì** | Chỉ 1 row | Toàn bộ bảng |
| **Granularity** | Fine (chi tiết) | Coarse (thô) |
| **Concurrency** | 🟢 Cao (lock ít) | 🔴 Thấp (block tất cả) |
| **Overhead** | 🟡 Nhiều lock objects | 🟢 Ít overhead |
| **SQL** | `SELECT ... FOR UPDATE` | `LOCK TABLE ... IN EXCLUSIVE MODE` |

---

# 5. Deadlocks

## Là gì?

Deadlock xảy ra khi **2+ transactions chờ nhau** giải phóng lock → không ai tiến lên được → hệ thống "treo".

```
Transaction A:                     Transaction B:
BEGIN;                              BEGIN;
LOCK row 1 ✅                      LOCK row 2 ✅
...                                 ...
LOCK row 2 ← CHỜ B giải phóng     LOCK row 1 ← CHỜ A giải phóng
     ↑                                  ↑
     └──────── DEADLOCK! ───────────────┘
     Cả 2 chờ nhau mãi mãi
```

## PostgreSQL xử lý Deadlock thế nào?

PostgreSQL tự động phát hiện deadlock:
1. **Deadlock detector** chạy định kỳ (mặc định 1 giây)
2. Phát hiện → **abort 1 transaction** (chọn transaction "rẻ" nhất)
3. Transaction bị abort → rollback → transaction còn lại tiếp tục

```
ERROR: deadlock detected
DETAIL: Process 1234 waits for ShareLock on transaction 5678;
        blocked by process 5678.
        Process 5678 waits for ShareLock on transaction 1234;
        blocked by process 1234.
HINT: See server log for query details.
```

## Phòng tránh Deadlock

| Biện pháp | Giải thích |
|---|---|
| **Lock theo thứ tự** | Luôn lock resources theo **cùng thứ tự** (ví dụ: lock user_id nhỏ trước) |
| **Transaction ngắn** | Giữ transaction càng ngắn càng tốt → giảm thời gian lock |
| **Tránh lock nhiều rows** | Lock ít rows = ít chance deadlock |
| **Retry logic** | Khi bị deadlock → catch error → **retry transaction** |

```typescript
// Retry logic cho deadlock
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === '40P01' && i < maxRetries - 1) { // deadlock_detected
        await new Promise(r => setTimeout(r, Math.random() * 100)); // random delay
        continue;
      }
      throw error;
    }
  }
}
```

---

# 6. Transactions trong Prisma

```typescript
// Sequential Transaction — chạy tuần tự trong 1 transaction
const result = await prisma.$transaction([
  prisma.account.update({
    where: { userId: 'alice' },
    data: { balance: { decrement: 100 } },
  }),
  prisma.account.update({
    where: { userId: 'bob' },
    data: { balance: { increment: 100 } },
  }),
]);

// Interactive Transaction — linh hoạt hơn, có thể đọc + logic + ghi
const result = await prisma.$transaction(async (tx) => {
  const alice = await tx.account.findUnique({ where: { userId: 'alice' } });

  if (alice.balance < 100) {
    throw new Error('Insufficient balance'); // → auto ROLLBACK
  }

  await tx.account.update({
    where: { userId: 'alice' },
    data: { balance: { decrement: 100 } },
  });
  await tx.account.update({
    where: { userId: 'bob' },
    data: { balance: { increment: 100 } },
  });

  return { success: true };
}, {
  isolationLevel: 'Serializable', // optional: set isolation level
  timeout: 5000,                   // optional: max execution time
});
```

---

# 7. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| ACID là gì? | Atomicity (tất cả/không), Consistency (hợp lệ), Isolation (cô lập), Durability (bền vững) |
| Dirty Read là gì? | Đọc data chưa COMMIT → nếu ROLLBACK thì data sai |
| Default isolation level PostgreSQL? | Read Committed |
| Optimistic vs Pessimistic locking? | Optimistic: check version khi update (low contention). Pessimistic: lock row (high contention) |
| Deadlock là gì? | 2 transactions chờ nhau giải phóng lock. PostgreSQL tự detect + abort 1 transaction |
| Phòng deadlock thế nào? | Lock theo thứ tự cố định, transaction ngắn, retry logic |
| Transaction trong Prisma? | Sequential: `$transaction([...])`. Interactive: `$transaction(async (tx) => {...})` |
