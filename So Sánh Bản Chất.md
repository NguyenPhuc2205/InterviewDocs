# So Sánh Bản Chất — Các Khái Niệm Thường Gặp Trong Phỏng Vấn

> Tài liệu tổng hợp các cặp so sánh **bản chất** — tập trung vào **tại sao**, **cách hoạt động**, và **khi nào dùng gì**, không chỉ liệt kê bề mặt.

---

## Mục lục

**Kiến trúc & Hạ tầng:**
1. [SPA vs MPA](#1-spa-vs-mpa)
2. [CSR vs SSR vs SSG vs ISR](#2-csr-vs-ssr-vs-ssg-vs-isr)
3. [SQL vs NoSQL](#3-sql-vs-nosql)
4. [TCP vs UDP](#4-tcp-vs-udp--giao-thức-có-kết-nối-vs-không-kết-nối)
5. [HTTP vs WebSocket](#5-http-vs-websocket)
6. [Monolith vs Microservices](#6-monolith-vs-microservices)
7. [REST vs GraphQL](#7-rest-vs-graphql)

**JavaScript Core:**
8. [Execution Context — Toàn bộ bức tranh](#8-execution-context)
9. [var vs let vs const](#9-var-vs-let-vs-const)
10. [Scope vs Lexical Scope vs Scope Chain vs Closure](#10-scope-vs-lexical-scope-vs-scope-chain-vs-closure)
11. [== vs ===](#11--vs-)
12. [null vs undefined](#12-null-vs-undefined)
13. [Callback vs Promise vs Async/Await](#13-callback-vs-promise-vs-asyncawait)

**Node.js:**
14. [process.nextTick vs setImmediate vs setTimeout](#14-processnexttick-vs-setimmediate-vs-settimeout)
15. [Microtask vs Macrotask (Phase Queue)](#15-microtask-vs-macrotask)
16. [CommonJS vs ES Modules](#16-commonjs-vs-es-modules)
17. [npm vs yarn vs pnpm](#17-npm-vs-yarn-vs-pnpm)

**TypeScript & NestJS:**
18. [interface vs type (TypeScript)](#18-interface-vs-type)
19. [Abstract Class vs Interface](#19-abstract-class-vs-interface)
20. [DIP vs IoC vs DI](#20-dip-vs-ioc-vs-di)
21. [Middleware vs Guard vs Interceptor vs Pipe](#21-middleware-vs-guard-vs-interceptor-vs-pipe)
22. [Stateless vs Stateful](#22-stateless-vs-stateful)
23. [Throttle vs Debounce](#23-throttle-vs-debounce)
24. [Rate Limiting — Các thuật toán](#24-rate-limiting--các-thuật-toán)

**Bổ sung:**
25. [Authentication vs Authorization](#25-authentication-vs-authorization)
26. [Cookie vs localStorage vs sessionStorage](#26-cookie-vs-localstorage-vs-sessionstorage)
27. [PUT vs PATCH vs POST](#27-put-vs-patch-vs-post)
28. [Encoding vs Encryption vs Hashing](#28-encoding-vs-encryption-vs-hashing)
29. [Concurrency vs Parallelism](#29-concurrency-vs-parallelism)
30. [Shallow Copy vs Deep Copy](#30-shallow-copy-vs-deep-copy)
31. [Vertical vs Horizontal Scaling](#31-vertical-vs-horizontal-scaling)

32. [Câu hỏi phỏng vấn tổng hợp](#32-câu-hỏi-phỏng-vấn-tổng-hợp)

---

# 1. SPA vs MPA

## 📌 Bản chất khác biệt

| | SPA (Single-Page Application) | MPA (Multi-Page Application) |
|---|---|---|
| **Bản chất** | **1 trang HTML duy nhất**, nội dung thay đổi bằng JavaScript | **Nhiều trang HTML riêng biệt**, mỗi URL = 1 file HTML mới |
| **Navigation** | JS thay đổi DOM, **không reload trang** | Trình duyệt **tải trang mới hoàn toàn** từ server |
| **Server trả** | 1 file HTML rỗng + JS bundle | Mỗi request → server render HTML đầy đủ |

## Flow so sánh

```
SPA — Sau lần tải đầu tiên, mọi thứ xảy ra phía client
───────────────────────────────────────────────────────
Lần đầu:
  Browser ──► Server: GET /
  Server  ──► Browser: index.html (gần rỗng) + app.js (2MB)
  Browser: tải JS → JS render UI → hiện trang

Navigate /about:
  Browser: JS bắt URL thay đổi → render component About
  KHÔNG gọi server → không reload → mượt

Navigate /products:
  Browser: JS render component Products
  Gọi API lấy data (fetch) → render → xong
  Vẫn KHÔNG reload trang


MPA — Mỗi lần navigate = tải trang mới từ server
───────────────────────────────────────────────────────
Navigate /:
  Browser ──► Server: GET /
  Server  ──► Browser: index.html (đầy đủ nội dung)

Navigate /about:
  Browser ──► Server: GET /about
  Server  ──► Browser: about.html (đầy đủ nội dung)
  → Trang trắng → Load → Hiện (full reload)

Navigate /products:
  Browser ──► Server: GET /products
  Server  ──► Browser: products.html (đầy đủ nội dung)
  → Full reload lần nữa
```

## So sánh chi tiết

| Tiêu chí | SPA | MPA |
|---|---|---|
| **Tốc độ lần đầu** | 🔴 Chậm (tải JS bundle lớn) | 🟢 Nhanh (HTML nhẹ, sẵn nội dung) |
| **Tốc độ navigate** | 🟢 Rất nhanh (không reload) | 🔴 Chậm (full reload mỗi lần) |
| **UX** | 🟢 Mượt như app native | 🔴 Nhấp nháy khi chuyển trang |
| **SEO** | 🔴 Khó (nội dung render bằng JS → bot khó đọc) | 🟢 Tốt (HTML sẵn nội dung) |
| **First Contentful Paint** | 🔴 Chậm (chờ JS tải + chạy) | 🟢 Nhanh (HTML có content sẵn) |
| **Complexity** | 🔴 Cao (routing, state, caching phía client) | 🟢 Đơn giản (server lo hết) |
| **Server load** | 🟢 Nhẹ (chỉ serve API + static) | 🔴 Nặng (render HTML mỗi request) |
| **Offline** | 🟢 Có thể (Service Worker) | 🔴 Không |

## Khi nào dùng gì?

| Dùng SPA khi | Dùng MPA khi |
|---|---|
| Dashboard, admin panel, app phức tạp | Landing page, blog, e-commerce cần SEO |
| UX mượt quan trọng hơn SEO | SEO là ưu tiên số 1 |
| Users tương tác liên tục, lâu | Users chỉ đọc, ít tương tác |
| **Ví dụ**: Gmail, Trello, Figma | **Ví dụ**: Wikipedia, blog, trang tin tức |

> 💡 **Thực tế**: Ranh giới đang mờ dần. Next.js, Nuxt.js kết hợp cả hai — SPA navigation + SSR cho SEO. Xem thêm ở Section 2.

---

# 2. CSR vs SSR vs SSG vs ISR

## 📌 Bản chất: **AI render HTML?**

Sự khác biệt cốt lõi giữa các chiến lược render nằm ở **ai tạo HTML** và **khi nào tạo**:

| Chiến lược | Ai render? | Khi nào? | HTML sẵn nội dung khi đến browser? |
|---|---|---|---|
| **CSR** (Client-Side Rendering) | **Browser** (JS) | Khi user mở trang | ❌ Không — HTML rỗng |
| **SSR** (Server-Side Rendering) | **Server** | Mỗi request | ✅ Có — HTML đầy đủ |
| **SSG** (Static Site Generation) | **Server** | Lúc build | ✅ Có — HTML đã tạo sẵn |
| **ISR** (Incremental Static Regen) | **Server** | Lúc build + cập nhật định kỳ | ✅ Có — HTML tạo sẵn + tự refresh |

## Flow chi tiết từng chiến lược

```
CSR — Browser tự render
──────────────────────────────────
1. Browser ──GET /──► Server
2. Server trả: <html><body><div id="root"></div></body></html>  ← RỖNG
3. Browser tải app.js (2MB)
4. JS chạy → gọi API lấy data → render DOM
5. User mới thấy nội dung

Timeline: |── tải HTML ──|── tải JS ──|── chạy JS ──|── gọi API ──|── RENDER ──|
                                                                    ↑ user mới thấy


SSR — Server render mỗi request
──────────────────────────────────
1. Browser ──GET /──► Server
2. Server: chạy React trên server → render HTML đầy đủ → trả về
3. Browser nhận HTML có content sẵn → HIỆN NGAY
4. Browser tải JS → "hydrate" (gắn event listeners lên HTML có sẵn)

Timeline: |── server render ──|── tải HTML ──|── HIỆN ──|── tải JS ──|── hydrate ──|
                                              ↑ user thấy ngay!


SSG — HTML tạo sẵn lúc build
──────────────────────────────────
1. Lúc build (npm run build):
   Server chạy React → tạo sẵn HTML cho MỌI trang → lưu thành .html files
2. Khi user truy cập:
   CDN/Server trả file .html có sẵn → NGAY LẬP TỨC
3. Browser tải JS → hydrate

Timeline: |── trả HTML từ CDN ──|── HIỆN ──|── tải JS ──|── hydrate ──|
                                  ↑ siêu nhanh! (file tĩnh, cache CDN)


ISR — SSG + tự cập nhật
──────────────────────────────────
1. Giống SSG: tạo HTML lúc build
2. Sau N giây (revalidate), request đầu tiên → server tạo HTML mới ở background
3. Request tiếp theo → nhận HTML mới
   → Kết hợp tốc độ SSG + dữ liệu cập nhật của SSR
```

## So sánh tổng quan

| Tiêu chí | CSR | SSR | SSG | ISR |
|---|---|---|---|---|
| **Tốc độ lần đầu** | 🔴 Chậm | 🟡 Trung bình | 🟢 Cực nhanh | 🟢 Cực nhanh |
| **SEO** | 🔴 Kém | 🟢 Tốt | 🟢 Tốt | 🟢 Tốt |
| **Data luôn mới** | 🟢 (gọi API realtime) | 🟢 (render mỗi request) | 🔴 (chỉ mới lúc build) | 🟡 (mới sau revalidate) |
| **Server load** | 🟢 Nhẹ | 🔴 Nặng (render mỗi req) | 🟢 Không (serve file tĩnh) | 🟢 Nhẹ (render khi hết hạn) |
| **TTFB** | 🟢 Nhanh (HTML nhẹ) | 🔴 Chậm (chờ server render) | 🟢 Nhanh (file tĩnh) | 🟢 Nhanh |
| **Cần server?** | Không (CDN) | ✅ Có (Node.js) | Không (CDN) | ✅ Có |
| **Framework** | React, Vue | Next.js, Nuxt.js | Next.js, Gatsby, Astro | Next.js |

## Khi nào dùng gì?

| Chiến lược | Use case |
|---|---|
| **CSR** | Dashboard nội bộ, admin panel (không cần SEO) |
| **SSR** | E-commerce, social media (SEO + data realtime) |
| **SSG** | Blog, documentation, landing page (nội dung ít thay đổi) |
| **ISR** | E-commerce product pages (SEO + data cập nhật mỗi vài phút) |

## Hydration là gì?

```
Server trả HTML tĩnh (chỉ có nội dung, KHÔNG có interactivity):
  <button>Đếm: 0</button>    ← Hiển thị đúng, nhưng bấm KHÔNG XẢY RA GÌ

Hydration = React tải JS → gắn event listeners + state lên HTML có sẵn:
  <button onClick={increment}>Đếm: 0</button>  ← Bây giờ bấm MỚI HOẠT ĐỘNG

  → HTML "khô" + JS = HTML "sống" (hydrated)
  → Giống như: rót nước vào bột mì khô → thành bột mì ướt (dùng được)
```

> ⚠️ **Hydration mismatch**: Nếu HTML từ server khác với React render trên client → React sẽ warning và re-render lại → mất hết lợi ích SSR.

---

# 3. SQL vs NoSQL

## 📌 Bản chất: **Cách tổ chức dữ liệu**

| | SQL (Relational) | NoSQL (Non-Relational) |
|---|---|---|
| **Bản chất** | Dữ liệu tổ chức thành **bảng** (table) với **quan hệ** (relations) rõ ràng | Dữ liệu tổ chức **linh hoạt** — document, key-value, graph, column |
| **Schema** | **Cố định** — phải định nghĩa cấu trúc trước khi lưu data | **Linh hoạt** — không cần schema cố định, mỗi record có thể khác nhau |
| **Triết lý** | Data integrity > Performance. **ACID first.** | Performance > Strict consistency. **Scale first.** |

## Tổ chức dữ liệu: SQL vs NoSQL

```
SQL — Relational (bảng + quan hệ)
───────────────────────────────────
  Table: users                    Table: orders
  ┌────┬──────────┬──────────┐    ┌────┬─────────┬────────┬────────┐
  │ id │ name     │ email    │    │ id │ user_id │ total  │ status │
  ├────┼──────────┼──────────┤    ├────┼─────────┼────────┼────────┤
  │ 1  │ Hùng     │ h@x.com  │    │ 1  │ 1       │ 500k   │ done   │
  │ 2  │ Lan      │ l@x.com  │    │ 2  │ 1       │ 200k   │ pending│
  └────┴──────────┴──────────┘    │ 3  │ 2       │ 150k   │ done   │
                                  └────┴─────────┴────────┴────────┘
  Quan hệ: orders.user_id → users.id (Foreign Key)
  → JOIN để lấy orders + user info

NoSQL — Document (MongoDB)
───────────────────────────────────
  Collection: users
  {
    _id: ObjectId("abc"),
    name: "Hùng",
    email: "h@x.com",
    orders: [                        ← Nhúng (embed) luôn vào document!
      { total: 500000, status: "done" },
      { total: 200000, status: "pending" }
    ]
  }
  → Không cần JOIN — tất cả trong 1 document
  → Mỗi document có thể có cấu trúc KHÁC NHAU
```

## Các loại NoSQL

| Loại | Cách lưu | Ví dụ | Use case |
|---|---|---|---|
| **Document** | JSON-like documents | MongoDB, CouchDB | App linh hoạt, schema hay thay đổi |
| **Key-Value** | Key → Value (bất kỳ) | Redis, DynamoDB | Cache, session, cart |
| **Column-Family** | Cột thay vì hàng | Cassandra, HBase | Time-series, analytics lớn |
| **Graph** | Nodes + Edges (quan hệ) | Neo4j, ArangoDB | Social network, recommendation |

## So sánh chi tiết

| Tiêu chí | SQL | NoSQL |
|---|---|---|
| **Schema** | Cố định (ALTER TABLE để thay đổi) | Linh hoạt (thêm field bất kỳ lúc nào) |
| **ACID** | 🟢 Native (transaction an toàn) | 🟡 Hạn chế (tuỳ DB, thường eventual consistency) |
| **Scaling** | 🟡 Vertical (server mạnh hơn) | 🟢 Horizontal (thêm servers — sharding) |
| **Joins** | 🟢 Mạnh (SQL JOINs) | 🔴 Yếu hoặc không có (phải nhúng/denormalize) |
| **Query language** | SQL (chuẩn hoá) | Mỗi DB 1 cách query riêng |
| **Performance đọc** | 🟡 JOINs nhiều bảng = chậm | 🟢 Nhanh (data trong 1 document) |
| **Performance ghi** | 🟡 Phải kiểm tra constraints | 🟢 Nhanh (ít ràng buộc) |
| **Data duplication** | 🟢 Tối thiểu (normalize) | 🔴 Chấp nhận trùng lặp (denormalize) |

## Normalize vs Denormalize

```
Normalize (SQL) — Mỗi thông tin lưu MỘT CHỖ duy nhất
──────────────────────────────────────────────────────
  users: { id: 1, name: "Hùng" }
  orders: { id: 1, user_id: 1, total: 500k }
  → Đổi tên user → chỉ sửa 1 chỗ ✅
  → Lấy order + user → phải JOIN 🔴

Denormalize (NoSQL) — Copy data vào nhiều chỗ để đọc nhanh
──────────────────────────────────────────────────────
  orders: {
    id: 1,
    user: { name: "Hùng", email: "h@x.com" },  ← copy user info
    total: 500000
  }
  → Lấy order + user → đọc 1 document ✅
  → Đổi tên user → phải sửa NHIỀU CHỖ 🔴
```

## SQL JOINs — So sánh

```
users:  ┌────────┐   orders: ┌──────────┐
        │ 1: Hùng │           │ user_id:1 │
        │ 2: Lan  │           │ user_id:1 │
        │ 3: Nam  │           │ user_id:4 │  ← user 4 không tồn tại!
        └────────┘           └──────────┘
```

| JOIN | Kết quả | Giải thích |
|------|---------|----------|
| **INNER JOIN** | Hùng + 2 orders | Chỉ rows **KHỚP CẢ HAI** bảng |
| **LEFT JOIN** | Hùng + 2 orders, Lan (null order), Nam (null order) | **TẤT CẢ** bảng trái + khỚp bảng phải |
| **RIGHT JOIN** | Hùng + 2 orders, order của user 4 (null user) | **TẤT CẢ** bảng phải + khỚp bảng trái |
| **FULL JOIN** | Tất cả + null hai phía | **TẤT CẢ** cả hai bảng |

## Khi nào dùng gì?

| Dùng SQL khi | Dùng NoSQL khi |
|---|---|
| Data có quan hệ phức tạp (e-commerce, banking) | Schema thay đổi liên tục (startup, MVP) |
| Cần ACID (giao dịch tài chính) | Cần scale horizontal (big data, IoT) |
| Cần JOINs phức tạp, báo cáo | Cần tốc độ đọc/ghi cực cao |
| Cần data integrity (không chấp nhận sai) | Chấp nhận eventual consistency |
| **Ví dụ**: PostgreSQL, MySQL | **Ví dụ**: MongoDB, Redis, Cassandra |

> 💡 **Thực tế**: Nhiều dự án dùng **cả hai** — SQL cho core data (users, orders), NoSQL cho cache (Redis), search (Elasticsearch), realtime (Firebase). Gọi là **Polyglot Persistence**.

---

# 4. TCP vs UDP — Giao thức có kết nối vs không kết nối

## 📌 Bản chất: **Có thiết lập kết nối trước khi gửi dữ liệu không?**

| | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Bản chất** | **Có kết nối** (connection-oriented) — thiết lập kết nối trước, đảm bảo dữ liệu đến đầy đủ, đúng thứ tự | **Không kết nối** (connectionless) — gửi thẳng, không cần thiết lập, không đảm bảo |
| **Ví von** | Gọi điện thoại — phải chờ bắt máy → nói → đảm bảo người kia nghe | Gửi thư — bỏ thùng → không biết có đến không |

## TCP — 3-Way Handshake (Bắt tay 3 bước)

```
Trước khi gửi data, TCP PHẢI thiết lập kết nối:

  Client                          Server
    │                               │
    │──── SYN ────────────────────► │  Bước 1: "Tôi muốn kết nối"
    │                               │
    │◄──── SYN-ACK ────────────────│  Bước 2: "OK, tôi cũng sẵn sàng"
    │                               │
    │──── ACK ────────────────────► │  Bước 3: "Xác nhận, bắt đầu!"
    │                               │
    │◄════ DATA ═══════════════════►│  Bây giờ mới gửi/nhận data
    │                               │
    └──── FIN ─────────────────────►│  Kết thúc: đóng kết nối
    │◄──── ACK ────────────────────│


UDP — Gửi thẳng, không bắt tay
────────────────────────────────
  Client                          Server
    │                               │
    │════ DATA ═══════════════════► │  Gửi thẳng luôn!
    │════ DATA ═══════════════════► │  Gửi tiếp!
    │════ DATA ══════════ ✗         │  Mất gói? Kệ!
    │════ DATA ═══════════════════► │  Gửi tiếp!
    │                               │
    (Không cần thiết lập, không cần đóng kết nối)
```

## So sánh chi tiết

| Tiêu chí | TCP | UDP |
|---|---|---|
| **Kết nối** | Có (3-way handshake) | Không |
| **Đảm bảo gửi đến** | ✅ Có (ACK + retransmit) | ❌ Không |
| **Đúng thứ tự** | ✅ Có (sequence numbers) | ❌ Không |
| **Kiểm tra lỗi** | ✅ Checksum + retransmit | 🟡 Chỉ checksum (không fix) |
| **Tốc độ** | 🔴 Chậm hơn (overhead) | 🟢 Nhanh (không overhead) |
| **Overhead** | Cao (header 20+ bytes) | Thấp (header 8 bytes) |
| **Flow control** | ✅ Có (tránh gửi quá nhanh) | ❌ Không |
| **Congestion control** | ✅ Có (tránh nghẽn mạng) | ❌ Không |

## Khi nào dùng gì?

| Dùng TCP khi | Dùng UDP khi |
|---|---|
| Cần data **chính xác, đầy đủ** | Cần **tốc độ**, chấp nhận mất vài gói |
| HTTP/HTTPS, API calls | Video/audio streaming, video call |
| Email (SMTP), file transfer (FTP) | Online gaming (real-time) |
| Database connections | DNS lookup (query nhỏ, 1 packet) |
| SSH, WebSocket | VoIP (Zalo call, Discord voice) |
| **Mất 1 byte = sai dữ liệu** | **Mất 1 frame = hơi giật, nhưng OK** |

> 💡 **QUIC = "UDP + reliability"**: HTTP/3 dùng giao thức QUIC chạy trên UDP, nhưng tự implement reliability layer riêng → nhanh hơn TCP mà vẫn đảm bảo data. Đây là hướng đi mới.

---

# 5. HTTP vs WebSocket

## 📌 Bản chất: **Request-Response vs Full-Duplex**

| | HTTP | WebSocket |
|---|---|---|
| **Bản chất** | **Một chiều**: Client hỏi → Server trả → **xong** (đóng hoặc keep-alive) | **Hai chiều liên tục**: Sau khi kết nối, cả hai bên **gửi/nhận bất cứ lúc nào** |
| **Ai bắt đầu** | **Luôn là client** — server KHÔNG THỂ chủ động gửi | **Cả hai** — server có thể push data bất cứ lúc nào |

## Flow so sánh

```
HTTP — Request-Response (half-duplex)
──────────────────────────────────────
  Client: "Cho tôi danh sách tin nhắn"  ──► Server
  Server: "Đây, 10 tin nhắn mới nhất"   ◄── Server
  → XONG. Kết nối kết thúc (hoặc idle).

  Client muốn biết có tin nhắn mới?
  → Phải HỎI LẠI (polling):
     Cứ mỗi 5 giây: "Có tin mới chưa?" → "Chưa" → "Có tin mới chưa?" → "Chưa"...
     → Lãng phí bandwidth và server resources!


WebSocket — Full-Duplex (persistent connection)
──────────────────────────────────────
  1. HTTP Upgrade Handshake:
     Client: GET /chat  (Upgrade: websocket)  ──► Server
     Server: 101 Switching Protocols          ◄── Server

  2. Kết nối mở, CẢ HAI gửi tự do:
     Client ═══ "Xin chào!" ═══════════════► Server
     Server ═══ "User B vừa gửi tin!" ═════► Client   ← Server CHỦ ĐỘNG push!
     Client ═══ "Đang gõ..." ══════════════► Server
     Server ═══ "User B đang gõ..." ═══════► Client
     ...
     (Kết nối mở liên tục cho đến khi đóng)
```

## So sánh chi tiết

| Tiêu chí | HTTP | WebSocket |
|---|---|---|
| **Communication** | Half-duplex (1 chiều/lần) | Full-duplex (2 chiều cùng lúc) |
| **Connection** | Ngắn (mỗi request xong thì xong) | Dài (persistent, giữ mở) |
| **Overhead** | Cao (headers mỗi request: 200B-2KB) | Thấp (sau handshake: 2-6 bytes/frame) |
| **Server push** | ❌ Không thể | ✅ Server gửi bất cứ lúc nào |
| **Stateful?** | Stateless (mỗi request độc lập) | Stateful (giữ context kết nối) |
| **Scaling** | 🟢 Dễ (stateless) | 🔴 Khó (mỗi connection giữ state) |
| **Protocol** | HTTP/1.1, HTTP/2, HTTP/3 | ws:// hoặc wss:// (TLS) |
| **Firewall** | 🟢 Luôn đi qua (port 80/443) | 🟡 Một số firewall chặn upgrade |

## Các giải pháp trung gian

```
  Pure HTTP ◄──────────────────────────────────────────────► WebSocket
  (stateless)                                                (full-duplex)
       │              │              │                │
     Polling    Long Polling         SSE          WebSocket
    (cứ 5s        (giữ request     (server        (2 chiều,
     hỏi 1 lần)   cho đến có       push 1         real-time)
                   data mới)       chiều)
```

| Kỹ thuật | Cơ chế | Dùng khi |
|---|---|---|
| **Polling** | Client hỏi liên tục (mỗi N giây) | Đơn giản nhưng lãng phí |
| **Long Polling** | Server giữ request chờ data mới → trả → client hỏi lại | Khi không dùng WebSocket được |
| **SSE** (Server-Sent Events) | Server → Client 1 chiều qua HTTP | Notifications, feeds, stock prices |
| **WebSocket** | 2 chiều, real-time | Chat, game, collaborative editing |

## Khi nào dùng gì?

| Dùng HTTP khi | Dùng WebSocket khi |
|---|---|
| REST API, CRUD thông thường | Chat real-time |
| Trang web tĩnh, blog | Collaborative editing (Google Docs) |
| Form submission | Live notifications |
| File upload/download | Online gaming |
| Bất cứ thứ gì **request-response** | Stock/crypto live prices |

---

# 6. Monolith vs Microservices

## 📌 Bản chất: **1 khối vs nhiều dịch vụ nhỏ**

| | Monolith | Microservices |
|---|---|---|
| **Bản chất** | Toàn bộ app trong **1 codebase, 1 process, 1 deployment** | App chia thành **nhiều services nhỏ**, mỗi service **chạy độc lập** |
| **Ví von** | Nhà liền kề — tất cả trong 1 căn nhà | Khu phố — mỗi nhà 1 chức năng riêng |

## Kiến trúc so sánh

```
Monolith — Tất cả trong 1 khối
──────────────────────────────────
  ┌─────────────────────────────────────────┐
  │              MONOLITH APP                │
  │  ┌──────────┬───────────┬────────────┐  │
  │  │   User   │   Order   │  Payment   │  │
  │  │  Module  │   Module  │   Module   │  │
  │  └──────────┴───────────┴────────────┘  │
  │  ┌──────────────────────────────────┐   │
  │  │         Shared Database          │   │
  │  └──────────────────────────────────┘   │
  └─────────────────────────────────────────┘
  → 1 repo, 1 process, 1 database, 1 deployment


Microservices — Mỗi feature = 1 service riêng
──────────────────────────────────────────────
  ┌──────────┐    ┌──────────┐    ┌──────────┐
  │   User   │    │  Order   │    │ Payment  │
  │ Service  │    │ Service  │    │ Service  │
  │  :3001   │    │  :3002   │    │  :3003   │
  ├──────────┤    ├──────────┤    ├──────────┤
  │ User DB  │    │ Order DB │    │Payment DB│
  │(Postgres)│    │(MongoDB) │    │(Postgres)│
  └──────────┘    └──────────┘    └──────────┘
       ▲               ▲               ▲
       └───────────────┼───────────────┘
                       │
                 API Gateway
                       │
                    Client

  → Mỗi service: riêng repo, riêng DB, riêng deployment
  → Giao tiếp qua HTTP/gRPC/Message Queue
```

## So sánh chi tiết

| Tiêu chí | Monolith | Microservices |
|---|---|---|
| **Complexity** | 🟢 Đơn giản | 🔴 Phức tạp (networking, orchestration) |
| **Deployment** | 🔴 Deploy toàn bộ app | 🟢 Deploy từng service riêng |
| **Scaling** | 🔴 Scale toàn bộ (dù chỉ 1 module quá tải) | 🟢 Scale từng service (chỉ order service quá tải → scale nó) |
| **Technology** | 🔴 1 tech stack cho toàn bộ | 🟢 Mỗi service dùng tech phù hợp |
| **Team** | 🟢 1 team, dễ coordinate | 🟡 Nhiều team, cần quy trình rõ |
| **Testing** | 🟢 Dễ (1 codebase) | 🔴 Khó (integration test nhiều services) |
| **Performance** | 🟢 Function calls (nhanh) | 🔴 Network calls (chậm hơn) |
| **Data consistency** | 🟢 1 DB, transaction dễ | 🔴 Distributed transactions (saga pattern) |
| **Debugging** | 🟢 Stack trace rõ ràng | 🔴 Distributed tracing (Jaeger, Zipkin) |
| **Initial speed** | 🟢 Nhanh (start coding ngay) | 🔴 Chậm (setup infrastructure) |

## Khi nào dùng gì?

| Dùng Monolith khi | Dùng Microservices khi |
|---|---|
| Startup, MVP, team nhỏ (1-5 devs) | Hệ thống lớn, team lớn (20+ devs) |
| Domain chưa rõ ràng | Domain rõ ràng, dễ chia boundaries |
| Cần ship nhanh | Cần scale từng phần riêng |
| Budget hạn chế (ít DevOps) | Có team DevOps chuyên |
| **Bắt đầu ở đây!** | **Evolve tới đây khi cần** |

> ⚠️ **Sai lầm phổ biến**: Dùng microservices quá sớm. Martin Fowler: *"Monolith-first → extract microservices khi thật sự cần."* Microservices solve organizational scaling, không phải technical scaling.

---

# 7. REST vs GraphQL

## 📌 Bản chất: **Resource-based vs Query-based**

| | REST | GraphQL |
|---|---|---|
| **Bản chất** | Mỗi **resource** có URL riêng, dùng HTTP methods để thao tác | **1 endpoint duy nhất**, client gửi **query** mô tả chính xác data cần lấy |
| **Ai quyết định data trả về?** | **Server** — client nhận toàn bộ object | **Client** — chỉ lấy đúng fields cần |

## Flow so sánh

```
REST — Nhiều endpoints, server quyết định response shape
────────────────────────────────────────────────────────
  Cần: user info + user's orders

  Request 1: GET /api/users/1
  Response: { id: 1, name: "Hùng", email: "h@x.com", bio: "...", avatar: "..." }
  → Trả TOÀN BỘ fields, dù chỉ cần name (over-fetching)

  Request 2: GET /api/users/1/orders
  Response: [{ id: 1, total: 500000, ... }, { id: 2, total: 200000, ... }]
  → Phải gọi THÊM 1 request nữa (under-fetching)

  → 2 requests, nhận nhiều data thừa


GraphQL — 1 endpoint, client quyết định
────────────────────────────────────────
  Request: POST /graphql
  Body:
    query {
      user(id: 1) {
        name              ← chỉ lấy name
        orders {
          total            ← chỉ lấy total
          status
        }
      }
    }

  Response:
    {
      "data": {
        "user": {
          "name": "Hùng",
          "orders": [
            { "total": 500000, "status": "done" },
            { "total": 200000, "status": "pending" }
          ]
        }
      }
    }

  → 1 request, nhận ĐÚNG data cần
```

## So sánh chi tiết

| Tiêu chí | REST | GraphQL |
|---|---|---|
| **Endpoints** | Nhiều (`/users`, `/orders`, `/products`) | 1 (`/graphql`) |
| **Data fetching** | Server quyết định shape | Client quyết định shape |
| **Over-fetching** | 🔴 Có (nhận fields thừa) | 🟢 Không (chỉ lấy fields cần) |
| **Under-fetching** | 🔴 Có (cần N requests cho N resources) | 🟢 Không (1 query lấy nhiều resources) |
| **Caching** | 🟢 Dễ (HTTP cache theo URL) | 🔴 Khó (POST /graphql, mỗi query khác nhau) |
| **Versioning** | `/api/v1/`, `/api/v2/` | Không cần — thêm field mới, client cũ không bị ảnh hưởng |
| **Learning curve** | 🟢 Thấp (HTTP methods quen thuộc) | 🔴 Cao (schema, resolvers, query language) |
| **Error handling** | HTTP status codes (400, 404, 500) | Luôn trả 200 + errors array |
| **File upload** | 🟢 Native (multipart) | 🔴 Cần workaround |
| **Real-time** | Cần WebSocket riêng | 🟢 Subscriptions (built-in) |
| **Tooling** | Postman, cURL | GraphQL Playground, Apollo DevTools |

## Khi nào dùng gì?

| Dùng REST khi | Dùng GraphQL khi |
|---|---|
| CRUD đơn giản, ít relationships | Data phức tạp, nhiều relationships |
| Public API (dễ dùng cho third-party) | Mobile app (bandwidth hạn chế, cần đúng data) |
| Caching quan trọng (CDN-friendly) | Nhiều client khác nhau (web, mobile, TV) cần data khác nhau |
| Team quen REST, cần ship nhanh | Dashboard phức tạp, cần nhiều data từ nhiều nguồn |
| **Ví dụ**: Stripe API, GitHub REST API | **Ví dụ**: GitHub GraphQL API, Shopify, Facebook |

> 💡 **Thực tế**: Không nhất thiết phải chọn 1 — có thể dùng REST cho public API + GraphQL cho internal dashboard. Hoặc dùng REST cho CRUD đơn giản + GraphQL cho queries phức tạp.

---

# 8. Execution Context — Toàn bộ bức tranh

## 📌 Execution Context là gì?

Mỗi khi JS **chạy code**, V8 tạo một "hộp chứa" gọi là **Execution Context**. Hộp này lưu:
- Biến nào tồn tại?
- `this` trỏ đến đâu?
- Scope cha là ai?

**Có 3 loại:**

| Loại | Khi nào tạo | Ví dụ |
|------|-----------|-------|
| **Global EC** | Khi file JS bắt đầu chạy | Code ngoài mọi function |
| **Function EC** | Khi **gọi** function | `myFunc()` |
| **Eval EC** | Khi dùng `eval()` | Hiếm dùng |

## 📌 Bên trong mỗi Execution Context có gì?

```
Execution Context = {
  VariableEnvironment   →  chứa biến var + function declarations
  LexicalEnvironment    →  chứa biến let/const
  OuterReference        →  trỏ đến scope CHA (→ tạo nên Scope Chain)
  ThisBinding           →  this trỏ đến đâu
}
```

## 📌 2 Phase: Creation → Execution

```javascript
var x = 10
let y = 20
function greet() { console.log('hi') }
```

```
=== CREATION PHASE (trước khi chạy bất kỳ dòng nào) ===
V8 quét code, tạo sẵn:
  VariableEnvironment: { x: undefined, greet: function }  ← var + function
  LexicalEnvironment:  { y: <TDZ> }                       ← let/const (chưa gán)
  OuterReference:      → null (đây là Global)
  ThisBinding:         → window/global

=== EXECUTION PHASE (chạy từng dòng) ===
  Dòng 1: x = 10       → VariableEnv: { x: 10 }
  Dòng 2: y = 20       → LexicalEnv: { y: 20 }  ← TDZ kết thúc
  Dòng 3: greet()      → Tạo Function EC mới!
```

> 💡 **Đây chính là lý do Hoisting xảy ra**: `var` được gán `undefined` trong Creation Phase → truy cập trước dòng khai báo được. `let/const` nằm trong TDZ → truy cập trước dòng khai báo → ReferenceError.

---

# 9. var vs let vs const

| Tiêu chí | `var` | `let` | `const` |
|----------|-------|-------|----------|
| **Scope** | Function scope | Block scope `{ }` | Block scope `{ }` |
| **Hoisting** | ✅ Có → `undefined` | ✅ Có → nhưng **TDZ** | ✅ Có → nhưng **TDZ** |
| **TDZ** | ❌ Không | ✅ Có (ReferenceError) | ✅ Có (ReferenceError) |
| **Gán lại** | ✅ Được | ✅ Được | ❌ Không |
| **Khai báo lại** | ✅ Được (cùng scope) | ❌ Không | ❌ Không |
| **global object** | ✅ `window.x` | ❌ Không | ❌ Không |

```javascript
// SCOPE khác biệt
if (true) {
  var a = 1      // Function scope → rò rỉ ra ngoài if!
  let b = 2      // Block scope → chỉ trong { }
  const c = 3    // Block scope → chỉ trong { }
}
console.log(a)   // 1 ✅ (var rò rỉ!)
console.log(b)   // ❌ ReferenceError
console.log(c)   // ❌ ReferenceError

// HOISTING khác biệt
console.log(x)   // undefined (var → Creation Phase gán undefined)
console.log(y)   // ❌ ReferenceError (let → TDZ)
var x = 10
let y = 20

// const vs let
const obj = { name: 'Phúc' }
obj.name = 'Hùng'   // ✅ Được! const chặn gán lại BIẾN, không chặn mutate
obj = {}             // ❌ TypeError: Assignment to constant variable
```

> **Quy tắc**: Dùng `const` mặc định → `let` khi cần gán lại → **KHÔNG BAO GIỜ** dùng `var`.

---

# 10. Scope vs Lexical Scope vs Scope Chain vs Closure

## 📌 Mối quan hệ

```
4 khái niệm này LÀ 1 HỆ THỐNG, mỗi cái build lên từ cái trước:

  Scope           → Vùng nhìn thấy biến
    ↓ (quy tắc xác định)
  Lexical Scope   → Scope quyết định LÚC VIẾT CODE (nơi function nằm)
    ↓ (cơ chế tra cứu)
  Scope Chain     → Chuỗi: con → cha → ông → global
    ↓ (hệ quả)
  Closure         → Function nhớ scope cha kể cả khi cha đã "chết"
```

## 1️⃣ Scope = "Biến nhìn thấy ở đâu?"

```javascript
const a = 'global'            // Global Scope — mọi nơi thấy

function outer() {
  const b = 'outer'           // Function Scope — chỉ trong outer
  
  if (true) {
    const c = 'block'         // Block Scope — chỉ trong { }
    console.log(a, b, c)      // ✅ thấy cả 3
  }
  
  console.log(c)              // ❌ c không tồn tại ở đây
}
```

## 2️⃣ Lexical Scope = "Scope quyết định bởi NƠI VIẾT CODE"

```javascript
const name = 'Global'

function outer() {
  const name = 'Outer'
  
  function inner() {       // inner ĐƯỢC VIẾT bên trong outer
    console.log(name)      // → tìm name ở nơi inner ĐƯỢC VIẾT
  }
  
  return inner
}

const fn = outer()
fn()  // → "Outer" ✅ (KHÔNG phải "Global"!)

// Tại sao? Vì JS dùng LEXICAL Scope:
//   inner ĐƯỢC VIẾT trong outer → scope cha = outer
//   inner KHÔNG QUAN TÂM nó ĐƯỢC GỌI ở đâu (global)
```

> 💡 **Lexical** = **Location** = vị trí trong source code. Function tìm biến ở **nơi nó nằm**, không phải nơi nó được gọi.

## 3️⃣ Scope Chain = "Chuỗi tra cứu biến"

```javascript
const x = 1                    // Global

function a() {
  const y = 2                  // a scope
  
  function b() {
    const z = 3                // b scope
    
    console.log(x, y, z)
    // Tìm z: b ✅ (z=3)
    // Tìm y: b ❌ → a ✅ (y=2)
    // Tìm x: b ❌ → a ❌ → global ✅ (x=1)
  }
  b()
}

// Scope Chain: b → a → global
// Luôn đi TỪ TRONG RA NGOÀI, không bao giờ ngược lại
```

## 4️⃣ Closure = "Function nhớ scope cha khi cha đã chết"

```javascript
function createCounter() {
  let count = 0                // biến local
  
  return function increment() {
    count++
    return count
  }
}  // createCounter() chạy xong → bình thường count bị xóa

const counter = createCounter()
counter()  // 1  ← count vẫn sống!
counter()  // 2  ← vẫn nhớ!
counter()  // 3

// TẠI SAO count không bị xóa?
// → increment vẫn tham chiếu đến count (qua OuterReference)
// → GC thấy: "count còn được dùng" → KHÔNG XÓA
// → Đây chính là CLOSURE
```

## 📌 Bảng tóm tắt

| Khái niệm | Một câu giải thích | Liên quan đến EC |
|-----------|-------------------|---|
| **Scope** | Vùng nhìn thấy biến | VariableEnv + LexicalEnv |
| **Lexical Scope** | Scope xác định lúc VIẾT code, không phải lúc chạy | OuterReference trỏ đến context CHA (nơi VIẾT) |
| **Scope Chain** | Chuỗi tìm biến: con → cha → ông → global | Chuỗi các OuterReference |
| **Closure** | Function nhớ biến scope cha khi cha đã return | LexicalEnv cha KHÔNG bị GC xóa |
| **Hoisting** | Biến "nhấc lên" đầu scope | Creation Phase gán var=undefined, let/const=TDZ |
| **TDZ** | Vùng chết: từ đầu block đến dòng let/const | LexicalEnv có biến nhưng chưa khởi tạo |

---

# 11. == vs ===

| | `==` (Loose Equality) | `===` (Strict Equality) |
|---|---|---|
| **Bản chất** | So sánh **sau khi ép kiểu** (type coercion) | So sánh **không ép kiểu** — khác type = false ngay |
| **Quy tắc** | `'5' == 5` → chuyển `'5'` thành `5` → `true` | `'5' === 5` → string ≠ number → `false` |

```javascript
// Bẫy của ==
0 == ''          // true 😱 ('' → 0)
0 == false       // true 😱 (false → 0)
null == undefined // true 😱 (đặc biệt)
'0' == false     // true 😱 ('0' → 0, false → 0)

// === an toàn
0 === ''          // false ✅
0 === false       // false ✅
null === undefined // false ✅
```

> **Quy tắc**: **LUÔN dùng `===`**. Ngoại lệ duy nhất: `x == null` để check cả `null` lẫn `undefined`.

---

# 12. null vs undefined

| | `null` | `undefined` |
|---|---|---|
| **Ý nghĩa** | **Cố ý** gán "không có giá trị" | **Chưa gán** giá trị, hoặc không tồn tại |
| **Ai gán** | **Developer** gán tường minh | **JavaScript** tự gán |
| **typeof** | `"object"` 🐛 (bug lịch sử) | `"undefined"` |
| **Ép số** | `Number(null)` → `0` | `Number(undefined)` → `NaN` |

```javascript
let a            // undefined — JS tự gán vì chưa có giá trị
let b = null     // null — dev cố ý nói "biến này rỗng"

// Khi nào dùng null?
let user = null        // User chưa login → cố ý set null
user = { name: 'Phúc' } // User login → gán object
user = null            // User logout → cố ý xóa

// Check cả hai
if (value == null) {   // true cho cả null VÀ undefined
  // handle missing value
}
```

---

# 13. Callback vs Promise vs Async/Await

## 📌 Bản chất: 3 cách giải quyết **bất đồng bộ**

| | Callback | Promise | Async/Await |
|---|---|---|---|
| **Bản chất** | Truyền function vào function khác | Object đại diện giá trị **trong tương lai** | Syntactic sugar trên Promise |
| **Thời kỳ** | ES5 | ES6 (2015) | ES8 (2017) |
| **Error handling** | Error-first callback `(err, data)` | `.catch()` | `try/catch` |

```javascript
// ❌ Callback Hell
readFile('a.txt', (err, a) => {
  readFile('b.txt', (err, b) => {
    readFile('c.txt', (err, c) => {
      console.log(a + b + c)            // 3 levels deep 😵
    })
  })
})

// 🟡 Promise Chain
readFile('a.txt')
  .then(a => readFile('b.txt').then(b => [a, b]))
  .then(([a, b]) => readFile('c.txt').then(c => a + b + c))
  .then(result => console.log(result))
  .catch(err => console.error(err))     // 1 chỗ bắt lỗi

// ✅ Async/Await — đọc như synchronous
async function readAll() {
  try {
    const a = await readFile('a.txt')
    const b = await readFile('b.txt')
    const c = await readFile('c.txt')
    console.log(a + b + c)              // Phẳng, dễ đọc ✅
  } catch (err) {
    console.error(err)
  }
}
```

| Tiêu chí | Callback | Promise | Async/Await |
|----------|----------|---------|-------------|
| **Đọc hiểu** | 🔴 Khó (nested) | 🟡 OK (chain) | 🟢 Dễ nhất |
| **Error handling** | 🔴 Mỗi level check | 🟢 `.catch()` cuối | 🟢 `try/catch` |
| **Debug** | 🔴 Stack trace khó đọc | 🟡 OK | 🟢 Stack trace rõ |
| **Parallel** | 🔴 Manual | 🟢 `Promise.all()` | 🟢 `await Promise.all()` |
| **Cancel** | ❌ | ❌ (cần AbortController) | ❌ |

> 💡 **Quan trọng**: Async/await **BÊN TRONG vẫn là Promise**. `await x` = `x.then(result => ...)`. Code sau `await` thành microtask.

---

# 14. process.nextTick vs setImmediate vs setTimeout

| | `process.nextTick()` | `Promise.then()` | `setImmediate()` | `setTimeout(fn, 0)` |
|---|---|---|---|---|
| **Queue** | nextTick Queue | Microtask Queue | Check Phase (libuv) | Timers Phase (libuv) |
| **Quản lý bởi** | Node.js Core | V8 Engine | libuv | libuv |
| **Ưu tiên** | 🥇 Cao nhất | 🥈 Sau nextTick | 🥉 Macrotask | 🥉 Macrotask |
| **Minimum delay** | 0 | 0 | 0 | **1ms** (Node tự chuyển 0→1) |

```javascript
setTimeout(() => console.log('timeout'), 0)
setImmediate(() => console.log('immediate'))
Promise.resolve().then(() => console.log('promise'))
process.nextTick(() => console.log('nextTick'))
console.log('sync')

// Output:
// sync           ← Synchronous chạy trước
// nextTick       ← nextTick Queue (cao nhất)
// promise        ← Microtask Queue
// timeout/immediate  ← Không xác định thứ tự ở top-level!
```

> Trong **I/O callback**, `setImmediate` **luôn trước** `setTimeout` vì I/O callback ở Poll phase → Check phase (setImmediate) → Timers phase (setTimeout).

---

# 15. Microtask vs Macrotask

| | Microtask | Macrotask (Phase Queue) |
|---|---|---|
| **Bản chất** | Task ưu tiên cao, chạy **trước** mọi macrotask | Task thường, chạy theo phase của Event Loop |
| **Gồm** | `process.nextTick()`, `Promise.then()`, `queueMicrotask()` | `setTimeout`, `setInterval`, `setImmediate`, I/O callbacks |
| **Quản lý** | V8 Engine + Node.js Core | libuv (6 phases) |
| **Quét sạch** | ✅ Quét hết queue trước khi chạy macrotask tiếp | Chạy 1 callback → quét microtask → callback tiếp (v11+) |
| **Starve** | ⚠️ Có thể starve Event Loop (nextTick đệ quy) | Không |

> ⚠️ **Node.js KHÔNG có "Macrotask Queue"** như browser. Node có **6 Phase Queues** riêng biệt do libuv quản lý.

---

# 16. CommonJS vs ES Modules

| Tiêu chí | CommonJS (CJS) | ES Modules (ESM) |
|----------|---------------|-------------------|
| **Cú pháp** | `require()` / `module.exports` | `import` / `export` |
| **Loading** | **Synchronous** (block) | **Asynchronous** (non-blocking) |
| **Khi nào resolve** | **Runtime** (chạy đến dòng require mới load) | **Parse time** (phân tích trước khi chạy) |
| **Tree-shaking** | ❌ Không (vì runtime) | ✅ Có (vì static analysis) |
| **Top-level await** | ❌ Không | ✅ Có |
| **`this` top-level** | `module.exports` | `undefined` |
| **File extension** | `.js` (mặc định) | `.mjs` hoặc `"type": "module"` |
| **Mặc định Node.js** | ✅ Có | Cần config |

```javascript
// CommonJS
const fs = require('fs')           // Sync, runtime
module.exports = { myFunc }

// ES Modules  
import fs from 'node:fs'           // Async, parse time
export const myFunc = () => {}
```

> 💡 **Xu hướng**: Ecosystem đang chuyển sang ESM. NestJS, Vite, Next.js đều ưu tiên ESM.

---

# 17. npm vs yarn vs pnpm

| Tiêu chí | npm | yarn | pnpm |
|----------|-----|------|------|
| **Đi kèm Node** | ✅ Có | ❌ Cài riêng | ❌ Cài riêng |
| **Tốc độ** | 🔴 Chậm nhất | 🟡 Nhanh hơn | 🟢 **Nhanh nhất** |
| **Disk usage** | 🔴 Lớn (duplicate) | 🔴 Lớn | 🟢 **Nhỏ nhất** (symlinks) |
| **Lock file** | `package-lock.json` | `yarn.lock` | `pnpm-lock.yaml` |
| **node_modules** | Flat (hoisted) | Flat (hoisted) | Nested + symlinks |
| **Phantom deps** | ⚠️ Có thể | ⚠️ Có thể | ✅ **Chặn** |
| **Install** | `npm install` | `yarn` | `pnpm install` |
| **Add** | `npm install pkg` | `yarn add pkg` | `pnpm add pkg` |
| **Run script** | `npm run dev` | `yarn dev` | `pnpm dev` |

**Phantom Dependencies** = import package mà bạn KHÔNG khai báo trong `package.json` (nó nằm ở thư mục cha do hoisting). pnpm chặn điều này → code an toàn hơn.

---

# 18. interface vs type (TypeScript)

| Tiêu chí | `interface` | `type` |
|----------|------------|--------|
| **Dùng cho** | Mô tả **hình dạng object** | Mô tả **bất kỳ type nào** |
| **Extend** | `extends` | `&` (intersection) |
| **Merge** | ✅ Declaration merging (auto merge cùng tên) | ❌ Không |
| **Union** | ❌ Không | ✅ `type A = B \| C` |
| **Computed props** | ❌ | ✅ Mapped types |
| **implements** | ✅ Class implements interface | ✅ Class implements type |

```typescript
// interface — cho object shape
interface User {
  name: string
  age: number
}
interface User {         // Declaration merging!
  email: string          // User giờ có name + age + email
}

// type — cho mọi thứ
type Status = 'active' | 'inactive'     // Union — interface KHÔNG làm được
type Point = { x: number; y: number }   // Object shape — giống interface  
type Callback = (data: string) => void  // Function type
```

> **Quy tắc**: Dùng `interface` cho object APIs (có thể extend). Dùng `type` cho unions, intersections, utility types.

---

# 19. Abstract Class vs Interface

| Tiêu chí | Abstract Class | Interface |
|----------|---------------|----------|
| **Có implementation** | ✅ Có thể có method với code thật | ❌ Chỉ khai báo, KHÔNG có code |
| **Constructor** | ✅ Có | ❌ Không |
| **Properties** | ✅ Có (với giá trị) | ❌ Chỉ khai báo type |
| **Kế thừa** | `extends` (chỉ 1 class) | `implements` (nhiều interface) |
| **Runtime** | ✅ Tồn tại ở runtime (JS class) | ❌ Biến mất sau compile (chỉ TS) |
| **Dùng khi** | Chia sẻ code chung giữa các class con | Định nghĩa contract/API |

```typescript
// Abstract Class — chia sẻ code + bắt buộc implement
abstract class Animal {
  constructor(public name: string) {}    // Có constructor
  move() { console.log('moving') }       // Có code thật — class con dùng được
  abstract makeSound(): void             // BẮT BUỘC class con phải implement
}

// Interface — chỉ contract, không có code
interface Flyable {
  fly(): void                            // Khai báo thôi, không có code
}

class Bird extends Animal implements Flyable {
  makeSound() { console.log('chirp') }   // Bắt buộc từ abstract
  fly() { console.log('flying') }        // Bắt buộc từ interface
}
```

---

# 20. DIP vs IoC vs DI

3 khái niệm này **RẤT DỄ NHẦM** — đây là cách phân biệt:

| | DIP | IoC | DI |
|---|---|---|---|
| **Tên đầy đủ** | Dependency Inversion Principle | Inversion of Control | Dependency Injection |
| **Là gì** | **Nguyên tắc** (SOLID — chữ D) | **Triết lý** thiết kế | **Kỹ thuật** cụ thể |
| **Nói gì** | Module cao KHÔNG phụ thuộc module thấp — cả hai phụ thuộc **abstraction** | Đảo ngược quyền kiểm soát — **framework** gọi code bạn, không phải bạn gọi framework | Class **nhận** dependency từ bên ngoài, không tự tạo |
| **Mức độ** | Lý thuyết | Pattern | Implementation |

```
Quan hệ:
  DIP (nguyên tắc)
    ↓ "Làm sao đạt được?"
  IoC (triết lý: đảo ngược quyền kiểm soát)
    ↓ "Cụ thể hơn?"
  DI (kỹ thuật: inject dependency qua constructor/setter)
```

```typescript
// ❌ KHÔNG theo DIP — UserService PHỤ THUỘC trực tiếp vào PrismaService
class UserService {
  private db = new PrismaService()  // Tự tạo — coupled!
}

// ✅ Theo DIP + DI — phụ thuộc abstraction, inject từ ngoài
class UserService {
  constructor(private db: DatabasePort) {}  // Inject qua constructor
  // DatabasePort là interface — không quan tâm Prisma hay TypeORM
}

// NestJS = IoC Container — framework tự tạo + inject dependencies
@Injectable()
class UserService {
  constructor(private prisma: PrismaService) {}  // NestJS tự inject!
}
```

---

# 21. Middleware vs Guard vs Interceptor vs Pipe

| Tiêu chí | Middleware | Guard | Interceptor | Pipe |
|----------|-----------|-------|-------------|------|
| **Mục đích** | Xử lý chung (CORS, log) | Cho phép / chặn | Biến đổi req/res | Validate / transform input |
| **Biết handler đích** | ❌ | ✅ ExecutionContext | ✅ ExecutionContext | ❌ |
| **Đọc metadata** | ❌ | ✅ Reflector | ✅ Reflector | ❌ |
| **Chạy sau handler** | ❌ | ❌ | ✅ (RxJS tap/map) | ❌ |
| **Thay đổi response** | ❌ | ❌ | ✅ (map) | ❌ |
| **Dùng RxJS** | ❌ | ❌ | ✅ | ❌ |
| **Use case** | CORS, helmet, body parser | Auth, RBAC, rate limit | Logging, cache, response wrap | Validate DTO, parse params |

```
Thứ tự: Middleware → Guard → Interceptor (before) → Pipe → Handler → Interceptor (after)
         Exception Filter bắt lỗi ở bất kỳ bước nào
```

---

# 22. Stateless vs Stateful

## 📌 Bản chất: **Server có nhớ client không?**

| | Stateless | Stateful |
|---|---|---|
| **Bản chất** | Server **KHÔNG nhớ** gì về client giữa các request | Server **NHỚ** trạng thái client (session, connection) |
| **Mỗi request** | Chứa **đầy đủ** thông tin cần thiết | Dựa vào thông tin **đã lưu** trên server |
| **Ví von** | Quầy bán hàng: mỗi lần đến phải nói lại mình là ai | Quán quen: "Anh Phúc lại uống cà phê sữa nha?" |

## Ví dụ cụ thể

```
Stateless — HTTP + JWT
──────────────────────
  Request 1: GET /profile
    Headers: Authorization: Bearer eyJhbGci...
    → Server decode JWT → biết user = Phúc → trả data
    → Server KHÔNG lưu gì cả

  Request 2: GET /orders
    Headers: Authorization: Bearer eyJhbGci...
    → Server decode JWT → biết user = Phúc → trả data
    → Mỗi request tự chứa đủ thông tin

  → Server 1 hay Server 2 xử lý đều được (load balancing dễ!)


Stateful — WebSocket / Session
──────────────────────────────
  Connect: ws://server:3000
    → Server tạo connection object, lưu user info
    → Server GHI NHỚ: "connection #42 = Phúc, room 'general'"

  Message 1: {"text": "Xin chào"}
    → Server biết ai gửi vì NHỚ connection #42 = Phúc
    → KHÔNG cần gửi lại token

  → PHẢI kết nối lại đúng server đó (sticky session)
```

## So sánh

| Tiêu chí | Stateless | Stateful |
|----------|-----------|----------|
| **Scaling** | 🟢 Dễ (thêm server, load balance tự do) | 🔴 Khó (sticky sessions, shared state) |
| **Fault tolerance** | 🟢 Server chết → request chuyển server khác | 🔴 Server chết → mất state, client phải reconnect |
| **Performance** | 🟡 Mỗi request phải gửi + verify credentials | 🟢 Verify 1 lần, sau đó nhớ |
| **Complexity** | 🟢 Server đơn giản | 🔴 Quản lý state phức tạp |
| **Ví dụ** | HTTP, REST API, JWT | WebSocket, database connections, TCP sessions |

## Session-based vs Token-based Auth

| | Session (Stateful) | JWT (Stateless) |
|---|---|---|
| **Lưu ở đâu** | Server (memory/Redis) | Client (cookie/localStorage) |
| **Mỗi request** | Gửi session ID → server tra cứu | Gửi JWT → server **decode** (không tra cứu) |
| **Logout** | Xóa session trên server ✅ | Khó! Token vẫn valid đến khi hết hạn 🔴 |
| **Scale** | 🔴 Cần shared session store (Redis) | 🟢 Stateless, scale tự do |
| **Revoke** | 🟢 Dễ (xóa session) | 🔴 Cần blacklist/token rotation |

---

# 23. Throttle vs Debounce

## 📌 Bản chất: **Giới hạn tần suất gọi function**

| | Throttle | Debounce |
|---|---|---|
| **Bản chất** | Chạy **tối đa 1 lần** mỗi N milliseconds | Chạy **sau khi ngừng** gọi N milliseconds |
| **Ví von** | Thang máy: cứ 30s đóng cửa 1 lần dù có bao nhiêu người bấm | Google Search: chờ user **ngừng gõ** rồi mới search |

## Timeline so sánh

```
Events:  ─X──X──X──X──X──X──────────────X──X──
          │  │  │  │  │  │              │  │
          0  1  2  3  4  5   (giây)     8  9

Throttle (3s):
  Chạy:  ─X─────────X─────────────────X─────
          │           │                │
          0s          3s               8s
  → Cứ 3s chạy 1 lần, bỏ qua calls giữa chừng

Debounce (3s):
  Chạy:  ──────────────────X───────────────X──
                           │               │
                           8s             12s
  → Chờ NGỪNG gọi 3s rồi mới chạy
  → Events 0-5s liên tục → reset liên tục → chạy ở ~8s
```

## Code

```javascript
// THROTTLE — tối đa 1 lần / interval
function throttle(fn, delay) {
  let lastCall = 0
  return (...args) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
    // Nếu chưa đủ delay → BỎ QUA
  }
}

// DEBOUNCE — chờ ngừng gọi rồi mới chạy
function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)          // Reset timer mỗi lần gọi
    timer = setTimeout(() => {
      fn(...args)                // Chạy sau khi NGỪNG gọi delay ms
    }, delay)
  }
}
```

## Khi nào dùng gì?

| Dùng Throttle | Dùng Debounce |
|--------------|---------------|
| Scroll event (infinite scroll) | Search input (gõ xong mới search) |
| Resize window | Form validation (gõ xong mới validate) |
| Button click liên tục (anti-spam) | Auto-save (đợi ngừng gõ rồi save) |
| API polling | API search suggestions |
| **Cần phản hồi ĐỀU ĐẶN** | **Cần phản hồi KẾT QUẢ CUỐI** |

---

# 24. Rate Limiting — Các thuật toán

## 📌 Rate Limiting là gì?

Giới hạn số request client gửi trong 1 khoảng thời gian → **chống DDoS, brute force, abuse**.

## 4 thuật toán chính

### 1. Fixed Window Counter

```
Cửa sổ cố định: mỗi phút reset counter

  Phút 1 (00:00-00:59)     Phút 2 (01:00-01:59)
  ┌───────────────────┐     ┌───────────────────┐
  │ count: 0→1→2→...→100│   │ count: 0→1→2→... │
  │ Limit: 100/phút    │     │ Reset lại!        │
  └───────────────────┘     └───────────────────┘

  ⚠️ Vấn đề: "Boundary burst"
  → 100 requests ở giây 00:59 + 100 requests ở giây 01:00
  → 200 requests trong 2 giây! (vượt limit)
```

**Ưu điểm**: Đơn giản, nhanh, ít memory.  
**Nhược điểm**: Boundary burst problem.

### 2. Sliding Window Log

```
Lưu timestamp MỌI request, kiểm tra N request gần nhất

  Window: 60 giây gần nhất (trượt theo thời gian)
  ┌──────────────────────────────────────────────┐
  │ Timestamps: [10:00:05, 10:00:12, ..., 10:00:58] │
  │ Nếu count >= 100 → REJECT                       │
  └──────────────────────────────────────────────┘
  → Cửa sổ TRƯỢT liên tục → không có boundary burst
```

**Ưu điểm**: Chính xác, không boundary burst.  
**Nhược điểm**: Tốn memory (lưu mọi timestamp).

### 3. Sliding Window Counter

```
Kết hợp Fixed Window + ước tính — PHỔI BIẾN NHẤT

  Phút trước: 80 requests      Phút hiện tại: 30 requests
  Đã qua 40% phút hiện tại

  Ước tính = 80 × (1 - 0.4) + 30 = 48 + 30 = 78
  Limit: 100 → 78 < 100 → ALLOW ✅
```

**Ưu điểm**: Ít memory hơn Sliding Log, chính xác hơn Fixed Window.  
**Nhược điểm**: Chỉ là ước tính (nhưng đủ dùng).

### 4. Token Bucket

```
Xô chứa tokens. Mỗi request LẤY 1 token. Tokens được THÊM VÀO đều đặn.

  ┌──────────────┐
  │  🪙🪙🪙🪙🪙  │  Bucket (max 10 tokens)
  │  🪙🪙🪙🪙🪙  │
  └──────────────┘
       ↑ Thêm 1 token/giây
       ↓ Mỗi request lấy 1 token

  Bucket đầy (10 tokens) → Client gửi burst 10 requests → OK!
  Bucket rỗng → Request bị REJECT → Chờ token mới

  → CHO PHÉP BURST ngắn hạn (khác Fixed Window)
```

**Ưu điểm**: Cho phép burst hợp lý, mượt.  
**Nhược điểm**: Phức tạp hơn, cần track thời gian.

### 5. Leaky Bucket

```
Xô có lỗ rò. Request vào xô, xử lý với TỐC ĐỘ CỐ ĐỊNH.

  Request vào ↓
  ┌──────────────┐
  │  ●●●●●●●●●●  │  Queue (xô)
  │  ●●●●●●●●    │
  └──────┬───────┘
         ↓ Rò ra đều đặn (1/giây)
      [Xử lý]

  Xô đầy → Request mới bị DROP
  → Output luôn ĐỒNG ĐỀU (smooth)
```

**Ưu điểm**: Output đều đặn, predictable.  
**Nhược điểm**: Không burst được, latency cao khi queue dài.

## Bảng so sánh

| Thuật toán | Burst | Memory | Chính xác | Phức tạp | Dùng bởi |
|------------|-------|--------|-----------|----------|----------|
| **Fixed Window** | 🔴 Boundary burst | 🟢 Rất ít | 🟡 | 🟢 Dễ | Đơn giản |
| **Sliding Window Log** | 🟢 Không | 🔴 Nhiều | 🟢 Cao | 🟡 | Chính xác |
| **Sliding Window Counter** | 🟢 Ít | 🟡 | 🟡 | 🟡 | **Cloudflare, Redis** |
| **Token Bucket** | 🟢 Cho phép | 🟡 | 🟢 | 🟡 | **AWS, Stripe, NestJS** |
| **Leaky Bucket** | 🔴 Không | 🟡 | 🟢 | 🟡 | NGINX, message queues |

## NestJS — @nestjs/throttler

NestJS dùng **Token Bucket** (hoặc Fixed Window tùy version):

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,    // 60 giây
        limit: 10,     // Tối đa 10 requests / 60s
      },
    ]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },  // Áp dụng toàn cục
  ],
})
export class AppModule {}

// Skip cho route cụ thể
@SkipThrottle()
@Get('health')
healthCheck() { return 'ok' }

// Override limit cho route nhạy cảm
@Throttle({ default: { ttl: 60000, limit: 3 } })  // 3 lần/phút
@Post('auth/login')
login() { /* ... */ }
```

> 💡 **Phỏng vấn**: "Rate limiting dùng thuật toán gì?" → Token Bucket phổ biến nhất (AWS, Stripe). Sliding Window Counter cũng rất phổ biến (Cloudflare, Redis). NestJS dùng `@nestjs/throttler` với `ThrottlerGuard`.

---

# 25. Authentication vs Authorization

| | Authentication (Xác thực) | Authorization (Ủy quyền) |
|---|---|---|
| **Câu hỏi** | "Bạn là **AI**?" | "Bạn được phép làm **GÌ**?" |
| **Khi nào** | **Trước** authorization | **Sau** authentication |
| **Cách làm** | Username/password, JWT, OAuth, fingerprint | Roles, permissions, policies, ACL |
| **Lỗi** | 401 Unauthorized (chưa đăng nhập) | 403 Forbidden (đăng nhập rồi nhưng không đủ quyền) |
| **Ví dụ** | Login bằng email + password | User thường không được vào `/admin` |

```
Flow:
  Request → Authentication (ai?) → Authorization (có quyền?) → Handler

  Ví dụ NestJS:
  @UseGuards(AuthGuard)     ← Authentication: verify JWT token
  @UseGuards(RolesGuard)    ← Authorization: check role admin
  @Roles('admin')
  deleteUser() { }
```

> 💡 **Hay nhầm**: 401 là "chưa xác thực" (authentication), 403 là "không đủ quyền" (authorization). Dù HTTP gọi 401 là "Unauthorized" nhưng thực chất nó là **Unauthenticated**.

---

# 26. Cookie vs localStorage vs sessionStorage

| Tiêu chí | Cookie | localStorage | sessionStorage |
|----------|--------|-------------|----------------|
| **Dung lượng** | ~4KB | ~5-10MB | ~5-10MB |
| **Gửi kèm request** | ✅ Tự động gửi mỗi request | ❌ Không | ❌ Không |
| **Hết hạn** | Có (set `Expires`/`Max-Age`) | **Vĩnh viễn** (đến khi xóa) | **Đóng tab** = mất |
| **Truy cập bởi server** | ✅ Có | ❌ Không (chỉ JS) | ❌ Không |
| **httpOnly** | ✅ Có (JS không đọc được) | ❌ | ❌ |
| **Chia sẻ giữa tabs** | ✅ | ✅ | ❌ Mỗi tab riêng |
| **Dùng cho** | Auth token, thông tin server cần | User preferences, cache | Form data tạm, wizard steps |

```javascript
// Cookie
document.cookie = 'token=abc; max-age=3600; secure; httpOnly'

// localStorage
localStorage.setItem('theme', 'dark')
localStorage.getItem('theme')        // 'dark'
localStorage.removeItem('theme')

// sessionStorage — giống API, nhưng mất khi đóng tab
sessionStorage.setItem('step', '3')
```

> ⚠️ **Bảo mật**: Lưu JWT trong `httpOnly Cookie` (JS không đọc được → chống XSS). **KHÔNG** lưu JWT trong localStorage (XSS attack đọc được).

---

# 27. PUT vs PATCH vs POST

| | POST | PUT | PATCH |
|---|---|---|---|
| **Mục đích** | **Tạo mới** resource | **Thay thế toàn bộ** resource | **Cập nhật 1 phần** resource |
| **Idempotent** | ❌ Không (gọi 2 lần = 2 resource) | ✅ Có (gọi 2 lần = kết quả giống nhau) | ✅ Có |
| **Body** | Data của resource mới | **Toàn bộ** resource (mọi field) | **Chỉ field cần sửa** |

```javascript
// POST — Tạo user mới
POST /users
{ "name": "Phúc", "email": "p@x.com", "age": 25 }
// → 201 Created, tạo user với id mới

// PUT — Thay thế TOÀN BỘ user #1
PUT /users/1
{ "name": "Phúc Updated", "email": "new@x.com", "age": 26 }
// → Phải gửi MỌI field, thiếu field nào = null/xóa

// PATCH — Sửa CHỈ 1 field
PATCH /users/1
{ "age": 26 }
// → Chỉ cập nhật age, giữ nguyên name và email
```

> 💡 **Idempotent** = gọi 1 lần hay 100 lần, kết quả giống nhau. POST không idempotent vì gọi 2 lần = tạo 2 records.

---

# 28. Encoding vs Encryption vs Hashing

| | Encoding | Encryption | Hashing |
|---|---|---|---|
| **Mục đích** | **Chuyển đổi** dạng data | **Bảo mật** data (cần key để giải) | **Xác minh** tính toàn vẹn |
| **Đảo ngược** | ✅ Dễ (không cần key) | ✅ Có key mới giải được | ❌ **KHÔNG** đảo ngược được |
| **Bảo mật** | ❌ Không | ✅ Có | ✅ Một chiều |
| **Ví dụ** | Base64, URL encoding, UTF-8 | AES, RSA, HTTPS (TLS) | bcrypt, SHA-256, MD5 |
| **Dùng khi** | Truyền data qua mạng (binary → text) | Bảo vệ data nhạy cảm (messages, files) | Lưu password, verify file |

```
Encoding:    "Hello"  →  "SGVsbG8="        (Base64, ai cũng decode được)
Encryption:  "Hello"  →  "x7Fk2p..."       (AES + key, chỉ có key mới giải)
Hashing:     "Hello"  →  "2cf24d..."       (SHA-256, KHÔNG giải ngược được)
```

```typescript
// Password = LUÔN HASH, không bao giờ encrypt hay encode
import * as bcrypt from 'bcrypt'

const hash = await bcrypt.hash('myPassword', 10)  // Hash + salt
const match = await bcrypt.compare('myPassword', hash)  // Verify
// bcrypt tự thêm "salt" (random) → cùng password ra hash KHÁC NHAU
// → Chống rainbow table attack
```

> ⚠️ **SAI LẦM phổ biến**: Dùng Base64 để "mã hóa" password — SAI! Base64 là encoding, ai cũng decode được. Luôn dùng **bcrypt** (hash + salt) cho password.

---

# 29. Concurrency vs Parallelism

| | Concurrency (Đồng thời) | Parallelism (Song song) |
|---|---|---|
| **Bản chất** | **Quản lý** nhiều task cùng lúc (xen kẽ) | **Chạy** nhiều task cùng lúc (thật sự song song) |
| **Số CPU core** | Có thể 1 core | Cần **nhiều cores** |
| **Ví von** | 1 đầu bếp nấu 3 món (chuyển qua lại) | 3 đầu bếp nấu 3 món (cùng lúc) |

```
Concurrency (1 thread, xen kẽ):
  Thread: ──[Task A]──[Task B]──[Task A]──[Task C]──[Task B]──
  → 1 thread nhưng "có cảm giác" làm nhiều thứ cùng lúc

Parallelism (nhiều threads, thật sự song song):
  Thread 1: ──[Task A]──────────────
  Thread 2: ──[Task B]──────────────
  Thread 3: ──[Task C]──────────────
  → Nhiều threads chạy THẬT SỰ cùng lúc
```

### Node.js làm thế nào?

| Cơ chế | Loại | Ví dụ |
|---------|------|-------|
| **Event Loop** | Concurrency | I/O (file, network, DB) — 1 thread xen kẽ |
| **Worker Threads** | Parallelism | CPU-intensive (image processing, crypto) |
| **Cluster** | Parallelism | Nhiều process chạy cùng port |
| **libuv Thread Pool** | Parallelism | 4 threads cho fs, dns, crypto |

> 💡 Node.js là **concurrent bằng Event Loop** (I/O) và **parallel bằng Worker Threads/Cluster/libuv** (CPU).

---

# 30. Shallow Copy vs Deep Copy

| | Shallow Copy | Deep Copy |
|---|---|---|
| **Bản chất** | Copy **level 1**, nested objects vẫn **chia sẻ reference** | Copy **toàn bộ**, tạo objects mới hoàn toàn độc lập |
| **Thay đổi nested** | Ảnh hưởng bản gốc! | KHÔNG ảnh hưởng |

```javascript
const original = { name: 'Phúc', address: { city: 'HCM' } }

// SHALLOW COPY
const shallow = { ...original }
shallow.name = 'Hùng'           // ✅ KHÔNG ảnh hưởng original
shallow.address.city = 'HN'     // ❌ original.address.city CŨNG = 'HN'!
// Vì address là object → shallow copy chỉ copy REFERENCE

// DEEP COPY
const deep = structuredClone(original)   // ✅ ES2022+
deep.address.city = 'DN'
// original.address.city vẫn = 'HCM' ✅ Hoàn toàn độc lập
```

| Cách copy | Loại | Ghi chú |
|-----------|------|--------|
| `{ ...obj }` / `Object.assign()` | Shallow | Nhanh, phổ biến |
| `[...arr]` / `arr.slice()` | Shallow | Cho arrays |
| `structuredClone(obj)` | **Deep** | ✅ **Khuyến khích** (ES2022+) |
| `JSON.parse(JSON.stringify(obj))` | Deep | ⚠️ Mất `Date`, `undefined`, `function` |
| `lodash.cloneDeep(obj)` | Deep | An toàn nhưng cần install |

---

# 31. Vertical vs Horizontal Scaling

| | Vertical Scaling (Scale Up) | Horizontal Scaling (Scale Out) |
|---|---|---|
| **Bản chất** | Nâng cấp **1 server mạnh hơn** | Thêm **nhiều servers** |
| **Ví von** | Thay đầu bếp giỏi hơn | Thuê thêm đầu bếp |
| **Cách làm** | Thêm RAM, CPU, SSD | Thêm servers + Load Balancer |

```
Vertical (Scale Up):
  ┌────────────────────┐
  │  Server (8GB RAM)   │  →  ┌────────────────────┐
  └────────────────────┘      │  Server (64GB RAM)  │
                                └────────────────────┘
  → Cùng 1 máy, mạnh hơn

Horizontal (Scale Out):
  ┌────────────────────┐
  │   Load Balancer     │
  └───┬──────┬──────┬───┘
      │      │      │
  ┌───┴──┐┌──┴───┐┌─┴───┐
  │ Srv 1││ Srv 2 ││ Srv 3│
  └──────┘└──────┘└─────┘
  → Nhiều máy, chia tải
```

| Tiêu chí | Vertical | Horizontal |
|----------|----------|------------|
| **Giới hạn** | 🔴 Có (phần cứng max) | 🟢 Gần như vô hạn |
| **Đơn giản** | 🟢 Dễ (không cần thay đổi code) | 🔴 Khó (stateless, load balancer, shared DB) |
| **Downtime** | 🔴 Có (nâng cấp = restart) | 🟢 Không (thêm server, không dừng) |
| **Chi phí** | 🔴 Cao (đã mạnh rồi, mạnh thêm rất đắt) | 🟢 Rẻ hơn (nhiều server nhỏ) |
| **Single point of failure** | 🔴 Có (1 máy chết = mất hết) | 🟢 Không (1 máy chết, các máy khác chạy) |
| **Dùng cho** | DB (SQL thường scale vertical) | App servers, NoSQL, microservices |

---

# 32. Câu hỏi phỏng vấn tổng hợp

## Kiến trúc & Hạ tầng

| Câu hỏi | Key answer |
|---|---|
| SPA vs MPA? | SPA: 1 HTML, JS thay đổi DOM, mượt, kém SEO. MPA: nhiều HTML, full reload, SEO tốt |
| CSR vs SSR? | CSR: browser render (HTML rỗng, chậm FCP). SSR: server render mỗi request (SEO tốt, nhanh FCP) |
| SQL vs NoSQL? | SQL: bảng, schema cố định, ACID, JOINs. NoSQL: linh hoạt, scale ngang, eventual consistency |
| TCP vs UDP? | TCP: có kết nối, đảm bảo data đúng (HTTP). UDP: không kết nối, nhanh (video call) |
| HTTP vs WebSocket? | HTTP: request-response, stateless. WS: full-duplex, persistent, server push |
| Monolith vs Microservices? | Monolith: 1 khối, đơn giản. Micro: nhiều services, phức tạp. Start monolith first! |
| REST vs GraphQL? | REST: nhiều endpoints, server quyết data. GraphQL: 1 endpoint, client quyết data |
| Stateless vs Stateful? | Stateless: server KHÔNG nhớ client (JWT, scale dễ). Stateful: server NHỚ (WS, session, scale khó) |
| Vertical vs Horizontal Scaling? | Vertical: nâng cấp 1 server (giới hạn). Horizontal: thêm servers + load balancer (vô hạn) |

## JavaScript Core

| Câu hỏi | Key answer |
|---|---|
| Execution Context? | V8 tạo khi chạy code: VariableEnv (var) + LexicalEnv (let/const) + OuterRef + this. 2 phases: Creation → Execution |
| var vs let/const? | var: function scope, hoisted=undefined. let/const: block scope, TDZ. Luôn dùng const > let |
| Closure? | Function nhớ biến scope cha kể cả khi cha đã return. GC không xóa LexicalEnv vì vẫn tham chiếu |
| == vs ===? | == ép kiểu (nguy hiểm). === không ép kiểu (an toàn). LUÔN dùng === |
| null vs undefined? | null: dev CỐ Ý gán rỗng. undefined: JS tự gán |
| Callback vs Promise vs Async/Await? | Callback: hell. Promise: chain. Async/await: sugar trên Promise, đọc như sync |
| Throttle vs Debounce? | Throttle: tối đa 1 lần/interval (scroll). Debounce: chờ ngừng gọi (search input) |
| Shallow vs Deep Copy? | Shallow: copy level 1, nested chia sẻ ref. Deep: độc lập hoàn toàn. Dùng `structuredClone()` |

## Node.js

| Câu hỏi | Key answer |
|---|---|
| nextTick vs setImmediate? | nextTick: microtask, CAO NHẤT, starve được. setImmediate: Check phase, an toàn hơn |
| Microtask vs Macrotask? | Microtask: ưu tiên cao, quét sạch trước. Macrotask: 6 phases. Node KHÔNG có "Macrotask Queue" |
| CommonJS vs ESM? | CJS: require, sync, runtime. ESM: import, async, parse time, tree-shaking |
| Concurrency vs Parallelism? | Concurrency: 1 thread xen kẽ (Event Loop). Parallelism: nhiều threads thật sự (Worker Threads, Cluster) |

## Backend & Security

| Câu hỏi | Key answer |
|---|---|
| Authentication vs Authorization? | AuthN: "bạn là AI?" (401). AuthZ: "bạn được làm GÌ?" (403). AuthN luôn trước AuthZ |
| Cookie vs localStorage? | Cookie: 4KB, gửi kèm request, httpOnly. localStorage: 5MB, chỉ JS, vĩnh viễn. Lưu JWT trong httpOnly cookie |
| PUT vs PATCH? | PUT: thay toàn bộ resource (mọi field). PATCH: sửa 1 phần (chỉ field cần). Cả hai idempotent |
| Encoding vs Encryption vs Hashing? | Encoding: chuyển dạng (đảo ngược dễ). Encryption: bảo mật (cần key). Hashing: 1 chiều (password → bcrypt) |
| Session vs JWT? | Session: stateful, server lưu, dễ revoke. JWT: stateless, client lưu, scale dễ, khó revoke |
| Rate limiting dùng gì? | Token Bucket (AWS, Stripe). NestJS: `@nestjs/throttler`. Sliding Window Counter (Cloudflare) |

## TypeScript & NestJS

| Câu hỏi | Key answer |
|---|---|
| interface vs type? | interface: object shape, merging. type: mọi thứ (union, intersection) |
| Abstract class vs Interface? | Abstract: có code + runtime. Interface: chỉ contract, biến mất sau compile |
| DIP vs IoC vs DI? | DIP: nguyên tắc. IoC: triết lý. DI: kỹ thuật (inject qua constructor) |
| Middleware vs Guard? | Middleware: không biết handler. Guard: có ExecutionContext, quyết định cho phép/chặn |
| tap vs map (Interceptor)? | tap: side-effect, KHÔNG thay đổi data. map: biến đổi data |
