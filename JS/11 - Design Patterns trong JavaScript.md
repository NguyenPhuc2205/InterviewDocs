# 📘 JavaScript — Design Patterns trong JavaScript

> Design Patterns giúp code **dễ maintain, mở rộng, tái sử dụng**. Đây là kiến thức **mid/senior bắt buộc** — phỏng vấn luôn hỏi.

---

## Mục lục

1. [Creational Patterns](#1-creational-patterns)
2. [Structural Patterns](#2-structural-patterns)
3. [Behavioral Patterns](#3-behavioral-patterns)
4. [JS-Specific Patterns](#4-js-specific-patterns)
5. [Anti-Patterns](#5-anti-patterns)
6. [Câu hỏi phỏng vấn](#6-câu-hỏi-phỏng-vấn)

---

# 1. Creational Patterns

> Quản lý cách **tạo objects** — linh hoạt, không hardcode.

## Singleton — Chỉ 1 instance duy nhất

```javascript
// Cách 1: Module pattern (Node.js — tự nhiên singleton nhờ module cache)
// config.js
class Config {
  constructor() {
    this.settings = {};
  }
  set(key, value) { this.settings[key] = value; }
  get(key) { return this.settings[key]; }
}
module.exports = new Config(); // Mọi nơi require → cùng instance

// Cách 2: Class-based singleton
class Database {
  static #instance = null;

  constructor(connectionString) {
    if (Database.#instance) {
      return Database.#instance;
    }
    this.connection = connectionString;
    Database.#instance = this;
  }

  static getInstance(connectionString) {
    if (!Database.#instance) {
      Database.#instance = new Database(connectionString);
    }
    return Database.#instance;
  }
}

const db1 = Database.getInstance('postgres://localhost');
const db2 = Database.getInstance('mysql://remote');
console.log(db1 === db2);         // true
console.log(db2.connection);      // 'postgres://localhost' — lần 2 bị bỏ qua
```

## Factory — Tạo object không cần biết class cụ thể

```javascript
class Car {
  constructor(type) {
    this.type = type;
    this.wheels = 4;
  }
  describe() { return `${this.type} with ${this.wheels} wheels`; }
}

class Bike {
  constructor(type) {
    this.type = type;
    this.wheels = 2;
  }
  describe() { return `${this.type} with ${this.wheels} wheels`; }
}

// Factory function
function createVehicle(type) {
  switch (type) {
    case 'car':  return new Car(type);
    case 'bike': return new Bike(type);
    default:     throw new Error(`Unknown vehicle type: ${type}`);
  }
}

const v1 = createVehicle('car');
const v2 = createVehicle('bike');
console.log(v1.describe()); // 'car with 4 wheels'
console.log(v2.describe()); // 'bike with 2 wheels'
```

## Builder — Xây dựng object phức tạp step-by-step

```javascript
class QueryBuilder {
  #table = '';
  #conditions = [];
  #columns = ['*'];
  #orderBy = '';
  #limit = null;

  from(table) {
    this.#table = table;
    return this; // Chainable
  }

  select(...columns) {
    this.#columns = columns;
    return this;
  }

  where(condition) {
    this.#conditions.push(condition);
    return this;
  }

  order(column, direction = 'ASC') {
    this.#orderBy = `${column} ${direction}`;
    return this;
  }

  take(n) {
    this.#limit = n;
    return this;
  }

  build() {
    let query = `SELECT ${this.#columns.join(', ')} FROM ${this.#table}`;
    if (this.#conditions.length) {
      query += ` WHERE ${this.#conditions.join(' AND ')}`;
    }
    if (this.#orderBy) query += ` ORDER BY ${this.#orderBy}`;
    if (this.#limit) query += ` LIMIT ${this.#limit}`;
    return query;
  }
}

const query = new QueryBuilder()
  .from('users')
  .select('name', 'email')
  .where('age > 18')
  .where('active = true')
  .order('name')
  .take(10)
  .build();

console.log(query);
// SELECT name, email FROM users WHERE age > 18 AND active = true ORDER BY name ASC LIMIT 10
```

## Module / Revealing Module Pattern

```javascript
// Module Pattern — IIFE tạo private scope
const CounterModule = (function() {
  // Private
  let count = 0;

  function validate(n) {
    return typeof n === 'number' && n > 0;
  }

  // Public API (Revealing Module)
  return {
    increment() { count++; return count; },
    decrement() { count--; return count; },
    getCount()  { return count; },
    incrementBy(n) {
      if (!validate(n)) throw new Error('Invalid number');
      count += n;
      return count;
    },
  };
})();

CounterModule.increment();      // 1
CounterModule.incrementBy(5);   // 6
// CounterModule.count          → undefined (private!)
// CounterModule.validate(3)    → TypeError (private!)
```

---

# 2. Structural Patterns

> Quản lý **quan hệ giữa objects** — kết nối, bọc, đơn giản hóa.

## Decorator — Thêm chức năng mà không sửa code gốc

```javascript
// Function decorator
function withLogging(fn) {
  return function(...args) {
    console.log(`Calling ${fn.name} with:`, args);
    const result = fn(...args);
    console.log(`Result:`, result);
    return result;
  };
}

function add(a, b) { return a + b; }

const loggedAdd = withLogging(add);
loggedAdd(2, 3);
// Calling add with: [2, 3]
// Result: 5

// Class method decorator (TC39 Stage 3)
function readonly(target, name, descriptor) {
  descriptor.writable = false;
  return descriptor;
}

// Decorator pattern cho objects
function withTimestamp(obj) {
  return {
    ...obj,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const user = withTimestamp({ name: 'Alice', age: 25 });
// { name: 'Alice', age: 25, createdAt: ..., updatedAt: ... }
```

## Adapter — Biến interface cũ thành interface mới

```javascript
// Legacy API trả về XML-like object
class OldAPI {
  getXMLData() {
    return {
      data: '<user><name>Alice</name><age>25</age></user>',
      format: 'xml',
    };
  }
}

// App mới cần JSON
class APIAdapter {
  constructor(oldAPI) {
    this.oldAPI = oldAPI;
  }

  getJSON() {
    const { data } = this.oldAPI.getXMLData();
    // Parse XML → JSON (simplified)
    return {
      name: data.match(/<name>(.*?)<\/name>/)[1],
      age: Number(data.match(/<age>(.*?)<\/age>/)[1]),
    };
  }
}

const adapter = new APIAdapter(new OldAPI());
console.log(adapter.getJSON()); // { name: 'Alice', age: 25 }
```

## Facade — Đơn giản hóa interface phức tạp

```javascript
// Subsystems phức tạp
class AuthService {
  authenticate(token) { return { userId: 1, role: 'admin' }; }
}
class UserService {
  getProfile(userId) { return { name: 'Alice', email: 'alice@example.com' }; }
}
class LogService {
  log(action, userId) { console.log(`[LOG] ${action} by user ${userId}`); }
}

// Facade — 1 method đơn giản thay vì 3 service calls
class AppFacade {
  constructor() {
    this.auth = new AuthService();
    this.user = new UserService();
    this.logger = new LogService();
  }

  getUserDashboard(token) {
    const { userId } = this.auth.authenticate(token);
    const profile = this.user.getProfile(userId);
    this.logger.log('dashboard_view', userId);
    return { ...profile, lastLogin: new Date() };
  }
}

const app = new AppFacade();
const dashboard = app.getUserDashboard('jwt-token');
// Chỉ 1 call thay vì 3 calls riêng lẻ
```

## Proxy Pattern

```javascript
// Proxy cho validation + logging
const userValidator = {
  set(target, prop, value) {
    if (prop === 'age' && (typeof value !== 'number' || value < 0)) {
      throw new TypeError('Age must be a positive number');
    }
    if (prop === 'email' && !value.includes('@')) {
      throw new TypeError('Invalid email');
    }
    console.log(`Setting ${prop} = ${value}`);
    target[prop] = value;
    return true;
  },

  get(target, prop) {
    if (prop in target) return target[prop];
    console.warn(`Property "${prop}" does not exist`);
    return undefined;
  },
};

const user = new Proxy({}, userValidator);
user.name = 'Alice';    // Setting name = Alice
user.age = 25;          // Setting age = 25
// user.age = -5;       // TypeError: Age must be a positive number
// user.email = 'bad';  // TypeError: Invalid email
```

---

# 3. Behavioral Patterns

> Quản lý **communication** giữa objects.

## Observer / PubSub

```javascript
// Observer — subjects quản lý subscribers trực tiếp
class EventBus {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.#listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.#listeners.get(event)?.forEach(cb => cb(data));
  }
}

const bus = new EventBus();

const unsub = bus.on('user:login', (user) => {
  console.log(`Welcome, ${user.name}!`);
});

bus.emit('user:login', { name: 'Alice' }); // Welcome, Alice!
unsub(); // Unsubscribe
bus.emit('user:login', { name: 'Bob' });   // (nothing — đã unsub)
```

## Strategy — Đổi algorithm runtime

```javascript
// Strategy pattern cho payment processing
const paymentStrategies = {
  creditCard: (amount) => {
    console.log(`Paid ${amount} via Credit Card (2.5% fee)`);
    return amount * 1.025;
  },
  paypal: (amount) => {
    console.log(`Paid ${amount} via PayPal (1.5% fee)`);
    return amount * 1.015;
  },
  crypto: (amount) => {
    console.log(`Paid ${amount} via Crypto (0.5% fee)`);
    return amount * 1.005;
  },
};

class PaymentProcessor {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  pay(amount) {
    return this.strategy(amount);
  }
}

const processor = new PaymentProcessor(paymentStrategies.creditCard);
processor.pay(100); // Paid 100 via Credit Card (2.5% fee)

processor.setStrategy(paymentStrategies.crypto);
processor.pay(100); // Paid 100 via Crypto (0.5% fee)
```

## Command — Encapsulate action + hỗ trợ undo

```javascript
class CommandManager {
  #history = [];
  #redoStack = [];

  execute(command) {
    command.execute();
    this.#history.push(command);
    this.#redoStack = []; // Clear redo sau khi execute mới
  }

  undo() {
    const command = this.#history.pop();
    if (command) {
      command.undo();
      this.#redoStack.push(command);
    }
  }

  redo() {
    const command = this.#redoStack.pop();
    if (command) {
      command.execute();
      this.#history.push(command);
    }
  }
}

// Concrete commands
class AddTextCommand {
  constructor(editor, text) {
    this.editor = editor;
    this.text = text;
  }
  execute() { this.editor.content += this.text; }
  undo()    { this.editor.content = this.editor.content.slice(0, -this.text.length); }
}

const editor = { content: '' };
const manager = new CommandManager();

manager.execute(new AddTextCommand(editor, 'Hello'));
manager.execute(new AddTextCommand(editor, ' World'));
console.log(editor.content); // 'Hello World'

manager.undo();
console.log(editor.content); // 'Hello'

manager.redo();
console.log(editor.content); // 'Hello World'
```

## Iterator

```javascript
// Custom iterable
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }

  [Symbol.iterator]() {
    let current = this.start;
    const { end, step } = this;

    return {
      next() {
        if (current <= end) {
          const value = current;
          current += step;
          return { value, done: false };
        }
        return { done: true };
      },
    };
  }
}

// Sử dụng với for...of, spread, destructuring
for (const n of new Range(1, 10, 2)) {
  console.log(n); // 1, 3, 5, 7, 9
}

const nums = [...new Range(1, 5)]; // [1, 2, 3, 4, 5]
```

## Mediator — Trung gian giảm coupling

```javascript
class ChatRoom {
  #users = new Map();

  join(user) {
    this.#users.set(user.name, user);
    user.chatRoom = this;
    this.broadcast(`${user.name} joined the room`, user);
  }

  send(message, from, to) {
    if (to) {
      // Direct message
      this.#users.get(to)?.receive(message, from.name);
    } else {
      // Broadcast
      this.broadcast(message, from);
    }
  }

  broadcast(message, sender) {
    this.#users.forEach((user, name) => {
      if (name !== sender?.name) {
        user.receive(message, sender?.name || 'System');
      }
    });
  }
}

class User {
  constructor(name) { this.name = name; }
  send(message, to) { this.chatRoom.send(message, this, to); }
  receive(message, from) { console.log(`[${this.name}] ${from}: ${message}`); }
}

const room = new ChatRoom();
const alice = new User('Alice');
const bob = new User('Bob');

room.join(alice);  // Bob nhận: System: Alice joined the room
room.join(bob);    // Alice nhận: System: Bob joined the room
alice.send('Hi!'); // Bob nhận: [Bob] Alice: Hi!
```

---

# 4. JS-Specific Patterns

## Mixin — "Trộn" behavior vào class

```javascript
// Mixin functions
const Serializable = (Base) => class extends Base {
  toJSON() {
    return JSON.stringify(this);
  }
  static fromJSON(json) {
    return Object.assign(new this(), JSON.parse(json));
  }
};

const Validatable = (Base) => class extends Base {
  validate() {
    for (const [key, rules] of Object.entries(this.constructor.rules || {})) {
      if (rules.required && !this[key]) {
        throw new Error(`${key} is required`);
      }
    }
    return true;
  }
};

// Compose mixins
class User extends Serializable(Validatable(class {})) {
  static rules = { name: { required: true }, email: { required: true } };

  constructor(name, email) {
    super();
    this.name = name;
    this.email = email;
  }
}

const user = new User('Alice', 'alice@example.com');
user.validate();           // true
console.log(user.toJSON()); // {"name":"Alice","email":"alice@example.com"}
```

## Middleware Pattern (Express/NestJS style)

```javascript
class Pipeline {
  #middlewares = [];

  use(middleware) {
    this.#middlewares.push(middleware);
    return this;
  }

  async execute(context) {
    let index = 0;

    const next = async () => {
      if (index < this.#middlewares.length) {
        const middleware = this.#middlewares[index++];
        await middleware(context, next);
      }
    };

    await next();
    return context;
  }
}

// Sử dụng:
const pipeline = new Pipeline();

pipeline.use(async (ctx, next) => {
  ctx.startTime = Date.now();
  console.log('→ Logger start');
  await next();
  console.log(`← Logger end (${Date.now() - ctx.startTime}ms)`);
});

pipeline.use(async (ctx, next) => {
  if (!ctx.user) throw new Error('Unauthorized');
  console.log('→ Auth passed');
  await next();
});

pipeline.use(async (ctx, next) => {
  ctx.result = 'Hello, ' + ctx.user;
  console.log('→ Handler');
  await next();
});

await pipeline.execute({ user: 'Alice' });
// → Logger start
// → Auth passed
// → Handler
// ← Logger end (2ms)
```

---

# 5. Anti-Patterns

## Callback Hell

```javascript
// ❌ Pyramid of doom
getData(function(a) {
  getMoreData(a, function(b) {
    getEvenMoreData(b, function(c) {
      getYetMoreData(c, function(d) {
        // 4 levels deep...
      });
    });
  });
});

// ✅ Fix: Promise chain hoặc async/await
const result = await getData()
  .then(a => getMoreData(a))
  .then(b => getEvenMoreData(b))
  .then(c => getYetMoreData(c));
```

## God Object — Object làm quá nhiều việc

```javascript
// ❌ God object
class App {
  connectDB() { }
  authenticateUser() { }
  sendEmail() { }
  generatePDF() { }
  processPayment() { }
  // 500 methods...
}

// ✅ Single Responsibility
class AuthService { authenticateUser() { } }
class EmailService { sendEmail() { } }
class PaymentService { processPayment() { } }
```

## Tight Coupling

```javascript
// ❌ Tight coupling — UserService phụ thuộc trực tiếp MySQL
class UserService {
  constructor() {
    this.db = new MySQLDatabase(); // Hardcode dependency
  }
}

// ✅ Loose coupling — Dependency Injection
class UserService {
  constructor(database) {
    this.db = database; // Inject bất kỳ database nào
  }
}

// Dễ dàng swap:
new UserService(new MySQLDatabase());
new UserService(new PostgresDatabase());
new UserService(new MockDatabase()); // Testing
```

---

# 6. Câu hỏi phỏng vấn

### Q1: Singleton có phải anti-pattern không? Khi nào nên dùng?
**A:** Singleton **dễ bị lạm dụng** thành anti-pattern vì:
- Global state → khó test, khó parallel
- Hidden dependency → tight coupling
**Nên dùng khi:** database connection pool, config store, logger. Trong NestJS, mọi provider mặc định là singleton (quản lý bởi DI container) → best practice.

### Q2: Observer pattern khác PubSub thế nào?
**A:**
- **Observer**: Subject biết trực tiếp observers → `subject.notify()`
- **PubSub**: Có **message broker** ở giữa → publisher & subscriber không biết nhau
- PubSub loose coupling hơn, phù hợp distributed systems (Redis Pub/Sub, Kafka)

### Q3: Khi nào dùng Proxy pattern trong JavaScript?
**A:** Validation (type check khi set property), Logging/Profiling (track access), Lazy initialization (load data khi access lần đầu), Access control (restrict certain properties), Caching (cache expensive gets), Vue.js reactivity system (dùng Proxy để track dependencies).

### Q4: So sánh Decorator pattern trong JS vs NestJS
**A:**
- **JS**: Function wrapping (`withLogging(fn)`) hoặc TC39 decorators (`@decorator`)
- **NestJS**: Dùng `reflect-metadata` + TypeScript decorators để inject metadata — `@Controller()`, `@Injectable()`, `@Get()` → framework đọc metadata để wire up DI, routing, middleware
- Bản chất giống nhau: **thêm behavior mà không sửa code gốc**
