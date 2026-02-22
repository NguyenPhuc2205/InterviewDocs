# 📘 JavaScript — Coding Challenges & Output Questions

> Phần **phỏng vấn thực chiến** — đoán output, viết code từ đầu. Đây là phần **luôn xuất hiện** trong mọi buổi phỏng vấn JS.

---

## Mục lục

**Phần A: Output Prediction**
1. [Hoisting Traps](#1-hoisting-traps)
2. [Closure Output](#2-closure-output)
3. [this Binding Tricks](#3-this-binding-tricks)
4. [Promise & Event Loop Ordering](#4-promise--event-loop-ordering)
5. [Type Coercion Edge Cases](#5-type-coercion-edge-cases)
6. [typeof & instanceof Gotchas](#6-typeof--instanceof-gotchas)

**Phần B: Coding Challenges**
7. [Implement debounce & throttle](#7-implement-debounce--throttle)
8. [Implement Promise.all & Promise.race](#8-implement-promiseall--promiserace)
9. [Implement Deep Clone](#9-implement-deep-clone)
10. [Implement curry()](#10-implement-curry)
11. [Implement EventEmitter](#11-implement-eventemitter)
12. [Implement memoize()](#12-implement-memoize)
13. [Flatten Nested Array](#13-flatten-nested-array)
14. [Implement bind() Polyfill](#14-implement-bind-polyfill)
15. [Async Queue with Concurrency Limit](#15-async-queue-with-concurrency-limit)
16. [LRU Cache](#16-lru-cache)

---

# PHẦN A: OUTPUT PREDICTION

---

# 1. Hoisting Traps

### Câu 1.1 — var vs let hoisting

```javascript
console.log(a); // ?
console.log(b); // ?

var a = 1;
let b = 2;
```

<details>
<summary>Đáp án</summary>

```
undefined
ReferenceError: Cannot access 'b' before initialization
```

**Giải thích:** `var` được hoist và khởi tạo `undefined`. `let` được hoist nhưng nằm trong **Temporal Dead Zone (TDZ)** — truy cập trước khai báo → ReferenceError.

</details>

### Câu 1.2 — Function vs Variable Hoisting

```javascript
console.log(foo); // ?
console.log(bar); // ?

function foo() { return 1; }
var bar = function() { return 2; };
```

<details>
<summary>Đáp án</summary>

```
[Function: foo]
undefined
```

**Giải thích:** Function declaration được hoist **toàn bộ** (cả body). Function expression (`var bar = ...`) chỉ hoist biến `bar` = `undefined`, phần function chưa được gán.

</details>

### Câu 1.3 — Hoisting trong block

```javascript
var x = 1;
function test() {
  console.log(x); // ?
  if (false) {
    var x = 2;
  }
  console.log(x); // ?
}
test();
```

<details>
<summary>Đáp án</summary>

```
undefined
undefined
```

**Giải thích:** `var` được hoist lên **đầu function** (không phải đầu block). Dù `if (false)` không chạy, `var x` vẫn được hoist → shadow biến `x` bên ngoài → `undefined`.

</details>

### Câu 1.4 — let trong for loop

```javascript
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Output?

for (var j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 0);
}
// Output?
```

<details>
<summary>Đáp án</summary>

```
0 1 2   (let — mỗi iteration tạo scope mới)
3 3 3   (var — chung 1 biến j, khi callback chạy j đã = 3)
```

</details>

---

# 2. Closure Output

### Câu 2.1 — Counter closure

```javascript
function createCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    getCount: () => count,
  };
}

const counter = createCounter();
counter.increment();
counter.increment();
counter.increment();
console.log(counter.getCount()); // ?
console.log(counter.count);      // ?
```

<details>
<summary>Đáp án</summary>

```
3
undefined
```

**Giải thích:** `count` nằm trong closure — chỉ truy cập qua `increment/getCount`. `counter.count` không tồn tại trên object.

</details>

### Câu 2.2 — IIFE + Closure

```javascript
var funcs = [];
for (var i = 0; i < 3; i++) {
  funcs.push(
    (function(j) {
      return function() { return j; };
    })(i)
  );
}
console.log(funcs[0]()); // ?
console.log(funcs[1]()); // ?
console.log(funcs[2]()); // ?
```

<details>
<summary>Đáp án</summary>

```
0
1
2
```

**Giải thích:** IIFE tạo **scope mới** mỗi iteration, capture giá trị `i` hiện tại vào `j`. Không dùng IIFE thì cả 3 đều ra `3`.

</details>

### Câu 2.3 — Closure và setTimeout

```javascript
function outer() {
  let x = 10;

  function inner() {
    console.log(x);
  }

  x = 20;
  return inner;
}

const fn = outer();
fn(); // ?
```

<details>
<summary>Đáp án</summary>

```
20
```

**Giải thích:** Closure giữ **reference** đến biến, không phải **giá trị** tại thời điểm tạo. Khi `fn()` chạy, `x` đã = 20.

</details>

---

# 3. this Binding Tricks

### Câu 3.1 — Method shorthand vs Arrow

```javascript
const obj = {
  name: 'Alice',
  greet() { console.log(this.name); },
  greetArrow: () => { console.log(this.name); },
};

obj.greet();      // ?
obj.greetArrow(); // ?
```

<details>
<summary>Đáp án</summary>

```
'Alice'
undefined  (hoặc '' trong browser)
```

**Giải thích:** Arrow function **không có this riêng** — lấy `this` từ scope bao ngoài (global/module). `greet()` là method thông thường → `this` = `obj`.

</details>

### Câu 3.2 — Mất context

```javascript
const obj = {
  value: 42,
  getValue() { return this.value; }
};

const getValue = obj.getValue;
console.log(obj.getValue()); // ?
console.log(getValue());     // ?
```

<details>
<summary>Đáp án</summary>

```
42
undefined  (strict mode: TypeError)
```

**Giải thích:** Gán method cho biến → mất context. `getValue()` gọi như function thường → `this` = `undefined` (strict) hoặc `global`.

</details>

### Câu 3.3 — call/apply/bind

```javascript
function greet(greeting) {
  return `${greeting}, ${this.name}`;
}

const user = { name: 'Bob' };

console.log(greet.call(user, 'Hello'));     // ?
console.log(greet.apply(user, ['Hi']));     // ?
const bound = greet.bind(user);
console.log(bound('Hey'));                  // ?
```

<details>
<summary>Đáp án</summary>

```
'Hello, Bob'
'Hi, Bob'
'Hey, Bob'
```

</details>

### Câu 3.4 — this trong class

```javascript
class Timer {
  constructor() {
    this.seconds = 0;
  }
  start() {
    setInterval(function() {
      this.seconds++;
      console.log(this.seconds);
    }, 1000);
  }
}

new Timer().start();
// Sau 1 giây, output là gì?
```

<details>
<summary>Đáp án</summary>

```
NaN
```

**Giải thích:** `function()` trong `setInterval` → `this` = `global`. `global.seconds` = `undefined`. `undefined + 1` = `NaN`. Fix: dùng arrow function `() => { this.seconds++; }`.

</details>

---

# 4. Promise & Event Loop Ordering

### Câu 4.1 — Thứ tự cơ bản

```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

console.log('4');
```

<details>
<summary>Đáp án</summary>

```
1
4
3
2
```

**Giải thích:**
1. `'1'` — sync, chạy ngay
2. `setTimeout` → đưa vào **Macro task queue**
3. `Promise.then` → đưa vào **Micro task queue**
4. `'4'` — sync, chạy ngay
5. Call stack trống → **Microtask** chạy trước → `'3'`
6. **Macrotask** chạy → `'2'`

</details>

### Câu 4.2 — Promise chain

```javascript
Promise.resolve(1)
  .then(x => { console.log(x); return x + 1; })
  .then(x => { console.log(x); throw new Error('fail'); })
  .then(x => console.log(x))
  .catch(err => { console.log(err.message); return 4; })
  .then(x => console.log(x));
```

<details>
<summary>Đáp án</summary>

```
1
2
'fail'
4
```

**Giải thích:** `.then(x => console.log(x))` thứ 3 bị skip vì Error → nhảy xuống `.catch()`. `.catch()` return 4 → chain tiếp → in `4`.

</details>

### Câu 4.3 — async/await vs Promise

```javascript
async function test() {
  console.log('A');

  const result = await Promise.resolve('B');
  console.log(result);

  console.log('C');
}

console.log('D');
test();
console.log('E');
```

<details>
<summary>Đáp án</summary>

```
D
A
E
B
C
```

**Giải thích:**
1. `'D'` — sync
2. `test()` — sync phần trước `await` → `'A'`
3. `await` → pause function, trả control về caller
4. `'E'` — sync
5. Microtask: resume → `'B'`, `'C'`

</details>

### Câu 4.4 — Nested setTimeout vs Promise

```javascript
setTimeout(() => {
  console.log('timeout1');
  Promise.resolve().then(() => console.log('promise inside timeout'));
}, 0);

Promise.resolve().then(() => {
  console.log('promise1');
  setTimeout(() => console.log('timeout inside promise'), 0);
});

console.log('sync');
```

<details>
<summary>Đáp án</summary>

```
sync
promise1
timeout1
promise inside timeout
timeout inside promise
```

</details>

---

# 5. Type Coercion Edge Cases

### Câu 5.1 — Các phép cộng kỳ lạ

```javascript
console.log([] + []);           // ?
console.log([] + {});           // ?
console.log({} + []);           // ?
console.log(true + true);       // ?
console.log(true + '1');        // ?
console.log('5' - 3);           // ?
console.log('5' + 3);           // ?
console.log(null + 1);          // ?
console.log(undefined + 1);     // ?
```

<details>
<summary>Đáp án</summary>

```
''              ([] → '' + '' → '')
'[object Object]'  ([] → '', {} → '[object Object]')
'[object Object]'  (hoặc 0 nếu {} được parse thành empty block)
2               (true → 1, 1 + 1 = 2)
'true1'         (string concatenation)
2               (- chỉ có numeric → '5' → 5)
'53'            (+ có string → concatenation)
1               (null → 0)
NaN             (undefined → NaN)
```

</details>

### Câu 5.2 — Equality madness

```javascript
console.log(0 == '');           // ?
console.log(0 == '0');          // ?
console.log('' == '0');         // ?
console.log(false == 'false');  // ?
console.log(false == '0');      // ?
console.log(null == undefined); // ?
console.log(null === undefined);// ?
console.log(NaN === NaN);       // ?
```

<details>
<summary>Đáp án</summary>

```
true    ('' → 0, 0 == 0)
true    ('0' → 0, 0 == 0)
false   (cả 2 là string, so sánh trực tiếp)
false   ('false' → NaN, false → 0, 0 != NaN)
true    (false → 0, '0' → 0)
true    (spec: null == undefined → true)
false   (khác type)
false   (NaN !== anything, kể cả chính nó)
```

</details>

---

# 6. typeof & instanceof Gotchas

```javascript
console.log(typeof null);           // ?
console.log(typeof undefined);      // ?
console.log(typeof NaN);            // ?
console.log(typeof function(){});   // ?
console.log(typeof [1,2,3]);        // ?

console.log([] instanceof Array);   // ?
console.log([] instanceof Object);  // ?
console.log(null instanceof Object);// ?
```

<details>
<summary>Đáp án</summary>

```
'object'      ← bug lịch sử nổi tiếng, null KHÔNG phải object
'undefined'
'number'      ← NaN thuộc kiểu number
'function'
'object'      ← Array là object, dùng Array.isArray() để check

true
true          ← Array kế thừa từ Object
false         ← typeof null = 'object' nhưng instanceof Object = false!
```

</details>

---

# PHẦN B: CODING CHALLENGES

---

# 7. Implement debounce & throttle

## debounce — Chỉ chạy sau khi user ngừng action

```javascript
function debounce(fn, delay) {
  let timerId;

  return function(...args) {
    clearTimeout(timerId);

    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// Sử dụng:
const search = debounce((query) => {
  console.log('Searching:', query);
}, 300);

// Gọi liên tục → chỉ chạy LẦN CUỐI sau 300ms ngừng gõ
search('h');
search('he');
search('hel');
search('hello');  // → Chỉ 'hello' được gọi
```

## throttle — Giới hạn tần suất chạy

```javascript
function throttle(fn, interval) {
  let lastTime = 0;

  return function(...args) {
    const now = Date.now();

    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

// Sử dụng:
const handleScroll = throttle(() => {
  console.log('Scroll position:', window.scrollY);
}, 200);

window.addEventListener('scroll', handleScroll);
```

```
Debounce vs Throttle:

Debounce: ──x──x──x──x──────[call]
           (chờ user ngừng rồi mới gọi)

Throttle: ──[call]──x──x──[call]──x──[call]
           (gọi đều đặn mỗi interval)
```

---

# 8. Implement Promise.all & Promise.race

## Promise.all — Tất cả resolve hoặc 1 reject

```javascript
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let completed = 0;
    const total = promises.length;

    if (total === 0) return resolve([]);

    promises.forEach((promise, index) => {
      Promise.resolve(promise)
        .then(value => {
          results[index] = value;  // Giữ đúng thứ tự
          completed++;

          if (completed === total) {
            resolve(results);
          }
        })
        .catch(reject);  // 1 lỗi → reject tất cả
    });
  });
}
```

## Promise.race — Ai xong trước thắng

```javascript
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(promise => {
      Promise.resolve(promise)
        .then(resolve)
        .catch(reject);
    });
  });
}
```

### Test

```javascript
// Test Promise.all
const p1 = Promise.resolve(1);
const p2 = new Promise(r => setTimeout(() => r(2), 100));
const p3 = Promise.resolve(3);

promiseAll([p1, p2, p3]).then(console.log); // [1, 2, 3]

// Test Promise.race
promiseRace([
  new Promise(r => setTimeout(() => r('slow'), 200)),
  new Promise(r => setTimeout(() => r('fast'), 50)),
]).then(console.log); // 'fast'
```

---

# 9. Implement Deep Clone

```javascript
function deepClone(obj, seen = new WeakMap()) {
  // Primitive types + null
  if (obj === null || typeof obj !== 'object') return obj;

  // Xử lý circular reference
  if (seen.has(obj)) return seen.get(obj);

  // Date
  if (obj instanceof Date) return new Date(obj.getTime());

  // RegExp
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);

  // Map
  if (obj instanceof Map) {
    const map = new Map();
    seen.set(obj, map);
    obj.forEach((val, key) => map.set(deepClone(key, seen), deepClone(val, seen)));
    return map;
  }

  // Set
  if (obj instanceof Set) {
    const set = new Set();
    seen.set(obj, set);
    obj.forEach(val => set.add(deepClone(val, seen)));
    return set;
  }

  // Array & Object
  const clone = Array.isArray(obj) ? [] : {};
  seen.set(obj, clone);

  for (const key of Reflect.ownKeys(obj)) {
    clone[key] = deepClone(obj[key], seen);
  }

  return clone;
}

// Test:
const original = {
  a: 1,
  b: { c: [1, 2, { d: 3 }] },
  date: new Date(),
  regex: /hello/gi,
};
original.self = original; // Circular reference!

const cloned = deepClone(original);
console.log(cloned.b.c[2].d);      // 3
console.log(cloned.b === original.b); // false (deep copy)
console.log(cloned.self === cloned);  // true (circular ref preserved)
```

> **Lưu ý:** Trong production, dùng `structuredClone()` (ES2022+) — native, nhanh, handle hầu hết cases.

---

# 10. Implement curry()

```javascript
function curry(fn) {
  return function curried(...args) {
    // Đủ arguments → gọi hàm gốc
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }

    // Chưa đủ → trả function nhận tiếp
    return function(...moreArgs) {
      return curried.apply(this, [...args, ...moreArgs]);
    };
  };
}

// Sử dụng:
function add(a, b, c) {
  return a + b + c;
}

const curriedAdd = curry(add);

console.log(curriedAdd(1)(2)(3));     // 6
console.log(curriedAdd(1, 2)(3));     // 6
console.log(curriedAdd(1)(2, 3));     // 6
console.log(curriedAdd(1, 2, 3));     // 6

// Ứng dụng: tạo reusable functions
const addTax = curry((rate, price) => price * (1 + rate));
const addVAT = addTax(0.1);  // 10% VAT

console.log(addVAT(100));   // 110
console.log(addVAT(200));   // 220
```

```
Curry flow:

curry(add)(1)(2)(3)
    │
    ├── curried(1) → args=[1], cần 3 → trả function
    │   ├── curried(1,2) → args=[1,2], cần 3 → trả function
    │   │   └── curried(1,2,3) → args=[1,2,3] ≥ 3 → add(1,2,3) = 6
```

---

# 11. Implement EventEmitter

```javascript
class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
    return this; // Chainable
  }

  off(event, listener) {
    if (!this.events.has(event)) return this;

    const listeners = this.events.get(event)
      .filter(fn => fn !== listener);

    if (listeners.length === 0) {
      this.events.delete(event);
    } else {
      this.events.set(event, listeners);
    }
    return this;
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return false;

    this.events.get(event).forEach(fn => fn(...args));
    return true;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }
}

// Test:
const emitter = new EventEmitter();

emitter.on('data', (msg) => console.log('Listener 1:', msg));
emitter.once('data', (msg) => console.log('Once:', msg));

emitter.emit('data', 'hello');
// Listener 1: hello
// Once: hello

emitter.emit('data', 'world');
// Listener 1: world
// (Once đã bị remove)
```

---

# 12. Implement memoize()

```javascript
function memoize(fn) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      console.log('Cache hit!');
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Sử dụng:
const fibonacci = memoize(function fib(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

console.log(fibonacci(40)); // Tính nhanh nhờ cache
// Không có memoize → O(2^n) → treo máy
// Có memoize → O(n) → chạy tức thì
```

### Memoize nâng cao — với TTL & size limit

```javascript
function memoizeAdvanced(fn, { maxSize = 100, ttl = 60000 } = {}) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      const { value, timestamp } = cache.get(key);
      if (Date.now() - timestamp < ttl) {
        return value;
      }
      cache.delete(key); // Expired
    }

    const result = fn.apply(this, args);

    // Evict oldest if full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
}
```

---

# 13. Flatten Nested Array

```javascript
// Cách 1: Recursive
function flatten(arr, depth = Infinity) {
  const result = [];

  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flatten(item, depth - 1));
    } else {
      result.push(item);
    }
  }

  return result;
}

// Cách 2: Iterative (stack-based, tránh stack overflow)
function flattenIterative(arr) {
  const stack = [...arr];
  const result = [];

  while (stack.length > 0) {
    const item = stack.pop();

    if (Array.isArray(item)) {
      stack.push(...item);
    } else {
      result.unshift(item);
    }
  }

  return result;
}

// Cách 3: Native (ES2019)
// arr.flat(Infinity);

// Test:
const nested = [1, [2, [3, [4, [5]]]]];
console.log(flatten(nested));        // [1, 2, 3, 4, 5]
console.log(flatten(nested, 1));     // [1, 2, [3, [4, [5]]]]
console.log(flattenIterative(nested)); // [1, 2, 3, 4, 5]
```

---

# 14. Implement bind() Polyfill

```javascript
Function.prototype.myBind = function(context, ...boundArgs) {
  const originalFn = this;

  return function(...args) {
    // Nếu gọi với new → this là instance, không dùng context
    if (new.target) {
      return new originalFn(...boundArgs, ...args);
    }
    return originalFn.apply(context, [...boundArgs, ...args]);
  };
};

// Test:
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: 'Alice' };

const boundGreet = greet.myBind(user, 'Hello');
console.log(boundGreet('!'));  // 'Hello, Alice!'
console.log(boundGreet('?')); // 'Hello, Alice?'
```

---

# 15. Async Queue with Concurrency Limit

```javascript
class AsyncQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._run();
    });
  }

  async _run() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      this.running++;

      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.running--;
          this._run();
        });
    }
  }
}

// Sử dụng:
const queue = new AsyncQueue(2); // Max 2 concurrent tasks

const delay = (ms, val) => new Promise(r => setTimeout(() => r(val), ms));

queue.add(() => delay(1000, 'Task 1')).then(console.log);
queue.add(() => delay(500,  'Task 2')).then(console.log);
queue.add(() => delay(300,  'Task 3')).then(console.log);
queue.add(() => delay(200,  'Task 4')).then(console.log);

// Task 2 (500ms) → Task 3 starts
// Task 3 (300ms) → Task 4 starts
// Task 1 (1000ms)
// Task 4 (200ms)
```

```
Concurrency = 2:

Time  Slot 1     Slot 2
  0   [Task 1]   [Task 2]
500   [Task 1]   [Task 3]    ← Task 2 done, Task 3 starts
800   [Task 1]   [Task 4]    ← Task 3 done, Task 4 starts
1000  [done]     [Task 4]    ← Task 1 done
1000  [done]     [done]      ← Task 4 done
```

---

# 16. LRU Cache

```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // Map giữ insertion order
  }

  get(key) {
    if (!this.cache.has(key)) return -1;

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  put(key, value) {
    // Delete old entry nếu có (để re-insert ở cuối)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    // Evict oldest (đầu Map) nếu vượt capacity
    if (this.cache.size > this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
}

// Test:
const cache = new LRUCache(3);

cache.put('a', 1);
cache.put('b', 2);
cache.put('c', 3);
console.log(cache.get('a'));  // 1 → 'a' becomes most recent

cache.put('d', 4);            // Evicts 'b' (least recently used)
console.log(cache.get('b'));  // -1 (evicted!)
console.log(cache.get('c'));  // 3
```

```
LRU Cache (capacity=3):

put(a,1): [a]
put(b,2): [a, b]
put(c,3): [a, b, c]
get(a):   [b, c, a]       ← 'a' moved to end
put(d,4): [c, a, d]       ← 'b' evicted (least recent)
           ↑ oldest         ↑ newest
```

---

# Câu hỏi phỏng vấn tổng hợp

### Q1: Bạn sẽ implement debounce hay throttle cho search input? Tại sao?
**A:** **Debounce** — vì user gõ liên tục, chỉ cần gửi request khi **ngừng gõ**. Throttle phù hợp cho scroll/resize (cần response đều đặn).

### Q2: Sự khác nhau giữa `structuredClone()` và `JSON.parse(JSON.stringify())`?
**A:**
- `JSON` mất: Date (→ string), RegExp (→ `{}`), undefined, functions, Map, Set, circular ref → Error
- `structuredClone` giữ: Date, RegExp, Map, Set, ArrayBuffer, circular ref. Không clone: functions, DOM nodes, Error objects

### Q3: Tại sao `typeof null === 'object'`?
**A:** Bug từ phiên bản đầu tiên của JavaScript. Trong engine cũ, giá trị được lưu bằng **type tag** (3 bit đầu). Object = `000`, nhưng `null` = null pointer = `0x00` → cũng có tag `000` → `typeof` trả `'object'`. Không sửa được vì **backward compatibility**.

### Q4: Implement `Promise.allSettled()`
```javascript
function promiseAllSettled(promises) {
  return Promise.all(
    promises.map(p =>
      Promise.resolve(p)
        .then(value => ({ status: 'fulfilled', value }))
        .catch(reason => ({ status: 'rejected', reason }))
    )
  );
}
```
