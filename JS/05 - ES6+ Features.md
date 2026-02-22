# 📘 JavaScript — ES6+ Features

> Tổng hợp tất cả tính năng quan trọng từ ES6 (2015) đến ES2024. Những thứ phỏng vấn **chắc chắn hỏi**.

---

## Mục lục

1. [Destructuring](#1-destructuring)
2. [Spread & Rest Operators](#2-spread--rest)
3. [Template Literals](#3-template-literals)
4. [Optional Chaining & Nullish Coalescing](#4-optional-chaining--nullish-coalescing)
5. [Map, Set, WeakMap, WeakSet](#5-map-set-weakmap-weakset)
6. [Symbol](#6-symbol)
7. [Iterators & Generators](#7-iterators--generators)
8. [for...of vs for...in](#8-forof-vs-forin)
9. [Proxy & Reflect](#9-proxy--reflect)
10. [Câu hỏi phỏng vấn](#10-câu-hỏi-phỏng-vấn)

---

# 1. Destructuring

## Object Destructuring

```javascript
const user = { name: 'An', age: 25, city: 'HCM' };

// Cơ bản
const { name, age } = user;  // name = 'An', age = 25

// Đổi tên biến
const { name: userName, age: userAge } = user;

// Giá trị mặc định
const { name, country = 'Vietnam' } = user;  // country = 'Vietnam'

// Nested
const data = { user: { name: 'An', address: { city: 'HCM' } } };
const { user: { address: { city } } } = data;  // city = 'HCM'

// Rest pattern
const { name: n, ...rest } = user;  // rest = { age: 25, city: 'HCM' }
```

## Array Destructuring

```javascript
const colors = ['red', 'green', 'blue', 'yellow'];

// Cơ bản
const [first, second] = colors;  // 'red', 'green'

// Bỏ qua phần tử
const [, , third] = colors;     // 'blue'

// Giá trị mặc định
const [a, b, c, d, e = 'black'] = colors;

// Swap variables — không cần biến tạm!
let x = 1, y = 2;
[x, y] = [y, x];  // x = 2, y = 1

// Rest
const [head, ...tail] = colors;  // head = 'red', tail = ['green', 'blue', 'yellow']
```

## Destructuring trong function parameters

```javascript
// ❌ Trước ES6
function createUser(options) {
  const name = options.name;
  const age = options.age || 18;
}

// ✅ Với destructuring
function createUser({ name, age = 18, role = 'user' }) {
  console.log(name, age, role);
}

createUser({ name: 'An', age: 25 });  // 'An' 25 'user'
```

---

# 2. Spread & Rest

## Spread `...` — "Trải ra"

```javascript
// Array
const arr1 = [1, 2, 3];
const arr2 = [0, ...arr1, 4];  // [0, 1, 2, 3, 4]

// Object
const defaults = { theme: 'dark', lang: 'vi' };
const userPrefs = { lang: 'en', fontSize: 14 };
const merged = { ...defaults, ...userPrefs };
// { theme: 'dark', lang: 'en', fontSize: 14 } — sau ghi đè trước

// Function call
Math.max(...[5, 3, 8, 1]);  // 8

// Shallow copy
const copy = [...arr1];        // Array copy
const objCopy = { ...defaults }; // Object copy — ⚠️ SHALLOW
```

## Rest `...` — "Gom lại"

```javascript
// Function parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4);  // 10

// Ở cuối destructuring
const { a, ...others } = { a: 1, b: 2, c: 3 };
// a = 1, others = { b: 2, c: 3 }
```

> **Phân biệt:** Spread = trải ra (lhs). Rest = gom lại (rhs / tham số).

---

# 3. Template Literals

```javascript
const name = 'An';
const age = 25;

// String interpolation
const greeting = `Hello, I'm ${name} and I'm ${age} years old`;

// Multi-line strings
const html = `
  <div>
    <h1>${name}</h1>
    <p>Age: ${age}</p>
  </div>
`;

// Expressions trong ${}
`${age >= 18 ? 'Adult' : 'Minor'}`;
`Total: ${(100 * 1.1).toFixed(2)}`;

// Tagged templates — nâng cao
function highlight(strings, ...values) {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] ? `<mark>${values[i]}</mark>` : '');
  }, '');
}

const result = highlight`Hello ${name}, you are ${age}`;
// 'Hello <mark>An</mark>, you are <mark>25</mark>'
```

---

# 4. Optional Chaining & Nullish Coalescing

## Optional Chaining `?.` (ES2020)

Truy cập property an toàn, trả về `undefined` thay vì throw error:

```javascript
const user = {
  name: 'An',
  address: {
    // city: 'HCM'  — không có city
  }
};

// ❌ Crash nếu address hoặc city không tồn tại
// user.profile.avatar  // TypeError!

// ✅ Optional chaining
user?.address?.city           // undefined (an toàn)
user?.profile?.avatar         // undefined (an toàn)
user?.getName?.()             // undefined nếu getName không tồn tại
user?.hobbies?.[0]            // undefined nếu hobbies không tồn tại

// Chaining dài
const city = response?.data?.users?.[0]?.address?.city ?? 'Unknown';
```

## Nullish Coalescing `??` (ES2020)

Trả về vế phải **chỉ khi** vế trái là `null` hoặc `undefined`:

```javascript
// So sánh || vs ??
0 || 'fallback'          // 'fallback' ← vì 0 là falsy
0 ?? 'fallback'          // 0          ← vì 0 KHÔNG phải null/undefined

'' || 'fallback'         // 'fallback' ← vì '' là falsy
'' ?? 'fallback'         // ''         ← vì '' KHÔNG phải null/undefined

false || 'fallback'      // 'fallback'
false ?? 'fallback'      // false

null || 'fallback'       // 'fallback'
null ?? 'fallback'       // 'fallback' ← cả hai giống nhau với null
undefined ?? 'fallback'  // 'fallback'
```

> **Khi nào dùng `??` thay `||`?** Khi bạn muốn giữ giá trị `0`, `''`, `false` mà không bị coi là "trống". Ví dụ: `port ?? 3000` — nếu port = 0, `||` sẽ cho 3000 (sai), `??` sẽ cho 0 (đúng).

## Nullish Coalescing Assignment `??=` (ES2021)

```javascript
let x = null;
x ??= 'default';  // x = 'default' (vì x là null)

let y = 0;
y ??= 'default';  // y = 0 (vì 0 không phải null/undefined)
```

---

# 5. Map, Set, WeakMap, WeakSet

## Map — Key-Value với key BẤT KỲ

```javascript
const map = new Map();

// Key có thể là BẤT KỲ type nào (object, function, number...)
map.set('name', 'An');
map.set(42, 'a number key');
map.set(true, 'a boolean key');

const objKey = { id: 1 };
map.set(objKey, 'object as key');  // Object làm key!

map.get('name');     // 'An'
map.get(42);         // 'a number key'
map.has('name');     // true
map.size;            // 4
map.delete('name');

// Iteration — giữ thứ tự insertion
for (const [key, value] of map) {
  console.log(key, value);
}
```

### Map vs Object

| | Map | Object |
|---|---|---|
| **Key types** | Bất kỳ (object, function...) | Chỉ string/symbol |
| **Thứ tự** | Giữ thứ tự insertion | Không đảm bảo (trước ES6) |
| **Size** | `map.size` | `Object.keys(obj).length` |
| **Iteration** | Trực tiếp iterable | Cần `Object.keys()` |
| **Performance** | Tốt hơn với add/remove thường xuyên | Tốt hơn cho static data |
| **JSON** | ❌ Không serialize trực tiếp | ✅ JSON.stringify() |

## Set — Tập hợp giá trị KHÔNG TRÙNG

```javascript
const set = new Set([1, 2, 3, 3, 3]);
console.log(set);    // Set { 1, 2, 3 } — tự loại trùng!

set.add(4);
set.has(3);          // true
set.delete(2);
set.size;            // 3

// Ứng dụng: loại trùng array
const arr = [1, 2, 2, 3, 3, 3];
const unique = [...new Set(arr)];  // [1, 2, 3]

// Set dùng === để so sánh (reference cho objects):
const s = new Set();
s.add({ id: 1 });
s.add({ id: 1 });
s.size;  // 2 — vì 2 object khác reference!
```

## WeakMap & WeakSet

| | Map/Set | WeakMap/WeakSet |
|---|---|---|
| **Key/Value type** | Bất kỳ | Chỉ **object** làm key |
| **Garbage Collection** | Giữ reference → không GC | **Weak reference** → cho phép GC |
| **Iterable** | ✅ Có | ❌ Không |
| **Size property** | ✅ Có | ❌ Không |
| **Use case** | General purpose | Cache, metadata mà không leak memory |

```javascript
// WeakMap — Cache mà không leak memory
const cache = new WeakMap();

function process(obj) {
  if (cache.has(obj)) return cache.get(obj);

  const result = /* expensive computation */ obj.value * 2;
  cache.set(obj, result);
  return result;
}

let data = { value: 42 };
process(data);  // Tính và cache

data = null;    // data bị GC → entry trong WeakMap CŨNG bị xóa tự động!
```

---

# 6. Symbol

**Symbol** = **giá trị duy nhất**, không bao giờ trùng. Dùng làm property key tránh xung đột.

```javascript
const sym1 = Symbol('description');
const sym2 = Symbol('description');
sym1 === sym2  // false — luôn luôn khác nhau!

// Dùng làm property key
const ID = Symbol('id');
const user = {
  [ID]: 123,
  name: 'An'
};

user[ID]             // 123
user.ID              // undefined — không truy cập bằng dot notation
Object.keys(user)    // ['name'] — Symbol bị GIẤU khỏi for...in, Object.keys()
Object.getOwnPropertySymbols(user)  // [Symbol(id)]

// Well-known Symbols — thay đổi hành vi built-in
class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  // Cho phép dùng for...of
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    return {
      next() {
        return current <= end
          ? { value: current++, done: false }
          : { done: true };
      }
    };
  }
}

for (const n of new Range(1, 5)) {
  console.log(n);  // 1, 2, 3, 4, 5
}
```

---

# 7. Iterators & Generators

## Iterator Protocol

Object là **iterable** nếu implement method `[Symbol.iterator]()` trả về object có method `next()`.

```javascript
// Tự tạo iterable
const countdown = {
  [Symbol.iterator]() {
    let count = 3;
    return {
      next() {
        return count > 0
          ? { value: count--, done: false }
          : { value: undefined, done: true };
      }
    };
  }
};

for (const n of countdown) {
  console.log(n);  // 3, 2, 1
}

[...countdown]  // [3, 2, 1]
```

## Generator Functions (`function*`)

Cách tạo iterator **dễ hơn nhiều**:

```javascript
function* countdown(n) {
  while (n > 0) {
    yield n;  // "Tạm dừng" và trả về giá trị
    n--;
  }
}

const gen = countdown(3);
gen.next();  // { value: 3, done: false }
gen.next();  // { value: 2, done: false }
gen.next();  // { value: 1, done: false }
gen.next();  // { value: undefined, done: true }

// Dùng với for...of
for (const n of countdown(5)) {
  console.log(n);  // 5, 4, 3, 2, 1
}

// Infinite generator
function* naturalNumbers() {
  let n = 1;
  while (true) {
    yield n++;
  }
}

// Lazy evaluation — chỉ tính khi cần
const gen2 = naturalNumbers();
gen2.next().value;  // 1
gen2.next().value;  // 2
// Không bao giờ tràn memory vì không tạo array vô hạn
```

### Ứng dụng thực tế: Pagination

```javascript
function* paginate(items, pageSize) {
  for (let i = 0; i < items.length; i += pageSize) {
    yield items.slice(i, i + pageSize);
  }
}

const allItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const pages = paginate(allItems, 3);

pages.next().value;  // [1, 2, 3]
pages.next().value;  // [4, 5, 6]
pages.next().value;  // [7, 8, 9]
pages.next().value;  // [10]
```

---

# 8. `for...of` vs `for...in`

| | `for...in` | `for...of` |
|---|---|---|
| **Lặp qua** | **Keys** (property names) | **Values** |
| **Dùng cho** | Objects | Arrays, Strings, Maps, Sets, bất kỳ iterable |
| **Inherited props** | ✅ Có (cần hasOwnProperty check) | ❌ Không |
| **Performance** | Chậm hơn | Nhanh hơn cho arrays |

```javascript
const arr = ['a', 'b', 'c'];

for (const i in arr) {
  console.log(i);    // '0', '1', '2' (string keys!)
}

for (const v of arr) {
  console.log(v);    // 'a', 'b', 'c' (values)
}

// ⚠️ for...in trên array có thể lặp qua properties thừa:
arr.custom = 'oops';
for (const i in arr) {
  console.log(i);    // '0', '1', '2', 'custom' ← Bất ngờ!
}

// for...of KHÔNG có vấn đề đó:
for (const v of arr) {
  console.log(v);    // 'a', 'b', 'c' ← Chỉ values
}
```

> **Best Practice:** Luôn dùng `for...of` cho arrays. Dùng `for...in` chỉ cho objects (và luôn check `hasOwnProperty`).

---

# 9. Proxy & Reflect

## Proxy — Chặn và custom operations

```javascript
const user = { name: 'An', age: 25 };

const proxy = new Proxy(user, {
  // Chặn đọc property
  get(target, prop) {
    console.log(`Reading ${prop}`);
    return prop in target ? target[prop] : `${prop} not found`;
  },

  // Chặn ghi property
  set(target, prop, value) {
    if (prop === 'age' && typeof value !== 'number') {
      throw new TypeError('Age must be a number');
    }
    target[prop] = value;
    return true;
  }
});

proxy.name;          // 'An' + log 'Reading name'
proxy.email;         // 'email not found'
proxy.age = 30;      // OK
proxy.age = 'old';   // TypeError: Age must be a number
```

### Ứng dụng: Validation, Reactive Systems (Vue.js 3 dùng Proxy!)

---

# 10. ES2023 — ES2024 Features

## ES2023

```javascript
// findLast / findLastIndex — tìm từ CUỐI
const nums = [1, 2, 3, 4, 5];
nums.findLast(n => n % 2 === 0);       // 4 (phần tử chẵn cuối cùng)
nums.findLastIndex(n => n % 2 === 0);  // 3

// Immutable sort/reverse/splice
const arr = [3, 1, 2];
arr.toSorted((a, b) => a - b);  // [1, 2, 3] — arr không đổi!
arr.toReversed();                // [2, 1, 3] — arr không đổi!
arr.toSpliced(1, 1);            // [3, 2] — arr không đổi!
arr.with(0, 99);                 // [99, 1, 2] — thay index 0, arr không đổi!

// Hashbang grammar
// #!/usr/bin/env node — cho phép ở đầu file .js
```

## ES2024

```javascript
// Object.groupBy / Map.groupBy
const people = [
  { name: 'An', age: 25 },
  { name: 'Bình', age: 30 },
  { name: 'Cường', age: 25 },
];

Object.groupBy(people, p => p.age);
// { 25: [{name:'An',...}, {name:'Cường',...}], 30: [{name:'Bình',...}] }

// Promise.withResolvers — tách resolve/reject ra ngoài
const { promise, resolve, reject } = Promise.withResolvers();
// Hữu ích khi cần resolve từ bên ngoài Promise constructor
setTimeout(() => resolve('done'), 1000);
await promise;  // 'done'

// Temporal API (Stage 3 — sắp vào)
// Thay thế Date object với API tốt hơn
// Temporal.Now.instant()
// Temporal.PlainDate.from('2026-02-16')
```

## Tính năng quan trọng đã có từ ES2021-2022

```javascript
// structuredClone (ES2022) — Deep copy
const original = { a: 1, nested: { b: 2 }, date: new Date() };
const clone = structuredClone(original);
clone.nested.b = 99;  // original.nested.b vẫn = 2 ✅

// Top-level await (ES2022)
// Không cần wrap trong async function (chỉ trong ESM modules)
const data = await fetch('/api').then(r => r.json());

// Error cause (ES2022)
try {
  await fetchData();
} catch (err) {
  throw new Error('Failed to load data', { cause: err });
  // err.cause → original error object
}

// at() method (ES2022) — works on String, Array, TypedArray
'Hello'.at(-1);    // 'o'
[1,2,3].at(-1);    // 3

// Logical assignment operators (ES2021)
let a = null;
a ??= 'default';  // a = 'default' (vì null)
a ||= 'other';    // a = 'default' (vì đã truthy)
a &&= 'YES';      // a = 'YES' (vì đã truthy)
```

---

# 11. Câu hỏi phỏng vấn

## Q1: "Destructuring là gì? Cho ví dụ"

> **A:** Destructuring là cú pháp trích xuất giá trị từ arrays/objects vào biến riêng. Hỗ trợ giá trị mặc định, đổi tên, nested, và rest pattern. Ứng dụng: function parameters, swap variables, bỏ qua phần tử array.

## Q2: "`...` operator dùng làm gì?"

> **A:** Có 2 vai trò: **Spread** (trải ra — dùng trong array/object literal, function call) và **Rest** (gom lại — dùng trong function parameters, destructuring). Lưu ý spread chỉ copy **shallow** — nested objects vẫn là reference.

## Q3: "Map vs Object khác nhau thế nào?"

> **A:** Map cho phép key là **bất kỳ type** (object, function), giữ **thứ tự insertion**, có `size` property, và performance tốt hơn cho add/remove thường xuyên. Object chỉ cho key string/symbol, serialize JSON dễ hơn. Dùng Map khi key không phải string hoặc cần thao tác thường xuyên.

## Q4: " `||` và `??` khác nhau thế nào?"

> **A:** `||` trả về vế phải khi vế trái là **falsy** (0, '', false, null, undefined, NaN). `??` trả về vế phải **chỉ khi** vế trái là `null` hoặc `undefined`. Dùng `??` khi muốn giữ `0`, `''`, `false` là giá trị hợp lệ.

## Q5: "Generator dùng khi nào? Cho ví dụ thực tế"

> **A:** Generator (`function*`) tạo **lazy iterator** — chỉ tính giá trị khi cần (lazy evaluation). Ứng dụng: pagination, infinite sequences, async iteration, custom iterables. Bản chất async/await cũng dựa trên generator-like state machine. Generator còn dùng trong Redux-Saga cho side effects.

## Q6: "Kể tên 3 tính năng ES2022+ quan trọng nhất"

> **A:** (1) `structuredClone()` — deep copy native, thay thế JSON hack. (2) `at()` — truy cập phần tử bằng index âm. (3) Top-level `await` — dùng await ngoài async function trong ESM. Bonus: Error cause, `toSorted()/toReversed()` (ES2023) cho immutable array operations, `Object.groupBy()` (ES2024).

---

> 📅 Cập nhật: 2026-02-16
> 📚 Nguồn: MDN Web Docs, TC39 Proposals
> 🎯 Mục tiêu: Nắm vững ES6+ — viết JavaScript hiện đại, clean, hiệu quả
