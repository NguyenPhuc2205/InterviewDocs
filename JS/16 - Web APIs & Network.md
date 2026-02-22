# 📘 JavaScript — Web APIs & Network

> Hiểu rõ **Fetch API, CORS, WebSocket, Workers** là kiến thức cần thiết cho cả frontend và backend developer. Phỏng vấn thường hỏi về cơ chế network, real-time communication, và multi-threading.

---

## Mục lục

1. [Fetch API & AbortController](#1-fetch-api--abortcontroller)
2. [XMLHttpRequest (Legacy)](#2-xmlhttprequest-legacy)
3. [CORS — Same-Origin Policy & Preflight](#3-cors--same-origin-policy--preflight)
4. [WebSocket API](#4-websocket-api)
5. [SSE vs WebSocket vs Long Polling](#5-sse-vs-websocket-vs-long-polling)
6. [Web Workers — Dedicated, Shared, Service Workers](#6-web-workers--dedicated-shared-service-workers)
7. [Streams API](#7-streams-api)
8. [Beacon API & postMessage](#8-beacon-api--postmessage)
9. [Câu hỏi phỏng vấn](#9-câu-hỏi-phỏng-vấn)

---

# 1. Fetch API & AbortController

## Fetch cơ bản

```javascript
// GET request
const response = await fetch('https://api.example.com/users');
const data = await response.json();

// ⚠️ fetch KHÔNG throw error cho HTTP errors (404, 500)
// Chỉ throw khi NETWORK error (DNS fail, offline)
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
```

## Request Options

```javascript
// POST với JSON
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  body: JSON.stringify({ name: 'Minh', age: 25 }),
  credentials: 'include',  // Gửi cookies cross-origin
  mode: 'cors',            // CORS mode (default)
  cache: 'no-cache',       // Cache policy
  redirect: 'follow',      // Follow redirects (default)
  signal: controller.signal // AbortController signal
});

// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'document');

await fetch('/upload', {
  method: 'POST',
  body: formData  // Content-Type tự động set multipart/form-data
});
```

## Response handling

```javascript
const response = await fetch(url);

// Response properties
response.ok;          // true nếu status 200-299
response.status;      // 200, 404, 500...
response.statusText;  // 'OK', 'Not Found'...
response.headers;     // Headers object
response.url;         // Final URL (sau redirect)
response.redirected;  // true nếu bị redirect
response.type;        // 'basic', 'cors', 'opaque'

// Parse body (chỉ đọc được MỘT LẦN — ReadableStream)
const json = await response.json();        // Parse JSON
const text = await response.text();        // Raw text
const blob = await response.blob();        // Binary data
const buffer = await response.arrayBuffer(); // ArrayBuffer
const form = await response.formData();    // FormData

// Clone response nếu cần đọc nhiều lần
const clone = response.clone();
const json = await response.json();
const text = await clone.text();
```

## AbortController — Hủy request

```javascript
// Tạo controller
const controller = new AbortController();

// Truyền signal vào fetch
fetch('https://api.example.com/data', {
  signal: controller.signal
}).then(res => res.json())
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('Request was cancelled');
    }
  });

// Hủy request
controller.abort();

// ✅ Timeout pattern
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ✅ Race multiple requests — lấy kết quả nhanh nhất
async function fetchFastest(urls) {
  const controller = new AbortController();
  const promises = urls.map(url =>
    fetch(url, { signal: controller.signal }).then(r => r.json())
  );

  const result = await Promise.any(promises);
  controller.abort();  // Hủy các request còn lại
  return result;
}

// ✅ React cleanup pattern
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then(r => r.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') throw err;
    });

  return () => controller.abort();  // Cleanup khi unmount
}, []);
```

---

# 2. XMLHttpRequest (Legacy)

> XHR vẫn cần biết cho interview và legacy code. Fetch đã thay thế gần hoàn toàn.

```javascript
// XHR cơ bản
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/users', true);  // async = true

xhr.onload = function () {
  if (xhr.status === 200) {
    const data = JSON.parse(xhr.responseText);
    console.log(data);
  }
};

xhr.onerror = function () {
  console.error('Network error');
};

xhr.send();

// XHR POST
const xhr2 = new XMLHttpRequest();
xhr2.open('POST', '/api/users');
xhr2.setRequestHeader('Content-Type', 'application/json');
xhr2.send(JSON.stringify({ name: 'Minh' }));
```

**XHR có mà Fetch không có: Upload progress**

```javascript
// Upload progress — XHR advantage
const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (event) => {
  if (event.lengthComputable) {
    const percent = (event.loaded / event.total) * 100;
    console.log(`Upload: ${percent.toFixed(1)}%`);
  }
};
xhr.open('POST', '/upload');
xhr.send(formData);
```

## So sánh Fetch vs XHR

| Tiêu chí | Fetch | XMLHttpRequest |
|----------|-------|---------------|
| API style | Promise-based | Callback-based |
| Streams | ✅ ReadableStream | ❌ |
| Abort | AbortController | `xhr.abort()` |
| Upload progress | ❌ (phải dùng streams) | ✅ `xhr.upload.onprogress` |
| Cookies | `credentials: 'include'` | `withCredentials = true` |
| HTTP errors | Không throw | Không throw |
| Service Worker | ✅ Intercept được | ❌ |
| Modern | ✅ | Legacy |

---

# 3. CORS — Same-Origin Policy & Preflight

## Same-Origin Policy

```
Origin = Protocol + Host + Port
https://example.com:443

Same origin:
https://example.com/page1  →  https://example.com/page2    ✅
https://example.com:443    →  https://example.com           ✅ (443 = default HTTPS)

Cross origin:
https://example.com        →  http://example.com            ❌ (khác protocol)
https://example.com        →  https://api.example.com       ❌ (khác host)
https://example.com        →  https://example.com:8080      ❌ (khác port)
```

## CORS Flow

```
                     Simple Request                    Preflight Request
                     (GET, HEAD, POST                  (PUT, DELETE, PATCH,
                      + simple headers)                 custom headers)

Browser ──────────────────────────────  Browser ──────────────────────────
   │                                      │
   │  GET /api/data                       │  OPTIONS /api/data       ← Preflight
   │  Origin: https://app.com             │  Origin: https://app.com
   │                                      │  Access-Control-Request-Method: PUT
   │                                      │  Access-Control-Request-Headers: X-Custom
   ▼                                      ▼
Server ──────────────────────────────  Server ──────────────────────────
   │                                      │
   │  200 OK                              │  204 No Content          ← Preflight response
   │  Access-Control-Allow-Origin:        │  Access-Control-Allow-Origin: *
   │    https://app.com                   │  Access-Control-Allow-Methods: PUT
   │                                      │  Access-Control-Allow-Headers: X-Custom
   │                                      │  Access-Control-Max-Age: 86400
   │                                      │
   │                                      │  (Browser gửi actual request)
   │                                      │  PUT /api/data
   │                                      │  Origin: https://app.com
   ▼                                      ▼
```

## Simple Request conditions

Request được coi là "simple" (không preflight) khi:
1. Method: `GET`, `HEAD`, `POST`
2. Headers chỉ có: `Accept`, `Accept-Language`, `Content-Language`, `Content-Type`
3. Content-Type chỉ là: `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`

## Server-side CORS (Express)

```javascript
// ✅ Cơ bản — dùng cors middleware
const cors = require('cors');

app.use(cors({
  origin: ['https://app.com', 'https://admin.app.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],  // Custom headers client có thể đọc
  credentials: true,                   // Cho phép cookies
  maxAge: 86400                        // Cache preflight 24h
}));

// ✅ Manual CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://app.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
  }
  next();
});
```

## CORS Gotchas

```javascript
// ❌ Wildcard + Credentials không hoạt động
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Credentials: true
// → Browser BLOCK! Phải chỉ định origin cụ thể khi credentials: true

// ✅ Dynamic origin
app.use(cors({
  origin: (origin, callback) => {
    const whitelist = ['https://app.com', 'https://staging.app.com'];
    if (!origin || whitelist.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ⚠️ CORS chỉ restrict BROWSER — cURL, Postman, server-to-server KHÔNG bị ảnh hưởng
// CORS KHÔNG phải security mechanism — chỉ là browser policy
```

---

# 4. WebSocket API

> WebSocket cho phép **kết nối 2 chiều liên tục** (full-duplex) giữa client và server.

## Client-side

```javascript
// Tạo kết nối
const ws = new WebSocket('wss://chat.example.com');  // wss = secure

// Events
ws.onopen = () => {
  console.log('Connected!');
  ws.send('Hello Server!');
  ws.send(JSON.stringify({ type: 'join', room: 'general' }));
};

ws.onmessage = (event) => {
  console.log('Received:', event.data);
  const data = JSON.parse(event.data);
  // Handle message...
};

ws.onclose = (event) => {
  console.log(`Closed: ${event.code} ${event.reason}`);
  // event.code: 1000 = normal, 1006 = abnormal
  // Reconnect logic...
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Gửi data
ws.send('text message');
ws.send(new Blob(['binary data']));
ws.send(new ArrayBuffer(8));

// Đóng kết nối
ws.close(1000, 'Normal closure');

// Properties
ws.readyState;  // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
ws.bufferedAmount;  // Bytes đang chờ gửi
```

## Server-side (Node.js — ws library)

```javascript
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
  console.log('Client connected from:', req.socket.remoteAddress);

  ws.on('message', (data) => {
    const message = JSON.parse(data);

    // Broadcast to all clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Heartbeat — detect stale connections
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// Ping interval — cleanup dead connections
const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));
```

## Auto-reconnect pattern

```javascript
class ReconnectingWebSocket {
  #url;
  #ws = null;
  #retryCount = 0;
  #maxRetries = 10;

  constructor(url) {
    this.#url = url;
    this.connect();
  }

  connect() {
    this.#ws = new WebSocket(this.#url);

    this.#ws.onopen = () => {
      this.#retryCount = 0;  // Reset retry count on success
    };

    this.#ws.onclose = (event) => {
      if (event.code !== 1000 && this.#retryCount < this.#maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.min(1000 * 2 ** this.#retryCount, 30000);
        this.#retryCount++;
        setTimeout(() => this.connect(), delay);
      }
    };
  }

  send(data) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(data);
    }
  }
}
```

---

# 5. SSE vs WebSocket vs Long Polling

```
Long Polling:
Client ──request──▶ Server (giữ kết nối mở)
Client ◀──response── Server (trả về khi có data)
Client ──request──▶ Server (lặp lại ngay)
→ Overhead cao: mỗi lần tạo HTTP request mới

SSE (Server-Sent Events):
Client ──request──▶ Server (giữ kết nối mở)
Client ◀──event────  Server
Client ◀──event────  Server
Client ◀──event────  Server
→ Một chiều: Server → Client. Text only.

WebSocket:
Client ◀───────────▶ Server (kết nối 2 chiều)
→ Full-duplex: cả 2 gửi bất kỳ lúc nào. Binary + Text.
```

## So sánh chi tiết

| Tiêu chí | Long Polling | SSE | WebSocket |
|----------|-------------|-----|-----------|
| Hướng | Client → Server (request) | **Server → Client** | **Hai chiều** |
| Protocol | HTTP | HTTP | ws:// / wss:// |
| Data format | Any | Text (UTF-8) | Text + Binary |
| Auto reconnect | Manual | **Tự động** | Manual |
| Max connections | Browser limit | **6/domain** (HTTP/1.1) | Không giới hạn |
| Overhead | Cao (new HTTP mỗi lần) | Thấp | **Rất thấp** |
| Firewall/Proxy | ✅ Tốt | ✅ Tốt | ⚠️ Có thể bị block |
| Use case | Legacy, simple | Notifications, feeds | Chat, gaming, trading |

## SSE Implementation

```javascript
// Server (Express)
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Gửi event mỗi giây
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ time: new Date() })}\n\n`);
  }, 1000);

  // Named events
  res.write(`event: notification\ndata: {"msg": "Hello"}\n\n`);

  // Event ID (cho reconnect)
  res.write(`id: 123\ndata: {"msg": "Tracked"}\n\n`);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Client
const evtSource = new EventSource('/events');

evtSource.onmessage = (event) => {
  console.log('Data:', JSON.parse(event.data));
};

evtSource.addEventListener('notification', (event) => {
  console.log('Notification:', JSON.parse(event.data));
});

evtSource.onerror = () => {
  console.log('Connection lost, auto-reconnecting...');
  // EventSource tự reconnect!
};

// Đóng
evtSource.close();
```

---

# 6. Web Workers — Dedicated, Shared, Service Workers

> Workers cho phép chạy JavaScript trên **background threads** — không block main thread.

## Dedicated Worker

```javascript
// main.js — Tạo worker
const worker = new Worker('worker.js');

// Gửi data đến worker
worker.postMessage({ numbers: [1, 2, 3, 4, 5], operation: 'sum' });

// Nhận kết quả
worker.onmessage = (event) => {
  console.log('Result:', event.data);  // 15
};

worker.onerror = (error) => {
  console.error('Worker error:', error.message);
};

// Dừng worker
worker.terminate();

// worker.js — Worker script
self.onmessage = (event) => {
  const { numbers, operation } = event.data;

  let result;
  if (operation === 'sum') {
    result = numbers.reduce((a, b) => a + b, 0);
  }

  self.postMessage(result);
};
```

**Worker limitations:**
- KHÔNG access DOM (`document`, `window`)
- KHÔNG access `localStorage`, `sessionStorage`
- CÓ access: `fetch`, `WebSocket`, `IndexedDB`, `setTimeout`, `importScripts`

## Transferable Objects — Zero-copy transfer

```javascript
// ❌ postMessage copy data (chậm cho large data)
const hugeArray = new Float64Array(1_000_000);
worker.postMessage(hugeArray);  // COPY 8MB → tốn thời gian + memory

// ✅ Transfer ownership (zero-copy)
const hugeArray = new Float64Array(1_000_000);
worker.postMessage(hugeArray, [hugeArray.buffer]);
// hugeArray bây giờ trống (ownership chuyển sang worker)
// KHÔNG copy — chỉ transfer pointer → instant!
console.log(hugeArray.length);  // 0 — đã bị "neutered"
```

## SharedArrayBuffer — Shared memory

```javascript
// main.js — Shared memory giữa main và worker
const sharedBuffer = new SharedArrayBuffer(1024);
const sharedArray = new Int32Array(sharedBuffer);

worker.postMessage({ buffer: sharedBuffer });

// Atomics — thread-safe operations
Atomics.store(sharedArray, 0, 42);         // Write
Atomics.load(sharedArray, 0);               // Read: 42
Atomics.add(sharedArray, 0, 8);             // Atomic add: 42 + 8 = 50
Atomics.compareExchange(sharedArray, 0, 50, 100); // CAS: if 50, set 100

// worker.js
self.onmessage = (event) => {
  const sharedArray = new Int32Array(event.data.buffer);
  // Main thread và worker cùng đọc/ghi shared memory
  Atomics.add(sharedArray, 0, 1);  // Thread-safe increment
};
```

## Service Worker

```javascript
// Đăng ký Service Worker
if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/'
  });
  console.log('SW registered:', registration.scope);
}

// sw.js — Service Worker
const CACHE_NAME = 'app-v1';
const URLS_TO_CACHE = ['/', '/index.html', '/styles.css', '/app.js'];

// Install — cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

// Fetch — intercept requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))  // Cache-first strategy
  );
});

// Activate — cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
});
```

## So sánh Workers

| Tiêu chí | Dedicated Worker | Shared Worker | Service Worker |
|----------|-----------------|---------------|----------------|
| Scope | 1 page | Nhiều pages (cùng origin) | Toàn bộ origin |
| Lifetime | Theo page | Theo last connection | **Độc lập** (event-driven) |
| DOM access | ❌ | ❌ | ❌ |
| Fetch intercept | ❌ | ❌ | ✅ |
| Push notifications | ❌ | ❌ | ✅ |
| Offline support | ❌ | ❌ | ✅ |
| Use case | CPU-intensive tasks | Shared state | PWA, caching, offline |

---

# 7. Streams API

> Streams cho phép xử lý data **từng chunk** — tối ưu memory cho large data.

## ReadableStream

```javascript
// Đọc response body dưới dạng stream
const response = await fetch('https://api.example.com/large-data');
const reader = response.body.getReader();
const decoder = new TextDecoder();

let receivedBytes = 0;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  receivedBytes += value.length;
  const text = decoder.decode(value, { stream: true });
  console.log(`Received ${receivedBytes} bytes`);
  // Xử lý từng chunk...
}

// Tạo custom ReadableStream
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue('Hello ');
    controller.enqueue('World');
    controller.close();
  }
});

const reader2 = stream.getReader();
const { value } = await reader2.read();  // 'Hello '
```

## Transform Stream — Pipe

```javascript
// Transform stream: uppercase
const uppercaseTransform = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(chunk.toUpperCase());
  }
});

// Pipe: fetch → transform → output
const response = await fetch('/api/text');
const transformedStream = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(uppercaseTransform);

const reader = transformedStream.getReader();
// Đọc data đã transform...
```

---

# 8. Beacon API & postMessage

## Beacon API — Gửi data khi rời trang

```javascript
// Beacon: gửi analytics/log khi user rời trang
// ĐẢM BẢO gửi thành công — không bị cancel bởi page unload

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Gửi analytics
    const data = JSON.stringify({
      event: 'page_leave',
      timeSpent: performance.now(),
      url: location.href
    });
    navigator.sendBeacon('/analytics', data);
    // Returns true/false — không có response
  }
});

// Beacon vs fetch:
// fetch trong unload → browser có thể CANCEL
// sendBeacon → browser đảm bảo gửi (fire-and-forget)
```

## postMessage — Cross-origin communication

```javascript
// Gửi message đến iframe (cross-origin an toàn)
const iframe = document.getElementById('myIframe');
iframe.contentWindow.postMessage(
  { type: 'data', payload: { user: 'Minh' } },
  'https://trusted-origin.com'  // Target origin — BẮT BUỘC chỉ định!
);

// Nhận message
window.addEventListener('message', (event) => {
  // ⚠️ LUÔN verify origin
  if (event.origin !== 'https://trusted-origin.com') {
    return;  // Bỏ qua messages từ unknown origin
  }

  console.log('Received:', event.data);
  console.log('From:', event.origin);

  // Reply
  event.source.postMessage({ type: 'reply', data: 'OK' }, event.origin);
});

// ❌ ĐỪNG BAO GIỜ dùng wildcard '*' cho sensitive data
iframe.contentWindow.postMessage(sensitiveData, '*');  // NGUY HIỂM!
```

## Window communication

```javascript
// Giao tiếp giữa window.open và parent
const popup = window.open('https://auth.example.com/login');

window.addEventListener('message', (event) => {
  if (event.origin === 'https://auth.example.com') {
    const { token } = event.data;
    // Nhận auth token từ popup
    popup.close();
  }
});

// Trong popup (auth.example.com):
window.opener.postMessage(
  { token: 'jwt-token-here' },
  'https://app.example.com'
);
```

---

# 9. Câu hỏi phỏng vấn

### Q1: Fetch có throw error cho HTTP 404/500 không? Cách xử lý?

**A:** **Không!** Fetch chỉ reject khi **network error** (DNS fail, offline, CORS block). HTTP errors (404, 500) vẫn resolve bình thường. Phải check `response.ok` (true khi status 200-299) hoặc `response.status` để xử lý HTTP errors.

---

### Q2: CORS là gì? Tại sao cần? Preflight request là gì?

**A:** CORS (Cross-Origin Resource Sharing) là cơ chế cho phép server **cho phép** cross-origin requests từ browser. Cần vì **Same-Origin Policy** mặc định block cross-origin requests. **Preflight** là OPTIONS request browser tự gửi trước actual request khi: method không phải GET/HEAD/POST, hoặc có custom headers, hoặc Content-Type không phải simple types. Server trả về allowed methods/headers → browser mới gửi actual request.

---

### Q3: WebSocket và SSE khác gì? Khi nào dùng loại nào?

**A:**
- **WebSocket**: Full-duplex (2 chiều), text + binary, manual reconnect. Dùng cho: **chat, gaming, trading** — cần client gửi data liên tục.
- **SSE**: Một chiều (server → client), text only, auto reconnect, built-in event ID. Dùng cho: **notifications, live feeds, dashboards** — chỉ cần server push.
- SSE đơn giản hơn, dùng HTTP (qua proxy/firewall dễ), nhưng giới hạn 6 connections/domain (HTTP/1.1).

---

### Q4: Web Worker là gì? Khi nào dùng?

**A:** Web Worker chạy JavaScript trên **background thread** — không block main thread/UI. Không access DOM. Dùng cho: **CPU-intensive tasks** (image processing, crypto, parsing large data, complex calculations). Giao tiếp qua `postMessage`. Dùng **Transferable Objects** cho large data (zero-copy transfer thay vì clone).

---

### Q5: Service Worker khác Dedicated Worker thế nào?

**A:** **Dedicated Worker**: chạy song song với page, cùng lifetime, cho CPU tasks. **Service Worker**: proxy giữa app và network, lifetime độc lập (event-driven, tắt khi idle), intercept fetch requests → enable **offline caching**, push notifications, PWA. Service Worker có scope toàn origin, phải dùng HTTPS.

---

### Q6: AbortController dùng để làm gì? Cho ví dụ.

**A:** AbortController **hủy bỏ async operations** (fetch, event listeners, streams). Use cases:
1. **Timeout**: abort fetch sau 5s
2. **Component unmount**: abort pending requests (React cleanup)
3. **Race conditions**: abort previous request khi user type mới
4. **Cancel downloads**: user nhấn Cancel

```javascript
const controller = new AbortController();
fetch(url, { signal: controller.signal });
controller.abort(); // Hủy request → fetch reject với AbortError
```

---

### Q7: Giải thích Same-Origin Policy. CORS wildcard `*` có hạn chế gì?

**A:** Same-Origin Policy: browser chỉ cho phép requests đến **cùng origin** (protocol + host + port). Cross-origin bị block trừ khi server cho phép qua CORS headers. Wildcard `Access-Control-Allow-Origin: *` **không hoạt động** khi `credentials: true` (cookies). Phải chỉ định origin cụ thể. CORS chỉ restrict browser — server-to-server không bị ảnh hưởng.

---

### Q8: Beacon API khác fetch thế nào? Khi nào dùng?

**A:** `navigator.sendBeacon()` là fire-and-forget — **đảm bảo gửi** khi page unload/close (fetch trong unload handler có thể bị cancel). Trả về boolean, không có response. Chỉ gửi POST, body giới hạn 64KB. Dùng cho: **analytics, logging, telemetry** khi user rời trang.
