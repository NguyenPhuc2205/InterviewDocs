# 📘 JavaScript Runtime — Engine, Bất đồng bộ & Cơ chế thực thi

> Tài liệu này giải thích **chuyên sâu** cách JavaScript hoạt động "bên dưới" — từ cách engine đọc và thực thi code, đến các cơ chế bất đồng bộ, từng thuật ngữ, từng cơ chế, với ví dụ minh họa chi tiết.

---

## Mục lục

0. [JavaScript Engine — Bộ máy thực thi code](#0-javascript-engine)
1. [Tổng quan: 4 đặc tính cốt lõi](#1-tổng-quan)
2. [Single-threaded (Đơn luồng)](#2-single-threaded)
3. [Non-blocking (Không chặn)](#3-non-blocking)
4. [Asynchronous (Bất đồng bộ)](#4-asynchronous)
5. [Non-blocking vs Asynchronous — Phân biệt rõ ràng](#5-non-blocking-vs-asynchronous)
6. [Concurrent (Đồng thời) vs Parallel (Song song)](#6-concurrent-vs-parallel)
7. [Call Stack & Execution Context](#7-call-stack)
8. [Web APIs / Browser APIs](#8-web-apis)
9. [Event Loop chi tiết](#9-event-loop)
10. [Microtask vs Macrotask](#10-microtask-vs-macrotask)
11. [try/catch/finally — Error Handling cơ bản](#11-trycatchfinally)
12. [Câu hỏi phỏng vấn](#12-câu-hỏi-phỏng-vấn)

---

# 0. JavaScript Engine

## JavaScript Engine là gì?

JavaScript Engine (công cụ JavaScript) là phần mềm chịu trách nhiệm **đọc, biên dịch, và thực thi** mã JavaScript. Trình duyệt hay Node.js **không tự đọc** JavaScript — chúng ủy thác việc đó cho engine.

Mỗi trình duyệt có engine riêng:

| Engine | Sử dụng bởi | Ghi chú |
|--------|------------|---------|
| **V8** | Chrome, Edge, Opera, **Node.js**, Deno | Phổ biến nhất, do Google phát triển |
| **SpiderMonkey** | Firefox | Engine đầu tiên, được Brendan Eich tạo ra |
| **JavaScriptCore** (Nitro) | Safari, Webkit | Do Apple phát triển |

## Engine hoạt động thế nào?

Khi bạn viết code JavaScript và mở trang web (hoặc chạy Node.js), engine thực hiện các bước sau:

```
                    Mã nguồn JavaScript
                         │
                         ▼
              ┌─────────────────────┐
              │   1. PHÂN TÍCH CÚ    │
              │      PHÁP (Parsing)  │   → Đọc từng dòng code
              │                      │     Kiểm tra lỗi cú pháp
              │   Source Code → AST  │     Tạo cây cú pháp trừu tượng (AST)
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   2. BIÊN DỊCH       │
              │      (Compilation)   │   → Chuyển AST thành mã máy
              │                      │     JIT: biên dịch ngay trước khi chạy
              │   AST → Bytecode     │     (không compile toàn bộ trước như C++)
              │   → Machine Code     │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   3. THỰC THI        │
              │      (Execution)     │   → Chạy từng dòng mã máy
              │                      │     Sử dụng Call Stack + Memory Heap
              │   Machine Code runs  │     Quản lý Execution Context
              └─────────────────────┘
```

## JIT Compilation — Biên dịch tức thời

JavaScript **không phải** ngôn ngữ thông dịch thuần túy, cũng **không phải** biên dịch thuần túy. Nó dùng **JIT (Just-In-Time) Compilation** — biên dịch mã **ngay trước khi chạy**, chỉ vài micro giây trước khi thực thi.

```
So sánh:

Thông dịch thuần (Interpreted):
  Source → Đọc từng dòng → Thực thi từng dòng → Chậm nếu lặp lại nhiều

Biên dịch trước (Compiled, ví dụ C++):
  Source → Compile toàn bộ → File thực thi (.exe) → Nhanh nhưng cần biên dịch trước

JIT (JavaScript — V8):
  Source → Parse → Bytecode (Ignition) → Chạy ngay
                                       ↓
                           Code "nóng" (chạy nhiều lần)?
                                       ↓
                           Tối ưu thành Machine Code (TurboFan)
                           → Chạy CỰC NHANH cho lần sau
```

V8 engine (Chrome/Node.js) cụ thể dùng 2 thành phần:
- **Ignition** — trình thông dịch, chuyển AST thành bytecode và chạy nhanh
- **TurboFan** — trình tối ưu hóa, phát hiện code "nóng" (chạy nhiều lần) rồi biên dịch thành mã máy tối ưu

## Hai thành phần chính của Engine

```
┌──────────────────────────────────────┐
│           JavaScript Engine           │
│                                      │
│   ┌──────────────────┐               │
│   │   Memory Heap     │  ← Bộ nhớ   │
│   │                   │    Lưu trữ   │
│   │  • Biến (variables)│    objects,  │
│   │  • Hàm (functions)│    arrays,   │
│   │  • Objects        │    closures  │
│   └──────────────────┘               │
│                                      │
│   ┌──────────────────┐               │
│   │   Call Stack      │  ← Thực thi  │
│   │                   │    Theo dõi  │
│   │  Ngăn xếp LIFO   │    hàm nào   │
│   │  theo dõi các     │    đang chạy │
│   │  Execution Context│              │
│   └──────────────────┘               │
│                                      │
└──────────────────────────────────────┘
```

### Memory Heap (Bộ nhớ đống)

Khi engine đọc code, nó lưu các **khai báo biến** và **định nghĩa hàm** vào Memory Heap — một vùng bộ nhớ **không có thứ tự** dùng để lưu trữ dữ liệu.

```javascript
var num = 2;                        // Engine lưu: num → 2 vào Heap
function pow(num) {                 // Engine lưu: pow → [function definition] vào Heap
  return num * num;
}
// Tại thời điểm này, POW CHƯA ĐƯỢC GỌI
// Engine chỉ lưu "mô tả" của hàm pow vào bộ nhớ
// Khai báo hàm ≠ Gọi hàm!
```

### Call Stack (Ngăn xếp gọi hàm)

Khi một hàm **được gọi** (không phải khai báo), engine tạo một **Execution Context** và **push** nó vào Call Stack. Chi tiết ở [mục 7](#7-call-stack).

---

# 1. Tổng quan

Khi mô tả JavaScript runtime model, ta thường nói:

> JavaScript là **single-threaded**, **non-blocking**, **asynchronous**, **concurrent** language.

Mỗi từ mang **ý nghĩa khác nhau** và chúng **không phải đồng nghĩa**:

| Thuật ngữ | Thuộc về | Ý nghĩa |
|-----------|---------|---------|
| **Single-threaded** | JavaScript Engine | Chỉ có 1 Call Stack, 1 thread thực thi code |
| **Non-blocking** | I/O operations | Gọi hàm I/O → return ngay, không chờ kết quả |
| **Asynchronous** | Programming model | Khởi tạo tác vụ bây giờ, xử lý kết quả sau |
| **Concurrent** | Runtime | Xử lý nhiều tác vụ trong cùng khoảng thời gian (nhờ Event Loop) |

```
                    ┌──────────────────────┐
                    │   JavaScript Code     │
                    │   (single-threaded)   │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │   JS Engine (V8)      │
                    │   • 1 Call Stack       │  ← single-threaded
                    │   • 1 Memory Heap      │
                    └───────────┬──────────┘
                                │
              ┌─────────────────▼─────────────────┐
              │   Runtime Environment              │
              │   (Browser / Node.js)              │
              │   • Web APIs / libuv (multi-thread)│  ← non-blocking I/O
              │   • Task Queues                    │
              │   • Event Loop                     │  ← concurrent
              └────────────────────────────────────┘
```

---

# 2. Single-threaded

## Định nghĩa chính thức

**Single-threaded** có nghĩa là JavaScript engine (V8, SpiderMonkey, JavaScriptCore) chỉ sử dụng **một thread duy nhất** — được gọi là **main thread** (hoặc **UI thread** trong browser) — để thực thi JavaScript code. Engine chỉ có **một Call Stack**, do đó tại **bất kỳ thời điểm nào**, chỉ có đúng **một đoạn code đang được thực thi**.

## Nói đơn giản

JavaScript chỉ có **1 bàn tay** để làm việc. Nó chỉ làm được **1 việc tại 1 thời điểm**, không thể chạy 2 đoạn code cùng lúc.

## Minh họa chi tiết

```javascript
// JavaScript thực thi TUẦN TỰ, từng dòng một:
console.log('Dòng 1');                    // Thực thi tại t=0ms
heavyComputation();                        // Thực thi tại t=1ms → tốn 3000ms
console.log('Dòng 2');                    // Thực thi tại t=3001ms
                                           // ⚠️ "Dòng 2" phải ĐỢI heavyComputation xong!
```

```
Timeline (Main Thread):
─────────────────────────────────────────────────────
│ log('Dòng 1') │ heavyComputation() 🔥🔥🔥 │ log('Dòng 2') │
│     0ms        │    1ms ─── 3000ms          │    3001ms       │
─────────────────────────────────────────────────────
                  ↑
                  Trong suốt 3 giây này:
                  • UI bị ĐÓNG BĂNG (freeze)
                  • Click/scroll KHÔNG phản hồi
                  • Animation BỊ DỪNG
                  • Vì main thread đang BẬN
```

## So sánh: Single-threaded vs Multi-threaded

| | Single-threaded (JS) | Multi-threaded (Java, Go) |
|---|---|---|
| **Threads** | 1 main thread | Nhiều threads |
| **Đồng thời** | Không thể chạy 2 đoạn code JS cùng lúc | Có thể chạy song song |
| **Ưu điểm** | Đơn giản, không cần locks, no race conditions | Tận dụng multi-core CPU |
| **Nhược điểm** | Heavy computation → block UI | Phức tạp (deadlocks, race conditions) |
| **Giải pháp cho CPU-intensive** | Web Workers / Worker Threads | Thread pools |

## Tại sao JavaScript là single-threaded?

JavaScript được tạo ra năm 1995 bởi **Brendan Eich** cho trình duyệt Netscape, với mục đích ban đầu là **thao tác DOM** (Document Object Model). Nếu nhiều threads cùng sửa DOM → **race conditions** → trạng thái DOM không nhất quán → bugs khó debug. Single-threaded giải quyết vấn đề này bằng cách đảm bảo **chỉ 1 thread** sửa DOM tại 1 thời điểm.

> **Lưu ý:** Web Workers cho phép chạy JS trên thread riêng, nhưng **không thể truy cập DOM** và giao tiếp với main thread qua **message passing** (postMessage/onmessage). Đây không phải "multi-threading chia sẻ bộ nhớ" như Java.

---

# 3. Non-blocking

## Định nghĩa chính thức

**Non-blocking** là đặc tính của một **hàm/operation** khi nó **trả về ngay lập tức** (immediately returns) mà **không chờ** (không block) tác vụ I/O hoàn thành. Control flow được trả lại cho caller ngay, và caller có thể tiếp tục thực thi code tiếp theo.

Đối lập với **blocking**: hàm blocking **không trả về** (không return) cho đến khi tác vụ I/O hoàn thành — main thread bị "khóa" trong suốt thời gian chờ.

## Nói đơn giản

**Non-blocking:** Bạn gọi điện đặt pizza → nhân viên nói "OK chúng tôi đang làm" → bạn **cúp máy ngay** đi làm việc khác → pizza tới thì người giao hàng bấm chuông.

**Blocking:** Bạn gọi điện đặt pizza → bạn **cầm máy chờ** cho đến khi pizza xong → mới cúp máy → mới đi làm việc khác.

## So sánh blocking vs non-blocking code

```javascript
// ❌ BLOCKING — Main thread bị "khóa", KHÔNG THỂ làm gì khác
// (Đây là cách Node.js KHÔNG khuyến khích dùng)
const fs = require('fs');

console.log('1 - Bắt đầu');
const data = fs.readFileSync('file.txt', 'utf8');  // ⏳ CHỜ đến khi đọc xong
console.log('2 - File content:', data);              // Chỉ chạy SAU khi đọc xong
console.log('3 - Kết thúc');
// Output tuần tự: 1, 2, 3
// Trong lúc readFileSync → main thread BỊ BLOCK!


// ✅ NON-BLOCKING — Main thread được giải phóng ngay
console.log('1 - Bắt đầu');
fs.readFile('file.txt', 'utf8', (err, data) => {
  // Callback được gọi SAU khi file đọc xong
  console.log('2 - File content:', data);
});
console.log('3 - Kết thúc');  // Chạy NGAY, không đợi readFile
// Output: 1, 3, 2
// Main thread KHÔNG BỊ BLOCK → có thể xử lý requests khác!
```

## Tại sao non-blocking quan trọng?

```
Server xử lý 1000 requests cùng lúc:

BLOCKING (Traditional):
Request 1: ─── readDB (500ms) ─── respond ───
Request 2:                                     ─── readDB (500ms) ─── respond ───
Request 3:                                                                        ─── ...
→ Mỗi request phải ĐỢI request trước → CHẬM → cần nhiều threads

NON-BLOCKING (Node.js):
Request 1: ─ send to DB ─ respond (khi DB trả về)
Request 2:   ─ send to DB ─ respond (khi DB trả về)
Request 3:     ─ send to DB ─ respond (khi DB trả về)
→ Main thread gửi yêu cầu đọc DB rồi xử lý request tiếp → NHANH → 1 thread!
```

---

# 4. Asynchronous

## Định nghĩa chính thức

**Asynchronous programming** (lập trình bất đồng bộ) là một mô hình (paradigm) trong đó **các tác vụ được khởi tạo** (initiated) tại một thời điểm, nhưng **kết quả của chúng** được **xử lý tại một thời điểm khác** trong tương lai (at some point later), khi tác vụ đã hoàn thành. Thứ tự hoàn thành **không nhất thiết** trùng với thứ tự khởi tạo.

Đối lập với **synchronous**: code chạy **tuần tự** (sequential), mỗi dòng phải **hoàn thành** trước khi dòng tiếp theo bắt đầu.

## Nói đơn giản

**Synchronous (đồng bộ):** Bạn đến quán cà phê → gọi nước → **đứng đợi** pha xong → lấy nước → rồi mới gọi bánh.

**Asynchronous (bất đồng bộ):** Bạn đến quán → gọi nước → **nhận phiếu chờ** (Promise!) → đi **gọi bánh** luôn → khi nước/bánh xong thì nhân viên gọi bạn ra lấy.

## So sánh synchronous vs asynchronous

```javascript
// ✅ SYNCHRONOUS — chạy tuần tự, dòng 2 CHỜ dòng 1
const result1 = heavyComputation();  // Tốn 3 giây → block 3 giây
const result2 = anotherComputation();  // Chỉ bắt đầu SAU khi result1 xong
console.log(result1, result2);

// ✅ ASYNCHRONOUS — dòng 2 KHÔNG CHỜ dòng 1
fetchUser(userId);     // Gửi request → return ngay (non-blocking)
fetchPosts(userId);    // Gửi request → return ngay → 2 requests ĐỒNG THỜI!
// Kết quả đến theo thứ tự HOÀN THÀNH, không theo thứ tự gọi
```

## Cách JavaScript xử lý async

JavaScript dùng **3 cơ chế chính** để xử lý kết quả async:

```javascript
// 1. Callback — truyền function để gọi khi xong
fs.readFile('data.txt', (err, data) => {
  console.log(data);  // Gọi khi file đọc xong
});

// 2. Promise — nhận "lời hứa" trả kết quả
fetch('/api/data')
  .then(res => res.json())     // Khi response về
  .then(data => console.log(data))
  .catch(err => console.error(err));

// 3. Async/Await — viết async code trông như sync
async function load() {
  try {
    const res = await fetch('/api/data');   // "Chờ" nhưng KHÔNG block
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
```

---

# 5. Non-blocking vs Asynchronous

> Hai khái niệm này thường được dùng **lẫn lộn** nhưng thực tế chúng nói về **2 điều khác nhau**.

## Bảng so sánh chi tiết

| Tiêu chí | Non-blocking | Asynchronous |
|----------|-------------|-------------|
| **Nói về điều gì?** | **Cách gọi hàm** — hàm return ngay hay chờ | **Cách xử lý kết quả** — kết quả đến ngay hay sau |
| **Câu hỏi trả lời** | "Hàm này có **block main thread** không?" | "Kết quả có **sẵn ngay** hay phải **chờ**?" |
| **Trọng tâm** | **Caller** — người gọi không bị chặn | **Result** — kết quả đến vào thời điểm không xác định |
| **Đối lập** | **Blocking** — hàm giữ main thread đến khi xong | **Synchronous** — kết quả có ngay khi hàm return |
| **Analogy** | Gọi điện đặt hàng → **cúp máy ngay** (non-blocking) vs **cầm máy chờ** (blocking) | Đặt hàng → hàng đến **bất cứ lúc nào** (async) vs hàng **có sẵn tại chỗ** (sync) |

## Ví dụ: 4 tổ hợp có thể có

```javascript
// 1. SYNCHRONOUS + BLOCKING (phổ biến nhất trong traditional languages)
const data = fs.readFileSync('file.txt');
// → Block main thread + kết quả có ngay khi return
// → Hàm KHÔNG return cho đến khi file đọc xong

// 2. ASYNCHRONOUS + NON-BLOCKING (JavaScript's I/O model)
fetch('/api/data').then(handleResult);
// → KHÔNG block main thread (return Promise ngay)
// → Kết quả đến SAU (async) qua .then()

// 3. SYNCHRONOUS + NON-BLOCKING (polling — ít gặp trong JS)
// → Hàm return ngay với trạng thái "chưa sẵn sàng"
// → Caller phải gọi lại liên tục để check (busy-waiting)
// Ví dụ: socket.recv() trong non-blocking mode
// while (true) { result = socket.tryRead(); if (result) break; }

// 4. ASYNCHRONOUS + BLOCKING (hiếm gặp)
// → Main thread bị block nhưng kết quả đến async
// → Ví dụ: select() system call trong Unix (block cho đến khi BẤT KỲ I/O nào sẵn sàng)
```

## Mối quan hệ trong JavaScript

```
                    JavaScript I/O Model:
                    
    Non-blocking ──→ "Hàm return NGAY, không chờ I/O"
         │
         │ kết hợp với
         ▼
    Asynchronous ──→ "Kết quả đến SAU, xử lý qua callback/Promise"
         │
         │ được quản lý bởi
         ▼
     Event Loop ──→ "Chuyển kết quả từ Task Queue vào Call Stack"
```

> **Tóm tắt:** Trong JavaScript, non-blocking và asynchronous **gần như luôn đi cùng nhau** — hàm I/O trả về ngay (non-blocking) VÀ kết quả đến sau (async). Nhưng về mặt lý thuyết, chúng là **2 khái niệm độc lập**: non-blocking nói về caller, async nói về kết quả.

---

# 6. Concurrent vs Parallel

## Định nghĩa

**Concurrency** (Đồng thời): Khả năng **xử lý nhiều tác vụ** trong cùng khoảng thời gian bằng cách **xen kẽ** (interleave) giữa chúng. Không nhất thiết phải chạy đồng thời vật lý.

**Parallelism** (Song song): **Thực thi nhiều tác vụ** tại **cùng một thời điểm vật lý**, trên nhiều CPU cores/threads.

## Analogy dễ hiểu

```
CONCURRENT (1 đầu bếp, 3 món):
Đầu bếp: chiên trứng ─ pause ─ đun nước ─ pause ─ nướng bánh mì ─ pause ─ tiếp chiên trứng...
→ 1 person, XEN KẼ giữa các món → TẤT CẢ cùng "đang được nấu"

PARALLEL (3 đầu bếp, 3 món):
Đầu bếp 1: chiên trứng ──────────────
Đầu bếp 2: đun nước ──────────────
Đầu bếp 3: nướng bánh mì ──────────────
→ 3 persons, LÀM CÙNG LÚC thật sự
```

## Trong JavaScript

```
JavaScript (Concurrent — KHÔNG Parallel cho JS code):
Main Thread: ─ task A ─ task B ─ task A ─ task C ─ task B ─
             XEN KẼ giữa các tasks qua Event Loop

→ NHƯNG: I/O operations CÓ THỂ parallel!
Network thread:  ─── fetch API 1 ──────
Filesystem thread: ─── readFile ──────
Timer thread:      ─── setTimeout ──────
→ Runtime (Browser/Node.js) dùng NHIỀU threads cho I/O

Web Workers (Parallel — thật sự):
Main Thread:   ─ UI logic ─────────
Worker Thread: ─ heavy computation ─
→ 2 threads chạy cùng lúc, giao tiếp qua postMessage
```

| | Concurrent | Parallel |
|---|---|---|
| **Phương tiện** | 1 thread + Event Loop | Nhiều threads/cores |
| **Cách** | Xen kẽ (interleave) | Thực thi đồng thời vật lý |
| **JS code** | ✅ Có (Event Loop) | ❌ Không (trừ Web Workers) |
| **JS I/O** | ✅ Có | ✅ Có (runtime handles) |
| **Ví dụ** | setTimeout, Promise, Event handlers | Web Workers, Worker Threads (Node.js) |

---

# 7. Call Stack & Execution Context

## Call Stack là gì?

**Call Stack** (ngăn xếp lời gọi hàm) là cấu trúc dữ liệu **LIFO** (Last In, First Out — vào sau ra trước) mà JavaScript engine sử dụng để quản lý **Execution Context** (ngữ cảnh thực thi) của các lời gọi hàm. 

Hãy tưởng tượng Call Stack như một **ống khoai tây Pringles** — bạn không thể ăn miếng ở đáy ống mà chưa ăn những miếng ở trên. Tương tự, hàm JavaScript cũng vậy.

Mỗi khi một function được gọi:
1. Một **Execution Context** mới được tạo (chứa biến cục bộ, `this`, scope chain)
2. Context này được **push** lên đỉnh Call Stack
3. JS engine thực thi code trong context ở đỉnh stack
4. Khi function return → context bị **pop** ra → engine tiếp tục context bên dưới

## Execution Context (Ngữ cảnh thực thi)

Execution Context là "môi trường" mà trong đó code JavaScript được đánh giá và thực thi. Có **2 loại**:

### 1. Global Execution Context (GEC)

- Được tạo **tự động** khi file JavaScript bắt đầu chạy
- Chỉ có **duy nhất 1** GEC trong toàn bộ chương trình
- Mọi code **không nằm trong hàm nào** đều chạy trong GEC
- Trong browser: `this` = `window`; trong Node.js: `this` = `module.exports`

### 2. Local (Function) Execution Context

- Được tạo **mỗi khi** một hàm **được gọi** (không phải khai báo)
- Mỗi lần gọi hàm = 1 context mới (kể cả gọi cùng 1 hàm nhiều lần)
- Chứa: biến cục bộ, tham số, `this`, tham chiếu đến scope bên ngoài

```javascript
var name = 'Global';                 // → Nằm trong Global Execution Context

function greet(who) {                // → Khai báo — lưu vào Memory Heap
  var message = 'Hello ' + who;      // → Biến cục bộ trong Local Context
  return message;
}

greet('World');                      // → TẠO Local Execution Context cho greet
                                     //   Chứa: who='World', message='Hello World'
```

```
┌─────────────────────────────────────────────────┐
│           Global Execution Context               │
│                                                  │
│   name = 'Global'                                │
│   greet = [function]                             │
│                                                  │
│   ┌──────────────────────────────────┐          │
│   │  Local Context: greet('World')    │          │
│   │                                   │          │
│   │  who = 'World'                    │          │
│   │  message = 'Hello World'          │          │
│   └──────────────────────────────────┘          │
│                                                  │
└─────────────────────────────────────────────────┘
```

> **Ghi nhớ:** Mỗi khi có hàm lồng nhau (nested function), engine tạo thêm Local Execution Context bên trong Local Context hiện tại. Càng nhiều hàm lồng nhau → càng nhiều context → Call Stack càng cao.

## Minh họa từng bước

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
Bước 1: Global execution context
                ┌───────────────────┐
                │   global()        │
                └───────────────────┘

Bước 2: printSquare(4) được gọi
                ┌───────────────────┐
                │  printSquare(4)   │ ← push
                ├───────────────────┤
                │   global()        │
                └───────────────────┘

Bước 3: printSquare gọi square(4)
                ┌───────────────────┐
                │    square(4)      │ ← push
                ├───────────────────┤
                │  printSquare(4)   │
                ├───────────────────┤
                │   global()        │
                └───────────────────┘

Bước 4: square gọi multiply(4, 4)
                ┌───────────────────┐
                │  multiply(4, 4)   │ ← push (đỉnh stack)
                ├───────────────────┤
                │    square(4)      │
                ├───────────────────┤
                │  printSquare(4)   │
                ├───────────────────┤
                │   global()        │
                └───────────────────┘

Bước 5: multiply return 16 → pop
                ┌───────────────────┐
              ✕ │  multiply(4, 4)   │ → return 16 → pop
                ├───────────────────┤
                │    square(4)      │ ← bây giờ ở đỉnh
                ├───────────────────┤
                │  printSquare(4)   │
                ├───────────────────┤
                │   global()        │
                └───────────────────┘

Bước 6-8: square return 16 → pop, console.log(16), printSquare return → pop
                → Cuối cùng chỉ còn global()
                → Khi script kết thúc → global() cũng pop
                → Call Stack TRỐNG → Event Loop kiểm tra queues
```

## Stack Overflow

```javascript
// Đệ quy không có điểm dừng (base case):
function recurse() {
  recurse();  // Mỗi lần gọi = 1 frame push mới
}
recurse();
// → RangeError: Maximum call stack size exceeded
// → Giới hạn: ~10,000 - 25,000 frames (tùy browser/engine)

// Giải pháp: LUÔN có base case, hoặc dùng iteration thay recursion
function factorialSafe(n) {
  if (n <= 1) return 1;     // ← BASE CASE — điểm dừng
  return n * factorialSafe(n - 1);
}
```

---

# 8. Web APIs / Browser APIs

## Chúng là gì?

Khi làm việc với JavaScript, có nhiều hàm chúng ta dùng hàng ngày nhưng **không phải là một phần của JavaScript**. Chúng được **trình duyệt** (hoặc Node.js) cung cấp thông qua một bộ công cụ gọi là **Web APIs** (trong browser) hoặc **C++ APIs** (trong Node.js thông qua libuv).

| Hàm/API | Thuộc về | KHÔNG phải JS gốc |
|---------|---------|--------|
| `setTimeout`, `setInterval` | Browser API / Node.js Timer | ✅ |
| `fetch`, `XMLHttpRequest` | Browser API (Network) | ✅ |
| `DOM` (document.querySelector, addEventListener...) | Browser API (DOM) | ✅ |
| `console.log` | Browser/Node.js API | ✅ |
| `localStorage`, `sessionStorage` | Browser API (Storage) | ✅ |
| `fs.readFile` | Node.js API (libuv) | ✅ |

> **Quan trọng:** Khi JavaScript engine gặp `setTimeout(callback, 1000)`, nó **không tự đếm thời gian**. Engine chuyển giao việc đó cho trình duyệt (hoặc libuv trong Node.js), rồi **tiếp tục chạy code tiếp theo**. Đó là lý do setTimeout **không block** main thread.

## Quy trình xử lý một hàm bất đồng bộ

```javascript
console.log('Bắt đầu');
setTimeout(function callback() {
  console.log('Hết giờ!');
}, 2000);
console.log('Kết thúc');
```

```
Bước 1: engine chạy console.log('Bắt đầu') → output: "Bắt đầu"

Bước 2: engine gặp setTimeout
         → Đẩy setTimeout vào Call Stack trong tích tắc
         → setTimeout giao callback cho BROWSER API (bộ đếm thời gian)
         → setTimeout bị POP ra khỏi Call Stack NGAY LẬP TỨC
         → Browser bắt đầu đếm 2000ms ở BACKGROUND

Bước 3: engine chạy console.log('Kết thúc') → output: "Kết thúc"
         → Call Stack TRỐNG

Bước 4: (sau 2000ms) Browser đếm xong
         → Đẩy callback vào CALLBACK QUEUE (hàng đợi)

Bước 5: Event Loop kiểm tra: "Call Stack trống không?" → TRỐNG ✅
         → Lấy callback từ Queue → đẩy vào Call Stack
         → Thực thi callback → output: "Hết giờ!"
```

## Bức tranh toàn cảnh

```
┌────────────────┐     ┌─────────────────────┐
│   Call Stack    │     │   Web APIs (Browser) │
│                 │     │                      │
│  [đang chạy]   │────▶│  setTimeout(cb, 2s)  │  ← Browser đếm giờ
│                 │     │  fetch('/api/...')    │  ← Browser gọi mạng
│                 │     │  DOM events          │  ← Browser lắng nghe
└───────┬─────────┘     └──────────┬───────────┘
        │                          │
        │   Event Loop             │ (khi xong)
        │   kiểm tra:              │
        │   Stack trống?    ◀──────┘
        │         │
        ▼         ▼
┌─────────────────────────────┐
│   Callback Queue / Task Queue│
│   [callback1] [callback2]    │  ← Chờ được đưa vào Call Stack
└─────────────────────────────┘
```

---

# 9. Event Loop chi tiết

## Event Loop là gì?

**Định nghĩa:** Event Loop là một **vòng lặp vô hạn** (infinite loop) liên tục kiểm tra: "Call Stack trống chưa? Nếu trống → lấy task từ queue ra thực thi". Nó là **cơ chế cốt lõi** cho phép JavaScript đơn luồng thực hiện concurrency.

## Thuật toán Event Loop (đơn giản hóa)

```
while (true) {
  // Bước 1: Thực thi TẤT CẢ synchronous code trên Call Stack
  //         (cho đến khi Call Stack TRỐNG)

  // Bước 2: Drain Microtask Queue 
  //         → Thực thi TẤT CẢ microtasks hiện có
  //         → Nếu microtask tạo microtask mới → cũng thực thi luôn!
  //         → KHÔNG dừng cho đến khi Microtask Queue TRỐNG

  // Bước 3: Render/Paint (nếu cần — ~60fps = mỗi 16.6ms)
  //         requestAnimationFrame callbacks chạy ở đây
  
  // Bước 4: Lấy ĐÚNG 1 macrotask từ Macrotask Queue
  //         → Thực thi macrotask đó trên Call Stack
  //         → Quay lại Bước 2 (drain microtasks lại!)
}
```

## Minh họa từng bước

```javascript
console.log('🔵 sync 1');                        // A

setTimeout(() => console.log('🟡 timeout'), 0);  // B

Promise.resolve()
  .then(() => console.log('🔴 promise 1'))        // C
  .then(() => console.log('🔴 promise 2'));       // D

console.log('🔵 sync 2');                        // E
```

```
═══ Phase 1: Sync code (Call Stack) ═══

1. A: console.log('🔵 sync 1') → output: "🔵 sync 1"
2. B: setTimeout(cb, 0) → đăng ký timer → callback vào MACROTASK Queue
3. C: Promise.resolve().then(cb) → callback vào MICROTASK Queue
4. E: console.log('🔵 sync 2') → output: "🔵 sync 2"

   Call Stack: TRỐNG ✅
   Microtask Queue: [promise 1 handler]
   Macrotask Queue: [timeout handler]

═══ Phase 2: Drain Microtask Queue ═══

5. Lấy promise 1 handler → thực thi → output: "🔴 promise 1"
   → .then() tạo microtask mới (promise 2 handler)
6. Lấy promise 2 handler → thực thi → output: "🔴 promise 2"

   Call Stack: TRỐNG ✅
   Microtask Queue: TRỐNG ✅
   Macrotask Queue: [timeout handler]

═══ Phase 3: Render (nếu cần) ═══

═══ Phase 4: Lấy 1 Macrotask ═══

7. Lấy timeout handler → thực thi → output: "🟡 timeout"

═══ KẾT QUẢ CUỐI CÙNG ═══
🔵 sync 1
🔵 sync 2
🔴 promise 1
🔴 promise 2
🟡 timeout
```

---

# 10. Microtask vs Macrotask

## Bảng so sánh

| Tiêu chí | Microtask | Macrotask |
|----------|----------|----------|
| **Bao gồm** | `Promise.then/catch/finally`, `queueMicrotask()`, `MutationObserver`, code sau `await` | `setTimeout`, `setInterval`, `setImmediate` (Node), I/O callbacks, UI rendering events |
| **Ưu tiên** | **CAO hơn** — luôn chạy trước | Thấp hơn — chạy sau |
| **Khi nào chạy** | Sau MỖI task hoàn thành, TRƯỚC render | Sau khi microtask queue trống |
| **Drain behavior** | Chạy **TẤT CẢ** cho đến khi queue trống | Chỉ chạy **1** rồi quay lại check microtask |

## Quy tắc vàng

```
Thứ tự ưu tiên:
1️⃣  Synchronous code (Call Stack)         ← LUÔN chạy trước
2️⃣  Microtasks (Promise, queueMicrotask)  ← Chạy TẤT CẢ microtasks
3️⃣  Render/Paint                          ← 60fps
4️⃣  1 Macrotask (setTimeout, I/O)         ← Chỉ 1 task
    → Quay lại 2️⃣
```

## Nested microtasks — Starvation problem

```javascript
// ⚠️ Microtasks có thể BLOCK macrotasks VÀ rendering!
function infiniteMicrotask() {
  queueMicrotask(() => {
    infiniteMicrotask();  // Tạo microtask mới liên tục
  });
}
infiniteMicrotask();
// → Event Loop KHÔNG BAO GIỜ chuyển sang macrotask!
// → Trang web bị ĐÓNG BĂNG!
// → Vì: microtask queue KHÔNG BAO GIỜ trống

// ✅ Giải pháp: Dùng setTimeout để "nhường" cho macrotask queue
function safeRecursion() {
  setTimeout(() => {
    safeRecursion();  // Đưa vào macrotask queue thay vì microtask
  }, 0);
}
```

---

# 11. try/catch/finally

## Định nghĩa

**try/catch/finally** là cơ chế **error handling** (xử lý lỗi) trong JavaScript, cho phép bạn **bắt** và **xử lý** các exceptions (ngoại lệ) mà không làm crash chương trình.

| Keyword | Vai trò |
|---------|---------|
| `try` | Khối code **có thể sinh lỗi** — JS engine "thử" thực thi |
| `catch` | Khối code **xử lý lỗi** — chạy KHI có lỗi xảy ra trong `try` |
| `finally` | Khối code **LUÔN chạy** — dù `try` thành công hay `catch` bắt lỗi |

## Cú pháp và flow

```javascript
try {
  // Code có thể gây lỗi
  const data = JSON.parse(invalidJSON);
  console.log('Parsed:', data);  // SKIP nếu parse lỗi
} catch (error) {
  // Chạy KHI có lỗi trong try
  // error object chứa: message, name, stack
  console.error('Lỗi:', error.message);
} finally {
  // LUÔN chạy — dù lỗi hay không
  // Use case: cleanup resources (close connections, hide loading...)
  console.log('Cleanup done');
}
```

## Flow chi tiết

```
TRY block
    │
    ├── Không lỗi ──→ SKIP catch ──→ FINALLY ──→ Tiếp tục code
    │
    └── Có lỗi ──→ NHẢY đến CATCH ──→ FINALLY ──→ Tiếp tục code
```

## Các trường hợp quan trọng

```javascript
// 1. try/catch KHÔNG bắt được async errors!
try {
  setTimeout(() => {
    throw new Error('Async error');  // ❌ KHÔNG bị catch bắt!
  }, 1000);
} catch (e) {
  console.log('Not caught!');  // KHÔNG BAO GIỜ chạy
}
// Lý do: khi callback trong setTimeout chạy, try/catch ĐÃ XONG rồi

// 2. catch có thể bắt error type cụ thể
try {
  undefined.prop;
} catch (e) {
  if (e instanceof TypeError) {
    console.log('Type error:', e.message);
  } else if (e instanceof RangeError) {
    console.log('Range error');
  } else {
    throw e;  // Re-throw nếu không xử lý được
  }
}

// 3. finally luôn chạy — KỂ CẢ khi có return trong try/catch!
function example() {
  try {
    return 'from try';
  } finally {
    console.log('Finally ran!');  // VẪN CHẠY trước khi return!
  }
}
example();  // Log: 'Finally ran!', return: 'from try'

// 4. finally với async/await
async function fetchData() {
  const loading = showLoading();
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch:', err.message);
    throw err;  // Re-throw để caller biết
  } finally {
    hideLoading();  // LUÔN ẩn loading — dù success hay error
  }
}
```

---

# 12. Câu hỏi phỏng vấn

## Q1: "Single-threaded, non-blocking, asynchronous khác nhau thế nào?"

> **A:** **Single-threaded**: JS engine chỉ có 1 Call Stack → 1 đoạn code tại 1 thời điểm. **Non-blocking**: hàm I/O return ngay, không block main thread (cơ chế gọi). **Asynchronous**: khởi tạo tác vụ bây giờ, xử lý kết quả sau (mô hình xử lý kết quả). Non-blocking là mechanism, async là pattern — chúng liên quan nhưng nói về 2 điều khác nhau.

## Q2: "Tại sao JavaScript single-threaded mà vẫn handle được nhiều requests?"

> **A:** Nhờ **runtime environment** (Browser/Node.js) cung cấp multi-threaded APIs (network, filesystem, timers). JS engine chỉ single-threaded, nhưng I/O được xử lý ở background bởi OS/libuv threads. **Event Loop** là bridge giữa JS code (1 thread) và I/O results (từ nhiều threads) — nó liên tục check "Call Stack trống chưa?" rồi đưa callbacks từ queue vào stack.

## Q3: "Event Loop hoạt động thế nào? Mô tả thuật toán."

> **A:** Event Loop liên tục lặp: (1) Thực thi sync code trên Call Stack đến khi trống → (2) Drain **TẤT CẢ** microtasks (Promise.then, queueMicrotask) → (3) Render nếu cần → (4) Lấy **đúng 1** macrotask (setTimeout, I/O) → quay lại bước 2. Điểm quan trọng: microtasks chạy TẤT CẢ, macrotask chỉ chạy 1 rồi check microtask lại.

## Q4: "Concurrent vs Parallel khác nhau thế nào?"

> **A:** **Concurrent**: xử lý nhiều tasks trong cùng khoảng thời gian bằng cách **xen kẽ** (JS Event Loop — 1 thread làm nhiều việc). **Parallel**: thực thi nhiều tasks **cùng lúc vật lý** trên nhiều threads/cores (Web Workers). JS code là concurrent, không parallel. Nhưng I/O operations CÓ THỂ parallel nhờ runtime.

## Q5: "try/catch có bắt được lỗi async không?"

> **A:** **Không!** `try/catch` chỉ bắt lỗi **synchronous** trong cùng execution context. Lỗi trong `setTimeout` callback hay Promise rejection không bị catch (vì callback chạy trong execution context khác, sau khi try/catch đã kết thúc). Giải pháp: dùng `async/await` + `try/catch` (vì `await` đưa error vào cùng context) hoặc `.catch()` cho Promise.

## Q6: "Giải thích output của đoạn code này"

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
```

> **A:** Output: `1, 4, 3, 2`. Giải thích: (1) `1` — sync. (2) setTimeout → macrotask queue. (3) Promise.then → microtask queue. (4) `4` — sync. Call Stack trống → drain microtask → `3`. Macrotask → `2`. Vì **microtask luôn ưu tiên hơn macrotask**, dù setTimeout delay = 0.

## Q7: "JavaScript Engine là gì? V8 hoạt động thế nào?"

> **A:** JavaScript Engine là phần mềm **đọc, biên dịch, và thực thi** mã JavaScript. Phổ biến nhất là **V8** (Chrome, Node.js), SpiderMonkey (Firefox), JavaScriptCore (Safari). V8 dùng **JIT compilation**: mã nguồn → parse thành AST → **Ignition** chuyển thành bytecode chạy ngay → nếu code "nóng" (chạy nhiều lần) thì **TurboFan** tối ưu thành mã máy cực nhanh. Engine gồm 2 phần chính: **Memory Heap** (lưu biến, hàm, objects) và **Call Stack** (theo dõi hàm đang thực thi).

## Q8: "setTimeout có phải hàm JavaScript không?"

> **A:** **Không!** `setTimeout` (cùng với `fetch`, `console.log`, các hàm DOM...) là **Web API** do trình duyệt cung cấp, không phải JavaScript gốc. Khi engine gặp `setTimeout`, nó giao cho trình duyệt xử lý (đếm giờ ở background thread), rồi tiếp tục chạy code. Khi hết giờ, trình duyệt đẩy callback vào **Callback Queue**, và **Event Loop** chờ Call Stack trống rồi mới đưa callback vào thực thi.

## Q9: "Execution Context là gì? Có mấy loại?"

> **A:** Execution Context (ngữ cảnh thực thi) là "môi trường" để đánh giá và thực thi code JS. Có **2 loại**: (1) **Global Execution Context** — tạo tự động khi chương trình chạy, chỉ có 1, chứa biến và hàm toàn cục. (2) **Local (Function) Execution Context** — tạo mỗi khi gọi hàm, chứa biến cục bộ, tham số, `this`, tham chiếu scope ngoài. Mỗi context được push lên Call Stack khi tạo và pop khi hàm return.

---

> 📅 Tạo ngày: 2026-02-16 | Cập nhật: 2026-02-17
> 📚 Nguồn: ECMAScript Specification, MDN Web Docs, Node.js Documentation, Philip Roberts "What the heck is the Event Loop anyway?", Viblo - JavaScript engines và cách thức hoạt động
> 🎯 Mục tiêu: Hiểu rõ toàn bộ JavaScript Runtime — từ Engine (V8, JIT) đến Execution Context, Web APIs, Event Loop, và các cơ chế bất đồng bộ
