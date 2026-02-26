# Node.js Fundamentals — Bổ sung thiếu từ Roadmap

> 📅 Tạo: 2026-02-26
> 🎯 Bổ sung các topic thiếu từ [roadmap.sh/nodejs](https://roadmap.sh/nodejs)

---

## 1. npm, yarn, pnpm — So sánh Package Managers

### 1.1 npm (Node Package Manager)

- **Mặc định** — cài sẵn cùng Node.js
- `package.json` — khai báo dependencies, scripts
- `package-lock.json` — lock version chính xác
- `node_modules/` — thư mục chứa packages

```bash
npm init -y                    # Tạo package.json
npm install express            # Cài dependency (production)
npm install -D jest            # Cài devDependency
npm install -g nodemon         # Cài global
npm uninstall express          # Gỡ package
npm update                     # Cập nhật packages
npm run dev                    # Chạy script "dev" trong package.json
npx create-nest-app my-app     # Chạy package mà không cần install
```

### 1.2 Semantic Versioning (SemVer)

```
  MAJOR.MINOR.PATCH    Ví dụ: 2.4.1
    │     │     │
    │     │     └── Patch: sửa bug, không thay đổi API
    │     └──────── Minor: thêm feature, backward compatible
    └────────────── Major: breaking changes
```

| Ký hiệu | Ý nghĩa | Ví dụ | Phạm vi |
|----------|---------|-------|---------|
| `^2.4.1` | **Caret** (mặc định) | Cho phép update Minor + Patch | `>=2.4.1 <3.0.0` |
| `~2.4.1` | **Tilde** | Chỉ cho phép update Patch | `>=2.4.1 <2.5.0` |
| `2.4.1` | **Exact** | Chính xác version này | `2.4.1` |
| `*` | **Any** | Bất kỳ version nào | Nguy hiểm! |

> 💡 `^` là mặc định khi `npm install`. Dùng `package-lock.json` để đảm bảo cả team cài đúng version.

### 1.3 package.json quan trọng

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start:prod": "node dist/main",
    "test": "jest",
    "lint": "eslint . --fix"
  },
  "dependencies": {          // Production — cần khi chạy app
    "express": "^4.18.0",
    "@nestjs/core": "^10.0.0"
  },
  "devDependencies": {       // Development — chỉ cần khi dev
    "jest": "^29.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {               // Yêu cầu Node.js version
    "node": ">=18.0.0"
  }
}
```

### 1.4 So sánh npm vs yarn vs pnpm

| Tiêu chí | npm | yarn | pnpm |
|----------|-----|------|------|
| **Đi kèm Node.js** | ✅ Có | ❌ Cài riêng | ❌ Cài riêng |
| **Tốc độ** | Chậm nhất | Nhanh hơn npm | ⚡ **Nhanh nhất** |
| **Dung lượng disk** | Lớn (duplicate packages) | Lớn | ⚡ **Nhỏ nhất** (content-addressable store) |
| **Lock file** | `package-lock.json` | `yarn.lock` | `pnpm-lock.yaml` |
| **Cài đặt** | `npm install` | `yarn` / `yarn install` | `pnpm install` |
| **Thêm package** | `npm install pkg` | `yarn add pkg` | `pnpm add pkg` |
| **Gỡ package** | `npm uninstall pkg` | `yarn remove pkg` | `pnpm remove pkg` |
| **Chạy script** | `npm run dev` | `yarn dev` | `pnpm dev` |
| **Workspaces** | ✅ (npm 7+) | ✅ (yarn 1.0+) | ✅ |
| **node_modules** | Flat (hoisted) | Flat (hoisted) | **Nested + symlinks** |
| **Phantom dependencies** | ⚠️ Có thể | ⚠️ Có thể | ✅ **Không** (strict) |
| **Phổ biến** | ⭐ Cao nhất | ⭐ Cao | ⭐ Đang tăng nhanh |

### 1.5 pnpm — Tại sao nhanh và tiết kiệm?

```
npm/yarn:
  project-a/node_modules/lodash/  → 1.2MB (copy)
  project-b/node_modules/lodash/  → 1.2MB (copy)   ← DUPLICATE!

pnpm:
  ~/.pnpm-store/lodash@4.17.21/  → 1.2MB (1 bản duy nhất)
  project-a/node_modules/lodash  → symlink ↑
  project-b/node_modules/lodash  → symlink ↑        ← TIẾT KIỆM!
```

**Content-Addressable Store**: pnpm lưu packages vào 1 global store, các project dùng chung qua **symlinks** → không duplicate, tiết kiệm disk, cài nhanh hơn.

**Phantom Dependencies**: npm/yarn hoisting cho phép import package mà bạn KHÔNG khai báo trong `package.json` (vì nó nằm ở thư mục cha). pnpm chặn điều này → code an toàn hơn.

### 1.6 npx là gì?

```bash
# npx = chạy package KHÔNG cần install global
npx create-next-app my-app    # Tải + chạy + xóa
npx ts-node script.ts         # Chạy TypeScript trực tiếp
npx -y prisma migrate dev     # -y = auto yes
```

> 💡 **Phỏng vấn hay hỏi**: *"npm vs yarn vs pnpm khác nhau thế nào?"* → Trả lời: npm là default, yarn nhanh hơn npm, **pnpm nhanh nhất + tiết kiệm disk nhất** nhờ content-addressable store và symlinks. pnpm còn chặn phantom dependencies — an toàn hơn. Chọn pnpm nếu bắt đầu project mới.

---

## 2. Environment Variables

### 2.1 process.env

```javascript
// Truy cập biến môi trường
console.log(process.env.NODE_ENV)     // "development" | "production"
console.log(process.env.DATABASE_URL) // "postgresql://..."
console.log(process.env.PORT)         // "3000" (LUÔN LÀ STRING!)

// ⚠️ process.env values LUÔN LÀ STRING
const port = parseInt(process.env.PORT, 10) || 3000
```

### 2.2 dotenv

```bash
npm install dotenv
```

```
# .env (KHÔNG commit lên git!)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
JWT_SECRET=super-secret-key
```

```javascript
// Cách 1: Import ở đầu file
import 'dotenv/config'

// Cách 2: Config thủ công
import dotenv from 'dotenv'
dotenv.config()

// Sau đó dùng bình thường
console.log(process.env.DATABASE_URL)
```

### 2.3 Validation với Zod (Best Practice)

```typescript
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
})

// Validate khi khởi động — fail fast nếu thiếu
const env = envSchema.parse(process.env)

// TypeScript biết chính xác type!
env.PORT    // number
env.NODE_ENV // "development" | "production" | "test"
```

> ⚠️ **Luôn thêm `.env` vào `.gitignore`!** Tạo `.env.example` (không có giá trị) để team biết cần biến nào.

---

## 3. File System — fs & path modules

### 3.1 path module

```javascript
import path from 'node:path'

path.join('/users', 'phuc', 'file.txt')
// → '/users/phuc/file.txt' (tự thêm separator đúng OS)

path.resolve('src', 'index.ts')
// → 'D:/VSCodeProject/src/index.ts' (absolute path)

path.basename('/users/phuc/file.txt')     // → 'file.txt'
path.extname('/users/phuc/file.txt')      // → '.txt'
path.dirname('/users/phuc/file.txt')      // → '/users/phuc'

// __dirname, __filename (CommonJS)
console.log(__dirname)   // Thư mục chứa file hiện tại
console.log(__filename)  // Đường dẫn đầy đủ file hiện tại

// ESM equivalent (import.meta)
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
```

### 3.2 fs module

```javascript
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'  // ← KHUYẾN KHÍCH

// ❌ Synchronous — BLOCK Event Loop
const data = fs.readFileSync('file.txt', 'utf-8')

// ✅ Async với Promises — KHÔNG block
const data = await fsPromises.readFile('file.txt', 'utf-8')

// ✅ Async với callback
fs.readFile('file.txt', 'utf-8', (err, data) => {
  if (err) throw err
  console.log(data)
})

// Ghi file
await fsPromises.writeFile('output.txt', 'Hello World')

// Thêm nội dung (append)
await fsPromises.appendFile('log.txt', 'New line\n')

// Kiểm tra file tồn tại
await fsPromises.access('file.txt')  // Throws nếu không tồn tại

// Đọc thư mục
const files = await fsPromises.readdir('./src')

// Tạo thư mục (recursive)
await fsPromises.mkdir('./dist/assets', { recursive: true })

// Xóa file/thư mục
await fsPromises.unlink('file.txt')
await fsPromises.rm('./dist', { recursive: true, force: true })
```

> 💡 **Luôn dùng `fs/promises`** thay vì `fs` sync — tránh block Event Loop. Chỉ dùng sync khi đọc config lúc khởi động.

---

## 4. process Object

### 4.1 Các thuộc tính quan trọng

```javascript
// Thông tin môi trường
process.env.NODE_ENV         // Biến môi trường
process.version              // "v20.11.0"
process.platform             // "win32" | "linux" | "darwin"
process.pid                  // Process ID
process.cwd()                // Thư mục hiện tại (chạy lệnh node từ đâu)
process.memoryUsage()        // { rss, heapTotal, heapUsed, external }

// Arguments
process.argv                 // Mảng arguments
// node script.js --port 3000
// → ['node', 'script.js', '--port', '3000']

// I/O
process.stdin                // Readable stream — nhận input
process.stdout               // Writable stream — xuất output
process.stderr               // Writable stream — xuất error

// Thoát
process.exit(0)              // Thoát thành công
process.exit(1)              // Thoát với lỗi
process.exitCode = 1         // Set exit code mà không thoát ngay
```

### 4.2 Exit Codes quan trọng

| Code | Ý nghĩa |
|------|---------|
| `0` | Thành công |
| `1` | Lỗi chung (uncaught exception) |
| `2` | Unused (reserved) |
| `9` | Invalid argument |
| `12` | Invalid debug port |

### 4.3 Process Events

```javascript
// Bắt lỗi chưa handle
process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err)
  process.exit(1)  // NÊN thoát sau uncaught exception
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise:', reason)
  // Từ Node 15+: mặc định crash process
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  server.close(() => {
    db.disconnect()
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  // Ctrl+C
  console.log('Received SIGINT')
  process.exit(0)
})
```

---

## 5. Logging

### 5.1 console (Built-in)

```javascript
console.log('Info')           // stdout
console.error('Error')        // stderr
console.warn('Warning')       // stderr
console.table([{a:1}, {a:2}]) // Hiển thị bảng
console.time('db')            // Bắt đầu timer
// ... some work
console.timeEnd('db')         // "db: 45ms"
```

### 5.2 Winston (Production logging)

```bash
npm install winston
```

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',              // error > warn > info > debug
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),      // Log dạng JSON (dễ parse)
  ),
  transports: [
    // Ghi vào file
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    // Hiển thị console (chỉ dev)
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console({ format: winston.format.simple() })]
      : []),
  ],
})

logger.info('Server started', { port: 3000 })
logger.error('Database connection failed', { error: err.message })
logger.warn('Deprecated API called', { endpoint: '/api/v1/users' })
```

### 5.3 Log Levels

```
error  (0) — Lỗi nghiêm trọng, cần fix ngay
warn   (1) — Cảnh báo, có thể gây lỗi
info   (2) — Thông tin chung (server start, request info)
debug  (3) — Chi tiết debug (biến, state)
```

> 💡 Production chỉ nên log `error` + `warn` + `info`. Dùng `debug` khi dev.

---

## 6. Debugging

### 6.1 node --inspect

```bash
# Chạy với debugger
node --inspect src/main.js
# → Debugger listening on ws://127.0.0.1:9229

# Dừng ở dòng đầu tiên
node --inspect-brk src/main.js
```

Sau đó mở **Chrome DevTools** → `chrome://inspect` → Connect.

### 6.2 VS Code Debugger

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 6.3 Debugging Tips

| Tip | Mô tả |
|-----|-------|
| `debugger` statement | Đặt trong code → dừng tại dòng đó khi debugger attached |
| Breakpoints | Click cạnh số dòng trong VS Code |
| `console.trace()` | In stack trace tại điểm gọi |
| `node --trace-warnings` | Hiển thị stack trace cho warnings |

---

## 7. Câu hỏi phỏng vấn

### Q1: npm, yarn, pnpm khác nhau thế nào?

**A:** "npm là package manager mặc định của Node.js. yarn do Facebook tạo, nhanh hơn npm nhờ parallel installation. **pnpm là nhanh nhất và tiết kiệm disk nhất** — nó dùng **content-addressable store** lưu packages 1 lần duy nhất, các project dùng chung qua **symlinks**. pnpm còn chặn **phantom dependencies** — không cho import package chưa khai báo trong `package.json` — an toàn hơn npm/yarn."

### Q2: Semantic Versioning là gì? `^` và `~` khác nhau?

**A:** "SemVer gồm `MAJOR.MINOR.PATCH`. **Caret `^`** (mặc định) cho phép update minor + patch — ví dụ `^2.4.1` chấp nhận bất kỳ `2.x.x`. **Tilde `~`** chỉ cho phép update patch — ví dụ `~2.4.1` chỉ chấp nhận `2.4.x`. Lock file (`package-lock.json`) đảm bảo cả team cài đúng version."

### Q3: `dependencies` vs `devDependencies`?

**A:** "`dependencies` là packages **cần khi chạy production** — express, prisma, nestjs. `devDependencies` là packages **chỉ cần khi dev** — jest, typescript, eslint. Khi deploy, chạy `npm install --production` để không cài devDependencies → giảm dung lượng."

### Q4: Tại sao phải validate environment variables?

**A:** "Vì `process.env` values **luôn là string** và có thể undefined. Nếu thiếu `DATABASE_URL` mà app không check, nó sẽ crash ở nơi kết nối DB — khó debug. Validate bằng **Zod** khi khởi động giúp **fail fast** với thông báo rõ ràng: 'Missing DATABASE_URL' thay vì 'Cannot connect to undefined'."

### Q5: `fs.readFile` vs `fs.readFileSync`?

**A:** "`readFileSync` **block Event Loop** — toàn bộ server dừng lại đợi đọc file xong. `readFile` (async) **không block** — đưa task vào libuv thread pool, Event Loop tiếp tục xử lý request khác. Luôn dùng async `fs/promises` trong production. Chỉ dùng sync khi đọc config lúc khởi động."

### Q6: Graceful Shutdown là gì?

**A:** "Khi server nhận SIGTERM (ví dụ PM2 restart), **không nên tắt ngay** vì có thể đang xử lý request. Graceful shutdown: (1) ngừng nhận request mới, (2) đợi request đang xử lý xong, (3) đóng kết nối DB, (4) rồi mới thoát. Dùng `process.on('SIGTERM', ...)` để handle."

---

## Tham khảo

| Nguồn | Đường dẫn |
|-------|-----------|
| npm Docs | [docs.npmjs.com](https://docs.npmjs.com) |
| pnpm Docs | [pnpm.io](https://pnpm.io) |
| Node.js fs | [nodejs.org/api/fs.html](https://nodejs.org/api/fs.html) |
| Node.js process | [nodejs.org/api/process.html](https://nodejs.org/api/process.html) |
| Winston | [github.com/winstonjs/winston](https://github.com/winstonjs/winston) |
| roadmap.sh | [roadmap.sh/nodejs](https://roadmap.sh/nodejs) |
