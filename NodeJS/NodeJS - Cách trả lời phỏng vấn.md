# 🎙️ Node.js — Hướng Dẫn Trả Lời Phỏng Vấn

> Tài liệu này hướng dẫn bạn **cách trả lời trôi chảy** từng câu hỏi phỏng vấn Node.js.
> Mỗi câu có **bài mẫu như đang nói**, kèm **cấu trúc logic** và **mẹo ghi điểm**.

---

## 📌 Quy tắc vàng khi trả lời phỏng vấn

1. **Luôn bắt đầu bằng 1 câu định nghĩa ngắn gọn** → rồi mới đi sâu
2. **Dùng cấu trúc "Đầu tiên... Thứ hai... Ngoài ra..."** → tạo cảm giác mạch lạc
3. **Đưa ví dụ thực tế** → chứng minh bạn hiểu, không chỉ học thuộc
4. **Nói trade-off** → thể hiện tư duy kỹ sư, không phải chỉ biết ưu điểm
5. **Kết thúc bằng 1 câu tóm tắt** → giúp người nghe nhớ

---

# PHẦN 1: NODE.JS LÀ GÌ & KIẾN TRÚC

---

## Câu 1: "Node.js là gì?"

### 🧠 Cấu trúc trả lời
```
1️⃣ Định nghĩa 1 câu → "Node.js là..."
2️⃣ Giải thích V8 Engine
3️⃣ Điểm đặc biệt: chạy JS ngoài browser
4️⃣ Làm rõ: KHÔNG phải ngôn ngữ, KHÔNG phải framework
5️⃣ Nói thêm ai tạo ra, năm nào (bonus)
```

### 🗣️ Bài trả lời mẫu

> **"Node.js là một JavaScript runtime environment — tức là một môi trường để chạy JavaScript — được xây dựng trên V8 Engine của Google Chrome.**
>
> **V8 Engine** là gì? Nó là bộ máy mà Chrome dùng để chạy JavaScript trong trình duyệt. Điểm đặc biệt của V8 là nó compile JavaScript trực tiếp thành machine code — tức mã máy — thay vì interpret từng dòng như các engine cũ. Nhờ vậy mà tốc độ rất nhanh.
>
> Trước năm 2009, JavaScript chỉ có thể chạy bên trong trình duyệt. **Ryan Dahl** — người sáng lập Node.js — đã **tách V8 ra khỏi Chrome**, rồi bổ sung thêm các khả năng của phía server như đọc ghi file, tạo HTTP server, kết nối database... Từ đó JavaScript có thể làm back-end, điều mà trước đây chỉ có Java, PHP, Python mới làm được.
>
> Một điểm quan trọng cần làm rõ: Node.js **không phải** là ngôn ngữ lập trình mới — ngôn ngữ ở đây vẫn là JavaScript. Nó cũng **không phải** là framework — Express, NestJS, Fastify... đó mới là framework chạy trên nền tảng Node.js. Node.js chỉ là **platform** — nền tảng để thực thi JavaScript ở phía server."

### ✅ Mẹo ghi điểm
- Nhắc đến **Ryan Dahl** và **năm 2009** → thể hiện bạn hiểu lịch sử
- Phân biệt rõ **runtime vs language vs framework** → rất nhiều người hiểu sai
- So sánh với JVM: *"Giống như cần JVM để chạy Java, cần Node.js để chạy JS trên server"*

---

## Câu 2: "Các đặc điểm chính / tính năng nổi bật của Node.js?"

### 🧠 Cấu trúc trả lời
```
Nêu 4-5 đặc điểm, mỗi đặc điểm:
  → Nói tên
  → Giải thích ngắn 1-2 câu
  → Liên hệ tại sao nó quan trọng
```

### 🗣️ Bài trả lời mẫu

> "Node.js có **5 đặc điểm cốt lõi** mà tôi muốn đề cập:
>
> **Thứ nhất, Single-threaded** — Node.js chạy JavaScript trên một thread duy nhất, gọi là main thread. Khác với các server truyền thống như Apache hay Tomcat, nơi mỗi request tạo ra một thread mới. Ví dụ 1000 concurrent users thì Apache cần 1000 threads, mỗi thread tốn 2-8MB RAM. Node.js chỉ cần 1 thread xử lý tất cả, nhờ kết hợp với đặc điểm tiếp theo.
>
> **Thứ hai, Non-blocking I/O** — Đây là đặc điểm quan trọng nhất. Khi Node.js gặp tác vụ I/O như đọc file, query database, hay gọi API bên ngoài — nó **không dừng lại chờ** mà đẩy task đó sang background, rồi tiếp tục xử lý request khác. Khi I/O xong, callback được gọi lại. Nhờ vậy 1 thread có thể "đồng thời" handle hàng nghìn connections.
>
> **Thứ ba, Event-driven** — Mọi thứ trong Node.js hoạt động dựa trên sự kiện. Có HTTP request mới? Đó là một event. Đọc file xong? Cũng là event. Query database trả kết quả? Event. Node.js lắng nghe và phản ứng với từng event thông qua Event Loop.
>
> **Thứ tư, V8 Engine** — Như tôi đã đề cập, V8 compile JavaScript thành machine code, khiến Node.js chạy nhanh gần bằng ngôn ngữ compiled như C++.
>
> **Cuối cùng, Cross-platform** — Node.js chạy trên Windows, macOS, Linux nhờ thư viện **libuv** đã abstract hóa hết các system calls. Developer có thể viết code trên Mac, deploy lên Linux server mà không gặp vấn đề."

### ✅ Mẹo ghi điểm
- **Giải thích WHY**, không chỉ liệt kê: *"Tại sao single-threaded lại tốt? Vì nó tiết kiệm RAM..."*
- Liên kết các đặc điểm: *"Single-threaded kết hợp non-blocking I/O cho phép..."*
- So sánh với Apache/Tomcat → cho thấy bạn hiểu bức tranh tổng thể

---

## Câu 3: "Node.js là single-threaded, vậy nó xử lý nhiều requests đồng thời như thế nào?"

### 🧠 Cấu trúc trả lời
```
1️⃣ Xác nhận: Đúng, JS code chạy trên 1 thread
2️⃣ Nhưng: libuv thread pool xử lý I/O ở background
3️⃣ Cơ chế: Event Loop điều phối
4️⃣ Ví dụ minh họa đời thực
5️⃣ So sánh với multi-threaded server
```

### 🗣️ Bài trả lời mẫu

> "Đúng là JavaScript code chạy trên **1 thread duy nhất** — main thread. Nhưng Node.js vẫn xử lý hàng nghìn concurrent requests được nhờ **2 cơ chế**:
>
> **Cơ chế 1: Non-blocking I/O kết hợp Event Loop.** Khi có request cần đọc database, Node.js *không đứng đợi kết quả*. Thay vào đó, nó đăng ký một callback rồi chuyển sang xử lý request tiếp theo. Khi database trả kết quả, callback được đẩy vào Event Queue, và Event Loop sẽ lấy ra thực thi.
>
> **Cơ chế 2: libuv Thread Pool.** Bên dưới Node.js có thư viện libuv cung cấp **thread pool** — mặc định 4 threads, có thể tăng lên. Các tác vụ I/O nặng như đọc file, mã hóa, DNS lookup sẽ được đẩy sang thread pool này. Các worker threads xử lý blocking I/O, trong khi main thread vẫn tự do handle request mới.
>
> Để dễ hình dung, tôi hay so sánh với **quán cà phê**: Ở quán truyền thống — kiểu multi-threaded — mỗi khách cần 1 nhân viên phục vụ riêng, nhân viên đứng đợi từ lúc gọi món đến khi pha xong. Nếu có 100 khách thì cần 100 nhân viên. Node.js giống **quán có 1 nhân viên order**. Nhân viên này nhận order rồi chuyển cho bếp — bếp pha xong sẽ bấm chuông — nhân viên mang cà phê ra. Trong lúc bếp pha, nhân viên tiếp tục nhận order từ khách khác. 1 nhân viên phục vụ được rất nhiều khách.
>
> Tóm lại: **Mặc dù JavaScript chạy single-threaded, nhưng I/O operations được xử lý bất đồng bộ ở background**. Node.js chỉ thực sự bị bottleneck khi có **CPU-intensive tasks** chạy lâu trên main thread — lúc đó mới cần Worker Threads."

### ✅ Mẹo ghi điểm
- **Ví dụ quán cà phê** rất dễ hiểu và ghi điểm mạnh
- Nhắc đến **libuv thread pool** (4 threads mặc định) → chi tiết kỹ thuật
- Nêu **giới hạn**: CPU-intensive tasks → cho thấy hiểu trade-off

---

## Câu 4: "Giải thích kiến trúc bên trong của Node.js?"

### 🧠 Cấu trúc trả lời
```
1️⃣ Vẽ/mô tả 4 layers từ trên xuống
2️⃣ Giải thích vai trò từng layer
3️⃣ Giải thích chúng phối hợp thế nào
4️⃣ Ví dụ: khi gọi fs.readFile() thì điều gì xảy ra?
```

### 🗣️ Bài trả lời mẫu

> "Kiến trúc Node.js gồm **4 layers**, tôi sẽ giải thích từ trên xuống:
>
> **Layer 1: Application Code** — tức là JavaScript code mà chúng ta viết: routes, controllers, business logic... Layer này thuần JavaScript.
>
> **Layer 2: Node.js Core APIs** — Đây là các built-in modules mà Node.js cung cấp sẵn, ví dụ `fs` để đọc ghi file, `http` để tạo server, `crypto` để mã hóa, `path` để xử lý đường dẫn... Các modules này được viết **một phần JavaScript, một phần C++**.
>
> **Layer 3: Node.js Bindings** — Đây là **cầu nối** giữa JavaScript ở trên và C++ ở dưới. Vì JavaScript không thể gọi trực tiếp C++ code, nên cần layer này làm "translator" — chuyển đổi tham số từ JS sang C++ và ngược lại.
>
> **Layer 4** gồm **2 engine quan trọng**:
> - **V8 Engine**: Nhận JavaScript code, parse thành AST, compile thành bytecode, rồi optimize thành machine code. V8 cũng quản lý memory với Garbage Collection.
> - **libuv**: Thư viện C, cross-platform, cung cấp **Event Loop**, **Thread Pool**, và **Async I/O**. libuv là thứ cho phép Node.js thực hiện non-blocking I/O.
>
> **Để minh họa cách chúng phối hợp**, khi bạn gọi `fs.readFile('file.txt', callback)`:
> 1. JavaScript code gọi `fs.readFile` → Layer 1
> 2. Module `fs` nhận request → Layer 2
> 3. Bindings chuyển từ JS sang C++ → Layer 3
> 4. libuv nhận task, đẩy vào thread pool để đọc file → Layer 4
> 5. Main thread **tiếp tục xử lý code khác**
> 6. Thread pool đọc xong → kết quả quay ngược lại qua bindings → callback được thực thi
>
> Tóm lại, **V8 lo phần chạy JavaScript, libuv lo phần I/O và Event Loop, bindings kết nối 2 thế giới**. Sự phối hợp này là lý do Node.js vừa nhanh vừa hiệu quả."

### ✅ Mẹo ghi điểm
- Đi theo flow cụ thể (`fs.readFile`) → interviewer thấy bạn hiểu sâu, không chỉ thuộc lý thuyết
- Nhắc **V8 compile → machine code** (không chỉ interpret)
- Nhắc **libuv là C library, cross-platform** → chi tiết kỹ thuật

---

## Câu 5: "So sánh Node.js với các backend truyền thống (Java, PHP)?"

### 🧠 Cấu trúc trả lời
```
1️⃣ Nêu sự khác biệt chính: threading model
2️⃣ So sánh cụ thể performance
3️⃣ Khi nào Node.js tốt hơn
4️⃣ Khi nào KHÔNG nên dùng Node.js
```

### 🗣️ Bài trả lời mẫu

> "Sự khác biệt lớn nhất nằm ở **cách xử lý concurrent requests**:
>
> **Backend truyền thống** như Java (Tomcat) hay PHP (Apache) dùng mô hình **multi-threaded**. Mỗi request tạo 1 thread mới, hoặc lấy từ thread pool. Thread đó sẽ **chờ đợi** mọi I/O operation hoàn tất. Ví dụ: request đến → tạo thread → query database → thread chờ → database trả kết quả → thread xử lý tiếp → trả response. Mỗi thread tốn khoảng 2-8MB RAM, nên 10,000 concurrent users cần hàng GB RAM chỉ để quản lý threads.
>
> **Node.js** dùng mô hình **single-threaded event-driven**. 1 thread xử lý tất cả requests. Khi gặp I/O, nó **không chờ** mà đăng ký callback rồi xử lý request tiếp. Khi I/O xong, callback được gọi. Kết quả: **ít tài nguyên hơn, phục vụ nhiều concurrent connections hơn**.
>
> **Node.js phù hợp hơn** khi:
> - Ứng dụng **I/O-intensive**: REST APIs, real-time chat, streaming
> - Cần **high concurrency** với nhiều connections đồng thời
> - Muốn dùng **cùng ngôn ngữ** cho frontend và backend (JavaScript)
>
> **Node.js KHÔNG phù hợp** khi:
> - Cần **CPU-intensive processing**: video encoding, machine learning, tính toán nặng — vì sẽ block Event Loop
> - Trong những trường hợp đó, Java hay Go sẽ phù hợp hơn vì tận dụng được multi-threading thực sự
>
> Tuy nhiên, từ Node.js v10+ đã có **Worker Threads** để xử lý CPU-intensive tasks trên các threads riêng, giúp giảm bớt hạn chế này."

### ✅ Mẹo ghi điểm
- **Nói được cả ưu LẪN nhược** → interviewer đánh giá cao tư duy cân bằng
- Đề cập Worker Threads → cho thấy bạn cập nhật kiến thức mới
- Dùng **con số cụ thể** (2-8MB/thread) → thuyết phục hơn

---

## Câu 6: "Khi nào KHÔNG nên dùng Node.js?"

### 🗣️ Bài trả lời mẫu

> "Node.js **không phù hợp** cho 3 loại ứng dụng:
>
> **Thứ nhất, CPU-intensive tasks** — ví dụ video encoding, image processing nặng, machine learning training, hoặc các thuật toán tính toán phức tạp. Lý do: những task này chạy lâu trên main thread, **block Event Loop**, khiến toàn bộ server không phản hồi được request nào khác trong thời gian đó.
>
> **Thứ hai, ứng dụng cần heavy multi-threading** — ví dụ game server cần xử lý physics simulation, hay rendering engine. Dù Node.js có Worker Threads, nhưng nó không được thiết kế cho shared-memory multi-threading như Java hay C++.
>
> **Thứ ba, ứng dụng cần mature ORM ecosystem** — nếu dự án cần các tính năng ORM phức tạp và ổn định lâu năm thì Java với Hibernate hay Python với SQLAlchemy vẫn mạnh hơn. Tuy nhiên, Prisma và TypeORM đang dần cải thiện điều này.
>
> **Ngược lại, Node.js cực kỳ phù hợp** cho: REST APIs, real-time apps (chat, collaboration), streaming applications, microservices, và server-side rendering."

---

## Câu 7: "V8 Engine là gì? Nó hoạt động như thế nào?"

### 🗣️ Bài trả lời mẫu

> "V8 là **JavaScript engine mã nguồn mở** của Google, được viết bằng C++. Ban đầu nó được tạo ra cho Chrome browser, sau đó Node.js lấy V8 làm core engine.
>
> V8 đặc biệt vì nó dùng **JIT Compilation** — Just-In-Time Compilation. Quá trình như sau:
>
> **Bước 1**: V8 **parse** JavaScript code thành AST — Abstract Syntax Tree — tức một cấu trúc dữ liệu đại diện cho code.
>
> **Bước 2**: Bộ compiler tên **Ignition** chuyển AST thành **bytecode** — dạng trung gian nhẹ và compact. Bytecode này được interpret và chạy.
>
> **Bước 3**: V8 theo dõi code nào chạy nhiều lần — gọi là **hot code**. Khi phát hiện hot code, một bộ compiler tối ưu tên **TurboFan** sẽ compile nó thành **highly-optimized machine code** — mã máy chạy trực tiếp trên CPU, nhanh gần bằng C++.
>
> Ngoài ra, V8 còn quản lý **memory** với Garbage Collection tự động: chia heap thành **Young Generation** (cho objects ngắn hạn, dùng Scavenger GC, rất nhanh) và **Old Generation** (cho objects tồn tại lâu, dùng Mark-Sweep-Compact GC).
>
> Tóm lại, V8 biến JavaScript từ **interpreted language thành gần như compiled language** — đó là lý do Node.js nhanh đến vậy."

---

## Câu 8: "libuv là gì và vai trò của nó?"

### 🗣️ Bài trả lời mẫu

> "**libuv** là một thư viện C, cross-platform, và là **thành phần cốt lõi** của Node.js. Nếu V8 lo phần chạy JavaScript, thì libuv lo phần **I/O và sự kiện**.
>
> libuv cung cấp 3 thứ quan trọng:
>
> **Thứ nhất, Event Loop** — trái tim của Node.js. Event Loop liên tục kiểm tra xem có event nào cần xử lý không, lấy callback từ queue ra thực thi. Nó có nhiều phases: timers, pending callbacks, poll, check, close callbacks...
>
> **Thứ hai, Thread Pool** — mặc định 4 threads, có thể tăng bằng biến môi trường `UV_THREADPOOL_SIZE`. Các tác vụ I/O nặng như đọc file, mã hóa crypto, DNS lookup được đẩy vào thread pool. Threads này chạy **blocking I/O** nhưng không ảnh hưởng main thread.
>
> **Thứ ba, Async I/O abstraction** — libuv abstract hóa các cơ chế I/O khác nhau của từng OS: `epoll` trên Linux, `kqueue` trên macOS, `IOCP` trên Windows. Nhờ vậy Node.js code viết một lần chạy mọi nơi.
>
> Tóm lại, libuv chính là thứ biến Node.js thành **non-blocking và cross-platform**."

---

## Câu 8b: "Cấu trúc bên trong libuv gồm những gì? Thread Pool hoạt động ra sao?"

### 🧠 Cấu trúc trả lời
```
1️⃣ 3 thành phần chính: Event Loop, Thread Pool, OS Async I/O
2️⃣ Thread Pool: mục đích, số lượng, tác vụ nào dùng
3️⃣ OS Async I/O: tác vụ nào dùng (networking)
4️⃣ Phân biệt rõ: cái nào dùng Thread Pool, cái nào dùng OS
5️⃣ Liên hệ: vì sao Node.js handle nhiều connections
```

### 🗣️ Bài trả lời mẫu

> "Bên trong libuv gồm **3 thành phần chính**:
>
> **Thứ nhất, Event Loop** — chạy trên main thread, là vòng lặp liên tục đi qua 6 phases: Timers, Pending Callbacks, Idle/Prepare, Poll, Check, Close Callbacks. Mỗi phase quản lý một loại callback khác nhau. Poll phase là quan trọng nhất — nơi lấy I/O events mới từ OS.
>
> **Thứ hai, Thread Pool** — mặc định **4 threads**, có thể tăng qua biến môi trường `UV_THREADPOOL_SIZE`. Thread Pool chỉ dùng cho một số tác vụ cụ thể gây **blocking**: thao tác file system (`fs.readFile`, `fs.writeFile`), mã hóa (`crypto.pbkdf2`), DNS lookup (`dns.lookup`), nén (`zlib`). Khi tác vụ hoàn tất, callback được đẩy vào event queue để Event Loop xử lý.
>
> **Thứ ba, OS Async I/O** — dùng cơ chế **non-blocking của hệ điều hành**: `epoll` trên Linux, `kqueue` trên macOS, `IOCP` trên Windows. Tác vụ **networking** (TCP, HTTP, UDP) dùng cơ chế này — **KHÔNG dùng Thread Pool**. Đây là lý do Node.js có thể handle hàng nghìn TCP connections mà không cần hàng nghìn threads.
>
> **Điểm quan trọng cần phân biệt**: Đọc file → Thread Pool. Nhận HTTP request → OS Async I/O. `dns.lookup()` → Thread Pool. `dns.resolve()` → OS Async I/O. Hiểu rõ cái nào dùng gì giúp predict performance bottleneck."

### ✅ Mẹo ghi điểm
- Phân biệt **Thread Pool vs OS Async I/O** → chi tiết mà ít người biết
- Nêu `UV_THREADPOOL_SIZE` → cho thấy hiểu configuration
- Nhắc đến `epoll/kqueue/IOCP` → hiểu cross-platform internals

---

## Câu 8c: "Node.js có Microtask Queue và Macrotask Queue không? Chúng khác nhau thế nào?"

### 🧠 Cấu trúc trả lời
```
1️⃣ Có — Node.js có cả 2 loại queue
2️⃣ Ai quản lý: Microtask = V8/Node Core, Macrotask = libuv
3️⃣ Microtask gồm gì: nextTick queue + Promise queue
4️⃣ Macrotask gồm gì: 6 phases = 6 queues
5️⃣ Thứ tự thực thi: 1 macro → quét sạch micro → 1 macro → ...
6️⃣ Thay đổi quan trọng ở Node v11+
```

### 🗣️ Bài trả lời mẫu

> "Đúng rồi, Node.js có cả **Microtask Queue** và **Macrotask Queue**, nhưng chúng do **hai hệ thống khác nhau** quản lý.
>
> **Microtask Queue** — do **V8 Engine và Node.js Core** quản lý, **KHÔNG nằm trong libuv**. Nó gồm 2 hàng đợi nhỏ:
> - **nextTick Queue**: chứa callbacks từ `process.nextTick()` — ưu tiên **cao nhất**
> - **Promise Queue**: chứa callbacks từ `Promise.then()`, `catch()`, `finally()`, `async/await`, và `queueMicrotask()`
>
> **Macrotask Queue** — do **libuv** quản lý, chính là **các phases** của Event Loop:
> - **Timers**: `setTimeout`, `setInterval`
> - **Poll**: I/O callbacks (đọc file xong, nhận data từ network)
> - **Check**: `setImmediate`
> - **Close Callbacks**: `socket.on('close')`
>
> **Thứ tự thực thi** — đây là phần quan trọng nhất: Từ **Node.js v11+**, cơ chế hoạt động là:
> 1. Chạy hết code **đồng bộ** (Call Stack)
> 2. **Quét sạch** toàn bộ Microtask Queue — nextTick trước, Promise sau
> 3. Lấy **1 callback** từ Macrotask (phase hiện tại của libuv)
> 4. **Quét sạch** Microtask Queue lần nữa
> 5. Lấy **1 macrotask** tiếp theo → quét microtask → lặp lại
>
> Công thức dễ nhớ: **Sync → All Micro → 1 Macro → All Micro → 1 Macro → ...**
>
> **Trước v11**, Node.js chạy **hết tất cả callbacks trong 1 phase** rồi mới quét microtask — khác biệt đáng kể trong một số edge cases.
>
> Tóm lại: **libuv lo giao tiếp với hệ điều hành (Macrotasks), còn V8/Node Core lo ưu tiên xử lý nhanh (Microtasks)**."

### ✅ Mẹo ghi điểm
- Phân biệt rõ **ai quản lý gì** (V8 vs libuv) → rất ít ứng viên nói được
- Giải thích thay đổi **Node v11+** → cho thấy hiểu lịch sử phát triển
- Đưa **công thức dễ nhớ** → thể hiện khả năng truyền đạt

---

## Câu 9: "Sự khác biệt giữa Node.js và JavaScript trong trình duyệt?"

### 🗣️ Bài trả lời mẫu

> "JavaScript là **ngôn ngữ**, còn môi trường chạy nó thì có 2 loại:
>
> **Trong trình duyệt**: JavaScript có quyền truy cập **DOM** (document, window), có thể thao tác HTML/CSS, xử lý sự kiện UI (click, scroll...), có `localStorage`, `fetch API`, `Web Workers`... Nhưng **không thể** đọc file system, tạo server, hay kết nối database — vì lý do bảo mật.
>
> **Trong Node.js**: JavaScript **không có** DOM, window, hay document — vì không có trình duyệt. Thay vào đó, nó có access đến **file system** (`fs`), có thể **tạo HTTP server** (`http`), **kết nối database**, xử lý **child processes**, dùng **streams**, đọc **environment variables** (`process.env`)...
>
> Cả hai đều dùng V8 engine và cùng ngôn ngữ JavaScript. Sự khác biệt nằm ở **global objects và APIs** mà mỗi runtime cung cấp. Trình duyệt có `window`, Node.js có `global`. Trình duyệt có `document`, Node.js có `process`."

---

## Câu 10: "REPL trong Node.js là gì?"

### 🗣️ Bài trả lời mẫu

> "REPL là viết tắt của **Read-Eval-Print Loop** — một môi trường tương tác cho phép bạn chạy JavaScript trực tiếp trong terminal.
>
> - **Read**: Đọc input từ user
> - **Eval**: Evaluate (thực thi) đoạn code đó
> - **Print**: In kết quả ra terminal
> - **Loop**: Lặp lại quá trình
>
> Để vào REPL, bạn chỉ cần gõ `node` trong terminal. Nó rất hữu ích để **test nhanh** một đoạn code, kiểm tra syntax, hay debug logic nhỏ mà không cần tạo file.
>
> Ví dụ: gõ `2 + 3` → nhận ngay `5`. Gõ `Array.isArray([1,2])` → nhận `true`."

---

# PHẦN 2: EVENT LOOP

---

## Câu 11: "Event Loop là gì và hoạt động như thế nào?"

### 🧠 Cấu trúc trả lời
```
1️⃣ Định nghĩa 1 câu
2️⃣ Tại sao cần Event Loop
3️⃣ Liệt kê 6 phases
4️⃣ Giải thích microtask vs macrotask
5️⃣ Ví dụ code đoán output
```

### 🗣️ Bài trả lời mẫu

> "**Event Loop là cơ chế cho phép Node.js thực hiện non-blocking I/O** mặc dù JavaScript là single-threaded. Nó là **trái tim** của Node.js.
>
> Tại sao cần Event Loop? Vì Node.js chỉ có 1 thread chạy JS code. Nếu gặp tác vụ I/O mà phải đợi, thì toàn bộ server sẽ đứng. Event Loop giải quyết bằng cách: khi có I/O, đăng ký callback → chuyển I/O sang background → khi xong thì đưa callback vào queue → Event Loop lấy ra thực thi.
>
> Event Loop hoạt động theo **6 phases**, chạy tuần tự lặp đi lặp lại. Mỗi vòng gọi là 1 **tick**:
>
> 1. **Timers** — Thực thi callbacks của `setTimeout` và `setInterval` đã đến hạn
> 2. **Pending Callbacks** — Thực thi các I/O callbacks bị trì hoãn từ vòng trước
> 3. **Idle, Prepare** — Internal, dùng nội bộ bởi Node.js
> 4. **Poll** — Phase quan trọng nhất: lấy I/O events mới, thực thi các I/O callbacks. Nếu không có gì, Event Loop sẽ **chờ ở đây** cho đến khi có event hoặc timer đến hạn
> 5. **Check** — Thực thi callbacks của `setImmediate`
> 6. **Close Callbacks** — Thực thi close events như `socket.on('close')`
>
> Ngoài 6 phases, còn có **Microtask Queue** được xử lý **giữa các phases**. Microtasks gồm `process.nextTick()` và `Promise.then()`. Chúng luôn được ưu tiên hơn macrotasks.
>
> **Thứ tự ưu tiên**: `process.nextTick()` > `Promise.then()` > `setTimeout`/`setImmediate`"

---

## Câu 12: "Cho đoạn code sau, output là gì? Giải thích."

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
setImmediate(() => console.log('3'));
Promise.resolve().then(() => console.log('4'));
process.nextTick(() => console.log('5'));
console.log('6');
```

### 🗣️ Bài trả lời mẫu

> "Output sẽ là: **1, 6, 5, 4, 2, 3** (2 và 3 có thể swap ở top-level context). Tôi giải thích từng bước:
>
> **Đầu tiên**, JavaScript chạy hết **synchronous code** trước. Nên `console.log('1')` và `console.log('6')` chạy ngay → in ra **1, 6**.
>
> **Tiếp theo**, trước khi Event Loop chuyển sang phase tiếp theo, nó xử lý hết **Microtask Queue**. Trong microtask queue:
> - `process.nextTick()` có **ưu tiên cao nhất** → in **5** trước
> - `Promise.then()` xếp sau → in **4**
>
> **Sau đó**, Event Loop vào **Timers phase**, thấy `setTimeout(fn, 0)` đã hết hạn → in **2**.
>
> **Cuối cùng**, vào **Check phase**, thấy `setImmediate` → in **3**.
>
> Lưu ý: ở top-level context (không nằm trong I/O callback), thứ tự `setTimeout(fn, 0)` và `setImmediate` **không deterministic** — phụ thuộc vào performance của process. Nhưng nếu ở **bên trong I/O callback**, thì `setImmediate` luôn chạy trước `setTimeout`."

### ✅ Mẹo ghi điểm
- Giải thích **từng bước**, không chỉ đưa kết quả
- Nhắc đến edge case: top-level context → thứ tự 2/3 có thể swap
- Nhắc đến: trong I/O callback → `setImmediate` trước → rất chi tiết

---

## Câu 13: "`process.nextTick()` và `setImmediate()` khác nhau thế nào?"

### 🗣️ Bài trả lời mẫu

> "Hai hàm này thường bị nhầm lẫn, nhưng chúng khác nhau về **thời điểm thực thi**:
>
> **`process.nextTick()`** thực thi **ngay sau operation hiện tại**, trước khi Event Loop tiếp tục sang phase tiếp theo. Nó nằm trong **microtask queue** và có ưu tiên cao nhất.
>
> **`setImmediate()`** thực thi ở **check phase** của Event Loop iteration. Nó thuộc **macrotask**.
>
> Một **cảnh báo quan trọng**: nếu dùng `process.nextTick()` quá nhiều — ví dụ trong vòng lặp đệ quy — nó có thể **starve Event Loop**. Vì microtasks được xử lý hết trước khi chuyển phase, nên I/O callbacks sẽ không bao giờ được gọi. `setImmediate()` an toàn hơn trong trường hợp này.
>
> **Quy tắc thực tế**: Dùng `process.nextTick()` khi cần execute **ngay lập tức** sau operation hiện tại — ví dụ emit event sau constructor. Dùng `setImmediate()` khi muốn execute **ở tick tiếp theo** mà không gây starving."

---

## Câu 14: "Event Loop có thể bị block không? Khi nào?"

### 🗣️ Bài trả lời mẫu

> "**Có.** Bất kỳ synchronous operation nào chạy lâu đều block Event Loop. Cụ thể:
>
> **Thứ nhất, CPU-intensive calculations** — vòng lặp tính toán nặng, thuật toán phức tạp, mã hóa. Ví dụ: `JSON.parse()` một chuỗi JSON 100MB sẽ block thread cho đến khi parse xong.
>
> **Thứ hai, Synchronous I/O** — `fs.readFileSync()`, `crypto.pbkdf2Sync()`... Bất kỳ hàm nào có suffix `Sync` đều blocking.
>
> **Thứ ba, Infinite loops hoặc đệ quy không kiểm soát**.
>
> **Hậu quả**: Khi Event Loop bị block, **toàn bộ server đứng** — không phản hồi request nào.
>
> **Giải pháp**:
> - Dùng **async versions** của các hàm I/O
> - CPU-intensive → đẩy sang **Worker Threads** hoặc **Child Processes**
> - Chia tác vụ nặng thành **chunks nhỏ** với `setImmediate()` giữa mỗi chunk
> - Dùng **message queues** (Bull, BullMQ) cho background jobs"

---

# PHẦN 3: ASYNCHRONOUS PROGRAMMING

---

## Câu 15: "Giải thích Callback, Promise, Async/Await — ưu nhược điểm?"

### 🗣️ Bài trả lời mẫu

> "Đây là 3 cách xử lý bất đồng bộ trong Node.js, theo thứ tự phát triển:
>
> **Callback** — cách đầu tiên. Bạn truyền một function vào function khác, function đó sẽ được gọi khi tác vụ hoàn tất.
> - *Ưu điểm*: Đơn giản, dễ hiểu với tác vụ đơn lẻ
> - *Nhược điểm*: Khi nhiều tác vụ phụ thuộc nhau → **callback hell** — code lồng nhau nhiều tầng, rất khó đọc và maintain. Xử lý error phải kiểm tra `if (err)` ở mỗi level.
>
> **Promise** — ra đời để giải quyết callback hell. Một Promise đại diện cho **giá trị sẽ có trong tương lai** — có thể resolved (thành công) hoặc rejected (thất bại).
> - *Ưu điểm*: Chain được bằng `.then().then()` — flat hơn callback hell. Xử lý error tập trung bằng `.catch()`. Có `Promise.all()`, `Promise.race()`...
> - *Nhược điểm*: Vẫn còn nhiều `.then()` nếu logic phức tạp, khó debug
>
> **Async/Await** — syntax sugar trên Promise, cho phép viết code **bất đồng bộ giống như đồng bộ**.
> - *Ưu điểm*: Code đọc từ trên xuống dưới, rất tự nhiên. Dùng `try/catch` quen thuộc để bắt lỗi. Debug dễ hơn — stack trace rõ ràng.
> - *Nhược điểm*: Nếu dùng không cẩn thận, dễ tạo **sequential execution** thay vì parallel. Ví dụ:
>
> ```javascript
> // ❌ Sequential — chậm
> const users = await getUsers();     // Đợi xong
> const orders = await getOrders();   // Rồi mới chạy cái này
>
> // ✅ Parallel — nhanh
> const [users, orders] = await Promise.all([
>   getUsers(),
>   getOrders(),
> ]);
> ```
>
> **Trong thực tế**, tôi dùng async/await là chủ yếu, kết hợp `Promise.all()` khi cần parallel execution."

---

## Câu 16: "Blocking vs Non-blocking I/O khác nhau thế nào?"

### 🗣️ Bài trả lời mẫu

> "**Blocking I/O**: Khi gọi một thao tác I/O, thread **dừng lại đợi** cho đến khi thao tác hoàn tất rồi mới tiếp tục. Trong thời gian đợi, thread không làm gì cả.
>
> ```javascript
> const data = fs.readFileSync('file.txt'); // Thread dừng ở đây 5 giây
> console.log(data);                         // Phải chờ 5 giây mới chạy
> ```
>
> **Non-blocking I/O**: Khi gọi I/O, thread **giao task đi** rồi **tiếp tục ngay**. Khi I/O xong, callback được gọi.
>
> ```javascript
> fs.readFile('file.txt', (err, data) => {
>   console.log(data);              // Chạy khi file sẵn sàng
> });
> console.log('Tiếp tục ngay!');    // Chạy ngay, không đợi
> ```
>
> Với Node.js, non-blocking I/O là **mặc ​​định**. Mọi hàm I/O đều có phiên bản async. Các hàm có suffix `Sync` là blocking và **nên tránh** trong production code — trừ khi ở startup phase, nơi blocking có thể chấp nhận được, ví dụ đọc config file lúc app khởi động."

---

## Câu 17: "Asynchronous và Non-blocking có giống nhau không?"

### 🗣️ Bài trả lời mẫu

> "Hai khái niệm này **liên quan nhưng không giống nhau**:
>
> **Non-blocking** mô tả **hành vi của system call**: Khi gọi I/O, nếu dữ liệu chưa sẵn sàng, hàm trả về ngay lập tức thay vì chờ. Nó nói về **bản chất của cuộc gọi** — có chờ hay không.
>
> **Asynchronous** mô tả **pattern xử lý kết quả**: Bạn gửi request, không đợi kết quả, mà đăng ký một callback/promise để nhận kết quả sau. Nó nói về **cách bạn tổ chức code** để xử lý khi kết quả sẵn sàng.
>
> Trong Node.js, chúng thường đi đôi: Non-blocking I/O + Asynchronous callbacks. Nhưng về bản chất: non-blocking là ở **tầng hệ thống** (OS-level), còn asynchronous là ở **tầng ứng dụng** (application-level)."

---

# PHẦN 4: MODULES

---

## Câu 18: "CommonJS và ES Modules khác nhau thế nào?"

### 🗣️ Bài trả lời mẫu

> "Đây là 2 hệ thống module trong Node.js:
>
> **CommonJS (CJS)** — hệ thống mặc định, dùng `require()` để import và `module.exports` để export. Đặc điểm: **synchronous loading** — khi gọi `require()`, Node.js đọc và execute file ngay lập tức, rồi trả về kết quả. Modules được **cache** sau lần load đầu tiên.
>
> **ES Modules (ESM)** — chuẩn JavaScript chính thức, dùng `import/export`. Đặc điểm: **asynchronous loading**, hỗ trợ **top-level await**, và quan trọng nhất là hỗ trợ **tree-shaking** — bundlers có thể loại bỏ code không dùng, giảm bundle size.
>
> **Khác biệt quan trọng khi phỏng vấn**:
> - CJS: `require()` có thể gọi **bất kỳ đâu**, kể cả trong `if` — dynamic
> - ESM: `import` phải ở **top-level** — static analysis, nhưng có `import()` cho dynamic import
> - CJS: `module.exports` export **một object duy nhất**
> - ESM: có thể **named exports** lẫn **default export**
>
> **Trong dự án thực tế** của tôi dùng NestJS với TypeScript, tôi viết `import/export` syntax (ESM), nhưng TypeScript compile ra CommonJS. Hiện tại xu hướng đang chuyển dần sang ESM thuần."

---

## Câu 19: "`module.exports` và `exports` khác nhau thế nào?"

### 🗣️ Bài trả lời mẫu

> "Đây là câu hỏi hay mà nhiều người dễ nhầm:
>
> Mặc định, `exports` là **reference** tới `module.exports`. Nghĩa là `exports === module.exports` → `true`.
>
> **Khi bạn dùng `exports.xxx = ...`** → hoạt động đúng vì bạn đang thêm property vào cùng một object.
>
> **Nhưng khi bạn gán `exports = ...`** → bạn đã **thay đổi reference** — `exports` giờ trỏ tới object khác, không còn liên kết với `module.exports`. Node.js chỉ export cái `module.exports` trỏ tới, nên code sẽ **không hoạt động** như mong đợi.
>
> ```javascript
> // ✅ Đúng
> exports.add = (a, b) => a + b;
>
> // ✅ Đúng
> module.exports = { add: (a, b) => a + b };
>
> // ❌ Sai — exports đã bị ghi đè reference
> exports = { add: (a, b) => a + b };
> ```
>
> **Quy tắc đơn giản**: Luôn dùng `module.exports` cho an toàn."

---

# PHẦN 5: ERROR HANDLING & CALLBACKS

---

## Câu 20: "Callback hell là gì và cách xử lý?"

### 🗣️ Bài trả lời mẫu

> "**Callback hell** — hay còn gọi là **pyramid of doom** — là tình trạng code bị lồng nhau nhiều tầng khi xử lý nhiều tác vụ bất đồng bộ phụ thuộc nhau bằng callbacks:
>
> ```javascript
> getUser(id, (err, user) => {
>   getOrders(user.id, (err, orders) => {
>     getOrderDetails(orders[0].id, (err, details) => {
>       // Code thụt vào rất sâu...
>     });
>   });
> });
> ```
>
> **3 cách giải quyết**:
>
> **Cách 1 — Named functions**: Tách mỗi callback thành function riêng, đặt tên rõ ràng. Nhưng vẫn hơi phức tạp.
>
> **Cách 2 — Promises với chaining**:
> ```javascript
> getUser(id)
>   .then(user => getOrders(user.id))
>   .then(orders => getOrderDetails(orders[0].id))
>   .catch(err => handleError(err));
> ```
>
> **Cách 3 — Async/Await** (khuyến khích nhất):
> ```javascript
> try {
>   const user = await getUser(id);
>   const orders = await getOrders(user.id);
>   const details = await getOrderDetails(orders[0].id);
> } catch (err) {
>   handleError(err);
> }
> ```
>
> Code phẳng, đọc từ trên xuống, xử lý lỗi tập trung — **production code ngày nay nên dùng async/await**."

---

# PHẦN 6: EXPRESS.JS & MIDDLEWARE

---

## Câu 21: "Middleware trong Express là gì?"

### 🗣️ Bài trả lời mẫu

> "**Middleware** là các function có quyền truy cập vào 3 thứ: **request object** (`req`), **response object** (`res`), và **hàm `next()`** để chuyển control sang middleware tiếp theo.
>
> Middleware giống như **chuỗi các bộ lọc** — request đi qua từng middleware theo thứ tự khai báo, mỗi middleware có thể: xử lý request, thay đổi req/res, kết thúc response, hoặc gọi `next()` để chuyển tiếp.
>
> ```javascript
> // Ví dụ: middleware log request
> app.use((req, res, next) => {
>   console.log(`${req.method} ${req.url}`);
>   next();  // PHẢI gọi next(), nếu không request bị treo
> });
> ```
>
> **Các loại middleware**:
> - **Application-level**: `app.use()` — áp dụng cho mọi route
> - **Router-level**: `router.use()` — áp dụng cho routes trong router
> - **Built-in**: `express.json()`, `express.static()`
> - **Third-party**: `cors()`, `helmet()`, `morgan()`
> - **Error-handling**: Có **4 tham số** `(err, req, res, next)` — phải đặt cuối cùng
>
> **Thứ tự khai báo rất quan trọng**: `express.json()` phải trước route handlers, error middleware phải ở cuối."

---

# PHẦN 7: SECURITY & PRODUCTION

---

## Câu 22: "Làm thế nào để bảo vệ ứng dụng Node.js?"

### 🗣️ Bài trả lời mẫu

> "Tôi thường áp dụng **nhiều lớp bảo vệ**:
>
> **Thứ nhất, Input Validation** — validate mọi input từ user. Tôi dùng **Zod** hoặc `class-validator` với NestJS Pipes. Không bao giờ trust client data.
>
> **Thứ hai, SQL Injection Prevention** — dùng ORM như **Prisma** với parameterized queries thay vì nối string SQL.
>
> **Thứ ba, XSS Prevention** — sanitize output, set `Content-Security-Policy` header. Dùng **Helmet.js** để set nhiều security headers cùng lúc.
>
> **Thứ tư, Authentication** — dùng **JWT** với access token (ngắn hạn, 15 phút) và refresh token (dài hạn, 7 ngày). Hash password bằng **bcrypt** với saltRounds ít nhất 12.
>
> **Thứ năm, Rate Limiting** — giới hạn số requests per IP để chống brute force và DDoS.
>
> **Thứ sáu, CORS** — chỉ cho phép các domain cụ thể gọi API, không dùng `origin: '*'` trong production.
>
> **Thứ bảy, Environment Variables** — secrets nằm trong `.env`, validate bằng Zod schema khi app startup. Không bao giờ commit `.env` lên git.
>
> **Thứ tám, Dependencies** — chạy `npm audit` thường xuyên, dùng lock file, update dependencies có known vulnerabilities."

---

## Câu 23: "Giải thích JWT và luồng authentication?"

### 🗣️ Bài trả lời mẫu

> "**JWT** — JSON Web Token — là một chuẩn mở để truyền thông tin an toàn giữa các bên dưới dạng JSON, được **ký số** để đảm bảo tính toàn vẹn.
>
> **Cấu trúc**: 3 phần, ngăn cách bằng dấu chấm: `Header.Payload.Signature`
> - **Header**: chứa thuật toán (`HS256`) và loại token (`JWT`)
> - **Payload**: chứa claims — thông tin user (id, role, thời gian hết hạn)
> - **Signature**: mã hóa `Header + Payload` bằng secret key → đảm bảo không bị sửa đổi
>
> **Luồng authentication** trong ứng dụng thực tế:
>
> 1. User **đăng nhập** bằng email + password
> 2. Server verify password (bcrypt.compare) → nếu đúng, tạo **Access Token** (15 phút) và **Refresh Token** (7 ngày)
> 3. Client lưu Access Token → gửi kèm mỗi request trong header `Authorization: Bearer <token>`
> 4. Server verify token bằng secret key → nếu valid, cho phép truy cập
> 5. Khi Access Token **hết hạn**, client dùng Refresh Token gọi API `/refresh` để nhận Access Token mới
> 6. Khi Refresh Token hết hạn → user phải đăng nhập lại
>
> **Tại sao cần 2 tokens?** Access Token ngắn hạn → nếu bị lộ, thiệt hại giới hạn. Refresh Token dài hạn → giảm số lần user phải login. Refresh Token nên lưu trong **httpOnly cookie** để JavaScript không thể truy cập."

---

## Câu 24: "Làm thế nào để deploy ứng dụng Node.js lên production?"

### 🗣️ Bài trả lời mẫu

> "Để deploy lên production, tôi thường áp dụng:
>
> **Process Manager**: Dùng **PM2** để chạy app dưới dạng daemon, auto-restart khi crash, cluster mode để tận dụng multi-core. Hoặc nếu dùng container thì không cần PM2.
>
> **Docker**: Viết Dockerfile multi-stage — stage 1 build, stage 2 chỉ copy production files. Image nhẹ, consistent giữa các môi trường.
>
> **Reverse Proxy**: Đặt **Nginx** phía trước Node.js để handle SSL termination, static files, load balancing, và giới hạn request size.
>
> **Graceful Shutdown**: Lắng nghe `SIGTERM` signal → đóng server, chờ connections đang xử lý hoàn tất, đóng database connections, flush logs → rồi mới exit. Nếu quá 10 giây thì force exit.
>
> **Health Check**: Tạo endpoint `/health` trả về status, uptime, memory usage → để orchestrator (K8s, ECS) biết app còn sống.
>
> **Logging**: Dùng **Pino** hoặc **Winston** thay vì `console.log`. Structured logging (JSON format) để dễ search trên ELK Stack hoặc CloudWatch.
>
> **CI/CD**: GitHub Actions chạy lint, test, build trước khi deploy. Nếu pass → auto deploy lên staging, manual approve → production."

---

# TIPS TỔNG HỢP CHO NGÀY PHỎNG VẤN

---

## 💡 Cách trả lời khi gặp câu hỏi không biết

> "Câu hỏi này tôi chưa có kinh nghiệm trực tiếp, nhưng theo hiểu biết của tôi thì... [nói những gì bạn biết liên quan]. Tôi sẽ tìm hiểu thêm về phần này."

→ **Trung thực, thể hiện thái độ học hỏi, không bịa.**

## 💡 Cách trả lời khi bị hỏi sâu

> "Cụ thể hơn, trong dự án gần nhất của tôi, tôi đã..."

→ **Liên hệ project thật** (NestJS + Prisma + Resend/SMTP Adapter của bạn) → rất thuyết phục.

## 💡 Những project points bạn có thể nhắc đến

Dựa trên dự án Ecommerce NestJS của bạn:
- **Adapter Pattern**: Mail module hỗ trợ cả Resend và SMTP
- **Zod Validation**: Config validation với discriminated unions
- **Dependency Injection**: NestJS DI container
- **Prisma ORM**: Type-safe database access
- **CI/CD**: GitHub Actions với lint, test, build
- **Module-based Architecture**: Mỗi module tự quản lý config, schema, constants

---

> 📅 Tạo ngày: 2026-02-09
> 🎯 Mục tiêu: Hướng dẫn trả lời phỏng vấn Node.js trôi chảy, rõ ràng
