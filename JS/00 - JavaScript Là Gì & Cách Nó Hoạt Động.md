# 📘 JavaScript Là Gì & Cách Nó Hoạt Động

> Tài liệu tổng quan có hệ thống — từ **định nghĩa chính xác** của JavaScript, đến cách **Engine đọc và thực thi** code, cấu trúc bên trong, và cơ chế xử lý bất đồng bộ. Ưu tiên tiếng Việt, dễ hiểu, chuẩn chỉnh cho phỏng vấn.

---

## Mục lục

1. [JavaScript là gì? — Định nghĩa chính xác](#1-javascript-là-gì)
2. [ECMAScript vs JavaScript vs TC39](#2-ecmascript-vs-javascript-vs-tc39)
3. [JavaScript Engine — Bộ máy thực thi code](#3-javascript-engine)
4. [Quy trình Engine xử lý code](#4-quy-trình-engine-xử-lý-code)
5. [JIT Compilation — Vừa thông dịch vừa biên dịch](#5-jit-compilation)
6. [Deoptimization — Khi tối ưu bị "hỏng"](#6-deoptimization)
7. [Cấu trúc Engine — Memory Heap & Call Stack](#7-cấu-trúc-engine)
8. [Execution Context — Môi trường thực thi code](#8-execution-context)
9. [Vấn đề: Đơn luồng → Dễ bị nghẽn?](#9-vấn-đề-đơn-luồng)
10. [Web APIs & libuv — Ai xử lý bất đồng bộ?](#10-web-apis--libuv)
11. [Callback Queue & Event Loop](#11-callback-queue--event-loop)
12. [Microtask vs Macrotask — 2 loại hàng đợi](#12-microtask-vs-macrotask)
13. [Sơ đồ tổng quan toàn bộ hệ thống](#13-sơ-đồ-tổng-quan)
14. [Tóm tắt — Nếu phỏng vấn hỏi "Nói về JavaScript"](#14-tóm-tắt-phỏng-vấn)
15. [Câu hỏi phỏng vấn thường gặp](#15-câu-hỏi-phỏng-vấn)

---

# 1. JavaScript là gì?

## Định nghĩa chính thức (theo MDN Web Docs)

> **JavaScript (JS)** là một ngôn ngữ lập trình **nhẹ** (lightweight), **thông dịch hoặc biên dịch tức thời** (interpreted or just-in-time compiled), **có hàm là đối tượng hạng nhất** (first-class functions). JavaScript là ngôn ngữ **prototype-based**, **garbage-collected**, **kiểu dữ liệu động** (dynamic), hỗ trợ **đa mô hình** (multi-paradigm): hướng mệnh lệnh (imperative), lập trình hàm (functional), và hướng đối tượng (object-oriented).

Phân tích từng từ khóa:

| Từ khóa | Nghĩa | Giải thích nhanh |
|---|---|---|
| **Lightweight** | Nhẹ | Cú pháp gọn, dễ nhúng vào browser, không cần biên dịch riêng |
| **Interpreted / JIT compiled** | Thông dịch / biên dịch tức thời | Không cần build ra .exe — engine đọc và chạy luôn, đồng thời tối ưu phần "nóng" (xem [Section 5](#5-jit-compilation)) |
| **First-class functions** | Hàm là đối tượng hạng nhất | Hàm = giá trị (value), có thể gán, truyền, return như number/string |
| **Prototype-based** | Dựa trên prototype | Kế thừa qua prototype chain thay vì class-based truyền thống (xem [Prototypes & Inheritance](./04%20-%20Prototypes%20%26%20Inheritance.md)) |
| **Garbage-collected** | Tự thu gom rác | Engine tự giải phóng bộ nhớ không còn sử dụng — lập trình viên không cần `free()` hay `delete` thủ công |
| **Dynamic** | Kiểu dữ liệu động | Biến không cần khai báo kiểu, kiểu xác định lúc runtime |
| **Multi-paradigm** | Đa mô hình | Hỗ trợ OOP, functional, imperative trong cùng 1 ngôn ngữ |

## Giải thích từng đặc tính

### 📌 Kiểu dữ liệu động (dynamically typed)

Biến không cần khai báo kiểu — kiểu được xác định **lúc chạy** (runtime), không phải lúc viết code.

```javascript
let x = 42;        // x là number
x = "hello";       // x bây giờ là string — KHÔNG LỖI
x = true;          // x bây giờ là boolean — vẫn hợp lệ
// So sánh với Java/TypeScript: phải viết int x = 42; rồi x = "hello" sẽ LỖI
```

### 📌 Đa mô hình (multi-paradigm)

JavaScript hỗ trợ **nhiều phong cách** lập trình:
- **Hướng đối tượng** (prototype-based OOP) — dùng prototype thay vì class truyền thống
- **Lập trình hàm** (functional programming) — hàm thuần túy, bất biến, hàm bậc cao
- **Hướng sự kiện** (event-driven) — lắng nghe và phản hồi sự kiện (click, request...)

### 📌 Hàm là đối tượng hạng nhất (First-class Functions)

**"First-class"** nghĩa là hàm được ngôn ngữ đối xử **ngang hàng với mọi giá trị khác** (number, string, object...). Nói cách khác: **hàm = giá trị** (value), không phải thứ gì đặc biệt.

Cụ thể, trong ngôn ngữ có first-class functions, hàm có thể:

1. **Gán vào biến** — lưu hàm như lưu số, chuỗi
2. **Truyền làm tham số** cho hàm khác — nền tảng của callback
3. **Return từ hàm khác** — nền tảng của closure, higher-order function
4. **Lưu trong data structures** — array, object đều chứa được hàm

```javascript
// 1. Gán vào biến
const greet = function(name) { return `Hi ${name}`; };

// 2. Truyền vào hàm khác như tham số (→ callback)
function doSomething(callback) {
  callback('World');
}
doSomething(greet);  // "Hi World"

// 3. Return từ hàm khác (→ higher-order function, closure)
function multiplier(factor) {
  return function(x) { return x * factor; };  // Return 1 hàm!
}
const double = multiplier(2);
double(5);  // 10

// 4. Lưu trong data structures
const strategies = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
};
strategies.add(3, 2);  // 5 — gọi hàm từ object property
```

> **So sánh:** Trong C hoặc Java (trước Java 8), hàm **không phải** first-class — bạn không thể gán hàm vào biến hay truyền hàm làm tham số một cách trực tiếp. JavaScript cho phép điều này ngay từ đầu — đây là nền tảng cho **callback, closure, higher-order functions** và toàn bộ lập trình hàm (functional programming).

### 📌 Đơn luồng (single-threaded)

JavaScript engine chỉ có **1 Call Stack** → chỉ thực thi **1 đoạn code tại 1 thời điểm**. Không thể chạy 2 đoạn JavaScript cùng lúc trên cùng 1 thread.

### 📌 Không chặn (non-blocking)

Các tác vụ I/O (gọi API, đọc file, đếm giờ...) được xử lý **ở nền** bởi runtime (trình duyệt / Node.js), **không** làm đóng băng chương trình.

### 📌 Tuân theo đặc tả ECMAScript

JavaScript được xây dựng theo bản đặc tả **ECMAScript** (ECMA-262) — quy định cú pháp, kiểu dữ liệu, hành vi của ngôn ngữ.

---

# 2. ECMAScript vs JavaScript vs TC39

> Ba khái niệm này hay bị nhầm lẫn nhưng rất khác nhau.

| Khái niệm | Là gì? | Vai trò |
|-----------|--------|---------|
| **ECMAScript** | Bản **đặc tả** (specification) — tài liệu kỹ thuật | Quy định JavaScript **nên hoạt động thế nào** — cú pháp, kiểu dữ liệu, hành vi... Không phải code chạy được |
| **JavaScript** | Ngôn ngữ lập trình — **cài đặt cụ thể** (implementation) của ECMAScript | Cách V8, SpiderMonkey **thực hiện** đặc tả ECMAScript thành code chạy được |
| **TC39** | **Ủy ban kỹ thuật** (Technical Committee 39) | Quản lý và phát triển đặc tả ECMAScript. Gồm đại diện từ Google, Mozilla, Apple, Microsoft... |

```
Mối quan hệ:

TC39 viết đặc tả ──→ ECMAScript (spec)
                          │
                          │ cài đặt (implement)
                          ▼
                     JavaScript
                      │      │
                V8 (Chrome)  SpiderMonkey (Firefox)  JavaScriptCore (Safari)
```

### Cách tính năng mới được thêm vào JavaScript

Mỗi tính năng mới phải qua **5 giai đoạn** (TC39 Process):

| Giai đoạn | Tên | Ý nghĩa |
|-----------|-----|---------|
| Stage 0 | Strawperson | Ý tưởng ban đầu, ai cũng có thể đề xuất |
| Stage 1 | Proposal | Đề xuất chính thức, có người chịu trách nhiệm |
| Stage 2 | Draft | Bản nháp đặc tả, cú pháp cơ bản đã xác định |
| Stage 3 | Candidate | Gần hoàn chỉnh, các engine bắt đầu cài đặt thử |
| Stage 4 | Finished | Hoàn chỉnh, sẽ vào bản ECMAScript tiếp theo (ví dụ ES2025) |

> **Ví dụ thực tế:** `Promise.withResolvers()` đi từ Stage 0 → Stage 4 rồi chính thức vào ES2024. Khi đạt Stage 3, V8 và SpiderMonkey đã bắt đầu cài đặt, nên bạn có thể dùng trước khi spec chính thức phát hành.

---

# 3. JavaScript Engine

## Engine là gì?

JavaScript Engine là phần mềm chịu trách nhiệm **đọc, biên dịch, và thực thi** mã JavaScript. Trình duyệt hay Node.js **không tự đọc** JavaScript — chúng ủy thác cho engine.

## Các engine phổ biến

| Engine | Dùng bởi | Ngôn ngữ viết | Ghi chú |
|--------|---------|---------------|---------|
| **V8** | Chrome, Edge, Opera, **Node.js**, Deno, Bun | C++ | Phổ biến nhất, do Google phát triển |
| **SpiderMonkey** | Firefox | C++, Rust | Engine **đầu tiên** trên thế giới, do Brendan Eich tạo ra |
| **JavaScriptCore** (Nitro) | Safari, React Native | C++ | Do Apple phát triển |

> **Lưu ý:** Engine chỉ là **1 phần** của hệ thống. Ngoài engine, phải có **runtime environment** (trình duyệt hoặc Node.js) cung cấp các API bổ sung (setTimeout, fetch, DOM...).

---

# 4. Quy trình Engine xử lý code

Khi bạn viết `console.log("Hello")` và chạy — engine làm gì?

```
     Mã nguồn JavaScript (.js file hoặc <script> tag)
                    │
     ═══════════════╪═══════════════
     BƯỚC 1:        ▼
     PHÂN TÍCH CÚ PHÁP (Parsing)
     ├── Đọc từng ký tự → tách thành TOKEN
     │   "var x = 5;"  →  [var] [x] [=] [5] [;]
     │
     ├── Kiểm tra cú pháp → Nếu sai → SyntaxError
     │   "var = 5;"  →  ❌ SyntaxError (thiếu tên biến)
     │
     └── Xây dựng AST (Abstract Syntax Tree — Cây cú pháp trừu tượng)
         → Biểu diễn code dưới dạng cây cấu trúc
     ═══════════════╪═══════════════
     BƯỚC 2:        ▼
     THÔNG DỊCH (Interpreter — Ignition trong V8)
     ├── Chuyển AST → Bytecode (mã trung gian, nhỏ gọn)
     ├── Thực thi bytecode NGAY → khởi động nhanh
     └── Đồng thời: thu thập profiling
         → Đoạn code nào chạy nhiều? Kiểu dữ liệu gì?
     ═══════════════╪═══════════════
     BƯỚC 3:        ▼
     TỐI ƯU HÓA (Optimizing Compiler — TurboFan trong V8)
     ├── Phát hiện "hot code" (code chạy nhiều lần)
     ├── Biên dịch hot code → MÃ MÁY TỐI ƯU (machine code)
     ├── Chạy cực nhanh cho lần sau
     └── Nếu giả định sai → DEOPTIMIZE → quay về bytecode
```

### AST là gì? Ví dụ nhanh:

```javascript
// Code: var x = 5 + 3;

// AST (dạng cây):
//      VariableDeclaration
//              │
//        VariableDeclarator
//         │            │
//    Identifier    BinaryExpression
//       "x"        │     │      │
//               Literal  "+"  Literal
//                 5             3
```

> Engine không chạy code text trực tiếp — nó chuyển thành cấu trúc cây để dễ phân tích và tối ưu.

---

# 5. JIT Compilation — Vừa thông dịch vừa biên dịch

## "Thông dịch" hay "Biên dịch"? — Câu trả lời chính xác

Câu hỏi kinh điển: *"JavaScript là ngôn ngữ thông dịch hay biên dịch?"*

| Cách dịch | Cách hoạt động | Ví dụ |
|-----------|---------------|-------|
| **Thông dịch thuần** | Đọc từng dòng → thực thi ngay → CHẬM nếu lặp nhiều | Python (truyền thống) |
| **Biên dịch trước** | Dịch toàn bộ → tạo file .exe → chạy file đó → NHANH nhưng chờ compile | C, C++, Go, Rust |
| **JIT (JavaScript)** | Thông dịch trước cho nhanh → biên dịch tối ưu phần "nóng" → **kết hợp cả hai** | V8, SpiderMonkey |

### Câu trả lời phỏng vấn:

> **"JavaScript sử dụng JIT compilation (biên dịch tức thời). Engine thông dịch code thành bytecode và chạy ngay để khởi động nhanh. Đồng thời, engine theo dõi những đoạn code chạy nhiều lần (hot code), rồi biên dịch chúng thành mã máy tối ưu để chạy nhanh hơn. Nên JavaScript KHÔNG thuần thông dịch, cũng KHÔNG thuần biên dịch — mà là sự kết hợp thông minh của cả hai."**

### Pipeline V8 cụ thể:

```
Mã nguồn
   │
   ▼
Parser ──→ AST
              │
              ▼
         ┌──────────┐
         │ Ignition  │  ← THÔNG DỊCH viên
         │ (bytecode)│     Chạy nhanh + thu thập profiling
         └────┬──────┘
              │
        Code "nóng"?
        (chạy nhiều lần)
              │
         ┌────▼──────┐
         │ TurboFan   │  ← BIÊN DỊCH viên tối ưu
         │ (machine   │     Tạo mã máy cực nhanh
         │  code)     │     Dựa trên profiling data
         └────────────┘
```

V8 hiện đại còn có thêm:
- **Sparkplug** — trình biên dịch cơ bản (baseline compiler), nhanh hơn Ignition nhưng chưa tối ưu bằng TurboFan
- **Maglev** — tầng trung gian giữa Sparkplug và TurboFan

> **Lưu ý quan trọng:** Đặc tả ECMAScript **KHÔNG quy định** engine phải dùng JIT hay thông dịch thuần — chỉ quy định **hành vi** của ngôn ngữ. JIT là **chi tiết triển khai** (implementation detail) của từng engine.

---

# 6. Deoptimization — Khi tối ưu bị "hỏng"

## Deoptimization là gì?

Khi TurboFan biên dịch hot code thành mã máy, nó phải **đoán** (speculate) về kiểu dữ liệu dựa trên profiling. Nếu đoán **sai** → mã máy tối ưu không còn đúng → engine phải **hủy bỏ** mã máy đó và **quay về** chạy bytecode (Ignition). Quá trình này gọi là **deoptimization**.

## Ví dụ cụ thể:

```javascript
function add(a, b) {
  return a + b;
}

// Lần 1-1000: luôn truyền number
add(1, 2);     // → 3
add(3, 4);     // → 7
// ...gọi thêm 998 lần với number

// TurboFan nhận thấy: "add() LUÔN nhận number, tôi tối ưu cho number!"
// → Biên dịch thành mã máy: chỉ cộng 2 số nguyên, KHÔNG kiểm tra kiểu
// → Chạy CỰC NHANH

// Lần 1001: bất ngờ truyền string!
add("hello", " world");  // → "hello world"

// 💥 DEOPTIMIZE!
// → Giả định "a, b luôn là number" bị SAI
// → Hủy bỏ mã máy tối ưu
// → Quay về Ignition chạy bytecode
// → Thu thập profiling lại từ đầu
```

```
Timeline:

[Ignition — bytecode]
 │
 │  add() chạy 1000 lần với number
 │  Profiling: "a, b luôn là number"
 │
 ▼
[TurboFan — machine code, tối ưu cho number]
 │
 │  ⚡ Chạy cực nhanh!
 │
 │  add("hello", " world")  ← kiểu sai!
 │
 ▼
💥 DEOPTIMIZE → quay về [Ignition — bytecode]
 │
 │  Thu thập profiling mới
 │  (giờ biết a, b có thể là number HOẶC string)
 │
 ▼
[TurboFan — machine code mới, handle cả number và string]
 │  → Vẫn nhanh nhưng KHÔNG nhanh bằng lần đầu
 │    (vì phải xử lý nhiều kiểu hơn)
```

## Tại sao điều này quan trọng?

1. **Giải thích tại sao TypeScript giúp hiệu năng**: Type ổn định → JIT ít bị deoptimize → code chạy nhanh hơn
2. **Best practice khi viết JS**: Giữ kiểu dữ liệu **nhất quán** cho biến và tham số
3. **Monomorphic vs Polymorphic**:
   - Hàm luôn nhận cùng 1 kiểu → **monomorphic** → tối ưu tốt nhất
   - Hàm nhận nhiều kiểu → **polymorphic** → tối ưu kém hơn
   - Hàm nhận quá nhiều kiểu → **megamorphic** → engine bỏ cuộc, không tối ưu

```javascript
// ✅ Monomorphic — TurboFan yêu thích
function square(n) { return n * n; }
square(2);   // number
square(3);   // number
square(4);   // number → luôn number → tối ưu tốt

// ❌ Megamorphic — TurboFan bó tay
function process(input) { return input.toString(); }
process(42);         // number
process("hello");    // string
process(true);       // boolean
process([1, 2, 3]);  // array
process({ a: 1 });   // object → quá nhiều kiểu → không tối ưu được
```

---

# 7. Cấu trúc Engine — Memory Heap & Call Stack

Mọi JavaScript Engine đều có **2 thành phần cốt lõi**:

```
┌──────────────────────────────────────────┐
│             JavaScript Engine             │
│                                          │
│   ┌────────────────────┐                 │
│   │   MEMORY HEAP       │  ← Lưu trữ    │
│   │                     │                │
│   │  Biến, hàm, objects │  Vùng nhớ      │
│   │  closures, arrays   │  KHÔNG có      │
│   │                     │  thứ tự        │
│   └────────────────────┘                 │
│                                          │
│   ┌────────────────────┐                 │
│   │   CALL STACK        │  ← Thực thi    │
│   │                     │                │
│   │  Ngăn xếp LIFO      │  Theo dõi     │
│   │  quản lý Execution  │  hàm nào      │
│   │  Context            │  đang chạy    │
│   └────────────────────┘                 │
│                                          │
└──────────────────────────────────────────┘
```

## Memory Heap (Bộ nhớ đống)

- Vùng nhớ **không có thứ tự cố định**, dùng để lưu trữ dữ liệu
- Khi engine **đọc** code, nó lưu **khai báo biến** và **định nghĩa hàm** vào đây
- **Quan trọng: Khai báo hàm ≠ Gọi hàm**

```javascript
var num = 2;                  // Engine lưu vào Heap: num → 2
function pow(num) {           // Engine lưu vào Heap: pow → [mô tả hàm]
  return num * num;
}
// Tại đây: pow CHƯA ĐƯỢC GỌI — engine chỉ "ghi nhận" là có hàm pow
// Giống như lưu số điện thoại vào danh bạ — chưa gọi ai cả

pow(num);                     // BÂY GIỜ mới gọi → tạo Execution Context → push vào Call Stack
```

## Call Stack (Ngăn xếp gọi hàm)

- Cấu trúc **LIFO** (vào sau ra trước) — như ống Pringles, miếng trên phải lấy trước
- Mỗi khi **gọi hàm** → push 1 **Execution Context** vào stack
- Khi hàm **return** → pop context ra → tiếp tục hàm bên dưới
- JavaScript chỉ có **1 Call Stack** → đây là lý do nó **đơn luồng**

```javascript
function multiply(a, b) { return a * b; }
function square(n)       { return multiply(n, n); }
function printSquare(n)  { const r = square(n); console.log(r); }

printSquare(4);
```

```
Bước 1: Bắt đầu                    Bước 2: Gọi printSquare
┌──────────────┐                    ┌──────────────┐
│  global()    │                    │ printSquare(4)│ ← push
└──────────────┘                    ├──────────────┤
                                    │  global()    │
                                    └──────────────┘

Bước 3: Gọi square                  Bước 4: Gọi multiply
┌──────────────┐                    ┌──────────────┐
│  square(4)   │ ← push            │ multiply(4,4)│ ← push (đỉnh)
├──────────────┤                    ├──────────────┤
│ printSquare(4)│                    │  square(4)   │
├──────────────┤                    ├──────────────┤
│  global()    │                    │ printSquare(4)│
└──────────────┘                    ├──────────────┤
                                    │  global()    │
                                    └──────────────┘

Bước 5: multiply return 16 → POP   Bước 6-8: lần lượt POP về global
┌──────────────┐
│  square(4)   │ ← bây giờ ở đỉnh
├──────────────┤
│ printSquare(4)│
├──────────────┤                    → Call Stack TRỐNG
│  global()    │                    → Event Loop bắt đầu kiểm tra queues
└──────────────┘
```

### Stack Overflow — khi Call Stack tràn

```javascript
function forever() {
  forever();  // Gọi chính mình, không có điểm dừng
}
forever();
// → RangeError: Maximum call stack size exceeded
// → Giới hạn: ~10,000 - 25,000 frames tùy engine
```

---

# 8. Execution Context — Môi trường thực thi code

## Execution Context là gì?

Execution Context là **"hộp"** chứa tất cả thông tin cần thiết để engine thực thi đoạn code — biến, tham số, `this`, scope chain.

## 2 loại Execution Context

| Loại | Khi nào tạo? | Số lượng | Chứa gì? |
|------|-------------|---------|---------|
| **Global Execution Context** | Khi file JS bắt đầu chạy | Duy nhất **1** | Biến toàn cục, hàm toàn cục, `this` = `window` (browser) hoặc `module.exports` (Node.js) |
| **Local (Function) Execution Context** | Mỗi khi **gọi** (call) một hàm | Bao nhiêu lần gọi = bấy nhiêu context | Tham số, biến cục bộ, `this`, tham chiếu scope ngoài |

```javascript
var name = 'Global';               // → Nằm trong Global Execution Context

function greet(who) {              // → Khai báo — lưu vào Memory Heap
  var message = 'Xin chào ' + who; // → Biến cục bộ trong Local Context
  return message;
}

greet('Việt Nam');                  // → TẠO Local Execution Context mới
                                   //   Chứa: who='Việt Nam', message='Xin chào Việt Nam'
greet('World');                    // → TẠO Local Execution Context MỚI (khác cái trước!)
                                   //   Chứa: who='World', message='Xin chào World'
```

```
┌──────────────────────────────────────────────┐
│          Global Execution Context             │
│                                              │
│   name = 'Global'                            │
│   greet = [function]                         │
│                                              │
│   ┌──────────────────────────────┐           │
│   │  Local Context: greet('VN')   │           │
│   │  who = 'Việt Nam'             │           │
│   │  message = 'Xin chào Việt Nam'│           │
│   └──────────────────────────────┘           │
│                                              │
└──────────────────────────────────────────────┘
```

> **Ghi nhớ:** Mỗi khi có hàm lồng nhau → engine tạo thêm Local Context bên trong Local Context. Càng nhiều hàm lồng → Call Stack càng cao → gần Stack Overflow hơn.

---

# 9. Vấn đề: Đơn luồng → Dễ bị nghẽn?

JavaScript đơn luồng → chỉ làm **1 việc tại 1 thời điểm**. Vậy nếu có tác vụ tốn thời gian thì sao?

```javascript
console.log('🟢 Bắt đầu');

// Giả sử gọi API mất 3 giây — NẾU blocking:
const data = fetchSync('/api/users');  // ⏳ Đứng im 3 giây — AI KÊU GÌ CŨNG KHÔNG NGHE

console.log('🟢 Kết thúc');
// → Trong 3 giây: UI đóng băng, click không phản hồi, animation dừng
```

```
Nếu BLOCKING (giả sử):
Main Thread: ─ log ─ fetch🧱🧱🧱🧱🧱 (3s block) ─ log ─
                      ↑
                      Toàn bộ chương trình ĐÓNG BĂNG 3 giây!
```

**→ Giải pháp:** JavaScript **KHÔNG làm I/O trực tiếp**. Nó **ủy thác** cho bên ngoài:

---

# 10. Web APIs & libuv — Ai xử lý bất đồng bộ?

## Điều quan trọng nhất cần hiểu:

> Rất nhiều hàm chúng ta dùng hàng ngày **KHÔNG PHẢI JavaScript gốc** — chúng được **runtime** cung cấp.

## Trong trình duyệt: Web APIs

| Hàm/API | Loại | KHÔNG phải JS gốc! |
|---------|------|:------------------:|
| `setTimeout`, `setInterval` | Timer API | ✅ |
| `fetch`, `XMLHttpRequest` | Network API | ✅ |
| `document.querySelector`, `addEventListener` | DOM API | ✅ |
| `console.log` | Console API | ✅ |
| `localStorage`, `sessionStorage` | Storage API | ✅ |
| `Geolocation`, `WebSocket`, `WebRTC` | Platform APIs | ✅ |

## Trong Node.js: libuv

Trong Node.js, **không có Web APIs** (vì không có trình duyệt). Thay vào đó, Node.js dùng **libuv** — một thư viện C++ cung cấp:

| Tính năng | Chi tiết |
|-----------|---------|
| **Thread Pool** | 4 threads mặc định (tùy chỉnh được) để xử lý I/O nặng |
| **I/O bất đồng bộ** | Đọc/ghi file, DNS lookup, mã hóa, nén... |
| **Event Loop** | Triển khai Event Loop cho Node.js (khác browser) |
| **Timer** | setTimeout, setInterval, setImmediate |
| **Network** | TCP, UDP, DNS, HTTP — dùng cơ chế I/O không chặn của hệ điều hành |

```
So sánh:

Trình duyệt:                        Node.js:
┌──────────────────┐                ┌──────────────────┐
│  JavaScript Code  │                │  JavaScript Code  │
│     (V8 Engine)   │                │     (V8 Engine)   │
└────────┬─────────┘                └────────┬─────────┘
         │                                   │
┌────────▼─────────┐                ┌────────▼─────────┐
│   WEB APIs        │                │   libuv (C++)     │
│   (Browser cung   │                │   (Thread Pool +  │
│    cấp)           │                │    OS async I/O)  │
│   • DOM           │                │   • fs (file)     │
│   • fetch         │                │   • net (network) │
│   • setTimeout    │                │   • crypto        │
│   • localStorage  │                │   • dns           │
└──────────────────┘                └──────────────────┘
```

> **Đây là lý do Node.js non-blocking dù JavaScript đơn luồng** — các tác vụ I/O nặng được libuv xử lý trên thread pool riêng, kết quả trả về qua Event Loop.

## Quy trình xử lý 1 hàm bất đồng bộ

```javascript
console.log('1 - Bắt đầu');

setTimeout(function callback() {
  console.log('2 - Timer xong!');
}, 2000);

console.log('3 - Kết thúc');
```

```
Bước 1: Engine chạy console.log('1 - Bắt đầu')
        → Output: "1 - Bắt đầu"

Bước 2: Engine gặp setTimeout
        → Đẩy setTimeout vào Call Stack (thoáng qua)
        → Giao callback + thời gian cho RUNTIME (Browser API / libuv)
        → Pop setTimeout ra khỏi Call Stack NGAY LẬP TỨC
        → Runtime đếm 2000ms ở BACKGROUND (thread riêng!)

Bước 3: Engine chạy console.log('3 - Kết thúc')
        → Output: "3 - Kết thúc"
        → Call Stack TRỐNG

Bước 4: (sau 2000ms) Runtime đếm xong
        → Đẩy callback vào CALLBACK QUEUE (hàng đợi)

Bước 5: Event Loop kiểm tra: "Call Stack trống?" → TRỐNG ✅
        → Lấy callback từ Queue → đẩy vào Call Stack
        → Thực thi → Output: "2 - Timer xong!"

Kết quả: 1 - Bắt đầu → 3 - Kết thúc → 2 - Timer xong!
```

---

# 11. Callback Queue & Event Loop

## Callback Queue (Hàng đợi gọi lại)

Khi runtime hoàn thành tác vụ bất đồng bộ (timer hết, API trả response, file đọc xong...), callback **KHÔNG** được đưa thẳng vào Call Stack — nó phải vào **hàng đợi** trước.

## Event Loop (Vòng lặp sự kiện)

Event Loop có **1 nhiệm vụ duy nhất**: liên tục kiểm tra *"Call Stack trống chưa?"*

```
Thuật toán Event Loop (đơn giản hóa):

while (true) {
  1. Chạy hết code đồng bộ trên Call Stack (đến khi trống)

  2. Call Stack trống?
     → CÓ → Kiểm tra Microtask Queue → chạy HẾT
     → Kiểm tra Macrotask Queue → lấy 1 task → chạy
     → Quay lại bước 2

  3. Lặp lại mãi mãi...
}
```

> **Event Loop là cầu nối** giữa JavaScript (đơn luồng, Call Stack) và thế giới bên ngoài (Web APIs / libuv, đa luồng). Nó biến ngôn ngữ đơn luồng thành hệ thống xử lý đồng thời (concurrent).

---

# 12. Microtask vs Macrotask — 2 loại hàng đợi

> Đây là **câu hỏi phỏng vấn rất phổ biến** — nhiều người chỉ biết "Callback Queue" nhưng thực tế có **2 loại queue** với **thứ tự ưu tiên khác nhau**.

## Phân biệt 2 loại queue

| | Microtask Queue | Macrotask Queue (Task Queue) |
|---|---|---|
| **Bao gồm** | `Promise.then/catch/finally`, `queueMicrotask()`, `MutationObserver`, code sau `await` | `setTimeout`, `setInterval`, `setImmediate` (Node), I/O callbacks, UI events |
| **Ưu tiên** | **CAO hơn** — luôn chạy trước | Thấp hơn — chạy sau |
| **Cách chạy** | Chạy **TẤT CẢ** cho đến khi queue trống | Chỉ chạy **1 task** rồi quay lại check microtask |

## Thứ tự ưu tiên chi tiết

```
Call Stack rỗng
    │
    ▼
1️⃣  Chạy HẾT Microtask Queue (ưu tiên cao nhất!)
    │   → Promise.then, queueMicrotask, code sau await
    │   → Nếu microtask tạo microtask mới → chạy luôn!
    │   → KHÔNG dừng cho đến khi queue TRỐNG
    │
    ▼
2️⃣  Render / Paint (nếu cần — ~60fps, mỗi 16.6ms)
    │   → requestAnimationFrame callbacks chạy ở đây
    │
    ▼
3️⃣  Lấy ĐÚNG 1 task từ Macrotask Queue
    │   → setTimeout, setInterval, I/O
    │
    └── Quay lại 1️⃣ (check microtask lại!)
```

## Ví dụ kinh điển (hay gặp trong phỏng vấn!):

```javascript
console.log("1");                              // A — Sync

setTimeout(() => console.log("2"), 0);         // B — Macrotask

Promise.resolve().then(() => console.log("3"));// C — Microtask

console.log("4");                              // D — Sync
```

```
═══ Bước 1: Chạy code đồng bộ ═══
  A: console.log("1")  → Output: "1"
  B: setTimeout(cb, 0) → Giao cho Runtime → callback vào MACROTASK Queue
  C: Promise.then(cb)  → callback vào MICROTASK Queue
  D: console.log("4")  → Output: "4"

  Call Stack: TRỐNG ✅
  Microtask Queue:  [ console.log("3") ]
  Macrotask Queue:  [ console.log("2") ]

═══ Bước 2: Drain Microtask Queue ═══
  → Lấy callback → Output: "3"
  
  Microtask Queue: TRỐNG ✅
  Macrotask Queue: [ console.log("2") ]

═══ Bước 3: Lấy 1 Macrotask ═══
  → Lấy callback → Output: "2"

═══ KẾT QUẢ ═══
1
4
3    ← Promise (microtask) chạy TRƯỚC setTimeout (macrotask)
2    ← dù setTimeout delay = 0!
```

> **Tại sao `3` in trước `2`?** Vì Microtask Queue luôn được "drain hết" trước khi Event Loop lấy macrotask tiếp theo. `Promise.then` là microtask, `setTimeout` là macrotask → Promise thắng!

## Ví dụ phức tạp hơn:

```javascript
console.log('A');

setTimeout(() => {
  console.log('B');
  Promise.resolve().then(() => console.log('C'));
}, 0);

Promise.resolve().then(() => {
  console.log('D');
  setTimeout(() => console.log('E'), 0);
});

console.log('F');
```

```
Output: A → F → D → B → C → E

Giải thích:
1. Sync: A, F
2. Microtask: D (Promise.then)
   → D tạo setTimeout('E') → vào Macrotask Queue
3. Macrotask: B (setTimeout đầu)
   → B tạo Promise.then('C') → vào Microtask Queue
4. Microtask: C (drain microtask trước macrotask tiếp)
5. Macrotask: E
```

---

# 13. Sơ đồ tổng quan toàn bộ hệ thống

```
┌────────────────────────────────────────────────────────────────────┐
│                        JAVASCRIPT RUNTIME                          │
│                                                                    │
│  ┌──────────────────────────────┐    ┌──────────────────────────┐ │
│  │     JAVASCRIPT ENGINE (V8)   │    │   RUNTIME ENVIRONMENT    │ │
│  │                              │    │   (Browser / Node.js)    │ │
│  │  ┌────────────────────┐     │    │                          │ │
│  │  │   Memory Heap       │     │    │  ┌────────────────────┐ │ │
│  │  │   (biến, hàm,      │     │    │  │  Web APIs (Browser) │ │ │
│  │  │    objects)          │     │    │  │  • setTimeout       │ │ │
│  │  └────────────────────┘     │    │  │  • fetch             │ │ │
│  │                              │    │  │  • DOM events        │ │ │
│  │  ┌────────────────────┐     │    │  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ │ │ │
│  │  │   Call Stack        │     │    │  │  libuv (Node.js)     │ │ │
│  │  │   (1 thread,       │────────▶│  │  • fs, net, crypto   │ │ │
│  │  │    Execution        │     │    │  │  • Thread Pool       │ │ │
│  │  │    Contexts)        │     │    │  │  • OS async I/O     │ │ │
│  │  └────────────────────┘     │    │  └─────────┬──────────┘ │ │
│  │                              │    │            │ (khi xong)  │ │
│  └──────────────────────────────┘    │            ▼             │ │
│                                      │  ┌────────────────────┐ │ │
│         ▲                            │  │ Microtask Queue     │ │ │
│         │ Event Loop                 │  │ [Promise, await...] │ │ │
│         │ "Call Stack trống?"        │  ├────────────────────┤ │ │
│         │                            │  │ Macrotask Queue     │ │ │
│         └────────────────────────────│  │ [setTimeout, I/O]   │ │ │
│                                      │  └────────────────────┘ │ │
│                                      └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

# 14. Tóm tắt — Nếu phỏng vấn hỏi "Nói về JavaScript"

> **JavaScript** là ngôn ngữ lập trình kiểu dữ liệu động, đa mô hình (hướng đối tượng, lập trình hàm, hướng sự kiện), tuân theo đặc tả **ECMAScript** do ủy ban TC39 quản lý. Hàm trong JavaScript là **đối tượng hạng nhất** — có thể gán, truyền, và return như mọi giá trị khác.
>
> JavaScript không phải ngôn ngữ thông dịch thuần — các engine hiện đại (V8, SpiderMonkey) sử dụng **JIT compilation**: Ignition thông dịch code thành bytecode để khởi động nhanh, đồng thời thu thập profiling. Những đoạn code chạy nhiều (hot code) được TurboFan biên dịch thành mã máy tối ưu.
>
> Engine gồm 2 phần chính: **Memory Heap** (lưu trữ) và **Call Stack** (thực thi). Vì chỉ có 1 Call Stack nên JavaScript là **đơn luồng**. Nhưng nhờ **runtime** (trình duyệt cung cấp Web APIs, Node.js cung cấp libuv) xử lý I/O ở background, kết hợp với **Callback Queue** (chia thành Microtask và Macrotask) và **Event Loop**, JavaScript xử lý bất đồng bộ hiệu quả mà không bị nghẽn.

---

# 15. Câu hỏi phỏng vấn thường gặp

## Q1: "JavaScript là ngôn ngữ thông dịch hay biên dịch?"

> Không phải cái nào thuần túy cả. Các engine hiện đại dùng **JIT compilation** — thông dịch trước để khởi động nhanh (Ignition tạo bytecode), rồi biên dịch tối ưu phần code chạy nhiều (TurboFan tạo mã máy). Đặc tả ECMAScript không quy định phải dùng cách nào — đó là chi tiết triển khai của từng engine.

## Q2: "JavaScript Engine là gì? Kể tên vài engine?"

> Engine là phần mềm đọc, dịch, và thực thi mã JavaScript. V8 (Chrome, Node.js), SpiderMonkey (Firefox), JavaScriptCore (Safari). Engine gồm 2 phần chính: Memory Heap (lưu trữ dữ liệu) và Call Stack (theo dõi hàm đang thực thi).

## Q3: "setTimeout có phải hàm JavaScript gốc không?"

> Không! setTimeout, fetch, console.log, DOM APIs... đều là **Web API** do trình duyệt cung cấp. Trong Node.js, các tác vụ I/O được xử lý bởi **libuv** (thư viện C++ với thread pool). JavaScript engine chỉ lo phần thực thi code — các tác vụ bất đồng bộ đều giao ra ngoài.

## Q4: "Tại sao JavaScript đơn luồng mà không bị nghẽn?"

> Nhờ 3 cơ chế: (1) **Web APIs / libuv** xử lý I/O ở background trên thread riêng. (2) **Callback Queue** (Microtask + Macrotask) xếp hàng kết quả. (3) **Event Loop** liên tục kiểm tra Call Stack — trống thì đưa callback từ queue vào thực thi. Engine đơn luồng, nhưng runtime đa luồng.

## Q5: "Microtask và Macrotask khác nhau thế nào?"

> **Microtask** (Promise.then, queueMicrotask, code sau await) có ưu tiên **cao hơn** — Event Loop chạy **hết** microtask trước khi lấy macrotask. **Macrotask** (setTimeout, setInterval, I/O) chỉ lấy **1 task** rồi quay lại check microtask. Đó là lý do `Promise.then` luôn chạy trước `setTimeout(cb, 0)`.

## Q6: "Deoptimization là gì?"

> Khi TurboFan biên dịch hot code thành mã máy, nó đoán kiểu dữ liệu dựa trên profiling. Nếu đoán sai (ví dụ hàm nhận number 1000 lần rồi bất ngờ nhận string) → mã máy không còn đúng → engine **hủy** mã tối ưu, **quay về** bytecode (Ignition), thu thập profiling lại. Đây là lý do giữ kiểu dữ liệu nhất quán giúp code chạy nhanh hơn.

## Q7: "Execution Context là gì?"

> Là "hộp" chứa thông tin cần thiết để thực thi code: biến, tham số, `this`, scope chain. Có 2 loại: Global Execution Context (tạo 1 lần khi chương trình chạy, chứa biến toàn cục) và Local/Function Execution Context (tạo mỗi khi gọi hàm, chứa biến cục bộ). Context được push vào Call Stack khi tạo và pop khi hàm return.

## Q8: "ECMAScript và JavaScript khác nhau thế nào?"

> ECMAScript là **đặc tả** — tài liệu kỹ thuật quy định ngôn ngữ nên hoạt động thế nào. JavaScript là **cài đặt cụ thể** (implementation) của đặc tả đó bởi các engine (V8, SpiderMonkey...). TC39 là ủy ban quản lý đặc tả, gồm đại diện từ Google, Mozilla, Apple, Microsoft.

## Q9: "Giải thích output của đoạn code này:"

```javascript
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");
```

> Output: `1, 4, 3, 2`. Sync chạy trước: "1", "4". Call Stack trống → drain Microtask Queue: "3" (Promise.then). Rồi mới lấy Macrotask: "2" (setTimeout). Dù setTimeout delay = 0, microtask luôn ưu tiên hơn macrotask.

---

> 📅 Tạo: 2026-02-17
> 📚 Nguồn: MDN Web Docs (developer.mozilla.org), V8.dev, ECMAScript Specification (ECMA-262), Node.js Documentation, Philip Roberts "What the heck is the Event Loop anyway?", Viblo
> 🎯 Mục tiêu: Trả lời tự tin từ junior đến senior về JavaScript runtime — từ định nghĩa ngôn ngữ, JIT compilation, Execution Context, đến Event Loop và Microtask/Macrotask
