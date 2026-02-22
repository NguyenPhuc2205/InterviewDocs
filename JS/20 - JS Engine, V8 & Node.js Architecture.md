# 📘 JS Engine, V8 & Node.js Architecture

> **Mục đích:** Ôn tập phỏng vấn — hiểu đúng, hiểu sâu cách JavaScript chạy từ ngôn ngữ → engine → runtime.
> Nội dung đã được kiểm chứng từ [v8.dev](https://v8.dev/docs) · [libuv docs](https://docs.libuv.org/en/v1.x/design.html) · [Node.js docs](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) · [ECMAScript spec](https://tc39.es/ecma262/)

---

## Mục lục

1. [JavaScript và JS Engine — Phân biệt rõ](#1-javascript-và-js-engine--phân-biệt-rõ)
2. [Cấu trúc V8 — 4 tầng biên dịch](#2-cấu-trúc-v8--4-tầng-biên-dịch)
3. [Cấu trúc Node.js — Toàn cảnh](#3-cấu-trúc-nodejs--toàn-cảnh)
4. [Luồng hoạt động thực tế — Từng bước](#4-luồng-hoạt-động-thực-tế--từng-bước)
5. [Event Loop — 6 Phase](#5-event-loop--6-phase)
6. [API thuộc về đâu — Bảng phân loại](#6-api-thuộc-về-đâu--bảng-phân-loại)
7. [Bài Viblo nói sai ở đâu — Đính chính](#7-bài-viblo-nói-sai-ở-đâu--đính-chính)
8. [Chốt 5 điều quan trọng nhất](#8-chốt-5-điều-quan-trọng-nhất)
9. [Câu hỏi phỏng vấn hay gặp](#9-câu-hỏi-phỏng-vấn-hay-gặp)

---

# 1. JavaScript và JS Engine — Phân biệt rõ

| | JavaScript | JS Engine (ví dụ: V8) |
|--|-----------|----------------------|
| **Là gì** | Ngôn ngữ lập trình, được định nghĩa trong đặc tả ECMAScript | Chương trình viết bằng C++ có nhiệm vụ đọc, biên dịch và thực thi mã JS |
| **Ví dụ** | `const x = 1`, `Promise`, `async/await` | V8 (Chrome, Node.js), SpiderMonkey (Firefox), JavaScriptCore (Safari) |
| **Vai trò** | Định nghĩa **quy tắc** (cú pháp, kiểu dữ liệu, hành vi) | **Thực thi** mã nguồn theo những quy tắc đó |

```
Mã JS  →  JS Engine (V8)  →  Mã máy (Machine Code)  →  CPU chạy
```

**Nói đơn giản:** JavaScript giống như **bản nhạc** (nốt nhạc, nhịp điệu), còn V8 giống **người nhạc sĩ** đọc bản nhạc rồi chơi ra âm thanh. Bản nhạc không tự phát ra tiếng, cần người chơi. Tương tự, mã JS không tự chạy, cần engine.

> **V8 docs:** *"V8 compiles and executes JavaScript source code, handles memory allocation for objects, and garbage collects objects it no longer needs."*

### Điểm dễ nhầm

- **ECMAScript spec** = bản đặc tả ngôn ngữ (do tổ chức TC39 quản lý)
- **JavaScript** = hiện thực phổ biến nhất của ECMAScript
- **V8** = một engine hiện thực ECMAScript, viết bằng C++
- **V8 ≠ JS** — V8 là công cụ chạy JS, không phải bản thân ngôn ngữ JS

---

# 2. Cấu trúc V8 — 4 tầng biên dịch

> ⚠️ Nhiều tài liệu cũ chỉ nhắc 2 tầng (Ignition + TurboFan). V8 hiện tại (2023+) có **4 tầng**.

```
     Mã nguồn JS
          ↓
    ┌─── Parser ──→ AST (Cây cú pháp trừu tượng)
    │         ↓
    │    ① Ignition (Trình thông dịch)
    │    → AST → Bytecode, chạy ngay lập tức
    │    → Thu thập phản hồi lúc chạy (kiểu dữ liệu, hình dạng object)
    │         ↓  (code chạy nhiều lần)
    │    ② Sparkplug (Biên dịch nền tảng)
    │    → Bytecode → Mã máy gần như tức thì
    │    → Không tối ưu, nhưng nhanh hơn thông dịch
    │         ↓  (code chạy nhiều hơn nữa)
    │    ③ Maglev (Biên dịch tối ưu tầm trung)
    │    → Mã máy tối ưu "vừa đủ"
    │    → Biên dịch nhanh hơn TurboFan, chất lượng khá
    │         ↓  (code "nóng" — chạy cực nhiều)
    │    ④ TurboFan (Biên dịch tối ưu cao nhất)
    │    → Mã máy chất lượng tốt nhất
    │    → Tối ưu suy đoán → có thể bị hủy tối ưu (deoptimize) quay về ①
    │
    │        ┌───────────────┐   ┌────────────────┐
    │        │  Call Stack   │   │  Memory Heap   │
    │        │  (1 luồng     │   │  (lưu objects, │
    │        │   duy nhất)   │   │   biến, dữ     │
    │        │               │   │   liệu)        │
    │        └───────────────┘   └────────────────┘
    │
    │        Garbage Collector (Orinoco — tự động dọn bộ nhớ Heap)
    └──────────────────────────────────────────────────────
```

**Nói đơn giản:** V8 giống một **lò luyện thép 4 cấp**. Ban đầu, mã nguồn được xử lý nhanh ở cấp thấp nhất (Ignition). Đoạn mã nào được gọi nhiều lần sẽ được "luyện" lên cấp cao hơn để chạy nhanh hơn. Đoạn nào "nóng" nhất (gọi hàng ngàn lần) thì được TurboFan luyện thành mã máy tối ưu nhất.

### Chi tiết từng tầng

| Tầng | Vai trò | Tốc độ biên dịch | Chất lượng mã sinh ra | Khi nào dùng |
|------|---------|-------------------|-----------------------|-------------|
| **Ignition** | Thông dịch | Nhanh nhất | Chậm nhất | Mọi đoạn mã ban đầu |
| **Sparkplug** | Biên dịch nền tảng | Gần tức thì | Tốt hơn Ignition | Mã đã có bytecode |
| **Maglev** | Biên dịch tầm trung | Nhanh | Tốt | Mã "ấm" (chạy nhiều lần vừa) |
| **TurboFan** | Biên dịch tối ưu | Chậm nhất | Tốt nhất | Mã "nóng" (chạy rất nhiều lần) |

### Hủy tối ưu (Deoptimization) — Tại sao xảy ra?

```javascript
function cong(a, b) { return a + b; }

// Ignition chạy, thu thập phản hồi: "a, b luôn là số"
for (let i = 0; i < 10000; i++) cong(i, i + 1);

// TurboFan tối ưu: sinh mã máy chỉ thực hiện phép cộng số

cong("xin", "chào"); // 💥 HỦY TỐI ƯU!
// → Giả định "a, b là số" bị SAI
// → Hủy mã máy đã tối ưu, quay về Ignition
// → Thu thập phản hồi lại từ đầu
```

**Nói đơn giản:** TurboFan "đoán" kiểu dữ liệu dựa trên lịch sử chạy. Nếu đoán sai → hủy kết quả tối ưu, làm lại từ đầu. Vì vậy code JS nên **giữ kiểu dữ liệu nhất quán** (đừng truyền khi number khi string vào cùng hàm).

> **Nguồn kiểm chứng:**
> - [Maglev (v8.dev, 2023)](https://v8.dev/blog/maglev): *"Maglev sits between our existing Sparkplug and TurboFan compilers"*
> - [Ignition (v8.dev)](https://v8.dev/blog/ignition-interpreter)

### Điểm mấu chốt của V8

V8 **chỉ biết chạy mã JavaScript** — nó có Call Stack, Memory Heap, Garbage Collector. Nhưng V8 **không biết** đọc file, gọi mạng, hay hẹn giờ. Những việc đó là trách nhiệm của **môi trường bên ngoài** (trình duyệt hoặc Node.js).

---

# 3. Cấu trúc Node.js — Toàn cảnh

```
┌──────────────────────── Node.js Runtime ──────────────────────┐
│                                                               │
│  Mã JS của bạn                                                │
│       ↓                                                       │
│  Node.js APIs (fs, http, crypto, path, stream...)             │
│  (lớp bọc JS → gọi xuống C++ binding)                        │
│       ↓                                                       │
│  ┌────────────────┐   ┌────────────────────────────────────┐  │
│  │      V8        │   │        libuv (viết bằng C)         │  │
│  │                │   │                                    │  │
│  │  4 tầng JIT:   │   │  Thread Pool (Nhóm luồng)         │  │
│  │  Ignition      │   │  (mặc định 4, tối đa 1024,        │  │
│  │  Sparkplug     │   │   đổi bằng UV_THREADPOOL_SIZE)     │  │
│  │  Maglev        │   │  Chỉ chạy 3 loại:                 │  │
│  │  TurboFan      │   │  → Thao tác file (fs.*)           │  │
│  │                │   │  → Tra cứu DNS (getaddrinfo)      │  │
│  │  Call Stack    │   │  → Tác vụ do lập trình viên đưa   │  │
│  │  Memory Heap   │   │    vào (crypto đi qua đây)        │  │
│  │  GC            │   │                                    │  │
│  └────────────────┘   │  Giao tiếp mạng (TCP/UDP/Socket)  │  │
│                       │  → KHÔNG dùng thread pool          │  │
│                       │  → Dùng cơ chế bất đồng bộ của OS:│  │
│                       │    epoll (Linux)                   │  │
│                       │    kqueue (macOS/BSD)              │  │
│                       │    IOCP (Windows)                  │  │
│                       │                                    │  │
│                       │  Event Loop (6 phase)              │  │
│                       └────────────────────────────────────┘  │
│                                                               │
│  Microtask Queue (chạy SAU MỖI phase):                       │
│  → process.nextTick (ưu tiên cao nhất)                       │
│  → Promise.then / queueMicrotask                             │
│                                                               │
│  Thư viện phụ trợ C/C++:                                     │
│  c-ares (DNS bất đồng bộ) | llhttp (phân tích HTTP)         │
│  OpenSSL (mã hoá)         | zlib (nén/giải nén)              │
└───────────────────────────────────────────────────────────────┘
```

**Nói đơn giản:** Node.js giống một **nhà máy**:
- **V8** = bộ não — đọc và chạy mã JS
- **libuv** = đội thợ và dây chuyền — xử lý mọi tác vụ nặng (đọc file, gọi mạng, hẹn giờ)
- **Node.js APIs** = bảng điều khiển — lập trình viên bấm nút (gọi `fs.readFile`), hệ thống tự biết chuyển việc cho ai

### Thread Pool — Chạy cái gì, KHÔNG chạy cái gì?

> **libuv docs:** *"libuv uses a thread pool to make asynchronous file I/O operations possible, but network I/O is always performed in a single thread, each loop's thread."*

| ✅ Dùng Thread Pool | ❌ KHÔNG dùng Thread Pool |
|---|---|
| Thao tác file (`fs.*`) | Giao tiếp mạng (TCP/UDP) |
| Tra cứu DNS (`getaddrinfo`, `getnameinfo`) | → Dùng cơ chế bất đồng bộ của OS: epoll/kqueue/IOCP |
| Tác vụ do code đưa vào (`uv_queue_work`) | |
| → Node.js dùng cách này để chạy `crypto` | |

> **libuv docs:** *"3 types of operations are currently run on this pool: File system operations, DNS functions (getaddrinfo and getnameinfo), User specified code via uv_queue_work()"*

> ⚠️ **Lưu ý quan trọng:** `setTimeout`, `setInterval`, `setImmediate` **KHÔNG dùng Thread Pool**. Timer được Event Loop quản lý trực tiếp. Giao tiếp mạng (`http.get`, `socket.connect`) cũng **KHÔNG dùng Thread Pool** — chúng dùng cơ chế bất đồng bộ cấp hệ điều hành.

---

# 4. Luồng hoạt động thực tế — Từng bước

## Ví dụ 1: Đọc file (dùng Thread Pool)

```javascript
console.log('A');
fs.readFile('file.txt', (err, data) => {
  console.log('B - nội dung file');
});
console.log('C');
// Kết quả: A → C → B
```

```
Bước 1: console.log('A') chạy trên Call Stack → in "A" → pop ra
        fs.readFile() chạy trên Call Stack
        → Bên trong: lớp bọc JS gọi xuống C++ binding
        → C++ binding giao tác vụ cho libuv
        → Hàm return NGAY (non-blocking)
        → Frame của fs.readFile() POP RA khỏi stack bình thường
        → Call Stack trống → chạy dòng tiếp theo

Bước 2: console.log('C') chạy → in "C"
        Trong khi đó, libuv đưa tác vụ đọc file vào Thread Pool
        → 1 trong 4 thread nhận việc → đọc file trên đĩa
        → Luồng chính JS hoàn toàn rảnh

Bước 3: Thread đọc file xong
        → libuv đẩy callback vào hàng đợi (pending I/O queue)

Bước 4: Event Loop kiểm tra Call Stack
        → Trống → chạy hết microtask trước
        → Lấy callback từ hàng đợi → đẩy lên Call Stack → V8 chạy
        → in "B - nội dung file"
```

## Ví dụ 2: Gọi mạng (KHÔNG dùng Thread Pool)

```javascript
http.get('https://api.example.com/data', (res) => {
  console.log('Nhận phản hồi từ API');
});
console.log('Đã gửi request');
// Kết quả: "Đã gửi request" → "Nhận phản hồi từ API"
```

```
Bước 1: http.get() chạy trên Call Stack
        → C++ binding đăng ký socket với hệ điều hành (epoll/kqueue/IOCP)
        → KHÔNG dùng Thread Pool — OS tự quản lý kết nối mạng
        → Hàm return ngay → pop ra

Bước 2: console.log('Đã gửi request') chạy

Bước 3: OS nhận phản hồi từ API → báo libuv "dữ liệu sẵn sàng"
        → Callback được đưa vào hàng đợi

Bước 4: Event Loop lấy callback → đẩy lên Call Stack → V8 chạy
```

### Điểm mấu chốt

**Hàm KHÔNG bị "lấy ra" khỏi Call Stack.** Hàm `fs.readFile()` chạy bình thường, đăng ký tác vụ I/O với libuv, rồi **return và tự pop ra** như mọi hàm khác. Cái được giao cho libuv là **tác vụ I/O** (đọc file, gọi mạng), không phải frame trên Call Stack.

---

# 5. Event Loop — 6 Phase

```
   ┌───────────────────────────┐
┌─>│         timers             │  ← setTimeout(), setInterval()
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks      │  ← Callback I/O bị hoãn từ vòng trước
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare        │  ← Nội bộ libuv, không cần quan tâm
│  └─────────────┬─────────────┘     ┌───────────────┐
│  ┌─────────────┴─────────────┐     │  incoming:     │
│  │           poll             │◄────┤  connections,  │
│  │  (chờ và xử lý I/O mới)   │     │  data, etc.    │
│  └─────────────┬─────────────┘     └───────────────┘
│  ┌─────────────┴─────────────┐
│  │           check            │  ← setImmediate()
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks       │  ← socket.on('close', ...)
   └───────────────────────────┘
```

### Chi tiết từng phase

| Phase | Chạy gì | Ghi chú |
|-------|---------|---------|
| **timers** | Callback của `setTimeout()`, `setInterval()` đã đến hạn | Không đảm bảo chính xác, chỉ đảm bảo **ít nhất** bằng thời gian delay |
| **pending callbacks** | Callback I/O bị hoãn từ vòng lặp trước | Ví dụ: callback lỗi socket TCP |
| **idle, prepare** | Dùng nội bộ libuv | Lập trình viên không cần quan tâm |
| **poll** | Chờ sự kiện I/O mới, gọi callback tương ứng | Node.js chặn (block) ở đây khi không có gì cần chạy |
| **check** | Callback của `setImmediate()` | Luôn chạy ngay sau phase poll |
| **close** | Callback đóng kết nối | `socket.on('close', ...)` |

### Microtask — Chạy GIỮA mỗi phase

```
[timers] → microtasks → [pending] → microtasks → [idle] → microtasks → [poll] → ...
```

Microtask queue **không thuộc phase nào** — nó được chạy **hết sạch** giữa mỗi phase:

| Loại | Ưu tiên | Ví dụ |
|------|---------|-------|
| `process.nextTick()` | Cao nhất (chạy trước) | Luôn chạy trước Promise |
| `Promise.then()` / `queueMicrotask()` | Sau nextTick | Microtask chuẩn theo ECMAScript |

```javascript
setTimeout(() => console.log('1: setTimeout'), 0);
setImmediate(() => console.log('2: setImmediate'));
Promise.resolve().then(() => console.log('3: Promise'));
process.nextTick(() => console.log('4: nextTick'));
console.log('5: đồng bộ');

// Kết quả:
// 5: đồng bộ       ← mã đồng bộ chạy trước hết
// 4: nextTick       ← nextTick ưu tiên cao nhất trong microtask
// 3: Promise        ← Promise.then sau nextTick
// 1: setTimeout     ← timers phase
// 2: setImmediate   ← check phase
```

### Trong callback I/O: `setImmediate` luôn trước `setTimeout`

```javascript
const fs = require('fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
// Kết quả LUÔN LUÔN: immediate → timeout
// Vì trong callback I/O: poll phase → check phase (setImmediate) → timers phase (setTimeout)
```

> ⚠️ **Node.js 20+ (libuv 1.45.0):** Hành vi Event Loop thay đổi — timer chỉ chạy SAU phase poll, thay vì cả trước và sau như bản cũ.

---

# 6. API thuộc về đâu — Bảng phân loại

| API | Thuộc đặc tả nào | Trình duyệt | Node.js | Ghi chú |
|-----|-------------------|-------------|---------|---------|
| **Promise** | ECMAScript (ES2015) | ✅ | ✅ | Mọi JS engine phải hiện thực |
| **async/await** | ECMAScript (ES2017) | ✅ | ✅ | Cú pháp tiện lợi cho Promise |
| **setTimeout** | HTML spec (**KHÔNG** có trong ECMAScript!) | ✅ Web API | ✅ libuv timer | Cùng tên, **khác hiện thực bên trong** |
| **setInterval** | HTML spec | ✅ Web API | ✅ libuv timer | Tương tự setTimeout |
| **setImmediate** | Không có đặc tả chuẩn | ❌ (trừ IE) | ✅ libuv check | Chỉ phổ biến ở Node.js |
| **queueMicrotask** | HTML spec | ✅ | ✅ | Cả hai đều hiện thực |
| **fetch** | WHATWG Fetch spec | ✅ | ✅ (v18+, dùng **undici**) | Hiện thực khác nhau |
| **fs.readFile** | Node.js API | ❌ | ✅ | Chỉ có trong Node.js |
| **process** | Node.js API | ❌ | ✅ | Chỉ có trong Node.js |
| **window** | Browser API (Web IDL) | ✅ | ❌ | Chỉ có trong trình duyệt |
| **document** | Browser API (DOM spec) | ✅ | ❌ | Chỉ có trong trình duyệt |
| **console** | Console spec (WHATWG) | ✅ | ✅ | Cả hai hiện thực, nhưng đầu ra khác |

### 3 điểm dễ nhầm nhất

1. **`Promise` thuộc ECMAScript spec**, không phải "của V8". V8 chỉ là một trong những engine hiện thực nó. SpiderMonkey, JavaScriptCore cũng hiện thực Promise.

2. **`setTimeout` KHÔNG có trong ECMAScript spec.** Trình duyệt lấy từ HTML spec. Node.js hiện thực riêng bằng libuv timer. Cùng tên gọi, **khác hoàn toàn bên trong**.

3. **`fetch` trong Node.js 18+** dùng **undici** (thư viện HTTP thuần JS cho Node.js), không phải mang code từ trình duyệt sang. Cùng tuân theo WHATWG Fetch spec nhưng hiện thực riêng.

> **Node.js 18 release notes:** *"The implementation comes from undici and is inspired by node-fetch which was originally based upon undici-fetch."*

---

# 7. Bài Viblo nói sai ở đâu — Đính chính

Nhiều bài viết tiếng Việt (ví dụ trên Viblo) giải thích Node.js theo cách gây hiểu lầm. Dưới đây là 5 điểm sai phổ biến:

| # | Bài Viblo nói | Thực tế (đã kiểm chứng) |
|---|---|---|
| 1 | "Có adapter check hàm có trong Node APIs hay không → trả về true/false" | **Sai.** Không tồn tại "adapter" nào. Khi gọi `fs.readFile()`, V8 gọi thẳng xuống C++ binding — code C++ này **đã được viết sẵn** để biết phải dùng libuv thế nào. Không có bước kiểm tra runtime. |
| 2 | "Node APIs lấy hàm ra khỏi Call Stack" | **Sai.** Hàm chạy bình thường trên Call Stack → đăng ký tác vụ I/O với libuv → **return và tự pop ra** như mọi hàm khác. Không ai "lấy" frame ra cả. |
| 3 | "setTimeout, setImmediate chạy trong Thread Pool" | **Sai.** Timer do Event Loop quản lý trực tiếp bằng cấu trúc dữ liệu min-heap. Không tốn thread nào trong pool. |
| 4 | "http.get, socket.connect dùng Thread Pool" | **Sai.** Giao tiếp mạng dùng cơ chế bất đồng bộ cấp OS (epoll/kqueue/IOCP), không dùng Thread Pool. libuv docs nói rõ. |
| 5 | "Requests vào Event Queue theo FIFO đơn giản" | **Gây hiểu lầm.** Không có một hàng đợi FIFO duy nhất. Theo Node.js docs, mỗi phase có **hàng đợi riêng**, và còn microtask queue chạy giữa mỗi phase. |

---

# 8. Chốt 5 điều quan trọng nhất

> 💡 Nếu phỏng vấn hỏi về kiến trúc Node.js, nhớ 5 điều này:

### ① JS là ngôn ngữ, V8 là engine — không phải một

JavaScript chỉ là tập hợp quy tắc (ECMAScript spec). V8 là chương trình C++ đọc và chạy mã JS. Có nhiều engine khác: SpiderMonkey (Firefox), JavaScriptCore (Safari).

### ② V8 chỉ biết chạy JS — mọi I/O là việc của libuv

V8 có Call Stack, Memory Heap, Garbage Collector. Nhưng đọc file, gọi mạng, hẹn giờ — tất cả là trách nhiệm của libuv và hệ điều hành.

### ③ JS đơn luồng. libuv đa luồng. Lập trình viên viết code đơn luồng.

JavaScript chỉ có 1 Call Stack (đơn luồng). libuv có Thread Pool (mặc định 4 luồng). Nhưng lập trình viên chỉ viết code JS trên luồng chính — không cần quản lý thread thủ công.

### ④ Non-blocking ≠ Asynchronous — Hai khái niệm độc lập

- **Non-blocking** = hàm trả về ngay, không chờ kết quả
- **Asynchronous** = kết quả đến sau, thông qua callback hoặc Promise
- Hai khái niệm khác nhau nhưng trong JS **luôn đi cùng nhau**

### ⑤ Event Loop = cầu nối. Microtask luôn trước macrotask.

Event Loop liên tục kiểm tra: Call Stack trống → lấy callback từ hàng đợi → đẩy lên stack. Microtask (`process.nextTick`, `Promise.then`) **luôn** được chạy hết trước macrotask (`setTimeout`, `setImmediate`).

---

# 9. Câu hỏi phỏng vấn hay gặp

### Hỏi: JavaScript là ngôn ngữ thông dịch hay biên dịch?

**Trả lời:** Cả hai — gọi là **JIT** (Just-In-Time Compilation). Mã nguồn ban đầu được thông dịch bởi Ignition thành bytecode để chạy ngay. Nhưng đoạn mã chạy nhiều lần sẽ được biên dịch bởi Sparkplug/Maglev/TurboFan thành mã máy tối ưu. Đây là cách V8 cân bằng giữa tốc độ khởi động và hiệu suất đỉnh.

### Hỏi: Node.js là đơn luồng hay đa luồng?

**Trả lời:** Mã JS chạy trên **1 luồng** (Call Stack duy nhất). Nhưng bản thân Node.js runtime là **đa luồng** — libuv Thread Pool (mặc định 4 luồng) xử lý thao tác file, tra cứu DNS, mã hoá ở ngầm. Giao tiếp mạng thì dùng cơ chế bất đồng bộ cấp OS, không cần luồng riêng.

### Hỏi: Event Loop chạy trên luồng nào?

**Trả lời:** Event Loop chạy trên **cùng luồng với mã JS** (luồng chính). Nó là vòng lặp liên tục kiểm tra: "có callback nào sẵn sàng chưa?" → nếu có thì đưa vào Call Stack để chạy.

### Hỏi: Promise.then chạy ở phase nào của Event Loop?

**Trả lời:** Promise.then **không thuộc phase nào**. Nó nằm trong **Microtask Queue** — được xử lý **hết sạch** giữa mỗi phase. Microtask luôn có ưu tiên cao hơn macrotask.

### Hỏi: setTimeout(fn, 0) có chạy ngay lập tức không?

**Trả lời:** **Không.** `setTimeout(fn, 0)` đưa callback vào **timers phase** — chỉ chạy sau khi: mã đồng bộ hiện tại xong VÀ microtask queue trống VÀ Event Loop đến timers phase.

### Hỏi: setImmediate và setTimeout(fn, 0) khác nhau thế nào?

**Trả lời:** `setImmediate()` chạy ở **check phase** (ngay sau poll). `setTimeout(fn, 0)` chạy ở **timers phase**. Trong callback I/O, `setImmediate` **luôn** chạy trước `setTimeout`. Ngoài callback I/O, thứ tự không xác định.

### Hỏi: fetch trong Node.js lấy từ đâu?

**Trả lời:** Từ Node.js 18+, `fetch` được tích hợp sẵn, hiện thực bằng **undici** — thư viện HTTP thuần JS cho Node.js. Trước bản 18 phải cài `node-fetch`. Cùng tuân theo WHATWG Fetch spec nhưng hiện thực khác trình duyệt.

---

> 📚 **Tài liệu liên quan:** `00 - JavaScript Là Gì & Cách Nó Hoạt Động.md` · `06 - Promises & Async-Await Deep Dive.md` · `10 - JavaScript Runtime & Bất đồng bộ.md` · `21 - Call Stack, Memory Heap & Execution Model.md`
