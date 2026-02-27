# Giao dịch & Tính chất ACID — Transactions & ACID

> Tài liệu ôn tập phỏng vấn — bao gồm toàn bộ kiến thức về giao dịch cơ sở dữ liệu cần nắm: tính chất ACID (Atomicity — tính nguyên tử, Consistency — tính nhất quán, Isolation — tính cô lập, Durability — tính bền vững), các mức cô lập (Isolation Levels), chiến lược khoá (Locking Strategies), và khoá chết (Deadlocks). Kiến thức nền tảng bắt buộc cho bất kỳ lập trình viên backend nào.

---

# 1. Transaction (Giao dịch) là gì?

Transaction (giao dịch) là một **nhóm thao tác** được thực thi như **một đơn vị duy nhất** — hoặc **tất cả thành công**, hoặc **tất cả quay lui (rollback)** về trạng thái ban đầu. Nguyên tắc "tất cả hoặc không gì cả" (all or nothing) đảm bảo dữ liệu luôn nhất quán.

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

# 2. Tính chất ACID

| Tính chất | Tên tiếng Việt | Ý nghĩa | Ví dụ |
|---|---|---|---|
| **Atomicity** | Tính nguyên tử | Tất cả hoặc không gì cả — không có trạng thái "nửa chừng" | Chuyển tiền: trừ Alice + cộng Bob → cả 2 hoặc không thao tác nào |
| **Consistency** | Tính nhất quán | Cơ sở dữ liệu luôn ở trạng thái hợp lệ trước và sau giao dịch | Tổng tiền trong hệ thống không đổi sau khi chuyển tiền |
| **Isolation** | Tính cô lập | Các giao dịch chạy đồng thời không ảnh hưởng lẫn nhau | 2 người cùng chuyển tiền → mỗi giao dịch "tưởng" mình là duy nhất |
| **Durability** | Tính bền vững | Sau khi COMMIT, dữ liệu tồn tại vĩnh viễn kể cả khi server sập | Server tắt ngay sau COMMIT → dữ liệu vẫn còn nguyên |

### Atomicity (Tính nguyên tử) chi tiết

```
BEGIN
  ├── UPDATE accounts SET balance = balance - 100 WHERE user = 'alice'  ✅
  ├── UPDATE accounts SET balance = balance + 100 WHERE user = 'bob'    ❌ Lỗi!
  └── ROLLBACK → Hoàn tác step 1 → Alice vẫn còn 100
```

### Consistency (Tính nhất quán) chi tiết

```sql
-- Constraint: balance >= 0
BEGIN;
  UPDATE accounts SET balance = balance - 1000 WHERE user = 'alice';
  -- Alice chỉ có 500 → vi phạm constraint → Transaction ABORT
  -- DB vẫn consistent (balance không âm)
COMMIT;
```

### Durability (Tính bền vững) chi tiết

PostgreSQL dùng **WAL (Write-Ahead Logging — Ghi trước vào nhật ký)**:
1. Trước khi thay đổi dữ liệu → ghi thao tác vào WAL log trước
2. COMMIT → đẩy (flush) WAL xuống ổ đĩa
3. Nếu server sập → khôi phục (recovery) từ WAL → dữ liệu không mất

---

# 3. Isolation Levels (Các mức cô lập)

## Vấn đề khi nhiều transactions chạy đồng thời

### Dirty Read (Đọc bẩn — đọc dữ liệu chưa xác nhận)

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

### Non-repeatable Read (Đọc không lặp lại — cùng truy vấn cho kết quả khác)

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

### Phantom Read (Đọc bóng ma — dòng mới xuất hiện "ma quái")

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

# 4. Chiến lược khoá (Locking Strategies)

## Khoá bi quan (Pessimistic) và Khoá lạc quan (Optimistic)

### Pessimistic Locking (Khoá bi quan) — "Khoá trước, làm sau"

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

### Optimistic Locking (Khoá lạc quan) — "Làm trước, kiểm tra sau"

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

# 5. Deadlock (Khoá chết)

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

# 6. Giao dịch trong Prisma (Prisma Transactions)

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

# 7. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| ACID là gì? | 4 tính chất đảm bảo giao dịch đáng tin cậy: **A**tomicity (tính nguyên tử — tất cả hoặc không), **C**onsistency (tính nhất quán — dữ liệu luôn hợp lệ), **I**solation (tính cô lập — các giao dịch không ảnh hưởng nhau), **D**urability (tính bền vững — dữ liệu tồn tại vĩnh viễn sau COMMIT) |
| Dirty Read (đọc bẩn) là gì? | Đọc dữ liệu mà giao dịch khác **chưa xác nhận** (chưa COMMIT). Nếu giao dịch đó quay lui (ROLLBACK) thì dữ liệu đã đọc là sai |
| Mức cô lập mặc định của PostgreSQL? | Read Committed (đọc dữ liệu đã xác nhận) — đủ cho hầu hết ứng dụng thông thường |
| Khoá lạc quan khác khoá bi quan thế nào? | **Khoá lạc quan (Optimistic):** không khoá dòng, dùng số phiên bản (version) để phát hiện xung đột khi cập nhật → phù hợp khi ít xung đột. **Khoá bi quan (Pessimistic):** khoá dòng trước khi sửa, giao dịch khác phải chờ → phù hợp khi nhiều xung đột |
| Khoá chết (Deadlock) là gì? | 2 giao dịch trở lên chờ nhau giải phóng khoá → không ai tiến lên được. PostgreSQL tự phát hiện và huỷ 1 giao dịch để phá vỡ vòng chờ |
| Phòng tránh khoá chết thế nào? | Luôn khoá tài nguyên theo **cùng thứ tự** cố định, giữ giao dịch **càng ngắn càng tốt**, và thêm logic **thử lại** (retry) khi gặp lỗi khoá chết |
| Giao dịch trong Prisma có mấy loại? | 2 loại: **Sequential** (tuần tự) — `$transaction([...])` chạy danh sách thao tác. **Interactive** (tương tác) — `$transaction(async (tx) => {...})` cho phép logic phức tạp giữa các thao tác |
