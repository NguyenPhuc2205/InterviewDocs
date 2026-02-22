# 📘 JavaScript — Memory Management, Garbage Collection & V8 Engine

> Hiểu rõ cách JavaScript **quản lý bộ nhớ** và cơ chế bên trong **V8 Engine** là kiến thức **bắt buộc cho senior developer**. Phỏng vấn thường hỏi sâu về memory leaks, GC algorithms, và V8 optimization.

---

## Mục lục

1. [Memory Lifecycle — Stack vs Heap](#1-memory-lifecycle--stack-vs-heap)
2. [Garbage Collection Deep Dive](#2-garbage-collection-deep-dive)
3. [V8 Engine Architecture](#3-v8-engine-architecture)
4. [V8 Generational GC](#4-v8-generational-gc)
5. [Hidden Classes & Inline Caching](#5-hidden-classes--inline-caching)
6. [Deoptimization Triggers](#6-deoptimization-triggers)
7. [Memory Leaks Deep Dive](#7-memory-leaks-deep-dive)
8. [WeakRef & FinalizationRegistry](#8-weakref--finalizationregistry)
9. [Câu hỏi phỏng vấn](#9-câu-hỏi-phỏng-vấn)

---

# 1. Memory Lifecycle — Stack vs Heap

JavaScript tự động quản lý bộ nhớ, nhưng developer **phải hiểu** cách nó hoạt động để tránh memory leaks.

## Memory Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Allocate │ ──▶ │   2. Use     │ ──▶ │  3. Release  │
│  (Cấp phát)  │     │ (Sử dụng)   │     │ (Giải phóng) │
└──────────────┘     └──────────────┘     └──────────────┘
     Tự động              Dev code            GC tự động
```

## Stack Memory (LIFO)

Stack lưu trữ **primitive values** và **references** (con trỏ đến Heap).

```javascript
function calculate() {
  let x = 10;          // Stack: cấp phát cho x = 10
  let y = 20;          // Stack: cấp phát cho y = 20
  let sum = x + y;     // Stack: cấp phát cho sum = 30
  return sum;           // Khi hàm kết thúc → tất cả bị pop khỏi Stack
}
```

```
Stack Memory (LIFO):
┌──────────────────┐
│  sum: 30         │  ← Top of Stack
├──────────────────┤
│  y: 20           │
├──────────────────┤
│  x: 10           │
├──────────────────┤
│  Return Address  │
└──────────────────┘
```

**Đặc điểm Stack:**
- Truy cập **cực nhanh** (O(1))
- Kích thước **cố định** (thường ~1MB)
- Tự động giải phóng khi function return
- Gây **Stack Overflow** nếu quá sâu (recursive không dừng)

## Heap Memory

Heap lưu trữ **objects, arrays, functions** — tất cả reference types.

```javascript
let user = {            // Object được lưu trên Heap
  name: 'Minh',        // Property values cũng trên Heap
  scores: [90, 85]     // Nested array → object khác trên Heap
};
// Biến `user` trên Stack chỉ chứa REFERENCE (địa chỉ) đến object trên Heap
```

```
Stack                          Heap
┌──────────┐                  ┌─────────────────────────┐
│ user: ◆──┼─────────────────▶│ { name: 'Minh',         │
└──────────┘                  │   scores: ◆──┼──┐       │
                              └──────────────┼──┘       │
                              ┌──────────────▼──────────┐
                              │ [90, 85]                 │
                              └──────────────────────────┘
```

**Đặc điểm Heap:**
- Kích thước **linh hoạt** (V8 default ~1.5GB trên 64-bit)
- Truy cập **chậm hơn** Stack
- Cần **Garbage Collector** để dọn dẹp
- Có thể gây **fragmentation** (phân mảnh bộ nhớ)

## So sánh Stack vs Heap

| Tiêu chí | Stack | Heap |
|-----------|-------|------|
| Lưu gì | Primitives, references, call frames | Objects, arrays, closures |
| Tốc độ | Rất nhanh | Chậm hơn |
| Quản lý | Tự động (LIFO) | Garbage Collector |
| Kích thước | Nhỏ, cố định (~1MB) | Lớn, linh hoạt (~1.5GB) |
| Vấn đề | Stack Overflow | Memory Leaks, Fragmentation |

---

# 2. Garbage Collection Deep Dive

> GC là quá trình **tự động giải phóng** bộ nhớ không còn được sử dụng.

## 2.1 Reference Counting (Cổ điển — không dùng nữa)

Mỗi object có **bộ đếm references**. Khi đếm = 0 → giải phóng.

```javascript
let obj1 = { a: 1 };    // { a: 1 } có 1 reference (obj1)
let obj2 = obj1;         // { a: 1 } có 2 references (obj1, obj2)
obj1 = null;             // { a: 1 } có 1 reference (obj2)
obj2 = null;             // { a: 1 } có 0 references → GC thu hồi ✓
```

**Vấn đề chết người — Circular Reference:**

```javascript
function createCycle() {
  let objA = {};
  let objB = {};
  objA.ref = objB;    // objA → objB
  objB.ref = objA;    // objB → objA (vòng tròn!)
  // Khi hàm kết thúc:
  // objA ref count = 1 (từ objB.ref)
  // objB ref count = 1 (từ objA.ref)
  // → Cả 2 KHÔNG BAO GIỜ bị thu hồi = MEMORY LEAK!
}
```

## 2.2 Mark-and-Sweep (Hiện đại — V8 sử dụng)

Thuật toán hiện đại, **giải quyết được circular reference**.

```
Phase 1: MARK (Đánh dấu)
──────────────────────────
Bắt đầu từ "roots" (global object, stack variables)
→ Duyệt qua TẤT CẢ objects reachable (có thể truy cập được)
→ Đánh dấu chúng là "alive"

Phase 2: SWEEP (Quét dọn)
──────────────────────────
Duyệt toàn bộ Heap
→ Object KHÔNG được đánh dấu = unreachable → Giải phóng
```

```
Roots (Global, Stack)
    │
    ▼
  ┌───┐     ┌───┐     ┌───┐
  │ A │────▶│ B │────▶│ C │    ← Reachable → KEEP
  └───┘     └───┘     └───┘
                         │
                         ▼
                       ┌───┐
                       │ D │              ← Reachable → KEEP
                       └───┘

  ┌───┐     ┌───┐
  │ X │────▶│ Y │                ← Unreachable → SWEEP (xóa)
  └───┘◀────└───┘
  (circular nhưng không từ root → vẫn bị xóa!)
```

## 2.3 Mark-Compact (Nén)

Sau Mark-and-Sweep, bộ nhớ bị **phân mảnh**. Mark-Compact thêm bước **nén**:

```
Trước Compact:
┌───┐┌   ┐┌───┐┌   ┐┌   ┐┌───┐┌   ┐┌───┐
│ A ││   ││ B ││   ││   ││ C ││   ││ D │
└───┘└   ┘└───┘└   ┘└   ┘└───┘└   ┘└───┘
      freed      freed freed      freed

Sau Compact:
┌───┐┌───┐┌───┐┌───┐┌                   ┐
│ A ││ B ││ C ││ D ││   FREE SPACE      │
└───┘└───┘└───┘└───┘└                   ┘
                      ▲ Con trỏ cấp phát mới
```

---

# 3. V8 Engine Architecture

V8 là JavaScript engine của Chrome/Node.js, viết bằng C++.

## Pipeline tổng quan

```
Source Code (.js)
      │
      ▼
┌─────────────┐
│   Parser     │  ← Phân tích cú pháp → AST (Abstract Syntax Tree)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Ignition    │  ← Interpreter: AST → Bytecode (thực thi ngay)
│ (Interpreter)│    Nhanh khởi động, tiết kiệm bộ nhớ
└──────┬──────┘
       │
       │  Thu thập profiling data
       │  (type feedback, call counts)
       ▼
┌─────────────┐
│ Sparkplug   │  ← Baseline Compiler (V8 v9.1+)
│ (Baseline)  │    Compile bytecode → machine code KHÔNG optimize
└──────┬──────┘    Nhanh hơn Ignition, ít overhead hơn TurboFan
       │
       │  "Hot" functions (gọi nhiều lần)
       ▼
┌─────────────┐
│  TurboFan   │  ← Optimizing Compiler: Bytecode → Optimized Machine Code
│ (Optimizing)│    Dùng type feedback để speculate & optimize
└──────┬──────┘
       │
       │  Nếu assumption sai → Deoptimize!
       ▼
  Back to Ignition/Sparkplug
```

## Ignition — Interpreter

```javascript
// Ignition biến code thành bytecode đơn giản
function add(a, b) {
  return a + b;
}

// Bytecode (đơn giản hóa):
// LdaNamedProperty a0, [0]   ← Load a
// Add a1                      ← Cộng b
// Return                      ← Trả về kết quả
```

**Ưu điểm:**
- **Khởi động nhanh** — không cần compile trước
- **Tiết kiệm bộ nhớ** — bytecode nhỏ hơn machine code 50-75%
- Thu thập **type feedback** cho TurboFan

## TurboFan — Optimizing Compiler

```javascript
// TurboFan optimize khi phát hiện pattern ổn định
function square(n) {
  return n * n;
}

// Gọi 10000 lần với number → TurboFan nhận ra:
for (let i = 0; i < 10000; i++) {
  square(i); // Luôn là number → optimize thành machine code cho integer multiply
}

// Nếu sau đó gọi:
square("hello"); // → DEOPTIMIZE! Quay về Ignition
```

## Sparkplug — Baseline Compiler (V8 v9.1+)

Compiler trung gian giữa Ignition và TurboFan:

| Compiler | Tốc độ compile | Tốc độ chạy | Optimization |
|----------|----------------|--------------|-------------|
| Ignition | Rất nhanh | Chậm (interpret) | Không |
| Sparkplug | Nhanh | Trung bình | Không (baseline) |
| TurboFan | Chậm | Rất nhanh | Có (speculative) |

---

# 4. V8 Generational GC

V8 chia Heap thành **2 thế hệ** dựa trên **Generational Hypothesis**: *"Hầu hết object chết sớm"*.

## Cấu trúc Heap

```
V8 Heap
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Young Generation (1-8MB)     Old Generation (~1.5GB)    │
│  ┌─────────┬─────────┐      ┌───────────────────────┐   │
│  │  Semi-  │  Semi-  │      │                       │   │
│  │ space A │ space B │      │   Old Space           │   │
│  │ (From)  │  (To)   │      │   (Mark-Compact)      │   │
│  └─────────┴─────────┘      │                       │   │
│                              ├───────────────────────┤   │
│  Large Object Space          │   Code Space          │   │
│  ┌───────────────────┐      │   (JIT compiled code) │   │
│  │  Objects > 1MB    │      └───────────────────────┘   │
│  └───────────────────┘                                   │
└──────────────────────────────────────────────────────────┘
```

## 4.1 Young Generation — Scavenger (Minor GC)

Dùng thuật toán **Cheney's Semi-space**:

```
Ban đầu — Object mới cấp phát vào From-space:
┌──────────────────┐    ┌──────────────────┐
│   FROM-SPACE     │    │    TO-SPACE      │
│ ┌──┐┌──┐┌──┐   │    │                  │
│ │A ││B ││C │   │    │    (trống)       │
│ └──┘└──┘└──┘   │    │                  │
│ ┌──┐            │    │                  │
│ │D │            │    │                  │
│ └──┘            │    │                  │
└──────────────────┘    └──────────────────┘

GC chạy — Copy objects sống sang To-space:
(Giả sử B và D đã chết - unreachable)

┌──────────────────┐    ┌──────────────────┐
│   FROM-SPACE     │    │    TO-SPACE      │
│                  │    │ ┌──┐┌──┐        │
│   (sẽ bị xóa)   │    │ │A ││C │        │
│                  │    │ └──┘└──┘        │
│                  │    │                  │
└──────────────────┘    └──────────────────┘

Sau GC — Swap roles:
TO-SPACE → trở thành FROM-SPACE mới
FROM-SPACE cũ → trở thành TO-SPACE mới (trống)
```

**Object sống sót 2 lần GC → được "promote" lên Old Generation.**

## 4.2 Old Generation — Mark-Compact (Major GC)

```
1. MARK:  Duyệt từ roots, đánh dấu reachable objects
2. SWEEP: Giải phóng unreachable objects
3. COMPACT: Di chuyển objects còn sống → loại bỏ fragmentation
```

**Incremental Marking** — Tránh "stop-the-world" quá lâu:

```
Thay vì:
Main Thread: ████████████████░░░░░░░░░░░░░░░████████████
                                GC dừng lâu (50ms+)

V8 dùng Incremental:
Main Thread: ████░██░████░██░████░██░████████████████████
                 ↑GC  ↑GC    ↑GC  ↑GC
             GC chia nhỏ thành nhiều bước (5ms mỗi bước)
```

## 4.3 Parallel & Concurrent GC

```
Parallel GC (V8 hiện tại):
Main Thread:    ████████░░░░░░░████████████
Helper Thread 1:        ░░░░░░░
Helper Thread 2:        ░░░░░░░
Helper Thread 3:        ░░░░░░░
                        ▲ Nhiều threads GC cùng lúc

Concurrent GC:
Main Thread:    ████████████████████████████  (không dừng!)
GC Thread:      ░░░░░░░░░░░░░░░░░░
                ▲ GC chạy song song với JS code
```

---

# 5. Hidden Classes & Inline Caching

## Hidden Classes (Maps trong V8)

V8 tạo **hidden class** (internal structure) cho mỗi object shape.

```javascript
// V8 tạo hidden class cho object shape
function Point(x, y) {
  this.x = x;   // Hidden Class C0 → C1 (thêm x)
  this.y = y;   // Hidden Class C1 → C2 (thêm x, y)
}

let p1 = new Point(1, 2);   // Shape: { x, y } → Hidden Class C2
let p2 = new Point(3, 4);   // Cùng shape → CHIA SẺ Hidden Class C2 ✓
```

```
Hidden Class Transition:
C0 {} ──add x──▶ C1 {x} ──add y──▶ C2 {x, y}
                                         │
p1 ──────────────────────────────────────┘
p2 ──────────────────────────────────────┘
(Cùng Hidden Class → V8 optimize access)
```

**BAD — Phá vỡ Hidden Classes:**

```javascript
// ❌ Thêm property với thứ tự khác nhau
let a = {};
a.x = 1;
a.y = 2;   // Hidden Class: x → y

let b = {};
b.y = 2;
b.x = 1;   // Hidden Class KHÁC: y → x

// a và b có KHÁC Hidden Class → V8 không optimize được!
```

```javascript
// ❌ Thêm property sau khi khởi tạo
let obj = { x: 1, y: 2 };
obj.z = 3;  // Tạo Hidden Class mới → transition cost

// ❌ Delete property
delete obj.x;  // Tạo Hidden Class mới → V8 rất khó optimize
```

## Inline Caching (IC)

V8 cache lại **vị trí property** trong memory để truy cập nhanh.

```javascript
function getX(point) {
  return point.x;  // Lần 1: lookup x → tìm offset = 0
                    // Lần 2+: IC → biết x ở offset 0, truy cập trực tiếp!
}

let p1 = new Point(1, 2);
let p2 = new Point(3, 4);

getX(p1);  // Monomorphic IC: ghi nhớ Hidden Class của Point
getX(p2);  // Cùng Hidden Class → IC hit → NHANH!
```

**Các trạng thái IC:**

| Trạng thái | Ý nghĩa | Performance |
|-----------|---------|-------------|
| **Monomorphic** | 1 loại shape duy nhất | Nhanh nhất ✓ |
| **Polymorphic** | 2-4 loại shapes | Chậm hơn |
| **Megamorphic** | 5+ loại shapes | Chậm nhất ✗ |

```javascript
function getName(obj) {
  return obj.name;
}

// Monomorphic — TỐT
getName({ name: 'A', age: 1 });  // Cùng shape
getName({ name: 'B', age: 2 });  // Cùng shape → Monomorphic IC ✓

// Megamorphic — XẤU
getName({ name: 'A' });                    // Shape 1
getName({ name: 'B', age: 1 });            // Shape 2
getName({ name: 'C', x: 1, y: 2 });       // Shape 3
getName({ name: 'D', foo: 'bar' });        // Shape 4
getName({ name: 'E', a: 1, b: 2, c: 3 }); // Shape 5 → Megamorphic ✗
```

---

# 6. Deoptimization Triggers

TurboFan **speculative optimization** dựa trên assumptions. Khi assumption sai → **deoptimize** (quay về Ignition).

## Các pattern gây deoptimization

```javascript
// ❌ 1. Thay đổi kiểu dữ liệu
function add(a, b) {
  return a + b;
}
add(1, 2);      // TurboFan optimize cho integers
add(1, 2);
add(1, 2);
add("x", "y");  // DEOPT! Kiểu thay đổi → string concatenation

// ❌ 2. arguments object
function bad() {
  // Sử dụng arguments khiến function khó optimize
  return arguments[0] + arguments[1];
}
// ✅ Dùng rest parameters thay thế
function good(...args) {
  return args[0] + args[1];
}

// ❌ 3. try-catch bao toàn bộ function (trước đây)
// Lưu ý: V8 hiện đại đã cải thiện rất nhiều, nhưng vẫn nên tách logic
function process(data) {
  try {
    // ... rất nhiều code ...
    return heavyComputation(data);
  } catch (e) {
    return null;
  }
}

// ✅ Tách phần nặng ra ngoài try-catch
function heavyComputation(data) {
  // ... logic nặng — có thể optimize ...
  return data * 2;
}
function process(data) {
  try {
    return heavyComputation(data);
  } catch (e) {
    return null;
  }
}

// ❌ 4. delete operator
let obj = { x: 1, y: 2, z: 3 };
delete obj.y;  // → Hidden class thay đổi, V8 đánh dấu "slow mode"
// ✅ Gán undefined thay vì delete (nếu có thể)
obj.y = undefined;

// ❌ 5. eval() và with
function badScope() {
  eval('var x = 10');  // V8 không thể optimize scope
}

// ❌ 6. for-in trên object có prototype dài
for (let key in deeplyInheritedObj) {  // Chậm
  // ...
}
// ✅ Object.keys() hoặc Object.entries()
for (const key of Object.keys(obj)) {  // Nhanh hơn
  // ...
}
```

## Kiểm tra deoptimization trong Node.js

```bash
# Chạy Node.js với V8 flags để xem optimization status
node --trace-opt --trace-deopt script.js

# Output ví dụ:
# [marking 0x... add for optimization]
# [optimizing 0x... add - took 0.5ms]
# [deoptimizing (eager): begin 0x... add ...]
```

---

# 7. Memory Leaks Deep Dive

Memory leak xảy ra khi **object không còn cần dùng** nhưng vẫn bị **reference giữ lại**.

## 7.1 Các nguyên nhân phổ biến

### 1. Biến global vô tình

```javascript
// ❌ Quên khai báo biến → trở thành global
function createUser() {
  user = { name: 'Minh' };  // Không có let/const/var → window.user!
  // user sẽ KHÔNG BAO GIỜ bị GC thu hồi
}

// ❌ this trong non-strict mode
function setName() {
  this.name = 'Minh';  // this = window → global variable!
}
setName();

// ✅ Dùng strict mode
'use strict';
function setName() {
  this.name = 'Minh';  // TypeError: Cannot set property 'name' of undefined
}
```

### 2. Forgotten Timers & Callbacks

```javascript
// ❌ Timer không bao giờ clear
const hugeData = loadHugeDataset(); // 100MB data

setInterval(() => {
  // hugeData bị closure giữ reference
  // Dù không cần nữa, hugeData không bị GC
  console.log(hugeData.length);
}, 1000);

// ✅ Clear timer khi không cần
const timer = setInterval(() => {
  console.log(hugeData.length);
}, 1000);
// Khi không cần nữa:
clearInterval(timer);
```

### 3. DOM References bị giữ

```javascript
// ❌ Giữ reference đến DOM element đã bị remove
const elements = [];
function addButton() {
  const btn = document.createElement('button');
  document.body.appendChild(btn);
  elements.push(btn);  // Reference trong array
}
function removeButtons() {
  document.body.innerHTML = '';  // Xóa khỏi DOM
  // Nhưng elements[] vẫn giữ reference → LEAK!
}

// ✅ Xóa cả reference
function removeButtons() {
  document.body.innerHTML = '';
  elements.length = 0;  // Xóa references
}
```

### 4. Closures giữ scope không cần thiết

```javascript
// ❌ Closure giữ toàn bộ outer scope
function createHandler() {
  const hugeArray = new Array(1000000).fill('data');
  const name = 'handler';

  return function handle() {
    // Chỉ dùng `name` nhưng closure giữ cả `hugeArray`!
    console.log(name);
  };
}
const handler = createHandler(); // hugeArray bị giữ mãi

// ✅ Tách biệt scope
function createHandler() {
  const hugeArray = new Array(1000000).fill('data');
  const name = 'handler';

  // Xử lý hugeArray ở đây
  const result = processArray(hugeArray);
  // hugeArray sẽ được GC sau khi createHandler return

  return function handle() {
    console.log(name, result);
  };
}
```

### 5. Event Listeners không remove

```javascript
// ❌ Thêm listener mà không remove
class Component {
  constructor() {
    window.addEventListener('resize', this.onResize);
  }

  onResize = () => {
    // this reference giữ Component instance sống mãi
    console.log('resized');
  };

  // Không có destroy/cleanup method!
}

// ✅ Cleanup listeners
class Component {
  constructor() {
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  onResize() {
    console.log('resized');
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
  }
}
```

### 6. Map/Set giữ reference

```javascript
// ❌ Map giữ key reference → object không bị GC
const cache = new Map();
function process(obj) {
  if (!cache.has(obj)) {
    cache.set(obj, expensiveCompute(obj));
  }
  return cache.get(obj);
}
// obj sẽ không bị GC vì Map giữ strong reference

// ✅ Dùng WeakMap
const cache = new WeakMap();
function process(obj) {
  if (!cache.has(obj)) {
    cache.set(obj, expensiveCompute(obj));
  }
  return cache.get(obj);
}
// Khi obj không còn reference khác → GC tự động xóa khỏi WeakMap
```

## 7.2 Profiling & Detection Tools

### Chrome DevTools

```
1. Memory tab → Heap Snapshot
   - So sánh 2 snapshots → tìm objects tăng bất thường

2. Memory tab → Allocation Timeline
   - Chạy app → quan sát allocation theo thời gian

3. Performance tab → Memory checkbox
   - JS Heap size tăng liên tục = LEAK

4. Performance Monitor (Ctrl+Shift+P → "Performance Monitor")
   - Real-time: JS Heap Size, DOM Nodes, Event Listeners
```

### Node.js

```javascript
// Kiểm tra memory usage trong Node.js
console.log(process.memoryUsage());
// {
//   rss: 30000000,        // Resident Set Size (tổng bộ nhớ)
//   heapTotal: 18000000,  // Heap đã cấp phát
//   heapUsed: 12000000,   // Heap đang dùng
//   external: 8000,       // C++ objects bound to JS
//   arrayBuffers: 5000    // ArrayBuffer, SharedArrayBuffer
// }

// Theo dõi memory theo thời gian
setInterval(() => {
  const { heapUsed } = process.memoryUsage();
  console.log(`Heap: ${(heapUsed / 1024 / 1024).toFixed(2)} MB`);
}, 5000);
```

```bash
# Node.js memory profiling
node --inspect script.js          # Mở Chrome DevTools cho Node
node --max-old-space-size=4096 app.js   # Tăng Heap limit lên 4GB
node --expose-gc script.js        # Cho phép gọi global.gc() thủ công
```

---

# 8. WeakRef & FinalizationRegistry

> ES2021 — Cho phép giữ **weak reference** và **hook vào GC lifecycle**.

## WeakRef

```javascript
// WeakRef giữ reference YẾU → không ngăn GC
let target = { name: 'heavy object', data: new Array(1000000) };
const weakRef = new WeakRef(target);

// Truy cập object qua WeakRef
console.log(weakRef.deref());          // { name: 'heavy object', ... }
console.log(weakRef.deref()?.name);    // 'heavy object'

// Khi target bị xóa reference
target = null;
// Sau khi GC chạy:
console.log(weakRef.deref());          // undefined (đã bị GC thu hồi)
```

**Use case — Cache:**

```javascript
class WeakCache {
  #cache = new Map();

  get(key) {
    const ref = this.#cache.get(key);
    if (!ref) return undefined;

    const value = ref.deref();
    if (!value) {
      // Object đã bị GC → xóa entry
      this.#cache.delete(key);
      return undefined;
    }
    return value;
  }

  set(key, value) {
    this.#cache.set(key, new WeakRef(value));
  }
}

const cache = new WeakCache();
let bigData = { /* 100MB data */ };
cache.set('report', bigData);

console.log(cache.get('report')); // { ... } — còn sống

bigData = null;
// Sau GC:
console.log(cache.get('report')); // undefined — đã bị thu hồi tự động
```

## FinalizationRegistry

```javascript
// FinalizationRegistry — callback khi object bị GC
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`Object "${heldValue}" đã bị garbage collected!`);
  // Cleanup: đóng file, giải phóng resource ngoài JS
});

let obj = { name: 'temp' };
registry.register(obj, 'temp-object');  // Đăng ký theo dõi

obj = null;
// Sau khi GC chạy → callback được gọi:
// "Object "temp-object" đã bị garbage collected!"
```

**Use case — Resource cleanup:**

```javascript
class FileHandle {
  static #registry = new FinalizationRegistry((path) => {
    console.log(`Auto-closing leaked file: ${path}`);
    // Gọi native close nếu dev quên close
    nativeClose(path);
  });

  #path;
  #closed = false;

  constructor(path) {
    this.#path = path;
    // Đăng ký: nếu FileHandle bị GC mà chưa close → auto cleanup
    FileHandle.#registry.register(this, path, this);
  }

  close() {
    if (!this.#closed) {
      nativeClose(this.#path);
      this.#closed = true;
      // Hủy đăng ký vì đã close rồi
      FileHandle.#registry.unregister(this);
    }
  }
}
```

> ⚠️ **Lưu ý:** GC timing không xác định — KHÔNG dựa vào FinalizationRegistry cho logic quan trọng. Chỉ dùng như "safety net".

---

# 9. Câu hỏi phỏng vấn

### Q1: Stack và Heap khác nhau thế nào? Primitive lưu ở đâu?

**A:** Stack lưu **primitive values** và **references** (con trỏ) — truy cập nhanh, tự động giải phóng khi function return. Heap lưu **objects/arrays** — kích thước linh hoạt, cần GC để giải phóng. Primitive lưu trực tiếp trên Stack (hoặc inline trong object trên Heap nếu là property).

---

### Q2: Giải thích Mark-and-Sweep GC. Tại sao tốt hơn Reference Counting?

**A:** Mark-and-Sweep duyệt từ roots (global, stack), đánh dấu tất cả reachable objects, rồi xóa unreachable objects. Tốt hơn Reference Counting vì **giải quyết được circular reference** — 2 objects reference lẫn nhau nhưng không reachable từ root vẫn bị thu hồi.

---

### Q3: V8 có những compiler nào? Mô tả pipeline.

**A:** V8 có 3 tầng:
1. **Ignition** (Interpreter) — Parse JS → bytecode, thực thi ngay, thu thập type feedback
2. **Sparkplug** (Baseline Compiler) — Compile bytecode → machine code nhanh, không optimize
3. **TurboFan** (Optimizing Compiler) — Dùng type feedback → tạo optimized machine code. Nếu assumption sai → deoptimize quay lại Ignition.

---

### Q4: Hidden Class là gì? Làm sao để tận dụng nó?

**A:** Hidden Class (Maps) là cấu trúc nội bộ V8 dùng để mô tả "shape" của object (property names, offsets). Objects cùng shape chia sẻ Hidden Class → V8 optimize truy cập. Để tận dụng:
- Luôn thêm properties **cùng thứ tự** trong constructor
- Tránh **delete** property
- Tránh thêm property **sau khởi tạo**
- Dùng **constructor/class** thay vì object literal ad-hoc

---

### Q5: Kể 5 nguyên nhân memory leak phổ biến và cách phòng tránh.

**A:**
1. **Biến global vô tình** — dùng `'use strict'`, luôn khai báo biến
2. **Timer/interval không clear** — `clearInterval()` khi component unmount
3. **Event listener không remove** — `removeEventListener()` trong cleanup
4. **Closure giữ scope lớn** — tách biệt scope, nullify references
5. **Map/Set giữ strong reference** — dùng `WeakMap`/`WeakSet` cho cache

---

### Q6: WeakRef và WeakMap khác gì nhau?

**A:**
- **WeakMap**: Map với **key là weak reference** → key bị GC thì entry tự mất. Không enumerable, key phải là object.
- **WeakRef**: Wrapper **weak reference đến 1 object** → phải gọi `.deref()` để lấy object (có thể `undefined` nếu đã GC). Linh hoạt hơn, dùng được mọi nơi.

---

### Q7: Deoptimization là gì? Cho ví dụ gây deopt.

**A:** Deoptimization là khi TurboFan **hủy bỏ optimized code** và quay về Ignition/Sparkplug vì assumption ban đầu sai. Ví dụ:
```javascript
function add(a, b) { return a + b; }
// V8 optimize cho number sau 1000 lần gọi
add("x", "y"); // Type thay đổi → DEOPT!
```
Các trigger khác: `delete` property, `arguments` object, thay đổi object shape.

---

### Q8: V8 Generational GC hoạt động thế nào?

**A:** V8 chia Heap thành **Young Gen** (nhỏ, GC thường xuyên bằng Scavenger/Semi-space copying) và **Old Gen** (lớn, GC ít hơn bằng Mark-Compact). Object mới vào Young Gen → sống sót 2 lần Minor GC → promote lên Old Gen. Dựa trên Generational Hypothesis: hầu hết object chết sớm.
