# 📘 TypeScript — Decorators & Metadata

> Decorators là **trái tim** của NestJS, Angular, TypeORM. Hiểu decorators = hiểu framework architecture.

---

## Mục lục

1. [Decorator là gì?](#1-decorator-là-gì)
2. [5 loại Decorators](#2-5-loại-decorators)
3. [Decorator Factories](#3-decorator-factories)
4. [Reflect Metadata](#4-reflect-metadata)
5. [Thứ tự thực thi](#5-thứ-tự-thực-thi)
6. [Real-world: NestJS Decorators](#6-nestjs-decorators)
7. [Câu hỏi phỏng vấn](#7-câu-hỏi-phỏng-vấn)

---

# 1. Decorator là gì?

> **Decorator** = một **function** được gắn vào class, method, property, hoặc parameter để **thêm metadata hoặc thay đổi hành vi** — mà **không sửa code gốc**.

```typescript
// Cần bật trong tsconfig.json:
// "experimentalDecorators": true
// "emitDecoratorMetadata": true

// Decorator đơn giản nhất
function Log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${key} with`, args);
    const result = original.apply(this, args);
    console.log(`${key} returned`, result);
    return result;
  };
}

class Calculator {
  @Log
  add(a: number, b: number): number {
    return a + b;
  }
}

const calc = new Calculator();
calc.add(1, 2);
// Calling add with [1, 2]
// add returned 3
```

> **Bản chất:** Decorator là **higher-order function** áp dụng pattern **Aspect-Oriented Programming (AOP)** — tách cross-cutting concerns (logging, validation, auth...) ra khỏi business logic.

---

# 2. 5 Loại Decorators

## 2.1 Class Decorator

```typescript
function Controller(path: string) {
  return function(target: Function) {
    // target = class constructor
    Reflect.defineMetadata('path', path, target);
  };
}

@Controller('/users')
class UserController {
  // Decorator gắn metadata 'path' = '/users' vào class
}
```

## 2.2 Method Decorator

```typescript
function Cacheable(ttl: number) {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    // target: prototype (instance method) hoặc constructor (static method)
    // key: tên method
    // descriptor: PropertyDescriptor (value, writable, enumerable, configurable)
    
    const cache = new Map();
    const original = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      const cacheKey = JSON.stringify(args);
      if (cache.has(cacheKey)) return cache.get(cacheKey);
      
      const result = original.apply(this, args);
      cache.set(cacheKey, result);
      setTimeout(() => cache.delete(cacheKey), ttl);
      return result;
    };
  };
}

class UserService {
  @Cacheable(60_000) // Cache 60 giây
  findById(id: string) {
    return db.query(`SELECT * FROM users WHERE id = ?`, [id]);
  }
}
```

## 2.3 Property Decorator

```typescript
function MinLength(min: number) {
  return function(target: any, key: string) {
    let value: string;

    Object.defineProperty(target, key, {
      get: () => value,
      set: (newVal: string) => {
        if (newVal.length < min) {
          throw new Error(`${key} must be at least ${min} characters`);
        }
        value = newVal;
      }
    });
  };
}

class User {
  @MinLength(3)
  name: string = '';
}

const user = new User();
user.name = 'An';      // ❌ Error: name must be at least 3 characters
user.name = 'Andrew';  // ✅ OK
```

## 2.4 Parameter Decorator

```typescript
function Required(target: any, key: string, paramIndex: number) {
  // Gắn metadata: param ở index này là required
  const existingRequired: number[] = 
    Reflect.getOwnMetadata('required', target, key) || [];
  existingRequired.push(paramIndex);
  Reflect.defineMetadata('required', existingRequired, target, key);
}

class UserService {
  greet(@Required name: string, greeting?: string) {
    return `${greeting || 'Hi'}, ${name}!`;
  }
}
```

## 2.5 Accessor Decorator

```typescript
function Readonly(target: any, key: string, descriptor: PropertyDescriptor) {
  descriptor.set = undefined;  // Xóa setter
}

class Config {
  private _host = 'localhost';

  @Readonly
  get host() {
    return this._host;
  }
  set host(value: string) {
    this._host = value;
  }
}
```

---

# 3. Decorator Factories

**Decorator Factory** = function trả về decorator. Cho phép truyền **tham số cấu hình**.

```typescript
// Không factory — không có tham số
function Sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
}

@Sealed
class Foo {}

// Có factory — có tham số
function Entity(tableName: string) {
  return function(constructor: Function) {
    Reflect.defineMetadata('tableName', tableName, constructor);
  };
}

@Entity('users')
class User {}

// NestJS ví dụ:
// @Controller('/users')   → Controller là factory, '/users' là param
// @Get(':id')             → Get là factory, ':id' là param
// @Injectable()           → Injectable là factory, không có param nhưng vẫn cần ()
```

---

# 4. Reflect Metadata

**`reflect-metadata`** = thư viện cho phép **đọc/ghi metadata** lên classes, methods, properties.

```typescript
import 'reflect-metadata';

// Ghi metadata
Reflect.defineMetadata('role', 'admin', target, propertyKey);

// Đọc metadata
const role = Reflect.getMetadata('role', target, propertyKey);

// TypeScript tự động ghi 3 loại metadata khi bật emitDecoratorMetadata:
// 'design:type'           — type của property
// 'design:paramtypes'     — types của params
// 'design:returntype'     — return type

function Inject(target: any, key: string) {
  const type = Reflect.getMetadata('design:type', target, key);
  console.log(`${key} has type: ${type.name}`);
}

class UserService {
  @Inject
  repository: UserRepository;  // Log: 'repository has type: UserRepository'
}
```

**NestJS Dependency Injection** dùng chính cơ chế này:

```typescript
// 1. @Injectable() đánh dấu class có thể inject
// 2. TypeScript emit 'design:paramtypes' metadata
// 3. NestJS IoC container đọc metadata → tự resolve dependencies

@Injectable()
class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly mailService: MailService,
  ) {}
  // NestJS đọc: paramtypes = [UserRepository, MailService]
  // → Tự tìm và inject instances
}
```

---

# 5. Thứ tự thực thi Decorators

```typescript
function d(name: string) {
  console.log(`evaluate ${name}`);
  return function() {
    console.log(`execute ${name}`);
  };
}

@d('class')
class Example {
  @d('static-prop')
  static staticProp: string = '';

  @d('instance-prop')
  instanceProp: string = '';

  @d('static-method')
  static staticMethod() {}

  @d('instance-method')
  instanceMethod(@d('param') arg: string) {}

  constructor(@d('constructor-param') name: string) {}
}
```

**Thứ tự evaluate (đánh giá expressions):** Trên xuống dưới, trái qua phải.

**Thứ tự execute (thực thi decorators):**
1. **Parameter** decorators (trước method)
2. **Method / Accessor / Property** decorators — từ dưới lên
3. **Static** members trước instance members
4. **Class** decorator cuối cùng

> **Nhiều decorators trên cùng target:** Evaluate trên → dưới, Execute dưới → lên (giống function composition).

```typescript
@d1
@d2
method() {}
// Evaluate: d1 → d2
// Execute: d2 → d1
// Tương đương: d1(d2(method))
```

---

# 6. Real-world: NestJS Decorators

```typescript
// Controller decorator gắn route prefix
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Method decorators định nghĩa HTTP routes
  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.userService.create(dto);
  }

  // Custom decorator
  @UseGuards(AuthGuard)       // Gắn guard
  @Roles('admin')             // Gắn metadata
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}

// Tạo custom decorator
function Roles(...roles: string[]) {
  return SetMetadata('roles', roles);
}

// Guard đọc metadata
@Injectable()
class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return roles.some(role => user.roles?.includes(role));
  }
}
```

---

# 7. Câu hỏi phỏng vấn

## Q1: "Decorator là gì? Hoạt động thế nào?"

> **A:** Decorator là **function đặc biệt** gắn vào class/method/property/parameter để thêm metadata hoặc thay đổi hành vi mà không sửa code gốc. Bản chất là **higher-order function** áp dụng pattern AOP. TypeScript cần bật `experimentalDecorators`. Decorator factory cho phép truyền tham số cấu hình (ví dụ `@Controller('/users')`).

## Q2: "NestJS dùng decorators thế nào?"

> **A:** NestJS dùng decorators cho **Dependency Injection** (IoC) và **routing**. `@Injectable()` đánh dấu class có thể inject. TypeScript emit `design:paramtypes` metadata — NestJS IoC container đọc metadata này để tự động resolve và inject dependencies. `@Controller()`, `@Get()`, `@Post()` gắn route metadata. `@UseGuards()`, `@Roles()` gắn metadata cho authorization middleware.

## Q3: "Có mấy loại decorator?"

> **A:** 5 loại: **Class** (nhận constructor), **Method** (nhận target, key, descriptor), **Property** (nhận target, key), **Parameter** (nhận target, key, paramIndex), **Accessor** (get/set — nhận target, key, descriptor). Thứ tự thực thi: parameter → method/property → class. Nhiều decorators cùng target: evaluate trên→dưới, execute dưới→lên.

---

> 📅 Tạo ngày: 2026-02-12
> 📚 Nguồn: TypeScript Handbook, NestJS Docs, reflect-metadata
> 🎯 Mục tiêu: Hiểu decorators — key pattern của NestJS/Angular
