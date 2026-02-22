# 📘 JavaScript — Data Types & Type Coercion

> Tài liệu này đào sâu vào **hệ thống kiểu dữ liệu** của JavaScript — phần nền tảng nhất mà mọi câu hỏi phỏng vấn đều bắt đầu từ đây.

---

## Mục lục

1. [8 Data Types trong JavaScript](#1-8-data-types-trong-javascript)
2. [Primitive vs Reference Types](#2-primitive-vs-reference-types)
3. [typeof Operator — Và các bẫy](#3-typeof-operator)
4. [Type Coercion — Chuyển đổi kiểu](#4-type-coercion)
5. [Truthy & Falsy](#5-truthy--falsy)
6. [`==` vs `===`](#6--vs-)
7. [Các edge cases kinh điển](#7-các-edge-cases-kinh-điển)
8. [Câu hỏi phỏng vấn](#8-câu-hỏi-phỏng-vấn)

---

# 1. 8 Data Types trong JavaScript

JavaScript có **đúng 8 kiểu dữ liệu**, chia thành 2 nhóm: **kiểu nguyên thủy** (Primitive) và **kiểu tham chiếu** (Reference).

## 7 kiểu nguyên thủy (Primitive Types)

| Kiểu | Ví dụ | Mô tả |
|------|-------|-------|
| `string` | `'hello'`, `"world"`, `` `template` `` | Chuỗi ký tự, **immutable** |
| `number` | `42`, `3.14`, `NaN`, `Infinity` | Số thực 64-bit (IEEE 754). Không có int riêng |
| `bigint` | `9007199254740991n` | Số nguyên lớn tùy ý (ES2020) |
| `boolean` | `true`, `false` | Đúng/sai |
| `undefined` | `undefined` | Biến đã khai báo nhưng chưa gán giá trị |
| `null` | `null` | Giá trị "rỗng" được gán có chủ đích |
| `symbol` | `Symbol('id')` | Giá trị duy nhất, không trùng lặp (ES2015) |

## 1 kiểu tham chiếu (Reference Type)

| Kiểu | Ví dụ | Mô tả |
|------|-------|-------|
| `object` | `{}`, `[]`, `function(){}`, `new Date()` | Mọi thứ không phải primitive đều là object |

> **Quy tắc:** Nếu giá trị **không phải** 1 trong 7 kiểu nguyên thủy ở trên → nó là **object** (kiểu tham chiếu). Bao gồm Array, Function, Date, RegExp, Map, Set, Buffer, Error...

## "JavaScript không có class thực sự" — Nghĩa là gì?

Trước ES6 (2015), JS **không có** keyword `class`. Lập trình viên dùng `function` + `prototype` để mô phỏng:

```javascript
// Cách cũ — dùng function constructor
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  console.log(this.name + ' kêu!');
};
```

ES6 thêm `class` cho syntax đẹp hơn, nhưng **bên dưới vẫn là prototype**:

```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { console.log(this.name + ' kêu!'); }
}

// Bằng chứng: class vẫn là function!
typeof Animal  // 'function' ← đây!
Animal.prototype.speak  // [Function: speak] ← vẫn dùng prototype
```

> **Kết luận:** `class` trong JS chỉ là **syntactic sugar** (đường cú pháp) trên prototype — khác hoàn toàn với class trong Java/C# (là blueprint riêng biệt, sử dụng class-based inheritance). JS dùng **prototypal inheritance**.

```javascript
typeof 'hello'      // 'string'
typeof 42            // 'number'
typeof 42n           // 'bigint'
typeof true          // 'boolean'
typeof undefined     // 'undefined'
typeof null          // 'object'  ← BUG lịch sử!
typeof Symbol('x')   // 'symbol'
typeof {}            // 'object'
typeof []            // 'object'  ← Array cũng là object
typeof function(){}  // 'function' ← Đặc biệt (xem giải thích ở section 3)
typeof class Foo {}  // 'function' ← Class cũng là function!
```

---

# 2. Primitive vs Reference Types — Bộ nhớ hoạt động thế nào?

Đây là kiến thức **cực kỳ quan trọng** — ảnh hưởng đến cách copy, so sánh, và truyền tham số.

## Trước hết — Stack và Heap là gì?

JavaScript Engine (V8, SpiderMonkey...) quản lý bộ nhớ bằng **2 vùng**:

### Stack (Call Stack — Ngăn xếp)

- Là **cùng 1 thứ** — "Stack" và "Call Stack" là 1.
- Hoạt động theo **LIFO** (Last In, First Out) — nhanh, nhỏ (~1MB).
- Mỗi khi function được gọi → tạo **1 stack frame** → push lên stack.
- Khi function return → frame bị **pop** ra → bộ nhớ tự giải phóng.
- **Biến nằm bên trong frame** — mỗi biến chứa giá trị primitive trực tiếp hoặc địa chỉ (reference) trỏ đến heap.

### Heap (Bộ nhớ đống)

- Vùng nhớ **lớn, động** (~1.5GB trên 64-bit).
- Lưu **objects, arrays, functions** — những thứ có kích thước không cố định.
- Được quản lý bởi **Garbage Collector** — tự dọn dẹp khi object không còn ai tham chiếu.

```
Call Stack (Stack Memory)                    Heap Memory
┌──────────────────────────────┐      ┌────────────────────────────┐
│ Stack Frame: greet("An")     │      │                            │
│ ┌──────────────────────────┐ │      │                            │
│ │ name:  "An"              │ │      │  { city: 'HCM' }  (Object)│
│ │ age:   25                │ │      │                            │
│ │ user: 0x001 ─────────────────────→│  { name: 'An',     (Object)│
│ │ return address           │ │      │    age: 25 }               │
│ └──────────────────────────┘ │      │                            │
├──────────────────────────────┤      │  [1, 2, 3]         (Array) │
│ Stack Frame: main()          │      │                            │
│ ┌──────────────────────────┐ │      │  function() {}  (Function) │
│ │ x:     10                │ │      │                            │
│ │ return address           │ │      │  ← Garbage Collector       │
│ └──────────────────────────┘ │      │    tự dọn dẹp vùng này     │
└──────────────────────────────┘      └────────────────────────────┘

Stack: frame + biến (giá trị hoặc địa chỉ)     Heap: object thật
Tự giải phóng khi function return               GC giải phóng khi không còn reference
```

| | Stack | Heap |
|---|---|---|
| **Lưu gì** | Stack frames (biến, return address) | Objects, Arrays, Functions |
| **Kích thước** | Nhỏ, cố định | Lớn, động |
| **Tốc độ** | Rất nhanh | Chậm hơn |
| **Quản lý** | Tự động khi function return | Garbage Collector dọn |
| **Cấu trúc** | LIFO — có thứ tự | Không có thứ tự |

> 📌 **Stack/Heap là khái niệm chung** của mọi JS Engine (V8, SpiderMonkey, JavaScriptCore) và nhiều ngôn ngữ khác (C, Java, Go). **Không phải** chỉ riêng V8.

> 📌 **ECMAScript spec không quy định** primitive phải ở stack hay heap — đây là chi tiết implementation của engine. Mô hình "primitive trên stack, object trên heap" là cách phổ biến để giải thích **hành vi** by-value vs by-reference — và nó mô tả đúng hành vi trong mọi trường hợp.

---

## Primitive — Lưu theo giá trị (by value)

Giá trị primitive được lưu **trực tiếp trong biến trên stack**. Khi copy → tạo **bản sao mới hoàn toàn** → 2 biến **độc lập**.

```javascript
let a = 10;
let b = a;    // Copy GIÁ TRỊ 10 sang b → b có bản 10 riêng
b = 20;       // Thay đổi b KHÔNG ảnh hưởng a

console.log(a); // 10 — không đổi
console.log(b); // 20
```

```
Stack:
┌──────────┐
│  a: 10   │  ← a giữ giá trị 10 trực tiếp
├──────────┤
│  b: 20   │  ← b là bản copy riêng biệt, không liên quan a
└──────────┘

Giống photocopy tờ giấy — sửa tờ copy không ảnh hưởng tờ gốc.
```

---

## Reference — Lưu theo tham chiếu (by reference)

Object nằm trên **Heap**. Biến trên stack chỉ giữ **địa chỉ** (reference) trỏ đến object. Khi copy → chỉ copy **địa chỉ** → cả 2 biến cùng trỏ đến **1 object** → sửa qua biến này, biến kia cũng thấy.

```javascript
let obj1 = { name: 'An' };
let obj2 = obj1;        // Copy ĐỊA CHỈ, KHÔNG copy object!
obj2.name = 'Bình';     // Sửa object → obj1 cũng thấy!

console.log(obj1.name); // 'Bình' — BỊ ẢNH HƯỞNG!
console.log(obj2.name); // 'Bình'
```

```
Stack:                     Heap:
┌──────────────┐           ┌──────────────────┐
│ obj1: 0x001 ─│──────────→│ { name: 'Bình' } │
├──────────────┤      ┌───→└──────────────────┘
│ obj2: 0x001 ─│──────┘     (cùng 1 object!)
└──────────────┘

Giống 2 người cùng có địa chỉ 1 căn nhà — ai sửa nhà thì người kia cũng thấy.
```

---

## So sánh Primitive vs Reference

| | Primitive | Reference (Object) |
|---|---|---|
| **Biến chứa gì** | Giá trị thật (10, "hello"...) | Địa chỉ (reference) trỏ đến Heap |
| **Lưu ở đâu** | Stack (giá trị trực tiếp) | Stack (địa chỉ) → Heap (object thật) |
| **Copy (`=`)** | Copy **giá trị** → bản mới, độc lập | Copy **địa chỉ** → cùng trỏ 1 object |
| **So sánh (`===`)** | So sánh **giá trị** | So sánh **địa chỉ** (reference) |
| **Immutable?** | ✅ Có — không thay đổi được giá trị gốc | ❌ Không — thay đổi properties được |

```javascript
// So sánh primitive — theo giá trị
'hello' === 'hello'   // true (cùng giá trị)

// So sánh reference — theo địa chỉ
{} === {}              // false (2 object KHÁC NHAU trên heap, 2 địa chỉ khác nhau)
[] === []              // false

const a = { x: 1 };
const b = a;           // b copy địa chỉ của a
a === b                // true (cùng địa chỉ → cùng object)
```

---

## Vậy copy object thế nào? (không bị tham chiếu)

Vì gán `=` chỉ copy **địa chỉ** (reference), ta cần cách khác để tạo **object mới hoàn toàn** trên Heap.

### Shallow Copy (copy 1 tầng)

Tạo object mới trên Heap, copy **từng property** — nhưng nếu property là object thì **vẫn copy reference**:

```javascript
const obj1 = { name: 'An', age: 20 };

// Cách 1: Spread operator (phổ biến nhất)
const obj2 = { ...obj1 };

// Cách 2: Object.assign
const obj3 = Object.assign({}, obj1);

obj2.name = 'Bình';
console.log(obj1.name); // 'An' ← KHÔNG bị ảnh hưởng ✅
```

**⚠️ Vấn đề với nested object:**

```javascript
const obj1 = {
  name: 'An',
  address: { city: 'HCM' }  // ← nested object!
};

const obj2 = { ...obj1 };    // Shallow copy

obj2.name = 'Bình';          // ✅ OK — primitive property, copy by value
obj2.address.city = 'HN';   // ❌ obj1.address.city CŨNG bị đổi!

console.log(obj1.address.city); // 'HN' ← VẪN BỊ!
```

```
Tại sao? Shallow copy tạo object mới, nhưng property address chỉ copy reference:

Heap:
obj1 ──→ { name: 'An', address: 0x002 }
obj2 ──→ { name: 'Bình', address: 0x002 }  ← object MỚI nhưng address cùng trỏ!
                                 ↓
                          { city: 'HN' }    ← cùng 1 nested object!
```

### Deep Copy (copy toàn bộ, kể cả nested)

```javascript
// ✅ Cách 1: structuredClone — CHUẨN NHẤT (Node 17+, browser hiện đại)
const obj2 = structuredClone(obj1);
obj2.address.city = 'HN';
console.log(obj1.address.city); // 'HCM' ← không bị ✅

// ⚠️ Cách 2: JSON.parse(JSON.stringify()) — cách cũ, CÓ GIỚI HẠN
const obj3 = JSON.parse(JSON.stringify(obj1));
// Giới hạn: mất undefined, Function, Date bị thành string, Map/Set mất

// ✅ Cách 3: Lodash cloneDeep — dùng trong dự án thực tế
import _ from 'lodash';
const obj4 = _.cloneDeep(obj1);
```

### Bảng chọn cách copy

| Trường hợp | Dùng |
|-----------|------|
| Object phẳng (không nested) | `{ ...obj }` hoặc `Object.assign()` |
| Object nested, data thuần túy | `structuredClone()` |
| Cần hỗ trợ Node cũ hoặc edge case | `_.cloneDeep()` (Lodash) |
| ⚠️ Tránh dùng | `JSON.parse(JSON.stringify())` |

> **Array cũng tương tự:** `[...arr]` = shallow copy, `structuredClone(arr)` = deep copy.

---

# 3. typeof Operator

## Bảng kết quả `typeof` đầy đủ

| Biểu thức | `typeof` trả về | Ghi chú |
|-----------|-----------------|---------|
| `typeof undefined` | `'undefined'` | |
| `typeof true` | `'boolean'` | |
| `typeof 42` | `'number'` | Cả `NaN`, `Infinity` đều trả về `'number'` |
| `typeof 42n` | `'bigint'` | |
| `typeof 'hello'` | `'string'` | |
| `typeof Symbol()` | `'symbol'` | |
| `typeof null` | `'object'` | ⚠️ **Bug lịch sử** — null KHÔNG phải object |
| `typeof {}` | `'object'` | |
| `typeof []` | `'object'` | ⚠️ Array trả về `'object'`, dùng `Array.isArray()` |
| `typeof function(){}` | `'function'` | ⚠️ Đặc biệt — xem giải thích bên dưới |
| `typeof class Foo {}` | `'function'` | Class = syntactic sugar cho function |

## `typeof function` trả về `'function'` — Nhưng function là object?

**Đúng, function VẪN LÀ object!** `typeof` trả về `'function'` chỉ là **exception đặc biệt** cho tiện dụng — dev cần phân biệt nhanh "cái này gọi được (callable) không?".

**Bằng chứng function là object:**

```javascript
function foo() {}

// Function có thể gắn property — chỉ object mới làm được!
foo.myProp = 'hello';
console.log(foo.myProp); // 'hello' ✅

// Function vừa là Function vừa là Object
foo instanceof Function  // true
foo instanceof Object    // true ← ĐÂY! Function cũng là Object

// typeof trả về 'function', nhưng bản chất vẫn là object
typeof foo  // 'function' ← chỉ là exception của typeof
```

> **Kết luận:** Function là **callable object** — một object đặc biệt có thể gọi được. `typeof` trả về `'function'` thay vì `'object'` vì TC39 thấy cần thiết cho nhà phát triển, không phải vì function là type riêng biệt.

## Bức tranh toàn cảnh — Type System của JavaScript

```
JavaScript Values
│
├── Primitive (typeof trả về đúng tên kiểu)
│   ├── "number"     ← typeof 42
│   ├── "string"     ← typeof 'hello'
│   ├── "boolean"    ← typeof true
│   ├── "undefined"  ← typeof undefined
│   ├── "symbol"     ← typeof Symbol()
│   ├── "bigint"     ← typeof 42n
│   └── null         ← typeof null === "object" (BUG!)
│
└── Object (TẤT CẢ đều là object, lưu trên heap)
    ├── Plain Object   → typeof === "object"
    ├── Array          → typeof === "object"
    ├── Date, Map, Set → typeof === "object"
    ├── RegExp, Error  → typeof === "object"
    └── Function/Class → typeof === "function"  ← exception!
```

**Rule thực tế cần nhớ:**
- **Primitive:** `number`, `string`, `boolean`, `undefined`, `null`, `symbol`, `bigint` → lưu by value
- **Còn lại tất cả** → object → lưu by reference
- **Function/Class** cũng là object, chỉ là callable object

## Tại sao `typeof null === 'object'`?

Đây là **bug từ phiên bản JavaScript đầu tiên (1995)**. Trong implementation ban đầu, các giá trị được biểu diễn bằng tag + value. Object có tag là `0`, và `null` được biểu diễn bằng **null pointer** (tất cả bits = 0) → `typeof` kiểm tra tag, thấy `0` → trả về `'object'`.

Bug này **sẽ không bao giờ được sửa** vì quá nhiều code trên web phụ thuộc vào nó.

## Cách kiểm tra đúng kiểu

```javascript
// Kiểm tra null
const isNull = (val) => val === null;

// Kiểm tra array
Array.isArray([1, 2, 3])   // true
Array.isArray('hello')      // false

// Kiểm tra NaN
Number.isNaN(NaN)           // true
Number.isNaN('hello')       // false (khác isNaN())
isNaN('hello')              // true  ⚠️ Tự coerce sang number trước!

// Kiểm tra chính xác nhất — Object.prototype.toString
Object.prototype.toString.call(null)        // '[object Null]'
Object.prototype.toString.call([])          // '[object Array]'
Object.prototype.toString.call(new Date())  // '[object Date]'
Object.prototype.toString.call(/regex/)     // '[object RegExp]'
Object.prototype.toString.call(function(){})// '[object Function]'
```

---

# 4. Type Coercion

**Type Coercion** = JavaScript tự động chuyển đổi kiểu dữ liệu khi cần. Đây là nguồn gốc của hầu hết bugs và câu hỏi phỏng vấn trick.

## 4.1 Explicit Coercion (bạn tự chuyển đổi)

```javascript
// Sang String
String(123)           // '123'
String(true)          // 'true'
String(null)          // 'null'
String(undefined)     // 'undefined'
(123).toString()      // '123'

// Sang Number
Number('42')          // 42
Number('')            // 0
Number(' ')           // 0
Number(true)          // 1
Number(false)         // 0
Number(null)          // 0
Number(undefined)     // NaN  ⚠️
Number('hello')       // NaN
Number([])            // 0    ⚠️
Number([1])           // 1    ⚠️
Number([1, 2])        // NaN

// Sang Boolean
Boolean(0)            // false
Boolean('')           // false
Boolean(null)         // false
Boolean(undefined)    // false
Boolean(NaN)          // false
Boolean('hello')      // true
Boolean(42)           // true
Boolean([])           // true  ⚠️ Mảng rỗng là TRUTHY!
Boolean({})           // true  ⚠️ Object rỗng là TRUTHY!
```

## 4.2 Implicit Coercion (JavaScript tự chuyển)

### Quy tắc với `+` operator

```javascript
// Nếu 1 trong 2 vế là STRING → nối chuỗi (string concatenation)
'5' + 3          // '53'  (number → string)
'5' + true       // '5true'
'5' + null       // '5null'
'5' + undefined  // '5undefined'
'5' + {}         // '5[object Object]'
'5' + []         // '5'   ([] → '')

// Nếu cả 2 vế KHÔNG có string → tính toán số học
5 + 3            // 8
5 + true         // 6  (true → 1)
5 + false        // 5  (false → 0)
5 + null         // 5  (null → 0)
5 + undefined    // NaN (undefined → NaN)
```

### Quy tắc với `-`, `*`, `/` operators

```javascript
// LUÔN chuyển sang number (không bao giờ nối chuỗi)
'6' - 2          // 4
'6' * '2'        // 12
'10' / '2'       // 5
'hello' - 1      // NaN
true + true      // 2
```

### Quy tắc với `==` (Abstract Equality)

```
Khi so sánh ==, JavaScript chuyển đổi theo thuật toán:

1. null == undefined → true (đặc biệt, chỉ bằng nhau)
2. Number == String → String chuyển sang Number
3. Boolean == bất kỳ → Boolean chuyển sang Number trước
4. Object == Primitive → Object gọi .valueOf() rồi .toString()
```

## 4.3 Object to Primitive Conversion

Khi JavaScript cần chuyển object sang primitive, nó gọi các method theo thứ tự:

```javascript
// Quy trình ToPrimitive:
// 1. [Symbol.toPrimitive](hint) — nếu có
// 2. Nếu hint là 'number': valueOf() → toString()
// 3. Nếu hint là 'string': toString() → valueOf()

const obj = {
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return 42;
    if (hint === 'string') return 'forty-two';
    return true; // default
  }
};

+obj           // 42        (hint: 'number')
`${obj}`       // 'forty-two' (hint: 'string')
obj + ''       // 'true'    (hint: 'default')
```

---

# 5. Truthy & Falsy

## 8 Falsy Values — Chỉ có 8 giá trị, học thuộc!

```javascript
// Đây là TẤT CẢ falsy values trong JavaScript:
Boolean(false)      // false
Boolean(0)          // false  (số 0)
Boolean(-0)         // false  (số -0)
Boolean(0n)         // false  (BigInt 0)
Boolean('')         // false  (chuỗi rỗng)
Boolean(null)       // false
Boolean(undefined)  // false
Boolean(NaN)        // false

// Tổng cộng: false, 0, -0, 0n, '', null, undefined, NaN
```

## Mọi thứ khác là Truthy — Kể cả những thứ bạn không ngờ

```javascript
// ⚠️ Những thứ TRUTHY gây bất ngờ:
Boolean([])           // true  — mảng rỗng!
Boolean({})           // true  — object rỗng!
Boolean('0')          // true  — chuỗi '0' (không phải number 0)
Boolean('false')      // true  — chuỗi 'false' (không phải boolean false)
Boolean(new Number(0))// true  — wrapper object (dù value = 0)
Boolean(-1)           // true  — số âm
Boolean(Infinity)     // true
Boolean(' ')          // true  — chuỗi có khoảng trắng
```

## Ứng dụng thực tế

```javascript
// Short-circuit evaluation
const name = user.name || 'Anonymous';  // Fallback nếu falsy
const name = user.name ?? 'Anonymous';  // Fallback chỉ khi null/undefined (ES2020)

// Điểm khác biệt quan trọng || vs ??
0 || 'default'          // 'default' (vì 0 là falsy)
0 ?? 'default'          // 0         (vì 0 không phải null/undefined)
'' || 'default'         // 'default' (vì '' là falsy)
'' ?? 'default'         // ''        (vì '' không phải null/undefined)
```

---

# 6. `==` vs `===`

## `===` — Strict Equality (So sánh nghiêm ngặt)

**Không** chuyển đổi kiểu. Cả kiểu **VÀ** giá trị phải giống nhau.

```javascript
1 === 1          // true
1 === '1'        // false (khác kiểu)
null === undefined // false (khác kiểu)
NaN === NaN      // false ⚠️ NaN không bằng chính nó!
```

## `==` — Abstract Equality (So sánh trừu tượng)

**Có** chuyển đổi kiểu trước khi so sánh. Thuật toán phức tạp:

```javascript
// null và undefined chỉ == nhau
null == undefined    // true
null == 0            // false
null == ''           // false
null == false        // false

// Boolean → Number trước
true == 1            // true  (true → 1)
false == 0           // true  (false → 0)
true == '1'          // true  (true → 1, '1' → 1)
false == ''          // true  (false → 0, '' → 0)

// String → Number
'5' == 5             // true  ('5' → 5)
'' == 0              // true  ('' → 0)

// Object → Primitive
[] == false          // true  ([] → '' → 0, false → 0)
[1] == 1             // true  ([1] → '1' → 1)
```

## Best Practice

```javascript
// ✅ LUÔN dùng === (strict equality)
if (value === null) { ... }
if (value === undefined) { ... }
if (typeof value === 'string') { ... }

// ✅ Ngoại lệ duy nhất chấp nhận được: kiểm tra null/undefined cùng lúc
if (value == null) { ... }  // Bắt cả null VÀ undefined
// Tương đương: if (value === null || value === undefined)
```

---

# 7. Các Edge Cases Kinh Điển

## 7.1 Bảng kết quả gây sốc

```javascript
// Các kết quả "điên rồ" nhưng có lý do:
[] + []            // ''         ([] → '' + '' = '')
[] + {}            // '[object Object]'
{} + []            // 0          ⚠️ {} bị hiểu là empty block, +[] = 0
+[]                // 0          ([] → '' → 0)
+{}                // NaN        ({} → '[object Object]' → NaN)

// NaN — Not a Number
typeof NaN         // 'number'   ⚠️ NaN có type là number!
NaN === NaN        // false      ⚠️ NaN không bằng chính nó!
NaN !== NaN        // true
Number.isNaN(NaN)  // true       ← Cách kiểm tra đúng

// Số đặc biệt
0.1 + 0.2 === 0.3 // false ⚠️ (= 0.30000000000000004)
// Giải pháp: Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON

// null vs undefined
null == undefined  // true
null === undefined // false
null + 1           // 1  (null → 0)
undefined + 1      // NaN (undefined → NaN)
```

## 7.2 Giải thích bản chất `[] == false`

```
Bước 1: [] == false
Bước 2: [] == 0        (Boolean false → Number 0)
Bước 3: '' == 0        (Array [] → String '' qua ToPrimitive)
Bước 4: 0 == 0         (String '' → Number 0)
Bước 5: true!
```

## 7.3 Giải thích `typeof NaN === 'number'`

`NaN` là viết tắt của **"Not a Number"** nhưng nó thuộc kiểu `number` theo chuẩn **IEEE 754**. Nó là một giá trị đặc biệt trong hệ thống số floating-point, đại diện cho **kết quả của phép tính số học không hợp lệ** (như `0/0`, `Infinity - Infinity`). Nó vẫn nằm trong tập hợp "number" — chỉ là không phải một số hợp lệ.

## 7.4 `undefined` vs `null` — Khi nào dùng cái nào?

| | `undefined` | `null` |
|---|---|---|
| **Nghĩa** | "Chưa được gán giá trị" | "Giá trị rỗng có chủ đích" |
| **Ai gán** | JavaScript tự gán | Lập trình viên gán |
| **typeof** | `'undefined'` | `'object'` (bug) |
| **Toán học** | `undefined + 1 = NaN` | `null + 1 = 1` |
| **Khi nào** | Biến chưa gán, param thiếu, property không tồn tại | Cần reset giá trị, API trả "không có dữ liệu" |

```javascript
let x;              // undefined — JS tự gán
let y = null;       // null — bạn chủ động gán "rỗng"

function greet(name) {
  console.log(name); // undefined nếu gọi greet() không truyền arg
}

const obj = { a: 1 };
obj.b                // undefined — property không tồn tại
```

---

# 8. Câu hỏi phỏng vấn

## Q1: "JavaScript có bao nhiêu kiểu dữ liệu?"

> **A:** JavaScript có **8 kiểu dữ liệu**: 7 primitive types (string, number, bigint, boolean, undefined, null, symbol) và 1 non-primitive type (object). Mọi thứ không phải primitive đều là object — bao gồm array, function, date, regex, map, set...
>
> Điểm quan trọng: primitive types là **immutable** (không thể thay đổi giá trị gốc) và được lưu **by value** trên stack. Object types là **mutable** và được lưu **by reference** — stack chỉ giữ địa chỉ, object thực sự nằm trên heap.

## Q2: "Phân biệt `==` và `===`"

> **A:** `===` (strict equality) so sánh **cả kiểu và giá trị** — không chuyển đổi kiểu. `==` (abstract equality) **tự động chuyển đổi kiểu** (coercion) trước khi so sánh theo một thuật toán phức tạp.
>
> Best practice là **luôn dùng** `===`. Ngoại lệ duy nhất chấp nhận được là `value == null` để bắt cả `null` và `undefined` cùng lúc.
>
> Ví dụ kinh điển: `'' == false` là `true` (cả hai đều coerce thành 0), nhưng `'' === false` là `false` (khác kiểu).

## Q3: "Giải thích type coercion trong JavaScript"

> **A:** Type coercion là khi JavaScript tự động chuyển đổi kiểu dữ liệu. Có 2 loại:
> - **Implicit** (tự động): xảy ra khi dùng operators (`+`, `==`, `if()`...). Ví dụ: `'5' + 3 = '53'` vì `+` với string sẽ nối chuỗi.
> - **Explicit** (thủ công): khi bạn gọi `Number()`, `String()`, `Boolean()`...
>
> Quy tắc quan trọng:
> - `+` với string → nối chuỗi. `-`, `*`, `/` → luôn chuyển sang number
> - Chỉ có **8 giá trị falsy**: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`
> - Mọi thứ khác là truthy — kể cả `[]` và `{}`

## Q4: "`null` và `undefined` khác nhau thế nào?"

> **A:** `undefined` nghĩa là "chưa được gán giá trị" — JavaScript tự gán cho biến chưa khởi tạo, parameter thiếu, property không tồn tại. `null` nghĩa là "giá trị rỗng có chủ đích" — lập trình viên chủ động gán khi muốn nói "không có dữ liệu".
>
> Điểm đặc biệt: `null == undefined` là `true` (coercion), nhưng `null === undefined` là `false` (khác kiểu). Và `typeof null` trả về `'object'` — đây là bug từ phiên bản đầu tiên của JavaScript, sẽ không bao giờ được sửa.

## Q5: "Tại sao `0.1 + 0.2 !== 0.3`?"

> **A:** JavaScript dùng **IEEE 754 floating-point** để biểu diễn số (64-bit double precision). Số `0.1` và `0.2` không thể biểu diễn chính xác trong hệ nhị phân — giống như 1/3 = 0.333... không thể biểu diễn chính xác trong hệ thập phân.
>
> Kết quả: `0.1 + 0.2 = 0.30000000000000004`. Giải pháp: dùng `Math.abs(a - b) < Number.EPSILON` để so sánh, hoặc dùng số nguyên (nhân 100 khi tính tiền).

## Q6: "Làm sao copy object mà không bị tham chiếu?"

> **A:** Gán `=` chỉ copy reference (địa chỉ), không copy bản thân object. Để tạo bản sao:
> - **Shallow copy** (1 tầng): `{ ...obj }` hoặc `Object.assign({}, obj)` — đủ cho object phẳng
> - **Deep copy** (toàn bộ): `structuredClone(obj)` (chuẩn nhất, ES2022), hoặc `_.cloneDeep()` (Lodash)
> - **Tránh:** `JSON.parse(JSON.stringify())` — mất undefined, function, Date bị thành string
>
> Shallow copy có vấn đề với nested object — chỉ copy reference của nested, nên thay đổi nested vẫn ảnh hưởng bản gốc.

## Q7: "Function là kiểu dữ liệu gì? typeof trả về 'function' thì nó không phải object à?"

> **A:** Function vẫn là **object** — nó có thể gắn property, có prototype chain, `instanceof Object === true`. `typeof` trả về `'function'` thay vì `'object'` chỉ là **exception cho tiện dụng** — giúp dev phân biệt nhanh "cái này gọi được không?". Trong ECMAScript spec, function là "callable object" (object có thể gọi được). Tương tự, `class` cũng chỉ là syntactic sugar trên prototype — `typeof class Foo {} === 'function'`.

---

> 📅 Tạo ngày: 2026-02-12 | Cập nhật: 2026-02-18
> 📚 Nguồn: MDN Web Docs, ECMAScript Specification, JavaScript: The Definitive Guide
> 🎯 Mục tiêu: Nắm vững hệ thống kiểu dữ liệu JS — nền tảng cho mọi kiến thức khác
