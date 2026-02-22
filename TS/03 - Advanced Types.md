# 📘 TypeScript — Advanced Types

> Utility types, conditional types, mapped types — kiến thức **nâng cao** mà senior dev cần phải nắm.

---

## Mục lục

1. [Utility Types đầy đủ](#1-utility-types)
2. [Type Guards & Narrowing](#2-type-guards--narrowing)
3. [Conditional Types](#3-conditional-types)
4. [Mapped Types](#4-mapped-types)
5. [Template Literal Types](#5-template-literal-types)
6. [`infer` Keyword](#6-infer-keyword)
7. [Recursive Types](#7-recursive-types)
8. [Câu hỏi phỏng vấn](#8-câu-hỏi-phỏng-vấn)

---

# 1. Utility Types

TypeScript cung cấp sẵn các utility types. Phải thuộc!

## Bảng tổng hợp

| Utility Type | Tác dụng | Ví dụ |
|-------------|---------|-------|
| `Partial<T>` | Tất cả properties → optional | Update DTO |
| `Required<T>` | Tất cả properties → required | Config validation |
| `Readonly<T>` | Tất cả properties → readonly | Immutable data |
| `Pick<T, K>` | Chọn một số properties | DTO, API response |
| `Omit<T, K>` | Loại bỏ một số properties | Hide sensitive data |
| `Record<K, V>` | Tạo object type từ key-value | Maps, dictionaries |
| `Exclude<T, U>` | Loại bỏ types từ union | Filter union |
| `Extract<T, U>` | Lấy types chung từ union | Filter union |
| `NonNullable<T>` | Loại bỏ null & undefined | Clean nullable |
| `ReturnType<T>` | Lấy return type của function | Infer types |
| `Parameters<T>` | Lấy params type của function | Infer types |

## Chi tiết từng Utility Type

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  role: 'admin' | 'user';
}

// Partial — tất cả optional
type UpdateUserDto = Partial<User>;
// { id?: string; name?: string; email?: string; age?: number; role?: ... }

// Required — tất cả bắt buộc
type StrictUser = Required<User>;

// Readonly — không thay đổi được
type FrozenUser = Readonly<User>;
const user: FrozenUser = { id: '1', name: 'An', email: 'a@b.com', age: 25, role: 'user' };
// user.name = 'Bình';  // ❌ Error: Cannot assign to 'name' because it is read-only

// Pick — chọn fields
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string }

// Omit — loại fields
type UserWithoutEmail = Omit<User, 'email' | 'role'>;
// { id: string; name: string; age: number }

// Record — tạo object type
type UserRoles = Record<string, User[]>;
// { [key: string]: User[] }

type PageInfo = Record<'home' | 'about' | 'contact', { title: string; url: string }>;
// { home: {...}; about: {...}; contact: {...} }

// Exclude — loại bỏ từ union
type T1 = Exclude<'a' | 'b' | 'c', 'a'>;        // 'b' | 'c'
type T2 = Exclude<string | number | boolean, string>; // number | boolean

// Extract — lấy ra từ union
type T3 = Extract<'a' | 'b' | 'c', 'a' | 'f'>;  // 'a'

// NonNullable
type T4 = NonNullable<string | null | undefined>; // string

// ReturnType
function createUser() {
  return { id: '1', name: 'An' };
}
type CreatedUser = ReturnType<typeof createUser>;
// { id: string; name: string }

// Parameters
function greet(name: string, age: number): void {}
type GreetParams = Parameters<typeof greet>;
// [name: string, age: number]
```

---

# 2. Type Guards & Narrowing

**Type Narrowing** = thu hẹp type từ rộng sang cụ thể dựa trên điều kiện.

## Built-in Type Guards

```typescript
// typeof — cho primitives
function process(value: string | number) {
  if (typeof value === 'string') {
    value.toUpperCase();    // ✅ TS biết value là string
  } else {
    value.toFixed(2);       // ✅ TS biết value là number
  }
}

// instanceof — cho classes
function handleError(err: Error | string) {
  if (err instanceof Error) {
    err.message;            // ✅ Error
    err.stack;
  } else {
    err.toUpperCase();      // ✅ string
  }
}

// 'in' operator — check property tồn tại
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ('swim' in animal) {
    animal.swim();          // ✅ Fish
  } else {
    animal.fly();           // ✅ Bird
  }
}

// Truthiness narrowing
function printName(name: string | null | undefined) {
  if (name) {
    name.toUpperCase();     // ✅ string (loại null & undefined)
  }
}

// Equality narrowing
function compare(x: string | number, y: string | boolean) {
  if (x === y) {
    // x và y đều phải là string (type chung duy nhất)
    x.toUpperCase();        // ✅ string
  }
}
```

## Custom Type Guard (`is` keyword)

```typescript
interface Cat { meow(): void; name: string; }
interface Dog { bark(): void; name: string; }

// Type predicate — return type là `paramName is Type`
function isCat(animal: Cat | Dog): animal is Cat {
  return 'meow' in animal;
}

function handleAnimal(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.meow();   // ✅ TypeScript biết là Cat
  } else {
    animal.bark();   // ✅ TypeScript biết là Dog
  }
}

// Assertion function (throws nếu sai)
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Not a string!');
  }
}

function process(input: unknown) {
  assertIsString(input);
  input.toUpperCase();  // ✅ Sau assert, TS biết input là string
}
```

---

# 3. Conditional Types

```typescript
// Syntax: T extends U ? X : Y
// "Nếu T extends U thì type là X, không thì Y"

type IsString<T> = T extends string ? 'yes' : 'no';

type A = IsString<string>;    // 'yes'
type B = IsString<number>;    // 'no'
type C = IsString<'hello'>;   // 'yes' (literal extends string)

// Distributive conditional types — phân phối qua union
type ToArray<T> = T extends any ? T[] : never;
type D = ToArray<string | number>;  // string[] | number[]
// Không phải (string | number)[]!

// Ngăn distribution bằng []
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type E = ToArrayNonDist<string | number>;  // (string | number)[]
```

---

# 4. Mapped Types

Tạo type mới bằng cách **biến đổi** properties của type cũ:

```typescript
// Syntax: { [K in keyof T]: NewType }

// Tự implement Partial
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

// Tự implement Readonly
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Tự implement Required (xóa optional bằng -?)
type MyRequired<T> = {
  [K in keyof T]-?: T[K];
};

// Biến đổi value types
type Stringify<T> = {
  [K in keyof T]: string;
};

type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

### Key Remapping (`as`)

```typescript
// Đổi tên keys
type Prefix<T, P extends string> = {
  [K in keyof T as `${P}_${string & K}`]: T[K];
};

type PrefixedUser = Prefix<{ name: string; age: number }, 'user'>;
// { user_name: string; user_age: number }

// Lọc keys
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type StringProps = OnlyStrings<{ name: string; age: number; email: string }>;
// { name: string; email: string } — loại bỏ age (number)
```

---

# 5. Template Literal Types

```typescript
type Color = 'red' | 'blue' | 'green';
type Size = 'small' | 'medium' | 'large';

// Kết hợp — tự tạo TẤT CẢ combinations
type ClassName = `${Size}-${Color}`;
// 'small-red' | 'small-blue' | 'small-green' |
// 'medium-red' | 'medium-blue' | 'medium-green' |
// 'large-red' | 'large-blue' | 'large-green'

// String manipulation types
type Upper = Uppercase<'hello'>;        // 'HELLO'
type Lower = Lowercase<'HELLO'>;        // 'hello'
type Cap = Capitalize<'hello'>;         // 'Hello'
type Uncap = Uncapitalize<'Hello'>;     // 'hello'

// Ứng dụng: event handler types
type EventName = 'click' | 'focus' | 'blur';
type HandlerName = `on${Capitalize<EventName>}`;
// 'onClick' | 'onFocus' | 'onBlur'
```

---

# 6. `infer` Keyword

`infer` = **suy ra type** bên trong conditional type:

```typescript
// Lấy return type (tự implement ReturnType)
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type A = MyReturnType<() => string>;     // string
type B = MyReturnType<(x: number) => boolean>;  // boolean

// Lấy type phần tử array
type ElementType<T> = T extends (infer E)[] ? E : never;

type C = ElementType<number[]>;          // number
type D = ElementType<string[]>;          // string
type E = ElementType<(string | number)[]>; // string | number

// Lấy type argument đầu tiên
type FirstArg<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;

type F = FirstArg<(name: string, age: number) => void>;  // string

// Lấy type Promise resolve
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type G = Awaited<Promise<string>>;              // string
type H = Awaited<Promise<Promise<number>>>;     // number (recursive!)

// Extract return type of async function
type AsyncReturnType<T> = T extends (...args: any[]) => Promise<infer R> ? R : never;
```

---

# 7. Recursive Types

```typescript
// DeepReadonly — readonly đệ quy cho nested objects
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepReadonly<T[K]>
    : T[K];
};

interface Config {
  db: {
    host: string;
    port: number;
    options: {
      ssl: boolean;
    };
  };
}

type ReadonlyConfig = DeepReadonly<Config>;
// Tất cả properties ở MỌI tầng đều readonly

// DeepPartial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// JSON type
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Dot-notation path type
type Path<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends object
    ? Path<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];
```

---

# 8. Câu hỏi phỏng vấn

## Q1: "Kể tên và giải thích các Utility Types thường dùng"

> **A:** `Partial<T>` — tất cả fields optional (dùng cho update DTO). `Pick<T, K>` — chọn fields (DTO). `Omit<T, K>` — loại fields (ẩn sensitive data). `Record<K, V>` — tạo object type. `ReturnType<T>` — lấy return type function. `Readonly<T>` — immutable. Mỗi cái giải quyết 1 vấn đề cụ thể mà dev gặp hàng ngày.

## Q2: "Type guard là gì? Cho ví dụ"

> **A:** Type guard là expression kiểm tra type tại runtime, giúp TypeScript **narrow** (thu hẹp) type. Built-in: `typeof` (primitives), `instanceof` (classes), `in` (property check). Custom: function trả về `value is Type` — cho phép bạn định nghĩa logic check riêng. Ví dụ: `function isCat(a: Cat | Dog): a is Cat`.

## Q3: "Conditional types hoạt động thế nào?"

> **A:** Syntax `T extends U ? X : Y` — giống ternary cho types. Nếu T assignable cho U → type X, ngược lại → type Y. Khi áp dụng cho union types, nó **distribute** — check từng member riêng. Kết hợp `infer` để **suy ra** types bên trong (ReturnType, Parameters, Awaited...).

## Q4: "Mapped types dùng khi nào?"

> **A:** Khi cần **biến đổi hàng loạt** properties của type: thêm/bỏ optional, thêm/bỏ readonly, đổi value type, đổi tên key. Utility types như `Partial`, `Readonly`, `Required` đều implement bằng mapped types. Key remapping (`as`) cho phép lọc và đổi tên keys.

---

> 📅 Tạo ngày: 2026-02-12
> 📚 Nguồn: TypeScript Handbook, TypeScript Deep Dive
> 🎯 Mục tiêu: Master advanced type system — viết type-level programming
