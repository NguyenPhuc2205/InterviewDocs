# 🔄 Event Loop: Browser vs Node.js — Giống hay Khác?

> **TL;DR**: Cùng concept, **khác implementation**. Browser Event Loop tối ưu cho UI, Node.js Event Loop tối ưu cho I/O.

---

## 1. Câu trả lời ngắn cho phỏng vấn

> "Event Loop trong browser và Node.js **cùng concept** — đều là cơ chế xử lý bất đồng bộ trên single-threaded JavaScript. Nhưng **implementation hoàn toàn khác nhau**:
> - Browser Event Loop do **trình duyệt** quản lý, tối ưu cho **UI rendering** (60fps), dùng **Web APIs** để xử lý async.
> - Node.js Event Loop do **libuv** (thư viện C) quản lý, tối ưu cho **I/O operations**, có **6 phases rõ ràng** và thêm `process.nextTick()`, `setImmediate()` mà browser không có."

---

## 2. So sánh tổng quan

| Tiêu chí | 🌐 Browser Event Loop | 🟢 Node.js Event Loop |
|---|---|---|
| **Mục tiêu chính** | UI mượt (60fps), phản hồi user | Xử lý I/O hiệu quả, nhiều connections |
| **Ai quản lý** | Browser engine (Blink, Gecko...) | **libuv** (thư viện C) |
| **Async handler** | **Web APIs** (do browser cung cấp) | **libuv thread pool** + OS async I/O |
| **Cấu trúc** | 2 queues: Macrotask + Microtask | **6 phases** + Microtask queue |
| **Có Rendering** | ✅ Có (paint, layout, animation) | ❌ Không (server, không có UI) |
| **`setImmediate()`** | ❌ Không có | ✅ Có (check phase) |
| **`process.nextTick()`** | ❌ Không có | ✅ Có (ưu tiên cao nhất) |
| **`requestAnimationFrame`** | ✅ Có (trước rendering) | ❌ Không có |
| **DOM APIs** | ✅ `document`, `window` | ❌ Không có |
| **File System** | ❌ Không có | ✅ `fs` module |
| **Thread Pool** | Browser tự quản lý | libuv thread pool (mặc định 4) |

---

## 3. Browser Event Loop — Chi tiết

### 3.1 Các thành phần

```
┌──────────────────────────────────────────────────────┐
│                    BROWSER                            │
│                                                       │
│  ┌─────────────┐    ┌──────────────────────┐          │
│  │  Call Stack  │    │      Web APIs        │          │
│  │ (V8 Engine)  │───>│  setTimeout()        │          │
│  │             │    │  fetch()             │          │
│  │ Chạy sync   │    │  addEventListener()  │          │
│  │ code ở đây  │    │  geolocation         │          │
│  └──────┬──────┘    └──────────┬───────────┘          │
│         │                      │                      │
│         │    ┌─────────────────▼──────────────┐       │
│         │    │        Callback Queues          │       │
│         │    │  ┌───────────────────────────┐  │       │
│         │    │  │ Microtask Queue (ưu tiên) │  │       │
│         │    │  │ Promise.then(), queueMicro │  │       │
│         │    │  └───────────────────────────┘  │       │
│         │    │  ┌───────────────────────────┐  │       │
│         │    │  │ Macrotask Queue           │  │       │
│         │    │  │ setTimeout, click, fetch  │  │       │
│         │    │  └───────────────────────────┘  │       │
│         │    └───────────────────┬────────────┘       │
│         │                        │                    │
│  ┌──────▼────────────────────────▼──────────┐         │
│  │             EVENT LOOP                    │         │
│  │  1. Chạy hết sync code (Call Stack)       │         │
│  │  2. Xử lý HẾT Microtask Queue            │         │
│  │  3. Rendering (paint, layout, rAF)        │         │
│  │  4. Lấy 1 Macrotask → chạy               │         │
│  │  5. Quay lại bước 2                       │         │
│  └───────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────┘
```

### 3.2 Thứ tự thực thi trong mỗi tick

```
Sync code → Microtasks (TẤT CẢ) → Rendering → 1 Macrotask → lặp lại
```

1. **Call Stack rỗng** → kiểm tra Microtask Queue
2. **Xử lý HẾT microtasks** (Promise.then, queueMicrotask) — chạy hết, không dừng giữa chừng
3. **Rendering** (nếu cần) — layout, paint, `requestAnimationFrame`
4. **Lấy 1 macrotask** từ Macrotask Queue (setTimeout, click event, fetch callback...)
5. **Quay lại bước 1**

### 3.3 Web APIs — Cái mà Node.js KHÔNG có

Web APIs là các tính năng do **browser cung cấp** (viết bằng C++), không phải JavaScript thuần:

```javascript
// Các Web APIs chỉ có trong browser:
setTimeout()          // Timer
fetch()               // HTTP requests
addEventListener()    // DOM events (click, scroll...)
requestAnimationFrame // Animation loop (trước rendering)
navigator.geolocation // GPS
localStorage          // Client-side storage
WebSocket             // Real-time connection
Web Workers           // Multi-threading trong browser
```

Khi bạn gọi `setTimeout(fn, 1000)`:
1. V8 giao cho **Web API** (không phải JS engine tự đếm)
2. Browser đếm 1 giây ở background
3. Hết 1 giây → đẩy `fn` vào **Macrotask Queue**
4. Event Loop lấy ra khi Call Stack rỗng

---

## 4. Node.js Event Loop — Chi tiết

### 4.1 Các thành phần

```
┌──────────────────────────────────────────────────────┐
│                    NODE.JS                            │
│                                                       │
│  ┌─────────────┐    ┌──────────────────────┐          │
│  │  Call Stack  │    │    Node.js APIs      │          │
│  │ (V8 Engine)  │───>│  fs, http, crypto    │          │
│  │             │    │  path, net, dns      │          │
│  │ Chạy sync   │    │                      │          │
│  │ code ở đây  │    └──────────┬───────────┘          │
│  └──────┬──────┘               │                      │
│         │              ┌───────▼───────┐               │
│         │              │    libuv      │               │
│         │              │ (C library)   │               │
│         │              │              │               │
│         │              │ Thread Pool  │               │
│         │              │ (4 threads)  │               │
│         │              └───────┬───────┘               │
│         │                      │                      │
│  ┌──────▼──────────────────────▼──────────────────┐    │
│  │              EVENT LOOP (6 phases)              │    │
│  │                                                 │    │
│  │  ┌─── Microtasks ────────────────────────────┐  │    │
│  │  │ process.nextTick() → Promise.then()       │  │    │
│  │  │ (chạy GIỮA mỗi phase)                    │  │    │
│  │  └───────────────────────────────────────────┘  │    │
│  │                                                 │    │
│  │  Phase 1: Timers       (setTimeout, setInterval)│    │
│  │       ↓ microtasks                              │    │
│  │  Phase 2: Pending Callbacks (deferred I/O)      │    │
│  │       ↓ microtasks                              │    │
│  │  Phase 3: Idle, Prepare (internal)              │    │
│  │       ↓ microtasks                              │    │
│  │  Phase 4: Poll         (I/O events) ← CHÍNH    │    │
│  │       ↓ microtasks                              │    │
│  │  Phase 5: Check        (setImmediate)           │    │
│  │       ↓ microtasks                              │    │
│  │  Phase 6: Close        (socket.on('close'))     │    │
│  │       ↓ microtasks                              │    │
│  │  ────── Quay lại Phase 1 ──────                 │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 4.2 Điểm khác biệt CỐT LÕI so với Browser

**1. Có 6 phases rõ ràng** (browser chỉ có 2 queues)

**2. Microtasks chạy GIỮA mỗi phase** — không phải sau mỗi macrotask:
```
Phase 1 (Timers) → xử lý HẾT microtasks
→ Phase 2 (Pending) → xử lý HẾT microtasks  
→ Phase 3 (Idle) → xử lý HẾT microtasks
→ Phase 4 (Poll) → xử lý HẾT microtasks
→ Phase 5 (Check) → xử lý HẾT microtasks
→ Phase 6 (Close) → xử lý HẾT microtasks
→ Quay lại Phase 1
```

**3. Có `process.nextTick()`** — ưu tiên cao hơn cả Promise:
```javascript
// Thứ tự trong Node.js:
process.nextTick()  // 1️⃣ Cao nhất
Promise.then()      // 2️⃣
setTimeout()        // 3️⃣ (Timers phase)
setImmediate()      // 4️⃣ (Check phase)
```

**4. Có `setImmediate()`** — chạy ở Check phase, sau Poll phase

**5. KHÔNG có Rendering step** — vì server không có UI

**6. Poll phase có thể BLOCK** — nếu không có gì làm, Event Loop đợi ở poll cho đến khi có I/O event mới hoặc timer hết hạn

---

## 5. So sánh bằng code

### 5.1 Code giống nhau — chạy cùng kết quả ở cả hai môi trường

```javascript
console.log('1');                              // Sync
setTimeout(() => console.log('2'), 0);         // Macrotask
Promise.resolve().then(() => console.log('3'));// Microtask
console.log('4');                              // Sync

// Output cả browser lẫn Node.js: 1, 4, 3, 2
// Giải thích: Sync trước → Microtask → Macrotask
```

### 5.2 Code KHÁC KẾT QUẢ — chỉ chạy được ở Node.js

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);
setImmediate(() => console.log('3'));           // ❌ Browser không có
Promise.resolve().then(() => console.log('4'));
process.nextTick(() => console.log('5'));       // ❌ Browser không có

console.log('6');

// Node.js output: 1, 6, 5, 4, 2, 3
// (2 và 3 có thể swap ở top-level context)
```

### 5.3 Trick question: `setImmediate` vs `setTimeout` trong I/O callback

```javascript
const fs = require('fs');

fs.readFile('file.txt', () => {
  setTimeout(() => console.log('setTimeout'), 0);
  setImmediate(() => console.log('setImmediate'));
});

// Output LUÔN LÀ:
// setImmediate
// setTimeout

// Tại sao? Vì callback của readFile chạy ở Poll phase.
// Sau Poll → Check phase (setImmediate) → Timers phase (setTimeout)
// Nên setImmediate LUÔN trước setTimeout khi ở trong I/O callback.
```

### 5.4 Trick question: Browser rendering và microtasks

```javascript
// Chỉ ở BROWSER:
document.body.style.backgroundColor = 'red';
Promise.resolve().then(() => {
  document.body.style.backgroundColor = 'blue';
});

// User thấy gì? → Chỉ thấy BLUE!
// Vì: set red → microtask chạy ngay → set blue → rồi mới rendering
// Rendering chỉ xảy ra sau khi microtask queue rỗng
```

---

## 6. Giải thích sâu: Tại sao khác nhau?

### 6.1 Vì MỤC ĐÍCH khác nhau

```
BROWSER:
  Mục tiêu #1: UI mượt mà (60fps = 16.7ms/frame)
  → Cần Rendering step giữa các tasks
  → Cần requestAnimationFrame
  → Cần ưu tiên user interactions (click, scroll)

NODE.JS:
  Mục tiêu #1: Xử lý I/O hiệu quả
  → Cần Poll phase để đợi I/O events
  → Cần Thread Pool cho heavy I/O
  → Cần setImmediate cho code sau I/O
  → KHÔNG cần rendering
```

### 6.2 Vì IMPLEMENTATION khác nhau

```
BROWSER:
  Event Loop = part of browser engine (Blink, Gecko, WebKit)
  Async = Web APIs (browser-native, C++)
  Spec = HTML Living Standard (whatwg.org)

NODE.JS:
  Event Loop = libuv (C library, open-source)
  Async = libuv thread pool + OS-level async I/O
  Spec = libuv documentation + Node.js docs
```

### 6.3 Vì MICROTASK TIMING khác nhau

```
BROWSER:
  Sau MỖI macrotask → xử lý HẾT microtasks → rendering → macrotask tiếp

NODE.JS:
  Giữa MỖI phase → xử lý HẾT microtasks → phase tiếp
  (Lưu ý: trước Node v11, microtasks chỉ chạy giữa phases,
   từ v11+ cũng chạy giữa các callbacks TRONG cùng 1 phase)
```

---

## 7. Bảng tổng hợp Microtask & Macrotask

### 7.1 Browser

| Loại | Ví dụ | Ưu tiên |
|---|---|---|
| **Microtask** | `Promise.then/catch/finally`, `queueMicrotask()`, `MutationObserver` | Cao |
| **Macrotask** | `setTimeout`, `setInterval`, `click/keyboard events`, `fetch callback`, `MessageChannel` | Thấp |
| **Rendering** | `requestAnimationFrame`, Layout, Paint | Giữa micro và macro |

### 7.2 Node.js

| Loại | Ví dụ | Ưu tiên |
|---|---|---|
| **`process.nextTick()`** | `process.nextTick(fn)` | **Cao nhất** |
| **Microtask** | `Promise.then/catch/finally`, `queueMicrotask()` | Cao |
| **Timers** | `setTimeout`, `setInterval` | Phase 1 |
| **I/O Callbacks** | `fs.readFile`, `http.get` | Phase 2 & 4 |
| **`setImmediate()`** | `setImmediate(fn)` | Phase 5 |
| **Close** | `socket.on('close')` | Phase 6 |

---

## 8. Cách trả lời phỏng vấn

### Câu hỏi: "Event Loop trong browser và Node.js có giống nhau không?"

> "**Cùng concept, khác implementation.**
>
> **Giống nhau**: Cả hai đều là cơ chế cho phép JavaScript single-threaded xử lý bất đồng bộ. Cả hai đều có Call Stack, Microtask Queue (Promise.then), và Macrotask Queue (setTimeout). Và cả hai đều ưu tiên microtasks trước macrotasks.
>
> **Khác nhau ở 5 điểm chính:**
>
> **Thứ nhất, ai quản lý**: Browser Event Loop do browser engine quản lý, dùng **Web APIs** (setTimeout, fetch, DOM events). Node.js Event Loop do **libuv** quản lý, dùng **thread pool** và OS-level async I/O.
>
> **Thứ hai, cấu trúc**: Browser chỉ có 2 queues — Microtask và Macrotask. Node.js có **6 phases** rõ ràng: Timers → Pending → Idle → Poll → Check → Close.
>
> **Thứ ba, rendering**: Browser có **Rendering step** giữa microtasks và macrotask kế tiếp — cần thiết cho UI 60fps. Node.js **không có rendering** vì đây là server.
>
> **Thứ tư, APIs riêng**: Node.js có `process.nextTick()` (ưu tiên cao nhất) và `setImmediate()` (check phase) mà browser không có. Browser có `requestAnimationFrame` và DOM APIs mà Node.js không có.
>
> **Thứ năm, microtask timing**: Từ Node.js v11+, microtasks chạy giữa mỗi phase và cả giữa các callbacks trong cùng phase — tương tự browser. Trước v11 thì khác."

### Câu hỏi follow-up: "`setTimeout(fn, 0)` hoạt động khác nhau thế nào?"

> "Ở **browser**: `setTimeout(fn, 0)` thực tế có minimum delay khoảng **4ms** (theo HTML spec). Callback được đưa vào Macrotask Queue, chạy sau khi microtasks và rendering hoàn tất.
>
> Ở **Node.js**: `setTimeout(fn, 0)` được đẩy vào **Timers phase**. Thời gian thực tế phụ thuộc vào thời điểm Event Loop đang ở phase nào. Nếu đang ở Poll phase và timer đã hết hạn, nó sẽ quay về Timers phase ở tick tiếp theo."

### Câu hỏi follow-up: "Tại sao cần biết sự khác biệt này?"

> "Vì khi viết **isomorphic/universal JavaScript** — code chạy cả browser lẫn server (SSR với Next.js chẳng hạn) — bạn cần biết rằng timing behavior có thể khác nhau. Ví dụ, `setImmediate()` chỉ có ở Node.js, `requestAnimationFrame` chỉ có ở browser. Hiểu điều này giúp tránh bugs khó debug khi code chạy khác nhau ở 2 môi trường."

---

## 9. Bài tập tự kiểm tra

### Bài 1: Output là gì? (Cả browser và Node.js)
```javascript
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
Promise.resolve().then(() => setTimeout(() => console.log('D'), 0));
Promise.resolve().then(() => console.log('E'));
console.log('F');
```

<details>
<summary>Đáp án</summary>

**Cả browser lẫn Node.js: A, F, C, E, D, B**
- Sync: A, F
- Microtasks: C, E (Promise D tạo setTimeout mới → thêm vào macrotask queue)
- Macrotasks: B (thêm trước), D (thêm bởi microtask)

Lưu ý: B trước D vì B được đăng ký trước D.
</details>

### Bài 2: Output là gì? (Chỉ Node.js)
```javascript
setImmediate(() => console.log('A'));
setTimeout(() => console.log('B'), 0);
process.nextTick(() => console.log('C'));
Promise.resolve().then(() => console.log('D'));
```

<details>
<summary>Đáp án</summary>

**C, D, B hoặc A, A hoặc B** (B và A có thể swap ở top-level)
- `process.nextTick` → C (cao nhất)
- `Promise.then` → D (microtask)
- `setTimeout` vs `setImmediate` → order không deterministic ở top-level

Trong I/O callback thì setImmediate LUÔN trước setTimeout.
</details>

### Bài 3: User thấy màu gì? (Chỉ Browser)
```javascript
document.body.style.background = 'red';

setTimeout(() => {
  document.body.style.background = 'green';
}, 0);

Promise.resolve().then(() => {
  document.body.style.background = 'blue';
});
```

<details>
<summary>Đáp án</summary>

User thấy **BLUE → rồi GREEN** (có thể chỉ thấy green vì transition quá nhanh).

- Set red → chưa render
- Microtask: set blue → chưa render  
- Rendering: paint **blue** (red bị override bởi blue)
- Macrotask: set green → rendering lại → paint **green**

User KHÔNG BAO GIỜ thấy red!
</details>

---

> 📅 Tạo ngày: 2026-02-09
> 🎯 Mục tiêu: Hiểu rõ sự khác biệt Event Loop giữa Browser và Node.js
> 📚 Nguồn: nodejs.org, MDN, javascript.info, dev.to, medium.com
