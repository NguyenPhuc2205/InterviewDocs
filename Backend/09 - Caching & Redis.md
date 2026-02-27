# Bộ nhớ đệm & Redis — Caching & Redis

> Tài liệu ôn tập phỏng vấn — kiến thức quan trọng cho cấp mid-level: các chiến lược bộ nhớ đệm (caching strategies), cấu trúc dữ liệu Redis (Redis data structures), bộ nhớ đệm HTTP (HTTP caching), và vô hiệu hoá bộ nhớ đệm (cache invalidation). Biết cách dùng bộ nhớ đệm đúng = tăng hiệu suất đáng kể.

---

# 1. Bộ nhớ đệm (Caching) là gì?

Lưu trữ bản sao dữ liệu ở nơi **truy cập nhanh hơn** so với nguồn gốc → giảm độ trễ (latency), giảm tải cho cơ sở dữ liệu và server.

```
Không Cache:
Client ──► Server ──► Database (100ms mỗi query)

Có Cache:
Client ──► Server ──► Redis Cache (1ms) ──► HIT → trả về ngay
                              │
                              └── MISS → Database (100ms) → lưu vào cache → trả về
```

---

# 2. Các chiến lược bộ nhớ đệm (Caching Strategies)

## Cache-Aside (Tải lười — Lazy Loading) — Phổ biến nhất

```
1. App check cache → HIT → return cached data
2. App check cache → MISS → query DB → lưu vào cache → return

App là "trung gian" giữa cache và DB, tự quản lý cả 2.
```

```typescript
async getUser(id: string): Promise<User> {
  // 1. Check cache
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached); // HIT → trả về

  // 2. MISS → query DB
  const user = await prisma.user.findUnique({ where: { id } });

  // 3. Lưu cache (TTL 1 giờ)
  await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);

  return user;
}
```

**Ưu điểm**: Chỉ cache data thực sự dùng, đơn giản.
**Nhược điểm**: Cache miss đầu tiên chậm (cold start). Data có thể stale (cũ).

## Write-Through (Ghi đồng thời vào cache và cơ sở dữ liệu)

```
1. App ghi data → ghi vào CACHE + DB cùng lúc
2. App đọc data → đọc từ cache (luôn up-to-date)
```

**Ưu điểm**: Cache luôn đồng bộ với DB → không bao giờ stale.
**Nhược điểm**: Ghi chậm hơn (phải ghi 2 nơi). Cache data không dùng tới.

## Write-Behind / Write-Back (Ghi cache trước, cơ sở dữ liệu sau)

```
1. App ghi data → ghi vào CACHE (nhanh)
2. Cache tự ghi xuống DB (async, batch)
```

**Ưu điểm**: Ghi cực nhanh.
**Nhược điểm**: Rủi ro mất data nếu cache crash trước khi flush xuống DB.

## Read-Through (Cache tự truy vấn cơ sở dữ liệu)

```
1. App đọc data từ cache
2. Nếu MISS → cache TỰ query DB → lưu → trả về app

Giống Cache-Aside nhưng cache tự quản lý DB query.
```

### So sánh

| Strategy | Đọc | Ghi | Data freshness | Phức tạp |
|---|---|---|---|---|
| **Cache-Aside** | App check cache → DB | App ghi DB → invalidate cache | 🟡 Có thể stale | Đơn giản |
| **Write-Through** | Đọc từ cache | Ghi cache + DB đồng thời | 🟢 Luôn fresh | Trung bình |
| **Write-Behind** | Đọc từ cache | Ghi cache → async ghi DB | 🟢 Fresh | Phức tạp |
| **Read-Through** | Cache tự query DB | App ghi DB | 🟡 Có thể stale | Trung bình |

---

# 3. Redis — Kho dữ liệu trong bộ nhớ (In-Memory Data Store)

## Redis là gì?

Redis = **Remote Dictionary Server (‘Từ điển từ xa’)**. Là kho dữ liệu dạng khoá-giá trị (key-value) lưu trữ trong bộ nhớ RAM, cực nhanh (dưới 1 mili giây). Dùng cho bộ nhớ đệm (caching), lưu trữ phiên (session store), nhắn tin xuất bản-đăng ký (pub/sub), giới hạn tốc độ (rate limiting).

## Cấu trúc dữ liệu (Data Structures)

```bash
# String — đơn giản nhất
SET user:1 '{"name":"Alice","email":"alice@test.com"}'
GET user:1
SET counter 0
INCR counter        # → 1 (atomic)
INCRBY counter 5    # → 6

# String with TTL
SET session:abc123 '{"userId":1}' EX 3600  # hết hạn sau 1 giờ
TTL session:abc123  # → 3598 (seconds remaining)

# Hash — giống object/map
HSET user:1 name "Alice" email "alice@test.com" age 25
HGET user:1 name        # → "Alice"
HGETALL user:1           # → {name: "Alice", email: "...", age: 25}

# List — ordered list (queue/stack)
LPUSH queue:emails "email1" "email2"  # push trái
RPOP queue:emails                      # pop phải → "email1" (FIFO queue)

# Set — unique values
SADD online:users "user1" "user2" "user3"
SISMEMBER online:users "user1"  # → 1 (true)
SMEMBERS online:users           # → {"user1", "user2", "user3"}

# Sorted Set — set + score (ranking)
ZADD leaderboard 100 "Alice" 85 "Bob" 95 "Charlie"
ZREVRANGE leaderboard 0 2    # → ["Alice", "Charlie", "Bob"] (top 3)
ZRANK leaderboard "Bob"      # → 0 (rank thấp nhất)

# Pub/Sub
SUBSCRIBE channel:notifications    # subscriber lắng nghe
PUBLISH channel:notifications "New message!"  # publisher gửi
```

### Chọn data structure nào?

| Use case | Structure | Ví dụ |
|---|---|---|
| Cache API response | String | `SET api:/users '[...]'` |
| Session store | String/Hash | `SET session:abc '{...}'` |
| User profile | Hash | `HSET user:1 name "Alice"` |
| Message queue | List | `LPUSH queue "msg"` / `RPOP queue` |
| Online users | Set | `SADD online "user1"` |
| Leaderboard | Sorted Set | `ZADD scores 100 "Alice"` |
| Rate limiting | String + INCR | `INCR rate:ip:1.2.3.4` |

---

# 4. Bộ nhớ đệm HTTP (HTTP Caching)

## Header Cache-Control (Kiểm soát bộ nhớ đệm)

```
Cache-Control: public, max-age=31536000   ← CDN + browser cache 1 năm (static assets)
Cache-Control: private, max-age=3600      ← Chỉ browser cache (user-specific data)
Cache-Control: no-cache                   ← Cache nhưng phải revalidate mỗi lần
Cache-Control: no-store                   ← KHÔNG cache (sensitive data)
```

| Directive | Ý nghĩa |
|---|---|
| `public` | CDN, proxy, browser đều cache được |
| `private` | Chỉ browser cache (không CDN/proxy) |
| `max-age=N` | Cache N giây |
| `no-cache` | Cache nhưng revalidate trước khi dùng |
| `no-store` | Tuyệt đối không cache |
| `must-revalidate` | Sau khi hết hạn → PHẢI revalidate |

## ETag — Kiểm tra tính hợp lệ của bộ nhớ đệm (Validation)

```
Lần 1:
Server ──► 200 OK
           ETag: "abc123"        ← fingerprint của content
           Cache-Control: no-cache

Lần 2:
Client ──► GET /data
           If-None-Match: "abc123"   ← gửi ETag cũ

Server ──► Content chưa đổi → 304 Not Modified (không gửi body → bandwidths!)
     hoặc → Content đã đổi → 200 OK + body mới + ETag mới
```

---

# 5. Vô hiệu hoá bộ nhớ đệm (Cache Invalidation) — "Bài toán khó nhất khoa học máy tính"

> *"There are only two hard things in Computer Science: cache invalidation and naming things."* — Phil Karlton

## Strategies

| Strategy | Cách làm | Trade-off |
|---|---|---|
| **TTL (Time-to-Live)** | Cache tự hết hạn sau N giây | Đơn giản. Data stale trong TTL window |
| **Event-driven** | Khi data thay đổi → invalidate cache | Fresh nhưng phức tạp hơn |
| **Write-through** | Ghi cache + DB cùng lúc | Luôn fresh nhưng ghi chậm |

```typescript
// Event-driven invalidation
async updateUser(id: string, data: UpdateUserDto) {
  const user = await prisma.user.update({ where: { id }, data });
  await redis.del(`user:${id}`);        // ← Xóa cache cũ
  // Hoặc: await redis.set(`user:${id}`, JSON.stringify(user));  ← Update cache
  return user;
}
```

## Cache Stampede / Thundering Herd (Hiệu ứng bầy đàn)

**Vấn đề:** Khoá bộ nhớ đệm phổ biến hết hạn → hàng nghìn yêu cầu cùng truy vấn cơ sở dữ liệu → cơ sở dữ liệu quá tải.

```
Cache HẾT HẠN
  ├── Request 1 → MISS → query DB ──┐
  ├── Request 2 → MISS → query DB ──┼── Database overload!
  ├── Request 3 → MISS → query DB ──┤
  └── .......................... ────┘
```

**Giải pháp:**
| Giải pháp | Cách làm |
|---|---|
| **Locking** | Request đầu tiên lock → query DB → cache → unlock. Các request khác chờ |
| **Early refresh** | Refresh cache TRƯỚC khi hết hạn (background task) |
| **Probabilistic expiry** | TTL + random offset → không cùng hết hạn |

---

# 6. Redis trong NestJS

Cách tích hợp Redis làm bộ nhớ đệm trong ứng dụng NestJS:

```typescript
// Install
// npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet

// Module setup
@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 3600, // default TTL: 1 giờ
    }),
  ],
})
export class AppModule {}

// Sử dụng trong service
@Injectable()
export class UsersService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async getUser(id: string) {
    const cacheKey = `user:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({ where: { id } });
    await this.cache.set(cacheKey, user, 3600);
    return user;
  }
}

// Hoặc dùng decorator (auto-cache)
@UseInterceptors(CacheInterceptor)
@CacheTTL(60)    // cache 60 giây
@CacheKey('all-users')
@Get()
findAll() {
  return this.usersService.findAll();
}
```

---

# 7. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Cache-Aside là gì? | Ứng dụng kiểm tra bộ nhớ đệm → không có (MISS) → truy vấn cơ sở dữ liệu → lưu vào bộ nhớ đệm → trả về. Ứng dụng quản lý cả bộ nhớ đệm lẫn cơ sở dữ liệu |
| Write-Through khác Write-Behind thế nào? | Write-Through: ghi vào bộ nhớ đệm và cơ sở dữ liệu đồng thời (nhất quán nhưng chậm hơn). Write-Behind: ghi vào bộ nhớ đệm trước, cơ sở dữ liệu sau (nhanh nhưng có rủi ro mất dữ liệu) |
| Cấu trúc dữ liệu Redis có những loại nào? | String (chuỗi), Hash (bảng băm), List (danh sách), Set (tập hợp), Sorted Set (tập hợp có thứ tự). Chọn tuỳ theo tình huống: bộ nhớ đệm, phiên, hàng đợi, bảng xếp hạng |
| Vô hiệu hoá bộ nhớ đệm (Cache Invalidation) khó ở đâu? | Đảm bảo dữ liệu nhất quán giữa bộ nhớ đệm và cơ sở dữ liệu. Dùng TTL (thời gian sống), sự kiện (event-driven), hoặc ghi đồng thời (write-through) |
| Cache Stampede (hiệu ứng bầy đàn) là gì? | Khoá bộ nhớ đệm phổ biến hết hạn → nhiều yêu cầu cùng truy vấn cơ sở dữ liệu → quá tải. Giải pháp: khoá (locking), làm mới sớm (early refresh), hết hạn ngẫu nhiên (probabilistic expiry) |
| ETag hoạt động thế nào? | Server gửi ETag (dấu vân tay của nội dung). Client gửi lại qua `If-None-Match`. Server so sánh → nếu giống nhau thì trả 304 (chưa thay đổi) → không gửi lại nội dung → tiết kiệm băng thông |
