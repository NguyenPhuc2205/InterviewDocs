# Node.js — Worker Threads, Cluster & Quản Lý Tiến Trình

> **Node.js là single-threaded** — đây là câu nói ai cũng biết nhưng ít ai hiểu đúng. JavaScript chạy trên 1 thread, nhưng Node.js có cách để tận dụng CPU đa nhân. Tài liệu này giải thích CHI TIẾT 3 cơ chế: Worker Threads, Cluster module, và PM2.
>
> Tham khảo: [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html), [Node.js Cluster](https://nodejs.org/api/cluster.html)

---

## Mục lục

1. [Bối cảnh: Single Thread thực sự nghĩa là gì?](#1-bối-cảnh)
2. [Hai loại tác vụ: I/O-bound vs CPU-bound](#2-hai-loại-tác-vụ)
3. [Worker Threads — Đa luồng trong Node.js](#3-worker-threads)
4. [Cluster Module — Đa tiến trình](#4-cluster-module)
5. [PM2 — Quản lý tiến trình trong Production](#5-pm2)
6. [Worker Threads vs Cluster — Khi nào dùng cái nào?](#6-so-sánh-chi-tiết)
7. [Câu hỏi phỏng vấn](#7-câu-hỏi-phỏng-vấn)

---

# 1. Bối cảnh

## "Single-threaded" nghĩa là gì?

Khi nói "Node.js là single-threaded", ta đang nói: **JavaScript code của bạn chỉ chạy trên 1 thread duy nhất** — gọi là **main thread**.

Nhưng bản thân Node.js **không phải single-threaded**. Nội bộ, Node.js có:
- **1 main thread** — chạy JavaScript, Event Loop
- **4 thread trong thread pool** (libuv) — xử lý file I/O, DNS lookup, crypto
- **Các thread hệ thống** — xử lý networking

```
Node.js process (bên trong):
┌──────────────────────────────────────────────────┐
│  Main Thread (V8)                                │
│  ├── Chạy JavaScript code                        │
│  ├── Event Loop                                  │
│  └── Callback queue                              │
│                                                  │
│  Thread Pool (libuv) — 4 threads mặc định        │
│  ├── Thread 1: fs.readFile()                     │
│  ├── Thread 2: crypto.pbkdf2()                   │
│  ├── Thread 3: dns.lookup()                      │
│  └── Thread 4: (chờ tác vụ)                      │
│                                                  │
│  OS Threads (networking)                         │
│  └── epoll/kqueue xử lý TCP/UDP                  │
└──────────────────────────────────────────────────┘
```

**Vấn đề nằm ở đâu?** — Ở main thread. Tất cả JavaScript code của bạn (xử lý request, tính toán, render template...) đều chạy trên **1 thread duy nhất này**.

## Máy tính có nhiều nhân CPU

Máy tính hiện đại có 4, 8, thậm chí 16 nhân CPU. Nhưng Node.js **mặc định chỉ dùng 1 nhân** cho main thread:

```
CPU 8 nhân:
  Nhân 1: ████ Node.js main thread (đang bận)
  Nhân 2: ░░░░ (trống)
  Nhân 3: ░░░░ (trống)
  Nhân 4: ░░░░ (trống)
  Nhân 5: ░░░░ (trống)
  Nhân 6: ░░░░ (trống)
  Nhân 7: ░░░░ (trống)
  Nhân 8: ░░░░ (trống)

  → Lãng phí 87.5% sức mạnh CPU!
```

Câu hỏi đặt ra: **Làm thế nào để tận dụng các nhân CPU còn lại?**

Hai câu trả lời: **Worker Threads** và **Cluster Module**.

---

# 2. Hai loại tác vụ

Trước khi chọn giải pháp, phải hiểu **loại tác vụ** bạn đang xử lý — vì mỗi loại cần giải pháp khác nhau.

## I/O-bound — Tác vụ chờ đợi

Tác vụ **dành phần lớn thời gian để CHỜ** — chờ database trả kết quả, chờ file đọc xong, chờ API bên ngoài phản hồi.

```
Ví dụ I/O-bound:
  → Query database (chờ DB xử lý)
  → Đọc/ghi file (chờ ổ cứng)
  → Gọi API bên ngoài (chờ network)
  → Gửi email (chờ SMTP server)

CPU hầu như KHÔNG LÀM GÌ — chỉ chờ.
```

**Node.js xử lý I/O-bound RẤT TỐT** nhờ Event Loop + libuv. Main thread không bị chặn khi chờ I/O — nó tiếp tục xử lý request khác. Đây là lý do Node.js phổ biến cho web server.

**Kết luận: Tác vụ I/O-bound → KHÔNG CẦN Worker Threads hay Cluster. Event Loop đủ rồi.**

## CPU-bound — Tác vụ tính toán

Tác vụ **dùng CPU liên tục** — CPU bận xử lý, không có thời gian "chờ" nào cả.

```
Ví dụ CPU-bound:
  → Mã hóa mật khẩu (bcrypt hash 12 rounds)
  → Nén/giải nén file lớn
  → Xử lý ảnh (resize, crop, watermark)
  → Parse CSV hàng triệu dòng
  → Tính toán khoa học, Machine Learning
  → Render video, generate PDF phức tạp
```

**Đây là điểm yếu của Node.js.** Khi CPU bận tính toán, main thread bị **chặn hoàn toàn** — KHÔNG request nào khác được xử lý.

### Ví dụ: Main thread bị chặn

```typescript
// API endpoint tính hash nặng
app.get('/hash', (req, res) => {
  // Tính toán nặng — mất 5 giây
  let result = 0
  for (let i = 0; i < 10_000_000_000; i++) {
    result += Math.sqrt(i)
  }
  res.json({ result })
})

// TRONG 5 GIÂY TÍNH TOÁN ĐÓ:
// → User A gọi GET /hash → đang xử lý...
// → User B gọi GET /users → PHẢI CHỜ (main thread bận!)
// → User C gọi GET /ping → PHẢI CHỜ
// → User D gọi GET /login → PHẢI CHỜ
// Tất cả đều bị chặn bởi 1 tác vụ CPU-bound!
```

**Giải pháp cho CPU-bound: Worker Threads** — đẩy tác vụ nặng sang thread khác, main thread tự do xử lý request.

---

# 3. Worker Threads

## Worker Threads là gì?

Worker Threads cho phép bạn **tạo thread JavaScript mới** bên trong cùng 1 process Node.js. Thread mới có **V8 instance riêng** và **Event Loop riêng** — chạy song song thật sự với main thread.

```
TRƯỚC (không có Worker Threads):
┌─────────────────────────────────────────┐
│  Main Thread                            │
│  ├── Xử lý request A (nhanh)    ✅     │
│  ├── Tính toán nặng (5 giây)    ⏳     │ ← Chặn!
│  ├── Xử lý request B            ❌ CHỜ │
│  ├── Xử lý request C            ❌ CHỜ │
│  └── Xử lý request D            ❌ CHỜ │
└─────────────────────────────────────────┘

SAU (có Worker Threads):
┌─────────────────────────────────────────┐
│  Main Thread                            │
│  ├── Xử lý request A (nhanh)    ✅     │
│  ├── Giao tính toán cho Worker   ✅     │ ← Không chặn!
│  ├── Xử lý request B (nhanh)    ✅     │
│  ├── Xử lý request C (nhanh)    ✅     │
│  └── Xử lý request D (nhanh)    ✅     │
│                                         │
│  Worker Thread                          │
│  └── Tính toán nặng (5 giây)    ⏳     │ ← Chạy riêng, không ảnh hưởng main
│      → Xong → gửi kết quả về main      │
└─────────────────────────────────────────┘
```

## Cách hoạt động

Worker Threads hoạt động theo mô hình **message passing** (truyền tin nhắn):

1. **Main thread tạo Worker** — chỉ định file JavaScript để Worker chạy
2. **Main gửi dữ liệu cho Worker** — qua `workerData` (lúc khởi tạo) hoặc `postMessage()` (sau khi tạo)
3. **Worker xử lý** — chạy tính toán nặng trên thread riêng
4. **Worker gửi kết quả về Main** — qua `parentPort.postMessage()`
5. **Main nhận kết quả** — qua event `'message'`

Quan trọng: **dữ liệu được COPY** khi truyền giữa threads (không chia sẻ), trừ khi dùng `SharedArrayBuffer`.

## Ví dụ chi tiết: Tính toán nặng

### Bước 1: Tạo file Worker (`hash-worker.ts`)

File này chứa code **chạy trên thread riêng**. Nó nhận dữ liệu, xử lý, và gửi kết quả về.

```typescript
// hash-worker.ts — Chạy trên WORKER thread (không phải main)
import { parentPort, workerData } from 'worker_threads'

// parentPort: kênh giao tiếp với main thread
// workerData: dữ liệu được truyền vào lúc khởi tạo Worker

// Tính toán nặng — chạy trên thread riêng, KHÔNG chặn main
function computeHash(data: string): string {
  let hash = 0
  // Giả lập tính toán nặng — lặp 1 tỷ lần
  for (let i = 0; i < 1_000_000_000; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i % data.length)) | 0
  }
  return hash.toString(16)
}

// Nhận dữ liệu từ workerData, tính toán, gửi kết quả về main
const result = computeHash(workerData.input)
parentPort.postMessage({ hash: result })

// Khi postMessage() hoàn thành, worker thread TỰ ĐỘNG thoát
```

### Bước 2: Gọi Worker từ Main thread (`main.ts`)

Main thread tạo Worker, gửi dữ liệu, và nhận kết quả qua Promise.

```typescript
// main.ts — Chạy trên MAIN thread
import { Worker } from 'worker_threads'

function runHashWorker(input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Tạo Worker — trỏ đến file chạy trên thread riêng
    const worker = new Worker('./hash-worker.js', {
      workerData: { input },  // Truyền dữ liệu vào Worker (COPY, không chia sẻ)
    })

    // Lắng nghe kết quả từ Worker
    worker.on('message', (result) => {
      resolve(result.hash)  // Worker đã tính xong, nhận kết quả
    })

    // Xử lý lỗi — Worker có thể crash
    worker.on('error', (error) => {
      reject(error)  // Lỗi trong Worker thread
    })

    // Worker thoát — kiểm tra exit code
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker thoát bất thường với code ${code}`))
      }
    })
  })
}

// Sử dụng trong Express/NestJS route handler
app.get('/hash', async (req, res) => {
  // Main thread KHÔNG bị chặn — Worker xử lý song song
  const hash = await runHashWorker(req.query.data as string)
  res.json({ hash })

  // Trong lúc Worker đang tính, main thread vẫn tự do
  // xử lý các request khác bình thường!
})
```

## Giao tiếp hai chiều giữa Main và Worker

Không chỉ gửi dữ liệu 1 lần lúc khởi tạo — Main và Worker có thể **gửi qua gửi lại** nhiều lần:

```typescript
// === MAIN THREAD ===
const worker = new Worker('./processor.js')

// Main GỬI message cho Worker
worker.postMessage({ action: 'process', data: [1, 2, 3, 4, 5] })

// Main NHẬN message từ Worker
worker.on('message', (msg) => {
  if (msg.type === 'progress') {
    console.log(`Đang xử lý: ${msg.percent}%`)  // Báo tiến độ
  } else if (msg.type === 'done') {
    console.log('Kết quả:', msg.result)
  }
})
```

```typescript
// === WORKER THREAD (processor.js) ===
import { parentPort } from 'worker_threads'

// Worker NHẬN message từ Main
parentPort.on('message', (msg) => {
  if (msg.action === 'process') {
    const data = msg.data

    // Xử lý từng phần và báo tiến độ
    for (let i = 0; i < data.length; i++) {
      // ... tính toán nặng với data[i] ...

      // Gửi tiến độ về Main
      parentPort.postMessage({
        type: 'progress',
        percent: Math.round(((i + 1) / data.length) * 100)
      })
    }

    // Gửi kết quả cuối cùng
    parentPort.postMessage({ type: 'done', result: 42 })
  }
})
```

## SharedArrayBuffer — Chia sẻ bộ nhớ (nâng cao)

Mặc định, `postMessage()` **copy dữ liệu** giữa threads — tốn bộ nhớ và thời gian nếu dữ liệu lớn. `SharedArrayBuffer` cho phép **chia sẻ vùng nhớ chung** — cả Main và Worker đọc/ghi cùng 1 vùng nhớ.

```typescript
// Main thread — tạo vùng nhớ chia sẻ
const sharedBuffer = new SharedArrayBuffer(1024)  // 1KB chia sẻ
const sharedArray = new Int32Array(sharedBuffer)   // "View" để đọc/ghi

const worker = new Worker('./worker.js', {
  workerData: { buffer: sharedBuffer }
  // SharedArrayBuffer KHÔNG bị copy — cả 2 thread dùng CÙNG vùng nhớ
})

// Worker thread — đọc/ghi cùng vùng nhớ
// import { workerData } from 'worker_threads'
// const arr = new Int32Array(workerData.buffer)
// arr[0] = 42  ← Main thread cũng thấy giá trị 42!
```

**Cảnh báo**: Khi 2 thread cùng ghi vào 1 vùng nhớ → **race condition**. Phải dùng `Atomics` để đồng bộ:

```typescript
Atomics.store(sharedArray, 0, 42)    // Ghi an toàn
Atomics.load(sharedArray, 0)          // Đọc an toàn
Atomics.add(sharedArray, 0, 1)        // Cộng an toàn (atomic)
```

SharedArrayBuffer phức tạp — chỉ dùng khi dữ liệu rất lớn và cần hiệu suất tối đa.

## Khi nào dùng Worker Threads?

| ✅ Nên dùng | ❌ Không nên dùng |
|-------------|-------------------|
| Mã hóa/giải mã nặng (bcrypt, crypto) | Query database — libuv xử lý bất đồng bộ rồi |
| Nén/giải nén ảnh, video | Đọc/ghi file — dùng `fs` async là đủ |
| Parse file CSV/JSON hàng triệu dòng | HTTP request đơn giản — Event Loop là đủ |
| Tính toán khoa học, ML inference | CRUD thông thường — không có gì nặng |
| Render PDF phức tạp | Bất kỳ tác vụ I/O-bound nào |

**Quy tắc**: Nếu tác vụ **dùng CPU liên tục trên 100ms** → nên dùng Worker Threads. Nếu tác vụ **chờ I/O** → KHÔNG cần.

---

# 4. Cluster Module

## Cluster giải quyết vấn đề khác

Worker Threads giải quyết: "Tôi có 1 tác vụ nặng, cần thread riêng."

Cluster giải quyết: "Server tôi nhận 10.000 request/giây, 1 process xử lý không kịp."

## Cluster là gì?

Cluster module tạo **nhiều process Node.js** (gọi là workers) — mỗi process là **bản sao hoàn chỉnh** của ứng dụng, chạy trên **nhân CPU riêng**.

```
KHÔNG có Cluster — 1 process, 1 nhân CPU:
┌──────────────────────────────────┐
│  Process Node.js (nhân CPU 1)    │
│  ├── Request A → xử lý          │
│  ├── Request B → chờ            │ ← Tắc nghẽn nếu request nhiều
│  ├── Request C → chờ            │
│  └── Request D → chờ            │
└──────────────────────────────────┘

CÓ Cluster — 4 process, 4 nhân CPU:
┌───────────────────────────────────────────────────┐
│  Master Process (quản lý)                         │
│  ├── Worker 1 (nhân CPU 1) → Request A, E, I      │
│  ├── Worker 2 (nhân CPU 2) → Request B, F, J      │
│  ├── Worker 3 (nhân CPU 3) → Request C, G, K      │
│  └── Worker 4 (nhân CPU 4) → Request D, H, L      │
│                                                   │
│  Tất cả cùng lắng nghe PORT 3000                  │
│  Hệ điều hành tự phân phối request (round-robin)  │
└───────────────────────────────────────────────────┘
```

**Kết quả**: Throughput tăng gần **tỷ lệ thuận** với số nhân CPU (4 nhân ≈ 4x throughput).

## Cách Cluster hoạt động

Cluster dùng mô hình **Master-Worker**:

1. **Master process** khởi động trước — nó **không xử lý request**
2. Master gọi `cluster.fork()` để tạo **worker process** — mỗi worker là bản sao của ứng dụng
3. Tất cả workers cùng **lắng nghe 1 port** — OS tự phân phối request cho worker nào rảnh
4. Nếu worker **crash**, master **phát hiện** qua event `'exit'` và có thể **tạo worker mới**

## Ví dụ chi tiết

```typescript
import cluster from 'cluster'
import os from 'os'
import express from 'express'

const numCPUs = os.cpus().length  // Đếm số nhân CPU

if (cluster.isPrimary) {
  // ═══════════════════════════════════════════════════
  // MASTER PROCESS — Chạy 1 lần duy nhất
  // Nhiệm vụ: tạo workers + giám sát
  // ═══════════════════════════════════════════════════

  console.log(`Master process ${process.pid} đang chạy`)
  console.log(`Phát hiện ${numCPUs} nhân CPU → tạo ${numCPUs} workers`)

  // Tạo 1 worker cho mỗi nhân CPU
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
    // fork() tạo process MỚI — process mới chạy LẠI file này từ đầu
    // Nhưng lần này cluster.isPrimary = false → chạy nhánh else
  }

  // Giám sát: nếu worker crash → tạo lại
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} chết (code: ${code})`)
    console.log('Tạo worker mới để thay thế...')
    cluster.fork()  // Tự phục hồi — zero downtime
  })

} else {
  // ═══════════════════════════════════════════════════
  // WORKER PROCESS — Chạy trên MỖI nhân CPU
  // Nhiệm vụ: xử lý request thật sự
  // ═══════════════════════════════════════════════════

  const app = express()

  app.get('/', (req, res) => {
    res.json({
      message: 'Xin chào!',
      worker: process.pid,  // Từng request có thể do worker khác xử lý
    })
  })

  app.listen(3000, () => {
    console.log(`Worker ${process.pid} đang lắng nghe port 3000`)
  })
}
```

**Khi chạy file trên**, terminal sẽ hiển thị:

```
Master process 1234 đang chạy
Phát hiện 4 nhân CPU → tạo 4 workers
Worker 1235 đang lắng nghe port 3000
Worker 1236 đang lắng nghe port 3000
Worker 1237 đang lắng nghe port 3000
Worker 1238 đang lắng nghe port 3000
```

4 workers cùng lắng nghe port 3000 — OS tự phân phối request.

## Vấn đề quan trọng: Workers KHÔNG chia sẻ bộ nhớ

Mỗi worker là **process riêng biệt** với bộ nhớ riêng. Điều này có nghĩa:

```
❌ KHÔNG hoạt động với Cluster:
  - Lưu session trong biến JavaScript (mỗi worker có biến riêng)
  - Cache bằng Map/Object trong code (mỗi worker có cache riêng)
  - Biến global (mỗi worker có bản sao riêng)

✅ Giải pháp:
  - Dùng Redis cho session + cache (tất cả workers truy cập chung)
  - Dùng database cho shared state
  - Dùng sticky sessions (cùng user → cùng worker)
```

Ví dụ:

```typescript
// ❌ SAI — mỗi worker có Map cache riêng, user A vào worker 1 thấy cache,
//         nhưng vào worker 2 thì cache trống
const cache = new Map()

app.get('/data', (req, res) => {
  if (cache.has('key')) return res.json(cache.get('key'))
  const data = fetchFromDB()
  cache.set('key', data)  // Chỉ lưu ở worker HIỆN TẠI
  res.json(data)
})

// ✅ ĐÚNG — dùng Redis, tất cả workers truy cập chung
app.get('/data', async (req, res) => {
  const cached = await redis.get('key')
  if (cached) return res.json(JSON.parse(cached))
  const data = await fetchFromDB()
  await redis.set('key', JSON.stringify(data))  // Tất cả workers đều thấy
  res.json(data)
})
```

## Ưu và nhược điểm Cluster

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Tận dụng đa nhân CPU — throughput × N | Mỗi process tốn RAM riêng (~30-50MB mỗi worker) |
| Process độc lập — 1 crash không kéo cả app | Không chia sẻ bộ nhớ — cần Redis/DB cho shared state |
| OS tự phân phối request (round-robin) | Code phức tạp hơn single process |
| Tự phục hồi khi worker crash | Debug khó hơn — log từ nhiều workers trộn lẫn |

---

# 5. PM2

## PM2 là gì?

PM2 là **công cụ quản lý tiến trình** cho Node.js trong production. Nói đơn giản: **PM2 làm Cluster tự động + thêm nhiều tính năng giám sát**.

Thay vì bạn phải viết code Master/Worker như phần 4, PM2 làm hết cho bạn bằng **1 dòng lệnh**.

## So sánh: Cluster thủ công vs PM2

```
Cluster thủ công:
  ✅ Bạn tự viết code Master/Worker       (20+ dòng code)
  ✅ Bạn tự code restart khi crash         (phải code)
  ✅ Bạn tự code graceful reload           (phức tạp)
  ❌ Không có monitoring                    (phải dùng tool khác)
  ❌ Không có log management                (phải dùng tool khác)

PM2:
  ✅ 1 dòng lệnh: pm2 start app.js -i max  (xong!)
  ✅ Tự restart khi crash                    (có sẵn)
  ✅ Zero-downtime reload                    (pm2 reload)
  ✅ Monitoring CPU, RAM realtime            (pm2 monit)
  ✅ Log management                          (pm2 logs)
```

## Cài đặt và các lệnh quan trọng

```bash
# Cài đặt PM2 toàn cục
npm install -g pm2
```

### Khởi động ứng dụng

```bash
# Chạy ứng dụng với cluster mode — PM2 tự tạo workers
pm2 start dist/main.js -i max
#                        │  │
#                        │  └── max = tạo worker bằng số nhân CPU
#                        └──── -i = instances (cluster mode)

# Ví dụ cụ thể:
pm2 start dist/main.js -i 4        # 4 instances cố định
pm2 start dist/main.js -i max      # Bằng số nhân CPU
pm2 start dist/main.js -i 0        # Tương tự max
pm2 start dist/main.js --name api  # Đặt tên cho dễ quản lý
```

### Quản lý

```bash
pm2 list              # Xem danh sách tất cả ứng dụng
pm2 logs              # Xem log realtime (tất cả workers)
pm2 logs api          # Xem log của ứng dụng cụ thể
pm2 monit             # Mở dashboard giám sát CPU, RAM
pm2 show api          # Chi tiết ứng dụng (uptime, restarts, memory...)
```

### Restart vs Reload (QUAN TRỌNG)

```bash
pm2 restart api       # RESTART: Dừng TẤT CẢ workers → Khởi động lại
                      # → CÓ DOWNTIME: trong lúc restart, không ai xử lý request

pm2 reload api        # RELOAD: Khởi động workers MỚI → Chuyển traffic sang → Dừng workers CŨ
                      # → ZERO DOWNTIME: luôn có ít nhất 1 worker đang chạy
```

```
pm2 restart (CÓ downtime):
  Worker 1: ████ STOP ──── START ████
  Worker 2: ████ STOP ──── START ████
                   ↑ Khoảng này KHÔNG có ai xử lý request

pm2 reload (KHÔNG có downtime):
  Worker 1 (cũ): ████████████ STOP
  Worker 1 (mới):        START ████████████
  Worker 2 (cũ): ████████████████ STOP
  Worker 2 (mới):             START ████████████
                  Luôn có ít nhất 1 worker đang chạy
```

**Production luôn dùng `pm2 reload`**, không bao giờ `pm2 restart`.

### Dừng và xóa

```bash
pm2 stop api          # Dừng ứng dụng (vẫn trong danh sách)
pm2 delete api        # Xóa ứng dụng khỏi danh sách
pm2 stop all          # Dừng tất cả
pm2 delete all        # Xóa tất cả
```

## File cấu hình `ecosystem.config.js`

Thay vì nhớ các tham số dòng lệnh, lưu vào file cấu hình:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    // Thông tin cơ bản
    name: 'my-api',                    // Tên hiển thị trong pm2 list
    script: 'dist/main.js',            // File khởi động

    // Cluster mode
    instances: 'max',                   // Số workers = số nhân CPU
    exec_mode: 'cluster',              // Bật cluster mode

    // Tự phục hồi
    autorestart: true,                  // Tự restart khi crash
    max_restarts: 10,                   // Tối đa 10 lần restart liên tiếp
    min_uptime: '10s',                  // Nếu chạy < 10s rồi crash → đếm là restart liên tiếp
    max_memory_restart: '500M',         // Restart khi dùng > 500MB RAM (tránh memory leak)

    // Không watch file trong production!
    watch: false,

    // Biến môi trường
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
}
```

```bash
# Chạy từ file cấu hình — 1 lệnh duy nhất
pm2 start ecosystem.config.js

# Reload zero-downtime
pm2 reload ecosystem.config.js
```

## PM2 khởi động cùng hệ thống

```bash
# Tạo script khởi động — PM2 tự chạy khi server reboot
pm2 startup
# PM2 sẽ in ra 1 lệnh — copy và chạy lệnh đó

# Lưu danh sách ứng dụng hiện tại
pm2 save
# Từ giờ, khi server reboot → PM2 tự khởi động + tự chạy lại tất cả ứng dụng
```

---

# 6. So sánh chi tiết

## Worker Threads vs Cluster — Khác nhau cơ bản

| | Worker Threads | Cluster |
|---|---------------|---------|
| **Tạo gì** | **Thread** mới trong cùng 1 process | **Process** mới (bản sao hoàn chỉnh) |
| **Bộ nhớ** | Chia sẻ được (SharedArrayBuffer) | Riêng biệt hoàn toàn |
| **Chi phí tạo** | Nhẹ hơn (~vài MB) | Nặng hơn (~30-50MB mỗi process) |
| **Mục đích** | Offload 1 tác vụ CPU nặng | Tăng throughput cho HTTP server |
| **Giao tiếp** | `postMessage()` + SharedArrayBuffer | IPC (Inter-Process Communication) |
| **Crash** | Thread crash → có thể ảnh hưởng process | Process crash → hoàn toàn độc lập |

## Khi nào dùng cái nào?

```
Câu hỏi: "Tôi có 1 tác vụ CPU nặng (hash, nén ảnh, ML)"
→ Dùng WORKER THREADS
→ Main thread vẫn tự do xử lý request
→ Worker xử lý tác vụ nặng song song

Câu hỏi: "Server nhận nhiều request, 1 process xử lý không kịp"
→ Dùng CLUSTER (hoặc PM2)
→ Nhiều process cùng lắng nghe 1 port
→ OS phân phối request cho process nào rảnh

Câu hỏi: "Cả hai vấn đề trên?"
→ Dùng CẢ HAI
→ Cluster để tăng throughput
→ Worker Threads trong mỗi cluster worker để xử lý tác vụ nặng
```

## Có thể kết hợp cả hai

```
PM2 Cluster (4 workers)
  │
  ├── Worker Process 1 (nhân CPU 1)
  │     └── Tạo Worker Threads khi cần tính toán nặng
  │
  ├── Worker Process 2 (nhân CPU 2)
  │     └── Tạo Worker Threads khi cần tính toán nặng
  │
  ├── Worker Process 3 (nhân CPU 3)
  │     └── Tạo Worker Threads khi cần tính toán nặng
  │
  └── Worker Process 4 (nhân CPU 4)
        └── Tạo Worker Threads khi cần tính toán nặng
```

---

# 7. Câu hỏi phỏng vấn

## Câu 1: Node.js là single-threaded, vậy làm sao tận dụng đa nhân CPU?

**Trả lời**: "Khi nói single-threaded, ta chỉ nói JavaScript code chạy trên 1 main thread. Để tận dụng đa nhân, có 2 cách: Cluster module fork nhiều process, mỗi process lắng nghe cùng 1 port trên nhân CPU riêng — tăng throughput. Worker Threads tạo thread mới trong cùng process — offload tác vụ CPU-intensive. Trong production, PM2 cluster mode là cách phổ biến nhất vì dễ dùng và tự quản lý restart."

## Câu 2: Worker Threads khác child_process thế nào?

**Trả lời**: "Worker Threads tạo thread trong cùng 1 process — nhẹ hơn, chia sẻ bộ nhớ được qua SharedArrayBuffer, và chỉ chạy JavaScript. child_process tạo process hoàn toàn mới — nặng hơn, bộ nhớ riêng biệt, nhưng có thể chạy chương trình bất kỳ (Python, shell script). Dùng Worker Threads cho tính toán JavaScript nặng, child_process khi cần gọi chương trình bên ngoài."

## Câu 3: Cluster workers chia sẻ bộ nhớ được không?

**Trả lời**: "Không. Mỗi cluster worker là process riêng biệt với RAM riêng. Nếu cần shared state như session hay cache, phải dùng giải pháp bên ngoài — Redis là phổ biến nhất. Đây là lý do Redis gần như bắt buộc trong kiến trúc cluster: session store, cache, pub/sub đều qua Redis."

## Câu 4: PM2 reload khác restart thế nào?

**Trả lời**: "Restart dừng tất cả workers rồi khởi động lại — có khoảng downtime, request bị mất. Reload khởi động worker mới trước, chuyển traffic sang, rồi mới dừng worker cũ — zero downtime, không mất request nào. Trong production, luôn dùng `pm2 reload` để deploy version mới."

## Câu 5: Khi nào KHÔNG cần Worker Threads?

**Trả lời**: "Khi tác vụ là I/O-bound — query database, đọc file, gọi API. Node.js Event Loop và libuv đã xử lý I/O bất đồng bộ rất tốt mà không cần thread riêng. Worker Threads chỉ cần cho tác vụ CPU-bound — tính toán liên tục chiếm CPU trên 100ms. Ví dụ: CRUD API thông thường, REST endpoint đơn giản → không cần Worker Threads."

## Câu 6: Nếu có 4 nhân CPU, tạo bao nhiêu cluster workers?

**Trả lời**: "Thường tạo bằng số nhân CPU — 4 nhân thì 4 workers. PM2 dùng `-i max` để tự detect. Tuy nhiên, nếu ứng dụng dùng nhiều RAM, có thể giảm số workers để tránh hết RAM. Ví dụ: server 4GB RAM, mỗi worker dùng 300MB → tối đa ~10 workers, nhưng 4 nhân CPU → chỉ nên 4 workers."

---

## Tham khảo

| Nguồn | Đường dẫn |
|-------|-----------|
| Worker Threads API | [nodejs.org/api/worker_threads.html](https://nodejs.org/api/worker_threads.html) |
| Cluster API | [nodejs.org/api/cluster.html](https://nodejs.org/api/cluster.html) |
| PM2 Documentation | [pm2.keymetrics.io](https://pm2.keymetrics.io/) |
