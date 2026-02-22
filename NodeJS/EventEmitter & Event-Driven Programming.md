# EventEmitter & Lập Trình Hướng Sự Kiện trong Node.js

> **Kiến thức core** — EventEmitter là nền tảng mà hầu hết module cốt lõi của Node.js (HTTP, Streams, FS) được xây dựng trên đó. Hiểu sâu cơ chế này = hiểu cách Node.js hoạt động bên trong.

---

## Mục lục

1. [Lập trình hướng sự kiện là gì?](#1-lập-trình-hướng-sự-kiện-là-gì)
2. [EventEmitter — Cơ chế bên trong](#2-eventemitter--cơ-chế-bên-trong)
3. [API đầy đủ](#3-api-đầy-đủ)
4. [Pattern: Kế thừa EventEmitter](#4-pattern-kế-thừa-eventemitter)
5. [Các module core dùng EventEmitter](#5-các-module-core-dùng-eventemitter)
6. [Observer Pattern — Nền tảng lý thuyết](#6-observer-pattern--nền-tảng-lý-thuyết)
7. [Event-Driven Architecture trong thực tế](#7-event-driven-architecture-trong-thực-tế)
8. [EventEmitter vs Callbacks vs Promises](#8-eventemitter-vs-callbacks-vs-promises)
9. [Gotchas & Best Practices](#9-gotchas--best-practices)
10. [Câu hỏi phỏng vấn](#10-câu-hỏi-phỏng-vấn)

---

# 1. Lập trình hướng sự kiện là gì?

## Hai mô hình lập trình

```
Imperative (Tuần tự):
  Dòng 1 → Dòng 2 → Dòng 3 → ... → Kết thúc
  Luồng chương trình cố định, quyết định trước

Event-Driven (Hướng sự kiện):
  Chương trình NGỒI CHỜ → Sự kiện xảy ra → Phản hồi → Tiếp tục chờ
  Luồng chương trình quyết định bởi SỰ KIỆN bên ngoài
```

## 3 thành phần cốt lõi

```
  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
  │   Emitter    │ ──────► │    Event     │ ──────► │  Listener   │
  │  (Nguồn)     │  emit   │  (Sự kiện)  │ trigger │ (Phản hồi)  │
  └─────────────┘         └─────────────┘         └─────────────┘

  1. EMITTER — Phát tín hiệu khi sự kiện xảy ra
     ví dụ: server phát "request" khi client gọi

  2. EVENT — Tên sự kiện (string)
     ví dụ: "request", "data", "error", "close"

  3. LISTENER — Hàm callback được gọi khi event xảy ra
     ví dụ: function(req, res) { ... }
```

## Tại sao Node.js chọn Event-Driven?

```
Request-Response truyền thống (PHP, Java servlet):
──────────────────────────────────────────────────
  Mỗi request → Tạo thread mới → Xử lý → Trả response → Hủy thread
  → 10,000 requests = 10,000 threads = 💥 ngốn RAM

Node.js Event-Driven:
──────────────────────────────────────────────────
  Event Loop lắng nghe:
    "Có request mới" → gọi handler → handler gửi query DB (async)
    → KHÔNG CHỜ! → "Có request mới" → gọi handler → ...
    → "DB trả kết quả" → gọi callback → trả response
    → 10,000 requests = 1 thread + event queue = ✅ OK

  Hiệu quả vì: Hầu hết thời gian xử lý request là CHỜ I/O
  Thay vì 1 thread ngồi chờ → Event-Driven dùng 1 thread làm nhiều việc
```

---

# 2. EventEmitter — Cơ chế bên trong

## EventEmitter là gì?

`EventEmitter` là một **class** trong module `events` (core module), implement **Observer Pattern**. Bên trong nó rất đơn giản: chỉ là **1 object chứa danh sách các listeners**, map theo tên event.

## Cấu trúc bên trong (simplified)

```javascript
// Đây là cách EventEmitter hoạt động BÊN TRONG (simplified)
class SimpleEventEmitter {
  constructor() {
    // Bản chất: 1 object, key = event name, value = array of functions
    this._events = {};
    //
    // Ví dụ sau khi đăng ký listeners:
    // this._events = {
    //   'data':    [fn1, fn2],
    //   'error':   [fn3],
    //   'close':   [fn4, fn5, fn6],
    // }
  }

  on(event, listener) {
    // Thêm listener vào mảng
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this;  // Cho phép chaining
  }

  emit(event, ...args) {
    const listeners = this._events[event];
    if (!listeners || listeners.length === 0) return false;

    // Gọi TẤT CẢ listeners theo thứ tự đăng ký — ĐỒNG BỘ!
    for (const listener of listeners) {
      listener.apply(this, args);
    }
    return true;
  }

  removeListener(event, listener) {
    const listeners = this._events[event];
    if (!listeners) return this;

    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    return this;
  }
}
```

## ⚠️ Điểm quan trọng: `.emit()` là ĐỒNG BỘ (Synchronous)

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('test', () => {
  console.log('A — listener chạy');
});

console.log('1 — trước emit');
emitter.emit('test');                // Listeners chạy NGAY TẠI ĐÂY
console.log('2 — sau emit');

// Output:
// 1 — trước emit
// A — listener chạy     ← chạy ĐỒNG BỘ, không phải microtask/macrotask
// 2 — sau emit

// → emit() BLOCK cho đến khi TẤT CẢ listeners chạy xong
// → Hoàn toàn khác với DOM events trong browser (có thể async)
```

> ⚠️ **Cực kỳ quan trọng**: Nhiều người tưởng `.emit()` là async — **KHÔNG PHẢI**. `.emit()` gọi tất cả listeners **đồng bộ**, theo thứ tự đăng ký, block cho đến khi tất cả chạy xong. Nếu 1 listener chạy lâu → toàn bộ chương trình bị block!

---

# 3. API đầy đủ

## Khởi tạo

```javascript
const EventEmitter = require('events');

// Cách 1: Tạo instance trực tiếp
const emitter = new EventEmitter();

// Cách 2: Kế thừa (pattern phổ biến — xem Section 4)
class MyService extends EventEmitter {
  constructor() {
    super();
  }
}
```

## Các methods quan trọng

| Method | Mô tả | Ghi chú |
|---|---|---|
| `.on(event, fn)` | Đăng ký listener | Alias: `.addListener()` |
| `.once(event, fn)` | Đăng ký listener chạy **1 lần rồi tự hủy** | Wrapper internal |
| `.emit(event, ...args)` | Phát sự kiện → gọi tất cả listeners | **Đồng bộ!** Return `true/false` |
| `.removeListener(event, fn)` | Xóa 1 listener cụ thể | Alias: `.off()` |
| `.removeAllListeners([event])` | Xóa tất cả listeners (của 1 event hoặc all) | Cẩn thận! |
| `.listeners(event)` | Trả về array copy các listeners | |
| `.listenerCount(event)` | Đếm số listeners | |
| `.prependListener(event, fn)` | Thêm listener vào **đầu** mảng (chạy trước) | Thay vì cuối |
| `.prependOnceListener(event, fn)` | Giống `.once()` nhưng thêm vào đầu | |
| `.eventNames()` | Trả về array tên events đã đăng ký | |
| `.setMaxListeners(n)` | Đặt giới hạn số listeners (default: 10) | Tránh memory leak warning |

## Ví dụ chi tiết từng method

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// ──────────────────────────────────
// 1. on() — Đăng ký listener
// ──────────────────────────────────
emitter.on('message', (text) => {
  console.log('Listener 1:', text);
});

emitter.on('message', (text) => {
  console.log('Listener 2:', text);
});

emitter.emit('message', 'Hello!');
// Listener 1: Hello!
// Listener 2: Hello!   ← chạy THEO THỨ TỰ đăng ký


// ──────────────────────────────────
// 2. once() — Chỉ chạy 1 lần
// ──────────────────────────────────
emitter.once('init', () => {
  console.log('Khởi tạo! (chỉ 1 lần)');
});

emitter.emit('init');  // Khởi tạo! (chỉ 1 lần)
emitter.emit('init');  // Không có gì xảy ra — listener đã bị xóa


// ──────────────────────────────────
// 3. prependListener() — Thêm vào đầu
// ──────────────────────────────────
emitter.on('login', () => console.log('B — đăng ký trước'));
emitter.prependListener('login', () => console.log('A — nhưng chạy trước!'));

emitter.emit('login');
// A — nhưng chạy trước!   ← prepend
// B — đăng ký trước


// ──────────────────────────────────
// 4. removeListener() / off() — Xóa listener
// ──────────────────────────────────
function handler(data) {
  console.log('Received:', data);
}

emitter.on('data', handler);
emitter.emit('data', 'test');   // Received: test

emitter.off('data', handler);   // Xóa listener
emitter.emit('data', 'test2');  // Không có gì — đã xóa

// ⚠️ Arrow functions không remove được! Vì không có reference:
emitter.on('data', (x) => console.log(x));
// emitter.off('data', ???);  ← Không có reference → không xóa được!
// → Nếu cần remove → PHẢI dùng named function


// ──────────────────────────────────
// 5. Truyền nhiều arguments
// ──────────────────────────────────
emitter.on('order', (orderId, total, customer) => {
  console.log(`Order ${orderId}: ${total}đ cho ${customer}`);
});

emitter.emit('order', 'ORD-001', 500000, 'Hùng');
// Order ORD-001: 500000đ cho Hùng
```

## Special Event: `error`

```javascript
// Event "error" là ĐẶC BIỆT trong Node.js:
// Nếu emit "error" mà KHÔNG CÓ listener → Node.js THROW exception → crash!

const emitter = new EventEmitter();

// ❌ KHÔNG CÓ error listener → CRASH
emitter.emit('error', new Error('Boom!'));
// → Uncaught Error: Boom!  → process.exit(1)

// ✅ CÓ error listener → Xử lý gracefully
emitter.on('error', (err) => {
  console.error('Caught error:', err.message);
});
emitter.emit('error', new Error('Boom!'));
// → Caught error: Boom!  → Không crash

// → BẮT BUỘC phải có error listener nếu emitter có thể emit 'error'!
```

## Special Event: `newListener` & `removeListener`

```javascript
// EventEmitter tự emit 2 events đặc biệt:
// "newListener"     — trước khi thêm listener mới
// "removeListener"  — sau khi xóa listener

emitter.on('newListener', (eventName, listener) => {
  console.log(`Listener mới được thêm cho event: "${eventName}"`);
});

emitter.on('data', () => {});
// → Listener mới được thêm cho event: "data"

// Use case: logging, monitoring listener registration
```

---

# 4. Pattern: Kế thừa EventEmitter

## Tại sao kế thừa?

Trong Node.js, pattern phổ biến nhất là **class kế thừa EventEmitter** — biến class của bạn thành event emitter, thay vì dùng emitter instance riêng.

```javascript
const EventEmitter = require('events');

// ──────────────────────────────────────────
// Pattern: Business logic class extends EventEmitter
// ──────────────────────────────────────────
class OrderService extends EventEmitter {
  constructor() {
    super(); // Gọi constructor của EventEmitter
  }

  async placeOrder(order) {
    // 1. Validate
    if (!order.items || order.items.length === 0) {
      this.emit('error', new Error('Order must have items'));
      return;
    }

    // 2. Save to DB (giả lập)
    const savedOrder = { ...order, id: `ORD-${Date.now()}`, status: 'placed' };

    // 3. Phát sự kiện — KHÔNG CẦN BIẾT ai sẽ lắng nghe!
    this.emit('orderPlaced', savedOrder);

    return savedOrder;
  }

  async cancelOrder(orderId) {
    this.emit('orderCancelled', { orderId, cancelledAt: new Date() });
  }
}

// ──────────────────────────────────────────
// Sử dụng: Các module khác LẮNG NGHE mà không cần biết nhau
// ──────────────────────────────────────────
const orderService = new OrderService();

// Module Kho — Cập nhật tồn kho
orderService.on('orderPlaced', (order) => {
  console.log(`[Kho] Trừ tồn kho cho đơn #${order.id}`);
  // updateInventory(order.items);
});

// Module Email — Gửi xác nhận
orderService.on('orderPlaced', (order) => {
  console.log(`[Email] Gửi email xác nhận đơn #${order.id}`);
  // sendEmail(order.customer, 'Order Confirmation', ...);
});

// Module Analytics — Track metrics
orderService.on('orderPlaced', (order) => {
  console.log(`[Analytics] Ghi nhận đơn hàng #${order.id}`);
  // trackEvent('order_placed', { orderId: order.id });
});

// Module Notification — Push notification
orderService.on('orderCancelled', ({ orderId }) => {
  console.log(`[Notification] Đơn ${orderId} đã bị hủy`);
});

// Error handler — BẮT BUỘC
orderService.on('error', (err) => {
  console.error('[OrderService Error]', err.message);
});

// ──────────────────────────────────────────
// Thực thi
// ──────────────────────────────────────────
orderService.placeOrder({ items: ['Laptop', 'Mouse'], customer: 'Hùng' });
/*
  [Kho] Trừ tồn kho cho đơn #ORD-1708561234567
  [Email] Gửi email xác nhận đơn #ORD-1708561234567
  [Analytics] Ghi nhận đơn hàng #ORD-1708561234567
*/
```

## Lợi ích so với gọi trực tiếp

```
❌ KHÔNG dùng events — Coupled (gắn chặt):
──────────────────────────────────────────
  class OrderService {
    placeOrder(order) {
      // OrderService PHẢI BIẾT tất cả dependencies
      inventoryService.update(order);      ← import InventoryService
      emailService.send(order);            ← import EmailService
      analyticsService.track(order);       ← import AnalyticsService
      notificationService.push(order);     ← import NotificationService
    }
  }
  → Thêm module mới = SỬA CODE OrderService
  → Test khó (phải mock tất cả dependencies)


✅ Dùng events — Decoupled (lỏng lẻo):
──────────────────────────────────────────
  class OrderService extends EventEmitter {
    placeOrder(order) {
      // OrderService KHÔNG BIẾT ai đang lắng nghe
      this.emit('orderPlaced', order);     ← Chỉ phát tín hiệu!
    }
  }
  → Thêm module mới = THÊM LISTENER (không sửa OrderService)
  → Test dễ (chỉ test emit, không cần mock)
  → Open/Closed Principle: open for extension, closed for modification
```

---

# 5. Các module core dùng EventEmitter

Hầu hết module quan trọng trong Node.js **kế thừa EventEmitter**:

## HTTP Server

```javascript
const http = require('http');

// http.Server extends EventEmitter
const server = http.createServer();

server.on('request', (req, res) => {       // Event: request
  res.end('Hello');
});
server.on('connection', (socket) => {      // Event: connection
  console.log('New TCP connection');
});
server.on('close', () => {                 // Event: close
  console.log('Server closed');
});
server.on('error', (err) => {              // Event: error
  console.error('Server error:', err);
});

server.listen(3000, () => {                // Event: listening
  console.log('Server on port 3000');
});

// Bên trong, khi client gọi API:
// 1. OS nhận TCP connection → libuv thông báo
// 2. Node.js parse HTTP request
// 3. server.emit('request', req, res)  ← EventEmitter!
// 4. Listener xử lý → res.end()
```

## Streams

```javascript
const fs = require('fs');

// ReadStream kế thừa EventEmitter
const readable = fs.createReadStream('big-file.txt');

readable.on('data', (chunk) => {           // Mỗi chunk data
  console.log(`Received ${chunk.length} bytes`);
});
readable.on('end', () => {                 // Hết data
  console.log('Done reading');
});
readable.on('error', (err) => {            // Lỗi
  console.error('Read error:', err);
});
readable.on('open', (fd) => {              // File descriptor opened
  console.log('File opened');
});

// Bên trong, libuv đọc file theo chunks:
// 1. Đọc 64KB → readable.emit('data', chunk)
// 2. Đọc 64KB tiếp → readable.emit('data', chunk)
// 3. Hết file → readable.emit('end')
// 4. Lỗi → readable.emit('error', err)
```

## Process

```javascript
// process cũng là EventEmitter!
process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('SIGINT', () => {               // Ctrl+C
  console.log('Received SIGINT. Graceful shutdown...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {              // Docker/K8s stop signal
  console.log('Received SIGTERM. Graceful shutdown...');
  server.close(() => process.exit(0));
});
```

## Tổng hợp

| Module | Events phổ biến |
|---|---|
| `http.Server` | `request`, `connection`, `close`, `error`, `listening` |
| `http.IncomingMessage` (req) | `data`, `end`, `error`, `close` |
| `fs.ReadStream` | `data`, `end`, `error`, `open`, `close` |
| `fs.WriteStream` | `drain`, `finish`, `error`, `close`, `pipe` |
| `net.Socket` | `data`, `end`, `close`, `error`, `connect`, `timeout` |
| `process` | `exit`, `uncaughtException`, `unhandledRejection`, `SIGINT`, `SIGTERM` |
| `child_process` | `exit`, `error`, `close`, `message`, `disconnect` |

---

# 6. Observer Pattern — Nền tảng lý thuyết

## EventEmitter = Implementation của Observer Pattern

```
Observer Pattern (Gang of Four):
──────────────────────────────────
  Subject (Observable)              Observer (Listener)
  ┌──────────────────┐             ┌──────────────────┐
  │                  │◄── subscribe─│  Observer A       │
  │  Quản lý danh    │             └──────────────────┘
  │  sách observers  │             ┌──────────────────┐
  │                  │◄── subscribe─│  Observer B       │
  │  Khi state thay  │             └──────────────────┘
  │  đổi → notify    │             ┌──────────────────┐
  │  tất cả observers│◄── subscribe─│  Observer C       │
  └──────────────────┘             └──────────────────┘
         │
         │ notify("state changed!")
         │
         ├──► Observer A: handleChange()
         ├──► Observer B: handleChange()
         └──► Observer C: handleChange()


Mapping sang EventEmitter:
──────────────────────────
  Subject      = EventEmitter instance
  subscribe()  = .on(event, listener)
  unsubscribe()= .off(event, listener)
  notify()     = .emit(event, data)
  Observer     = Listener function
```

## So sánh Observer Pattern vs Pub/Sub

```
Observer Pattern (EventEmitter):
────────────────────────────────
  Subject ────── trực tiếp ──────► Observer
  Observers biết Subject tồn tại (gọi subject.on(...))
  Subject giữ reference tới observers

  emitter.on('event', handler);  ← gắn trực tiếp vào emitter


Pub/Sub Pattern (Message Broker):
────────────────────────────────
  Publisher ──► Message Broker ──► Subscriber
  Publisher KHÔNG BIẾT Subscriber tồn tại (và ngược lại)
  Broker là trung gian

  // Publisher
  broker.publish('channel:orders', data);

  // Subscriber (có thể ở server khác!)
  broker.subscribe('channel:orders', handler);

  Ví dụ: Redis Pub/Sub, RabbitMQ, Kafka
```

| | Observer (EventEmitter) | Pub/Sub (Message Broker) |
|---|---|---|
| **Coupling** | Observers biết Subject | Publisher ≠ Subscriber (decoupled hoàn toàn) |
| **Phạm vi** | Trong 1 process | Cross-process, cross-server |
| **Trung gian** | Không | Có (broker) |
| **Ví dụ** | EventEmitter, DOM events | Redis Pub/Sub, Kafka, RabbitMQ |
| **Dùng khi** | Trong 1 ứng dụng | Microservices, distributed systems |

---

# 7. Event-Driven Architecture trong thực tế

## Ví dụ: Hệ thống E-Commerce

```
                        ┌─────────────────────────────────────────┐
                        │           ORDER SERVICE                  │
                        │                                          │
  Client ── POST /orders ──► placeOrder()                         │
                        │       │                                  │
                        │       └── this.emit('order:created', {  │
                        │              orderId, items, customer   │
                        │           });                           │
                        └──────────────┬──────────────────────────┘
                                       │
                          emit 'order:created'
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
  ┌──────────────────┐   ┌──────────────────┐    ┌──────────────────┐
  │ INVENTORY SERVICE│   │  EMAIL SERVICE   │    │ANALYTICS SERVICE │
  │                  │   │                  │    │                  │
  │ .on('order:      │   │ .on('order:      │    │ .on('order:      │
  │   created',      │   │   created',      │    │   created',      │
  │   updateStock)   │   │   sendConfirm)   │    │   trackOrder)    │
  └──────────────────┘   └──────────────────┘    └──────────────────┘
```

## Ví dụ code thực tế: NestJS-style Event System

```javascript
const EventEmitter = require('events');

// ──────────────────────────────────────────
// Event Bus trung tâm (hoặc dùng NestJS EventEmitter2)
// ──────────────────────────────────────────
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);  // Nhiều module lắng nghe
  }
}

const eventBus = new EventBus();

// ──────────────────────────────────────────
// Service A: Order — Phát sự kiện
// ──────────────────────────────────────────
class OrderService {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  async createOrder(data) {
    // 1. Validate & save
    const order = { id: `ORD-${Date.now()}`, ...data, status: 'created' };

    // 2. Phát sự kiện — KHÔNG biết ai đang nghe
    this.eventBus.emit('order:created', order);
    this.eventBus.emit('audit:log', { action: 'ORDER_CREATED', data: order });

    return order;
  }

  async cancelOrder(orderId, reason) {
    this.eventBus.emit('order:cancelled', { orderId, reason });
  }
}

// ──────────────────────────────────────────
// Service B: Notification — Lắng nghe
// ──────────────────────────────────────────
class NotificationService {
  constructor(eventBus) {
    // Đăng ký NGAY khi khởi tạo
    eventBus.on('order:created', (order) => this.onOrderCreated(order));
    eventBus.on('order:cancelled', (data) => this.onOrderCancelled(data));
  }

  onOrderCreated(order) {
    console.log(`📧 Gửi email xác nhận đơn ${order.id}`);
  }

  onOrderCancelled({ orderId, reason }) {
    console.log(`📧 Gửi email hủy đơn ${orderId}: ${reason}`);
  }
}

// ──────────────────────────────────────────
// Service C: Audit Logger — Lắng nghe
// ──────────────────────────────────────────
class AuditService {
  constructor(eventBus) {
    eventBus.on('audit:log', (entry) => this.log(entry));
  }

  log(entry) {
    console.log(`📝 [AUDIT] ${entry.action}:`, JSON.stringify(entry.data));
  }
}

// ──────────────────────────────────────────
// Bootstrap
// ──────────────────────────────────────────
const orderService = new OrderService(eventBus);
const notificationService = new NotificationService(eventBus);
const auditService = new AuditService(eventBus);

// Sử dụng
orderService.createOrder({ items: ['Laptop'], customer: 'Hùng' });
```

---

# 8. EventEmitter vs Callbacks vs Promises

## Khi nào dùng gì?

```
Callback:
  → 1 event, 1 lần: "gọi hàm khi xong"
  → Ví dụ: fs.readFile(path, callback)

Promise:
  → 1 event, 1 lần: "resolve hoặc reject"
  → Ví dụ: fetch(url).then(res => ...)

EventEmitter:
  → NHIỀU events, NHIỀU lần: "stream of events"
  → Ví dụ: server.on('request', ...) — xảy ra nhiều lần!
```

| Tiêu chí | Callback | Promise | EventEmitter |
|---|---|---|---|
| **Số lần** | 1 lần | 1 lần | Nhiều lần |
| **Nhiều listeners** | ❌ 1 callback | ❌ 1 resolve | ✅ Nhiều listeners |
| **Nhiều events** | ❌ | ❌ | ✅ (on, error, close...) |
| **Error handling** | `if (err)` convention | `.catch()` / `try-catch` | `.on('error', fn)` |
| **Chaining** | Callback hell 😱 | `.then().then()` hoặc `await` | Event naming |
| **Cancel** | Khó | AbortController | `.removeListener()` |

```javascript
// Callback — 1 kết quả, 1 lần
fs.readFile('file.txt', (err, data) => {
  if (err) return console.error(err);
  console.log(data);
});

// Promise — 1 kết quả, 1 lần
const data = await fs.promises.readFile('file.txt');

// EventEmitter — nhiều kết quả, nhiều lần
const stream = fs.createReadStream('big-file.txt');
stream.on('data', (chunk) => { /* gọi NHIỀU LẦN! */ });
stream.on('end', () => { /* 1 lần cuối */ });
stream.on('error', (err) => { /* nếu lỗi */ });
```

---

# 9. Gotchas & Best Practices

## ❌ Gotcha 1: Quên xóa listener → Memory Leak

```javascript
// Server long-running — mỗi request thêm listener → LEAK!
const server = http.createServer((req, res) => {
  // ❌ Mỗi request thêm 1 listener → listener tích tụ → memory leak
  someEmitter.on('update', (data) => {
    res.write(data);
  });
});

// ✅ Fix: Dùng once() hoặc removeListener khi xong
const server = http.createServer((req, res) => {
  const handler = (data) => res.write(data);
  someEmitter.on('update', handler);

  res.on('close', () => {
    someEmitter.off('update', handler);  // Cleanup!
  });
});
```

## ❌ Gotcha 2: listener chạy lâu block event loop

```javascript
// ❌ Listener nặng → block tất cả
emitter.on('data', (data) => {
  for (let i = 0; i < 1_000_000_000; i++) {
    // CPU-intensive...
  }
});

// ✅ Fix: Offload heavy work
emitter.on('data', (data) => {
  setImmediate(() => {
    // Cho vào event loop iteration kế tiếp
    heavyProcessing(data);
  });

  // Hoặc dùng Worker Thread
  // const worker = new Worker('./heavy-task.js');
});
```

## ❌ Gotcha 3: Emit trước khi đăng ký listener

```javascript
// ❌ emit() trước khi on() → listener KHÔNG nhận được!
const emitter = new EventEmitter();
emitter.emit('ready', 'data');           // Không ai nghe cả!
emitter.on('ready', (d) => console.log(d)); // Đăng ký SAU → miss!

// ✅ Fix: Luôn đăng ký listeners TRƯỚC khi emit
const emitter = new EventEmitter();
emitter.on('ready', (d) => console.log(d));
emitter.emit('ready', 'data');           // OK!

// ✅ Hoặc dùng process.nextTick() để delay emit
class Server extends EventEmitter {
  constructor() {
    super();
    // Emit ở tick tiếp theo → cho phép caller đăng ký listener trước
    process.nextTick(() => this.emit('ready'));
  }
}

const server = new Server();
server.on('ready', () => console.log('Ready!')); // ← đăng ký TRƯỚC emit nhờ nextTick
```

## ❌ Gotcha 4: Error event không có listener → CRASH

```javascript
// ❌ CRASH!
emitter.emit('error', new Error('Boom'));

// ✅ LUÔN đăng ký error listener
emitter.on('error', (err) => {
  console.error('Handled:', err.message);
});
```

## ✅ Best Practices

| Practice | Giải thích |
|---|---|
| **Luôn có error listener** | Không có → crash process |
| **Dùng `once()` cho events 1 lần** | `ready`, `init`, `connected` |
| **Named functions cho listeners** | Để có thể `removeListener()` |
| **Cleanup listeners khi không cần** | Tránh memory leak |
| **Dùng event naming convention** | `module:action` — `order:created`, `user:deleted` |
| **Đặt `setMaxListeners()`** | Nếu nhiều hơn 10 listeners hợp lệ |     
| **Tránh listener nặng** | Offload sang `setImmediate` hoặc Worker Thread |
| **Đăng ký listener TRƯỚC emit** | Hoặc delay emit bằng `process.nextTick()` |

---

# 10. Câu hỏi phỏng vấn

| Câu hỏi | Key answer |
|---|---|
| EventEmitter là gì? | Class trong module `events`, implement Observer Pattern. Bên trong là object map event name → array of listeners |
| `.emit()` là sync hay async? | **Synchronous!** Gọi tất cả listeners đồng bộ, theo thứ tự đăng ký, block cho đến khi tất cả xong |
| Tại sao event "error" đặc biệt? | Nếu emit "error" mà không có listener → Node.js throw exception → process crash. BẮT BUỘC phải có error listener |
| `.on()` vs `.once()`? | `.on()` lắng nghe mãi mãi. `.once()` chỉ 1 lần rồi tự xóa listener |
| Khi nào dùng EventEmitter thay vì callback? | Khi có NHIỀU events (data, end, error), hoặc event xảy ra NHIỀU LẦN (stream chunks, server requests) |
| Memory leak với EventEmitter? | Quên `removeListener` → listeners tích tụ. Warning mặc định khi >10 listeners. Luôn cleanup khi không cần |
| Observer Pattern vs Pub/Sub? | Observer: trực tiếp (Subject ↔ Observer, cùng process). Pub/Sub: qua broker (cross-process, distributed) |
| Module nào của Node.js dùng EventEmitter? | HTTP Server, Streams, Process, Child Process, Net Socket, Cluster — hầu hết core modules |
| `process.nextTick()` trong constructor emit là sao? | Delay emit để caller có cơ hội đăng ký listener trước. Vì constructor chạy đồng bộ → emit trong constructor = trước khi user gọi `.on()` |
| Event-Driven Architecture lợi ích gì? | Decoupling (modules không biết nhau), extensible (thêm listener không sửa emitter), testable, tuân thủ Open/Closed Principle |
