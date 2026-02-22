# 📘 TypeScript — Generics

> Generics cho phép viết code **linh hoạt mà vẫn type-safe**. Đây là tính năng mạnh nhất của TypeScript.

---

## Mục lục

1. [Generics là gì?](#1-generics-là-gì)
2. [Generic Functions](#2-generic-functions)
3. [Generic Interfaces & Classes](#3-generic-interfaces--classes)
4. [Generic Constraints (`extends`)](#4-generic-constraints)
5. [`keyof` & Indexed Access Types](#5-keyof--indexed-access)
6. [Generic Defaults](#6-generic-defaults)
7. [Ví dụ thực tế](#7-ví-dụ-thực-tế)
8. [Câu hỏi phỏng vấn](#8-câu-hỏi-phỏng-vấn)

---

# 1. Generics là gì?

**Vấn đề:** Viết function dùng cho nhiều types nhưng vẫn giữ type safety.

```typescript
// ❌ Dùng any — mất type safety
function identity(value: any): any {
  return value;
}
const result = identity(42);  // Type: any — mất thông tin!

// ❌ Viết nhiều overloads — lặp code
function identityNum(value: number): number { return value; }
function identityStr(value: string): string { return value; }

// ✅ Generics — 1 function, giữ type
function identity<T>(value: T): T {
  return value;
}
const num = identity(42);          // Type: number (TS tự suy ra T = number)
const str = identity('hello');     // Type: string
const arr = identity([1, 2, 3]);   // Type: number[]
```

> **`T`** là **type parameter** — placeholder cho type thực sự. Convention: `T` (Type), `K` (Key), `V` (Value), `E` (Element).

---

# 2. Generic Functions

```typescript
// Nhiều type parameters
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

pair('hello', 42);        // Type: [string, number]
pair(true, [1, 2]);       // Type: [boolean, number[]]

// Generic arrow function
const getFirst = <T>(arr: T[]): T | undefined => arr[0];

getFirst([1, 2, 3]);      // Type: number | undefined
getFirst(['a', 'b']);      // Type: string | undefined

// Trong JSX/TSX, phải thêm comma để tránh nhầm tag:
const getFirst2 = <T,>(arr: T[]): T | undefined => arr[0];
```

---

# 3. Generic Interfaces & Classes

## Generic Interface

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: Date;
}

// Sử dụng với các types khác nhau
type UserResponse = ApiResponse<User>;
type ProductResponse = ApiResponse<Product[]>;

const response: ApiResponse<string[]> = {
  data: ['item1', 'item2'],
  status: 200,
  message: 'OK',
  timestamp: new Date(),
};
```

## Generic Class

```typescript
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }
}

const numStack = new Stack<number>();
numStack.push(1);
numStack.push(2);
numStack.pop();   // Type: number | undefined

const strStack = new Stack<string>();
strStack.push('hello');
// strStack.push(42);  // ❌ Error: number is not assignable to string
```

---

# 4. Generic Constraints (`extends`)

Giới hạn type parameter phải thỏa mãn điều kiện:

```typescript
// T phải có property 'length'
function logLength<T extends { length: number }>(value: T): void {
  console.log(value.length);
}

logLength('hello');     // ✅ string có length
logLength([1, 2, 3]);  // ✅ array có length
// logLength(42);       // ❌ number không có length

// T phải là key của object
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'An', age: 25 };
getProperty(user, 'name');   // ✅ Type: string
getProperty(user, 'age');    // ✅ Type: number
// getProperty(user, 'email'); // ❌ Error: 'email' không phải key của user

// Multiple constraints
interface Serializable {
  serialize(): string;
}

interface Loggable {
  log(): void;
}

function process<T extends Serializable & Loggable>(item: T) {
  item.serialize();
  item.log();
}
```

---

# 5. `keyof` & Indexed Access Types

## `keyof` — Lấy tất cả keys thành union type

```typescript
interface User {
  name: string;
  age: number;
  email: string;
}

type UserKeys = keyof User;  // 'name' | 'age' | 'email'

function getValue(user: User, key: keyof User) {
  return user[key];
}
```

## `typeof` — Lấy type từ value

```typescript
const config = {
  host: 'localhost',
  port: 3000,
  debug: true,
};

type Config = typeof config;
// { host: string; port: number; debug: boolean }

type ConfigKeys = keyof typeof config;
// 'host' | 'port' | 'debug'
```

## Indexed Access Types — `T[K]`

```typescript
type User = {
  name: string;
  age: number;
  address: {
    city: string;
    zip: string;
  };
};

type UserName = User['name'];          // string
type UserAge = User['age'];            // number
type City = User['address']['city'];   // string
type NameOrAge = User['name' | 'age']; // string | number
```

---

# 6. Generic Defaults

```typescript
// Giá trị mặc định cho type parameter
interface Container<T = string> {
  value: T;
}

const strContainer: Container = { value: 'hello' };        // T = string (default)
const numContainer: Container<number> = { value: 42 };     // T = number

// Trong function
function createArray<T = string>(length: number, value: T): T[] {
  return Array(length).fill(value);
}

createArray(3, 'x');    // string[] (inferred)
createArray<number>(3, 0); // number[] (explicit)
```

---

# 7. Ví dụ thực tế

## API Response Wrapper

```typescript
interface ApiResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

async function fetchApi<T>(url: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url);
    const data: T = await res.json();
    return { success: true, data, error: null };
  } catch (err) {
    return { success: false, data: null, error: (err as Error).message };
  }
}

// Type-safe API calls
const users = await fetchApi<User[]>('/api/users');
if (users.success) {
  users.data?.forEach(u => console.log(u.name)); // TS biết data là User[]
}
```

## Generic Repository Pattern

```typescript
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class PrismaRepository<T extends { id: string }> implements Repository<T> {
  constructor(private model: any) {}

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } });
  }
  // ... other methods
}

// Sử dụng
const userRepo: Repository<User> = new PrismaRepository(prisma.user);
const post = await userRepo.findById('123');
```

## Type-safe Event Emitter

```typescript
type EventMap = {
  userCreated: { id: string; name: string };
  orderPlaced: { orderId: string; total: number };
  error: Error;
};

class TypedEmitter<T extends Record<string, any>> {
  private handlers = new Map<keyof T, Function[]>();

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void) {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    this.handlers.get(event)?.forEach(fn => fn(data));
  }
}

const emitter = new TypedEmitter<EventMap>();

emitter.on('userCreated', (data) => {
  console.log(data.name);  // ✅ TS biết data có { id, name }
});

emitter.emit('orderPlaced', { orderId: '123', total: 99.99 }); // ✅
// emitter.emit('userCreated', { wrong: 'data' }); // ❌ Error!
```

---

# 8. Câu hỏi phỏng vấn

## Q1: "Generics là gì? Tại sao cần?"

> **A:** Generics cho phép tạo components (functions, classes, interfaces) hoạt động với **nhiều types** mà vẫn giữ **type safety**. Không cần dùng `any` (mất type info) hay viết nhiều overloads (lặp code). Type parameter `<T>` là placeholder — TypeScript tự suy ra hoặc bạn chỉ định rõ khi dùng.

## Q2: "Generic constraints dùng khi nào?"

> **A:** Khi cần **giới hạn** type parameter phải thỏa điều kiện. Dùng `extends` — ví dụ `<T extends { length: number }>` đảm bảo T có property `length`. `<K extends keyof T>` đảm bảo K là key hợp lệ của T. Constraints giúp TypeScript **biết chắc** T có properties/methods gì → cho phép truy cập an toàn.

## Q3: "`keyof` dùng để làm gì?"

> **A:** `keyof T` tạo **union type** của tất cả keys trong T. Ví dụ `keyof { name: string; age: number }` = `'name' | 'age'`. Kết hợp với generic constraints (`K extends keyof T`) để tạo **type-safe property access** — TypeScript đảm bảo bạn chỉ truy cập keys tồn tại.

---

> 📅 Tạo ngày: 2026-02-12
> 📚 Nguồn: TypeScript Handbook, TypeScript Deep Dive
> 🎯 Mục tiêu: Thành thạo Generics — viết code linh hoạt và type-safe
