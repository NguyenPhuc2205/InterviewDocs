# 📘 JavaScript — Performance Optimization

> Performance là tiêu chí **đánh giá senior developer**. Phỏng vấn thường hỏi về V8 optimization, script loading strategies, và cách profiling ứng dụng thực tế.

---

## Mục lục

1. [Script Loading — defer vs async vs module](#1-script-loading--defer-vs-async-vs-module)
2. [Code Splitting & Dynamic Imports](#2-code-splitting--dynamic-imports)
3. [Tree Shaking & Dead Code Elimination](#3-tree-shaking--dead-code-elimination)
4. [V8 Optimization Patterns](#4-v8-optimization-patterns)
5. [Lazy Evaluation & Lazy Loading](#5-lazy-evaluation--lazy-loading)
6. [Efficient Data Structures](#6-efficient-data-structures)
7. [Node.js Performance](#7-nodejs-performance)
8. [Profiling Tools](#8-profiling-tools)
9. [Core Web Vitals](#9-core-web-vitals)
10. [Câu hỏi phỏng vấn](#10-câu-hỏi-phỏng-vấn)

---

# 1. Script Loading — defer vs async vs module

## So sánh trực quan

```
HTML parsing:    ████████████████████████████████████████████

<script>:        ████████░░░░░░░░░░░█████████████████████████
                         ↑ fetch+exec  ↑ resume parsing
                 (BLOCK parsing hoàn toàn!)

<script async>:  ████████████████░░░░████████████████████████
                    ↕ fetch ↕    ↑exec↑
                 (Fetch song song, BLOCK khi exec — không đảm bảo thứ tự)

<script defer>:  ████████████████████████████████████░░░░░░░░
                    ↕ fetch song song ↕              ↑exec↑
                 (Fetch song song, exec SAU parsing — ĐẢM BẢO thứ tự)

<script type="module">:
                 ████████████████████████████████████░░░░░░░░
                    ↕ fetch song song ↕              ↑exec↑
                 (Giống defer + strict mode + scope riêng)
```

## So sánh chi tiết

| Attribute | Fetch | Execute | Thứ tự | DOMContentLoaded |
|-----------|-------|---------|--------|-----------------|
| (none) | Block | Block | Theo vị trí | Chờ |
| `async` | Song song | Block khi xong | **Không đảm bảo** | Không chờ |
| `defer` | Song song | Sau parsing | **Đảm bảo** | Chờ |
| `type="module"` | Song song | Sau parsing | Đảm bảo | Chờ |

```html
<!-- ✅ Best practices -->

<!-- CSS critical — đặt trong <head> -->
<link rel="stylesheet" href="critical.css">

<!-- Preload resources quan trọng -->
<link rel="preload" href="main.js" as="script">
<link rel="preload" href="font.woff2" as="font" crossorigin>

<!-- Scripts chính — dùng defer -->
<script defer src="vendor.js"></script>
<script defer src="app.js"></script>

<!-- Analytics, ads — dùng async (không cần thứ tự) -->
<script async src="analytics.js"></script>

<!-- Modern modules -->
<script type="module" src="app.mjs"></script>
<script nomodule src="app-legacy.js"></script>  <!-- Fallback cho old browsers -->
```

---

# 2. Code Splitting & Dynamic Imports

## Dynamic Import — `import()`

```javascript
// ✅ Lazy load module khi cần
button.addEventListener('click', async () => {
  // Module chỉ được download khi user click
  const { Chart } = await import('./chart.js');
  const chart = new Chart(data);
  chart.render();
});

// ✅ Conditional import
async function loadTranslations(lang) {
  const translations = await import(`./i18n/${lang}.js`);
  return translations.default;
}

// ✅ Route-based splitting (React example)
const Dashboard = React.lazy(() => import('./Dashboard'));
const Profile = React.lazy(() => import('./Profile'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}
```

## Webpack Code Splitting

```javascript
// Webpack magic comments
const module = await import(
  /* webpackChunkName: "chart" */
  /* webpackPrefetch: true */    // Prefetch khi idle
  './chart.js'
);

// webpackPreload: true  → Load ngay (high priority)
// webpackPrefetch: true → Load khi idle (low priority)
```

## Vendor Splitting

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          // vendor code ít thay đổi → cache lâu hơn
        }
      }
    }
  }
};
```

---

# 3. Tree Shaking & Dead Code Elimination

> Tree Shaking loại bỏ **exports không được import** — chỉ hoạt động với **ESM** (`import`/`export`).

## Cách hoạt động

```javascript
// math.js
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }
export function divide(a, b) { return a / b; }

// app.js — chỉ dùng add
import { add } from './math.js';
console.log(add(1, 2));

// Sau Tree Shaking → subtract, multiply, divide bị LOẠI BỎ
// Bundle chỉ chứa function add
```

## Patterns NGĂN Tree Shaking

```javascript
// ❌ CommonJS — KHÔNG tree-shakeable
const _ = require('lodash');  // Import TOÀN BỘ lodash (~70KB)
_.get(obj, 'a.b.c');

// ✅ ESM — Tree-shakeable
import { get } from 'lodash-es';  // Chỉ import get
get(obj, 'a.b.c');

// ❌ Side effects ngăn tree shaking
// utils.js
export function helper() { /* ... */ }
console.log('Module loaded!');  // Side effect! Bundler giữ lại

// ✅ Đánh dấu sideEffects trong package.json
{
  "sideEffects": false  // Toàn bộ package không có side effects
}
// hoặc
{
  "sideEffects": ["./src/polyfills.js", "*.css"]  // Chỉ các file này
}

// ❌ Re-export barrel files (index.js) có thể ngăn tree shaking
// components/index.js
export { Button } from './Button';
export { Modal } from './Modal';     // ← có thể bị kéo theo
export { Table } from './Table';     // ← có thể bị kéo theo

// ✅ Import trực tiếp
import { Button } from './components/Button';
```

---

# 4. V8 Optimization Patterns

## Monomorphic > Polymorphic > Megamorphic

```javascript
// ✅ MONOMORPHIC — Cùng shape → V8 optimize tối đa
function getArea(shape) {
  return shape.width * shape.height;
}

// Luôn truyền cùng shape
getArea({ width: 10, height: 20 });
getArea({ width: 30, height: 40 });
getArea({ width: 50, height: 60 });
// → Inline Cache: Monomorphic → FAST!

// ❌ MEGAMORPHIC — Nhiều shapes khác nhau
getArea({ width: 10, height: 20 });
getArea({ width: 10, height: 20, color: 'red' });
getArea({ w: 10, h: 20 });  // Khác property names!
getArea({ height: 20, width: 10 });  // Khác thứ tự!
// → Inline Cache: Megamorphic → SLOW!
```

## Hidden Class Stability

```javascript
// ✅ Khởi tạo TẤT CẢ properties trong constructor
class Point {
  constructor(x, y) {
    this.x = x;    // Luôn cùng thứ tự
    this.y = y;    // Tất cả instances cùng Hidden Class
    this.z = 0;    // Initialize sẵn, dù chưa cần
  }
}

// ❌ Thêm property sau
const p = new Point(1, 2);
p.color = 'red';  // Hidden Class thay đổi!

// ❌ Delete property
delete p.z;  // Hidden Class thay đổi → slow mode!

// ✅ Gán undefined thay vì delete
p.z = undefined;  // Hidden Class giữ nguyên
```

## Avoid Deoptimization

```javascript
// ✅ Consistent types
function add(a, b) {
  return a + b;
}
// Luôn gọi với cùng type
add(1, 2);   add(3, 4);   add(5, 6);
// ĐỪNG: add(1, 2) rồi add("a", "b")

// ✅ Dùng TypedArrays cho số
// Regular Array: V8 phải check type mỗi element
const arr = [1, 2, 3, 4, 5];

// Float64Array: V8 biết chắc là numbers → optimize
const typed = new Float64Array([1, 2, 3, 4, 5]);

// ✅ Tránh sparse arrays
const sparse = [];
sparse[0] = 1;
sparse[1000] = 2;  // V8 chuyển sang dictionary mode → SLOW

// ✅ Packed arrays
const packed = new Array(1000).fill(0);  // Contiguous memory → FAST
```

---

# 5. Lazy Evaluation & Lazy Loading

## Lazy Evaluation

```javascript
// ✅ Short-circuit evaluation
const value = expensiveCheck && expensiveCompute();
// expensiveCompute() chỉ chạy khi expensiveCheck = true

// ✅ Lazy property (getter)
class Config {
  get dbConnection() {
    // Chỉ tạo connection khi truy cập lần đầu
    if (!this._db) {
      this._db = createConnection();  // Expensive
    }
    return this._db;
  }
}

// ✅ Lazy initialization pattern
function createLazyValue(factory) {
  let value;
  let initialized = false;
  return () => {
    if (!initialized) {
      value = factory();  // Chỉ chạy 1 lần
      initialized = true;
    }
    return value;
  };
}

const getConfig = createLazyValue(() => {
  console.log('Loading config...');  // Chỉ in 1 lần
  return JSON.parse(fs.readFileSync('config.json', 'utf-8'));
});
```

## Lazy Loading — Images & Components

```javascript
// ✅ Native lazy loading (images)
// <img src="photo.jpg" loading="lazy" alt="photo">

// ✅ Intersection Observer — lazy load
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;   // Load ảnh thật
      observer.unobserve(img);      // Ngừng theo dõi
    }
  });
}, { rootMargin: '200px' });  // Load trước 200px

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});

// ✅ Dynamic import cho heavy libraries
async function renderChart(data) {
  const { Chart } = await import('chart.js');  // 200KB — chỉ load khi cần
  return new Chart(canvas, { data });
}
```

---

# 6. Efficient Data Structures

## Map vs Object

```javascript
// Benchmark: Key lookup
const SIZE = 1_000_000;

// Object
const obj = {};
for (let i = 0; i < SIZE; i++) obj[`key${i}`] = i;
console.time('Object lookup');
for (let i = 0; i < SIZE; i++) obj[`key${i}`];
console.timeEnd('Object lookup');  // ~50ms

// Map
const map = new Map();
for (let i = 0; i < SIZE; i++) map.set(`key${i}`, i);
console.time('Map lookup');
for (let i = 0; i < SIZE; i++) map.get(`key${i}`);
console.timeEnd('Map lookup');  // ~30ms — NHANH HƠN!
```

| Tiêu chí | `Object` | `Map` |
|----------|----------|-------|
| Key types | Chỉ string/symbol | **Bất kỳ** (object, function, number) |
| Thứ tự | Không đảm bảo (số → string → symbol) | **Insertion order** |
| Size | `Object.keys(obj).length` O(n) | `map.size` O(1) |
| Iteration | Chậm hơn | **Nhanh hơn** (iterable) |
| Frequent add/delete | Chậm (Hidden Class changes) | **Tối ưu cho add/delete** |
| Serialization | `JSON.stringify` native | Phải convert thủ công |
| Prototype | Có (prototype pollution risk) | **Không** (clean) |
| Use case | Config, schema cố định | Cache, frequent CRUD, non-string keys |

## Set vs Array (uniqueness check)

```javascript
const SIZE = 100_000;
const data = Array.from({ length: SIZE }, (_, i) => i);

// Array — includes() O(n)
const arr = data;
console.time('Array includes');
for (let i = 0; i < SIZE; i++) arr.includes(i);
console.timeEnd('Array includes');  // ~3000ms

// Set — has() O(1)
const set = new Set(data);
console.time('Set has');
for (let i = 0; i < SIZE; i++) set.has(i);
console.timeEnd('Set has');  // ~10ms — GẤP 300 LẦN!
```

| Thao tác | `Array` | `Set` |
|----------|---------|-------|
| Check tồn tại | `includes()` O(n) | `has()` **O(1)** |
| Thêm unique | `if (!arr.includes(x)) arr.push(x)` O(n) | `set.add(x)` **O(1)** |
| Xóa | `splice()` O(n) | `delete()` **O(1)** |
| Deduplicate | `[...new Set(arr)]` | Native |
| Index access | `arr[i]` O(1) | Không hỗ trợ |
| Ordered iteration | ✅ | ✅ (insertion order) |

---

# 7. Node.js Performance

## Clustering — Tận dụng multi-core

```javascript
const cluster = require('cluster');
const os = require('os');
const http = require('http');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid}: Forking ${numCPUs} workers`);

  // Fork workers cho mỗi CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();  // Auto-restart
  });
} else {
  // Workers share cùng port
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Hello from worker ${process.pid}\n`);
  }).listen(3000);

  console.log(`Worker ${process.pid} started`);
}
```

## Worker Threads — CPU-intensive tasks

```javascript
// main.js
const { Worker } = require('worker_threads');

function runHeavyTask(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', {
      workerData: data
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

// Chạy song song KHÔNG block main thread
const results = await Promise.all([
  runHeavyTask({ start: 0, end: 1000000 }),
  runHeavyTask({ start: 1000000, end: 2000000 }),
  runHeavyTask({ start: 2000000, end: 3000000 }),
]);

// worker.js
const { parentPort, workerData } = require('worker_threads');

function heavyComputation({ start, end }) {
  let sum = 0;
  for (let i = start; i < end; i++) {
    sum += Math.sqrt(i);  // CPU-intensive
  }
  return sum;
}

parentPort.postMessage(heavyComputation(workerData));
```

## Streams — Memory-efficient I/O

```javascript
// ❌ Đọc toàn bộ file vào memory
const data = fs.readFileSync('huge-file.csv', 'utf-8');  // 2GB → OUT OF MEMORY!
const lines = data.split('\n');

// ✅ Stream — xử lý từng chunk
const { createReadStream } = require('fs');
const { createInterface } = require('readline');

const rl = createInterface({
  input: createReadStream('huge-file.csv'),
  crlfDelay: Infinity
});

let count = 0;
for await (const line of rl) {
  count++;
  // Xử lý từng dòng — memory usage ổn định ~10MB
}
console.log(`Processed ${count} lines`);

// ✅ Pipe streams
const { pipeline } = require('stream/promises');
const { createGzip } = require('zlib');

await pipeline(
  createReadStream('input.txt'),     // Đọc
  createGzip(),                       // Nén
  createWriteStream('output.txt.gz')  // Ghi
);
// Toàn bộ xử lý streaming — memory thấp dù file rất lớn
```

## Connection Pooling

```javascript
// ❌ Tạo connection mới mỗi request
app.get('/users', async (req, res) => {
  const client = new Client(connectionString);
  await client.connect();     // Tốn ~50ms mỗi lần
  const result = await client.query('SELECT * FROM users');
  await client.end();
  res.json(result.rows);
});

// ✅ Connection Pool — reuse connections
const { Pool } = require('pg');
const pool = new Pool({
  connectionString,
  max: 20,          // Tối đa 20 connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

app.get('/users', async (req, res) => {
  const result = await pool.query('SELECT * FROM users');  // Reuse connection
  res.json(result.rows);
});
```

---

# 8. Profiling Tools

## Chrome DevTools

```
Performance Tab:
1. Click Record → thao tác trên trang → Stop
2. Phân tích:
   - Main thread: Xem scripting, rendering, painting
   - Call Tree: Function nào tốn nhiều thời gian nhất
   - Bottom-Up: Tổng thời gian mỗi function
   - Flame Chart: Visualization call stack theo thời gian

Memory Tab:
1. Heap Snapshot — Chụp trạng thái heap
   - So sánh 2 snapshots → tìm leak
   - Retainers: ai giữ reference đến object

2. Allocation Timeline — Theo dõi allocation real-time
   - Xác định function nào allocate nhiều nhất

3. Allocation Sampling — Lightweight profiling
   - Ít impact performance hơn Timeline

Lighthouse:
- Performance score (0-100)
- Suggestions cụ thể cho improvement
- FCP, LCP, TBT, CLS metrics
```

## Node.js Profiling

```bash
# V8 Profiler — CPU profiling
node --prof app.js
# → Tạo isolate-*.log file
node --prof-process isolate-*.log > profile.txt
# → Xem top functions theo CPU time

# Inspector — Chrome DevTools cho Node.js
node --inspect app.js
# → Mở chrome://inspect trong Chrome
# → Full DevTools: CPU profiler, Memory, Console

# Clinic.js — Auto-detect bottlenecks
npx clinic doctor -- node app.js
npx clinic flame -- node app.js    # Flame graph
npx clinic bubbleprof -- node app.js  # Async analysis
```

```javascript
// Đo performance trong code
const { performance, PerformanceObserver } = require('perf_hooks');

// 1. performance.now() — High-resolution timing
const start = performance.now();
doHeavyWork();
const end = performance.now();
console.log(`Took: ${(end - start).toFixed(2)}ms`);

// 2. performance.mark() + measure()
performance.mark('start-process');
processData();
performance.mark('end-process');

performance.measure('Processing', 'start-process', 'end-process');
const measure = performance.getEntriesByName('Processing')[0];
console.log(`Processing took: ${measure.duration.toFixed(2)}ms`);

// 3. console.time/timeEnd — Simple timing
console.time('loop');
for (let i = 0; i < 1000000; i++) { /* ... */ }
console.timeEnd('loop');  // loop: 5.234ms
```

---

# 9. Core Web Vitals

> Google dùng Core Web Vitals để **đánh giá trải nghiệm người dùng** và ảnh hưởng **SEO ranking**.

```
┌───────────────────────────────────────────────────────┐
│              Core Web Vitals (2024+)                  │
├──────────────┬──────────────────┬─────────────────────┤
│     LCP      │      INP        │       CLS           │
│  Loading     │  Interactivity  │  Visual Stability   │
│              │                  │                     │
│  ≤ 2.5s ✅   │  ≤ 200ms ✅     │  ≤ 0.1 ✅           │
│  ≤ 4.0s ⚠️   │  ≤ 500ms ⚠️     │  ≤ 0.25 ⚠️          │
│  > 4.0s ❌   │  > 500ms ❌     │  > 0.25 ❌          │
└──────────────┴──────────────────┴─────────────────────┘
```

## LCP — Largest Contentful Paint

Thời gian render **element lớn nhất** trên viewport (hero image, heading lớn).

```javascript
// Đo LCP
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

**Tối ưu LCP:**
```html
<!-- Preload hero image -->
<link rel="preload" as="image" href="hero.webp">

<!-- Inline critical CSS -->
<style>
  .hero { width: 100%; height: auto; }
</style>

<!-- Lazy load images DƯỚI fold -->
<img src="hero.webp" alt="Hero">  <!-- Trên fold: load ngay -->
<img src="below.webp" loading="lazy" alt="Below">  <!-- Dưới fold: lazy -->
```

## INP — Interaction to Next Paint

Thời gian từ **user interaction** (click, tap, keypress) đến **visual response**.

```javascript
// Đo INP
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.interactionId) {
      console.log('Interaction:', entry.duration, 'ms');
    }
  }
}).observe({ type: 'event', durationThreshold: 16, buffered: true });
```

**Tối ưu INP:**
```javascript
// ❌ Long task block main thread
button.addEventListener('click', () => {
  processLargeDataset(data);  // 500ms blocking!
  updateUI();
});

// ✅ Break long tasks với scheduler
button.addEventListener('click', async () => {
  // Yield to main thread sau mỗi chunk
  for (const chunk of chunks) {
    processChunk(chunk);
    await scheduler.yield();  // Cho browser xử lý events
  }
  updateUI();
});

// ✅ Hoặc dùng requestIdleCallback
button.addEventListener('click', () => {
  updateUI();  // UI trước
  requestIdleCallback(() => {
    processLargeDataset(data);  // Heavy work khi idle
  });
});
```

## CLS — Cumulative Layout Shift

**Tổng layout shifts** không mong muốn (element nhảy vị trí).

```javascript
// Đo CLS
let clsValue = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {  // Bỏ qua shifts do user interaction
      clsValue += entry.value;
    }
  }
  console.log('CLS:', clsValue);
}).observe({ type: 'layout-shift', buffered: true });
```

**Tối ưu CLS:**
```html
<!-- ✅ Luôn set width/height cho images -->
<img src="photo.jpg" width="800" height="600" alt="photo">

<!-- ✅ Dùng aspect-ratio CSS -->
<style>
  .video-container { aspect-ratio: 16 / 9; }
</style>

<!-- ✅ Reserve space cho ads/dynamic content -->
<div style="min-height: 250px;">
  <!-- Ad sẽ load ở đây — space đã được giữ sẵn -->
</div>

<!-- ❌ TRÁNH: Inject content phía trên existing content -->
<!-- ❌ TRÁNH: Dynamic fonts gây FOUT (Flash of Unstyled Text) -->
```

---

# 10. Câu hỏi phỏng vấn

### Q1: defer và async khác gì nhau? Khi nào dùng loại nào?

**A:** Cả hai đều fetch script song song với HTML parsing. **`defer`**: execute sau khi HTML parse xong, **đảm bảo thứ tự** — dùng cho app scripts phụ thuộc nhau. **`async`**: execute ngay khi fetch xong, **không đảm bảo thứ tự** — dùng cho scripts độc lập (analytics, ads). `type="module"` hoạt động giống `defer`.

---

### Q2: Tree Shaking là gì? Điều kiện để hoạt động?

**A:** Tree Shaking loại bỏ exports không được import từ bundle. Điều kiện: phải dùng **ESM** (import/export), không dùng CommonJS (require). Module phải không có **side effects** (hoặc đánh dấu `sideEffects: false` trong package.json). Barrel files (index.js re-export) có thể cản tree shaking.

---

### Q3: Map và Object khác gì về performance? Khi nào dùng Map?

**A:** Map nhanh hơn Object cho **frequent add/delete** (không thay đổi Hidden Class), **key lookup** trên dataset lớn, và `map.size` O(1) vs `Object.keys().length` O(n). Dùng Map khi: keys không phải string, cần iteration order, frequent CRUD, cần `.size`. Dùng Object khi: schema cố định, cần JSON serialization, simple config.

---

### Q4: Cluster và Worker Threads khác gì trong Node.js?

**A:**
- **Cluster**: Fork **multiple processes**, mỗi process có V8 instance riêng, share cùng port. Dùng cho **HTTP server scaling** — tận dụng multi-core.
- **Worker Threads**: Tạo **threads trong cùng process**, share memory (SharedArrayBuffer). Dùng cho **CPU-intensive tasks** (crypto, image processing) không muốn block main thread.

---

### Q5: Giải thích Core Web Vitals: LCP, INP, CLS.

**A:**
- **LCP** (Largest Contentful Paint): Thời gian render element lớn nhất — đo **loading**. Target ≤ 2.5s. Tối ưu: preload resources, optimize images, SSR.
- **INP** (Interaction to Next Paint): Thời gian từ interaction đến visual response — đo **interactivity**. Target ≤ 200ms. Tối ưu: break long tasks, yield to main thread.
- **CLS** (Cumulative Layout Shift): Tổng layout shifts — đo **visual stability**. Target ≤ 0.1. Tối ưu: set dimensions cho images, reserve space cho dynamic content.

---

### Q6: Stream trong Node.js tối ưu performance thế nào?

**A:** Streams xử lý data **từng chunk** thay vì load toàn bộ vào memory. File 2GB: `readFileSync` cần 2GB RAM → crash. Stream chỉ cần ~64KB buffer. 4 loại: Readable, Writable, Transform, Duplex. Dùng `pipeline()` để chain streams an toàn (auto error handling, cleanup).

---

### Q7: Làm sao để V8 optimize function tốt nhất?

**A:**
1. **Monomorphic calls** — luôn truyền objects cùng shape (cùng properties, cùng thứ tự)
2. **Consistent types** — không trộn number với string cho cùng parameter
3. **Initialize properties** trong constructor — giữ Hidden Class ổn định
4. Tránh `delete` — gán `undefined` thay thế
5. Tránh **sparse arrays** — dùng packed arrays
6. Tránh `eval()`, `arguments` object — dùng rest parameters

---

### Q8: Code Splitting giúp gì? Có những chiến lược nào?

**A:** Code Splitting chia bundle thành chunks nhỏ → **load nhanh hơn** (chỉ load code cần thiết). Chiến lược:
1. **Route-based** — mỗi route 1 chunk (React.lazy)
2. **Component-based** — lazy load heavy components (modals, charts)
3. **Vendor splitting** — tách node_modules → cache riêng
4. **Dynamic import** — `import()` khi user interaction
