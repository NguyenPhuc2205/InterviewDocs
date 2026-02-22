# 🔬 Event Loop Deep Dive — Toàn Tập Từ A-Z

> Tài liệu này **đi cặn kẽ từng chi tiết** về Event Loop, dựa trên **nguồn chính thức**:
> - [Node.js Official Docs](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
> - [HTML Living Standard (WHATWG)](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
> - [libuv Documentation](https://docs.libuv.org/en/v1.x/design.html)
> - [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)

---

## MỤC LỤC

1. [Câu hỏi gốc: 1 hay 2 Event Loop?](#1-câu-hỏi-gốc-1-hay-2-event-loop)
2. [Nền tảng: JavaScript Runtime là gì?](#2-nền-tảng-javascript-runtime-là-gì)
   - 2.1 V8 Engine — Chỉ biết đúng 2 việc
   - 2.2 Vấn đề Blocking — Tại sao cần bất đồng bộ?
   - 2.3 Runtime = V8 + Async Engine + Event Loop
3. [Call Stack — Hiểu cho đúng](#3-call-stack)
4. [Browser Event Loop — Từng bước chi tiết](#4-browser-event-loop)
5. [Node.js Event Loop — Từng phase chi tiết](#5-nodejs-event-loop)
   - 5.1 libuv — Thread Pool vs OS Async
   - 5.2 Tại sao cần 6 phases?
   - 5.3-5.6 Chi tiết từng Phase
6. [Microtasks — Thứ tự ưu tiên & chi tiết](#6-microtasks)
7. [So sánh song song Browser vs Node.js](#7-so-sánh-song-song)
8. [Đính chính các hiểu lầm phổ biến](#8-đính-chính-hiểu-lầm)
9. [10 bài tập đoán output](#9-bài-tập)
10. [Cách trả lời phỏng vấn](#10-cách-trả-lời-phỏng-vấn)
11. [Tóm tắt siêu ngắn — Ghi nhớ nhanh](#11-tóm-tắt-siêu-ngắn)

---

# 1. Câu hỏi gốc: 1 hay 2 Event Loop?

**Trả lời chính xác:**

> Event Loop **không phải là tính năng của JavaScript**. JavaScript là ngôn ngữ — nó không có Event Loop.
> Event Loop là tính năng của **Runtime Environment** (môi trường chạy).
>
> - **Chrome** cung cấp Event Loop cho JS ở **browser** (theo chuẩn HTML5/WHATWG)
> - **Node.js** cung cấp Event Loop cho JS ở **server** (thông qua thư viện **libuv**)
>
> → Cùng khái niệm, **khác cách triển khai**. Giống như "xe hơi" — Toyota và Honda đều là xe hơi, nhưng engine bên trong khác nhau.

---

# 2. Nền tảng: JavaScript Runtime là gì?

## 2.1 V8 Engine — Chỉ biết đúng 2 việc

JavaScript Engine (V8) **chỉ biết** 2 việc:
1. **Parse code → compile → chạy** (trên Call Stack)
2. **Quản lý memory** (Heap + Stack)

```
┌──────────────────────────────────────────────────────────────┐
│                     JAVASCRIPT ENGINE (V8)                    │
│                                                               │
│  ┌──────────────────┐    ┌──────────────────────────────┐     │
│  │    CALL STACK     │    │       MEMORY HEAP             │     │
│  │                   │    │                               │     │
│  │  Nơi chạy code   │    │  Nơi cấp phát bộ nhớ         │     │
│  │  từng dòng một    │    │  cho objects, functions       │     │
│  └──────────────────┘    └──────────────────────────────┘     │
│                                                               │
│  ⚠️ V8 KHÔNG CÓ: setTimeout, fetch, fs, http, DOM            │
│  ⚠️ V8 KHÔNG CÓ: Event Loop                                  │
└──────────────────────────────────────────────────────────────┘
```

V8 **không biết** `setTimeout` là gì, không biết đọc file, không biết gọi HTTP. Và V8 **không có Event Loop**.

## 2.2 Vấn đề Blocking — Tại sao cần bất đồng bộ?

JavaScript là **đơn luồng** — tại một thời điểm chỉ làm được **một việc duy nhất**. Vấn đề xảy ra khi có tác vụ chậm:

```javascript
// Giả sử đọc file mất 3 giây
const data = readFileSync('file_1gb.txt'); // 3 giây ĐỨNG IM ở đây
console.log(data);
console.log('Tôi muốn in ra ngay'); // Phải chờ 3 giây mới được chạy
```

Khi JavaScript chờ đọc xong file mới làm tiếp — **3 giây đó không làm gì được hết**:
- **Browser**: Không nhận click, không scroll, UI đóng băng → đây gọi là **blocking**
- **Server (Node.js)**: Không nhận request mới, toàn bộ server chết cứng cho 1 request

**Giải pháp: Bất đồng bộ (Asynchronous)**

Thay vì chờ, **giao việc chậm cho ai đó khác**, tiếp tục làm việc tiếp. Khi việc chậm xong → được **báo lại qua callback**.

```javascript
// Giao cho Runtime đọc file, truyền callback để "gọi lại khi xong"
readFile('file_1gb.txt', (data) => {
  console.log(data); // Chỉ chạy khi đọc XONG
});
console.log('Tôi in ra ngay!'); // Chạy NGAY, không chờ
```

3 khái niệm bản chất:

| Khái niệm | Định nghĩa chính xác |
|---|---|
| **Đồng bộ (Sync)** | Code chạy tuần tự, dòng trước **phải xong** mới chạy dòng sau. Call Stack bị chiếm liên tục |
| **Bất đồng bộ (Async)** | Giao tác vụ chậm cho **Runtime** xử lý, JS tiếp tục chạy ngay. Khi xong, Runtime đẩy callback vào **hàng đợi** |
| **Callback** | Hàm được truyền vào tác vụ async, sẽ được **gọi lại** khi tác vụ hoàn tất |

Nhưng ai thực hiện cơ chế "giao việc → báo lại" này? **Không phải V8. Là Runtime.**

## 2.3 Runtime = V8 + Async Engine + Event Loop

**Runtime** là môi trường bao bọc V8, cung cấp thêm **3 thứ** mà V8 không có:
1. **Async APIs** (setTimeout, fs, HTTP, DOM...) — để giao việc chậm
2. **Callback Queues** (hàng đợi) — nơi chứa callback khi việc xong
3. **Event Loop** — cầu nối giữa V8 và hàng đợi

```
┌──────────────────────────────────────────────────────────────┐
│                   RUNTIME ENVIRONMENT                         │
│                                                               │
│  ┌──── V8 Engine ────┐    ┌──── Async Engine ─────────────┐  │
│  │    Call Stack      │    │                                │  │
│  │    Memory Heap     │    │  BROWSER: Web APIs             │  │
│  │                    │    │  (setTimeout, fetch, DOM...)    │  │
│  │                    │    │         HOẶC                    │  │
│  │                    │    │  NODE.JS: libuv + C++ bindings  │  │
│  │                    │    │  (fs, http, crypto, timers...)  │  │
│  └────────────────────┘    └───────────────┬────────────────┘  │
│                                            │                   │
│  ┌─────── Callback Queues ────────────────▼────────────────┐  │
│  │  Microtask Queue  │  Macrotask Queue / Phase Queues      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                            │                   │
│  ┌─────── EVENT LOOP ─────────────────────▼────────────────┐  │
│  │  Liên tục kiểm tra: Call Stack rỗng chưa?                │  │
│  │  Nếu rỗng → lấy callback từ queue → đẩy vào Call Stack   │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

Có **2 Runtime** phổ biến dùng V8:

| | Browser (Chrome, Firefox...) | Node.js |
|---|---|---|
| **Mục đích sống** | Chạy JS cho giao diện web | Chạy JS trên server, xử lý I/O |
| **Ưu tiên #1** | Màn hình không lag, click không đơ | Xử lý hàng nghìn kết nối cùng lúc |
| **Async Engine** | Web APIs (C++ trong browser engine) | libuv (thư viện C) |
| **Event Loop theo** | HTML Living Standard (WHATWG) | libuv implementation |

Cùng dùng V8, nhưng **phần bao bọc bên ngoài hoàn toàn khác** vì mục đích khác nhau → Event Loop được thiết kế khác nhau.

**Kết luận:** Event Loop = sản phẩm của Runtime, không phải của JavaScript engine.

---

# 3. Call Stack

## 3.1 Call Stack là gì?

**Call Stack** (ngăn xếp cuộc gọi) là cấu trúc dữ liệu **Stack** — **LIFO** (Last In, First Out: vào sau ra trước).

> ⚠️ **Đính chính**: Ai nói "Call Stack là LIFO Queue" thì **sai**. Stack ≠ Queue.
> - **Stack** = LIFO (vào sau ra trước) — như xếp đĩa
> - **Queue** = FIFO (vào trước ra trước) — như xếp hàng

## 3.2 Cách Call Stack hoạt động

```javascript
function multiply(a, b) {
  return a * b;
}

function square(n) {
  return multiply(n, n);
}

function printSquare(n) {
  const result = square(n);
  console.log(result);
}

printSquare(4);
```

```
Call Stack thay đổi theo thời gian:

[1]                [2]                [3]                [4]
                                      multiply(4,4)
                   square(4)          square(4)          square(4)
printSquare(4)     printSquare(4)     printSquare(4)     printSquare(4)
───────────────    ───────────────    ───────────────    ───────────────

  push              push               push              multiply return
  printSquare       square             multiply          → pop multiply

[5]                [6]                [7]
                   console.log(16)
square return      printSquare(4)     printSquare return
printSquare(4)     ───────────────    ───────────────
───────────────
                     push               pop
  pop square         console.log        printSquare
                                        → Stack RỖNG
```

## 3.3 Stack Overflow

```javascript
// Đệ quy vô hạn → Stack tràn
function forever() {
  forever();  // Mỗi lần gọi = thêm 1 frame vào stack
}
forever(); // ❌ RangeError: Maximum call stack size exceeded
```

## 3.4 Tại sao Call Stack quan trọng cho Event Loop?

**Quy tắc số 1: Event Loop chỉ đẩy callback vào Call Stack khi Call Stack RỖNG.**

Điều này có nghĩa: nếu Call Stack bị chiếm bởi code đồng bộ nặng → **tất cả callback bất đồng bộ đều phải chờ**, dù timer đã hết hạn từ lâu.

```javascript
setTimeout(() => console.log('timer'), 0);

// Vòng lặp nặng — Call Stack KHÔNG RỖNG trong ~5 giây
for (let i = 0; i < 5_000_000_000; i++) {}

console.log('done');

// Output: done, timer
// timer bị delay ~5 giây dù timeout = 0ms
// Vì: vòng lặp chiếm Call Stack → Event Loop không thể lấy callback ra
```

**→ Đây chính xác là lý do `setTimeout(fn, 0)` không chạy "ngay lập tức".**

> **Bài học thực tế:** Trong **Browser**, Call Stack bị chiếm = UI đóng băng (click không phản hồi, scroll không nhúc nhích). Trong **Node.js**, Call Stack bị chiếm = server không nhận được request nào, toàn bộ client timeout. Đây là lý do tại sao bạn **tuyệt đối không bao giờ chạy tác vụ CPU-intensive blocking trên main thread**.

---

# 4. Browser Event Loop — Từng bước chi tiết

## 4.1 Các thành phần

### A. Web APIs

Web APIs do **browser cung cấp** (viết bằng C++), **không phải** JavaScript:

| Web API | Chức năng | Callback vào queue nào |
|---|---|---|
| `setTimeout` / `setInterval` | Timer | **Macrotask** Queue |
| `fetch` / `XMLHttpRequest` | HTTP request | **Microtask** (Promise) hoặc **Macrotask** (XHR) |
| `addEventListener` | DOM events (click, scroll...) | **Macrotask** Queue |
| `requestAnimationFrame` | Animation loop | **rAF Queue** (trước rendering) |
| `MutationObserver` | DOM change observer | **Microtask** Queue |
| `queueMicrotask` | Tạo microtask thủ công | **Microtask** Queue |
| `Web Workers` | Multi-threading | Riêng biệt |

### B. Microtask Queue

Hàng đợi **ưu tiên cao**. Chạy **HẾT** trước khi bất kỳ macrotask nào được xử lý.

Các microtask:
- `Promise.then()` / `.catch()` / `.finally()`
- `queueMicrotask(fn)`
- `MutationObserver` callback
- `async/await` (dùng Promise nội bộ)

### C. Macrotask Queue (Task Queue)

Hàng đợi **ưu tiên thấp hơn**. Mỗi tick chỉ lấy **1 macrotask**.

Các macrotask:
- `setTimeout` / `setInterval` callback
- User interaction events (`click`, `keydown`...)
- `MessageChannel` / `postMessage`
- I/O completion events

### D. Rendering Pipeline

Xảy ra giữa microtasks và macrotask tiếp theo (nếu browser thấy cần vẽ lại):
1. `requestAnimationFrame` callbacks
2. **Style** → tính toán CSS
3. **Layout** → tính vị trí, kích thước
4. **Paint** → vẽ pixels lên màn hình
5. **Composite** → ghép layers

## 4.2 Thuật toán Event Loop trong Browser

**Theo HTML Living Standard (WHATWG):**

```
🔁 LẶP MÃI MÃI {

  ① Lấy 1 macrotask (task) cũ nhất từ Task Queue
     → Push vào Call Stack → Thực thi

  ② Khi Call Stack rỗng:
     → Xử lý HẾT Microtask Queue (drain hết)
        ↳ Nếu microtask tạo thêm microtask mới
          → Chạy luôn cái mới trước khi tiếp tục
        ↳ GỒM: Promise.then, queueMicrotask, MutationObserver

  ③ Rendering (nếu cần, ~60fps = mỗi ~16.7ms)
     → requestAnimationFrame callbacks
     → Style calculation
     → Layout
     → Paint

  ④ Quay lại ①
}
```

### Sơ đồ trực quan:

```
        ┌──────────────────────┐
   ┌───>│  ① MACROTASK (1 cái) │
   │    │  setTimeout callback │
   │    │  click event         │
   │    └──────────┬───────────┘
   │               │
   │    ┌──────────▼───────────┐
   │    │  ② MICROTASKS (TẤT CẢ)│
   │    │  Promise.then()      │
   │    │  queueMicrotask()    │
   │    │  MutationObserver    │
   │    │                      │
   │    │  ⚠️ Nếu microtask tạo│
   │    │  thêm microtask mới  │
   │    │  → chạy luôn ở đây   │
   │    └──────────┬───────────┘
   │               │
   │    ┌──────────▼───────────┐
   │    │  ③ RENDERING (nếu cần)│
   │    │  rAF callbacks       │
   │    │  Style → Layout      │
   │    │  → Paint → Composite │
   │    └──────────┬───────────┘
   │               │
   └───────────────┘
```

## 4.3 Ví dụ minh họa chi tiết

```javascript
console.log('script start');                    // [1] Sync

setTimeout(() => {
  console.log('setTimeout');                    // [5] Macrotask
}, 0);

Promise.resolve()
  .then(() => {
    console.log('promise 1');                   // [3] Microtask
  })
  .then(() => {
    console.log('promise 2');                   // [4] Microtask (tạo bởi promise 1)
  });

console.log('script end');                      // [2] Sync
```

**Phân tích từng bước:**

| Bước | Hành động | Call Stack | Microtask Queue | Macrotask Queue | Output |
|------|-----------|------------|-----------------|-----------------|--------|
| 1 | `console.log('script start')` | `log()` | — | — | `script start` |
| 2 | `setTimeout(fn, 0)` → giao cho Web API | — | — | `fn` | |
| 3 | `Promise.resolve().then(fn1)` | — | `fn1` | `fn` | |
| 4 | `console.log('script end')` | `log()` | `fn1` | `fn` | `script end` |
| 5 | **Call Stack rỗng → drain microtasks** | | | | |
| 6 | Lấy `fn1` → chạy | `fn1` | — | `fn` | `promise 1` |
| 7 | `fn1` return → `.then(fn2)` → thêm `fn2` | — | `fn2` | `fn` | |
| 8 | Lấy `fn2` → chạy | `fn2` | — | `fn` | `promise 2` |
| 9 | **Microtask rỗng → Rendering (nếu cần)** | | | | |
| 10 | **Lấy 1 macrotask** → `fn` | `fn` | — | — | `setTimeout` |

**Output cuối cùng: `script start, script end, promise 1, promise 2, setTimeout`**

## 4.4 `requestAnimationFrame` — Đặc biệt

```javascript
console.log('start');

requestAnimationFrame(() => console.log('rAF'));   // Chạy trước rendering
setTimeout(() => console.log('timeout'), 0);        // Macrotask
Promise.resolve().then(() => console.log('promise'));// Microtask

console.log('end');

// Output: start, end, promise, rAF, timeout
// (rAF chạy trước timeout vì nó thuộc rendering step, xảy ra trước macrotask tiếp)
```

---

# 5. Node.js Event Loop — Từng phase chi tiết

## 5.1 Nguồn gốc: libuv — Tại sao Node.js cần nó?

Node.js **không tự viết** Event Loop. Thay vào đó dùng **libuv** — thư viện **C** (không phải C++), **mã nguồn mở**, được tạo bởi **Bert Belder & Ben Noordhuis** ban đầu cho Node.js.

### libuv làm 3 việc chính:

**Việc 1 — Abstract hóa hệ điều hành:**

Mỗi hệ điều hành có cơ chế I/O bất đồng bộ **riêng**, không tương thích nhau:

| Hệ điều hành | API async I/O |
|---|---|
| Linux | `epoll` |
| macOS / BSD | `kqueue` |
| Windows | `IOCP` (I/O Completion Ports) |

libuv **bọc tất cả lại** thành một interface thống nhất. Node.js chỉ cần gọi libuv mà **không cần quan tâm đang chạy trên OS nào**.

**Việc 2 — Thread Pool (quan trọng):**

**Không phải tất cả tác vụ I/O đều có thể async ở cấp OS.** Với những tác vụ này, libuv dùng thread pool:

| Loại tác vụ | Ai xử lý? | Giải thích |
|---|---|---|
| **Network I/O** (TCP, HTTP, DNS over network) | **OS kernel** trực tiếp | OS cung cấp sẵn API async (epoll/kqueue/IOCP) |
| **File I/O** (fs.readFile, fs.writeFile) | **Thread Pool** (libuv) | Phần lớn OS **không có** API async đọc file thực sự |
| **DNS lookup** (dns.lookup) | **Thread Pool** (libuv) | Dùng getaddrinfo — blocking syscall |
| **Crypto** (crypto.pbkdf2, crypto.scrypt) | **Thread Pool** (libuv) | Tính toán nặng CPU |
| **Compression** (zlib) | **Thread Pool** (libuv) | Tính toán nặng CPU |

Thread Pool mặc định có **4 threads** (điều chỉnh được qua `UV_THREADPOOL_SIZE`, tối đa 1024).

> **Mấu chốt:** JavaScript code vẫn chạy **đơn luồng trên V8**. Nhưng bên dưới, libuv đang dùng OS kernel + thread pool để xử lý I/O **song song**. Khi tác vụ xong → callback được đẩy vào hàng đợi → Event Loop lấy ra → V8 chạy callback.

**Việc 3 — Event Loop với 6 phases:**

Đây là điểm khác biệt lớn nhất so với Browser.

## 5.2 Tại sao Node.js cần 6 phases thay vì 2 hàng đợi?

**Browser** chỉ cần 2 hàng đợi (micro + macro) vì Browser chủ yếu xử lý **1 loại công việc chính**: tương tác UI (click, scroll, type...) + rendering. Phân biệt ưu tiên cao/thấp là đủ.

**Node.js** phải xử lý **nhiều loại sự kiện I/O khác nhau** với timing và mức ưu tiên khác nhau:
- Timer hết hạn → cần xử lý đúng thời điểm
- File đọc xong → cần xử lý kết quả
- Socket đóng → cần cleanup
- Lỗi TCP → cần xử lý error
- `setImmediate` → cần chạy ngay sau I/O

**→ Nếu nhét tất cả vào 1 queue thì không kiểm soát được thứ tự nào chạy trước.** libuv chia thành 6 phase rõ ràng, **mỗi phase chỉ xử lý đúng 1 loại sự kiện**, tạo thành một dây chuyền có thứ tự cố định:

```
   ┌───────────────────────────┐
┌─>│  1. TIMERS                │ setTimeout, setInterval
│  └─────────────┬─────────────┘
│       ↓ nextTickQueue + Promise Queue
│  ┌─────────────▼─────────────┐
│  │  2. PENDING CALLBACKS     │ System-level I/O callbacks
│  └─────────────┬─────────────┘
│       ↓ nextTickQueue + Promise Queue
│  ┌─────────────▼─────────────┐
│  │  3. IDLE, PREPARE         │ Internal use only
│  └─────────────┬─────────────┘
│       ↓ nextTickQueue + Promise Queue
│  ┌─────────────▼─────────────┐
│  │  4. POLL ← TRÁI TIM      │ I/O events, hầu hết callbacks
│  └─────────────┬─────────────┘
│       ↓ nextTickQueue + Promise Queue
│  ┌─────────────▼─────────────┐
│  │  5. CHECK                 │ setImmediate
│  └─────────────┬─────────────┘
│       ↓ nextTickQueue + Promise Queue
│  ┌─────────────▼─────────────┐
│  │  6. CLOSE CALLBACKS       │ socket.on('close')
│  └─────────────┬─────────────┘
│       ↓ nextTickQueue + Promise Queue
└───────────────┘
```

Sau **mỗi phase**, trước khi chuyển sang phase tiếp theo, Node.js luôn làm **2 việc theo thứ tự cố định**:
1. Drain hết `process.nextTick()` queue — **trước**
2. Drain hết `Promise` microtask queue — **sau**

## 5.3 Chi tiết từng Phase

### Phase 1: TIMERS ⏰

**Nhiệm vụ:** Thực thi callbacks của `setTimeout()` và `setInterval()` **đã đến hạn**.

**Chi tiết quan trọng từ Node.js docs:**
- Timer chỉ định **ngưỡng tối thiểu** (threshold), KHÔNG phải thời gian chính xác.
- Callback sẽ chạy **sớm nhất có thể** sau khi vượt ngưỡng, nhưng có thể bị **trì hoãn** bởi OS scheduling hoặc callbacks khác đang chạy.
- **Poll phase kiểm soát khi nào timers được thực thi** (giải thích bên dưới).

```javascript
// Ví dụ từ Node.js Official Docs:
const fs = require('fs');

function someAsyncOperation(callback) {
  // Giả sử đọc file mất 95ms
  fs.readFile('/path/to/file', callback);
}

const timeoutScheduled = Date.now();

setTimeout(() => {
  const delay = Date.now() - timeoutScheduled;
  console.log(`${delay}ms have passed since I was scheduled`);
  // Output: ~105ms (không phải 100ms!)
}, 100);

someAsyncOperation(() => {
  const startCallback = Date.now();
  // Làm gì đó mất 10ms
  while (Date.now() - startCallback < 10) { /* busy wait */ }
});
```

**Giải thích chi tiết:**
1. Script bắt đầu → `setTimeout(fn, 100)` đăng ký timer
2. `fs.readFile()` bắt đầu → Event Loop vào **Poll phase** (chờ I/O)
3. Ở Poll phase, không có callback nào → Event Loop **chờ ở đây**
4. Sau 95ms, `readFile` xong → callback được thêm vào Poll queue → **chạy 10ms**
5. Callback xong (105ms đã trôi qua) → timer 100ms **đã quá hạn**
6. Event Loop quay về **Timers phase** → chạy timer callback
7. Output: `105ms have passed` (không phải 100ms chính xác!)

**→ Bài học: `setTimeout(fn, 100)` nghĩa là "sau ÍT NHẤT 100ms", không phải "đúng 100ms".**

---

### Phase 2: PENDING CALLBACKS 📋

**Nhiệm vụ:** Thực thi callbacks cho **system operations** bị trì hoãn từ vòng trước.

**Cụ thể:**
- Lỗi TCP (ví dụ: `ECONNREFUSED`)
- Trên một số hệ thống *nix, hệ thống muốn **đợi** trước khi báo lỗi → lỗi được queue vào phase này

**Bạn hiếm khi tương tác trực tiếp với phase này** — nó chủ yếu cho Node.js internal.

---

### Phase 3: IDLE, PREPARE 🔧

**Nhiệm vụ:** Dùng **nội bộ** bởi libuv.

Bạn **không cần hiểu** phase này cho phỏng vấn. Chỉ cần biết nó tồn tại.

---

### Phase 4: POLL 🏠 ← Phase QUAN TRỌNG NHẤT (Trái tim của Node.js)

**Nhiệm vụ:**
1. **Tính toán** bao lâu nên block và chờ I/O
2. **Xử lý events** trong poll queue

**Tại sao Poll là "trái tim"?** Đây là nơi Node.js **dành phần lớn thời gian**. Tất cả I/O callback (file đọc xong, HTTP request đến, database trả dữ liệu...) đều được xử lý tại đây.

**Thuật toán chi tiết (từ Node.js Official Docs):**

```
Khi Event Loop vào Poll phase:

┌── Có timers đã schedule chưa? ──────────────────────────┐
│                                                          │
│  ┌── Poll queue CÓ callbacks? ──┐                        │
│  │                               │                        │
│  │  CÓ → Chạy callbacks         │                        │
│  │    (tuần tự, đồng bộ          │                        │
│  │     cho đến khi hết queue     │                        │
│  │     HOẶC đạt system limit)    │                        │
│  │                               │                        │
│  │  KHÔNG → Kiểm tra tiếp       │                        │
│  │    │                          │                        │
│  │    ├── Có setImmediate()?     │                        │
│  │    │   CÓ → Thoát Poll       │                        │
│  │    │         → vào Check phase│                        │
│  │    │                          │                        │
│  │    └── Không có setImmediate? │                        │
│  │        → BLOCK ở đây         │                        │
│  │          Chờ callback mới     │                        │
│  │          được thêm vào queue  │                        │
│  └───────────────────────────────┘                        │
│                                                          │
│  Khi poll queue rỗng:                                     │
│  Kiểm tra timers → nếu có timer hết hạn                  │
│  → Quay ngược về Timers phase                             │
└──────────────────────────────────────────────────────────┘
```

**Giải thích "BLOCK ở đây" — tại sao Node.js tiết kiệm tài nguyên:**

Khi Poll phase không có callback nào và cũng không có `setImmediate` hay timer sắp đến hạn → Node.js **dừng thực sự tại đây**. Cụ thể:
- Nó **KHÔNG** vòng lặp bận rộn (busy loop) liên tục kiểm tra "có gì chưa? có gì chưa?"
- Nó **giao quyền điều khiển cho OS kernel** qua epoll/kqueue/IOCP (tùy hệ điều hành)
- OS sẽ **đánh thức** Node.js khi có I/O mới (file đọc xong, data network đến...)
- Trong khi chờ, CPU usage **gần bằng 0** → đây là lý do Node.js tiết kiệm CPU hơn mô hình polling liên tục

**Poll phase thoát ra khi một trong các điều kiện xảy ra:**
1. Có `setImmediate()` đang pending → thoát Poll → vào Check phase
2. Có timer vừa đến hạn → thoát Poll → quay về Timers phase
3. Có I/O callback mới → xử lý, rồi kiểm tra lại

> **Bài học thực tế:** Khi server Node.js của bạn "idle" (không có request nào), Event Loop đang đứng yên ở Poll phase, CPU usage gần 0%. Khi request đến, OS đánh thức Node.js, callback được xử lý ngay lập tức. Đây là lý do 1 server Node.js single-threaded có thể handle hàng nghìn concurrent connections mà không cần tạo thread cho mỗi connection.

---

### Phase 5: CHECK ✅

**Nhiệm vụ:** Thực thi callbacks của `setImmediate()`.

**Từ Node.js Official Docs:**
> `setImmediate()` là một **special timer** chạy ở phase riêng biệt.
> Nó dùng libuv API để schedule callbacks chạy **sau khi Poll phase hoàn tất**.

**Tại sao cần phase riêng?**
- Khi Poll phase idle và có `setImmediate()` pending → Event Loop **thoát Poll ngay** và vào Check
- Nếu dùng `setTimeout(fn, 0)` thay vì `setImmediate()` → phải chờ quay về Timers phase ở vòng sau

---

### Phase 6: CLOSE CALLBACKS 🚪

**Nhiệm vụ:** Thực thi close events.

```javascript
// Ví dụ:
const socket = new net.Socket();
socket.destroy(); // → 'close' event emit ở phase này

// Nếu socket đóng gracefully (không abrupt):
// → close event emit qua process.nextTick() thay vì ở phase này
```

---

## 5.4 `setImmediate()` vs `setTimeout(fn, 0)` — Từ Official Docs

### Ở top-level (main module): **KHÔNG DETERMINISTIC**

```javascript
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));

// Có thể ra:
// timeout → immediate
// HOẶC
// immediate → timeout
// → Phụ thuộc vào performance của process tại thời điểm đó
```

**Tại sao không deterministic?**
- `setTimeout(fn, 0)` thực tế = `setTimeout(fn, 1)` (minimum 1ms)
- Tùy vào tốc độ xử lý, khi Event Loop bắt đầu vào Timers phase:
  - Nếu đã qua 1ms → timer fire trước
  - Nếu chưa qua 1ms → timer chưa sẵn sàng → chạy tiếp → Check phase → immediate fire trước

### Trong I/O callback: `setImmediate()` LUÔN TRƯỚC

```javascript
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});

// OUTPUT LUÔN LÀ:
// immediate
// timeout
```

**Tại sao luôn deterministic ở đây?**

```
readFile callback chạy ở → Poll phase
    ↓ (kết thúc Poll)
Check phase → setImmediate ← CHẠY TRƯỚC
    ↓
Close callbacks
    ↓
Timers phase → setTimeout ← CHẠY SAU
```

Khi ở trong I/O callback (Poll phase), tiến trình đi **Check → Close → Timers**, nên `setImmediate` luôn trước `setTimeout`.

### Official recommendation:

> **"We recommend developers use `setImmediate()` in all cases because it's easier to reason about."**
> — Node.js Official Docs

---

## 5.5 `process.nextTick()` — Chi tiết từ Official Docs

### Không thuộc Event Loop!

> **"`process.nextTick()` is not technically part of the event loop."**
> — Node.js Official Docs

`process.nextTick()` có queue riêng: **`nextTickQueue`**. Queue này được xử lý:
- **Sau** khi operation hiện tại hoàn tất
- **Trước** khi Event Loop chuyển sang phase tiếp theo
- **Bất kể** đang ở phase nào

```
                    ┌──────────────────────┐
                    │    MỌI phase/step     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ ① nextTickQueue      │ ← Cao nhất
                    │   (process.nextTick) │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ ② Promise Queue      │ ← Cao
                    │   (Promise.then)     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Phase tiếp theo       │
                    └──────────────────────┘
```

### Cảnh báo: I/O Starvation

```javascript
// ❌ NGUY HIỂM: Đệ quy process.nextTick
function recursiveNextTick() {
  process.nextTick(recursiveNextTick);
}
recursiveNextTick();

// nextTickQueue KHÔNG BAO GIỜ rỗng
// → Event Loop KHÔNG BAO GIỜ đến Poll phase
// → I/O callbacks KHÔNG BAO GIỜ chạy
// → ỨNG DỤNG ĐỨNG
```

### Tại sao tên bị đặt ngược?

Từ Node.js Official Docs:
> `process.nextTick()` fires **immediately** on the same phase (nhanh hơn)
> `setImmediate()` fires on the **following iteration** (chậm hơn)
>
> → Tên đáng lẽ phải **hoán đổi** cho nhau!
> Nhưng đổi tên sẽ break hàng triệu packages trên npm → giữ nguyên.

### Khi nào dùng `process.nextTick()`?

**Use case 1: Emit event sau constructor**

```javascript
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {
  constructor() {
    super();
    // ❌ SAI: emit ngay → listener chưa được đăng ký
    // this.emit('event');

    // ✅ ĐÚNG: emit sau khi constructor hoàn tất
    process.nextTick(() => {
      this.emit('event');
    });
  }
}

const emitter = new MyEmitter();
emitter.on('event', () => console.log('got event!')); // ✅ Hoạt động
```

**Use case 2: Xử lý error trước khi Event Loop tiếp tục**

```javascript
function readFileAndProcess(path, callback) {
  fs.readFile(path, (err, data) => {
    if (err) {
      // Cho phép user handle error TRƯỚC KHI event loop tiếp tục
      return process.nextTick(() => callback(err));
    }
    process.nextTick(() => callback(null, data));
  });
}
```

---

## 5.6 Thay đổi trong Node.js 20+ (libuv 1.45.0)

> **Quan trọng:** Từ libuv 1.45.0 (Node.js 20), hành vi Event Loop đã thay đổi:
> Timers chỉ chạy **SAU** poll phase, thay vì cả trước và sau như phiên bản cũ.

Điều này có thể ảnh hưởng đến timing của `setImmediate()` và cách nó tương tác với timers.

---

# 6. Microtasks — Phần quan trọng nhất

## 6.0 Thứ tự ưu tiên thực thi — Bảng tổng hợp

**Đây là thứ tự ưu tiên chính xác, áp dụng cho CẢ Browser và Node.js:**

| Thứ tự | Loại | Ví dụ | Chạy khi nào |
|--------|------|-------|--------------|
| **① Cao nhất** | Code đồng bộ | `console.log()`, phép tính, vòng lặp | **Ngay lập tức** trên Call Stack |
| **② Cao** | `process.nextTick()` *(chỉ Node.js)* | `process.nextTick(fn)` | **Ngay khi Call Stack rỗng**, trước mọi microtask khác |
| **③ Trung bình** | Microtask (Promise) | `Promise.then()`, `async/await`, `queueMicrotask()` | Ngay sau nextTick, **trước** mọi macrotask |
| **④ Thấp** | Macrotask / Phase callbacks | `setTimeout`, `setInterval`, I/O callbacks, `setImmediate`, DOM events | **Sau khi** microtask queue rỗng hoàn toàn |

> **Quy tắc vàng:** Code đồng bộ → nextTick → Promise → Event Loop phases/macrotasks. Không bao giờ bị phá vỡ.

## 6.1 Microtasks trong Browser

```
Sau MỖI macrotask:
  → Drain HẾT microtask queue
  → Nếu microtask tạo thêm microtask → chạy luôn
  → Chỉ khi microtask queue HOÀN TOÀN RỖNG → tiếp tục rendering/macrotask
```

## 6.2 Microtasks trong Node.js

```
Giữa MỖI phase:
  → ① Drain HẾT nextTickQueue (process.nextTick) — trước
  → ② Drain HẾT Promise microtask queue — sau
  → Chỉ khi CẢ HAI rỗng → chuyển phase tiếp theo

Từ Node.js v11+:
  → Microtasks cũng chạy giữa các callbacks TRONG cùng 1 phase
  (trước v11: chỉ chạy giữa các phases)
```

## 6.3 Sự thay đổi Node.js v11 — Rất quan trọng!

### Trước Node.js v11:

```javascript
setTimeout(() => {
  console.log('timeout 1');
  Promise.resolve().then(() => console.log('promise'));
}, 0);

setTimeout(() => {
  console.log('timeout 2');
}, 0);

// Node < v11: timeout 1, timeout 2, promise
// (Chạy HẾT Timers phase callbacks trước → rồi mới microtasks)
```

### Từ Node.js v11+:

```javascript
// Cùng code trên:
// Node >= v11: timeout 1, promise, timeout 2
// (Sau mỗi callback TRONG phase → chạy microtasks → callback tiếp)
// → GIỐNG với hành vi Browser!
```

**→ Từ Node.js v11+, hành vi microtask đã được ĐỒNG BỘ HÓA với Browser.**

---

# 7. So sánh song song

## 7.1 Bảng so sánh hoàn chỉnh

| Tiêu chí | 🌐 Browser | 🟢 Node.js |
|---|---|---|
| **Spec/Chuẩn** | HTML Living Standard (WHATWG) | libuv docs + Node.js docs |
| **Engine xử lý** | Browser engine (Blink, Gecko) | libuv (C library) |
| **Mục tiêu** | UI mượt (60fps) | I/O throughput cao |
| **Cấu trúc** | Macrotask Queue + Microtask Queue | 6 Phases + Microtask Queues |
| **Rendering** | ✅ Có (Style→Layout→Paint) | ❌ Không |
| **Microtask timing** | Sau mỗi macrotask | Giữa mỗi phase (+ giữa callbacks từ v11) |
| **`setTimeout(fn,0)`** | Min delay ~4ms (HTML spec) | Min delay ~1ms |
| **`setImmediate()`** | ❌ Không có | ✅ Check phase |
| **`process.nextTick()`** | ❌ Không có | ✅ Ưu tiên cao nhất |
| **`requestAnimationFrame`** | ✅ Trước rendering | ❌ Không có |
| **`queueMicrotask()`** | ✅ Có | ✅ Có |
| **`MutationObserver`** | ✅ Microtask | ❌ Không có |
| **DOM APIs** | ✅ document, window | ❌ Không có |
| **File System** | ❌ Không có | ✅ fs module |
| **Thread Pool** | Browser quản lý | libuv (mặc định 4 threads) |
| **Idle behavior** | Loop liên tục (UI) | Block ở Poll phase |

## 7.2 Flow chart song song

```
        🌐 BROWSER                         🟢 NODE.JS

   ┌──────────────────┐            ┌──────────────────────┐
   │  1 Macrotask      │            │  Phase 1: Timers     │
   │  (setTimeout,     │            │  (setTimeout,        │
   │   click event)    │            │   setInterval)       │
   └────────┬─────────┘            └──────────┬───────────┘
            │                                  │
   ┌────────▼─────────┐            ┌──────────▼───────────┐
   │  ALL Microtasks   │            │  nextTick + Promises │
   │  Promise.then()   │            └──────────┬───────────┘
   │  queueMicrotask() │            ┌──────────▼───────────┐
   └────────┬─────────┘            │  Phase 2: Pending    │
            │                       └──────────┬───────────┘
   ┌────────▼─────────┐            ┌──────────▼───────────┐
   │  Rendering        │            │  nextTick + Promises │
   │  rAF → Style →    │            └──────────┬───────────┘
   │  Layout → Paint   │            ┌──────────▼───────────┐
   └────────┬─────────┘            │  Phase 3: Idle       │
            │                       └──────────┬───────────┘
   (Quay lại đầu)                  ┌──────────▼───────────┐
                                    │  nextTick + Promises │
                                    └──────────┬───────────┘
                                    ┌──────────▼───────────┐
                                    │  Phase 4: Poll       │
                                    │  ← TRÁI TIM         │
                                    └──────────┬───────────┘
                                    ┌──────────▼───────────┐
                                    │  nextTick + Promises │
                                    └──────────┬───────────┘
                                    ┌──────────▼───────────┐
                                    │  Phase 5: Check      │
                                    │  (setImmediate)      │
                                    └──────────┬───────────┘
                                    ┌──────────▼───────────┐
                                    │  nextTick + Promises │
                                    └──────────┬───────────┘
                                    ┌──────────▼───────────┐
                                    │  Phase 6: Close      │
                                    └──────────┬───────────┘
                                    (Quay lại đầu)
```

---

# 8. Đính chính hiểu lầm

## ❌ Hiểu lầm 1: "Call Stack là một LIFO Queue"

**Sai.** Stack là Stack, Queue là Queue — hai cấu trúc dữ liệu khác nhau:
- **Stack** = LIFO (Last In, First Out) — push/pop từ đỉnh
- **Queue** = FIFO (First In, First Out) — enqueue ở đuôi, dequeue ở đầu

"LIFO Queue" là một oxymoron — giống nói "hình vuông tròn".

## ❌ Hiểu lầm 2: "Event Loop thêm function vào Call Stack"

**Chính xác hơn:** Event Loop **đẩy (push) callbacks từ Queue/Phase vào Call Stack** — nhưng **CHỈ KHI Call Stack RỖNG**.

Event Loop không tự tạo function. Nó chỉ là "người gác cổng" kiểm tra: "Call Stack rỗng chưa? Nếu rỗng thì lấy callback từ queue ra."

## ❌ Hiểu lầm 3: "Event Loop Browser và Node.js khác nhau hoàn toàn"

**Không hoàn toàn đúng.** Chúng:
- **Giống**: Concept (xử lý async trên single thread), Microtask ưu tiên hơn Macrotask, Promise behavior
- **Khác**: Implementation (WHATWG vs libuv), Phases, APIs riêng, Rendering

## ❌ Hiểu lầm 4: "setTimeout(fn, 0) chạy ngay lập tức"

**Sai.** `setTimeout(fn, 0)` nghĩa là:
- Browser: Chạy sau **ít nhất ~4ms** (HTML spec) VÀ sau khi Call Stack rỗng VÀ after microtasks
- Node.js: Chạy ở **Timers phase** tiếp theo, sau khi microtasks được drain

## ❌ Hiểu lầm 5: "Node.js là single-threaded nên không thể handle nhiều requests"

**Sai.** JavaScript code chạy trên 1 thread, nhưng:
- libuv có **thread pool** (mặc định 4) cho file I/O, DNS, crypto
- OS kernel xử lý network I/O ở kernel level (epoll/kqueue/IOCP)
- → 1 thread xử lý hàng nghìn concurrent connections

## ❌ Hiểu lầm 6: "Microtask luôn chạy trước Macrotask"

**Đúng nhưng cần làm rõ:** Microtask queue được drain **sau khi task/operation hiện tại hoàn tất**. Nếu bạn đang ở giữa một macrotask, microtask phải **chờ** macrotask đó xong.

```javascript
setTimeout(() => {
  console.log('macro 1');
  // Đây vẫn là MACRO operation
  console.log('macro 2');
  // Promise.then ĐỢI đến khi macro này xong
  Promise.resolve().then(() => console.log('micro'));
  console.log('macro 3');
}, 0);

// Output: macro 1, macro 2, macro 3, micro
// (KHÔNG phải: macro 1, macro 2, micro, macro 3)
```

---

# 9. Bài tập

## Bài 1: Cơ bản (Browser & Node.js)
```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
```
<details>
<summary>Đáp án</summary>

**1, 4, 3, 2** — Sync → Microtask → Macrotask
</details>

---

## Bài 2: Microtask chain (Browser & Node.js)
```javascript
Promise.resolve()
  .then(() => {
    console.log('1');
    return Promise.resolve('2');
  })
  .then((val) => console.log(val));

Promise.resolve()
  .then(() => console.log('3'))
  .then(() => console.log('4'));
```
<details>
<summary>Đáp án</summary>

**1, 3, 4, 2**

Giải thích:
- `Promise.resolve()` tạo 2 chains song song trong microtask queue
- Chain 1: `log(1)` → return `Promise.resolve('2')` (cần unwrap, mất thêm 2 microtick)
- Chain 2: `log(3)` → `log(4)`
- Thứ tự: 1 → 3 → 4 → 2 (vì unwrap Promise trong Promise tốn thêm microticks)
</details>

---

## Bài 3: Nested setTimeout (Browser & Node.js)
```javascript
setTimeout(() => {
  console.log('A');
  setTimeout(() => console.log('B'), 0);
  Promise.resolve().then(() => console.log('C'));
}, 0);

setTimeout(() => console.log('D'), 0);
```
<details>
<summary>Đáp án</summary>

**A, C, D, B**

Giải thích:
- Macrotask 1: `log(A)` → schedule `setTimeout(B)` → `Promise(C)` vào microtask
- Microtask drain: `C`
- Macrotask 2: `D` (đã schedule trước B)
- Macrotask 3: `B` (schedule muộn nhất)
</details>

---

## Bài 4: Chỉ Node.js
```javascript
setImmediate(() => console.log('1'));
setTimeout(() => console.log('2'), 0);
process.nextTick(() => console.log('3'));
Promise.resolve().then(() => console.log('4'));
console.log('5');
```
<details>
<summary>Đáp án</summary>

**5, 3, 4, 2 hoặc 1, 1 hoặc 2**

- Sync: `5`
- nextTick: `3`
- Promise microtask: `4`
- `setTimeout` vs `setImmediate`: **non-deterministic** ở top-level
</details>

---

## Bài 5: I/O callback — Chỉ Node.js
```javascript
const fs = require('fs');

fs.readFile(__filename, () => {
  setImmediate(() => console.log('1'));
  setTimeout(() => console.log('2'), 0);
  process.nextTick(() => console.log('3'));
  Promise.resolve().then(() => console.log('4'));
});
```
<details>
<summary>Đáp án</summary>

**3, 4, 1, 2** — LUÔN LUÔN

- Callback ở Poll phase → drain nextTick: `3` → drain Promise: `4`
- Check phase: `1` (setImmediate)
- Timers phase (vòng sau): `2` (setTimeout)
</details>

---

## Bài 6: Microtask spawn microtask (Browser & Node.js)
```javascript
console.log('start');

Promise.resolve().then(() => {
  console.log('micro 1');
  Promise.resolve().then(() => console.log('micro 2'));
});

setTimeout(() => console.log('macro'), 0);

console.log('end');
```
<details>
<summary>Đáp án</summary>

**start, end, micro 1, micro 2, macro**

- Sync: `start`, `end`
- Microtask: `micro 1` → tạo thêm microtask → `micro 2` (drain HẾT trước!)
- Macrotask: `macro`
</details>

---

## Bài 7: process.nextTick đệ quy — Chỉ Node.js
```javascript
process.nextTick(() => {
  console.log('nextTick 1');
  process.nextTick(() => console.log('nextTick 2'));
});

setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
```
<details>
<summary>Đáp án</summary>

**nextTick 1, nextTick 2, timeout hoặc immediate, immediate hoặc timeout**

- nextTick luôn chạy trước mọi phase
- nextTick 1 → tạo nextTick 2 → drain → nextTick 2
- Sau đó mới vào Event Loop phases
</details>

---

## Bài 8: async/await — Cả hai
```javascript
async function foo() {
  console.log('foo start');
  await bar();
  console.log('foo end');
}

async function bar() {
  console.log('bar');
}

console.log('script start');
foo();
console.log('script end');
```
<details>
<summary>Đáp án</summary>

**script start, foo start, bar, script end, foo end**

- `foo start` → `await bar()` → `bar` chạy sync
- `await` biến phần sau thành microtask → `foo end` chờ
- `script end` chạy sync
- Microtask: `foo end`
</details>

---

## Bài 9: Phức tạp — Browser
```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => console.log('3'));
}, 0);

new Promise((resolve) => {
  console.log('4');  // Constructor là SYNC!
  resolve();
}).then(() => {
  console.log('5');
});

setTimeout(() => console.log('6'), 0);

console.log('7');
```
<details>
<summary>Đáp án</summary>

**1, 4, 7, 5, 2, 3, 6**

- Sync: `1`, `4` (Promise constructor là sync!), `7`
- Microtask: `5`
- Macrotask 1: `2` → tạo microtask → drain: `3`
- Macrotask 2: `6`
</details>

---

## Bài 10: Ultimate — Node.js
```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);
setImmediate(() => console.log('3'));

process.nextTick(() => {
  console.log('4');
  process.nextTick(() => console.log('5'));
});

Promise.resolve().then(() => {
  console.log('6');
  process.nextTick(() => console.log('7'));
});

console.log('8');
```
<details>
<summary>Đáp án</summary>

**1, 8, 4, 5, 6, 7, 2 hoặc 3, 3 hoặc 2**

- Sync: `1`, `8`
- nextTick: `4` → tạo nextTick → `5`
- Promise: `6` → tạo nextTick → `7`
- setTimeout vs setImmediate: non-deterministic ở top-level
</details>

---

# 10. Cách trả lời phỏng vấn

## Câu: "Event Loop là gì?"

> "Event Loop là cơ chế cho phép JavaScript — một ngôn ngữ single-threaded — xử lý bất đồng bộ mà không bị block. Nó liên tục kiểm tra: Call Stack rỗng chưa? Nếu rỗng, lấy callback từ các hàng đợi đẩy vào Call Stack để thực thi. Điểm quan trọng: Event Loop không phải của JavaScript engine — nó do Runtime cung cấp. Browser có riêng, Node.js có riêng."

## Câu: "Browser và Node.js Event Loop khác nhau thế nào?"

> "Cùng concept nhưng khác implementation. 5 điểm khác biệt chính:
> 1. **Engine**: Browser dùng browser engine theo chuẩn HTML. Node.js dùng libuv.
> 2. **Cấu trúc**: Browser có 2 queues (micro + macro). Node.js có 6 phases.
> 3. **Rendering**: Browser có rendering step cho UI 60fps. Node.js không có.
> 4. **APIs riêng**: Node.js có `process.nextTick`, `setImmediate`. Browser có `requestAnimationFrame`, DOM.
> 5. **Microtask timing**: Từ Node.js v11+ đã đồng bộ hóa: microtask chạy sau mỗi callback, giống browser."

## Câu: "Giải thích `process.nextTick()` vs `setImmediate()`?"

> "Theo Node.js Official Docs, tên của chúng đáng lẽ phải hoán đổi:
> - `process.nextTick()` fire **ngay lập tức** sau operation hiện tại, trước khi Event Loop chuyển phase. Nó không thuộc Event Loop.
> - `setImmediate()` fire ở **Check phase** — iteration tiếp theo của Event Loop.
>
> Cảnh báo: `process.nextTick()` đệ quy có thể **starve I/O** — Event Loop không bao giờ đến Poll phase. Node.js khuyến khích dùng `setImmediate()` trừ khi cần chạy ngay trước Event Loop."

---

# 11. Tóm tắt siêu ngắn — Ghi nhớ nhanh

```
╔══════════════════════════════════════════════════════════════╗
║  1. V8 chỉ có Call Stack + Heap. Không có Event Loop.        ║
║  2. Runtime (Browser/Node.js) cung cấp Event Loop.           ║
║  3. Event Loop = kiểm tra Call Stack rỗng → lấy callback.    ║
║  4. Browser: Macrotask → Microtask (HẾT) → Render → lặp.    ║
║  5. Node.js: 6 phases xoay vòng, mỗi phase 1 loại sự kiện.  ║
║  6. Giữa mỗi phase: drain nextTick → drain Promise.         ║
║  7. nextTick > Promise > setTimeout > setImmediate.          ║
║  8. Poll phase = trái tim Node.js, block khi idle.           ║
║  9. setImmediate trong I/O → luôn trước setTimeout.          ║
║ 10. Node v11+: microtask chạy sau MỖI callback (giống browser)║
╚══════════════════════════════════════════════════════════════╝
```

---

> 📅 Tạo ngày: 2026-02-09 | Cập nhật: 2026-02-12
> 📚 Nguồn chính thức: nodejs.org, WHATWG HTML Spec, libuv docs, MDN
> 🎯 Mục tiêu: Hiểu tường tận Event Loop từ concept đến implementation
