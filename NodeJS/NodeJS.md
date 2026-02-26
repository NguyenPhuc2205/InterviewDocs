# 📘 Ôn Tập Phỏng Vấn Node.js — Toàn Diện

> Tài liệu này bao gồm **tất cả các chủ đề chính** bạn cần nắm vững để tự tin bước vào phỏng vấn Node.js, từ cơ bản đến nâng cao.

---

## Mục lục

1. [Node.js là gì & Kiến trúc](#1-nodejs-là-gì--kiến-trúc)
2. [Event Loop](#2-event-loop)
3. [Modules System](#3-modules-system)
4. [Asynchronous Programming](#4-asynchronous-programming)
5. [Streams & Buffers](#5-streams--buffers)
6. [Error Handling](#6-error-handling)
7. [File System (fs)](#7-file-system-fs)
8. [HTTP & Networking](#8-http--networking)
9. [Express.js (Framework phổ biến nhất)](#9-expressjs)
10. [NestJS (Enterprise Framework)](#10-nestjs)
11. [Database & ORM](#11-database--orm)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Security Best Practices](#13-security-best-practices)
14. [Testing](#14-testing)
15. [Performance & Scaling](#15-performance--scaling)
16. [Design Patterns trong Node.js](#16-design-patterns-trong-nodejs)
17. [Memory Management & Garbage Collection](#17-memory-management--garbage-collection)
18. [Worker Threads & Child Processes](#18-worker-threads--child-processes)
19. [Package Management (npm/yarn/pnpm)](#19-package-management)
20. [DevOps & Deployment](#20-devops--deployment)
21. [Câu hỏi thường gặp trong phỏng vấn](#21-câu-hỏi-thường-gặp)

---

## 1. Node.js là gì & Kiến trúc

### 1.1 Định nghĩa
- **Node.js** là một **JavaScript runtime** được xây dựng trên **V8 Engine** của Chrome.
- Cho phép chạy JavaScript **ngoài trình duyệt** (phía server).
- **Không phải** là một ngôn ngữ lập trình, cũng **không phải** framework.

### 1.2 Đặc điểm chính
| Đặc điểm              | Giải thích                                                         |
| ---------------------- | ------------------------------------------------------------------ |
| **Single-threaded**    | Mặc định chạy trên 1 thread duy nhất (main thread)                |
| **Event-driven**       | Hoạt động dựa trên cơ chế sự kiện (events)                        |
| **Non-blocking I/O**   | Các tác vụ I/O không chặn thread chính                             |
| **Cross-platform**     | Chạy trên Windows, macOS, Linux                                   |
| **V8 Engine**          | Biên dịch JS thành machine code (rất nhanh)                       |

### 1.3 Kiến trúc bên trong

```
         ┌─────────────────────────────────┐
         │        JavaScript Code          │
         └──────────────┬──────────────────┘
                        │
         ┌──────────────▼──────────────────┐
         │          Node.js APIs           │
         │   (fs, http, crypto, path...)   │
         └──────────────┬──────────────────┘
                        │
         ┌──────────────▼──────────────────┐
         │         Node.js Bindings        │
         │          (C++ Addons)           │
         └──────┬───────────────┬──────────┘
                │               │
    ┌───────────▼───┐   ┌──────▼──────────┐
    │   V8 Engine   │   │     libuv       │
    │ (JS → Machine │   │ (Event Loop,    │
    │     Code)     │   │  Thread Pool,   │
    │               │   │  Async I/O)     │
    └───────────────┘   └─────────────────┘
```

### 1.4 Câu hỏi phỏng vấn thường gặp

> **Q: Node.js là single-threaded, vậy nó xử lý concurrency như thế nào?**
>
> **A:** Node.js sử dụng **Event Loop** (single-threaded) kết hợp với **libuv thread pool** (multi-threaded, mặc định 4 threads) để xử lý các tác vụ I/O bất đồng bộ. Khi có tác vụ I/O (đọc file, query DB...), nó được đẩy sang thread pool, main thread tiếp tục xử lý các tác vụ khác. Khi I/O hoàn tất, callback được đưa vào Event Queue để Event Loop xử lý.

> **Q: So sánh Node.js với các backend truyền thống (Java, PHP)?**
>
> **A:**
> - **Java/PHP**: Mỗi request tạo 1 thread mới → tốn tài nguyên khi có nhiều concurrent requests.
> - **Node.js**: 1 thread xử lý tất cả requests nhờ non-blocking I/O → xử lý hàng nghìn concurrent connections với ít tài nguyên hơn.
> - **Trade-off**: Node.js **không phù hợp** cho CPU-intensive tasks (mã hóa video, tính toán nặng) vì sẽ **block Event Loop**.

### 1.5 Node.js Bindings — Cầu nối JS ↔ C++

Bindings là thành phần **thường bị bỏ qua** nhưng **cực kỳ quan trọng** trong kiến trúc Node.js:

```
┌──────────────────────────────────────────────────────────────┐
│                     NODE.JS RUNTIME                          │
│                                                              │
│  Layer 1: JavaScript Code                                    │
│           → Code bạn viết: fs.readFile(), http.get()...      │
│                              │                               │
│  Layer 2: Node.js Core APIs (JS)                             │
│           → Module fs, http, crypto... viết bằng JS/TS       │
│           → Nằm trong thư mục lib/ của Node.js source        │
│                              │                               │
│  Layer 3: Node.js Bindings (C++)         ← CHÍNH LÀ ĐÂY     │
│           → Nằm trong thư mục src/*.cc                       │
│           → Dùng V8 C++ API / Node-API (N-API)               │
│           → Chuyển đổi kiểu dữ liệu JS ↔ C++               │
│                     ┌────────┴────────┐                      │
│  Layer 4a: V8       │   Layer 4b: libuv                      │
│  (Chạy JS code,     │   (Event Loop,                         │
│   heap, GC)          │   Thread Pool, Async I/O)              │
└──────────────────────┴───────────────────────────────────────┘
```

**Bindings làm gì cụ thể?**

Khi bạn gọi `fs.readFile('file.txt', callback)` trong JavaScript — JavaScript **không thể trực tiếp** gọi OS để đọc file. Bindings thực hiện 2 việc:

1. **Type Marshalling** — Chuyển đổi kiểu dữ liệu giữa 2 thế giới:
   - JS `string` → C++ `std::string`
   - JS `Buffer` → C++ `char*`
   - JS `callback function` → V8 `v8::Function` handle

2. **Function Bridging** — Kết nối function call từ JS sang C++:
   - JS gọi `fs.readFile()` → Binding nhận qua V8 API
   - Binding gọi `libuv` function tương ứng (`uv_fs_read`)
   - Khi libuv xong → Binding chuyển kết quả ngược lại thành JS value
   - Callback được đưa vào Event Loop queue

**Ví dụ luồng `fs.readFile()`:**

```
JS: fs.readFile('file.txt', callback)
 │
 ▼
Node.js Core (lib/fs.js):
 → Validate arguments, wrap callback
 │
 ▼
Bindings (src/node_file.cc):
 → Nhận v8::String → chuyển thành C-string
 → Gọi uv_fs_read() (libuv API)
 │
 ▼
libuv:
 → Đẩy task vào Thread Pool (1 trong 4 threads)
 → Thread đọc file từ OS
 → Khi xong → đưa callback vào Poll queue
 │
 ▼
Event Loop (Poll phase):
 → Lấy callback ra → Bindings chuyển C++ result → JS Buffer
 → Gọi callback(null, data) trong JS
```

> 💡 **Node-API (N-API):** Từ Node.js v8+, Node-API cung cấp **ABI-stable** layer — add-on C++ compile 1 lần, chạy trên nhiều Node.js versions mà không cần recompile. Đây là cách khuyến khích để viết native add-ons.

### 1.6 Câu hỏi phỏng vấn — Bindings

> **Q: Giải thích luồng xử lý khi gọi `fs.readFile()` trong Node.js?**
>
> **A:** Khi gọi `fs.readFile()`, request đi qua 4 layers: (1) JS code gọi module `fs` → (2) Module `fs` (viết bằng JS, nằm trong `lib/fs.js`) validate arguments → (3) **Bindings** (C++, nằm trong `src/node_file.cc`) chuyển đổi JS types sang C++ types và gọi libuv → (4) **libuv** đẩy task đọc file vào Thread Pool. Khi file đọc xong, libuv đưa callback vào Event Loop (Poll phase), Bindings chuyển C++ result ngược lại thành JS value, rồi callback được gọi.

---

## 2. Event Loop, Libuv & Hệ Thống Hàng Đợi

### 2.1 Event Loop là gì?
Event Loop là **trái tim** của Node.js. Nó là cơ chế cho phép Node.js thực hiện **non-blocking I/O** mặc dù JavaScript là single-threaded.

### 2.2 Cấu trúc libuv — Bộ máy bên trong Node.js

**libuv** là thư viện C, cốt lõi của Node.js, cung cấp Event Loop, Thread Pool, và Async I/O.

```
┌─────────────────────────────────────────────────────────────────┐
│                        LIBUV ARCHITECTURE                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   EVENT LOOP (Main Thread)                │  │
│  │                                                           │  │
│  │  Vòng lặp liên tục qua 6 phases:                         │  │
│  │                                                           │  │
│  │   ┌──────────┐   ┌──────────┐   ┌──────────┐             │  │
│  │   │ Timers   │──►│ Pending  │──►│  Idle/   │             │  │
│  │   │          │   │Callbacks │   │ Prepare  │             │  │
│  │   └──────────┘   └──────────┘   └────┬─────┘             │  │
│  │        ▲                             │                    │  │
│  │        │                             ▼                    │  │
│  │   ┌──────────┐   ┌──────────┐   ┌──────────┐             │  │
│  │   │  Close   │◄──│  Check   │◄──│   Poll   │             │  │
│  │   │Callbacks │   │          │   │          │             │  │
│  │   └──────────┘   └──────────┘   └──────────┘             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────┐  ┌─────────────────────────────┐ │
│  │   THREAD POOL (4 threads) │  │   OS ASYNC I/O              │ │
│  │                           │  │                             │ │
│  │   • fs.readFile()         │  │   • epoll (Linux)           │ │
│  │   • crypto.pbkdf2()       │  │   • kqueue (macOS)          │ │
│  │   • dns.lookup()          │  │   • IOCP (Windows)          │ │
│  │   • zlib.compress()       │  │   • TCP/UDP, DNS resolve    │ │
│  │                           │  │                             │ │
│  │   UV_THREADPOOL_SIZE=4    │  │   Không giới hạn threads    │ │
│  └───────────────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**3 thành phần chính của libuv:**

| Thành phần | Vai trò | Ví dụ |
|-----------|---------|-------|
| **Event Loop** | Vòng lặp chạy trên main thread, điều phối callbacks qua 6 phases | Toàn bộ luồng xử lý async |
| **Thread Pool** | 4 worker threads (mặc định), xử lý tác vụ blocking I/O | `fs.*`, `crypto.*`, `dns.lookup()`, `zlib.*` |
| **OS Async I/O** | Dùng cơ chế non-blocking của OS cho networking | TCP/UDP sockets, `dns.resolve()`, pipes |

> ⚠️ **Quan trọng:** Thread Pool chỉ dùng cho một số tác vụ cụ thể (file system, crypto, dns.lookup). Các tác vụ networking (TCP, HTTP) **KHÔNG dùng thread pool** — chúng dùng OS async I/O trực tiếp, nên Node.js handle hàng nghìn connections mà không cần hàng nghìn threads.

### 2.2.1 Toàn bộ Runtime — Queue nằm ở đâu?

Đây là bức tranh **đầy đủ** về toàn bộ hệ thống queue trong Node.js runtime:

```
┌──────────────────────────────────────────────────────────────┐
│                     NODE.JS RUNTIME                          │
│                                                              │
│  ┌─────────────┐                                             │
│  │  Call Stack  │  ← V8 chạy JS synchronous ở đây            │
│  └──────┬──────┘                                             │
│         │ (khi Call Stack rỗng)                               │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ [1] nextTick Queue                                  │     │
│  │     → process.nextTick()                            │     │
│  │     → Quản lý bởi: NODE.JS CORE (không phải libuv)  │     │
│  │     → Ưu tiên: CAO NHẤT                            │     │
│  └────────────────────┬────────────────────────────────┘     │
│                       ▼                                      │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ [2] Microtask Queue                                 │     │
│  │     → Promise.then(), async/await, queueMicrotask() │     │
│  │     → Quản lý bởi: V8 ENGINE                       │     │
│  │     → Ưu tiên: cao (sau nextTick)                   │     │
│  └────────────────────┬────────────────────────────────┘     │
│                       ▼                                      │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ [3-8] 6 Phase Queues (KHÔNG gọi là "Macrotask")     │     │
│  │     → Timers / Pending / Idle / Poll / Check / Close│     │
│  │     → Quản lý bởi: LIBUV                           │     │
│  │     → Ưu tiên: thấp nhất, chạy sau microtask       │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              libuv Event Loop                        │    │
│  │    Điều phối: lấy callback từ phases, xen kẽ với     │    │
│  │    việc quét sạch microtask queues ở trên            │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

> ⚠️ **Điểm quan trọng:** Node.js **KHÔNG có "Macrotask Queue"** theo đúng nghĩa như browser. Thuật ngữ "macrotask" là khái niệm từ HTML spec (browser). Trong Node.js, thay vào đó là **6 phase queues riêng biệt**, mỗi phase có queue của nó. Nhiều tài liệu dùng chung thuật ngữ "macrotask" cho dễ hiểu khi so sánh với browser — nhưng về mặt kỹ thuật chính xác thì Node.js không sử dụng tên đó.

### 2.3 Các phase của Event Loop (Macrotask Queues)

Mỗi phase trong Event Loop là **một hàng đợi macrotask** do libuv quản lý:

```
   ┌───────────────────────────┐
┌─>│      1. TIMERS            │ ← setTimeout(), setInterval()
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │   2. PENDING CALLBACKS    │ ← I/O callbacks bị trì hoãn từ vòng trước
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │   3. IDLE, PREPARE        │ ← Internal (Node.js dùng nội bộ)
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │      4. POLL              │ ← ⭐ Quan trọng nhất: lấy I/O events mới
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │      5. CHECK             │ ← setImmediate()
│  └─────────────┬─────────────┘
│  ┌─────────────▼─────────────┐
│  │   6. CLOSE CALLBACKS      │ ← socket.on('close', ...)
└──┴───────────────────────────┘
```

| Phase | Chứa callback từ | Mô tả |
|-------|------------------|-------|
| **Timers** | `setTimeout()`, `setInterval()` | Thực thi callbacks đã đến hạn (delay ≥ threshold) |
| **Pending Callbacks** | System errors, deferred I/O | I/O callbacks bị hoãn từ vòng trước (ít gặp) |
| **Idle, Prepare** | Internal | Node.js dùng nội bộ, developer không cần quan tâm |
| **Poll** | I/O events mới | ⭐ Lấy I/O events từ OS (network, file), thực thi callbacks. Nếu queue rỗng → **chờ ở đây** |
| **Check** | `setImmediate()` | Chạy ngay sau Poll phase |
| **Close Callbacks** | Close events | `socket.on('close')`, `server.on('close')` |

> 📌 **Cập nhật Node.js 20+ (libuv 1.45.0):** Từ libuv 1.45.0, Event Loop chạy Timers phase **chỉ sau Poll phase**, thay vì cả trước và sau như trước đây. Điều này có thể ảnh hưởng thứ tự giữa `setImmediate()` và timers trong một số edge cases.

### 2.4 Microtask Queues — KHÔNG thuộc libuv

Đây là điểm **cực kỳ quan trọng** mà nhiều người nhầm lẫn:

```
┌─────────────────────────────────────────────────────────────────┐
│              TOÀN BỘ HỆ THỐNG HÀNG ĐỢI NODE.JS                │
│                                                                 │
│  ┌───────────────────────────────────────┐  ← V8 Engine +      │
│  │      MICROTASK QUEUES (V8/Node Core)  │     Node.js Core     │
│  │                                       │     quản lý          │
│  │   1. nextTick Queue                   │  ← process.nextTick()│
│  │      (ưu tiên CAO NHẤT)              │                      │
│  │                                       │                      │
│  │   2. Promise Queue                    │  ← Promise.then()    │
│  │      (ưu tiên thứ 2)                 │     catch(), finally()│
│  │                                       │     async/await       │
│  │                                       │     queueMicrotask() │
│  └───────────────────────────────────────┘                      │
│                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                      │
│                                                                 │
│  ┌───────────────────────────────────────┐  ← libuv quản lý    │
│  │      MACROTASK QUEUES (Libuv Phases)  │                      │
│  │                                       │                      │
│  │   1. Timers Queue       → setTimeout  │                      │
│  │   2. Pending Callbacks  → deferred IO │                      │
│  │   3. Poll Queue         → I/O events  │                      │
│  │   4. Check Queue        → setImmediate│                      │
│  │   5. Close Queue        → close events│                      │
│  └───────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

**Tóm tắt phân chia trách nhiệm:**

| | Microtask Queues | Macrotask Queues |
|---|---|---|
| **Ai quản lý?** | **V8 Engine + Node.js Core** | **Libuv** |
| **Nằm trong libuv?** | ❌ **KHÔNG** | ✅ Có |
| **Gồm những gì?** | `process.nextTick()`, `Promise.then/catch/finally`, `queueMicrotask()` | `setTimeout`, `setInterval`, `setImmediate`, I/O callbacks, close callbacks |
| **Ưu tiên** | Luôn **cao hơn** macrotask | Thấp hơn microtask |

### 2.5 Thứ tự thực thi — Thuật toán chi tiết (Node.js v11+)

Đây là phần **quan trọng nhất** cần nắm:

```
┌─────────────────────────────────────────────────────────┐
│                 THUẬT TOÁN THỰC THI                      │
│                                                          │
│  Bước 1:  Chạy hết code ĐỒNG BỘ (Call Stack)           │
│           ↓                                              │
│  Bước 2:  Quét sạch Microtask Queue:                    │
│           → Chạy HẾT nextTick queue                     │
│           → Chạy HẾT Promise queue                      │
│           ↓                                              │
│  Bước 3:  Lấy 1 callback từ Macrotask (phase hiện tại) │
│           ↓                                              │
│  Bước 4:  Quét sạch Microtask Queue LẦN NỮA            │
│           → Chạy HẾT nextTick queue                     │
│           → Chạy HẾT Promise queue                      │
│           ↓                                              │
│  Bước 5:  Quay lại Bước 3 (lấy macrotask tiếp theo)    │
│           Hết macrotask trong phase → chuyển phase       │
└─────────────────────────────────────────────────────────┘

Công thức dễ nhớ:
  Sync → All Microtasks
  → 1 Macrotask → All Microtasks
  → 1 Macrotask → All Microtasks
  → ...
```

> ⚠️ **Thay đổi quan trọng ở Node.js v11+:**
> - **Trước v11:** Node.js chạy **HẾT tất cả callbacks** trong 1 phase rồi mới quét microtask.
> - **Từ v11+:** Node.js chạy **1 callback** → quét microtask → 1 callback → quét microtask (giống browser).
> - Điều này ảnh hưởng thứ tự output trong một số edge cases.

### 2.6 Ví dụ 1 — Cơ bản: Đoán output

```javascript
console.log('1');                          // Sync

setTimeout(() => console.log('2'), 0);     // Macrotask (timers)

setImmediate(() => console.log('3'));       // Macrotask (check)

Promise.resolve().then(() => console.log('4')); // Microtask (promise)

process.nextTick(() => console.log('5'));   // Microtask (nextTick)

console.log('6');                          // Sync
```

**Output: `1, 6, 5, 4, 2, 3`** (2 và 3 có thể swap ở top-level context)

**Giải thích từng bước:**
1. Chạy sync: `console.log('1')` → in **1**
2. `setTimeout` → đăng ký vào Timers queue (macrotask)
3. `setImmediate` → đăng ký vào Check queue (macrotask)
4. `Promise.then` → đăng ký vào Promise queue (microtask)
5. `process.nextTick` → đăng ký vào nextTick queue (microtask)
6. Chạy sync: `console.log('6')` → in **6**
7. Call Stack rỗng → **Quét microtask**: nextTick trước → in **5**, Promise sau → in **4**
8. Chuyển sang macrotask: Timers phase → `setTimeout` → in **2**
9. Check phase → `setImmediate` → in **3**

### 2.7 Ví dụ 2 — Microtask chen giữa Macrotask (Node v11+)

```javascript
setTimeout(() => {
  console.log('timeout 1');
  Promise.resolve().then(() => console.log('promise inside timeout'));
}, 0);

setTimeout(() => {
  console.log('timeout 2');
}, 0);
```

**Output (Node v11+):**
```
timeout 1
promise inside timeout    ← Promise chen VÀO GIỮA 2 setTimeout!
timeout 2
```

**Output (Node < v11):**
```
timeout 1
timeout 2                 ← Chạy hết Timers phase trước
promise inside timeout    ← Rồi mới quét microtask
```

**Giải thích (v11+):** Sau khi chạy `timeout 1` (1 macrotask), Node.js **dừng lại quét microtask** trước khi chạy `timeout 2`. Promise callback xuất hiện trong lúc chạy `timeout 1` nên nó được quét ngay.

> 💡 **Tại sao Node.js v11 thay đổi?** Trước v11, Node.js chạy **hết tất cả callbacks trong 1 phase** rồi mới quét microtask → khác với browser (browser quét microtask sau MỖI macrotask). Đây là breaking change lớn — mục đích để **đồng nhất behavior** giữa Node.js và browser, giúp code chạy consistent trên cả 2 môi trường.
>
> | Version | Behavior |
> |---------|----------|
> | **Node < v11** | Chạy hết phase → quét microtask → phase tiếp |
> | **Node ≥ v11** | Chạy 1 callback → quét microtask → callback tiếp |

### 2.8 Ví dụ 3 — Trong I/O callback: setImmediate luôn trước setTimeout

```javascript
const fs = require('fs');

fs.readFile(__filename, () => {
  // Bên trong I/O callback (Poll phase)

  setTimeout(() => console.log('setTimeout'), 0);
  setImmediate(() => console.log('setImmediate'));
});
```

**Output (LUÔN là):**
```
setImmediate
setTimeout
```

**Tại sao?** Khi đang ở **Poll phase** (I/O callback), phase tiếp theo là **Check phase** (`setImmediate`), rồi mới quay lại **Timers phase** (`setTimeout`). Nên `setImmediate` luôn chạy trước.

> 💡 **Ở top-level context** (ngoài I/O callback), thứ tự `setTimeout(fn, 0)` vs `setImmediate` **không xác định** — phụ thuộc vào tốc độ khởi tạo timer.
>
> **Tại sao non-deterministic?** Đây là giải thích kỹ thuật:
>
> 1. `setTimeout(fn, 0)` trong Node.js **thực tế là 1ms minimum** (Node.js tự động chuyển `0` thành `1`)
> 2. Trước khi Event Loop bắt đầu iteration đầu tiên, libuv gọi `clock_gettime()` (system call) để lấy current time
> 3. Thời gian của system call này **không cố định** — phụ thuộc vào tải hệ thống, các process khác đang chạy
> 4. **Nếu** `clock_gettime()` + initialization mất > 1ms → timer đã expire → Timers phase chạy trước → **`setTimeout` trước**
> 5. **Nếu** quá trình đó mất < 1ms → timer chưa expire → Poll → Check → **`setImmediate` trước**
>
> Tóm lại: phụ thuộc vào cuộc đua giữa **1ms timer** và **tốc độ khởi tạo process**.
>
> (Nguồn: [Node.js Official Docs — setImmediate vs setTimeout](https://nodejs.org/en/learn/asynchronous-work/understanding-setimmediate))

### 2.9 Tại sao `process.nextTick()` ưu tiên hơn Promise?

`process.nextTick()` nằm trong **nextTick queue** riêng, luôn được quét **trước** Promise queue. Lý do lịch sử: `process.nextTick()` có từ trước khi Promise ra đời, và Node.js giữ backward compatibility.

```javascript
Promise.resolve().then(() => console.log('Promise'));
process.nextTick(() => console.log('nextTick'));
// Output: nextTick, Promise    ← nextTick LUÔN trước!
```

> ⚠️ **Cảnh báo:** Đệ quy `process.nextTick()` sẽ **starve Event Loop** — I/O callbacks không bao giờ được gọi vì microtask queue không bao giờ rỗng:
> ```javascript
> // ❌ NGUY HIỂM: I/O bị starve
> function loop() {
>   process.nextTick(loop);
> }
> loop();
> // → setTimeout, setImmediate, I/O callbacks... sẽ KHÔNG BAO GIỜ chạy!
>
> // ✅ An toàn hơn: dùng setImmediate
> function safeLoop() {
>   setImmediate(safeLoop); // Cho phép I/O callbacks chạy giữa các lần lặp
> }
> ```

### 2.10 `queueMicrotask()` — API chuẩn

`queueMicrotask()` là API tiêu chuẩn (Web API + Node.js), có cùng ưu tiên với `Promise.then()`:

```javascript
queueMicrotask(() => console.log('queueMicrotask'));
Promise.resolve().then(() => console.log('Promise'));
process.nextTick(() => console.log('nextTick'));

// Output: nextTick → Promise → queueMicrotask
// (Promise và queueMicrotask nằm cùng queue, chạy theo thứ tự đăng ký)
```

### 2.11 Câu hỏi phỏng vấn

> **Q: `process.nextTick()` và `setImmediate()` khác nhau thế nào?**
>
> **A:**
> - `process.nextTick()`: Thuộc **microtask queue** (V8/Node Core). Thực thi **ngay sau operation hiện tại**, trước khi Event Loop chuyển phase. Ưu tiên cao nhất.
> - `setImmediate()`: Thuộc **macrotask** (libuv Check phase). Thực thi ở **check phase** của Event Loop.
> - ⚠️ Dùng quá nhiều `process.nextTick()` đệ quy có thể **starve Event Loop** — I/O callbacks không bao giờ được gọi. `setImmediate()` an toàn hơn vì cho phép I/O callbacks chạy giữa các lần lặp.

> **Q: Microtask queue và macrotask queue khác nhau thế nào? Ai quản lý?**
>
> **A:**
> - **Microtask queues** do **V8 Engine và Node.js Core** quản lý, gồm: nextTick queue (`process.nextTick`) và Promise queue (`Promise.then`, `queueMicrotask`). **Không nằm trong libuv.**
> - **Macrotask queues** do **libuv** quản lý, chính là các **phases** của Event Loop: Timers (`setTimeout`), Poll (I/O), Check (`setImmediate`), Close callbacks.
> - Microtask luôn được **ưu tiên hơn**: sau mỗi macrotask, Node.js quét sạch toàn bộ microtask queue trước khi chạy macrotask tiếp theo (Node v11+).

> **Q: Event Loop có thể bị block không?**
>
> **A:** Có! Bất kỳ synchronous operation nào chạy lâu đều block Event Loop:
> - CPU-intensive calculations (vòng lặp nặng, mã hóa)
> - Synchronous I/O (`fs.readFileSync`)
> - Đệ quy vô hạn hoặc `process.nextTick()` đệ quy
> → Giải pháp: Worker Threads, Child Processes, hoặc chia nhỏ tác vụ với `setImmediate()`.

### 2.12 So sánh Event Loop: Browser vs Node.js

Đây là câu hỏi phỏng vấn **rất phổ biến** — cần phân biệt rõ vì implementation rất khác nhau:

**Browser Event Loop:**
```
┌─────────────────────────────────────────────────┐
│              BROWSER RUNTIME                     │
│                                                  │
│  Call Stack (JS Engine, V8/SpiderMonkey)          │
│       │                                          │
│       ▼ (khi Call Stack rỗng)                    │
│  ┌───────────────────────┐                       │
│  │ 1. Microtask Queue    │ ← Promise.then(),     │
│  │    (quét sạch hết)    │   MutationObserver     │
│  └───────────┬───────────┘                       │
│              ▼                                   │
│  ┌───────────────────────┐                       │
│  │ 2. requestAnimation   │ ← Animation callbacks │
│  │    Frame (rAF)        │   (~60fps, 16ms)       │
│  └───────────┬───────────┘                       │
│              ▼                                   │
│  ┌───────────────────────┐                       │
│  │ 3. Render             │ ← Style → Layout →    │
│  │    (nếu cần)          │   Paint → Composite    │
│  └───────────┬───────────┘                       │
│              ▼                                   │
│  ┌───────────────────────┐                       │
│  │ 4. Macrotask Queue    │ ← setTimeout,          │
│  │    (lấy 1 task)       │   click events, I/O    │
│  └───────────┘───────────┘                       │
│       │                                          │
│       └── quay lại bước 1 ──────────────────────→│
└─────────────────────────────────────────────────┘
```

**Node.js Event Loop:**
```
┌──────────────────────────────────────────────────┐
│              NODE.JS RUNTIME                      │
│                                                   │
│  Call Stack (V8)                                  │
│       │                                           │
│       ▼ (khi Call Stack rỗng)                     │
│  ┌────────────────────────┐                       │
│  │ nextTick + Microtask   │ ← process.nextTick(), │
│  │ (quét sạch sau MỖI    │   Promise.then()       │
│  │  callback — v11+)      │                       │
│  └────────────┬───────────┘                       │
│               ▼                                   │
│  ┌────────────────────────┐                       │
│  │ 6 Phase Queues (libuv) │ ← Timers → Pending →  │
│  │ Chạy tuần tự, lặp lại  │  Idle → Poll → Check  │
│  │                        │  → Close               │
│  └────────────────────────┘                       │
│  KHÔNG CÓ Render step (không có UI)               │
│  KHÔNG CÓ requestAnimationFrame                   │
└──────────────────────────────────────────────────┘
```

**Bảng so sánh chi tiết:**

| Tiêu chí | Browser | Node.js |
|----------|---------|----------|
| **Mục tiêu** | UI mượt mà (60fps) | I/O throughput cao |
| **Thư viện** | Browser engine built-in | **libuv** (C library) |
| **Cấu trúc queue** | 1 Macrotask Queue + 1 Microtask Queue | **6 Phase Queues** + nextTick + Microtask |
| **Render step** | ✅ Có (Style → Layout → Paint) | ❌ Không có (không có UI) |
| **requestAnimationFrame** | ✅ Có (~60fps) | ❌ Không có |
| **process.nextTick()** | ❌ Không có | ✅ Ưu tiên cao nhất trước cả Promise |
| **setImmediate()** | ❌ Không có (deprecated) | ✅ Chạy ở Check phase |
| **MutationObserver** | ✅ Microtask | ❌ Không có (không có DOM) |
| **setTimeout minimum** | 4ms (sau 5 lần nested) | 1ms |
| **Microtask timing** | Sau MỖI macrotask + trước render | Sau MỖI callback (v11+), giữa các phases |
| **Blocking** | Freeze UI, jank | Server không phản hồi requests |
| **Thread Pool** | Web Workers (manual) | libuv Thread Pool (4 threads, tự động) |

> 💡 **Điểm giống nhau quan trọng:** Cả hai đều là **single-threaded** cho JS execution, đều quét **microtask trước macrotask**, và từ Node.js v11+ thì timing microtask đã **gần giống nhau** (sau mỗi callback).

> ⚠️ Một điểm hay bị nhầm: Browser có **minimum delay 4ms** cho `setTimeout` khi nested >= 5 levels (HTML Spec §8.6). Node.js chỉ có **minimum 1ms** (libuv tự động chuyển `0` → `1`). Đây là lý do performance characteristics khác nhau.

> **Interview one-liner:** _"Browser Event Loop optimizes for UI rendering — có render step và rAF. Node.js Event Loop optimizes for I/O — có 6 phases riêng biệt do libuv quản lý, không có render step, và có thêm process.nextTick() với ưu tiên cao nhất."_

---

## 3. Modules System

### 3.1 CommonJS (CJS) — Hệ thống module mặc định

```javascript
// math.js - Export
module.exports = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
};

// Hoặc
exports.multiply = (a, b) => a * b;

// app.js - Import
const math = require('./math');
const { add } = require('./math');
```

### 3.2 ES Modules (ESM) — Tiêu chuẩn mới

```javascript
// math.mjs (hoặc "type": "module" trong package.json)
export const add = (a, b) => a + b;
export default class Calculator { /* ... */ }

// app.mjs
import Calculator, { add } from './math.mjs';
```

### 3.3 So sánh CJS vs ESM

| Tính năng         | CommonJS (CJS)         | ES Modules (ESM)        |
| ----------------- | ---------------------- | ----------------------- |
| Syntax            | `require()` / `module.exports` | `import` / `export`     |
| Loading           | **Synchronous**        | **Asynchronous**        |
| Top-level await   | ❌ Không               | ✅ Có                   |
| Tree-shaking      | ❌ Khó                 | ✅ Dễ                   |
| Mặc định Node.js  | ✅ Có (legacy)         | ✅ Có (từ v12+)         |
| Dynamic import    | `require(path)`        | `import(path)`          |

### 3.4 Module Resolution Algorithm

```
require('module-name')

1. Core module? (fs, path, http...) → Trả về
2. Bắt đầu bằng './' hoặc '../'? → Resolve đường dẫn tương đối
3. Tìm trong node_modules/:
   a. ./node_modules/module-name
   b. ../node_modules/module-name
   c. Lên đến root directory
4. Kiểm tra package.json > "main" field
5. Tìm index.js
```

### 3.5 Module Caching

```javascript
// Module chỉ được load MỘT LẦN, sau đó được cache
const a = require('./counter');  // Load và cache
const b = require('./counter');  // Trả về cached version
a === b // true (cùng reference)

// Xóa cache (ít dùng, cẩn thận)
delete require.cache[require.resolve('./counter')];
```

---

## 4. Asynchronous Programming

### 4.1 Callback Pattern (cách cũ)

```javascript
const fs = require('fs');

// Callback hell (pyramid of doom) — TRÁNH VIẾT THẾ NÀY
fs.readFile('file1.txt', (err, data1) => {
  if (err) return console.error(err);
  fs.readFile('file2.txt', (err, data2) => {
    if (err) return console.error(err);
    fs.writeFile('output.txt', data1 + data2, (err) => {
      if (err) return console.error(err);
      console.log('Done!');
    });
  });
});
```

### 4.2 Promises

```javascript
const fs = require('fs').promises;

// Chaining
fs.readFile('file1.txt', 'utf-8')
  .then(data1 => fs.readFile('file2.txt', 'utf-8'))
  .then(data2 => fs.writeFile('output.txt', data2))
  .then(() => console.log('Done!'))
  .catch(err => console.error(err));

// Promise utilities
Promise.all([p1, p2, p3]);        // Tất cả phải resolve
Promise.allSettled([p1, p2, p3]); // Chờ tất cả, kể cả reject
Promise.race([p1, p2, p3]);      // Trả về kết quả đầu tiên
Promise.any([p1, p2, p3]);       // Trả về resolve đầu tiên
```

### 4.3 Async/Await (khuyến khích)

```javascript
async function processFiles() {
  try {
    const data1 = await fs.readFile('file1.txt', 'utf-8');
    const data2 = await fs.readFile('file2.txt', 'utf-8');
    await fs.writeFile('output.txt', data1 + data2);
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  }
}

// Parallel execution với async/await
async function parallel() {
  const [result1, result2] = await Promise.all([
    fetchFromDB(),
    fetchFromAPI(),
  ]);
}
```

### 4.4 EventEmitter

```javascript
const EventEmitter = require('events');

class OrderService extends EventEmitter {
  placeOrder(order) {
    // Business logic...
    this.emit('orderPlaced', order);
  }
}

const orderService = new OrderService();

// Đăng ký listener
orderService.on('orderPlaced', (order) => {
  console.log('Send email for order:', order.id);
});

orderService.on('orderPlaced', (order) => {
  console.log('Update inventory for order:', order.id);
});

// once — chỉ listen 1 lần
orderService.once('orderPlaced', (order) => {
  console.log('First order celebration!');
});

// Xóa listener
orderService.removeListener('orderPlaced', handler);
orderService.removeAllListeners('orderPlaced');
```

---

## 5. Streams & Buffers

### 5.1 Buffer
Buffer là cách Node.js xử lý **dữ liệu binary** (raw memory).

```javascript
// Tạo Buffer
const buf1 = Buffer.alloc(10);              // 10 bytes, filled with 0
const buf2 = Buffer.from('Hello');           // Từ string
const buf3 = Buffer.from([72, 101, 108]);    // Từ array

// Thao tác
buf2.toString();          // 'Hello'
buf2.toString('base64');  // 'SGVsbG8='
buf2.length;              // 5 (bytes, không phải chars)
Buffer.concat([buf1, buf2]);
```

### 5.2 Streams — 4 loại

| Loại          | Mô tả                    | Ví dụ                           |
| ------------- | ------------------------- | -------------------------------- |
| **Readable**  | Nguồn dữ liệu             | `fs.createReadStream`, `http.IncomingMessage` |
| **Writable**  | Đích ghi dữ liệu           | `fs.createWriteStream`, `http.ServerResponse` |
| **Duplex**    | Vừa đọc vừa ghi           | `net.Socket`, TCP socket          |
| **Transform** | Biến đổi dữ liệu khi đi qua | `zlib.createGzip()`, crypto      |

### 5.3 Tại sao dùng Streams?

```javascript
// ❌ Đọc file lớn (1GB) vào memory — CÓ THỂ CRASH
const data = fs.readFileSync('big-file.txt');
res.end(data);

// ✅ Dùng Stream — Xử lý từng chunk nhỏ
const readStream = fs.createReadStream('big-file.txt');
readStream.pipe(res);  // Gửi trực tiếp tới response

// Pipeline (cách tốt hơn, xử lý error tự động)
const { pipeline } = require('stream/promises');

await pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('output.txt.gz')
);
```

### 5.4 Backpressure
Khi **Writable stream không kịp xử lý** dữ liệu từ Readable stream → dữ liệu bị buffer trong memory → **memory leak**.

```javascript
// pipe() tự động xử lý backpressure
readable.pipe(writable);

// Nếu tự viết, phải xử lý manual:
readable.on('data', (chunk) => {
  const canContinue = writable.write(chunk);
  if (!canContinue) {
    readable.pause();  // Tạm dừng đọc
  }
});

writable.on('drain', () => {
  readable.resume();   // Tiếp tục đọc
});
```

---

## 6. Error Handling

### 6.1 Các loại Error trong Node.js

```javascript
// 1. Standard JavaScript Errors
throw new Error('Something went wrong');
throw new TypeError('Invalid type');
throw new RangeError('Out of range');

// 2. System Errors (từ OS)
// ENOENT - file not found
// EACCES - permission denied
// ECONNREFUSED - connection refused
// ETIMEDOUT - operation timed out

// 3. Custom Application Errors
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### 6.2 Xử lý Error — Best Practices

```javascript
// ✅ Async/Await + try/catch
async function getUser(id) {
  try {
    const user = await db.findUser(id);
    if (!user) throw new AppError('User not found', 404);
    return user;
  } catch (error) {
    if (error.isOperational) throw error;
    // Log unexpected error
    logger.error('Unexpected error in getUser:', error);
    throw new AppError('Internal server error', 500);
  }
}

// ✅ Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);  // Exit vì state không còn đáng tin
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // Nên exit hoặc log để xử lý
});
```

### 6.3 Operational vs Programmer Errors

| Loại                   | Ví dụ                                    | Xử lý                     |
| ---------------------- | ---------------------------------------- | -------------------------- |
| **Operational**        | Invalid input, DB down, timeout          | Handle gracefully, retry   |
| **Programmer**         | `TypeError`, `null` reference, wrong API | Fix code, crash & restart  |

---

## 7. File System (fs)

### 7.1 Các phương thức chính

```javascript
const fs = require('fs');
const fsp = require('fs/promises'); // Promise-based

// Đọc file
const data = await fsp.readFile('path/to/file', 'utf-8');

// Ghi file
await fsp.writeFile('path/to/file', 'content');
await fsp.appendFile('path/to/file', '\nnew line');

// Kiểm tra tồn tại
await fsp.access('path/to/file'); // Throws nếu không tồn tại

// Thư mục
await fsp.mkdir('new-dir', { recursive: true });
const files = await fsp.readdir('dir');
const entries = await fsp.readdir('dir', { withFileTypes: true });

// Watch for changes
const watcher = fs.watch('file.txt', (eventType, filename) => {
  console.log(`${filename} has been ${eventType}`);
});
```

### 7.2 Best Practices
- **Luôn dùng async** (`fs/promises`) trừ khi ở startup/config loading.
- **Dùng `path.join()`** thay vì nối string: `path.join(__dirname, 'data', 'file.txt')`.
- **Dùng Streams** cho file lớn.
- **Xử lý race conditions** khi nhiều processes cùng truy cập 1 file.

---

## 8. HTTP & Networking

### 8.1 Tạo HTTP Server cơ bản

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // req = Readable Stream (IncomingMessage)
  // res = Writable Stream (ServerResponse)

  if (req.method === 'GET' && req.url === '/api/users') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ users: [] }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(3000, () => console.log('Server on port 3000'));
```

### 8.2 HTTP/2

```javascript
const http2 = require('http2');
const fs = require('fs');

const server = http2.createSecureServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert'),
});

server.on('stream', (stream, headers) => {
  stream.respond({ ':status': 200 });
  stream.end('Hello HTTP/2!');
});
```

### 8.3 Câu hỏi phỏng vấn

> **Q: Giải thích sự khác biệt giữa `req` và `res` trong Node.js HTTP?**
>
> **A:** `req` (IncomingMessage) là **Readable Stream** chứa thông tin request từ client (URL, headers, body...). `res` (ServerResponse) là **Writable Stream** dùng để gửi response về client (status code, headers, body).

---

## 9. Express.js

### 9.1 Core Concepts

```javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json());                    // Parse JSON body
app.use(express.urlencoded({ extended: true }));

// Custom middleware
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();  // GỌI next() ĐỂ TIẾP TỤC, nếu không request sẽ bị treo
};
app.use(logger);

// Routes
app.get('/api/users', async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    next(err); // Chuyển error cho error middleware
  }
});

// Error middleware (4 params)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

app.listen(3000);
```

### 9.2 Middleware Execution Order

```
Request → middleware1 → middleware2 → Route Handler → Response
                                         ↓ (nếu error)
                                   Error Middleware
```

### 9.3 Router Pattern

```javascript
// routes/user.routes.js
const router = express.Router();

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;

// app.js
app.use('/api/users', require('./routes/user.routes'));
```

---

## 10. NestJS

### 10.1 Tại sao NestJS?
- **Kiến trúc rõ ràng**: Module-based, dễ scale.
- **TypeScript-first**: Type safety mạnh mẽ.
- **Dependency Injection**: Giống Angular/Spring.
- **Decorator-based**: `@Controller`, `@Injectable`, `@Module`.

### 10.2 Core Concepts

```typescript
// Module — Đơn vị tổ chức
@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

// Controller — Xử lý request
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
}

// Service — Business logic
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

### 10.3 Các khái niệm quan trọng

| Concept            | Mô tả                                                    |
| -------------------- | -------------------------------------------------------- |
| **Pipes**            | Validate & transform input data (`ValidationPipe`)       |
| **Guards**           | Kiểm tra permissions/auth (`AuthGuard`)                  |
| **Interceptors**     | Transform output, logging, caching                       |
| **Filters**          | Global exception handling (`ExceptionFilter`)            |
| **Middleware**       | Giống Express middleware                                  |

### 10.4 Request Lifecycle trong NestJS

```
Request → Middleware → Guards → Interceptors (before)
        → Pipes → Route Handler → Interceptors (after)
        → Exception Filters (nếu có error) → Response
```

---

## 11. Database & ORM

### 11.1 Prisma (Phổ biến với TypeScript)

```typescript
// schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

// Sử dụng
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: { posts: true },
});

// Transaction
await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.profile.create({ data: profileData }),
]);
```

### 11.2 Câu hỏi phỏng vấn

> **Q: N+1 Problem là gì và cách giải quyết?**
>
> **A:** Khi query danh sách parent rồi loop qua từng parent để query children → tạo N+1 queries.
> - **Giải pháp**: Eager loading (`include`/`join`), DataLoader pattern (batching), hoặc raw SQL với JOINs.

> **Q: Connection Pooling là gì?**
>
> **A:** Thay vì tạo connection mới cho mỗi query, dùng một "pool" các connections có sẵn. Khi query xong, connection được trả về pool thay vì bị đóng. Giảm overhead tạo connection, giới hạn số connections tới DB.

---

## 12. Authentication & Authorization

### 12.1 JWT (JSON Web Token)

```javascript
const jwt = require('jsonwebtoken');

// Tạo token
const token = jwt.sign(
  { userId: user.id, role: user.role },  // Payload
  process.env.JWT_SECRET,                 // Secret
  { expiresIn: '15m' }                   // Options
);

// Verify token
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch (err) {
  // TokenExpiredError, JsonWebTokenError, NotBeforeError
}
```

### 12.2 Cấu trúc JWT

```
Header.Payload.Signature

Header:  { "alg": "HS256", "typ": "JWT" }         → Base64
Payload: { "userId": "123", "role": "admin" }      → Base64
Signature: HMAC-SHA256(header + "." + payload, secret)
```

### 12.3 Access Token vs Refresh Token

| Loại                | Thời hạn   | Lưu trữ                     | Mục đích                  |
| ------------------- | ---------- | ---------------------------- | ------------------------- |
| **Access Token**    | 15 phút    | Memory / httpOnly Cookie     | Xác thực request          |
| **Refresh Token**   | 7-30 ngày  | httpOnly Cookie / DB         | Cấp lại Access Token mới  |

### 12.4 OAuth 2.0 Flow

```
User → App: "Login with Google"
App  → Google: Redirect to Google Authorization Server
User → Google: Approve permissions
Google → App: Authorization Code
App  → Google: Exchange code for Access Token
Google → App: Access Token + Refresh Token
App  → Google API: Fetch user info with Access Token
```

### 12.5 Bcrypt — Hash mật khẩu

```javascript
const bcrypt = require('bcrypt');

// Hash
const saltRounds = 12;
const hashedPassword = await bcrypt.hash('myPassword', saltRounds);

// Compare
const isMatch = await bcrypt.compare('myPassword', hashedPassword);

// ⚠️ KHÔNG BAO GIỜ lưu password dạng plain text!
```

---

## 13. Security Best Practices

### 13.1 Checklist bảo mật

| Mối đe dọa                   | Giải pháp                                                   |
| ----------------------------- | ----------------------------------------------------------- |
| **SQL Injection**             | Parameterized queries, ORM (Prisma, TypeORM)                |
| **XSS (Cross-Site Scripting)**| Sanitize input, Content-Security-Policy header              |
| **CSRF**                      | CSRF tokens, SameSite cookies                               |
| **Rate Limiting**             | `express-rate-limit`, API gateway                           |
| **Brute Force**               | Account lockout, CAPTCHA, rate limiting                     |
| **Sensitive Data Exposure**   | HTTPS, encrypt at rest, không log sensitive data            |
| **Dependency Vulnerabilities**| `npm audit`, Snyk, Dependabot                               |

### 13.2 Helmet.js — Security Headers

```javascript
const helmet = require('helmet');
app.use(helmet()); // Set nhiều security headers cùng lúc

// Bao gồm:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// Strict-Transport-Security
// Content-Security-Policy
// ...
```

### 13.3 CORS

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://myapp.com'],  // Chỉ cho phép domain cụ thể
  methods: ['GET', 'POST'],
  credentials: true,               // Cho phép cookies
}));
```

### 13.4 Environment Variables

```javascript
// ❌ Hardcode secrets
const secret = 'my-super-secret-key';

// ✅ Dùng environment variables
const secret = process.env.JWT_SECRET;

// Validate env vars khi startup (dùng Zod, Joi, envalid...)
```

---

## 14. Testing

### 14.1 Các loại test

| Loại                | Scope                     | Công cụ                        |
| ------------------- | ------------------------- | ------------------------------ |
| **Unit Test**       | Một function/class        | Jest, Vitest                   |
| **Integration Test**| Nhiều modules cùng nhau   | Jest + Supertest               |
| **E2E Test**        | Toàn bộ application       | Jest, Playwright, Cypress      |

### 14.2 Jest Example

```javascript
// user.service.test.js
describe('UserService', () => {
  let userService;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    userService = new UserService(mockRepository);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', name: 'John' };
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ id: '1' });
    });

    it('should throw when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(userService.findById('999'))
        .rejects.toThrow('User not found');
    });
  });
});
```

### 14.3 Supertest — Integration Test

```javascript
const request = require('supertest');
const app = require('./app');

describe('GET /api/users', () => {
  it('should return 200 and list of users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('users');
    expect(Array.isArray(res.body.users)).toBe(true);
  });
});
```

---

## 15. Performance & Scaling

### 15.1 Cluster Module

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary process ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();  // Tạo worker process
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Worker processes chạy HTTP server
  const app = require('./app');
  app.listen(3000);
  console.log(`Worker ${process.pid} started`);
}
```

### 15.2 PM2 — Process Manager

```bash
# Start với cluster mode
pm2 start app.js -i max    # max = số CPU cores

# Monitoring
pm2 monit
pm2 status
pm2 logs

# Zero-downtime reload
pm2 reload app
```

### 15.3 Caching Strategies

```javascript
// In-memory cache (node-cache)
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 phút

async function getUser(id) {
  const cached = cache.get(`user:${id}`);
  if (cached) return cached;

  const user = await db.findUser(id);
  cache.set(`user:${id}`, user);
  return user;
}

// Redis cache (production-ready)
const Redis = require('ioredis');
const redis = new Redis();

await redis.set('key', JSON.stringify(data), 'EX', 300); // TTL 5 min
const cached = JSON.parse(await redis.get('key'));
```

### 15.4 Scaling Strategies

```
┌─────────────────────────────────────────────┐
│              Vertical Scaling               │
│    (Thêm CPU, RAM cho 1 server)             │
│    → Đơn giản nhưng có giới hạn             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│             Horizontal Scaling              │
│    (Thêm nhiều servers)                     │
│                                             │
│   ┌──────────────┐                          │
│   │ Load Balancer │ ← Nginx, HAProxy       │
│   └──┬─────┬──┬──┘                          │
│      │     │  │                              │
│  ┌───▼┐ ┌─▼─┐ ┌▼──┐                         │
│  │ S1 │ │ S2│ │ S3│  ← Nhiều Node servers   │
│  └────┘ └───┘ └───┘                         │
│                                             │
│  → Cần stateless design                     │
│  → Session lưu ở Redis/DB                   │
└─────────────────────────────────────────────┘
```

---

## 16. Design Patterns trong Node.js

### 16.1 Singleton Pattern

```javascript
class Database {
  static #instance;

  static getInstance() {
    if (!Database.#instance) {
      Database.#instance = new Database();
    }
    return Database.#instance;
  }
}
```

### 16.2 Factory Pattern

```javascript
class NotificationFactory {
  static create(type) {
    switch (type) {
      case 'email': return new EmailNotification();
      case 'sms':   return new SMSNotification();
      case 'push':  return new PushNotification();
      default: throw new Error(`Unknown type: ${type}`);
    }
  }
}
```

### 16.3 Observer Pattern (EventEmitter)

```javascript
// Node.js có sẵn Observer pattern qua EventEmitter
const emitter = new EventEmitter();
emitter.on('event', handler);    // Subscribe
emitter.emit('event', data);     // Publish
```

### 16.4 Middleware/Chain of Responsibility

```javascript
// Express middleware chính là implementation của pattern này
app.use(authenticate);  // Step 1
app.use(authorize);     // Step 2
app.use(validate);      // Step 3
app.use(handleRequest); // Step 4
```

### 16.5 Repository Pattern

```javascript
// Tách biệt data access logic khỏi business logic
class UserRepository {
  async findById(id) { return prisma.user.findUnique({ where: { id } }); }
  async create(data) { return prisma.user.create({ data }); }
  async update(id, data) { return prisma.user.update({ where: { id }, data }); }
  async delete(id) { return prisma.user.delete({ where: { id } }); }
}

class UserService {
  constructor(private repo: UserRepository) {}
  // Business logic dùng repository, không biết về DB cụ thể
}
```

### 16.6 Adapter Pattern

```javascript
// Wrap các third-party services để dễ thay đổi
class MailAdapter {
  async send(options) { throw new Error('Not implemented'); }
}

class ResendAdapter extends MailAdapter {
  async send(options) { /* Dùng Resend API */ }
}

class SMTPAdapter extends MailAdapter {
  async send(options) { /* Dùng nodemailer */ }
}
```

---

## 17. Memory Management & Garbage Collection

### 17.1 V8 Memory Structure

```
┌───────────────────────────────────────┐
│               V8 Heap                 │
│  ┌─────────────┐  ┌────────────────┐  │
│  │  New Space   │  │   Old Space    │  │
│  │ (Young Gen)  │  │  (Old Gen)     │  │
│  │ - Short-lived│  │ - Long-lived   │  │
│  │ - Scavenger  │  │ - Mark-Sweep   │  │
│  │   GC (fast)  │  │ - Mark-Compact │  │
│  └─────────────┘  │   GC (slower)  │  │
│                    └────────────────┘  │
└───────────────────────────────────────┘
```

### 17.2 Common Memory Leaks

```javascript
// 1. Global variables
global.leakyData = [];  // Không bao giờ được GC

// 2. Closures giữ reference
function createLeak() {
  const hugeData = new Array(1000000);
  return function() {
    console.log(hugeData.length); // hugeData không bao giờ được free
  };
}

// 3. Event listeners không remove
emitter.on('data', handler); // Nếu không removeListener → leak

// 4. Timers không clear
const interval = setInterval(() => { /* ... */ }, 1000);
// clearInterval(interval); ← Quên clear
```

### 17.3 Debug Memory

```bash
# Chạy với inspect flag
node --inspect app.js      # Inspect qua Chrome DevTools
node --max-old-space-size=4096 app.js  # Tăng heap size

# Trong code
console.log(process.memoryUsage());
// { rss, heapTotal, heapUsed, external, arrayBuffers }
```

---

## 18. Worker Threads & Child Processes

### 18.1 Khi nào dùng?

| Tình huống                     | Giải pháp               |
| ------------------------------ | ----------------------- |
| CPU-intensive (cùng process)   | **Worker Threads**      |
| Chạy script/command khác       | **Child Process**       |
| I/O-bound task                 | **Async/Await** (đủ rồi)|

### 18.2 Worker Threads

```javascript
// main.js
const { Worker } = require('worker_threads');

const worker = new Worker('./heavy-task.js', {
  workerData: { input: 'some data' },
});

worker.on('message', (result) => console.log('Result:', result));
worker.on('error', (err) => console.error('Worker error:', err));
worker.on('exit', (code) => console.log('Worker exited:', code));

// heavy-task.js
const { parentPort, workerData } = require('worker_threads');
// Do heavy computation...
parentPort.postMessage({ result: 'computed value' });
```

### 18.3 Child Processes

```javascript
const { exec, spawn, fork } = require('child_process');

// exec — chạy command, buffer output
exec('ls -la', (error, stdout, stderr) => {
  console.log(stdout);
});

// spawn — streaming output (tốt cho output lớn)
const child = spawn('ffmpeg', ['-i', 'input.mp4', 'output.avi']);
child.stdout.on('data', (data) => console.log(data.toString()));

// fork — tạo Node.js process mới (có IPC channel)
const child = fork('./worker.js');
child.send({ msg: 'hello' });
child.on('message', (msg) => console.log(msg));
```

---

## 19. Package Management

### 19.1 So sánh npm, yarn, pnpm

| Tính năng          | npm             | yarn           | pnpm            |
| ------------------ | --------------- | -------------- | --------------- |
| Lock file          | `package-lock`  | `yarn.lock`    | `pnpm-lock`    |
| Tốc độ             | Trung bình      | Nhanh          | **Nhanh nhất**  |
| Disk space         | Nhiều           | Nhiều          | **Ít nhất**     |
| Monorepo           | Workspaces      | Workspaces     | Workspaces      |
| Phantom deps       | Có thể xảy ra   | Có thể xảy ra  | **Không**       |

### 19.2 Semantic Versioning (SemVer)

```
MAJOR.MINOR.PATCH
  ^3.2.1  → >=3.2.1 <4.0.0  (minor + patch updates)
  ~3.2.1  → >=3.2.1 <3.3.0  (patch updates only)
  3.2.1   → Exactly 3.2.1
```

### 19.3 `package.json` quan trọng

```json
{
  "scripts": {
    "start": "node dist/main.js",
    "dev": "ts-node-dev --respawn src/main.ts",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint . --fix"
  },
  "dependencies": {},       // Production dependencies
  "devDependencies": {},    // Development only
  "peerDependencies": {},   // Required by host package
  "engines": {              // Yêu cầu version cụ thể
    "node": ">=18.0.0"
  }
}
```

---

## 20. DevOps & Deployment

### 20.1 Docker

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
```

### 20.2 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### 20.3 Health Check & Monitoring

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    // Close DB connections, flush logs...
    process.exit(0);
  });
  // Force exit after timeout
  setTimeout(() => process.exit(1), 10000);
});
```

---

## 21. Câu hỏi thường gặp trong phỏng vấn

### Câu hỏi cơ bản

1. **Node.js là gì? Tại sao dùng nó?**
2. **Event Loop hoạt động như thế nào?** ← *Quan trọng nhất!*
3. **Blocking vs Non-blocking I/O?**
4. **CommonJS vs ES Modules?**
5. **`process.nextTick()` vs `setImmediate()`?**
6. **Callback, Promise, Async/Await — ưu nhược điểm?**
7. **Buffer và Stream dùng khi nào?**
8. **Middleware trong Express là gì? Thứ tự thực thi?**

### Câu hỏi trung cấp

9. **Cluster module hoạt động thế nào?**
10. **Giải thích JWT và luồng authentication?**
11. **N+1 Problem và cách giải quyết?**
12. **Connection Pooling là gì?**
13. **Memory leak trong Node.js xảy ra như thế nào?**
14. **Graceful shutdown là gì và tại sao quan trọng?**
15. **Rate limiting implementation?**
16. **CORS là gì và cách cấu hình?**

### Câu hỏi nâng cao

17. **Thiết kế hệ thống real-time notification (WebSocket/SSE)?**
18. **Microservices vs Monolith — khi nào dùng gì?**
19. **Event-driven architecture trong Node.js?**
20. **Cách xử lý file upload lớn (streaming)?**
21. **Database migration strategy?**
22. **Blue-green deployment / Rolling deployment?**
23. **Distributed caching với Redis?**
24. **Message Queue (RabbitMQ, Bull/BullMQ) dùng khi nào?**

### Tips phỏng vấn

> 💡 **Luôn giải thích WHY, không chỉ WHAT**: Đừng chỉ nói "Node.js dùng Event Loop", hãy giải thích *tại sao* kiến trúc đó phù hợp và *khi nào* nó không phù hợp.
>
> 💡 **Đưa ví dụ thực tế**: Khi nói về Streams, đề cập đến use case xử lý file CSV 10GB. Khi nói Worker Threads, đề cập video processing.
>
> 💡 **Nắm vững trade-offs**: Mọi quyết định kỹ thuật đều có trade-off. Thể hiện bạn hiểu cả ưu và nhược điểm.
>
> 💡 **Biết giới hạn của Node.js**: CPU-intensive tasks, single-threaded limitations, callback hell history...

---

## 📚 Tài liệu tham khảo

- [Node.js Official Docs](https://nodejs.org/en/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Event Loop Visualization](https://www.jsv9000.app/)
- [V8 Blog](https://v8.dev/blog)

---

> 📅 Tạo ngày: 2026-02-09
> 🎯 Mục tiêu: Tổng hợp kiến thức Node.js cho phỏng vấn
