# Node.js — Streams & Buffers

> **Streams** là một trong những khái niệm mạnh nhất của Node.js — cho phép xử lý dữ liệu **từng phần** thay vì đọc toàn bộ vào bộ nhớ. Rất quan trọng cho phỏng vấn về hiệu suất và xử lý file lớn.
>
> Tham khảo: [Node.js Streams API](https://nodejs.org/api/stream.html)

---

## Mục lục

1. [Streams là gì?](#1-streams-là-gì)
2. [Buffer là gì?](#2-buffer-là-gì)
3. [Bốn loại Stream](#3-bốn-loại-stream)
4. [Ví dụ thực tế](#4-ví-dụ-thực-tế)
5. [Pipe — Nối các stream](#5-pipe)
6. [Backpressure — Vấn đề quan trọng](#6-backpressure)
7. [Streams trong NestJS](#7-streams-trong-nestjs)
8. [Câu hỏi phỏng vấn](#8-câu-hỏi-phỏng-vấn)

---

# 1. Streams là gì?

## Vấn đề: Đọc file lớn

```javascript
// ❌ Đọc toàn bộ file vào bộ nhớ — file 2GB = cần 2GB RAM
const data = fs.readFileSync('video.mp4')
res.send(data)  // Chờ đọc xong toàn bộ mới gửi
```

**Vấn đề**: File 2GB → cần 2GB RAM. 10 user cùng tải → 20GB RAM. Server chết.

## Giải pháp: Streams

```javascript
// ✅ Đọc từng phần (chunk) — bộ nhớ chỉ dùng vài MB
const stream = fs.createReadStream('video.mp4')
stream.pipe(res)  // Đọc 1 phần → gửi → đọc phần tiếp → gửi → ...
```

**Stream** xử lý dữ liệu **từng mảnh nhỏ** (chunk), không cần tải toàn bộ vào RAM.

```
Không có Stream:           Có Stream:
[Đọc toàn bộ 2GB]         [Đọc 64KB] → [Gửi] → [Đọc 64KB] → [Gửi] → ...
       ↓                       ↓
[Gửi 2GB 1 lần]           Bộ nhớ: chỉ 64KB
Bộ nhớ: 2GB               Thời gian phản hồi: gần như ngay lập tức
Thời gian: phải chờ đọc xong
```

---

# 2. Buffer là gì?

**Buffer** là vùng nhớ tạm chứa dữ liệu nhị phân (binary data). Khi stream đọc dữ liệu, mỗi chunk là 1 Buffer.

```javascript
// Tạo Buffer
const buf1 = Buffer.from('Xin chào')           // Từ string
const buf2 = Buffer.from([0x48, 0x65, 0x6C])   // Từ bytes
const buf3 = Buffer.alloc(10)                    // Buffer rỗng 10 bytes

console.log(buf1)            // <Buffer 58 69 6e 20 63 68 c3 a0 6f>
console.log(buf1.toString()) // "Xin chào"
console.log(buf1.length)     // 10 (bytes, không phải ký tự)
```

**Buffer vs String**:

| | Buffer | String |
|---|--------|--------|
| **Chứa gì** | Dữ liệu nhị phân thô | Văn bản (UTF-16) |
| **Dùng khi** | File, ảnh, video, mạng | Văn bản, JSON |
| **Kích thước** | Cố định sau khi tạo | Thay đổi được |
| **Hiệu suất** | Nhanh hơn cho I/O | Linh hoạt hơn cho text |

---

# 3. Bốn loại Stream

| Loại | Dùng khi | Ví dụ |
|------|---------|-------|
| **Readable** | Đọc dữ liệu | `fs.createReadStream()`, `http request`, `process.stdin` |
| **Writable** | Ghi dữ liệu | `fs.createWriteStream()`, `http response`, `process.stdout` |
| **Duplex** | Vừa đọc vừa ghi | `net.Socket`, `TCP connection` |
| **Transform** | Đọc, biến đổi, ghi | `zlib.createGzip()`, `crypto.createCipher()` |

## Readable Stream — Đọc dữ liệu

```javascript
const readable = fs.createReadStream('data.csv', {
  encoding: 'utf-8',
  highWaterMark: 64 * 1024,  // Đọc 64KB mỗi lần (mặc định)
})

// Cách 1: Event 'data' — nhận từng chunk
readable.on('data', (chunk) => {
  console.log(`Nhận ${chunk.length} bytes`)
  // Xử lý chunk...
})

readable.on('end', () => {
  console.log('Đọc xong')
})

readable.on('error', (err) => {
  console.error('Lỗi đọc:', err)
})
```

## Writable Stream — Ghi dữ liệu

```javascript
const writable = fs.createWriteStream('output.txt')

writable.write('Dòng 1\n')
writable.write('Dòng 2\n')
writable.end('Dòng cuối\n')  // Ghi xong + đóng stream

writable.on('finish', () => {
  console.log('Ghi xong')
})
```

## Transform Stream — Biến đổi dữ liệu

```javascript
import { Transform } from 'stream'

// Biến đổi text thành UPPERCASE
const upperCaseTransform = new Transform({
  transform(chunk, encoding, callback) {
    const upper = chunk.toString().toUpperCase()
    callback(null, upper)  // null = không lỗi, upper = dữ liệu đã biến đổi
  }
})

// Sử dụng: đọc file → chuyển uppercase → ghi file
fs.createReadStream('input.txt')
  .pipe(upperCaseTransform)
  .pipe(fs.createWriteStream('output.txt'))
```

---

# 4. Ví dụ thực tế

## Copy file lớn (không tốn RAM)

```javascript
function copyFile(src, dest) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(src)
    const writeStream = fs.createWriteStream(dest)

    readStream
      .pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject)
  })
}

// Copy file 10GB — bộ nhớ chỉ dùng vài MB
await copyFile('database.bak', 'backup/database.bak')
```

## Nén file (Transform Stream)

```javascript
const zlib = require('zlib')

// Nén: đọc file → gzip → ghi file.gz
fs.createReadStream('data.json')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('data.json.gz'))

// Giải nén: đọc file.gz → gunzip → ghi file
fs.createReadStream('data.json.gz')
  .pipe(zlib.createGunzip())
  .pipe(fs.createWriteStream('data.json'))
```

## Download file qua HTTP

```javascript
import http from 'http'

http.createServer((req, res) => {
  const fileStream = fs.createReadStream('video.mp4')
  res.setHeader('Content-Type', 'video/mp4')
  fileStream.pipe(res)  // Stream trực tiếp từ file sang HTTP response
})
```

---

# 5. Pipe

## Pipe là gì?

`pipe()` **nối** output của stream này vào input của stream khác. Giống như nối ống nước.

```
ReadableStream ─── pipe() ───▶ WritableStream
ReadableStream ─── pipe() ───▶ TransformStream ─── pipe() ───▶ WritableStream
```

```javascript
// Đọc file → biến uppercase → nén → ghi file
fs.createReadStream('input.txt')
  .pipe(upperCaseTransform)   // Biến đổi
  .pipe(zlib.createGzip())    // Nén
  .pipe(fs.createWriteStream('output.txt.gz'))  // Ghi
```

## pipeline() — Phiên bản an toàn hơn

`pipe()` không tự xử lý lỗi tốt. Dùng `pipeline()` (Node.js 10+):

```javascript
import { pipeline } from 'stream/promises'

await pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('output.gz'),
)
// Tự dọn dẹp stream khi lỗi — không rò rỉ tài nguyên
```

---

# 6. Backpressure

## Vấn đề

Khi nguồn đọc **nhanh hơn** đích ghi → dữ liệu chất đống trong bộ nhớ → RAM tăng vọt.

```
Đọc: 100MB/s ──────▶ Ghi: 10MB/s
                          │
                    Dữ liệu chất đống
                    → RAM tăng vọt!
```

## pipe() tự xử lý Backpressure

`pipe()` tự động **tạm dừng** readable khi writable chưa xử lý kịp:

```
1. Readable đọc chunk → gửi cho Writable
2. Writable buffer đầy → trả `write()` = false
3. Readable TẠM DỪNG đọc (pause)
4. Writable xử lý xong buffer → emit 'drain'
5. Readable TIẾP TỤC đọc (resume)
```

Đây là lý do **nên dùng `pipe()`** thay vì đọc thủ công bằng event `data`.

---

# 7. Streams trong NestJS

## Trả response bằng StreamableFile

```typescript
import { Controller, Get, StreamableFile } from '@nestjs/common'
import { createReadStream } from 'fs'

@Controller('files')
export class FileController {
  @Get('download')
  getFile(): StreamableFile {
    const file = createReadStream('reports/monthly.pdf')
    return new StreamableFile(file, {
      type: 'application/pdf',
      disposition: 'attachment; filename="report.pdf"',
    })
  }
}
```

## Upload file lớn

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Multer dùng streams nội bộ — không load toàn bộ file vào RAM
  const writeStream = fs.createWriteStream(`uploads/${file.originalname}`)
  writeStream.write(file.buffer)
  writeStream.end()
}
```

---

# 8. Câu hỏi phỏng vấn

## Câu 1: Stream khác Buffer thế nào?

**Trả lời**: "Stream là cơ chế xử lý dữ liệu từng phần (chunk by chunk) theo thời gian. Buffer là vùng nhớ tạm chứa dữ liệu nhị phân. Khi stream đọc dữ liệu, mỗi phần dữ liệu là 1 Buffer. Stream giải quyết vấn đề bộ nhớ — không cần load toàn bộ file vào RAM."

## Câu 2: Khi nào dùng Stream?

**Trả lời**: "Khi xử lý dữ liệu lớn: đọc/ghi file lớn, download/upload, video streaming, xử lý CSV/log hàng triệu dòng, nén/giải nén. Bất kỳ khi nào dữ liệu lớn hơn RAM khả dụng hoặc cần response ngay mà không chờ đọc xong toàn bộ."

## Câu 3: Backpressure là gì? Tại sao quan trọng?

**Trả lời**: "Backpressure xảy ra khi nguồn đọc nhanh hơn đích ghi — dữ liệu chất đống trong bộ nhớ. `pipe()` tự xử lý bằng cách tạm dừng readable khi writable chưa kịp xử lý. Nếu đọc thủ công bằng event 'data' mà không xử lý backpressure → RAM tăng vọt, server crash."

## Câu 4: `pipe()` khác `pipeline()` thế nào?

**Trả lời**: "`pipe()` không tự dọn dẹp stream khi lỗi — có thể rò rỉ tài nguyên. `pipeline()` (Node.js 10+) tự destroy tất cả stream khi có lỗi ở bất kỳ bước nào, an toàn hơn. Nên dùng `pipeline()` trong production."

---

## Tham khảo

| Nguồn | Đường dẫn |
|-------|-----------|
| Node.js Streams | [nodejs.org/api/stream.html](https://nodejs.org/api/stream.html) |
| Node.js Buffer | [nodejs.org/api/buffer.html](https://nodejs.org/api/buffer.html) |
