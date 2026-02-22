# Call Stack, Memory Heap & Cơ chế thực thi JavaScript

> **Tài liệu kiến trúc lõi** — nền tảng để hiểu mọi thứ trong JavaScript: scope, hoisting, closures, async, memory management. Kiến thức đã verified từ ECMAScript spec §9.4, MDN, V8 blog.

---

# 1. Tổng quan — V8 quản lý bộ nhớ thế nào?

V8 (JS engine) chia bộ nhớ thành **2 khu vực chính**:

```
V8 Engine
┌──────────────────────────────────────────────┐
│                                              │
│   Call Stack               Memory Heap       │
│   (Bàn làm việc)          (Nhà kho)          │
│   ┌────────────┐           ┌────────────┐    │
│   │ Nhỏ, nhanh │           │ Lớn, linh  │    │
│   │ LIFO       │           │ hoạt       │    │
│   │            │   trỏ     │            │    │
│   │ Primitives │ ────────► │ Objects    │    │
│   │ Pointers   │           │ Arrays     │    │
│   │ Exec Ctx   │           │ Functions  │    │
│   └────────────┘           └────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

---

# 2. Call Stack (Execution Context Stack) — "Bàn làm việc"

## Là gì?

Call Stack là một **cấu trúc dữ liệu LIFO** (Last In, First Out) do JS engine quản lý, dùng để **theo dõi thứ tự thực thi** của các hàm trong chương trình.

JavaScript chỉ có **duy nhất một Call Stack** → đây chính là lý do JS là **single-threaded** (chỉ làm một việc tại một thời điểm).

## Đặc điểm

- **Dung lượng nhỏ**, nhưng truy xuất **cực nhanh** (cấp phát tĩnh, quản lý chặt theo LIFO)
- Có giới hạn kích thước (~10,000–25,000 frames tùy engine)

## Cơ chế hoạt động

1. Khi chương trình bắt đầu chạy → JS engine tạo **Global Execution Context** và push vào đáy stack
2. Mỗi khi một hàm được **gọi** → một **Execution Context** mới (frame) được tạo và **push** lên đỉnh stack
3. Khi hàm **return** (hoặc chạy xong) → frame đó bị **pop** ra khỏi stack
4. Hàm nào nằm **trên cùng** stack → đang được thực thi

## Trong mỗi frame (Execution Context) có gì?

Theo ECMAScript spec §9.4, mỗi Execution Context chứa:

| Thành phần | Giải thích |
|---|---|
| **Function** | Hàm nào đang chạy (hoặc `null` nếu là global) |
| **LexicalEnvironment** | Nơi lưu bindings cho `let`, `const`, khai báo hàm — tạo ra **scope** |
| **VariableEnvironment** | Nơi lưu bindings cho `var` — tách riêng vì `var` có hoisting khác |
| **Realm** | Tham chiếu tới bộ built-in objects (`Array`, `Object`, `Promise`...) |
| **code evaluation state** | Engine đang chạy tới dòng nào, để resume biết tiếp tục ở đâu |

> 💡 **Phân biệt 2 tầng**:
> - **Tầng spec**: Frame chứa Environment Records (LexicalEnv, VariableEnv). Biến/tham số được quản lý qua scope chain.
> - **Tầng engine/V8**: Frame thực sự chứa primitives, pointers, return address. Đây là chi tiết implementation.
>
> Cả hai cách nói đều đúng — chỉ khác góc nhìn.

## Ví dụ Call Stack hoạt động

```javascript
function first() {
  console.log('First start');
  second();
  console.log('First end');
}

function second() {
  console.log('Second');
}

first();
```

```
Bước 1: [ Global ]
Bước 2: [ Global, first() ]
Bước 3: [ Global, first(), console.log('First start') ]  → pop sau khi in
Bước 4: [ Global, first(), second() ]
Bước 5: [ Global, first(), second(), console.log('Second') ] → pop
Bước 6: [ Global, first(), second() ]  → second return, pop
Bước 7: [ Global, first(), console.log('First end') ]    → pop
Bước 8: [ Global, first() ]  → first return, pop
Bước 9: [ Global ] → chương trình kết thúc
```

## Stack Overflow

Khi recursion không có điều kiện dừng → frame cứ push mãi → vượt giới hạn stack:

```javascript
function loop() {
  loop(); // gọi chính mình, không bao giờ return
}
loop(); // 💥 RangeError: Maximum call stack size exceeded
```

---

# 3. Memory Heap — "Nhà kho"

## Là gì?

Memory Heap là một **vùng nhớ rộng lớn**, không có cấu trúc cố định (unstructured), dùng để lưu trữ dữ liệu phức tạp có kích thước động.

## Đặc điểm

- **Dung lượng lớn**, linh hoạt hơn stack rất nhiều
- Truy xuất **chậm hơn** stack (phải tìm theo địa chỉ tham chiếu)
- Được **Garbage Collector** tự động dọn dẹp

## Lưu gì?

- **Objects**: `{ name: 'Nguyen' }`
- **Arrays**: `[1, 2, 3]`
- **Functions**: `function foo() {}`
- Tất cả dữ liệu có **kích thước động** (có thể phình to)

---

# 4. Stack vs Heap — Kết nối thế nào?

## Quy tắc

- **Primitive** (`number`, `string`, `boolean`, `undefined`, `null`, `symbol`, `bigint`):
  - Nếu là **biến cục bộ** (local variable) → lưu **trực tiếp trên Stack**
  - Nếu là **thuộc tính của Object** (vd: `obj.age = 22`) → giá trị `22` nằm trong **Heap** cùng với Object đó
- **Reference type** (`Object`, `Array`, `Function`) → bản thân data lưu trên **Heap**, Stack chỉ giữ **địa chỉ trỏ tới** (pointer)

> 💡 **V8 implementation detail**: V8 đôi khi lưu các chuỗi `String` quá dài vào Heap và chỉ để pointer trên Stack, dù `String` là primitive. Đây là tối ưu bộ nhớ ở tầng engine.

## Ví dụ

```javascript
const age = 22;
const dev = { name: 'Nguyen', role: 'NodeJS' };
```

```
Call Stack:                Memory Heap:
┌──────────────────┐       ┌──────────────────────────┐
│ age = 22         │       │ 0x001: {                 │
│ dev = 0x001  ────┼──────►│   name: 'Nguyen',        │
│                  │       │   role: 'NodeJS'          │
└──────────────────┘       │ }                        │
                           └──────────────────────────┘
```

- `age = 22`: primitive → lưu thẳng trên Stack
- `dev`: V8 tạo Object trên Heap tại vị trí `0x001`, Stack chỉ lưu địa chỉ `0x001`

## Hệ quả — Copy reference, không copy value

```javascript
const dev2 = dev;          // copy ĐỊA CHỈ 0x001, KHÔNG tạo object mới
dev2.role = 'Fullstack';
console.log(dev.role);     // 'Fullstack' — vì cùng trỏ tới 1 object!
```

```
Stack:                     Heap:
┌──────────────────┐       ┌──────────────────────────┐
│ dev  = 0x001 ────┼──┐    │ 0x001: {                 │
│ dev2 = 0x001 ────┼──┤    │   name: 'Nguyen',        │
└──────────────────┘  └───►│   role: 'Fullstack'      │
                           │ }                        │
                           └──────────────────────────┘
```

**Tại sao `const obj = {}` vẫn thay đổi được properties?** Vì `const` chỉ khóa **địa chỉ trên Stack** (không cho gán lại `obj = ...`), không khóa **nội dung trên Heap**.

---

# 5. Garbage Collector (GC) — "Lao công dọn Heap"

## Vấn đề

Heap rất rộng, cấp phát lộn xộn → nếu không dọn dẹp → tràn bộ nhớ (memory leak).

## Cơ chế tổng quan — Mark-and-Sweep

1. **Mark**: GC đi từ **roots** duyệt qua tất cả references. Object nào **reachable** (có thể truy cập được) → đánh dấu "sống"
2. **Sweep**: Object nào **unreachable** (không ai trỏ tới nữa) → xóa, giải phóng RAM

**Roots** = tất cả entry points mà GC dùng để bắt đầu duyệt — bao gồm:
- **Global object** (`global` trong Node.js, `window` trong browser)
- **Các biến cục bộ** đang nằm trong Call Stack (frames đang chạy)
- **Module exports** hiện tại

## V8 dùng Generational GC

V8 không chỉ dùng Mark-and-Sweep đơn thuần mà dùng **Generational GC** — chia Heap thành 2 thế hệ:

| | Young Generation | Old Generation |
|---|---|---|
| **Chứa gì** | Objects mới tạo | Objects sống lâu (sống sót qua nhiều lần GC) |
| **GC type** | **Minor GC** (Scavenger) | **Major GC** (Mark-Sweep-Compact) |
| **Tần suất** | Chạy thường xuyên | Chạy ít hơn |
| **Tốc độ** | Nhanh | Chậm hơn |

**Flow**: Object mới tạo → Young Gen → sống sót qua vài lần Minor GC → được promote sang Old Gen → Major GC dọn khi cần.

```javascript
let user = { name: 'Nguyen' };  // tạo trên Heap (Young Gen)
user = null;                     // không ai trỏ nữa → GC dọn
```

## Memory Leak xảy ra khi nào?

Khi object **đáng lẽ không cần nữa** nhưng vẫn còn **reference trỏ tới** → GC tưởng vẫn dùng → không dọn được:

```javascript
// ❌ Memory leak — cache phình to mãi
const cache = [];
function addToCache(data) {
  cache.push(data);  // không bao giờ xóa
}
```

Các nguyên nhân phổ biến:
- **Global variables** không cần thiết
- **Event listeners** quên `removeEventListener`
- **Closures** giữ reference tới biến không cần
- **Timers** (`setInterval`) quên `clearInterval`

---

# 6. Call Stack trong Async — Kết hợp Event Loop

Một mình Call Stack không làm nên sự **non-blocking** của Node.js. Khi gặp async:

```
1. Gặp hàm async (setTimeout, fetch, fs.readFile...)
2. Push lên Call Stack
3. V8 giao tác vụ cho Runtime APIs (libuv trong Node.js, Web APIs trong browser)
4. Pop khỏi Call Stack ngay → JS chạy tiếp, KHÔNG bị block
5. Khi tác vụ xong → callback vào Queue (Microtask hoặc Macrotask)
6. Event Loop kiểm tra: Call Stack trống? → đẩy callback từ Queue lên Stack thực thi
```

> **Điều kiện then chốt**: Event Loop chỉ đẩy callback lên khi **Call Stack hoàn toàn trống**.
>
> 📎 Xem chi tiết Event Loop, Microtask/Macrotask Queue tại: **06 - Promises & Async-Await Deep Dive.md**

---

# 7. Async Stack Traces — Debug async khó ở đâu?

```javascript
setTimeout(() => {
  throw new Error('boom');
}, 0);
```

Stack trace chỉ hiện:
```
Error: boom
    at Timeout._onTimeout (file.js:2:9)
    // ← Không thấy ai gọi setTimeout!
```

**Lý do**: Hàm gốc gọi `setTimeout` đã bị **pop khỏi stack** từ lâu. Khi callback chạy, context cũ không còn.

**Giải pháp**: Từ Node.js 12+, **async stack traces được bật mặc định** — V8 tự động lưu trace nguồn tạo async operation. Không cần flag riêng.

---

# 8. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| Call Stack là gì? | Cấu trúc LIFO quản lý Execution Context. 1 stack = single-threaded |
| Frame (Execution Context) chứa gì? | Function, LexicalEnv, VariableEnv, Realm, code evaluation state |
| Primitive vs Reference khác gì? | Primitive (local) → Stack. Reference → Heap, Stack giữ pointer |
| Primitive trong Object thì ở đâu? | Nằm trong Heap cùng Object, không phải Stack |
| `const obj = {}` sao vẫn đổi được? | `const` khóa địa chỉ trên Stack, không khóa nội dung trên Heap |
| Stack Overflow là gì? | Recursion không dừng → push frame quá giới hạn stack |
| GC hoạt động thế nào? | Generational: Minor GC dọn Young Gen (nhanh, thường xuyên), Major GC dọn Old Gen (chậm, ít hơn) |
| Memory leak là gì? | Object không cần nhưng vẫn có reference → GC không dọn được |
| Event Loop liên quan thế nào? | Chỉ đẩy callback lên Call Stack khi stack hoàn toàn trống |
