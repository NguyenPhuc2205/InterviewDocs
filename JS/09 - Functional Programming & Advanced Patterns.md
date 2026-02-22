# 📘 JavaScript — Functional Programming & Advanced Patterns

> Functional Programming (FP) không chỉ là xu hướng — nó là **nền tảng tư duy** đằng sau React, Redux, RxJS, và hầu hết thư viện JS hiện đại.

---

## Mục lục

1. [Functional Programming là gì?](#1-functional-programming-là-gì)
2. [Pure Functions & Side Effects](#2-pure-functions--side-effects)
3. [Immutability](#3-immutability)
4. [Higher-Order Functions (HOF)](#4-higher-order-functions)
5. [Closures trong FP](#5-closures-trong-fp)
6. [Currying & Partial Application](#6-currying--partial-application)
7. [Function Composition](#7-function-composition)
8. [Recursion & Tail Call Optimization](#8-recursion)
9. [Design Patterns trong JavaScript](#9-design-patterns)
10. [Memoization & Performance Patterns](#10-memoization)
11. [Bài tập thực hành](#11-bài-tập-thực-hành)
12. [Câu hỏi phỏng vấn](#12-câu-hỏi-phỏng-vấn)

---

# 1. Functional Programming là gì?

## Imperative vs Declarative

```javascript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// ❌ IMPERATIVE — "Làm THẾ NÀO" (how)
const result1 = [];
for (let i = 0; i < numbers.length; i++) {
  if (numbers[i] % 2 === 0) {
    result1.push(numbers[i] * 2);
  }
}
// result1 = [4, 8, 12, 16, 20]

// ✅ DECLARATIVE/FP — "Muốn CÁI GÌ" (what)
const result2 = numbers
  .filter(n => n % 2 === 0)
  .map(n => n * 2);
// result2 = [4, 8, 12, 16, 20]
```

## Nguyên tắc cốt lõi của FP

| Nguyên tắc | Giải thích |
|------------|-----------|
| **Pure Functions** | Cùng input → cùng output, không side effects |
| **Immutability** | Không thay đổi dữ liệu gốc, tạo bản mới |
| **First-class Functions** | Function = value, truyền như argument, return từ function |
| **Higher-order Functions** | Function nhận/trả function khác |
| **Composition** | Kết hợp nhiều function nhỏ thành function lớn |
| **Declarative** | Mô tả "muốn gì" thay vì "làm thế nào" |

---

# 2. Pure Functions & Side Effects

## Pure Function

> **Pure Function** = cùng input → **luôn cùng output** + **không side effects**.

```javascript
// ✅ PURE — chỉ dựa vào input, không thay đổi gì bên ngoài
function add(a, b) {
  return a + b;
}
add(2, 3);  // Luôn = 5, gọi bao nhiêu lần cũng vậy

function fullName(first, last) {
  return `${first} ${last}`;
}

// ❌ IMPURE — phụ thuộc/thay đổi state bên ngoài
let count = 0;
function increment() {
  count++;           // Side effect: thay đổi biến ngoài
  return count;
}
increment();  // 1
increment();  // 2 (khác output dù cùng 0 args!)

function getTime() {
  return new Date().toISOString();  // Impure: mỗi lần gọi khác nhau
}

function log(msg) {
  console.log(msg);  // Side effect: I/O
  return msg;
}
```

## Side Effects — Tệ hay Cần thiết?

```
Side Effects bao gồm:
• Thay đổi biến ngoài function
• Ghi/đọc file, database
• Gọi API (network request)
• console.log
• DOM manipulation
• Thay đổi tham số truyền vào (mutation)
• Gọi Math.random(), new Date()
```

> **Quan trọng:** Side effects là **KHÔNG THỂ TRÁNH** trong ứng dụng thực tế (cần gọi API, render UI, log...). FP không cấm side effects — nó **cô lập** chúng ra khỏi business logic.

```javascript
// ✅ FP pattern: tách pure logic ra, side effects ở biên
// Pure logic
function calculateDiscount(price, discountPercent) {
  return price * (1 - discountPercent / 100);
}

function formatPrice(price) {
  return `${price.toLocaleString('vi')}đ`;
}

// Side effects — chỉ ở "biên" (edge)
async function updatePrice(productId, discount) {
  const product = await fetchProduct(productId);  // Side effect: API
  const newPrice = calculateDiscount(product.price, discount);  // Pure
  const display = formatPrice(newPrice);  // Pure
  document.getElementById('price').textContent = display;  // Side effect: DOM
}
```

---

# 3. Immutability

## Không mutate — Tạo bản mới

```javascript
// ❌ MUTATE — thay đổi data gốc
const user = { name: 'An', age: 25 };
user.age = 26;  // Mutate!

const arr = [1, 2, 3];
arr.push(4);    // Mutate!

// ✅ IMMUTABLE — tạo bản mới
const updatedUser = { ...user, age: 26 };     // Object mới
const newArr = [...arr, 4];                     // Array mới
const removed = arr.filter(x => x !== 2);      // Array mới
const updated = arr.map(x => x === 2 ? 20 : x); // Array mới

// ES2023 non-mutating methods
arr.toSorted();              // Sorted copy
arr.toReversed();            // Reversed copy
arr.with(1, 99);             // Thay index 1, array mới
```

## Immutable nested update — Vấn đề thường gặp

```javascript
const state = {
  user: {
    name: 'An',
    address: {
      city: 'HCM',
      district: '1'
    }
  },
  settings: { theme: 'dark' }
};

// ❌ Mutate nested
state.user.address.city = 'HN';  // Ảnh hưởng tất cả references!

// ✅ Immutable nested update — spreads tại mỗi cấp
const newState = {
  ...state,
  user: {
    ...state.user,
    address: {
      ...state.user.address,
      city: 'HN'
    }
  }
};
// state.user.address.city vẫn = 'HCM' ✅

// 💡 Vì sao React/Redux yêu cầu immutability?
// React dùng REFERENCE EQUALITY (===) để detect changes.
// Nếu mutate → cùng reference → React nghĩ "không thay đổi" → KHÔNG re-render!
// Nếu tạo object mới → reference khác → React detect → re-render ✅
```

---

# 4. Higher-Order Functions

> **Higher-Order Function (HOF)** = function nhận function làm argument HOẶC return function.

```javascript
// HOF nhận function
[1, 2, 3].map(x => x * 2);           // map nhận callback function
[1, 2, 3].filter(x => x > 1);        // filter nhận predicate function
[1, 2, 3].reduce((acc, x) => acc + x, 0);  // reduce nhận reducer function

// HOF trả về function
function multiplier(factor) {
  return function(number) {
    return number * factor;
  };
}

const double = multiplier(2);
const triple = multiplier(3);

double(5);   // 10
triple(5);   // 15

// HOF thực tế: Authorization middleware
function requireRole(role) {
  return function(req, res, next) {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

app.get('/admin', requireRole('admin'), adminController);
app.get('/editor', requireRole('editor'), editorController);
```

## Built-in HOFs — Đã dùng hàng ngày!

```javascript
// Tất cả đều là HOF vì nhận function làm argument:
// Array: map, filter, reduce, find, some, every, sort, forEach, flatMap
// setTimeout(callback, ms)
// addEventListener('click', callback)
// Promise.then(callback)
// Express middleware pattern
```

---

# 5. Closures trong FP

> Closure = function "nhớ" biến từ lexical scope bên ngoài, kể cả khi function bên ngoài đã return.

```javascript
// Closures tạo PRIVATE STATE — nền tảng FP
function createCounter(initial = 0) {
  let count = initial;  // Private state — không ai truy cập trực tiếp được!
  
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
    reset: () => { count = initial; }
  };
}

const counter = createCounter(10);
counter.increment();  // 11
counter.increment();  // 12
counter.getCount();   // 12
// count — KHÔNG truy cập được từ bên ngoài!

// Closures + HOF = Module Pattern
function createLogger(prefix) {
  const logs = [];  // Private
  
  return {
    log(msg) {
      const entry = `[${prefix}] ${new Date().toISOString()}: ${msg}`;
      logs.push(entry);
      console.log(entry);
    },
    getLogs() {
      return [...logs];  // Return copy, không expose reference
    }
  };
}

const apiLogger = createLogger('API');
const dbLogger = createLogger('DB');
apiLogger.log('Request received');  // [API] 2026-02-16T...: Request received
```

---

# 6. Currying & Partial Application

## Currying

> **Currying** = biến function nhận nhiều arguments thành **chuỗi functions** mỗi cái nhận **1 argument**.

```javascript
// Uncurried
function add(a, b, c) {
  return a + b + c;
}
add(1, 2, 3);  // 6

// Curried
function curriedAdd(a) {
  return function(b) {
    return function(c) {
      return a + b + c;
    };
  };
}
curriedAdd(1)(2)(3);  // 6

// Arrow function — ngắn hơn
const curriedAdd2 = a => b => c => a + b + c;
curriedAdd2(1)(2)(3);  // 6

// Tại sao dùng currying?
// → Tạo SPECIALIZED functions từ GENERAL functions
const addVAT = rate => price => price * (1 + rate);

const addVAT10 = addVAT(0.1);    // Specialized: 10% VAT
const addVAT20 = addVAT(0.2);    // Specialized: 20% VAT

addVAT10(100);  // 110
addVAT20(100);  // 120
```

## Generic curry helper

```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...moreArgs) {
      return curried.apply(this, [...args, ...moreArgs]);
    };
  };
}

const add3 = curry((a, b, c) => a + b + c);

add3(1, 2, 3);     // 6  — gọi bình thường
add3(1)(2)(3);      // 6  — curried
add3(1, 2)(3);      // 6  — partial + curried
add3(1)(2, 3);      // 6  — mixed
```

## Partial Application

> **Partial Application** = "điền sẵn" một số arguments, trả về function nhận phần còn lại.

```javascript
// Dùng bind()
function greet(greeting, name) {
  return `${greeting}, ${name}!`;
}

const sayHello = greet.bind(null, 'Hello');  // Điền sẵn greeting
sayHello('An');    // 'Hello, An!'
sayHello('Bình');  // 'Hello, Bình!'

// Custom partial helper
function partial(fn, ...presetArgs) {
  return function(...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}
```

### Currying vs Partial Application

| | Currying | Partial Application |
|---|---|---|
| Arguments | Luôn 1 arg mỗi lần | Nhiều args cùng lúc |
| Return | Function (trừ arg cuối) | Function |
| Arity | `f(a)(b)(c)` | `f(a, b)(c)` |
| Use case | Function composition | Tái sử dụng config |

---

# 7. Function Composition

> **Composition** = kết hợp 2+ functions thành 1: `compose(f, g)(x)` = `f(g(x))`

```javascript
// Ví dụ thủ công
const toUpper = str => str.toUpperCase();
const exclaim = str => `${str}!`;
const trim = str => str.trim();

// Composition thủ công — đọc từ TRONG ra NGOÀI
const shout = str => exclaim(toUpper(trim(str)));
shout('  hello  ');  // 'HELLO!'

// Compose helper — thực thi từ PHẢI sang TRÁI
const compose = (...fns) => x => fns.reduceRight((acc, fn) => fn(acc), x);

const shout2 = compose(exclaim, toUpper, trim);
shout2('  hello  ');  // 'HELLO!'

// Pipe helper — thực thi từ TRÁI sang PHẢI (dễ đọc hơn)
const pipe = (...fns) => x => fns.reduce((acc, fn) => fn(acc), x);

const shout3 = pipe(trim, toUpper, exclaim);
shout3('  hello  ');  // 'HELLO!'
```

## Ứng dụng thực tế

```javascript
// Data transformation pipeline
const processUsers = pipe(
  users => users.filter(u => u.active),
  users => users.map(u => ({ ...u, name: u.name.trim() })),
  users => users.sort((a, b) => a.name.localeCompare(b.name)),
  users => users.slice(0, 10),
);

const result = processUsers(rawUsers);
```

---

# 8. Recursion

## Đệ quy — FP thay thế loops

```javascript
// Imperative — dùng loop
function factorialLoop(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// FP — dùng recursion
function factorial(n) {
  if (n <= 1) return 1;         // Base case
  return n * factorial(n - 1);  // Recursive case
}

factorial(5);  // 120 = 5 * 4 * 3 * 2 * 1
```

## Call Stack & Stack Overflow

```
factorial(5):
  5 * factorial(4)
    4 * factorial(3)
      3 * factorial(2)
        2 * factorial(1)
          return 1          ← Base case
        return 2 * 1 = 2
      return 3 * 2 = 6
    return 4 * 6 = 24
  return 5 * 24 = 120

⚠️ Mỗi lần gọi recursion = thêm 1 frame vào Call Stack
→ factorial(100000) → Stack Overflow!
```

## Ứng dụng recursion thực tế

```javascript
// 1. Flatten nested object
function flattenObject(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flattenObject(val, newKey));
    } else {
      acc[newKey] = val;
    }
    return acc;
  }, {});
}

flattenObject({ a: { b: { c: 1 }, d: 2 }, e: 3 });
// { 'a.b.c': 1, 'a.d': 2, 'e': 3 }

// 2. Deep freeze
function deepFreeze(obj) {
  Object.freeze(obj);
  Object.values(obj)
    .filter(val => val && typeof val === 'object')
    .forEach(deepFreeze);
  return obj;
}

// 3. Tree traversal (DOM, file system, org chart)
function findInTree(node, predicate) {
  if (predicate(node)) return node;
  for (const child of (node.children || [])) {
    const found = findInTree(child, predicate);
    if (found) return found;
  }
  return null;
}
```

---

# 9. Design Patterns

## Module Pattern — Encapsulation

```javascript
// IIFE + Closure = private state
const Calculator = (() => {
  let history = [];  // Private
  
  return {
    add(a, b) {
      const result = a + b;
      history.push(`${a} + ${b} = ${result}`);
      return result;
    },
    getHistory() {
      return [...history];
    }
  };
})();

Calculator.add(1, 2);     // 3
Calculator.getHistory();   // ['1 + 2 = 3']
Calculator.history;        // undefined — private!
```

## Observer / Pub-Sub Pattern

```javascript
// EventEmitter — dùng trong Node.js, React state management
function createEventEmitter() {
  const listeners = new Map();
  
  return {
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(callback);
      
      // Return unsubscribe function
      return () => {
        const cbs = listeners.get(event);
        listeners.set(event, cbs.filter(cb => cb !== callback));
      };
    },
    
    emit(event, ...args) {
      (listeners.get(event) || []).forEach(cb => cb(...args));
    }
  };
}

const emitter = createEventEmitter();
const unsub = emitter.on('userLogin', user => {
  console.log(`${user.name} logged in`);
});

emitter.emit('userLogin', { name: 'An' });  // 'An logged in'
unsub();  // Hủy subscription
```

## Singleton Pattern

```javascript
// Đảm bảo chỉ có 1 instance
class Database {
  constructor() {
    if (Database.instance) return Database.instance;
    this.connection = null;
    Database.instance = this;
  }
  
  connect(url) {
    this.connection = url;
    return this;
  }
}

const db1 = new Database();
const db2 = new Database();
db1 === db2;  // true — cùng 1 instance!

// Modern approach — ES Module Singleton (tự nhiên singleton)
// database.js
// const db = new Database();
// export default db;
// → Mọi nơi import đều nhận cùng 1 instance
```

## Factory Pattern

```javascript
function createUser(type, data) {
  switch (type) {
    case 'admin':
      return { ...data, role: 'admin', permissions: ['read', 'write', 'delete'] };
    case 'editor':
      return { ...data, role: 'editor', permissions: ['read', 'write'] };
    case 'viewer':
      return { ...data, role: 'viewer', permissions: ['read'] };
    default:
      throw new Error(`Unknown user type: ${type}`);
  }
}

const admin = createUser('admin', { name: 'An' });
// { name: 'An', role: 'admin', permissions: ['read', 'write', 'delete'] }
```

## Strategy Pattern

```javascript
// Thay đổi algorithm tại runtime
const sortStrategies = {
  price: (a, b) => a.price - b.price,
  name: (a, b) => a.name.localeCompare(b.name),
  rating: (a, b) => b.rating - a.rating,
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
};

function sortProducts(products, strategy = 'price') {
  return [...products].sort(sortStrategies[strategy]);
}

sortProducts(products, 'rating');   // Sort by rating
sortProducts(products, 'newest');   // Sort by date
```

---

# 10. Memoization

> **Memoization** = cache kết quả function dựa trên input. Nếu cùng input → trả kết quả cache, không tính lại.

```javascript
// Generic memoize helper
function memoize(fn) {
  const cache = new Map();
  
  return function(...args) {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Ví dụ: Fibonacci tối ưu
const fibonacci = memoize(function(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

fibonacci(50);  // Tính nhanh (có cache) thay vì billions of calls
```

## Debounce & Throttle — Performance patterns

```javascript
// Debounce — chờ user NGỪNG thao tác mới thực thi
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Dùng cho: search input, resize handler
const searchInput = debounce(query => {
  fetchSearchResults(query);
}, 300);
// User gõ: h-e-l-l-o → chỉ gọi API 1 lần (300ms sau khi ngừng gõ)

// Throttle — giới hạn tần suất thực thi
function throttle(fn, limit) {
  let inThrottle = false;
  return function(...args) {
    if (inThrottle) return;
    fn.apply(this, args);
    inThrottle = true;
    setTimeout(() => { inThrottle = false; }, limit);
  };
}

// Dùng cho: scroll handler, mouse move
const handleScroll = throttle(() => {
  updateScrollPosition();
}, 100);
// Scroll liên tục → chỉ thực thi tối đa 10 lần/giây
```

---

# 11. Bài tập thực hành

## Bài 1: Implement `pipe` function
```javascript
// Viết pipe function sao cho:
const transform = pipe(
  x => x + 1,
  x => x * 2,
  x => x.toString(),
  x => `Result: ${x}`
);
transform(5);  // 'Result: 12' (5+1=6, 6*2=12, '12', 'Result: 12')
```
<details>
<summary>Đáp án</summary>

```javascript
const pipe = (...fns) => x => fns.reduce((acc, fn) => fn(acc), x);
```
</details>

## Bài 2: Implement `memoize` with max size
```javascript
// Memoize với giới hạn cache size (LRU-like)
function memoizeWithLimit(fn, maxSize = 100) {
  // ???
}
```
<details>
<summary>Đáp án</summary>

```javascript
function memoizeWithLimit(fn, maxSize = 100) {
  const cache = new Map();  // Map giữ insertion order
  
  return function(...args) {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      // Move to end (most recently used)
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    // Evict oldest if over limit
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
}
```
</details>

## Bài 3: Compose validators
```javascript
// Kết quả mong muốn:
// validate('') → { valid: false, error: 'Required' }
// validate('abc') → { valid: false, error: 'Must be email' }
// validate('a@b.com') → { valid: true, value: 'a@b.com' }
```
<details>
<summary>Đáp án</summary>

```javascript
const required = msg => val =>
  val ? { valid: true, value: val } : { valid: false, error: msg };

const minLen = (n, msg) => val =>
  val.length >= n ? { valid: true, value: val } : { valid: false, error: msg };

const isEmail = msg => val =>
  val.includes('@') ? { valid: true, value: val } : { valid: false, error: msg };

function composeValidators(...validators) {
  return function(value) {
    for (const validate of validators) {
      const result = validate(value);
      if (!result.valid) return result;
    }
    return { valid: true, value };
  };
}

const validate = composeValidators(
  required('Required'),
  minLen(3, 'Too short'),
  isEmail('Must be email'),
);
```
</details>

---

# 12. Câu hỏi phỏng vấn

## Q1: "Pure function là gì? Tại sao quan trọng?"

> **A:** Pure function luôn cho **cùng output với cùng input** và **không có side effects** (không thay đổi state bên ngoài, không I/O). Quan trọng vì: dễ test (không cần mock), dễ reason (predictable), dễ cache (memoize), dễ parallelize, React render optimization dựa trên pure components.

## Q2: "Currying vs Partial Application?"

> **A:** **Currying** biến `f(a, b, c)` thành `f(a)(b)(c)` — mỗi lần nhận đúng 1 argument. **Partial Application** "điền sẵn" một số args: `f(a, b)` → `g(c)`. Currying tự động tạo chuỗi specialized functions; partial application linh hoạt hơn (nhiều args cùng lúc). Trong JS, currying dùng cho composition, partial dùng `bind()` hoặc closure.

## Q3: "Khi nào dùng composition thay vì class?"

> **A:** FP Composition (pipe/compose) phù hợp khi: data transformation pipeline, middleware, validation chains, utility functions. Class phù hợp khi: cần state + behavior gắn chặt, inheritance hierarchy rõ ràng, framework yêu cầu (Angular). React modern prefer composition (hooks + HOC) hơn class components. Nguyên tắc: "Composition over Inheritance".

## Q4: "Giải thích memoization. Khi nào KHÔNG nên dùng?"

> **A:** Memoization cache kết quả function theo input. KHÔNG nên dùng khi: (1) input space quá lớn → cache vô hạn → memory leak, (2) function impure (kết quả phụ thuộc thời gian, random), (3) function rẻ (overhead cache > benefit), (4) kết quả thay đổi theo thời gian (API data stale). Giải pháp: memoize with TTL, LRU cache, hoặc `WeakMap` cho object keys.

## Q5: "Debounce vs Throttle — khác nhau thế nào?"

> **A:** **Debounce**: chờ user **NGỪNG** thao tác N ms rồi mới thực thi (search input — chờ ngừng gõ). **Throttle**: đảm bảo function chỉ được gọi **tối đa 1 lần** mỗi N ms (scroll handler — giới hạn tần suất). Debounce "trì hoãn", Throttle "giới hạn tốc độ".

## Q6: "Observer pattern dùng ở đâu trong JS ecosystem?"

> **A:** Rất phổ biến: Node.js `EventEmitter`, DOM `addEventListener`, RxJS Observables, Redux store `subscribe`, Vue reactivity system, Custom events, WebSocket handlers. Pattern này tách biệt "publisher" và "subscriber" — loose coupling.

---

> 📅 Tạo ngày: 2026-02-16
> 📚 Nguồn: JavaScript Design Patterns (Addy Osmani), Functional-Light JavaScript (Kyle Simpson), MDN Web Docs
> 🎯 Mục tiêu: Tư duy FP + nắm vững Design Patterns — viết code sạch, maintain được, dễ test
