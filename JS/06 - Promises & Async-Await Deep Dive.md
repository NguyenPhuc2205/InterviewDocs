# 📘 JavaScript — Bất đồng bộ, Callback, Promise & Async/Await Deep Dive

> Tài liệu này đào sâu vào **bản chất bất đồng bộ** của JavaScript — từ WHY (tại sao JS là async), HOW (cơ chế hoạt động), đến WHAT (callback → Promise → async/await).

---

## Mục lục

1. [JavaScript là Single-threaded, Non-blocking, Asynchronous — Nghĩa là gì?](#1-bản-chất-bất-đồng-bộ)
2. [Call Stack, Web APIs, Task Queues & Event Loop](#2-call-stack-web-apis-task-queues--event-loop)
3. [Callback — Khởi nguồn Async](#3-callback)
4. [Promise — Giải quyết Callback Hell](#4-promise)
5. [Promise States & Lifecycle](#5-promise-states--lifecycle)
6. [Promise Chaining & Error Handling](#6-promise-chaining--error-handling)
7. [Promise Utility Methods](#7-promise-utility-methods)
8. [Async/Await — Bản chất thật sự](#8-asyncawait-bản-chất)
9. [Callback vs Promise vs Async/Await — So sánh bản chất](#9-so-sánh-bản-chất)
10. [Parallel vs Sequential](#10-parallel-vs-sequential)
11. [Common Mistakes](#11-common-mistakes)
12. [Bài tập đoán output](#12-bài-tập-đoán-output)
13. [Câu hỏi phỏng vấn](#13-câu-hỏi-phỏng-vấn)

---

# 1. Bản chất bất đồng bộ

## JavaScript và mô hình thực thi

JavaScript là ngôn ngữ lập trình chạy trên các engine như V8 (Chrome, Node.js), SpiderMonkey (Firefox), JavaScriptCore (Safari). Về cách thực thi code, nó có 4 đặc tính nền tảng — mỗi cái có ý nghĩa riêng, **không phải đồng nghĩa**:

> JavaScript là ngôn ngữ **single-threaded** (đơn luồng), **non-blocking** (không chặn), **asynchronous** (bất đồng bộ), và **concurrent** (đồng thời) — nhờ Event Loop.

### Single-threaded (Đơn luồng)

**Định nghĩa:** JavaScript engine chỉ có **một thread duy nhất** (main thread) để thực thi code. Nó chỉ có **một Call Stack**, nên tại bất kỳ thời điểm nào engine chỉ thực thi được **một tác vụ duy nhất**.

**Nói đơn giản:** JavaScript chỉ có 1 "bàn tay" để làm việc. Nó chỉ làm được **1 việc tại 1 thời điểm**, không thể chạy 2 đoạn code cùng lúc.

```
JavaScript Engine (V8, SpiderMonkey, JavaScriptCore...)
┌───────────────────────────────┐
│                               │
│   🧵 Main Thread              │  ← CHỈ CÓ MỘT thread duy nhất
│   ┌─────────────────────┐     │
│   │     Call Stack      │     │  ← Ngăn xếp lời gọi hàm (LIFO)
│   │  (Last In First Out)│     │     Tại 1 thời điểm chỉ có
│   │                     │     │     1 execution context trên đỉnh
│   └─────────────────────┘     │
│   ┌─────────────────────┐     │
│   │  Memory Heap        │     │  ← Nơi lưu trữ objects, variables
│   └─────────────────────┘     │
│                               │
└───────────────────────────────┘
```

- Khác với **Java**, **C++**, **Go** — các ngôn ngữ multi-threaded có thể tạo nhiều threads chạy song song
- **Hệ quả:** Nếu một tác vụ tốn 5 giây (heavy computation, gọi API, đọc file...), toàn bộ chương trình bị **đóng băng** (freeze) 5 giây — UI không phản hồi, nút bấm không hoạt động
- **Câu hỏi đặt ra:** Vậy tại sao JavaScript không bị block khi chờ API response?

### Non-blocking (Không chặn)

**Định nghĩa:** Non-blocking nghĩa là các tác vụ I/O như gọi API, đọc file, truy vấn database, timer... **không làm main thread phải chờ**. Thay vào đó, chúng được chuyển giao cho hệ thống bên ngoài (OS kernel, browser APIs, libuv trong Node.js) xử lý, còn main thread **tiếp tục chạy code phía sau ngay lập tức**.

**Nói đơn giản:** Khi JavaScript "gọi điện đặt hàng" (gọi API), nó **không đứng đợi ở máy** cho đến khi hàng tới. Nó đặt hàng xong → đi làm việc khác ngay → khi hàng tới thì mới quay lại xử lý.

```javascript
console.log('Bước 1');              // Sync — thực thi ngay trên Call Stack

fetch('/api/data');                  // Non-blocking! Main thread KHÔNG chờ response!
                                     // Browser/Node.js ủy thác request cho network layer
                                     // Ngay lập tức return Promise (pending)
                                     // Main thread tiếp tục dòng tiếp theo

console.log('Bước 2');              // Thực thi NGAY LẬP TỨC, không chờ fetch

// Khi response về → Promise resolve → .then() handler được đưa vào microtask queue
```

### Asynchronous (Bất đồng bộ)

**Định nghĩa:** Lập trình bất đồng bộ là mô hình trong đó **tác vụ được bắt đầu bây giờ** nhưng **kết quả sẽ xử lý sau** khi tác vụ hoàn thành. Chương trình **không cần chờ** một tác vụ tốn thời gian xong mới chạy tiếp — nó tiếp tục thực thi code phía sau ngay.

**Nói đơn giản:** "Tôi bắt đầu việc A, nhưng không đứng đợi A xong. Tôi làm B, C, D trước. Khi A xong, tôi quay lại xử lý kết quả."

### Non-blocking ≠ Asynchronous — Sự khác biệt

| | Non-blocking | Asynchronous |
|---|---|---|
| **Nói về** | **Cách gọi** — hàm trả về ngay, không chờ | **Cách xử lý kết quả** — kết quả đến sau |
| **Trọng tâm** | Main thread không bị chặn | Thứ tự hoàn thành không cố định |
| **Lấy kết quả** | Bạn phải **tự đi hỏi lại** (polling) | Hệ thống **tự gọi bạn** khi xong (notification) |
| **Ví dụ** | `fetch()` return ngay lập tức (non-blocking) | `.then()` handler chạy *sau khi* response về (async) |
| **Đối lập** | Blocking: `alert()`, `prompt()`, heavy loop | Synchronous: code chạy tuần tự từ trên xuống |

> **Điểm khác biệt cốt lõi:** Non-blocking chỉ nói "hàm trả về ngay, không giữ thread" — nhưng **không nói gì về cách bạn nhận kết quả**. Bạn có thể phải tự check liên tục (polling). Asynchronous nói "khi nào xong, hệ thống sẽ tự thông báo cho bạn" — qua callback, `.then()`, hoặc `await`.
>
> **Ví dụ:** Giống đặt bàn nhà hàng:
> - **Non-blocking (sync polling):** Bạn gọi đặt bàn, họ bảo "chưa có". Bạn cứ 5 phút gọi lại hỏi — bạn không bị giữ tại chỗ (non-blocking) nhưng phải tự check.
> - **Async (notification):** Bạn đặt bàn, họ bảo "có bàn thì chúng tôi gọi lại cho anh" — bạn đi làm việc khác, họ chủ động notify.
>
> Trong JavaScript, `fetch()` là **cả hai**: non-blocking (trả về ngay) VÀ async (kết quả đến qua `.then()`). Đây là lý do hai khái niệm hay bị nhầm — chúng thường xuất hiện cùng nhau trong JS, nhưng về bản chất là độc lập.

### Concurrent (Đồng thời) — nhờ Event Loop

**Định nghĩa:** Concurrency là khả năng **xử lý nhiều tác vụ trong cùng khoảng thời gian**, nhưng **không nhất thiết chạy chúng cùng lúc** (đó là parallelism). JavaScript đạt được concurrency nhờ **Event Loop** — nó xen kẽ giữa các tác vụ, tạo cảm giác "đa nhiệm" dù chỉ có 1 thread.

**Ví dụ:** Tưởng tượng **1 bếp trưởng** chuẩn bị 3 món cùng lúc: nấu canh → trong lúc chờ canh sôi, chuyển sang cắt rau → rồi quay lại canh. Anh ta chỉ có **1 đôi tay** (single-threaded) nhưng xử lý được nhiều món bằng cách xen kẽ → đây là **concurrency**.

**2 bếp trưởng** mỗi người làm 1 món riêng, chạy đồng thời → đây là **parallelism** (như multi-threaded).

JavaScript là bếp trưởng số 1 — concurrent nhưng KHÔNG parallel.

### Tại sao JavaScript là Single-threaded mà vẫn "đa nhiệm"?

**Bí mật:** JavaScript engine (V8) là single-threaded, nhưng **môi trường runtime** (Browser / Node.js) thì **KHÔNG**!

```
┌─────────────────────────────────────────────────────────┐
│                    Runtime Environment                  │
│                 (Browser hoặc Node.js)                  │
│                                                         │
│  ┌──────────────┐   ┌──────────────────────────────┐    │
│  │  JS Engine   │   │     Web APIs / libuv         │    │
│  │  (V8)        │   │  (MULTI-THREADED!)           │    │
│  │              │   │                              │    │
│  │  Call Stack  │──→│  • setTimeout      → Timer   │    │
│  │  (1 thread)  │   │  • fetch()         → Network │    │
│  │              │   │  • DOM events      → UI      │    │
│  │              │   │  • fs.readFile()   → Disk I/O│    │
│  └──────────────┘   │  • crypto          → Worker  │    │
│         ↑           └─────────────┬────────────────┘    │
│         │                         │                     │
│         │    ┌────────────────────▼───────────────┐     │
│         │    │          Task Queues               │     │
│         │    │  ┌─────────────────────────────┐   │     │
│         │    │  │ Microtask Queue (ưu tiên!)  │   │     │
│         │    │  │ Promise.then, async/await   │   │     │
│         │    │  └─────────────────────────────┘   │     │
│         │    │  ┌─────────────────────────────┐   │     │
│         │    │  │ Macrotask Queue             │   │     │
│         │    │  │ setTimeout, setInterval     │   │     │
│         │    │  └─────────────────────────────┘   │     │
│         │    └────────────────────────────────────┘     │
│         │                         │                     │
│    ┌────┴─────────────────────────┴──┐                  │
│    │          Event Loop             │                  │
│    │  "Call Stack trống? → lấy task" │                  │
│    └─────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

> **Kết luận:** JavaScript "đơn luồng" là nói về **JS engine** (V8). Nhưng runtime (Browser/Node.js) cung cấp **multi-threaded APIs** để xử lý I/O ở background. Event Loop là cầu nối giữa 2 thế giới, cho phép JS đạt được **concurrency** (đồng thời) dù chỉ có **1 thread**.

### 📌 Note: Node.js đơn hay đa luồng?

**Chốt:** Node.js chạy JavaScript trên **1 thread duy nhất**. Nhưng bên dưới, Node.js dùng **libuv** với thread pool để xử lý I/O ở background.

```
┌────────────────────────────────────────────┐
│                  Node.js                        │
│                                                │
│  ┌──────────────┐    ┌──────────────────┐  │
│  │  V8 Engine   │    │      libuv          │  │
│  │  (1 thread)  │───▶│  Thread Pool (4)  │  │
│  │              │    │  • fs (file I/O)   │  │
│  │  Code JS     │    │  • crypto          │  │
│  │  chạy ở đây  │    │  • dns.lookup      │  │
│  │              │◀───│  • zlib            │  │
│  └──────────────┘    └──────────────────┘  │
│       ↑ callback khi I/O xong  │                │
└────────────────────────────────────────────┘
```

**Ví dụ với `fs.readFile`:**

```javascript
const fs = require('fs');

fs.readFile('text.txt', 'utf-8', (err, data) => {
  console.log(data);        // Bước 4: callback chạy trên JS thread
});

console.log('Đọc file xong'); // Bước 2: chạy ngay

// Output: 'Đọc file xong' trước, rồi nội dung file sau
```

Thứ tự bên trong:
1. JS thread gọi `fs.readFile()` → libuv chuyển việc đọc file sang **thread pool**
2. JS thread **không chờ** → chạy `console.log('Đọc file xong')` ngay
3. Thread pool đọc xong → đẩy callback vào task queue
4. Event Loop lấy callback → chạy `console.log(data)` trên **JS thread**

> 💡 **Điểm mấu chốt:** Callback vẫn chạy trên JS thread — không có JS thread thứ 2. `while(true) {}` sẽ đóng băng toàn bộ Node.js, chứng minh JS luôn đơn luồng.
>
> **Worker Threads** là cách tạo JS thread thật sự — nhưng mỗi worker có event loop riêng, giống mở thêm 1 Node.js mới, không phải "chia nhỏ" thread cũ. Dùng cho CPU-bound tasks (mã hóa, xử lý ảnh...).

# 2. Call Stack, Web APIs, Task Queues & Event Loop

## Call Stack — Ngăn xếp lời gọi hàm

**Định nghĩa:** Call Stack là cấu trúc dữ liệu **LIFO** (Last In, First Out) mà JavaScript engine dùng để theo dõi các lời gọi hàm đang chạy. Mỗi khi một function được gọi, một frame mới được **push** lên đỉnh stack. Khi function chạy xong, frame đó được **pop** ra khỏi stack.

**Nói đơn giản:** Call Stack giống như một **chồng đĩa** — bạn đặt đĩa mới lên trên cùng (push), và lấy đĩa từ trên cùng ra (pop). Function được gọi cuối cùng sẽ được xử lý trước.

> 📎 **Xem chi tiết**: Execution Context chứa gì, Stack vs Heap, Garbage Collector → **21 - Call Stack, Memory Heap & Execution Model.md**

```javascript
function third()  { console.log('3'); }
function second() { third(); }
function first()  { second(); }
first();
```

```
Bước 1: first() được gọi
                ┌─────────────┐
                │   first()   │ ← push
                └─────────────┘

Bước 2: first() gọi second()
                ┌─────────────┐
                │  second()   │ ← push
                ├─────────────┤
                │   first()   │
                └─────────────┘

Bước 3: second() gọi third()
                ┌─────────────┐
                │   third()   │ ← push (đỉnh stack)
                ├─────────────┤
                │  second()   │
                ├─────────────┤
                │   first()   │
                └─────────────┘

Bước 4: third() chạy xong, return
                ┌─────────────┐
              ✕ │   third()   │ ← pop
                ├─────────────┤
                │  second()   │
                ├─────────────┤
                │   first()   │
                └─────────────┘

Bước 5-6: second() return, first() return
                → Call Stack TRỐNG []
                → Event Loop bắt đầu kiểm tra Task Queues
```

### Stack Overflow — Khi Call Stack bị tràn

```javascript
// ⚠️ Đệ quy không có base case → Call Stack tràn
function infinite() {
  infinite();  // Mỗi lần gọi = 1 frame mới push lên stack
}
infinite();  // RangeError: Maximum call stack size exceeded

// Browser: Call Stack có giới hạn khoảng ~10,000 - 25,000 frames
```

## Event Loop Algorithm

```
while (true) {
  1. Thực thi TẤT CẢ code đồng bộ trên Call Stack

  2. Call Stack trống?
     → Kiểm tra Microtask Queue
     → Thực thi TẤT CẢ microtasks (Promise.then, queueMicrotask, MutationObserver)
     → Nếu microtask tạo thêm microtask → cũng thực thi luôn!

  3. Microtask Queue trống?
     → Render/Paint (nếu cần, ~60fps = mỗi 16.6ms)

  4. Lấy 1 macrotask từ Macrotask Queue
     → Thực thi macrotask đó
     → Quay lại bước 2
}
```

### Microtask vs Macrotask — SỰ KHÁC BIỆT QUYẾT ĐỊNH

| | Microtask | Macrotask |
|---|---|---|
| **Gồm** | `Promise.then/catch/finally`, `queueMicrotask()`, `MutationObserver`, code sau `await` | `setTimeout`, `setInterval`, `setImmediate` (Node), I/O callbacks, UI events |
| **Ưu tiên** | **CAO hơn** — chạy trước | Thấp hơn — chạy sau |
| **Khi nào chạy** | Sau MỖI task (sync hoặc macrotask) và trước render | Sau khi microtask queue trống |
| **Drain behavior** | Chạy **TẤT CẢ** microtasks liên tục | Chỉ chạy **1** macrotask rồi check microtask |

```javascript
// Minh họa thứ tự:
console.log('1 - sync');

setTimeout(() => console.log('2 - macrotask'), 0);

Promise.resolve().then(() => console.log('3 - microtask'));

queueMicrotask(() => console.log('4 - microtask'));

console.log('5 - sync');

// Output: 1, 5, 3, 4, 2
// Giải thích:
// 1, 5: sync code chạy trước
// 3, 4: microtasks chạy trước macrotasks (dù setTimeout delay = 0!)
// 2: macrotask chạy cuối cùng
```

### Microtask "starvation" problem

```javascript
// ⚠️ Microtask có thể BLOCK macrotasks và rendering!
function recursiveMicrotask() {
  Promise.resolve().then(() => {
    recursiveMicrotask();  // Tạo microtask mới liên tục
  });
}
// → Event Loop KHÔNG BAO GIỜ chuyển sang macrotask!
// → Trang web bị ĐÓNG BĂNG!
```

---

# 3. Callback — Khởi nguồn Async

## Callback là gì?

**Định nghĩa:** Callback là một hàm (function) được truyền làm tham số cho hàm khác, và sẽ được hàm đó **gọi lại** tại thời điểm thích hợp — có thể **đồng bộ** (gọi ngay lập tức) hoặc **bất đồng bộ** (gọi sau khi tác vụ bên ngoài hoàn thành, thông qua Event Loop).

Thuật ngữ "callback" xuất phát từ ý nghĩa: bạn truyền function đi, và function đó sẽ được "**called back**" (gọi lại) khi cần.

> **Nói đơn giản:** Callback = function A được **truyền vào** function B **như tham số**, và B sẽ **gọi lại** A vào **thời điểm thích hợp**.

Callback có **2 loại** quan trọng cần phân biệt:

### Synchronous Callback (Callback đồng bộ)

Callback được gọi **ngay lập tức** trong quá trình thực thi của function cha — function cha **chờ callback xong** mới tiếp tục.

```javascript
// forEach gọi callback ĐỒNG BỘ — từng phần tử một, tuần tự
[1, 2, 3].forEach(function(item) {
  console.log(item);  // Callback chạy NGAY, không đợi gì cả
});
console.log('Done');  // Chạy SAU khi forEach hoàn thành
// Output: 1, 2, 3, Done (tuần tự)

// Các sync callbacks phổ biến: map, filter, reduce, sort, every, some
```

### Asynchronous Callback (Callback bất đồng bộ)

Callback được **đăng ký** (registered) nhưng **chưa gọi ngay**. Nó sẽ được gọi **sau** khi tác vụ bất đồng bộ hoàn thành, thông qua **Event Loop** đưa vào Task Queue.

```javascript
// setTimeout đăng ký callback với Timer API — gọi SAU 2 giây
setTimeout(function() {
  console.log('2 giây sau');  // Chạy SAU — khi timer kết thúc
}, 2000);
console.log('Tiếp tục ngay');  // Chạy NGAY, không đợi setTimeout
// Output: 'Tiếp tục ngay', (2s sau) '2 giây sau'
```

## Callback pattern trong thực tế

```javascript
// Node.js — Error-first callback pattern
const fs = require('fs');

fs.readFile('data.txt', 'utf8', function(err, data) {
  // Convention: tham số đầu tiên LUÔN là error
  if (err) {
    console.error('Lỗi đọc file:', err);
    return;
  }
  console.log('Nội dung:', data);
});

// Browser — Event listener callback
document.getElementById('btn').addEventListener('click', function(event) {
  console.log('Button clicked!', event.target);
});
```

## Callback Hell / Pyramid of Doom

```javascript
// ❌ Khi cần nhiều async operations phụ thuộc nhau:
getUser(userId, function(err, user) {
  if (err) { handleError(err); return; }
  
  getPosts(user.id, function(err, posts) {
    if (err) { handleError(err); return; }
    
    getComments(posts[0].id, function(err, comments) {
      if (err) { handleError(err); return; }
      
      getAuthor(comments[0].authorId, function(err, author) {
        if (err) { handleError(err); return; }
        
        console.log(author.name);
        // 😱 4 cấp lồng nhau — "Kim tự tháp địa ngục"
      });
    });
  });
});
```

### Vấn đề của Callbacks:

| Vấn đề | Giải thích |
|---------|-----------|
| **Callback Hell** | Lồng nhau nhiều cấp → khó đọc, khó maintain |
| **Inversion of Control** | Bạn **giao quyền kiểm soát** cho function bên ngoài — nó có thể gọi callback 0 lần, 2 lần, hoặc gọi quá sớm |
| **Error handling phân tán** | Phải check `if (err)` ở MỖI cấp — dễ quên, dễ sai |
| **Không composable** | Khó kết hợp, khó tái sử dụng logic |

---

# 4. Promise — Giải quyết Callback Hell

## Promise là gì?

**Định nghĩa:** Promise là một **object** đại diện cho kết quả của một tác vụ bất đồng bộ — kết quả đó có thể là **thành công hoặc thất bại**, và sẽ có giá trị tại một thời điểm trong tương lai. Nó là chỗ giữ chỗ cho một giá trị chưa biết vào lúc Promise được tạo ra.

> **Nói đơn giản:** Promise = một "**lời hứa**" rằng sẽ trả về kết quả **(thành công hoặc thất bại) trong tương lai**. Giống như khi bạn order đồ ăn online — bạn nhận được một đơn hàng (Promise) ngay lập tức. Đơn hàng đang "pending" (đang giao). Sau đó nó sẽ "fulfilled" (giao thành công) hoặc "rejected" (giao thất bại).

```javascript
const promise = new Promise((resolve, reject) => {
  // Executor function — chạy NGAY LẬP TỨC khi new Promise
  
  const success = true;
  
  if (success) {
    resolve('Dữ liệu thành công');   // Fulfilled
  } else {
    reject(new Error('Có lỗi xảy ra')); // Rejected
  }
});

promise
  .then(data => console.log(data))     // 'Dữ liệu thành công'
  .catch(err => console.error(err));
```

## Promise có phải chỉ là callback "đẹp hơn"?

> **KHÔNG!** Promise khác callback **bản chất**, không chỉ syntax.

### Inversion of Control — Sự khác biệt cốt lõi

```javascript
// ❌ Callback — bạn GỬI function cho thư viện bên ngoài
// Bạn KHÔNG kiểm soát được nó gọi callback khi nào, bao nhiêu lần
thirdPartyLib.doSomething(function callback(result) {
  // Thư viện GỌI callback — bạn bị "đảo ngược quyền kiểm soát"
  // What if:
  //   - Họ gọi callback 2 lần?
  //   - Họ gọi callback quá sớm?
  //   - Họ quên gọi callback?
  //   - Họ gọi callback cả success LẪN error?
});

// ✅ Promise — thư viện TRẢ VỀ Promise, bạn TỰ quyết định làm gì
const promise = thirdPartyLib.doSomething();

// BẠN kiểm soát — gắn handler khi NÀO, bao nhiêu LẦN tùy ý
promise.then(result => {
  // Promise ĐẢM BẢO:
  // ✅ Chỉ resolve/reject MỘT LẦN DUY NHẤT (immutable sau khi settled)
  // ✅ Handlers luôn chạy ASYNC (dù Promise đã settled)
  // ✅ Handler chỉ được gọi 1 lần
});
```

### So sánh chi tiết

| Đặc điểm | Callback | Promise |
|-----------|----------|---------|
| **Kiểm soát** | Giao cho bên thứ 3 (IoC) | Bạn tự kiểm soát (`.then()`) |
| **Gọi bao nhiêu lần** | Không đảm bảo | Đúng 1 lần (immutable) |
| **Composable** | ❌ Khó kết hợp | ✅ Chaining, `Promise.all()` |
| **Error handling** | Mỗi level check riêng | `.catch()` tập trung |
| **Microtask vs Macrotask** | Macrotask (setTimeout) | **Microtask** (ưu tiên hơn!) |
| **Return value** | Không return gì | Trả về Promise mới → chain |
| **Đọc code** | Nesting (pyramid) | Linear (chaining) |

---

# 5. Promise States & Lifecycle

Promise có **đúng 3 trạng thái**, chuyển **1 chiều**, **không quay lại**:

```
         ┌──── resolve(value) ────→ FULFILLED (đã thành công)
         │                         ↓
PENDING ─┤                     .then(onFulfilled)
         │                         
         └──── reject(reason) ────→ REJECTED (đã thất bại)
                                   ↓
                               .catch(onRejected)
```

| Trạng thái | Mô tả | Quy tắc |
|-----------|-------|---------|
| **Pending** | Đang chờ, chưa có kết quả | Trạng thái khởi tạo |
| **Fulfilled** | Đã thành công, có value | Pending → Fulfilled (1 lần duy nhất) |
| **Rejected** | Đã thất bại, có reason | Pending → Rejected (1 lần duy nhất) |
| **Settled** | Đã fulfilled HOẶC rejected | Không bao giờ thay đổi lại |

```javascript
// Khi đã resolve/reject → KHÔNG THỂ thay đổi
const p = new Promise((resolve, reject) => {
  resolve('first');
  resolve('second');   // ❌ Bị bỏ qua
  reject('error');     // ❌ Bị bỏ qua
});

p.then(v => console.log(v));  // 'first'
```

### Executor chạy ĐỒNG BỘ

```javascript
// ⚠️ Code TRONG executor chạy NGAY LẬP TỨC (synchronous)
console.log('A');

new Promise((resolve) => {
  console.log('B');  // Chạy NGAY — sync, không phải async!
  resolve();
  console.log('C');  // Vẫn chạy — resolve KHÔNG dừng executor
});

console.log('D');

// Output: A, B, C, D
```

### `.then()` luôn là microtask — dù Promise đã resolved

```javascript
// ⚠️ Nhiều người tưởng resolve() sẽ trigger .then() ngay lập tức — SAI!
const p = new Promise((resolve) => {
  resolve(1);
  console.log('sau resolve');  // vẫn chạy! resolve không dừng executor
});

p.then(v => console.log(v));
console.log('sau .then()');

// Output: 'sau resolve' → 'sau .then()' → 1
// resolve() đánh dấu Promise là fulfilled,
// nhưng .then() handler luôn được đưa vào MICROTASK QUEUE
// → chờ Call Stack trống rồi mới chạy
```

---

# 6. Promise Chaining & Error Handling

## Chaining

`.then()` **luôn trả về Promise mới** → cho phép chaining:

```javascript
Promise.resolve(1)
  .then(x => x + 1)          // return 2 → Promise.resolve(2)
  .then(x => x * 3)          // return 6 → Promise.resolve(6)
  .then(x => console.log(x)) // 6
  .then(x => console.log(x)); // undefined (console.log trả về undefined)
```

### Return value trong `.then()`

```javascript
// 1. Return giá trị → tạo fulfilled Promise
.then(x => x + 1)          // Promise.resolve(x + 1)

// 2. Return Promise → chờ Promise đó resolve (unwrapping)
.then(x => fetch('/api'))   // Chờ fetch resolve

// 3. Throw error → tạo rejected Promise
.then(x => { throw new Error('boom') })  // → .catch()

// 4. Không return → Promise.resolve(undefined)
.then(x => { console.log(x) })  // return undefined
```

## Error Handling

### `.catch()` — Bắt lỗi tập trung

```javascript
fetch('/api')
  .then(res => res.json())
  .then(data => processData(data))
  .catch(err => {
    // Bắt lỗi từ BẤT KỲ .then() nào phía trên
    console.error('Something failed:', err);
  });
```

### `.then(onFulfilled, onRejected)` vs `.catch()`

```javascript
// ⚠️ onRejected trong .then() KHÔNG bắt lỗi từ onFulfilled cùng dòng
promise.then(
  data => { throw new Error('boom') },  // Lỗi ở đây...
  err => console.log('Not caught!')     // ...KHÔNG bị bắt ở đây!
);

// ✅ .catch() bắt mọi lỗi từ chain phía trước
promise
  .then(data => { throw new Error('boom') })
  .catch(err => console.log('Caught!'));  // 'Caught!'
```

### `.finally()` — Chạy dù thành công hay thất bại

```javascript
fetchData()
  .then(data => process(data))
  .catch(err => showError(err))
  .finally(() => {
    hideLoadingSpinner();  // Luôn chạy, không nhận argument
  });
```

### Error Propagation — Lỗi "nhảy" xuống catch gần nhất

```javascript
Promise.resolve()
  .then(() => { throw new Error('Step 1 failed') })
  .then(() => console.log('Step 2'))       // ❌ SKIP
  .then(() => console.log('Step 3'))       // ❌ SKIP
  .catch(err => {
    console.log('Caught:', err.message);   // 'Caught: Step 1 failed'
    return 'recovered';                     // Trả về giá trị → chain tiếp
  })
  .then(val => console.log(val));          // 'recovered' ✅
```

---

# 7. Promise Utility Methods

## So sánh 4 methods

| Method | Resolve khi | Reject khi | Use case |
|--------|------------|------------|----------|
| `Promise.all()` | **TẤT CẢ** resolve | **BẤT KỲ** reject | Cần tất cả kết quả, fail-fast |
| `Promise.allSettled()` | **TẤT CẢ** settled | **Không bao giờ** reject | Cần biết trạng thái từng Promise |
| `Promise.race()` | **ĐẦU TIÊN** settle | **ĐẦU TIÊN** settle | Timeout, fastest response |
| `Promise.any()` | **ĐẦU TIÊN** resolve | **TẤT CẢ** reject | Fallback servers |

```javascript
const p1 = Promise.resolve(1);
const p2 = Promise.resolve(2);
const p3 = Promise.reject('error');

// Promise.all — Tất cả phải thành công
Promise.all([p1, p2])
  .then(([r1, r2]) => console.log(r1, r2));  // 1, 2

Promise.all([p1, p2, p3])
  .catch(err => console.log(err));  // 'error' — 1 fail = toàn bộ fail

// Promise.allSettled — Chờ tất cả, không quan tâm pass/fail
Promise.allSettled([p1, p2, p3])
  .then(results => console.log(results));
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'fulfilled', value: 2 },
//   { status: 'rejected', reason: 'error' }
// ]

// Promise.race — Ai nhanh nhất thắng (kể cả reject!)
const timeout = new Promise((_, reject) =>
  setTimeout(() => reject('Timeout!'), 5000)
);
Promise.race([fetch('/api'), timeout]);  // Timeout nếu fetch > 5 giây

// Promise.any — Ai resolve đầu tiên (bỏ qua reject)
Promise.any([
  fetch('server1.com'),  // Chậm
  fetch('server2.com'),  // Nhanh → lấy kết quả này
  fetch('server3.com'),  // Chậm
]);
// Nếu TẤT CẢ reject → AggregateError
```

### `Promise.resolve()` & `Promise.reject()` — Tạo nhanh

```javascript
// Tạo fulfilled Promise
Promise.resolve(42).then(v => console.log(v)); // 42

// Tạo rejected Promise
Promise.reject('fail').catch(e => console.log(e)); // 'fail'

// ⚠️ Promise.resolve() với thenable
const thenable = { then(resolve) { resolve('from thenable'); } };
Promise.resolve(thenable).then(v => console.log(v)); // 'from thenable'
```

---

# 8. Async/Await — Bản chất thật sự

## `async` function

```javascript
// async function LUÔN trả về Promise
async function greet() {
  return 'Hello';
}
// Tương đương:
function greet() {
  return Promise.resolve('Hello');
}

greet().then(v => console.log(v)); // 'Hello'

// Nếu throw → rejected Promise
async function fail() {
  throw new Error('Oops');
}
// Tương đương: return Promise.reject(new Error('Oops'))
fail().catch(e => console.log(e.message)); // 'Oops'
```

## `await` — "Tạm dừng" hay "Chờ"?

> **`await` KHÔNG block main thread!** Nó chỉ **tạm dừng chính async function đó** và nhường Call Stack cho code khác.

```javascript
async function main() {
  console.log('1');            // Sync — chạy ngay
  const result = await fetchUser();  // Tạm dừng main(), nhường Call Stack
  console.log('2');            // Chạy SAU khi fetchUser resolve (microtask)
  return result;
}

console.log('A');
main();                        // Bắt đầu main, chạy đến await rồi nhường
console.log('B');              // Chạy NGAY vì main đã nhường
```

```
Timeline:
──[A]──[1]──[await → nhường]──[B]──── ← sync code
                                  └──[2]── ← microtask (resume)
```

## Bản chất "dưới bệ" — Async/Await = Promise + Generator-like state machine

### Hiểu qua Generators (bản chất thật)

```javascript
// Generator function có thể "tạm dừng" và "tiếp tục"
function* myGenerator() {
  console.log('Phần 1');
  yield;                    // Tạm dừng tại đây
  console.log('Phần 2');
  yield;                    // Tạm dừng lại
  console.log('Phần 3');
}

const gen = myGenerator();
gen.next();  // 'Phần 1' — chạy đến yield đầu tiên rồi dừng
gen.next();  // 'Phần 2' — tiếp tục đến yield thứ 2
gen.next();  // 'Phần 3' — tiếp tục đến hết
```

### `async/await` = Generator + Promise scheduler

```javascript
// Khi bạn viết:
async function loadData() {
  const user = await fetchUser();
  const posts = await fetchPosts(user.id);
  return posts;
}

// JavaScript engine CHUYỂN THÀNH (tương đương logic):
function loadData() {
  return new Promise((resolve, reject) => {
    // Bước 1: Gọi fetchUser
    fetchUser()
      .then(user => {
        // Bước 2: Khi fetchUser xong, gọi fetchPosts
        return fetchPosts(user.id);
      })
      .then(posts => {
        // Bước 3: Khi fetchPosts xong, resolve kết quả
        resolve(posts);
      })
      .catch(reject);
  });
}

// Nói cách khác:
// - Code SAU mỗi `await` = callback trong `.then()` tiếp theo
// - `await` = yield control + đăng ký microtask để resume
// - async function = state machine tương tự generator
```

### Step-by-step: Engine thực thi async function

```javascript
async function example() {             // ┐
  console.log('A');                     // │ Phase 1: SYNC
  const x = await Promise.resolve(1);  // ┘ ← Tạm dừng tại đây
                                        //
  console.log('B', x);                 // ┐ Phase 2: MICROTASK
  const y = await Promise.resolve(2);  // ┘ ← Tạm dừng lại
                                        //
  console.log('C', y);                 // ┐ Phase 3: MICROTASK
  return x + y;                        // ┘
}
```

```
Bước 1: example() được gọi
  → 'A' — chạy đồng bộ bình thường
  → Gặp await Promise.resolve(1)
  → Promise đã resolved → đăng ký MICROTASK: "resume example() với value = 1"
  → example() DỪNG, nhường Call Stack

Bước 2: Call Stack trống → Event Loop xử lý microtasks
  → Resume example() tại vị trí dừng, x = 1
  → 'B 1' — chạy đồng bộ
  → Gặp await Promise.resolve(2) → tương tự
  → example() DỪNG lần nữa

Bước 3: Event Loop lại xử lý microtask
  → Resume example() lần cuối, y = 2
  → 'C 2'
  → return 3 → resolve Promise bên ngoài
```

### `await` không chỉ cho Promise!

```javascript
// await với non-Promise → wrap thành Promise.resolve()
async function test() {
  const x = await 42;              // = await Promise.resolve(42)
  const y = await 'hello';         // = await Promise.resolve('hello')
  console.log(x, y);               // 42 'hello'
}

// await với thenable object
const thenable = {
  then(resolve) {
    setTimeout(() => resolve('done'), 1000);
  }
};

async function test2() {
  const result = await thenable;   // Chờ thenable resolve
  console.log(result);              // 'done' (sau 1 giây)
}
```

## Error Handling với try/catch

```javascript
async function fetchData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Failed:', err.message);
    throw err;  // Re-throw nếu cần propagate
  } finally {
    hideLoading();  // Luôn chạy
  }
}
```

---

# 9. Callback vs Promise vs Async/Await — So sánh bản chất

## Cùng 1 bài toán — 3 cách viết

```javascript
// 📋 Bài toán: Đọc user → lấy posts → lấy comments

// === 1. Callback ===
getUser(userId, (err, user) => {
  if (err) return handleError(err);
  getPosts(user.id, (err, posts) => {
    if (err) return handleError(err);
    getComments(posts[0].id, (err, comments) => {
      if (err) return handleError(err);
      console.log(comments);
    });
  });
});

// === 2. Promise ===
getUser(userId)
  .then(user => getPosts(user.id))
  .then(posts => getComments(posts[0].id))
  .then(comments => console.log(comments))
  .catch(handleError);

// === 3. Async/Await ===
async function loadComments() {
  try {
    const user = await getUser(userId);
    const posts = await getPosts(user.id);
    const comments = await getComments(posts[0].id);
    console.log(comments);
  } catch (err) {
    handleError(err);
  }
}
```

## Bảng so sánh tổng thể

| Tiêu chí | Callback | Promise | Async/Await |
|----------|----------|---------|-------------|
| **Bản chất** | Function truyền vào function | Object đại diện kết quả tương lai | Syntax sugar cho Promise |
| **Đọc code** | Nesting → khó đọc | Chaining → tốt hơn | Tuần tự → giống sync |
| **Error handling** | Mỗi level tự check | `.catch()` tập trung | `try/catch` quen thuộc |
| **Composable** | ❌ Rất khó | ✅ `Promise.all()` etc. | ✅ + đọc dễ hơn |
| **Debug** | Stack trace lộn xộn | Tốt hơn callback | **Tốt nhất** — giống sync |
| **Kiểm soát** | Giao cho bên ngoài | Bạn kiểm soát `.then()` | Bạn kiểm soát mọi thứ |
| **Cancel** | ❌ | ❌ (cần AbortController) | ❌ (cần AbortController) |
| **Ra đời** | Từ đầu | ES2015 (ES6) | ES2017 (ES8) |

> **Quan hệ:** Callback là nền tảng → Promise được xây **TRÊN** callback (`.then()` vẫn nhận callback) → Async/Await là syntax sugar **TRÊN** Promise. Nhưng mỗi bước tiến mang theo **cải tiến thiết kế**, không chỉ syntax.

### Cancel request với AbortController

Cả 3 đều không có cancel tích hợp sẵn. Muốn hủy request giữa chừng, dùng **AbortController**:

```javascript
const controller = new AbortController();

// Truyền signal vào fetch
fetch('/api/data', { signal: controller.signal })
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('Request đã bị hủy');
    }
  });

// Hủy request sau 5 giây
setTimeout(() => controller.abort(), 5000);

// Với async/await:
async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
    const res = await fetch(url, { signal: controller.signal });
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}
```

---

# 10. Parallel vs Sequential

## Sequential — Chạy lần lượt (chậm)

```javascript
async function sequential() {
  const user = await fetchUser();     // 2 giây
  const posts = await fetchPosts();   // 2 giây
  const comments = await fetchComments(); // 2 giây
  // Tổng: 6 giây — vì chờ lần lượt!
}
```

## Parallel — Chạy cùng lúc (nhanh)

```javascript
async function parallel() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),      // 2 giây ┐
    fetchPosts(),     // 2 giây ├── Chạy song song
    fetchComments(),  // 2 giây ┘
  ]);
  // Tổng: 2 giây — nhanh gấp 3!
}
```

## Khi nào Sequential, khi nào Parallel?

```javascript
// Sequential — khi bước sau PHỤ THUỘC bước trước
async function dependent() {
  const user = await fetchUser(userId);
  const posts = await fetchPosts(user.id);  // Cần user.id
  const comments = await fetchComments(posts[0].id);
}

// Parallel — khi các bước ĐỘC LẬP nhau
async function independent() {
  const [user, products, notifications] = await Promise.all([
    fetchUser(userId),
    fetchProducts(),        // Không cần user
    fetchNotifications(),   // Không cần user
  ]);
}

// Mixed — phần nào độc lập thì song song
async function mixed() {
  const user = await fetchUser(userId);  // Cần user trước

  const [posts, settings] = await Promise.all([
    fetchPosts(user.id),     // Cần user.id, nhưng
    fetchSettings(user.id),  // hai cái ĐỘC LẬP nhau → parallel
  ]);
}
```

---

# 11. Common Mistakes

## ❌ Quên `await`

```javascript
async function bad() {
  const data = fetch('/api');  // data = Promise, KHÔNG PHẢI response!
  console.log(data);           // Promise { <pending> }
}

// ✅ Fix
async function good() {
  const res = await fetch('/api');
  const data = await res.json();
}
```

## ❌ `await` trong loop — không song song

```javascript
// ❌ Sequential — chậm!
const ids = [1, 2, 3, 4, 5];
for (const id of ids) {
  await processItem(id);  // Chờ từng cái một → 5x chậm hơn
}

// ✅ Parallel — nhanh!
await Promise.all(ids.map(id => processItem(id)));

// ✅ Parallel nhưng giới hạn concurrency
async function parallelLimit(items, limit, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}
await parallelLimit(ids, 3, processItem); // 3 lần cùng lúc
```

## ❌ Unhandled Promise Rejection

```javascript
// ❌ Không catch — crash process trong Node.js!
async function risky() {
  const data = await fetch('/bad-url');
}
risky();  // Unhandled rejection!

// ✅ Luôn catch
risky().catch(err => console.error(err));

// ✅ Global handler
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled:', reason);
});

// Browser:
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled:', event.reason);
});
```

## ❌ Dùng async callback trong `.forEach()`

```javascript
// ❌ forEach KHÔNG đợi async callbacks
[1, 2, 3].forEach(async (n) => {
  await processItem(n);  // forEach không biết await
});
console.log('Done');  // In TRƯỚC khi processItem xong!

// ✅ Dùng for...of (sequential)
for (const n of [1, 2, 3]) {
  await processItem(n);
}
console.log('Done');  // In SAU khi tất cả xong

// ✅ Dùng map + Promise.all (parallel)
await Promise.all([1, 2, 3].map(n => processItem(n)));
console.log('Done');
```

## ❌ Return trong `.then()` quên return

```javascript
// ❌ Quên return → chain nhận undefined
fetch('/api')
  .then(res => {
    res.json();           // Thiếu return! → next .then nhận undefined
  })
  .then(data => {
    console.log(data);    // undefined 😱
  });

// ✅ Fix
fetch('/api')
  .then(res => res.json())  // return ngầm (arrow function)
  .then(data => console.log(data));
```

---

# 12. Bài tập đoán output

## Bài 1 — Microtask vs Macrotask
```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
```
<details>
<summary>Đáp án</summary>

**1, 4, 3, 2**
- `1`, `4`: sync
- `3`: microtask (Promise) — chạy trước macrotask
- `2`: macrotask (setTimeout) — chạy cuối
</details>

## Bài 2 — async/await execution order
```javascript
async function foo() {
  console.log('1');
  await Promise.resolve();
  console.log('2');
}

console.log('A');
foo();
console.log('B');
```
<details>
<summary>Đáp án</summary>

**A, 1, B, 2**
- `A`: sync
- `foo()` → `1`: sync, `await` → tạm dừng foo, nhường Call Stack
- `B`: sync (Call Stack tiếp tục)
- `2`: microtask (phần sau await)
</details>

## Bài 3 — Promise.resolve trong .then
```javascript
Promise.resolve()
  .then(() => {
    console.log('1');
    return Promise.resolve('2');
  })
  .then(val => console.log(val));

Promise.resolve()
  .then(() => console.log('3'))
  .then(() => console.log('4'));
```
<details>
<summary>Đáp án</summary>

**1, 3, 4, 2**
- Microtask 1: log `1`, return `Promise.resolve('2')` → tạo thêm 2 microtask để unwrap  
- Microtask 2: log `3`
- Microtask 3: log `4`
- Microtask 4: resolve inner Promise → log `2`

Lý do: khi `.then()` return Promise (thenable), V8 cần 2 extra microtasks để unwrap.
</details>

## Bài 4 — Phức hợp
```javascript
console.log('start');

setTimeout(() => console.log('timeout'), 0);

Promise.resolve()
  .then(() => {
    console.log('promise 1');
    setTimeout(() => console.log('inner timeout'), 0);
  })
  .then(() => console.log('promise 2'));

queueMicrotask(() => console.log('microtask'));

console.log('end');
```
<details>
<summary>Đáp án</summary>

**start, end, promise 1, microtask, promise 2, timeout, inner timeout**

1. `start`, `end`: sync
2. Microtask queue: `promise 1` (.then), `microtask` (queueMicrotask)  
3. `promise 1` chạy → schedule `inner timeout` macrotask → `.then()` tạo microtask cho `promise 2`
4. `microtask` chạy
5. `promise 2` chạy (microtask từ bước 3)
6. Macrotask: `timeout` (scheduled trước `inner timeout`)
7. Macrotask: `inner timeout`
</details>

## Bài 5 — async/await vs Promise
```javascript
async function async1() {
  console.log('async1 start');
  await async2();
  console.log('async1 end');
}

async function async2() {
  console.log('async2');
}

console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);
async1();
new Promise((resolve) => {
  console.log('promise1');
  resolve();
}).then(() => console.log('promise2'));
console.log('script end');
```
<details>
<summary>Đáp án</summary>

**script start, async1 start, async2, promise1, script end, async1 end, promise2, setTimeout**

1. `script start`: sync
2. `async1()` → `async1 start` (sync), gọi `async2()` → `async2` (sync), `await` → dừng async1
3. `promise1`: sync (executor chạy đồng bộ)
4. `script end`: sync
5. Microtask queue: `async1 end` (resume async1), `promise2` (.then)
6. `setTimeout`: macrotask — chạy cuối
</details>

---

# 13. Câu hỏi phỏng vấn

## Q1: "JavaScript là single-threaded — vậy tại sao không bị block?"

> **A:** Bản thân JS engine chỉ có 1 thread, 1 Call Stack. Nhưng nó không chạy một mình — môi trường runtime (browser hoặc Node.js) cung cấp các API đa luồng để xử lý tác vụ nặng ở background như network, timer, file I/O. Khi tác vụ xong, kết quả được đưa vào Task Queue. Event Loop cứ chờ Call Stack trống rồi lấy task từ queue đẩy vào xử lý. Nhờ cơ chế này mà JS "đơn luồng" nhưng vẫn không bị chặn.

## Q2: "Callback với Promise khác nhau bản chất gì?"

> **A:** Vấn đề lớn nhất của callback là bạn **mất quyền kiểm soát** — bạn giao function của mình cho thư viện bên ngoài, không biết nó gọi bao nhiêu lần, gọi đúng lúc không. Promise giải quyết điều này: thư viện trả về một object Promise, bạn **chủ động** gắn `.then()` khi nào bạn muốn. Và Promise đảm bảo: chỉ resolve hoặc reject **đúng 1 lần duy nhất**, lỗi được truyền xuống `.catch()` tập trung, handlers luôn chạy bất đồng bộ qua microtask.

## Q3: "async/await có phải chỉ là syntax sugar?"

> **A:** Đúng, async/await chỉ là cách viết khác của Promise. Nhưng nó quan trọng vì code đọc tuần tự như đồng bộ, debug dễ hơn hẳn, và xử lý lỗi bằng `try/catch` quen thuộc. Bên dưới, engine chuyển async function thành một state machine — mỗi `await` là 1 điểm dừng, code phía sau `await` thực chất chạy như `.then()` callback (trong microtask). `await` KHÔNG block main thread, chỉ tạm dừng chính function đó.

## Q4: "Microtask với Macrotask khác gì nhau?"

> **A:** Microtask (điển hình là `.then()`, `queueMicrotask`, code sau `await`) có **ưu tiên cao hơn** macrotask (`setTimeout`, `setInterval`, I/O callback). Sau mỗi task, Event Loop sẽ **chạy hết toàn bộ** microtask queue trước rồi mới lấy macrotask tiếp theo. Và nếu microtask tạo thêm microtask mới, nó cũng được chạy luôn. Cho nên `Promise.resolve().then(...)` luôn chạy trước `setTimeout(..., 0)` dù cả hai đều delay = 0.

## Q5: "Promise.all, allSettled, race, any khác nhau chỗ nào?"

> **A:** `Promise.all` yêu cầu **tất cả thành công** — chỉ cần 1 cái reject là toàn bộ fail. `allSettled` chờ tất cả hoàn thành rồi trả về trạng thái từng cái, không bao giờ reject. `race` lấy kết quả **ai xong trước** thì dùng, kể cả reject — hay dùng cho timeout pattern. `any` chỉ quan tâm ai **resolve trước**, bỏ qua reject — trừ khi tất cả đều reject thì ném AggregateError. Dùng `any` cho fallback servers.

## Q6: "`await` có 'chờ' không? Nó chờ ở đâu?"

> **A:** `await` không chờ theo kiểu block thread. Khi gặp `await`, engine **tạm dừng chính async function đó** rồi **nhường Call Stack** cho code khác chạy tiếp. Khi Promise settle, engine đăng ký microtask để tiếp tục function từ chỗ dừng. Main thread luôn tự do — chỉ function đó bị "đóng băng" tạm thời. Vì vậy code phía sau `await` thực chất chạy trong microtask, giống hệt `.then()` callback.

## Q7: "Node.js đơn luồng hay đa luồng?"

> **A:** Node.js chạy JavaScript trên 1 thread duy nhất, nhưng dùng thread pool của libuv để xử lý I/O ở background — nên mới non-blocking được. Code JS không bao giờ chạy song song trong cùng 1 process — `while(true){}` đóng băng toàn bộ là chứng minh rõ nhất. Nếu cần chạy JS thật sự đa luồng (CPU-bound), dùng Worker Threads — mỗi worker có event loop riêng, giống mở thêm 1 Node.js mới.

---

> 📅 Cập nhật: 2026-02-19
> 📚 Nguồn: MDN Web Docs, ECMAScript Specification, V8 Blog, Jake Archibald - In The Loop
> 🎯 Mục tiêu: Hiểu tận gốc bất đồng bộ JS — từ kiến trúc runtime đến microtask scheduling
