# 📘 JavaScript — Array & Object Methods

> Tổng hợp tất cả methods quan trọng của Array và Object — phỏng vấn luôn hỏi, code luôn dùng.

---

## Mục lục

1. [Array Methods — Transformation (không mutate)](#1-transformation-methods)
2. [Array Methods — Search & Test](#2-search--test-methods)
3. [Array Methods — Mutation](#3-mutation-methods)
4. [Array Methods — Khác](#4-các-methods-khác)
5. [Object Methods](#5-object-methods)
6. [Shallow Copy vs Deep Copy](#6-shallow-copy-vs-deep-copy)
7. [Câu hỏi phỏng vấn](#7-câu-hỏi-phỏng-vấn)

---

# 1. Transformation Methods (Tạo array MỚI — không mutate)

## `map()` — Biến đổi từng phần tử

```javascript
const nums = [1, 2, 3, 4];
const doubled = nums.map(n => n * 2);
// [2, 4, 6, 8] — array MỚI
// nums vẫn = [1, 2, 3, 4]
```

## `filter()` — Lọc phần tử

```javascript
const nums = [1, 2, 3, 4, 5, 6];
const evens = nums.filter(n => n % 2 === 0);
// [2, 4, 6]
```

## `reduce()` — Gom thành 1 giá trị

```javascript
const nums = [1, 2, 3, 4];

// Tổng
const sum = nums.reduce((acc, curr) => acc + curr, 0);  // 10

// Gom thành object
const items = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];
const count = items.reduce((acc, item) => {
  acc[item] = (acc[item] || 0) + 1;
  return acc;
}, {});
// { apple: 3, banana: 2, cherry: 1 }

// Flatten nested array (thay vì flat())
const nested = [[1, 2], [3, 4], [5]];
const flat = nested.reduce((acc, arr) => [...acc, ...arr], []);
// [1, 2, 3, 4, 5]

// Max value
const max = nums.reduce((a, b) => Math.max(a, b));  // 4
```

## `flat()` & `flatMap()`

```javascript
// flat — làm phẳng array lồng
[1, [2, [3, [4]]]].flat()      // [1, 2, [3, [4]]] — mặc định depth = 1
[1, [2, [3, [4]]]].flat(2)     // [1, 2, 3, [4]]
[1, [2, [3, [4]]]].flat(Infinity)  // [1, 2, 3, 4]

// flatMap — map + flat(1) trong 1 bước
const sentences = ['Hello World', 'Good Morning'];
sentences.flatMap(s => s.split(' '));
// ['Hello', 'World', 'Good', 'Morning']
```

## `slice()` — Cắt một phần (KHÔNG mutate)

```javascript
const arr = [0, 1, 2, 3, 4];
arr.slice(1, 3);    // [1, 2] — từ index 1 đến 3 (không bao gồm 3)
arr.slice(-2);      // [3, 4] — 2 phần tử cuối
arr.slice();        // [0, 1, 2, 3, 4] — shallow copy
```

---

# 2. Search & Test Methods

```javascript
const users = [
  { name: 'An', age: 25 },
  { name: 'Bình', age: 30 },
  { name: 'Cường', age: 22 },
];

// find — trả về phần tử ĐẦU TIÊN match
users.find(u => u.age > 24);
// { name: 'An', age: 25 }

// findIndex — trả về INDEX đầu tiên match
users.findIndex(u => u.name === 'Bình');  // 1

// some — CÓ ÍT NHẤT 1 phần tử match? (OR logic)
users.some(u => u.age > 28);   // true

// every — TẤT CẢ phần tử match? (AND logic)
users.every(u => u.age > 20);  // true
users.every(u => u.age > 24);  // false

// includes — có chứa giá trị?
[1, 2, 3].includes(2);        // true
[1, 2, 3].includes(4);        // false
// ⚠️ Dùng === → không dùng được cho objects

// indexOf — tìm index (trả -1 nếu không có)
[1, 2, 3, 2].indexOf(2);      // 1 (index đầu tiên)
[1, 2, 3, 2].lastIndexOf(2);  // 3 (index cuối cùng)
```

---

# 3. Mutation Methods (THAY ĐỔI array gốc)

```javascript
const arr = [1, 2, 3, 4, 5];

// push — thêm cuối
arr.push(6);           // [1, 2, 3, 4, 5, 6] — return length: 6

// pop — xóa cuối
arr.pop();             // [1, 2, 3, 4, 5] — return phần tử xóa: 6

// unshift — thêm đầu
arr.unshift(0);        // [0, 1, 2, 3, 4, 5] — return length: 6

// shift — xóa đầu
arr.shift();           // [1, 2, 3, 4, 5] — return phần tử xóa: 0

// splice — xóa/thêm/thay thế tại vị trí bất kỳ
// splice(start, deleteCount, ...items)
arr.splice(1, 2);          // Xóa 2 phần tử từ index 1 → [1, 4, 5]
arr.splice(1, 0, 2, 3);   // Thêm 2, 3 tại index 1 → [1, 2, 3, 4, 5]
arr.splice(2, 1, 'X');    // Thay index 2 → [1, 2, 'X', 4, 5]

// sort — ⚠️ SẮP XẾP TẠI CHỖ, có trap
[10, 9, 2, 21].sort()              // [10, 2, 21, 9] ← SAI! (sắp theo string)
[10, 9, 2, 21].sort((a, b) => a - b) // [2, 9, 10, 21] ← ĐÚNG

// reverse — đảo ngược tại chỗ
[1, 2, 3].reverse();  // [3, 2, 1]

// fill — điền giá trị
[1, 2, 3, 4].fill(0, 1, 3);  // [1, 0, 0, 4]
```

## Bảng Mutate vs Non-Mutate

| **Mutate (thay đổi gốc)** | **Non-Mutate (trả array mới)** |
|---|---|
| `push`, `pop`, `shift`, `unshift` | `concat`, `slice` |
| `splice`, `sort`, `reverse`, `fill` | `map`, `filter`, `flat`, `flatMap` |
| `copyWithin` | `toSorted()`, `toReversed()`, `toSpliced()` (ES2023) |

### ES2023 — Non-mutating versions

```javascript
const arr = [3, 1, 2];

// Trước ES2023 — mutate gốc
arr.sort();   // arr bị thay đổi!

// ES2023 — trả array mới
arr.toSorted((a, b) => a - b);     // [1, 2, 3] — arr không đổi
arr.toReversed();                   // [2, 1, 3] — arr không đổi
arr.toSpliced(1, 1);               // [3, 2] — arr không đổi
arr.with(0, 'X');                   // ['X', 1, 2] — thay index 0
```

---

# 4. Các Methods Khác

```javascript
// forEach — lặp (KHÔNG trả giá trị, KHÔNG dùng await)
[1, 2, 3].forEach((val, index) => console.log(val, index));

// Array.from — tạo array từ iterable/array-like
Array.from('hello');              // ['h', 'e', 'l', 'l', 'o']
Array.from({ length: 3 }, (_, i) => i);  // [0, 1, 2]
Array.from(document.querySelectorAll('div'));  // NodeList → Array

// Array.isArray — kiểm tra array
Array.isArray([1, 2]);   // true
Array.isArray('hello');  // false
Array.isArray({ 0: 'a', length: 1 });  // false

// join — nối thành string
['a', 'b', 'c'].join('-');  // 'a-b-c'

// concat — nối arrays (non-mutating)
[1, 2].concat([3, 4], [5]);  // [1, 2, 3, 4, 5]

// entries, keys, values
[...[10, 20, 30].entries()]  // [[0, 10], [1, 20], [2, 30]]
[...[10, 20, 30].keys()]    // [0, 1, 2]
[...[10, 20, 30].values()]  // [10, 20, 30]

// at — truy cập bằng index (hỗ trợ số âm)
['a', 'b', 'c'].at(-1);  // 'c'
['a', 'b', 'c'].at(0);   // 'a'
```

---

# 5. Object Methods

## Object.keys / values / entries

```javascript
const user = { name: 'An', age: 25, city: 'HCM' };

Object.keys(user);      // ['name', 'age', 'city']
Object.values(user);    // ['An', 25, 'HCM']
Object.entries(user);   // [['name', 'An'], ['age', 25], ['city', 'HCM']]

// Object.fromEntries — ngược lại entries
Object.fromEntries([['a', 1], ['b', 2]]);  // { a: 1, b: 2 }
```

## Object.assign — Merge/Copy

```javascript
const target = { a: 1 };
const source1 = { b: 2 };
const source2 = { c: 3, a: 99 }; // a ghi đè

Object.assign(target, source1, source2);
// target = { a: 99, b: 2, c: 3 } — MUTATE target!

// Shallow copy:
const copy = Object.assign({}, original);
```

## Object.freeze / seal / preventExtensions

```javascript
const obj = { a: 1, nested: { b: 2 } };

// freeze — KHÔNG cho thêm/xóa/sửa
Object.freeze(obj);
obj.a = 99;         // ❌ Bị bỏ qua (strict mode → TypeError)
obj.c = 3;          // ❌ Bị bỏ qua
obj.nested.b = 99;  // ✅ VẪN ĐƯỢC — freeze chỉ SHALLOW!

// seal — KHÔNG thêm/xóa, nhưng CÓ THỂ sửa giá trị
const sealed = Object.seal({ a: 1 });
sealed.a = 2;       // ✅ OK
sealed.b = 3;       // ❌ Không thêm được
delete sealed.a;    // ❌ Không xóa được

// preventExtensions — KHÔNG thêm, nhưng CÓ THỂ xóa/sửa
```

| Khả năng | `freeze` | `seal` | `preventExtensions` |
|----------|---------|--------|---------------------|
| Thêm property | ❌ | ❌ | ❌ |
| Xóa property | ❌ | ❌ | ✅ |
| Sửa value | ❌ | ✅ | ✅ |
| Deep? | ❌ Shallow | ❌ Shallow | ❌ Shallow |

---

# 6. Shallow Copy vs Deep Copy

## Shallow Copy — Chỉ copy tầng 1

```javascript
const original = {
  name: 'An',
  scores: [90, 85, 92],
  address: { city: 'HCM' }
};

// 3 cách shallow copy:
const copy1 = { ...original };
const copy2 = Object.assign({}, original);
const copy3 = Array.isArray(original) ? [...original] : { ...original };

// ⚠️ Nested objects VẪN LÀ REFERENCE:
copy1.name = 'Bình';           // ✅ Không ảnh hưởng original
copy1.scores.push(100);        // ❌ original.scores CŨNG bị push!
copy1.address.city = 'HN';    // ❌ original.address.city CŨNG bị thay!
```

```
original:  { name: 'An', scores: [90,85,92], address: { city: 'HCM' } }
               ↑ copy        ↑ SAME ref           ↑ SAME ref
copy1:     { name: 'Bình', scores: ────────→, address: ────────→ }
```

## Deep Copy — Copy hoàn toàn

```javascript
// ✅ Cách 1: structuredClone (ES2022 — RECOMMENDED)
const deep1 = structuredClone(original);
deep1.scores.push(100);        // original.scores KHÔNG bị ảnh hưởng ✅
deep1.address.city = 'HN';    // original.address.city KHÔNG bị ảnh hưởng ✅

// ✅ Cách 2: JSON.parse(JSON.stringify(...)) — cách cũ
const deep2 = JSON.parse(JSON.stringify(original));
// ⚠️ Hạn chế: KHÔNG copy được:
//   - Date (thành string)
//   - undefined (bị xóa)
//   - RegExp (thành {})
//   - Functions (bị xóa)
//   - Map, Set (thành {})
//   - Circular references (throw Error)

// ❌ JSON.stringify không giữ được:
const problematic = {
  date: new Date(),       // → string
  regex: /hello/g,        // → {}
  func: () => {},         // → mất
  undef: undefined,       // → mất
};
JSON.parse(JSON.stringify(problematic));
// { date: '2026-02-12T...', regex: {} }  — func và undef mất!

// structuredClone hỗ trợ Date, RegExp, Map, Set, ArrayBuffer,
// nhưng KHÔNG hỗ trợ functions và DOM nodes.
```

| Cách | Deep? | Functions | Date | Circular | Performance |
|------|-------|-----------|------|----------|-------------|
| Spread / assign | ❌ Shallow | ✅ | ✅ | ✅ | Nhanh |
| `JSON.parse(stringify)` | ✅ Deep | ❌ Mất | ❌ → string | ❌ Error | Chậm |
| `structuredClone()` | ✅ Deep | ❌ Mất | ✅ | ✅ | Trung bình |
| Lodash `_.cloneDeep()` | ✅ Deep | ✅ | ✅ | ✅ | Trung bình |

---

# 7. Câu hỏi phỏng vấn

## Q1: "Phân biệt `map`, `filter`, `reduce`"

> **A:** Ba method không mutate array gốc:
> - `map`: biến đổi **từng phần tử** → array mới cùng length
> - `filter`: **lọc** phần tử match điều kiện → array mới ngắn hơn hoặc bằng
> - `reduce`: **gom** tất cả phần tử thành **1 giá trị** (number, object, array...)
> 
> `reduce` là mạnh nhất — có thể implement cả `map` và `filter`.

## Q2: "`splice` vs `slice` khác gì?"

> **A:** `splice` **mutate** array gốc — xóa/thêm/thay thế phần tử tại vị trí. `slice` **không mutate** — trả về bản copy một phần array. Cách nhớ: "spl**i**ce" = **i**nsert/mutate in place, "sl**i**ce" = cop**y** a piece.

## Q3: "Shallow copy vs Deep copy?"

> **A:** Shallow copy chỉ copy tầng 1 — nested objects vẫn là **cùng reference**. Deep copy tạo bản copy **hoàn toàn độc lập**. 
> - Shallow: `{...obj}`, `Object.assign()`, `[...arr]`
> - Deep: `structuredClone()` (ES2022, recommended), `JSON.parse(JSON.stringify())` (hạn chế: mất function, Date, RegExp)

## Q4: "`sort()` có vấn đề gì mà phỏng vấn hay hỏi?"

> **A:** `sort()` mặc định sắp xếp theo **string** (Unicode). `[10, 9, 2, 21].sort()` cho `[10, 2, 21, 9]` — sai! Phải truyền compare function: `.sort((a, b) => a - b)`. Ngoài ra `sort()` **mutate** array gốc. Từ ES2023 có `toSorted()` không mutate.

---

> 📅 Tạo ngày: 2026-02-12
> 📚 Nguồn: MDN Web Docs, ECMAScript Specification
> 🎯 Mục tiêu: Thành thạo Array/Object methods — công cụ dùng hàng ngày
