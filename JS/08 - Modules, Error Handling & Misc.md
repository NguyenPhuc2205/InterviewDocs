# 📘 JavaScript — Modules, Error Handling & Misc

> Những kiến thức "còn lại" nhưng **cực kỳ quan trọng** — hay xuất hiện trong phỏng vấn.

---

## Mục lục

1. [Module System: CJS vs ESM](#1-module-system)
2. [Error Handling](#2-error-handling)
3. [Memory Management & Garbage Collection](#3-memory-management)
4. [Debounce vs Throttle](#4-debounce-vs-throttle)
5. [Event Delegation](#5-event-delegation)
6. [WeakRef & FinalizationRegistry](#6-weakref--finalizationregistry)
7. [Câu hỏi phỏng vấn](#7-câu-hỏi-phỏng-vấn)

---

# 1. Module System

## CommonJS (CJS) — Node.js mặc định

```javascript
// math.js — Export
module.exports = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
};
// Hoặc từng cái:
exports.multiply = (a, b) => a * b;

// app.js — Import
const math = require('./math');
const { add } = require('./math');
```

## ES Modules (ESM) — Tiêu chuẩn web

```javascript
// math.mjs (hoặc "type": "module" trong package.json)
export const add = (a, b) => a + b;
export default class Calculator { }

// app.mjs — Import
import Calculator, { add } from './math.mjs';

// Dynamic import (lazy loading)
const module = await import('./heavy-module.mjs');
```

## So sánh CJS vs ESM

| | CommonJS (CJS) | ES Modules (ESM) |
|---|---|---|
| **Syntax** | `require()` / `module.exports` | `import` / `export` |
| **Loading** | **Synchronous** (blocking) | **Asynchronous** |
| **Khi nào evaluate?** | Runtime (khi `require()` chạy) | Parse time (trước khi chạy) |
| **Top-level await** | ❌ | ✅ |
| **Tree-shaking** | ❌ Khó (dynamic) | ✅ Dễ (static analysis) |
| **Circular deps** | Trả về partial object | Live bindings → ít bug hơn |
| **`this` ở top-level** | `module.exports` | `undefined` |
| **Default Node.js** | ✅ (legacy) | ✅ (từ v12+, `.mjs` hoặc `"type": "module"`) |

### CJS import ESM vs ESM import CJS

```javascript
// ✅ ESM import CJS — OK
import cjsModule from './cjs-module.cjs';

// ❌ CJS require ESM — KHÔNG ĐƯỢC (sync require async module)
const esmModule = require('./esm-module.mjs'); // Error!

// ✅ CJS import ESM bằng dynamic import()
const esmModule = await import('./esm-module.mjs'); // OK
```

### Module Caching

```javascript
// Module được load MỘT LẦN và cache
const a = require('./counter'); // Load + cache
const b = require('./counter'); // Trả cached version
a === b // true — cùng reference

// ⚠️ Singleton pattern tự nhiên trong Node.js nhờ module cache
```

---

# 2. Error Handling

## Các loại Error

```javascript
// JavaScript Built-in Errors
new Error('Generic error');
new TypeError('Wrong type');          // Sai kiểu
new RangeError('Out of range');       // Ngoài phạm vi
new ReferenceError('Not defined');    // Biến chưa khai báo
new SyntaxError('Invalid syntax');    // Cú pháp sai

// Custom Error
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;  // Phân biệt operational vs programmer error
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}
```

## try/catch/finally

```javascript
try {
  const data = JSON.parse(invalidJson);
} catch (err) {
  // err.name, err.message, err.stack
  console.error(`${err.name}: ${err.message}`);
} finally {
  // LUÔN chạy, dù có lỗi hay không, dù có return trong try/catch
  cleanup();
}

// ⚠️ try/catch CHỈ bắt synchronous errors
try {
  setTimeout(() => {
    throw new Error('Async error');  // KHÔNG bị bắt!
  }, 0);
} catch (err) {
  // Không bao giờ vào đây
}

// ✅ Async errors phải bắt bằng async/await hoặc .catch()
try {
  await asyncOperation();  // ✅ Bắt được
} catch (err) {
  console.error(err);
}
```

## Operational vs Programmer Errors

| | Operational Errors | Programmer Errors |
|---|---|---|
| **Ví dụ** | Invalid input, DB down, timeout | TypeError, null reference, wrong API usage |
| **Dự đoán được?** | ✅ Có | ❌ Không |
| **Xử lý** | Handle gracefully, retry, fallback | Fix code, crash & restart |
| **Production** | Log + Return error response | Log + Alert + Restart process |

---

# 3. Memory Management

## Garbage Collection — Mark-and-Sweep

JavaScript quản lý bộ nhớ **tự động** bằng Garbage Collector (GC):

```
Thuật toán Mark-and-Sweep:

1. GC bắt đầu từ "roots" (global object, call stack, closures)
2. Đánh dấu (mark) tất cả objects CÓ THỂ truy cập từ roots
3. Quét (sweep) heap — xóa tất cả objects KHÔNG được đánh dấu
4. Giải phóng bộ nhớ

   roots            heap
    │
    ├──→ [ObjA] ──→ [ObjC]     ← Reachable → giữ lại
    │
    └──→ [ObjB]                 ← Reachable → giữ lại
    
         [ObjD] ──→ [ObjE]     ← Unreachable → GC xóa!
```

## Common Memory Leaks

### 1. Global variables vô tình

```javascript
// ❌ Quên var/let/const → biến global → không bao giờ GC
function leak() {
  leakedVar = 'I am global';  // window.leakedVar — sống mãi!
}

// ✅ Fix: strict mode bắt lỗi này
'use strict';
function safe() {
  leakedVar = 'error';  // ReferenceError!
}
```

### 2. Closures giữ reference không cần thiết

```javascript
// ❌ Closure giữ reference đến biến lớn
function createHeavyClosure() {
  const hugeData = new Array(1000000).fill('💀');

  return function() {
    // Dù không dùng hugeData, closure vẫn giữ reference!
    return 'hello';
  };
}

// ✅ Fix: Không capture biến không cần
function createLightClosure() {
  const hugeData = new Array(1000000).fill('💀');
  const result = processData(hugeData);  // Xử lý xong

  return function() {
    return result;  // Chỉ giữ result, hugeData có thể GC
  };
}
```

### 3. Event listeners không remove

```javascript
// ❌ addEventListener mà không removeEventListener
function setup() {
  const button = document.getElementById('btn');
  const handler = () => { /* heavy operation */ };
  button.addEventListener('click', handler);
  
  // Khi component bị destroy nhưng listener vẫn còn → leak
}

// ✅ Fix
function setup() {
  const controller = new AbortController();
  const button = document.getElementById('btn');
  
  button.addEventListener('click', handler, { signal: controller.signal });
  
  // Cleanup: xóa tất cả listeners cùng lúc
  return () => controller.abort();
}
```

### 4. Timers không clear

```javascript
// ❌ setInterval chạy mãi
const id = setInterval(() => {
  // Truy cập DOM elements đã bị remove → leak
  document.getElementById('output').textContent = new Date();
}, 1000);

// ✅ Fix
clearInterval(id);  // Khi không cần nữa
```

---

# 4. Debounce vs Throttle

Cả hai đều **giới hạn tần suất gọi function**, nhưng cách khác nhau:

## Debounce — "Chờ hết gõ rồi mới làm"

Chờ một khoảng thời gian **sau lần gọi cuối cùng** mới thực thi:

```javascript
function debounce(fn, delay) {
  let timeoutId;

  return function(...args) {
    clearTimeout(timeoutId);  // Reset timer mỗi lần gọi
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Ứng dụng: search input — chờ user ngừng gõ 300ms rồi mới gọi API
const searchInput = document.getElementById('search');
searchInput.addEventListener('input', debounce((e) => {
  callSearchAPI(e.target.value);
}, 300));

// Gõ: h → he → hel → hello (rất nhanh)
// Chỉ gọi API MỘT LẦN với 'hello' (sau 300ms ngừng gõ)
```

## Throttle — "Cứ mỗi X giây làm 1 lần"

Đảm bảo function chỉ chạy **tối đa 1 lần** trong khoảng thời gian:

```javascript
function throttle(fn, limit) {
  let inThrottle = false;

  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Ứng dụng: scroll handler — xử lý tối đa mỗi 100ms
window.addEventListener('scroll', throttle(() => {
  updateScrollProgress();
}, 100));

// Scroll liên tục 1 giây → function chạy ~10 lần (mỗi 100ms)
// Không có throttle → hàng trăm lần!
```

## So sánh

| | Debounce | Throttle |
|---|---|---|
| **Khi nào chạy** | Sau khi NGỪNG gọi + delay | Tối đa 1 lần / interval |
| **Use case** | Search input, resize, validate form | Scroll, mousemove, API rate limit |
| **Ví dụ** | Gõ 10 ký tự → chạy 1 lần | Scroll 1 giây → chạy 10 lần |
| **Auto-complete** | ✅ Dùng debounce | ❌ |
| **Infinite scroll** | ❌ | ✅ Dùng throttle |

---

# 5. Event Delegation

**Event Delegation** = thay vì gắn listener cho **từng phần tử con**, gắn **1 listener trên phần tử cha** rồi dùng `event.target` để xử lý.

```javascript
// ❌ Gắn listener cho MỖI button (100 buttons = 100 listeners)
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', handleClick);
});

// ✅ Event Delegation — 1 listener cho parent
document.getElementById('button-container').addEventListener('click', (e) => {
  if (e.target.matches('.btn')) {
    handleClick(e.target);
  }
});
```

**Tại sao hoạt động?** Nhờ **Event Bubbling** — event phát sinh ở child sẽ "nổi bọt" lên parent, grandparent... cho đến root.

```
Event Bubbling:
click trên <button>
  → <div> (parent)
    → <body>
      → <html>
        → document
```

**Lợi ích:**
1. **Ít listener** → tiết kiệm bộ nhớ
2. **Dynamic elements** — phần tử thêm sau vẫn được handle (không cần thêm listener)
3. **Dễ cleanup** — chỉ cần remove 1 listener

---

# 6. WeakRef & FinalizationRegistry

## WeakRef (ES2021)

```javascript
// WeakRef — giữ reference YẾU đến object
// Không ngăn GC xóa object
let obj = { name: 'An', data: new Array(10000) };
const weakRef = new WeakRef(obj);

weakRef.deref();  // { name: 'An', data: [...] } — object vẫn còn

obj = null;       // Bỏ strong reference

// Sau khi GC chạy:
weakRef.deref();  // undefined — object đã bị GC!
```

## FinalizationRegistry (ES2021)

```javascript
// Nhận callback khi object bị GC
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`${heldValue} has been garbage collected!`);
});

let obj = { heavy: 'data' };
registry.register(obj, 'myObject');  // Đăng ký

obj = null;  // Khi GC xóa → callback chạy: 'myObject has been garbage collected!'
```

> **Cảnh báo:** Không nên dùng cho logic nghiệp vụ quan trọng — GC timing không đảm bảo.

---

# 7. Câu hỏi phỏng vấn

## Q1: "CJS và ESM khác nhau thế nào?"

> **A:** CommonJS dùng `require()/module.exports`, load **synchronous** tại runtime. ESM dùng `import/export`, load **asynchronous** và được phân tích tại parse time — cho phép **tree-shaking** (loại bỏ code không dùng). ESM hỗ trợ `top-level await`, `import()` dynamic. CJS là legacy, ESM là tiêu chuẩn tương lai.

## Q2: "Memory leak trong JS xảy ra thế nào?"

> **A:** 4 nguyên nhân phổ biến: (1) Global variables vô tình — quên `let`/`const`, (2) Closures giữ reference đến data lớn không cần, (3) Event listeners không remove khi component destroy, (4) Timers (setInterval) không clear. Giải pháp: strict mode, WeakMap cho cache, AbortController cho listeners, luôn clearInterval.

## Q3: "Debounce vs Throttle?"

> **A:** Cả hai giới hạn tần suất gọi function. **Debounce** chờ user NGỪNG action rồi mới chạy (search input — chờ ngừng gõ). **Throttle** đảm bảo chạy tối đa 1 lần/interval (scroll handler — mỗi 100ms). Debounce cho "gộp nhiều thành 1", throttle cho "giới hạn tần suất".

## Q4: "Event delegation là gì?"

> **A:** Thay vì gắn listener cho từng child element, gắn 1 listener trên parent rồi dùng `event.target` xác định child nào được click. Hoạt động nhờ **event bubbling**. Lợi ích: tiết kiệm bộ nhớ (ít listeners), tự động handle dynamic elements (thêm child sau vẫn hoạt động), dễ cleanup.

---

> 📅 Tạo ngày: 2026-02-12
> 📚 Nguồn: MDN Web Docs, Node.js Docs, V8 Blog
> 🎯 Mục tiêu: Nắm vững những kiến thức "phụ" nhưng thường bị hỏi
