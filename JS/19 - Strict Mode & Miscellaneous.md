# 📘 JavaScript — Strict Mode & Miscellaneous

> Các chủ đề "nhỏ nhưng hay bị hỏi" trong phỏng vấn. Kiến thức tổng hợp giúp **thể hiện chiều sâu** và sự hiểu biết toàn diện về JavaScript.

---

## Mục lục

1. [Strict Mode](#1-strict-mode)
2. [eval() — Cách hoạt động & Tại sao nguy hiểm](#2-eval--cách-hoạt-động--tại-sao-nguy-hiểm)
3. [BigInt — Arbitrary Precision Integers](#3-bigint--arbitrary-precision-integers)
4. [Labeled Statements — Nested Loop Control](#4-labeled-statements--nested-loop-control)
5. [Comma Operator & void Operator](#5-comma-operator--void-operator)
6. [Tagged Template Literals](#6-tagged-template-literals)
7. [Bitwise Operators — Flags, Permissions, Tricks](#7-bitwise-operators--flags-permissions-tricks)
8. [Intl API — Internationalization](#8-intl-api--internationalization)
9. [structuredClone vs JSON Deep Copy](#9-structuredclone-vs-json-deep-copy)
10. [Câu hỏi phỏng vấn](#10-câu-hỏi-phỏng-vấn)

---

# 1. Strict Mode

> `'use strict'` kích hoạt chế độ nghiêm ngặt — bắt lỗi sớm, cấm syntax nguy hiểm.

## Cách kích hoạt

```javascript
// Toàn file
'use strict';
// ... tất cả code trong file chạy strict mode

// Chỉ trong function
function strictFunc() {
  'use strict';
  // Chỉ function này chạy strict mode
}

// ES Modules (import/export) → TỰ ĐỘNG strict mode
// Class body → TỰ ĐỘNG strict mode
```

## Tất cả thay đổi khi bật Strict Mode

### 1. Biến phải khai báo

```javascript
'use strict';

// ❌ Quên khai báo → ReferenceError (thay vì tạo global)
mistypedVariable = 17;  // ReferenceError: mistypedVariable is not defined

// Sloppy mode: tạo window.mistypedVariable = 17 (silent bug!)
```

### 2. Assignment thất bại → Error

```javascript
'use strict';

// ❌ Ghi vào read-only property → TypeError
const obj = {};
Object.defineProperty(obj, 'x', { value: 42, writable: false });
obj.x = 9;  // TypeError: Cannot assign to read only property 'x'

// ❌ Ghi vào getter-only property → TypeError
const obj2 = { get x() { return 17; } };
obj2.x = 5;  // TypeError

// ❌ Thêm property vào non-extensible object → TypeError
const fixed = Object.preventExtensions({});
fixed.newProp = 'oops';  // TypeError

// Sloppy mode: tất cả trên đều SILENT FAIL (không error, không thay đổi)
```

### 3. delete restrictions

```javascript
'use strict';

// ❌ Delete variable, function, argument → SyntaxError
var x = 1;
delete x;  // SyntaxError

function foo() {}
delete foo;  // SyntaxError

// ❌ Delete non-configurable property → TypeError
delete Object.prototype;  // TypeError
```

### 4. Duplicate parameters → Error

```javascript
'use strict';

// ❌ Trùng tên parameter → SyntaxError
function sum(a, a, c) {  // SyntaxError: Duplicate parameter name
  return a + a + c;
}

// Sloppy mode: parameter sau ghi đè parameter trước (bug khó tìm)
```

### 5. this trong function → undefined

```javascript
'use strict';

function showThis() {
  console.log(this);
}
showThis();  // undefined (KHÔNG phải window/global!)

// Sloppy mode: this = window (browser) hoặc global (Node.js)
```

### 6. Cấm octal literals và escape

```javascript
'use strict';

// ❌ Octal literal cũ → SyntaxError
const n = 010;     // SyntaxError (sloppy: 8)
const s = '\010';  // SyntaxError

// ✅ Dùng 0o prefix (ES6)
const n = 0o10;    // 8 — OK trong strict mode
```

### 7. Cấm with statement

```javascript
'use strict';

// ❌ with → SyntaxError
with (Math) {       // SyntaxError
  console.log(PI);
}

// with gây nhập nhằng scope → V8 không optimize được
```

### 8. eval scope riêng

```javascript
'use strict';

eval('var x = 42');
console.log(typeof x);  // 'undefined' — x ở TRONG eval scope

// Sloppy mode: x "leak" ra outer scope → x = 42
```

### 9. arguments restrictions

```javascript
'use strict';

function foo(a) {
  a = 42;
  console.log(arguments[0]);  // Giá trị GỐC (không đồng bộ với a)
}
foo(10);  // 10 (strict) vs 42 (sloppy)

// ❌ arguments.callee → TypeError
function factorial(n) {
  return n <= 1 ? 1 : n * arguments.callee(n - 1);  // TypeError
}
// ✅ Dùng named function expression
const factorial = function fact(n) {
  return n <= 1 ? 1 : n * fact(n - 1);
};
```

## Tổng hợp thay đổi

| Sloppy Mode | Strict Mode |
|-------------|-------------|
| Biến không khai báo → global | ReferenceError |
| Ghi read-only → silent fail | TypeError |
| Delete var/func → silent fail | SyntaxError |
| Duplicate params → OK | SyntaxError |
| `this` = window/global | `this` = undefined |
| `010` = 8 (octal) | SyntaxError |
| `with` → OK | SyntaxError |
| eval leak scope | eval scope riêng |
| arguments sync với params | arguments không sync |

---

# 2. eval() — Cách hoạt động & Tại sao nguy hiểm

```javascript
// eval thực thi string như JavaScript code
eval('2 + 2');                // 4
eval('console.log("hi")');    // In "hi"

// eval có access local scope
function test() {
  const secret = 'password';
  eval('console.log(secret)');  // 'password' — ĐỌC ĐƯỢC!
}

// Direct vs Indirect eval
const x = 'global';
function test() {
  const x = 'local';

  eval('console.log(x)');           // 'local'  — Direct eval (local scope)
  (0, eval)('console.log(x)');      // 'global' — Indirect eval (global scope)
  window.eval('console.log(x)');    // 'global' — Indirect eval
}
```

**Tại sao nguy hiểm — xem chi tiết tại File 17 (Security).**

**Alternatives:**
```javascript
// JSON parsing: eval → JSON.parse
// Dynamic property: eval → bracket notation obj[key]
// Dynamic function: eval → function lookup
// Math expression: eval → thư viện mathjs
// Template: eval → template literals
```

---

# 3. BigInt — Arbitrary Precision Integers

> ES2020 — Số nguyên **không giới hạn kích thước**, vượt qua giới hạn `Number.MAX_SAFE_INTEGER`.

```javascript
// Number giới hạn: 2^53 - 1 = 9007199254740991
console.log(Number.MAX_SAFE_INTEGER);        // 9007199254740991
console.log(9007199254740991 + 1);           // 9007199254740992
console.log(9007199254740991 + 2);           // 9007199254740992 ← SAI!

// BigInt: thêm n suffix hoặc BigInt()
const big = 9007199254740991n;
console.log(big + 1n);   // 9007199254740992n ✓
console.log(big + 2n);   // 9007199254740993n ✓

const fromString = BigInt('123456789012345678901234567890');
const fromNumber = BigInt(42);  // 42n
```

## Rules

```javascript
// ❌ KHÔNG thể mix BigInt và Number
1n + 2;    // TypeError: Cannot mix BigInt and other types

// ✅ Phải convert rõ ràng
1n + BigInt(2);   // 3n
Number(1n) + 2;   // 3 (cẩn thận mất precision nếu BigInt lớn)

// ❌ KHÔNG dùng Math methods
Math.max(1n, 2n);   // TypeError

// ✅ So sánh: có thể mix
1n === 1;   // false (khác type)
1n == 1;    // true (loose equality)
1n < 2;     // true
2n > 1;     // true

// ✅ Conditionals
if (0n) { /* KHÔNG chạy — 0n là falsy */ }
if (1n) { /* CHẠY — 1n là truthy */ }

// ❌ KHÔNG dùng với JSON.stringify
JSON.stringify(42n);  // TypeError: Do not know how to serialize a BigInt
// ✅ Workaround
JSON.stringify(42n, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
);

// Phép toán
10n / 3n;    // 3n (truncate, KHÔNG có phần thập phân)
10n % 3n;    // 1n
2n ** 100n;  // 1267650600228229401496703205376n
```

## Use cases

```javascript
// 1. ID từ database (Snowflake ID, Twitter ID)
const tweetId = 1234567890123456789n;  // Quá lớn cho Number

// 2. Cryptography
const prime = 104729n;

// 3. Financial calculations (cents as BigInt)
const priceInCents = 1999n;  // $19.99

// 4. Timestamps nanoseconds
const nanoTimestamp = 1708444800000000000n;
```

---

# 4. Labeled Statements — Nested Loop Control

```javascript
// Label cho phép break/continue OUTER loop từ INNER loop

// ✅ break label — thoát outer loop
outerLoop: for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    if (i === 2 && j === 3) {
      break outerLoop;  // Thoát CẢ 2 vòng lặp!
    }
    console.log(i, j);
  }
}
// Không có label: break chỉ thoát inner loop

// ✅ continue label — nhảy đến iteration tiếp theo của outer loop
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) {
      continue outer;  // Nhảy đến i++ (bỏ qua j=1,2)
    }
    console.log(i, j);
  }
}
// Output: 0,0  1,0  2,0

// ✅ Practical example — tìm phần tử trong matrix
function findInMatrix(matrix, target) {
  search: for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (matrix[i][j] === target) {
        console.log(`Found at [${i}][${j}]`);
        break search;  // Thoát cả 2 vòng
      }
    }
  }
}

// ⚠️ Label cũng dùng được với block (ít gặp)
myBlock: {
  console.log('before');
  break myBlock;        // Thoát block
  console.log('after'); // KHÔNG chạy
}
```

---

# 5. Comma Operator & void Operator

## Comma Operator `,`

```javascript
// Comma operator: evaluate tất cả expressions, trả về expression CUỐI CÙNG
const result = (1, 2, 3);  // 3

// Dùng trong for loop
for (let i = 0, j = 10; i < j; i++, j--) {
  console.log(i, j);
}
// 0,10  1,9  2,8  3,7  4,6

// Swap trick (không thực tế)
let a = 1, b = 2;
a = (b, b = a);  // Chưa swap: (2, b=1) → a=1... Thực tế dùng destructuring
[a, b] = [b, a]; // ✅ Cách đúng

// Thường gặp: one-liner arrow functions
const process = (x) => (validate(x), transform(x), save(x));
// Gọi validate, transform, save; trả về kết quả save
```

## void Operator

```javascript
// void: evaluate expression rồi trả về undefined
void 0;           // undefined
void 'hello';     // undefined
void (1 + 2);     // undefined

// Use case 1: Đảm bảo undefined (trước ES5, undefined có thể bị ghi đè)
if (x === void 0) { /* x is undefined */ }

// Use case 2: Ngăn navigation trong href
// <a href="javascript:void(0)">Click</a>

// Use case 3: Arrow function — ngăn return value
const onClick = () => void doSomething();
// Không return giá trị của doSomething (giữ undefined)
// Hữu ích khi framework check return value

// Use case 4: IIFE không cần parentheses
void function() {
  console.log('IIFE');
}();
```

---

# 6. Tagged Template Literals

> Tagged templates cho phép **custom processing** template literals thông qua function.

```javascript
// Tag function nhận strings array và interpolated values
function tag(strings, ...values) {
  console.log(strings);   // ['Hello ', ', you are ', ' years old']
  console.log(values);    // ['Minh', 25]
  // strings.length === values.length + 1 (luôn đúng)
}

tag`Hello ${'Minh'}, you are ${25} years old`;
```

## Practical Examples

### HTML Escaping (chống XSS)

```javascript
function html(strings, ...values) {
  const escape = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return strings.reduce((result, str, i) => {
    return result + str + (i < values.length ? escape(values[i]) : '');
  }, '');
}

const userInput = '<script>alert("xss")</script>';
const safe = html`<div>${userInput}</div>`;
// → '<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>'
```

### SQL Query Builder (chống injection)

```javascript
function sql(strings, ...values) {
  const query = strings.join('?');
  return { query, params: values };
}

const name = "Robert'; DROP TABLE users;--";
const result = sql`SELECT * FROM users WHERE name = ${name} AND age > ${18}`;
// {
//   query: 'SELECT * FROM users WHERE name = ? AND age > ?',
//   params: ["Robert'; DROP TABLE users;--", 18]
// }
// → Parameters tự động separated → an toàn!
```

### CSS-in-JS (Styled Components style)

```javascript
function css(strings, ...values) {
  const result = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] !== undefined ? values[i] : '');
  }, '');
  return result.trim();
}

const primaryColor = '#007bff';
const style = css`
  color: ${primaryColor};
  font-size: ${16}px;
  padding: ${8}px ${16}px;
`;
```

### Internationalization (i18n)

```javascript
function i18n(strings, ...values) {
  // Lookup translations...
  const translations = {
    'Hello ': 'Xin chào ',
    ', welcome!': ', chào mừng!'
  };
  return strings.reduce((result, str, i) => {
    const translated = translations[str] || str;
    return result + translated + (values[i] || '');
  }, '');
}

const name = 'Minh';
i18n`Hello ${name}, welcome!`;  // 'Xin chào Minh, chào mừng!'
```

### strings.raw — Raw strings

```javascript
// strings.raw chứa raw strings (escape sequences KHÔNG được xử lý)
function showRaw(strings) {
  console.log(strings[0]);      // 'Hello\nWorld' (processed: newline)
  console.log(strings.raw[0]);  // 'Hello\\nWorld' (raw: literal \n)
}
showRaw`Hello\nWorld`;

// String.raw built-in tag
String.raw`Hello\nWorld`;   // 'Hello\\nWorld' — giữ nguyên escape
String.raw`C:\Users\name`;  // 'C:\\Users\\name' — không cần double escape
```

---

# 7. Bitwise Operators — Flags, Permissions, Tricks

## Operators

| Operator | Tên | Ví dụ |
|----------|-----|-------|
| `&` | AND | `5 & 3` = 1 |
| `\|` | OR | `5 \| 3` = 7 |
| `^` | XOR | `5 ^ 3` = 6 |
| `~` | NOT | `~5` = -6 |
| `<<` | Left shift | `5 << 1` = 10 |
| `>>` | Right shift (signed) | `-5 >> 1` = -3 |
| `>>>` | Right shift (unsigned) | `-5 >>> 1` = 2147483645 |

```javascript
// Cách đọc bitwise
//   5 = 0101
//   3 = 0011
// ──────────
// & = 0001 = 1  (cả hai bit đều 1)
// | = 0111 = 7  (ít nhất 1 bit là 1)
// ^ = 0110 = 6  (2 bit khác nhau)
// ~5 = ...11111010 = -6 (đảo tất cả bits)
```

## Permission Flags (Unix-style)

```javascript
// Permission system dùng bitwise
const READ    = 0b0001;  // 1
const WRITE   = 0b0010;  // 2
const EXECUTE = 0b0100;  // 4
const ADMIN   = 0b1000;  // 8

// Gán quyền (OR)
let userPermission = READ | WRITE;    // 0011 = 3 (read + write)
let adminPermission = READ | WRITE | EXECUTE | ADMIN;  // 1111 = 15

// Kiểm tra quyền (AND)
function hasPermission(user, permission) {
  return (user & permission) === permission;
}
hasPermission(userPermission, READ);     // true
hasPermission(userPermission, EXECUTE);  // false
hasPermission(adminPermission, ADMIN);   // true

// Thêm quyền (OR)
userPermission |= EXECUTE;  // 0111 = 7

// Xóa quyền (AND NOT)
userPermission &= ~WRITE;   // 0101 = 5 (giữ read + execute, xóa write)

// Toggle quyền (XOR)
userPermission ^= ADMIN;    // 1101 = 13 (toggle admin on)
userPermission ^= ADMIN;    // 0101 = 5 (toggle admin off)
```

## Bitwise Tricks

```javascript
// 1. Kiểm tra chẵn/lẻ
(n & 1) === 0;  // true nếu chẵn (nhanh hơn n % 2 === 0)
(n & 1) === 1;  // true nếu lẻ

// 2. Nhân/chia 2 (power of 2)
n << 1;   // n * 2
n >> 1;   // Math.floor(n / 2) (cho số dương)
n << 3;   // n * 8

// 3. Swap không cần temp
let a = 5, b = 3;
a ^= b;   // a = 5 ^ 3 = 6
b ^= a;   // b = 3 ^ 6 = 5
a ^= b;   // a = 6 ^ 5 = 3
// Giờ: a = 3, b = 5

// 4. Truncate to integer (thay Math.floor cho số dương)
~~3.14;        // 3
3.14 | 0;      // 3
3.14 >> 0;     // 3
// ⚠️ Chỉ đúng với số trong range 32-bit signed integer

// 5. Kiểm tra power of 2
function isPowerOf2(n) {
  return n > 0 && (n & (n - 1)) === 0;
}
isPowerOf2(8);   // true  (1000 & 0111 = 0)
isPowerOf2(6);   // false (0110 & 0101 = 0100 ≠ 0)

// 6. RGB color manipulation
const color = 0xFF5733;  // Orange
const red   = (color >> 16) & 0xFF;  // 0xFF = 255
const green = (color >> 8) & 0xFF;   // 0x57 = 87
const blue  = color & 0xFF;          // 0x33 = 51
```

---

# 8. Intl API — Internationalization

> Built-in API cho **format số, ngày, tiền tệ, sắp xếp** theo locale.

## Intl.NumberFormat

```javascript
// Tiền tệ
new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND'
}).format(1500000);
// → '1.500.000 ₫'

new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD'
}).format(1234.56);
// → '$1,234.56'

new Intl.NumberFormat('ja-JP', {
  style: 'currency', currency: 'JPY'
}).format(1234);
// → '¥1,234'

// Phần trăm
new Intl.NumberFormat('vi-VN', {
  style: 'percent', minimumFractionDigits: 1
}).format(0.256);
// → '25,6%'

// Compact notation
new Intl.NumberFormat('en-US', {
  notation: 'compact', compactDisplay: 'short'
}).format(1500000);
// → '1.5M'

new Intl.NumberFormat('vi-VN', {
  notation: 'compact'
}).format(1500000);
// → '1,5 Tr'

// Unit
new Intl.NumberFormat('en-US', {
  style: 'unit', unit: 'kilometer-per-hour'
}).format(100);
// → '100 km/h'
```

## Intl.DateTimeFormat

```javascript
const date = new Date('2024-12-25T10:30:00');

new Intl.DateTimeFormat('vi-VN').format(date);
// → '25/12/2024'

new Intl.DateTimeFormat('en-US').format(date);
// → '12/25/2024'

new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
}).format(date);
// → 'Thứ Tư, 25 tháng 12, 2024'

// Relative time
new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' }).format(-1, 'day');
// → 'hôm qua'

new Intl.RelativeTimeFormat('vi-VN').format(-3, 'hour');
// → '3 giờ trước'

new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(1, 'day');
// → 'tomorrow'
```

## Intl.Collator — Sắp xếp chuỗi

```javascript
// Sort tiếng Việt chính xác
const names = ['Ân', 'Bình', 'Ái', 'Ân', 'Cường'];
names.sort(new Intl.Collator('vi-VN').compare);
// → ['Ái', 'Ân', 'Ân', 'Bình', 'Cường']

// Case-insensitive sort
const items = ['banana', 'Apple', 'cherry'];
items.sort(new Intl.Collator('en', { sensitivity: 'base' }).compare);
// → ['Apple', 'banana', 'cherry']

// Numeric sort
const versions = ['v10', 'v2', 'v1', 'v20'];
versions.sort(new Intl.Collator('en', { numeric: true }).compare);
// → ['v1', 'v2', 'v10', 'v20']
```

## Intl.ListFormat

```javascript
new Intl.ListFormat('vi-VN', { type: 'conjunction' })
  .format(['Minh', 'Lan', 'Hùng']);
// → 'Minh, Lan và Hùng'

new Intl.ListFormat('en-US', { type: 'disjunction' })
  .format(['cats', 'dogs', 'birds']);
// → 'cats, dogs, or birds'
```

## Intl.PluralRules

```javascript
const pr = new Intl.PluralRules('en-US');
pr.select(0);   // 'other'
pr.select(1);   // 'one'
pr.select(2);   // 'other'

// Dùng cho custom plural messages
function pluralize(count, singular, plural) {
  const rule = new Intl.PluralRules('en-US').select(count);
  return rule === 'one' ? `${count} ${singular}` : `${count} ${plural}`;
}
pluralize(1, 'cat', 'cats');  // '1 cat'
pluralize(5, 'cat', 'cats');  // '5 cats'
```

---

# 9. structuredClone vs JSON Deep Copy

## JSON.parse(JSON.stringify()) — Cách cũ

```javascript
const original = {
  name: 'Minh',
  scores: [1, 2, 3],
  nested: { a: { b: 1 } }
};

const copy = JSON.parse(JSON.stringify(original));
copy.nested.a.b = 999;
console.log(original.nested.a.b);  // 1 — deep copy thành công

// ❌ JSON KHÔNG hỗ trợ:
const problematic = {
  date: new Date(),           // → string (mất Date object)
  regex: /hello/gi,           // → {} (mất)
  func: () => 'hi',           // → undefined (mất)
  undef: undefined,           // → key bị xóa!
  nan: NaN,                   // → null
  inf: Infinity,              // → null
  map: new Map([['a', 1]]),   // → {}
  set: new Set([1, 2, 3]),    // → {}
  bigint: 42n,                // → TypeError!
  circular: null              // circular → TypeError!
};
// problematic.circular = problematic;
// JSON.stringify(problematic) → TypeError: circular reference
```

## structuredClone() — Cách mới (ES2022)

```javascript
// structuredClone: native deep clone
const original = {
  name: 'Minh',
  date: new Date(),
  regex: /hello/gi,
  map: new Map([['a', 1]]),
  set: new Set([1, 2, 3]),
  buffer: new ArrayBuffer(8),
  nested: { deep: { value: 42 } }
};

const clone = structuredClone(original);

// ✅ Tất cả đều được clone đúng:
clone.date instanceof Date;   // true
clone.regex instanceof RegExp; // true
clone.map instanceof Map;      // true
clone.set instanceof Set;      // true

clone.nested.deep.value = 999;
console.log(original.nested.deep.value);  // 42 — deep copy

// ✅ Circular references
const circular = { name: 'circular' };
circular.self = circular;
const cloned = structuredClone(circular);
cloned.self === cloned;  // true — circular reference preserved!
```

## So sánh

| Feature | `JSON.parse(JSON.stringify())` | `structuredClone()` |
|---------|-------------------------------|---------------------|
| Date | ❌ → string | ✅ Date object |
| RegExp | ❌ → `{}` | ✅ RegExp object |
| Map/Set | ❌ → `{}` | ✅ Map/Set |
| ArrayBuffer | ❌ → `{}` | ✅ ArrayBuffer |
| undefined | ❌ key bị xóa | ✅ giữ undefined |
| NaN/Infinity | ❌ → null | ✅ giữ NaN/Infinity |
| Circular ref | ❌ TypeError | ✅ xử lý đúng |
| Functions | ❌ mất | ❌ **DataCloneError** |
| DOM Nodes | ❌ | ❌ **DataCloneError** |
| Prototype chain | ❌ mất | ❌ mất |
| Performance | Nhanh (JSON native) | Nhanh (native C++) |
| Support | Mọi nơi | ES2022+ / Node 17+ |

```javascript
// ❌ structuredClone KHÔNG clone:
// - Functions
// - DOM elements
// - Property descriptors (getters/setters)
// - Prototype chain

const withFunc = { greet: () => 'hi' };
structuredClone(withFunc);  // DataCloneError!

// Workaround cho functions: manual copy
const cloneWithFunctions = (obj) => {
  const clone = structuredClone(
    JSON.parse(JSON.stringify(obj, (key, val) =>
      typeof val === 'function' ? undefined : val
    ))
  );
  // Copy functions manually
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'function') clone[key] = val;
  }
  return clone;
};
```

---

# 10. Câu hỏi phỏng vấn

### Q1: Strict mode thay đổi gì? Kể ít nhất 5 thay đổi.

**A:**
1. Biến không khai báo → **ReferenceError** (thay vì tạo global)
2. Ghi read-only property → **TypeError** (thay vì silent fail)
3. Duplicate params → **SyntaxError**
4. `this` trong function → **undefined** (thay vì window)
5. `eval` → **scope riêng** (không leak biến)
6. Cấm `with`, octal literal `010`, `arguments.callee`
7. `delete` var/func → **SyntaxError**
8. ES Modules và class body tự động strict mode

---

### Q2: BigInt dùng khi nào? Có thể cộng BigInt và Number không?

**A:** BigInt dùng cho số nguyên vượt `Number.MAX_SAFE_INTEGER` (2^53-1): database IDs (Snowflake), cryptography, financial. **KHÔNG thể** mix trực tiếp: `1n + 2` → TypeError. Phải convert: `1n + BigInt(2)` hoặc `Number(1n) + 2`. BigInt không dùng được với `Math`, `JSON.stringify` (cần custom replacer).

---

### Q3: Tagged template literal là gì? Cho use case thực tế.

**A:** Function được gọi với template literal — nhận mảng strings và values riêng biệt. Use cases:
- **HTML escaping** (chống XSS): auto-escape interpolated values
- **SQL query builder** (chống injection): tách query và params
- **CSS-in-JS**: Styled Components dùng tagged templates
- **i18n**: lookup translations cho string parts
- `String.raw`: giữ nguyên escape sequences

---

### Q4: structuredClone và JSON deep copy khác gì?

**A:** `structuredClone()` (ES2022) clone đúng **Date, RegExp, Map, Set, ArrayBuffer, circular references, NaN/Infinity/undefined**. `JSON.parse(JSON.stringify())` mất hết các types đó. Cả hai đều không clone functions và prototype chain. structuredClone throw DataCloneError cho functions/DOM, JSON throw cho circular refs.

---

### Q5: Bitwise operators có ứng dụng gì trong thực tế?

**A:**
1. **Permission flags**: `READ | WRITE`, kiểm tra `(user & ADMIN) === ADMIN`
2. **RGB color manipulation**: extract/combine channels
3. **Kiểm tra chẵn/lẻ**: `n & 1` (nhanh hơn `%`)
4. **Power of 2 check**: `n & (n-1) === 0`
5. **Feature flags**: toggle features on/off
6. **Hash functions**: XOR, shifts

---

### Q6: void operator dùng để làm gì?

**A:** `void` evaluate expression rồi trả về `undefined`. Use cases: `void 0` đảm bảo undefined (trước ES5), `javascript:void(0)` trong href, ngăn arrow function return value `() => void doSomething()`, IIFE không cần parentheses `void function(){}()`.

---

### Q7: Intl API giải quyết vấn đề gì? Kể các formatters.

**A:** Intl API cung cấp **internationalization** built-in — format theo locale mà không cần thư viện. Formatters: `NumberFormat` (tiền tệ, phần trăm, compact), `DateTimeFormat` (ngày giờ), `RelativeTimeFormat` ("3 giờ trước"), `Collator` (sort theo locale), `ListFormat` ("A, B và C"), `PluralRules` (singular/plural).
