# 📘 JavaScript — this, call, apply, bind

> Keyword `this` là một trong những khái niệm **khó hiểu nhất** và **hay bị hỏi nhất** trong phỏng vấn JavaScript.

---

## Mục lục

1. [`this` là gì?](#1-this-là-gì)
2. [5 quy tắc xác định `this`](#2-5-quy-tắc-xác-định-this)
3. [Arrow Function và `this`](#3-arrow-function-và-this)
4. [`call`, `apply`, `bind`](#4-call-apply-bind)
5. [`this` trong class ES6](#5-this-trong-class-es6)
6. [Callback & Event Handler — Bẫy mất `this`](#6-callback--event-handler--bẫy-mất-this)
7. [Bài tập đoán output](#7-bài-tập-đoán-output)
8. [Câu hỏi phỏng vấn](#8-câu-hỏi-phỏng-vấn)

---

# 1. `this` là gì?

> **`this`** là một từ khoá (keyword) đặc biệt được tự động gán giá trị **tại thời điểm hàm được GỌI** (runtime), không phải lúc hàm được định nghĩa.

**Bản chất:** `this` tham chiếu đến **object mà hàm đang được gọi từ** (calling context).

> ⚠️ **QUAN TRỌNG — Strict Mode:**
> Trong **strict mode** (`'use strict'` hoặc ES Modules), khi gọi hàm "trống" (không qua object), `this = **undefined**` — **KHÔNG phải** `window`/`global`.
> Trong **non-strict mode**, `this = window` (browser) hoặc `global` (Node.js).
> Hầu hết code thực tế (React, NestJS, TypeScript, ES Modules) **đều chạy strict mode** → `this = undefined` khi mất context.

```javascript
// CÙNG 1 hàm, nhưng this khác nhau tùy cách gọi:
function sayHi() {
  console.log(this.name);
}

const an = { name: 'An', sayHi };
const binh = { name: 'Bình', sayHi };

an.sayHi();     // 'An'   — this = an
binh.sayHi();   // 'Bình' — this = binh
sayHi();        // ❌ Non-strict: this = window → undefined hoặc ''
                // ❌ Strict mode: this = undefined → TypeError: Cannot read property 'name' of undefined
```

---

# 2. 5 Quy tắc xác định `this`

## Quy tắc 1: Default Binding — Gọi hàm "trống"

Khi gọi hàm đứng một mình (không có object phía trước):

```javascript
// ═══════════════════════════════════════════
// NON-STRICT MODE (mặc định trong script thường)
// ═══════════════════════════════════════════
function show() {
  console.log(this);
}
show();
// Browser: this = window
// Node.js: this = global object

// ═══════════════════════════════════════════
// STRICT MODE ('use strict', ES Modules, class body)
// ═══════════════════════════════════════════
'use strict';
function show() {
  console.log(this);
}
show(); // this = undefined ← NHẬN DIỆN NGAY lỗi thay vì trỏ nhầm global!
```

> **Tại sao strict mode là `undefined`?** Trỏ nhầm sang `window` là hành vi nguy hiểm — dễ vô tình gán/đọc biến global. Strict mode chặn điều này bằng cách trả `undefined` → bạn thấy lỗi sớm.
>
> **Thực tế:** React, Angular, Vue, NestJS, TypeScript **đều chạy strict mode** → bạn sẽ gặp `undefined` chứ không phải `window`.

## Quy tắc 2: Implicit Binding — Gọi qua object

Khi hàm được gọi **qua dot notation** (`obj.method()`):

```javascript
const user = {
  name: 'An',
  greet() {
    console.log(`Hi, I'm ${this.name}`);
  }
};

user.greet();  // 'Hi, I'm An' — this = user (object trước dấu chấm)
```

### ⚠️ Bẫy: Mất implicit binding

```javascript
const user = {
  name: 'An',
  greet() {
    console.log(this.name);
  }
};

// Gán method vào biến → MẤT context
const greetFn = user.greet;
greetFn();
// Non-strict: this = window → undefined (hoặc window.name)
// Strict mode: this = undefined → TypeError!

// Truyền method làm callback → CŨNG MẤT context
setTimeout(user.greet, 100);
// setTimeout nhận function rồi gọi nó "trống" → mất this
// Strict mode: TypeError | Non-strict: this = window
```

## Quy tắc 3: Explicit Binding — `call`, `apply`, `bind`

Bạn **chỉ định trực tiếp** `this` sẽ là gì:

```javascript
function greet(greeting) {
  console.log(`${greeting}, I'm ${this.name}`);
}

const user = { name: 'An' };

greet.call(user, 'Hi');    // 'Hi, I'm An'
greet.apply(user, ['Hi']); // 'Hi, I'm An'

const boundGreet = greet.bind(user);
boundGreet('Hello');       // 'Hello, I'm An'
```

## Quy tắc 4: `new` Binding — Constructor

Khi gọi hàm với `new`:

```javascript
function Person(name) {
  // this = {} (object mới rỗng, tự động tạo)
  this.name = name;
  // return this (tự động, không cần viết)
}

const an = new Person('An');
// this = an (object mới được tạo)
console.log(an.name); // 'An'
```

`new` làm 4 việc:
1. Tạo object rỗng `{}`
2. Gán `this` = object mới
3. Gán `__proto__` = `Person.prototype` *(bonus — đọc thêm ở JS/04 Prototypes)*
4. Return `this` (trừ khi function return object khác)

> 💡 *Bước 3 thiết lập prototype chain — cho phép object mới kế thừa methods từ `Person.prototype`. Nếu chưa biết prototype, chỉ cần nhớ: `new` tạo object mới và gán `this` vào đó.*

## Quy tắc 5: Arrow Function — Lexical `this`

Arrow function **KHÔNG CÓ `this` riêng**. Nó lấy `this` từ **scope bao ngoài** (lexical scope):

```javascript
const user = {
  name: 'An',
  greet() {
    // this = user (implicit binding)
    const inner = () => {
      console.log(this.name);  // this = user (lấy từ scope cha = greet)
    };
    inner();
  }
};

user.greet(); // 'An' ✅
```

## Bảng thứ tự ưu tiên

```
new > call/apply/bind > obj.method() > function()

1. new Binding          (new Foo())           → this = object mới
2. Explicit Binding     (call/apply/bind)     → this = đối tượng truyền vào
3. Implicit Binding     (obj.method())        → this = object trước dấu chấm
4. Default Binding      (foo())               → this = window/undefined
```

---

# 3. Arrow Function và `this`

## So sánh Regular vs Arrow Function

| Đặc điểm | Regular Function | Arrow Function |
|-----------|------------------|----------------|
| **`this`** | Xác định lúc GỌI | Xác định lúc VIẾT (lexical) |
| **`arguments`** | Có | ❌ Không (dùng `...args`) |
| **Dùng với `new`** | ✅ Được | ❌ Không |
| **`call/apply/bind`** | Thay đổi `this` | ❌ Không thay đổi `this` |
| **Prototype** | Có | ❌ Không |

```javascript
// ❌ Sai: Arrow function làm method
const obj = {
  name: 'An',
  greet: () => {
    console.log(this.name);  // this = WINDOW, không phải obj!
  }
};
obj.greet(); // undefined

// ✅ Đúng: Regular function làm method
const obj2 = {
  name: 'An',
  greet() {
    console.log(this.name);  // this = obj2
  }
};
obj2.greet(); // 'An'
```

```javascript
// ✅ Arrow function hữu ích bên trong method
const user = {
  name: 'An',
  loadPosts() {
    // this = user (implicit binding)
    fetch('/api/posts').then((posts) => {
      // Arrow function → this vẫn = user
      this.posts = posts;  // ✅
    });
  }
};

// ❌ Nếu dùng regular function
const user2 = {
  name: 'An',
  loadPosts() {
    fetch('/api/posts').then(function(posts) {
      this.posts = posts;  // ❌ this = undefined (strict) hoặc window
    });
  }
};
```

---

# 4. `call`, `apply`, `bind`

## So sánh

| Method | Gọi ngay? | Truyền args | Syntax |
|--------|-----------|-------------|--------|
| `call` | ✅ Ngay | Từng tham số | `fn.call(thisArg, a, b, c)` |
| `apply` | ✅ Ngay | Array | `fn.apply(thisArg, [a, b, c])` |
| `bind` | ❌ Trả về function mới | Từng tham số | `fn.bind(thisArg, a, b)` |

```javascript
function introduce(greeting, punctuation) {
  console.log(`${greeting}, I'm ${this.name}${punctuation}`);
}

const person = { name: 'An' };

// call — gọi ngay, truyền args riêng lẻ
introduce.call(person, 'Hi', '!');     // 'Hi, I'm An!'

// apply — gọi ngay, truyền args dạng array
introduce.apply(person, ['Hello', '.']); // 'Hello, I'm An.'

// bind — trả về function mới, gọi sau
const boundFn = introduce.bind(person, 'Hey');
boundFn('!!!');                        // 'Hey, I'm An!!!'
```

## Ứng dụng thực tế

### Mượn method từ object khác
```javascript
const arr = { 0: 'a', 1: 'b', 2: 'c', length: 3 };

// arr không có method slice (nó là object, không phải array)
// → Mượn slice từ Array.prototype
const result = Array.prototype.slice.call(arr);
console.log(result); // ['a', 'b', 'c']

// Cách hiện đại hơn:
Array.from(arr);           // ['a', 'b', 'c']
[...arr];                  // Nếu arr là iterable
```

### Fix mất context trong callback
```javascript
class Timer {
  constructor() {
    this.seconds = 0;
  }

  start() {
    // ❌ Mất this
    // setInterval(this.tick, 1000);

    // ✅ Fix 1: bind
    setInterval(this.tick.bind(this), 1000);

    // ✅ Fix 2: arrow function
    // setInterval(() => this.tick(), 1000);
  }

  tick() {
    this.seconds++;
    console.log(this.seconds);
  }
}
```

### Partial Application
```javascript
function log(level, message) {
  console.log(`[${level}] ${message}`);
}

// Tạo function mới với level đã được fix
const logError = log.bind(null, 'ERROR');
const logInfo = log.bind(null, 'INFO');

logError('Something broke');  // '[ERROR] Something broke'
logInfo('All good');          // '[INFO] All good'
```

---

# 5. `this` trong Class ES6

```javascript
class User {
  constructor(name) {
    this.name = name;
  }

  // Regular method — this phụ thuộc cách gọi
  greet() {
    console.log(`Hi, I'm ${this.name}`);
  }

  // Arrow function as class field — this luôn là instance
  greetArrow = () => {
    console.log(`Hi, I'm ${this.name}`);
  }
}

const user = new User('An');

// Gọi trực tiếp — OK cho cả hai
user.greet();       // 'Hi, I'm An' ✅
user.greetArrow();  // 'Hi, I'm An' ✅

// Gán vào biến — Regular method MẤT this
const fn1 = user.greet;
fn1(); // ❌ TypeError (strict mode) — this = undefined

const fn2 = user.greetArrow;
fn2(); // 'Hi, I'm An' ✅ — arrow function giữ this
```

> **Best Practice trong React/NestJS:** Dùng arrow function class fields cho event handlers và callbacks để tránh mất `this` context.

---

# 6. Callback & Event Handler — Bẫy mất `this`

Đây là bẫy **hay gặp nhất** trong thực tế. Section 2 đã nhắc, nhưng cần riêng 1 mục vì quá phổ biến.

## 6.1 Callback — Kẻ "ăn cắp" `this`

Khi bạn truyền method làm callback, **object bị tách ra** — chỉ còn function đứng một mình:

```javascript
const user = {
  name: 'An',
  greet() {
    console.log(`Hi, I'm ${this.name}`);
  }
};

// ❌ Truyền method làm callback → MẤT this
setTimeout(user.greet, 100);
// Tương đương:
// const fn = user.greet;  ← tách function ra
// setTimeout(fn, 100);     ← gọi fn() trống → this = undefined (strict)

// ❌ Dùng trong Array methods
[1, 2, 3].forEach(user.greet);
// Mỗi lần gọi: greet() trống → this mất!

// ❌ Truyền vào Promise
fetch('/api').then(user.handleResponse);
// handleResponse() bị gọi trống → this mất!
```

### 3 cách fix:

```javascript
// ✅ Fix 1: Arrow function wrapper (phổ biến nhất)
setTimeout(() => user.greet(), 100);
// Arrow function gọi user.greet() qua dot notation → this = user ✅

// ✅ Fix 2: bind
setTimeout(user.greet.bind(user), 100);
// Tạo function mới với this cố định = user

// ✅ Fix 3: Arrow function class field (xem section 5)
class User {
  greet = () => { console.log(`Hi, I'm ${this.name}`); }
  // this luôn = instance, không bao giờ mất
}
```

## 6.2 Event Handler (Browser)

Trong DOM event handlers, `this` = **element nhận event**:

```javascript
const button = document.querySelector('#btn');

// Regular function: this = button element
button.addEventListener('click', function() {
  console.log(this);           // <button id="btn">...</button> ✅
  console.log(this.textContent); // Text bên trong button
  this.style.color = 'red';    // ✅ Đổi style trực tiếp
});

// Arrow function: this = scope bao ngoài (thường là window hoặc module)
button.addEventListener('click', () => {
  console.log(this);           // window hoặc undefined ← KHÔNG phải button!
  // ❌ this.style.color = 'red'; → TypeError nếu strict mode
});
```

> **Quy tắc chọn:**
> - Cần access **chính element** đó (`this.style`, `this.value`...) → **regular function**
> - Cần access **biến/state bên ngoài** (React state, class property...) → **arrow function**

### Ví dụ thực tế: class + event handler

```javascript
class App {
  constructor() {
    this.count = 0;
    const btn = document.querySelector('#btn');

    // ❌ Regular function: this = button, KHÔNG phải App instance
    btn.addEventListener('click', function() {
      this.count++; // ❌ this = button → button.count = NaN
    });

    // ✅ Arrow function: this = App instance (lexical)
    btn.addEventListener('click', () => {
      this.count++; // ✅ this = App instance
      console.log(this.count);
    });
  }
}
```

---

# 7. Bài tập đoán output

## Bài 1
```javascript
const obj = {
  name: 'An',
  greet: function() {
    return function() {
      return this.name;
    };
  }
};

console.log(obj.greet()());
```
<details>
<summary>Đáp án</summary>

**undefined** (hoặc `''` nếu window.name tồn tại)

- `obj.greet()` trả về inner function
- Inner function được gọi **trống** → default binding → `this = window`
</details>

---

## Bài 2
```javascript
const obj = {
  name: 'An',
  greet: function() {
    return () => {
      return this.name;
    };
  }
};

console.log(obj.greet()());
```
<details>
<summary>Đáp án</summary>

**'An'**

- `obj.greet()` → `this = obj` (implicit binding)
- Arrow function lấy `this` từ scope cha = `greet` → `this.name = 'An'`
</details>

---

## Bài 3
```javascript
var name = 'Global';

const obj = {
  name: 'Object',
  greet: () => {
    console.log(this.name);
  }
};

obj.greet();
```
<details>
<summary>Đáp án</summary>

**'Global'**

- Arrow function ở top-level object literal → `this` = lexical scope = **global/window**
- `var name` gán vào `window.name` = 'Global'

**⚠️ Lưu ý:** Nếu dùng `const name = 'Global'` hoặc `let name = 'Global'` thay `var`, kết quả sẽ **KHÁC**:
- `const`/`let` **KHÔNG** gán vào `window` → `window.name` = `''` (string rỗng mặc định của `window.name`)
- Output sẽ là `''` thay vì `'Global'`
- Đây là khác biệt quan trọng giữa `var` (gán vào window) vs `let`/`const` (không gán)
</details>

---

## Bài 4
```javascript
function Person(name) {
  this.name = name;
  this.greet = function() {
    return this.name;
  };
}

const p = new Person('An');
const greet = p.greet;

console.log(p.greet());   // ?
console.log(greet());     // ?
```
<details>
<summary>Đáp án</summary>

- `p.greet()` → **'An'** (implicit binding, `this = p`)
- `greet()` → **undefined** (default binding, `this = window/undefined`)
</details>

---

# 8. Câu hỏi phỏng vấn

## Q1: "Giải thích keyword `this` trong JavaScript"

> **A:** `this` là keyword tham chiếu đến object mà hàm đang được gọi từ. Giá trị **không cố định** — xác định **lúc hàm được gọi** (runtime).
>
> 4 quy tắc ưu tiên: `new` > `call/apply/bind` > `obj.method()` > `fn()` trống.
> Gọi trống trong **strict mode** → `this = undefined` (KHÔNG phải window).
> Arrow function **không có `this` riêng**, kế thừa từ lexical scope.

## Q2: "`call`, `apply`, `bind` khác nhau thế nào?"

> **A:** Cả ba đều set `this` cho function. Khác nhau:
> - `call`: gọi ngay, truyền args riêng lẻ — `fn.call(obj, a, b)`
> - `apply`: gọi ngay, truyền args dạng array — `fn.apply(obj, [a, b])`
> - `bind`: **không gọi ngay**, trả về function mới với `this` đã cố định. Hữu ích cho callback, event handlers.
>
> Tip nhớ: "**C**all = **C**omma, **A**pply = **A**rray, **B**ind = **B**ound"

## Q3: "Tại sao arrow function và regular function có `this` khác nhau?"

> **A:** Regular function xác định `this` tại **thời điểm gọi** (dynamic binding). Arrow function **không tạo `this` riêng** — kế thừa `this` từ scope bên ngoài nơi được **định nghĩa** (lexical binding).
>
> Arrow function **lý tưởng cho callbacks** (không mất context), nhưng **không nên dùng làm method** của object literal (vì `this` sẽ không phải object đó).

## Q4: "`this` trong strict mode khác gì non-strict?"

> **A:** Khi gọi hàm "trống" (`fn()`):
> - **Non-strict:** `this = window` (browser) / `global` (Node.js) — nguy hiểm vì vô tình gán biến global
> - **Strict mode:** `this = undefined` — engine báo lỗi sớm thay vì hành vi sai im lặng
>
> Thực tế: React, Angular, NestJS, TypeScript, ES Modules **đều chạy strict mode** → khi mất context bạn sẽ thấy `TypeError: Cannot read property of undefined` chứ không phải giá trị sai im lặng.

## Q5: "Tại sao truyền method vào setTimeout/callback bị mất `this`?"

> **A:** Khi viết `setTimeout(user.greet, 100)`, bạn chỉ truyền **reference đến function** — object `user` bị tách ra. setTimeout sau đó gọi function "trống" (`fn()`) → default binding → `this = undefined` (strict).
>
> Fix: (1) arrow function wrapper `() => user.greet()`, (2) `.bind(user)`, (3) arrow function class fields.

---

> 📅 Tạo ngày: 2026-02-12 | Cập nhật: 2026-02-18
> 📚 Nguồn: MDN Web Docs, ECMAScript Specification, You Don't Know JS
> 🎯 Mục tiêu: Hiểu tường tận `this` — nguồn gốc của hàng tá bug trong JS
