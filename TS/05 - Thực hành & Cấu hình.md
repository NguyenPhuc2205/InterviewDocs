# 📘 TypeScript — Thực hành & Cấu hình dự án

> Hiểu lý thuyết chưa đủ — phải biết **cấu hình**, **sử dụng thực tế**, và **trả lời phỏng vấn**.

---

## Mục lục

1. [tsconfig.json — Cấu hình quan trọng](#1-tsconfigjson)
2. [Type Narrowing Patterns](#2-type-narrowing-patterns)
3. [Common TypeScript Patterns](#3-common-patterns)
4. [Migration JS → TS](#4-migration-js--ts)
5. [Bài tập Type Challenge](#5-type-challenges)
6. [Tổng hợp câu hỏi phỏng vấn](#6-tổng-hợp-phỏng-vấn)

---

# 1. tsconfig.json — Cấu hình quan trọng

## Strict Options — LUÔN BẬT

```jsonc
{
  "compilerOptions": {
    // === STRICT (bật tất cả strict checks) ===
    "strict": true,                    // Master switch → bật 7 options dưới:
    // "strictNullChecks": true,       // null/undefined phải xử lý rõ ràng
    // "strictFunctionTypes": true,    // Check param types chính xác
    // "strictBindCallApply": true,    // Check call/apply/bind types
    // "strictPropertyInitialization": true, // Class props phải khởi tạo
    // "noImplicitAny": true,          // Không cho ngầm any
    // "noImplicitThis": true,         // Không cho ngầm any cho this
    // "alwaysStrict": true,           // Emit "use strict"

    // === TARGET & MODULE ===
    "target": "ES2022",               // Compile ra ES version nào
    "module": "NodeNext",             // Module system
    "moduleResolution": "NodeNext",   // Cách resolve imports
    "esModuleInterop": true,          // import x from 'cjs-module' works

    // === PATHS & OUTPUT ===
    "rootDir": "./src",
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {                        // Path aliases
      "@/*": ["src/*"],
      "@modules/*": ["src/modules/*"]
    },

    // === QUALITY ===
    "noUnusedLocals": true,           // Biến khai báo mà không dùng → error
    "noUnusedParameters": true,       // Param không dùng → error
    "noImplicitReturns": true,        // Function phải return ở mọi nhánh
    "noFallthroughCasesInSwitch": true, // Switch case phải break/return
    "forceConsistentCasingInFileNames": true, // Case-sensitive imports

    // === DECORATORS (NestJS) ===
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,

    // === DECLARATIONS ===
    "declaration": true,              // Generate .d.ts files
    "declarationMap": true,           // Source maps cho declarations
    "sourceMap": true,                // Source maps cho debug

    // === ADVANCED ===
    "skipLibCheck": true,             // Skip check .d.ts → nhanh hơn
    "resolveJsonModule": true,        // Import JSON files
    "isolatedModules": true,          // Ensure file-level isolation
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

## Giải thích các options quan trọng

| Option | Tác dụng | Tại sao cần? |
|--------|---------|-------------|
| `strict: true` | Bật MỌI strict checks | Bắt lỗi sớm, code an toàn |
| `target` | Output JS version | `ES2022` cho Node.js 18+ |
| `module` | Module system | `NodeNext` cho Node.js hiện đại |
| `paths` | Import aliases | `@/services/user` thay vì `../../../services/user` |
| `skipLibCheck` | Bỏ qua check `.d.ts` | Build nhanh hơn nhiều |
| `isolatedModules` | File-level transpilation | Cần cho esbuild/swc/tsx |

---

# 2. Type Narrowing Patterns

## Pattern tổng hợp

```typescript
// 1. typeof guard
function process(x: string | number) {
  if (typeof x === 'string') { /* x: string */ }
}

// 2. instanceof guard  
function handle(err: Error | string) {
  if (err instanceof TypeError) { /* err: TypeError */ }
}

// 3. Truthiness
function print(name?: string) {
  if (name) { /* name: string (loại undefined) */ }
}

// 4. Equality
function compare(a: string | null, b: string | undefined) {
  if (a === b) { /* cả hai: string (type chung) */ }
  if (a != null) { /* a: string (loại cả null và undefined) */ }
}

// 5. Discriminated union
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    result.data;    // ✅ T
  } else {
    result.error;   // ✅ string
  }
}

// 6. Custom type guard (is)
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

// 7. Assertion function
function assertDefined<T>(val: T | undefined): asserts val is T {
  if (val === undefined) throw new Error('Value is undefined');
}

// 8. 'satisfies' operator (TS 4.9+)
const themes = {
  light: { bg: '#fff', fg: '#000' },
  dark: { bg: '#000', fg: '#fff' },
} satisfies Record<string, { bg: string; fg: string }>;
// Type vẫn CHÍNH XÁC (literal), nhưng được validate bởi Record
themes.light.bg  // Type: '#fff' (literal), không phải string
```

---

# 3. Common TypeScript Patterns

## Builder Pattern với type-safe chaining

```typescript
class QueryBuilder<T> {
  private conditions: string[] = [];
  private selectedFields: (keyof T)[] = [];

  where<K extends keyof T>(field: K, value: T[K]): this {
    this.conditions.push(`${String(field)} = ${value}`);
    return this;
  }

  select(...fields: (keyof T)[]): this {
    this.selectedFields = fields;
    return this;
  }

  build(): string {
    const select = this.selectedFields.length 
      ? this.selectedFields.join(', ') 
      : '*';
    const where = this.conditions.length
      ? ` WHERE ${this.conditions.join(' AND ')}`
      : '';
    return `SELECT ${select}${where}`;
  }
}

interface User {
  id: number;
  name: string;
  email: string;
}

new QueryBuilder<User>()
  .select('name', 'email')
  .where('id', 1)              // ✅ id là number
  // .where('name', 123)       // ❌ name phải là string
  .build();
```

## Result Type (thay thế throw)

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parseJSON<T>(json: string): Result<T> {
  try {
    return { ok: true, value: JSON.parse(json) };
  } catch (err) {
    return { ok: false, error: err as Error };
  }
}

const result = parseJSON<User>('{"name":"An"}');
if (result.ok) {
  console.log(result.value.name);  // ✅ Type-safe
} else {
  console.error(result.error.message);
}
```

## Brand Types / Nominal Types

```typescript
// TypeScript dùng structural typing → cùng shape = cùng type
// Brand types tạo "unique" types dù cùng shape

type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function createUserId(id: string): UserId {
  return id as UserId;
}

function createOrderId(id: string): OrderId {
  return id as OrderId;
}

function getUser(id: UserId): void { }

const userId = createUserId('user_123');
const orderId = createOrderId('order_456');

getUser(userId);    // ✅
// getUser(orderId); // ❌ Type 'OrderId' is not assignable to type 'UserId'
// getUser('raw');   // ❌ Type 'string' is not assignable to type 'UserId'
```

---

# 4. Migration JS → TS

## Chiến lược từng bước

```
Phase 1: Setup
  ├── npm install typescript @types/node -D
  ├── npx tsc --init
  ├── tsconfig.json: strict: false (tạm), allowJs: true
  └── Rename entry point .js → .ts

Phase 2: Gradual Migration
  ├── Rename .js → .ts từng file (bắt đầu từ leaves → inward)
  ├── Fix errors cơ bản (add type annotations)
  ├── Thêm type annotations cho function params
  └── Dùng any tạm cho complex types

Phase 3: Tighten
  ├── strict: true (bật từng option nếu cần)
  ├── Thay any → proper types
  ├── Thêm interfaces/types cho domain models
  └── Xóa @ts-ignore comments

Phase 4: Polish
  ├── Thêm generics cho code reusable
  ├── Enable strict lint rules (no-explicit-any)
  ├── Remove allowJs
  └── Full type coverage
```

## Tips cho migration

```typescript
// 1. Dùng @ts-expect-error thay @ts-ignore
// @ts-ignore — bỏ qua mọi lỗi (nguy hiểm, có thể che bug mới)
// @ts-expect-error — chỉ bỏ qua NẾU CÓ LỖI (nếu fix xong → TS nhắc xóa)

// 2. Declare module cho packages chưa có types
declare module 'untyped-package' {
  export function doSomething(arg: string): number;
}

// 3. Assertion cho external data
function processApiData(raw: unknown): User {
  const data = raw as { name: string; age: number };
  return { id: generateId(), ...data };
}

// 4. Type-safe nhưng flexible
type TODO = any; // Đánh dấu cần fix — tìm lại bằng search 'TODO'
```

---

# 5. Type Challenges

## Challenge 1: Implement `Pick`
```typescript
// Tự viết Pick<T, K>
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Test
type Result1 = MyPick<{ a: 1; b: 2; c: 3 }, 'a' | 'c'>;
// { a: 1; c: 3 }
```

## Challenge 2: Implement `Omit`
```typescript
type MyOmit<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};

// Hoặc:
type MyOmit2<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
```

## Challenge 3: Deep Readonly
```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepReadonly<T[K]>
    : T[K];
};
```

## Challenge 4: Flatten Array Type
```typescript
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;

type A = Flatten<number[]>;           // number
type B = Flatten<string[][]>;         // string
type C = Flatten<[1, [2, [3]]]>;      // 1 | 2 | 3
```

## Challenge 5: Type-safe Object.keys
```typescript
// Object.keys() trả về string[] — muốn typed keys
function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

const user = { name: 'An', age: 25 };
const keys = typedKeys(user);  // ('name' | 'age')[]
```

---

# 6. Tổng hợp câu hỏi phỏng vấn

## Q1: "Structural typing vs Nominal typing?"

> **A:** TypeScript dùng **structural typing** — nếu 2 types có cùng shape (properties), chúng tương thích. Khác với Java/C# dùng **nominal typing** (phải cùng tên class/interface). Ưu điểm: linh hoạt, dễ test (duck typing). Nhược điểm: có thể lẫn lộn types cùng shape. Fix bằng **brand types**.

## Q2: "Giải thích `satisfies` operator"

> **A:** `satisfies` (TS 4.9+) validates rằng expression khớp với type **mà không mở rộng type**. Khác `as const` (chỉ narrow), khác type annotation (mở rộng). Ví dụ: `const x = { a: 'hello' } satisfies Record<string, string>` — validates x là Record nhưng giữ literal type `'hello'`.

## Q3: "Cấu hình tsconfig nào quan trọng nhất?"

> **A:** `strict: true` — bật tất cả strict checks, bắt lỗi sớm nhất. `target` — quyết định output JS version. `module`/`moduleResolution` — quyết định module system (NodeNext cho Node.js hiện đại). `paths` — import aliases tránh `../../../`. `skipLibCheck` — tăng tốc build. `isolatedModules` — cần cho bundlers như esbuild/swc.

## Q4: "Khi nào dùng `as const`?"

> **A:** `as const` biến giá trị thành **readonly literal type**. Dùng khi cần TypeScript hiểu giá trị chính xác thay vì type rộng. Ví dụ: `['GET', 'POST'] as const` → type `readonly ['GET', 'POST']` thay vì `string[]`. Hữu ích cho: config objects, enum alternatives, function arguments cần literal type.

## Q5: "Type assertion `as` có nguy hiểm không?"

> **A:** Có — `as` nói TypeScript "tin tôi" mà **không check runtime**. Nếu sai → runtime error. Best practices: (1) ưu tiên type guard/narrowing thay vì assertion, (2) dùng `unknown` trung gian cho external data, (3) chỉ dùng `as` khi chắc chắn type hoặc TypeScript không thể infer (DOM elements, API responses).

## Q6: "Tóm tắt toàn bộ TypeScript trong 1 phút"

> **A:** TypeScript = JavaScript + Static Type System. Types bị xóa khi compile (type erasure). Có: basic types, union/intersection, generics, utility types (Partial, Pick, Omit...), conditional/mapped types, và decorators. Type system là **structural** (duck typing). Cấu hình qua tsconfig.json — luôn bật `strict: true`. Bản chất: giúp **bắt lỗi sớm** ở compile-time, **IDE support** tốt hơn, và **code tự document**.

---

> 📅 Tạo ngày: 2026-02-12
> 📚 Nguồn: TypeScript Handbook, Type Challenges, NestJS Docs
> 🎯 Mục tiêu: Sẵn sàng cho phỏng vấn TypeScript — từ config đến type-level programming
