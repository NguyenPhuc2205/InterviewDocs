# 📘 TypeScript — Type System Fundamentals

> TypeScript = JavaScript + **Type System**. Hiểu type system = viết code an toàn hơn, bug ít hơn, IDE hỗ trợ tốt hơn.

---

## Mục lục

1. [TypeScript là gì?](#1-typescript-là-gì)
2. [Basic Types](#2-basic-types)
3. [any vs unknown vs never](#3-any-vs-unknown-vs-never)
4. [Type Assertions](#4-type-assertions)
5. [Type Aliases vs Interfaces](#5-type-aliases-vs-interfaces)
6. [Union & Intersection Types](#6-union--intersection-types)
7. [Literal Types & const Assertions](#7-literal-types)
8. [Nullable Types & Strict Null Checks](#8-nullable-types)
9. [Câu hỏi phỏng vấn](#9-câu-hỏi-phỏng-vấn)

---

# 1. TypeScript là gì?

> **TypeScript** = JavaScript + **Static Type System** + **Compile-time checking**. Code TS được **compile** (transpile) sang JS trước khi chạy.

```
TypeScript Code (.ts)
       │
       ▼
  tsc (TypeScript Compiler)  ← Kiểm tra types tại đây
       │
       ▼
  JavaScript Code (.js)       ← Runtime chỉ chạy JS
```

**TypeScript KHÔNG tồn tại lúc runtime.** Tất cả type annotations bị xóa khi compile. Đây gọi là **type erasure**.

```typescript
// TypeScript
function greet(name: string): string {
  return `Hello, ${name}`;
}

// Compile ra JavaScript
function greet(name) {
  return `Hello, ${name}`;
}
// Types biến mất hoàn toàn!
```

**Tại sao dùng TypeScript?**
1. **Bắt lỗi sớm** — compile-time thay vì runtime
2. **IDE support** — autocomplete, refactor, go-to-definition
3. **Documentation** — types là documentation sống
4. **Confidence** — refactor code lớn mà không sợ

---

# 2. Basic Types

```typescript
// Primitive types
let name: string = 'An';
let age: number = 25;
let isActive: boolean = true;
let big: bigint = 100n;
let sym: symbol = Symbol('id');

// null & undefined
let n: null = null;
let u: undefined = undefined;

// Array — 2 cách viết
let nums: number[] = [1, 2, 3];
let strs: Array<string> = ['a', 'b'];   // Generic syntax

// Tuple — array với SỐ LƯỢNG VÀ KIỂU cố định
let coord: [number, number] = [10, 20];
let entry: [string, number] = ['age', 25];
// coord[2] = 30;  // ❌ Error: Tuple chỉ có 2 phần tử

// Enum
enum Direction {
  Up,      // 0
  Down,    // 1
  Left,    // 2
  Right,   // 3
}
let dir: Direction = Direction.Up;

// String enum — explicit values
enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Pending = 'PENDING',
}

// Object type
let user: { name: string; age: number; email?: string } = {
  name: 'An',
  age: 25,
  // email là optional (?)
};

// Function type
let add: (a: number, b: number) => number = (a, b) => a + b;

// void — function không return giá trị
function log(msg: string): void {
  console.log(msg);
}
```

---

# 3. any vs unknown vs never

Đây là **câu hỏi phỏng vấn #1** về TypeScript.

## Bảng so sánh

| Type | Gán bất kỳ giá trị? | Dùng trực tiếp? | Khi nào dùng? |
|------|---------------------|-----------------|---------------|
| `any` | ✅ Gán bất kỳ | ✅ Dùng ngay (KHÔNG check) | ❌ **Tránh dùng** — tắt type checking |
| `unknown` | ✅ Gán bất kỳ | ❌ Phải **check type trước** | ✅ Thay thế an toàn cho `any` |
| `never` | ❌ Không gán được | ❌ Không thể có giá trị | Hàm throw/vô hạn, exhaustive check |

## `any` — "Tắt TypeScript"

```typescript
let x: any = 42;
x = 'hello';        // ✅ OK
x = true;           // ✅ OK
x.nonExistent();    // ✅ Compile OK — nhưng ❌ RUNTIME ERROR!
x.foo.bar.baz;      // ✅ Compile OK — tắt hoàn toàn type checking

// ⚠️ any "lây nhiễm" — 1 any làm hỏng cả chain
let y: number = x;  // ✅ OK — any assign được vào bất kỳ type nào!
```

## `unknown` — "any an toàn"

```typescript
let x: unknown = 42;
x = 'hello';        // ✅ OK — gán bất kỳ giá trị

// ❌ KHÔNG thể dùng trực tiếp
// x.toString();     // Error: Object is of type 'unknown'
// let y: number = x; // Error: Type 'unknown' is not assignable to type 'number'

// ✅ Phải kiểm tra type trước (Type Narrowing)
if (typeof x === 'string') {
  x.toUpperCase();   // ✅ OK — TypeScript biết x là string
}

if (typeof x === 'number') {
  x.toFixed(2);      // ✅ OK — TypeScript biết x là number
}
```

## `never` — "Không bao giờ xảy ra"

```typescript
// Hàm KHÔNG BAO GIỜ return
function throwError(msg: string): never {
  throw new Error(msg);  // Luôn throw → không return
}

function infiniteLoop(): never {
  while (true) {}  // Không bao giờ kết thúc
}

// Exhaustive checking — bắt case bị thiếu
type Shape = 'circle' | 'square' | 'triangle';

function getArea(shape: Shape): number {
  switch (shape) {
    case 'circle': return Math.PI * 10;
    case 'square': return 100;
    case 'triangle': return 50;
    default:
      // Nếu quên handle 1 case → lỗi compile
      const _exhaustive: never = shape;
      throw new Error(`Unknown shape: ${shape}`);
  }
}
// Thêm 'rectangle' vào Shape → TypeScript báo lỗi ở default!
```

---

# 4. Type Assertions

"Nói cho TypeScript biết" bạn chắc chắn về type hơn nó:

```typescript
// Syntax 1: as keyword (recommended)
const input = document.getElementById('name') as HTMLInputElement;
input.value = 'An';

// Syntax 2: angle bracket (không dùng trong JSX/TSX)
const input2 = <HTMLInputElement>document.getElementById('name');

// ⚠️ Type assertion KHÔNG chuyển đổi kiểu — chỉ nói TypeScript "tin tôi"
const x = 'hello' as number;  // ❌ Error: cannot assert string to number

// Double assertion (escape hatch — tránh dùng)
const x = 'hello' as unknown as number;  // ✅ Nhưng NGUY HIỂM

// const assertion — biến value thành literal type
const colors = ['red', 'green', 'blue'] as const;
// Type: readonly ['red', 'green', 'blue'] — không phải string[]
```

---

# 5. Type Aliases vs Interfaces

## Type Alias

```typescript
type User = {
  name: string;
  age: number;
  email?: string;
};

type ID = string | number;  // Union type
type Callback = (data: string) => void;  // Function type
type Pair<T> = [T, T];  // Generic
```

## Interface

```typescript
interface User {
  name: string;
  age: number;
  email?: string;
}

interface Printable {
  print(): void;
}

// Extend
interface Admin extends User {
  role: string;
  permissions: string[];
}

// Implement
class Employee implements User, Printable {
  constructor(
    public name: string,
    public age: number,
  ) {}

  print() {
    console.log(`${this.name}, ${this.age}`);
  }
}
```

## So sánh Type vs Interface

| Khả năng | Type Alias | Interface |
|----------|-----------|-----------|
| **Object shape** | ✅ | ✅ |
| **Union types** (`\|`) | ✅ `type A = B \| C` | ❌ |
| **Intersection** (`&`) | ✅ `type A = B & C` | ❌ (dùng `extends`) |
| **Primitive alias** | ✅ `type ID = string` | ❌ |
| **Tuple** | ✅ `type Pair = [A, B]` | ❌ |
| **Extends** | `type B = A & { ... }` | `interface B extends A` |
| **Declaration merging** | ❌ | ✅ (tự động merge cùng tên) |
| **implements** | ✅ | ✅ |

### Declaration Merging — điểm khác biệt lớn nhất

```typescript
// Interface: tự động merge 2 khai báo cùng tên
interface User {
  name: string;
}
interface User {
  age: number;
}
// User = { name: string; age: number } — merged!

// Type: ❌ KHÔNG merge
type User = { name: string; };
type User = { age: number; };  // ❌ Error: Duplicate identifier
```

### Khi nào dùng cái nào?

```
✅ Dùng interface khi:
  - Định nghĩa object shapes, class contracts
  - Cần declaration merging (extend thư viện)
  - Team convention là interface

✅ Dùng type khi:
  - Union/Intersection types
  - Primitive aliases, tuples
  - Complex computed types
  - Utility types (Mapped, Conditional...)
```

---

# 6. Union & Intersection Types

## Union (`|`) — "Hoặc"

```typescript
type StringOrNumber = string | number;

function format(value: StringOrNumber): string {
  // Phải check type trước khi dùng (Type Narrowing)
  if (typeof value === 'string') {
    return value.toUpperCase();  // ✅ TypeScript biết là string
  }
  return value.toFixed(2);      // ✅ TypeScript biết là number
}

format('hello');  // 'HELLO'
format(3.14159);  // '3.14'
```

### Discriminated Union — Pattern rất mạnh

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;  // TS biết có radius
    case 'rectangle':
      return shape.width * shape.height;    // TS biết có width, height
    case 'triangle':
      return (shape.base * shape.height) / 2;
  }
}
```

## Intersection (`&`) — "Và"

```typescript
type HasName = { name: string };
type HasAge = { age: number };
type Person = HasName & HasAge;  // { name: string; age: number }

const person: Person = { name: 'An', age: 25 };  // Phải có CẢ HAI
```

---

# 7. Literal Types

```typescript
// String literal types
type Direction = 'up' | 'down' | 'left' | 'right';
let dir: Direction = 'up';    // ✅
// dir = 'diagonal';          // ❌ Error

// Number literal types
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

// Boolean literal types
type Yes = true;

// const assertions — biến value thành literal
let x = 'hello';           // Type: string
const y = 'hello';         // Type: 'hello' (literal)

const config = {
  url: '/api',
  method: 'GET',
} as const;
// Type: { readonly url: '/api'; readonly method: 'GET' }
// Không phải { url: string; method: string }

// Hữu ích cho function parameters cần literal
function request(url: string, method: 'GET' | 'POST') {}
request(config.url, config.method);  // ✅ 'GET' là literal type
```

---

# 8. Nullable Types & Strict Null Checks

```typescript
// Với strictNullChecks: true (LUÔN BẬT)
let name: string = 'An';
// name = null;       // ❌ Error
// name = undefined;  // ❌ Error

// Cho phép null/undefined rõ ràng
let nullableName: string | null = null;
let optionalName: string | undefined = undefined;

// Optional parameter / property
function greet(name?: string) {
  // name: string | undefined
  console.log(name?.toUpperCase() ?? 'ANONYMOUS');
}

interface User {
  name: string;
  email?: string;  // string | undefined
}

// Non-null assertion (!)
function getLength(str: string | null): number {
  // return str.length;   // ❌ Error: str có thể null
  return str!.length;     // ✅ Nói TS "tôi chắc str không null"
  // ⚠️ Nguy hiểm nếu str thực sự là null → runtime error!
}

// ✅ Cách an toàn hơn: check trước
function getLengthSafe(str: string | null): number {
  if (str === null) return 0;
  return str.length;  // ✅ TS tự biết str là string
}
```

---

# 9. Câu hỏi phỏng vấn

## Q1: "TypeScript khác JavaScript thế nào?"

> **A:** TypeScript là **superset** của JavaScript — mọi code JS đều là code TS hợp lệ. TS thêm **static type system** được kiểm tra **compile-time**. Types bị xóa khi compile ra JS (type erasure) → **không ảnh hưởng runtime performance**. Lợi ích: bắt lỗi sớm, IDE support mạnh, code tự document, refactor an toàn.

## Q2: "`any` vs `unknown` vs `never`?"

> **A:** `any` tắt type checking hoàn toàn — gán và dùng bất kỳ, KHÔNG an toàn. `unknown` gán bất kỳ nhưng **phải check type trước khi dùng** — an toàn hơn `any`. `never` đại diện giá trị **không bao giờ xảy ra** — dùng cho hàm throw/vô hạn và exhaustive checking.
>
> **Best practice:** Không bao giờ dùng `any` ngoại trừ migration legacy code. Dùng `unknown` khi type chưa biết.

## Q3: "Type alias vs Interface — khi nào dùng cái nào?"

> **A:** Interface cho **object shapes** và **class contracts** — hỗ trợ declaration merging và `extends` rõ ràng. Type alias cho **union types**, **intersections**, **primitives**, **tuples**, và **computed types**. Team thường chọn 1 convention. Cả hai đều dùng được cho object type — performance giống nhau.

## Q4: "Discriminated Union là gì?"

> **A:** Pattern dùng 1 property chung (discriminant) với literal type để phân biệt các variants trong union. TypeScript tự động **narrow type** trong switch/if dựa trên discriminant. Rất mạnh cho state machines, API responses, shape calculations...

---

> 📅 Tạo ngày: 2026-02-12
> 📚 Nguồn: TypeScript Handbook, TypeScript Deep Dive
> 🎯 Mục tiêu: Nắm vững nền tảng type system — base cho mọi kiến thức TS
