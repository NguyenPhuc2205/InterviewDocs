# 📘 JavaScript — Scope, Hoisting & Closures

> **Tài liệu có hệ thống, đi vào bản chất** — Mỗi khái niệm được giải thích với ngữ cảnh "tại sao cần?", cơ chế bên trong "nó hoạt động thế nào?", và ví dụ thực tế. Ưu tiên tiếng Việt, dễ hiểu.

---

## Mục lục

1. [Tại Sao Phải Học?](#1-tại-sao-phải-học)
2. [Execution Context — Nền tảng](#2-execution-context)
3. [Call Stack — Quản lý thực thi](#3-call-stack)
4. [Scope — Phạm vi biến](#4-scope)
5. [Lexical Scope & Scope Chain](#5-lexical-scope--scope-chain)
6. [Hoisting & TDZ](#6-hoisting--tdz)
7. [var vs let vs const](#7-var-vs-let-vs-const)
8. [Closures](#8-closures)
9. [IIFE](#9-iife)
10. [Bài tập & Câu hỏi phỏng vấn](#10-bài-tập--câu-hỏi-phỏng-vấn)

---

# 1. Tại Sao Phải Học?

## Bug thực tế — Không hiểu scope + closure = viết bug

```javascript
async function sendEmails(users) {
  for (var i = 0; i < users.length; i++) {
    setTimeout(async () => {
      await sendEmail(users[i].email);  // ← BUG: i luôn = users.length!
    }, i * 1000);
  }
}
// Kết quả: Không email nào được gửi — users[i] = undefined → crash
// Fix: đổi var → let (mỗi iteration có i riêng)
```

## 3 lý do phải nắm vững

| # | Lý do | Chi tiết |
|---|-------|---------|
| 1 | **Debug bugs** | 80% bugs liên quan scope/closure — biến bị leak, giá trị sai, memory leak |
| 2 | **Pass phỏng vấn** | var vs let vs const (90%), hoisting (85%), closure (95%), TDZ (70%) |
| 3 | **Code chuyên nghiệp** | Data privacy (closure), module pattern, tránh global pollution |

---

# 2. Execution Context

## Ngữ cảnh: JavaScript chạy code như thế nào?

JavaScript **KHÔNG** chạy code từ trên xuống dưới đơn giản. Nó có **2 giai đoạn**:

```
Giai đoạn 1: CREATION PHASE (Chuẩn bị)
  → Scan toàn bộ code
  → Tìm khai báo biến và function
  → Setup môi trường (đây là lúc "hoisting" xảy ra!)

Giai đoạn 2: EXECUTION PHASE (Thực thi)
  → Chạy code từng dòng
  → Gán giá trị cho biến
```

## Execution Context là gì?

**Execution Context** = "Hộp" chứa mọi thông tin cần thiết để thực thi đoạn code — biến, hàm, `this`, scope chain.

### 2 loại chính:

| Loại | Khi nào tạo? | Số lượng | `this` |
|------|-------------|---------|--------|
| **Global EC** | Khi file JS bắt đầu chạy | Duy nhất **1** | `window` (browser) / `global` (Node) |
| **Function EC** | Mỗi khi **gọi** hàm | Bao nhiêu lần gọi = bấy nhiêu EC | Tùy cách gọi |

> **Lưu ý:** Mỗi lần gọi hàm = tạo EC **mới hoàn toàn**, kể cả gọi cùng 1 hàm nhiều lần.

### Bên trong Execution Context

```javascript
// Mỗi EC chứa:
ExecutionContext = {
  VariableEnvironment: {
    // var declarations → khởi tạo undefined
  },
  LexicalEnvironment: {
    // let, const declarations → CHƯA khởi tạo (TDZ)
    // outer reference → trỏ đến scope cha
  },
  this: /* giá trị this */
}
```

### Ví dụ 2 giai đoạn:

```javascript
console.log(x); // undefined (KHÔNG lỗi!)
console.log(y); // ❌ ReferenceError
var x = 10;
let y = 20;
```

```
=== CREATION PHASE ===
VariableEnvironment: { x: undefined }   ← var được khởi tạo undefined
LexicalEnvironment:  { y: <TDZ> }       ← let CHƯA khởi tạo

=== EXECUTION PHASE ===
console.log(x);  → undefined (x đã có từ Creation Phase)
console.log(y);  → ❌ ReferenceError (y trong TDZ)
x = 10;          → gán giá trị
let y = 20;      → khởi tạo y (TDZ kết thúc)
```

> **Đây là cơ chế bên trong của "hoisting"** — không phải code bị "dời lên trên", mà engine đã biết trước các khai báo từ Creation Phase.

---

# 3. Call Stack

## Call Stack là gì?

**Call Stack** = Cấu trúc LIFO (Last In, First Out) quản lý các Execution Context. Khi gọi hàm → push EC mới, khi hàm return → pop EC ra.

JavaScript chỉ có **1 Call Stack** → đây là lý do nó **đơn luồng**.

> 📎 **Xem chi tiết**: Call Stack internals, Memory Heap, Stack vs Heap, Garbage Collector → **21 - Call Stack, Memory Heap & Execution Model.md**

### Ví dụ từng bước:

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
Bước 1:           Bước 2:           Bước 3:           Bước 4:
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ global() │      │ first()  │push  │ second() │push  │ first()  │pop second
└──────────┘      ├──────────┤      ├──────────┤      ├──────────┤
                  │ global() │      │ first()  │      │ global() │
                  └──────────┘      ├──────────┤      └──────────┘
                                    │ global() │      
                                    └──────────┘      Output: First start
                  Output: First start                         Second
                                    Output: Second            First end
```

### Stack Overflow:

```javascript
function infinite() { infinite(); }  // Không có điểm dừng
infinite();  // → RangeError: Maximum call stack size exceeded (~10,000-25,000 frames)
```

---

# 4. Scope

## Scope là gì?

**Scope** = Phạm vi mà biến có thể được truy cập. Giống "phạm vi hoạt động":
- CMND → cả nước (global scope)
- Thẻ sinh viên → chỉ trong trường (function/block scope)

JavaScript có **4 loại scope**:

## 4.1 Global Scope

Biến khai báo **ngoài** mọi function/block → truy cập được **mọi nơi**.

```javascript
var globalVar = 'global var';
let globalLet = 'global let';

function test() {
  console.log(globalVar);   // ✅ OK
  console.log(globalLet);   // ✅ OK
}
```

> ⚠️ **Cạm bẫy:** `var` ở global gán vào `window` object (browser), `let`/`const` thì **KHÔNG**:
> ```javascript
> var x = 10;    console.log(window.x);  // 10 ← gán vào window!
> let y = 20;    console.log(window.y);  // undefined ← KHÔNG gán
> ```
> Nguy hiểm: `var alert = 'oops'` → ghi đè `window.alert()` → crash!

## 4.2 Function Scope

Biến trong function → **chỉ** truy cập trong function đó. Sau khi function kết thúc → biến bị giải phóng.

```javascript
function greet() {
  var message = 'hello';
  let name = 'An';
}
greet();
console.log(message); // ❌ ReferenceError
console.log(name);    // ❌ ReferenceError
```

> ⚠️ **`var` chỉ có function scope, KHÔNG có block scope** — đây là nguồn gốc nhiều bugs.

## 4.3 Block Scope (ES6+)

Biến `let`/`const` trong `{}` → chỉ truy cập trong block đó. `var` thì **leak ra ngoài!**

```javascript
if (true) {
  var a = 1;     // ❌ KHÔNG có block scope — leak!
  let b = 2;     // ✅ CÓ block scope
  const c = 3;   // ✅ CÓ block scope
}

console.log(a);  // 1 ✅ (var leak!)
console.log(b);  // ❌ ReferenceError
console.log(c);  // ❌ ReferenceError
```

**Block bao gồm:** `if/else`, `for/while`, `switch`, `try/catch`, và cả standalone `{}`.

### Ví dụ thực tế — var leak trong loop:

```javascript
for (var i = 0; i < 3; i++) { /* ... */ }
console.log(i); // 3 ← var leak ra ngoài!

for (let j = 0; j < 3; j++) { /* ... */ }
console.log(j); // ❌ ReferenceError ← let bị giới hạn ✅
```

## 4.4 Module Scope (ES6 Modules)

Mỗi file `.js` dùng `import`/`export` là 1 module → biến **KHÔNG** leak ra global.

```javascript
// file1.js
var x = 10;           // KHÔNG gán vào window
export const y = 20;  // Chỉ accessible qua import

// file2.js
import { y } from './file1.js';
console.log(y);       // ✅ 20
console.log(x);       // ❌ ReferenceError
```

> **Lợi ích:** Tránh global pollution, explicit dependencies, dễ maintain.

---

# 5. Lexical Scope & Scope Chain

## Lexical Scope — Scope xác định lúc VIẾT code

**"Lexical"** = liên quan đến "cách code được viết". Scope chain được xác định bởi **nơi hàm được ĐỊNH NGHĨA**, không phải nơi hàm được GỌI.

```javascript
const x = 'global';

function foo() {
  console.log(x);  // Tìm x ở đâu?
}

function bar() {
  const x = 'bar';
  foo();  // Gọi foo() TỪ TRONG bar()
}

bar();
// Output: 'global' ← KHÔNG phải 'bar'!
```

**Tại sao?** Vì `foo()` được **ĐỊNH NGHĨA** ở global scope → scope chain của foo là `foo → global`, **KHÔNG** bao gồm `bar`.

```
foo() scope → global scope (nơi foo được VIẾT)
                ↑
          Tìm x ở đây → x = 'global'
          KHÔNG phải ở bar()
```

> **Ghi nhớ:** Scope chain quyết định bởi **vị trí trong source code**, không phải call stack.

## Scope Chain — Cơ chế tìm biến

Khi engine gặp 1 biến, nó tìm theo chuỗi:

```
Scope hiện tại → Scope cha → Scope ông → ... → Global
     ↓               ↓            ↓                ↓
  Có? DỪNG       Có? DỪNG    Có? DỪNG     Không có? → ReferenceError
```

### Ví dụ:

```javascript
const a = 'global';

function level1() {
  const b = 'level1';
  
  function level2() {
    const c = 'level2';
    console.log(a); // level2 ❌ → level1 ❌ → global ✅ = 'global'
    console.log(b); // level2 ❌ → level1 ✅ = 'level1'
    console.log(c); // level2 ✅ = 'level2'
  }
  level2();
}
level1();
```

## Shadowing — Biến trùng tên

Khi inner scope có biến cùng tên → nó **"che"** biến outer scope (tìm thấy ở scope gần nhất → dừng).

```javascript
const x = 'global';

function test() {
  const x = 'local';       // Shadow biến global
  console.log(x);          // 'local' ← tìm ở scope gần nhất
}

test();
console.log(x);            // 'global' ← biến global vẫn nguyên
```

> **Best practice:** Tránh shadow ngoài ý muốn — dễ confuse. Nhưng shadow có chủ đích thì OK (tránh xung đột tên biến).

---

# 6. Hoisting & TDZ

## Hoisting là gì?

> **Hoisting là hành vi mà JS Engine xử lý các khai báo biến và hàm trước khi thực thi code, khiến chúng có vẻ như được đưa lên đầu scope.**
>
> Code không thật sự bị di chuyển — engine chỉ đăng ký khai báo vào bộ nhớ trước khi chạy.
>
> — Dựa theo [MDN: Hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)

### Cụ thể hơn — Creation Phase và Execution Phase

Khi JS Engine chạy code, nó trải qua **2 giai đoạn**:

**Giai đoạn 1 — Creation Phase (tạo lập):**
- Engine **đọc toàn bộ code** trước, chưa chạy dòng nào
- Tạo **Execution Context** chứa **Environment Record** — nơi đăng ký tất cả tên biến, hàm
- **Đây chính là lúc hoisting xảy ra**

**Giai đoạn 2 — Execution Phase (thực thi):**
- Chạy code **từng dòng** từ trên xuống
- Gán giá trị, gọi hàm, tính toán...

```
Ví dụ — code bạn viết:      │  Engine thấy:
                              │
console.log(a);               │  Creation Phase:
var a = 10;                   │    → đăng ký a = undefined
console.log(b);               │    → đăng ký b (chưa khởi tạo → TDZ)
let b = 20;                   │    → đăng ký sayHi = function đầy đủ
sayHi();                      │
function sayHi() {            │  Execution Phase:
  console.log('Hi');          │    → console.log(a) → undefined
}                             │    → a = 10
                              │    → console.log(b) → ❌ ReferenceError (TDZ)
```

### Quy trình khởi tạo biến — var vs let/const

Mỗi biến đi qua **3 giai đoạn**. Khác biệt giữa `var` và `let/const` nằm ở **thời điểm** từng giai đoạn xảy ra:

```
Giai đoạn         var a = 10              let b = 20
─────────────────────────────────────────────────────────
① Khai báo         ✅ Creation Phase        ✅ Creation Phase
  (đăng ký tên     (đăng ký 'a')           (đăng ký 'b')
   vào scope)

② Khởi tạo         ✅ Creation Phase        ❌ BỊ HOÃN → TDZ
  (gán giá trị     (a = undefined)         (chưa khởi tạo
   mặc định)                                → dùng = lỗi!)

③ Gán giá trị      Execution Phase         Execution Phase
  (gán giá trị     (a = 10)                (② + ③ xảy ra cùng lúc
   bạn viết)                                → b = 20, TDZ kết thúc)
```

**Tóm lại:**
- `var`: Creation Phase làm cả **① + ②** → dùng trước = `undefined`
- `let/const`: Creation Phase chỉ làm **①**, hoãn **②** → dùng trước = **lỗi** (TDZ)
- `function declaration`: Creation Phase làm **① + ② + ③** → dùng trước = **OK hoàn toàn**

### Tại sao có Hoisting?

1. **Cho phép gọi function trước khi định nghĩa** — tổ chức code: main logic trên, helpers dưới
2. **Tương thích ngược** — code cũ cần chạy được
3. **Đơn giản hóa compiler** — biết trước tất cả declarations

---

## 6.1 var Hoisting

`var` được hoist và **khởi tạo `undefined`** ngay trong Creation Phase:

```javascript
console.log(x);  // undefined (KHÔNG phải ReferenceError!)
var x = 5;
console.log(x);  // 5
```

```
Creation Phase:   ① Khai báo 'x' + ② Khởi tạo x = undefined
Execution Phase:  console.log(x) → undefined
                  ③ x = 5
                  console.log(x) → 5
```

**Cạm bẫy:** `var` trong block vẫn hoist lên đầu **function** (không phải block):

```javascript
function test() {
  console.log(x); // undefined ← đã hoist lên đầu function!
  if (true) {
    var x = 10;   // Hoist lên đầu FUNCTION, không phải đầu if
  }
  console.log(x); // 10
}
```

---

## 6.2 let/const Hoisting — TDZ (Temporal Dead Zone)

`let`/`const` **CŨNG** được hoist, NHƯNG chỉ **khai báo**, **không khởi tạo** → nằm trong **TDZ** cho đến dòng khai báo.

### TDZ là gì?

**Temporal Dead Zone (Vùng chết tạm thời)** = khoảng từ **đầu scope** đến **dòng khai báo `let/const`**. Biến tồn tại nhưng **chặn truy cập** → `ReferenceError`.

```
{
  // ┌─── TDZ cho x bắt đầu ───┐
  // │                          │
  // │  console.log(x);        │ → ❌ ReferenceError
  // │  typeof x;              │ → ❌ ReferenceError (khác var!)
  // │                          │
  // └─── TDZ kết thúc ────────┘
  let x = 10;    // ← TDZ kết thúc TẠI ĐÂY (② khởi tạo + ③ gán xảy ra cùng lúc)
  console.log(x); // 10 ✅
}
```

### Chứng minh let/const ĐƯỢC hoist

Nếu let **KHÔNG** hoist, code này phải in `'global'`:

```javascript
let x = 'global';

function test() {
  console.log(x); // ❌ ReferenceError (KHÔNG phải 'global'!)
  let x = 'local';
}
test();
```

**Giải thích:** `let x` đã được **khai báo** (①) lên đầu function trong Creation Phase → engine biết có `x` cục bộ → nhưng `x` chưa **khởi tạo** (②) → đang trong TDZ → lỗi. Nếu KHÔNG hoist → engine sẽ tìm lên scope ngoài → in `'global'`.

### Tại sao cần TDZ?

1. **Phát hiện lỗi sớm** — `undefined` im lặng che bug, ReferenceError bắt ngay
2. **`const` có ý nghĩa** — nếu không có TDZ, `const` sẽ là `undefined` trước khi gán → vô nghĩa
3. **Nhất quán** — tất cả ES6 features (let, const, class) có behavior giống nhau

### TDZ cases đặc biệt:

```javascript
// typeof — unsafe với TDZ!
typeof undeclaredVar;  // 'undefined' ✅ (safe — biến chưa tồn tại)
typeof letVar;         // ❌ ReferenceError (biến TỒN TẠI nhưng trong TDZ)
let letVar = 10;

// Function parameters — TDZ từ trái sang phải
function test(a = b, b = 2) { }
test();  // ❌ ReferenceError: b chưa khởi tạo khi a cần nó

function test2(a = 2, b = a) { }
test2(); // ✅ OK: a đã khởi tạo trước b
```

---

## 6.3 Function Hoisting

**Function declaration** — hoist **HOÀN TOÀN** (cả tên và body) — ① + ② + ③ trong Creation Phase:

```javascript
sayHello(); // ✅ 'Hello!' — gọi TRƯỚC khi định nghĩa

function sayHello() {
  console.log('Hello!');
}
```

**Function expression** — chỉ hoist biến, KHÔNG hoist body:

```javascript
sayHello(); // ❌ TypeError: sayHello is not a function

var sayHello = function() {
  console.log('Hello!');
};
// Creation: var sayHello = undefined (② khởi tạo biến, chưa có function)
// Execution: sayHello() → undefined() → TypeError
```

**Arrow function** — giống function expression:

```javascript
greet(); // ❌ ReferenceError (TDZ — vì dùng const)
const greet = () => console.log('Hi');
```

---

## 6.4 Bảng tổng hợp Hoisting

| Loại | Hoist? | Khởi tạo khi nào? | Truy cập trước khai báo |
|------|--------|-----------|------------------------|
| `var` | ✅ | Creation Phase → `undefined` | `undefined` (im lặng!) |
| `let` | ✅ | Execution Phase (dòng khai báo) | ❌ ReferenceError (TDZ) |
| `const` | ✅ | Execution Phase (dòng khai báo) | ❌ ReferenceError (TDZ) |
| `function declaration` | ✅ **Hoàn toàn** | Creation Phase → cả body | ✅ Gọi được |
| `function expression` | ⚠️ Chỉ biến | Tùy var/let/const | ❌ TypeError hoặc ReferenceError |
| `class` | ✅ | Execution Phase (dòng khai báo) | ❌ ReferenceError (TDZ) |

### 💬 Câu trả lời phỏng vấn gọn nhất

> **"Hoisting là hành vi mà JS Engine xử lý các khai báo biến và hàm trước khi thực thi code, khiến chúng có vẻ như được đưa lên đầu scope. Cụ thể:**
> - **`function`**: hoist toàn bộ — gọi trước khai báo được
> - **`var`**: hoist + gán `undefined` — dùng trước không lỗi nhưng = `undefined`
> - **`let/const`**: cũng hoist nhưng nằm trong TDZ — dùng trước sẽ lỗi `ReferenceError`
>
> **Code không thật sự bị di chuyển** — engine chỉ đăng ký khai báo vào bộ nhớ trước khi chạy."

---

# 7. var vs let vs const

## Bảng so sánh đầy đủ

| Đặc điểm | `var` | `let` | `const` |
|-----------|-------|-------|---------| 
| **Scope** | Function | Block | Block |
| **Hoisting** | ✅ + `undefined` | ✅ + TDZ | ✅ + TDZ |
| **Re-declaration** | ✅ Cho phép (nguy hiểm!) | ❌ SyntaxError | ❌ SyntaxError |
| **Re-assignment** | ✅ | ✅ | ❌ TypeError |
| **Gán vào window** | ✅ | ❌ | ❌ |
| **Khởi tạo bắt buộc** | Không | Không | **Có** |

## const — KHÔNG ngăn mutation!

```javascript
const obj = { name: 'An' };
obj.name = 'Bình';     // ✅ OK — mutate property
obj = { name: 'C' };   // ❌ TypeError — gán LẠI biến

const arr = [1, 2, 3];
arr.push(4);           // ✅ OK — mutate array
arr = [5, 6];          // ❌ TypeError — gán lại biến
```

```
const chỉ ngăn GÁN LẠI REFERENCE, KHÔNG ngăn MUTATE:

Stack:  obj = 0x1234 ← const ngăn gán lại CÁI NÀY
           ↓
Heap:   0x1234 → { name: 'Bình' }  ← KHÔNG ngăn thay đổi CÁI NÀY
```

> Muốn immutable thực sự? Dùng `Object.freeze()` (shallow) hoặc deep freeze.

## Decision Tree

```
Cần khai báo biến?
  ↓
Biến này có thay đổi giá trị không?
  ↓ Yes           ↓ No
  let             const (MẶC ĐỊNH)
```

**Best Practices:**
- ✅ **Mặc định `const`** — chỉ dùng `let` khi cần gán lại
- ❌ **KHÔNG BAO GIỜ dùng `var`** trong code mới

---

# 8. Closures

## Closure là gì?

> **Closure** = Một hàm **có quyền truy cập** vào biến ở scope bên ngoài nó, **ngay cả sau khi scope bên ngoài đã kết thúc thực thi**.

Khi bạn tạo function bên trong function khác → inner function **"nhớ"** môi trường nơi nó được tạo. Đây là nhờ **Lexical Scope** — scope chain được quyết định lúc viết code.

## Ví dụ cơ bản:

```javascript
function createCounter() {
  let count = 0;  // Biến private — không truy cập từ ngoài

  return function() {
    count++;       // Closure — vẫn truy cập count!
    return count;
  };
}

const counter = createCounter();
counter(); // 1
counter(); // 2
counter(); // 3

// count KHÔNG thể truy cập trực tiếp:
// console.log(count); → ❌ ReferenceError
```

## Cơ chế bên trong — Tại sao closure "nhớ" được?

```
1. createCounter() được gọi → tạo Execution Context, trong đó count = 0
2. Inner function được tạo → giữ reference đến [[Environment]] = scope của createCounter
3. createCounter() return → Execution Context bị pop khỏi Call Stack
4. NHƯNG: biến count KHÔNG bị garbage collected
   → Vì inner function (counter) vẫn giữ reference đến nó
5. Mỗi lần gọi counter() → truy cập count qua closure

Bộ nhớ:
┌────────────────────────┐
│  counter (function)    │
│  [[Environment]] ──────│──→ { count: 3 }  ← Vẫn sống trong Heap!
└────────────────────────┘
```

## Ứng dụng thực tế

### 1. Data Privacy (Module Pattern)

```javascript
function createUser(name) {
  let _password = '';  // Private — chỉ truy cập qua methods

  return {
    getName: () => name,
    setPassword: (pwd) => { _password = pwd; },
    checkPassword: (pwd) => pwd === _password,
  };
}

const user = createUser('An');
user.setPassword('secret123');
user.checkPassword('secret123');  // true
// user._password → undefined (không truy cập được!)
```

### 2. Factory Functions

```javascript
function multiply(x) {
  return function(y) {
    return x * y;  // x được "nhớ" qua closure
  };
}

const double = multiply(2);
const triple = multiply(3);
double(5);  // 10
triple(5);  // 15
```

### 3. Memoization (Cache kết quả)

```javascript
function memoize(fn) {
  const cache = {};  // Closure giữ cache sống

  return function(...args) {
    const key = JSON.stringify(args);
    if (cache[key] !== undefined) return cache[key];
    const result = fn(...args);
    cache[key] = result;
    return result;
  };
}

const expensiveCalc = memoize((n) => n * n);
expensiveCalc(5);  // Tính... 25
expensiveCalc(5);  // Từ cache! 25
```

## Cạm bẫy kinh điển: Closure + var + Loop

```javascript
// ❌ BUG KINH ĐIỂN:
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3 (KHÔNG PHẢI 0, 1, 2!)

// Tại sao?
// var i có FUNCTION scope → chỉ có 1 biến i duy nhất
// Khi callbacks chạy (sau 100ms) → loop đã kết thúc → i = 3
// Cả 3 closure tham chiếu CÙNG 1 biến i = 3
```

```javascript
// ✅ Fix 1: let (mỗi iteration có i riêng nhờ block scope)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2 ✅

// ✅ Fix 2: IIFE tạo scope riêng cho mỗi iteration
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 100);
  })(i);
}
// Output: 0, 1, 2 ✅
```

---

# 9. IIFE

**IIFE** (Immediately Invoked Function Expression) = hàm được **định nghĩa và gọi ngay lập tức**.

```javascript
(function() {
  console.log('Chạy ngay!');
})();

// Arrow function
(() => console.log('Arrow IIFE!'))();

// Với tham số
(function(name) {
  console.log('Hello ' + name);
})('An');
```

## Tại sao dùng IIFE?

1. **Tạo scope riêng** — tránh ô nhiễm global scope (trước khi có `let`/`const` và ES Modules)
2. **Module Pattern** — tạo private variables
3. **Initialization** — chạy code setup 1 lần

```javascript
// Module Pattern kinh điển
const Calculator = (function() {
  let history = [];  // Private — không ai truy cập được

  return {
    add(a, b) {
      const result = a + b;
      history.push(`${a} + ${b} = ${result}`);
      return result;
    },
    getHistory() { return [...history]; }
  };
})();

Calculator.add(1, 2);     // 3
Calculator.getHistory();   // ['1 + 2 = 3']
// Calculator.history → undefined (private!)
```

> **Ngày nay:** ES6 Modules (`import`/`export`) thay thế hầu hết use cases của IIFE. Nhưng vẫn gặp trong legacy code và một số patterns.

---

# 10. Bài tập & Câu hỏi phỏng vấn

## Bài tập đoán output

### Bài 1:
```javascript
var a = 1;
function test() {
  console.log(a);  // ?
  var a = 2;
  console.log(a);  // ?
}
test();
```
<details>
<summary>Đáp án</summary>

**undefined, 2**

- `var a` trong function được hoist lên đầu function → `a = undefined`
- `console.log(a)` → `undefined` (local `a` shadow global `a`)
- `a = 2` → gán giá trị → `console.log(a)` → `2`
</details>

---

### Bài 2:
```javascript
let x = 1;
function foo() {
  console.log(x);  // ?
  let x = 2;
}
foo();
```
<details>
<summary>Đáp án</summary>

**❌ ReferenceError: Cannot access 'x' before initialization**

- `let x` được hoist nhưng nằm trong TDZ
- `console.log(x)` truy cập x trong TDZ → ReferenceError
- Nếu là `var` thì sẽ ra `undefined`
</details>

---

### Bài 3:
```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```
<details>
<summary>Đáp án</summary>

**3, 3, 3**

- `var i` → function scope → chỉ có 1 biến `i`
- setTimeout callbacks chạy SAU khi loop kết thúc
- Lúc đó `i = 3` → tất cả closure cùng tham chiếu `i = 3`
</details>

---

### Bài 4:
```javascript
function createFunctions() {
  let result = [];
  for (let i = 0; i < 3; i++) {
    result.push(function() { return i; });
  }
  return result;
}

const fns = createFunctions();
console.log(fns[0](), fns[1](), fns[2]());  // ?
```
<details>
<summary>Đáp án</summary>

**0, 1, 2**

- `let i` → block scope → mỗi iteration có biến `i` riêng
- Mỗi closure "nhớ" giá trị `i` của iteration tương ứng
</details>

---

### Bài 5:
```javascript
var name = 'Global';
const obj = {
  name: 'Object',
  getName: function() {
    return function() {
      return this.name;
    };
  }
};
console.log(obj.getName()());  // ?
```
<details>
<summary>Đáp án</summary>

**'Global'** (hoặc `undefined` trong strict mode)

- `obj.getName()` trả về inner function
- Inner function được gọi **không có context** → `this` = `window`
- `window.name` = `'Global'` (vì `var name` gán vào window)
- **Fix:** dùng arrow function `() => this.name` (lấy `this` từ lexical scope)
</details>

---

### Bài 6:
```javascript
console.log(typeof foo);  // ?
console.log(typeof bar);  // ?

function foo() {}
var bar = function() {};
```
<details>
<summary>Đáp án</summary>

**'function', 'undefined'**

- `foo` = function declaration → hoist HOÀN TOÀN → `typeof` = `'function'`
- `bar` = function expression với `var` → chỉ hoist biến `bar = undefined` → `typeof undefined` = `'undefined'`
</details>

---

## Câu hỏi phỏng vấn

## Q1: "Closure là gì? Cho ví dụ"

> **A:** Closure là khi inner function có quyền truy cập biến ở scope bên ngoài, ngay cả sau khi outer function đã return. Cơ chế: inner function giữ reference đến `[[Environment]]` — lexical environment nơi nó được tạo → biến outer KHÔNG bị garbage collected. Ứng dụng: data privacy, factory functions, memoization.

## Q2: "var, let, const khác nhau thế nào?"

> **A:** 3 điểm chính: (1) **Scope** — `var` là function scope (leak ra block), let/const là block scope. (2) **Hoisting** — `var` hoist + `undefined`, let/const hoist + TDZ (ReferenceError). (3) **Re-assign** — `const` không cho gán lại, nhưng **cho phép mutate** object/array. Best practice: mặc định `const`, chỉ `let` khi cần gán lại, **KHÔNG** dùng `var`.

## Q3: "Giải thích hoisting"

> **A:** Hoisting là hành vi engine "biết trước" khai báo trong Creation Phase trước khi thực thi. `var` hoist + khởi tạo `undefined`. `let`/`const` hoist nhưng nằm trong **TDZ** — truy cập trước khai báo gây ReferenceError. Function declaration hoist **hoàn toàn** (cả body), function expression thì không. Đây không phải code bị "dời lên trên" — mà engine xử lý trong 2 giai đoạn: Creation Phase và Execution Phase.

## Q4: "TDZ là gì? Tại sao cần nó?"

> **A:** Temporal Dead Zone là khoảng từ khi scope bắt đầu đến khi biến let/const được khai báo. Trong TDZ biến tồn tại (đã hoist) nhưng chưa khởi tạo → ReferenceError. TDZ cần vì: (1) Phát hiện lỗi "dùng trước khai báo" ngay — thay vì `undefined` im lặng. (2) `const` cần có giá trị ngay từ đầu — không thể là `undefined` rồi đổi. (3) Nhất quán với class hoisting.

## Q5: "Tại sao for(var i...) + setTimeout in ra cùng 1 giá trị?"

> **A:** `var` có function scope → toàn bộ loop chỉ có 1 biến `i`. Tất cả setTimeout callbacks tham chiếu cùng biến `i` qua closure. Khi callbacks chạy (sau khi loop kết thúc), `i` đã = giá trị cuối. Fix: dùng `let` (mỗi iteration có `i` riêng nhờ block scope), hoặc IIFE tạo scope riêng.

## Q6: "Lexical Scope là gì?"

> **A:** Lexical Scope nghĩa là scope chain được xác định bởi **vị trí code được VIẾT** (lúc parse), không phải nơi hàm được GỌI (lúc runtime). Nếu function `foo` được định nghĩa ở global → scope chain của foo luôn là `foo → global`, bất kể foo được gọi từ đâu. Đây là cơ sở cho closure — inner function "nhớ" scope nơi nó được viết.

---

> 📅 Tạo ngày: 2026-02-12 | Cập nhật: 2026-02-18
> 📚 Nguồn: MDN Web Docs, ECMAScript Specification, YDKJS (You Don't Know JS)
> 🎯 Mục tiêu: Nắm vững bản chất scope chain, hoisting, closures — nền tảng cho mọi pattern JS
