# So Sánh Bản Chất — Các Khái Niệm Thường Gặp Trong Phỏng Vấn

> Tài liệu tổng hợp các cặp so sánh **bản chất** — tập trung vào **tại sao**, **cách hoạt động**, và **khi nào dùng gì**, không chỉ liệt kê bề mặt.

---

## Mục lục

1. [SPA vs MPA](#1-spa-vs-mpa)
2. [CSR vs SSR vs SSG vs ISR](#2-csr-vs-ssr-vs-ssg-vs-isr)
3. [SQL vs NoSQL](#3-sql-vs-nosql)
4. [TCP vs UDP — Giao thức có kết nối vs không kết nối](#4-tcp-vs-udp--giao-thức-có-kết-nối-vs-không-kết-nối)
5. [HTTP vs WebSocket](#5-http-vs-websocket)
6. [Monolith vs Microservices](#6-monolith-vs-microservices)
7. [REST vs GraphQL](#7-rest-vs-graphql)
8. [Câu hỏi phỏng vấn tổng hợp](#8-câu-hỏi-phỏng-vấn-tổng-hợp)

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

# 8. Câu hỏi phỏng vấn tổng hợp

| Câu hỏi | Key answer |
|---|---|
| SPA vs MPA? | SPA: 1 HTML, JS thay đổi DOM, không reload → mượt nhưng kém SEO. MPA: nhiều HTML, full reload → SEO tốt nhưng chậm navigate |
| CSR vs SSR? | CSR: browser render bằng JS (HTML rỗng → chậm FCP, kém SEO). SSR: server render HTML đầy đủ mỗi request (SEO tốt, nhanh FCP) |
| SSG vs ISR? | SSG: tạo HTML lúc build (siêu nhanh nhưng data cũ). ISR: SSG + tự revalidate sau N giây (nhanh + data cập nhật) |
| Hydration là gì? | Quá trình React gắn event listeners + state lên HTML tĩnh từ server → HTML "sống" (interactive) |
| SQL vs NoSQL? | SQL: bảng, schema cố định, ACID, JOINs mạnh. NoSQL: linh hoạt, scale horizontal, nhanh nhưng ít consistency |
| Normalize vs Denormalize? | Normalize: mỗi data 1 chỗ (SQL, ít trùng lặp). Denormalize: copy data (NoSQL, đọc nhanh, ghi khó maintain) |
| TCP vs UDP? | TCP: có kết nối, đảm bảo data đủ + đúng thứ tự (HTTP, DB). UDP: không kết nối, nhanh, chấp nhận mất gói (video call, game) |
| 3-way handshake? | SYN → SYN-ACK → ACK. TCP thiết lập kết nối trước khi gửi data |
| HTTP vs WebSocket? | HTTP: request-response, stateless. WebSocket: full-duplex, persistent, server push. Dùng WS cho real-time |
| Polling vs SSE vs WebSocket? | Polling: client hỏi liên tục. SSE: server push 1 chiều. WebSocket: 2 chiều real-time |
| Monolith vs Microservices? | Monolith: 1 codebase, đơn giản, scale toàn bộ. Microservices: nhiều services, phức tạp, scale từng phần. Start monolith first! |
| REST vs GraphQL? | REST: nhiều endpoints, server quyết định data. GraphQL: 1 endpoint, client quyết định data. REST dễ cache, GraphQL linh hoạt hơn |
| Over-fetching vs Under-fetching? | Over: nhận fields thừa (REST trả toàn bộ object). Under: cần nhiều requests cho 1 view (REST cần N calls). GraphQL giải quyết cả hai |
