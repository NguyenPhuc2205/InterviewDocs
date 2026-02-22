# Nginx & Deploy — Kiến Trúc Bên Trong & Quy Trình Triển Khai

> **Kiến thức DevOps nền tảng** — Nginx architecture, event-driven model, proxy internals, SSL/TLS, và quy trình deploy ứng dụng web từ code → production. Biết để trả lời "Hệ thống của bạn deploy thế nào?"

---

## Mục lục

1. [Nginx là gì?](#1-nginx-là-gì)
2. [Kiến trúc bên trong — Master/Worker](#2-kiến-trúc-bên-trong--masterworker)
3. [Event-Driven & Non-Blocking I/O](#3-event-driven--non-blocking-io)
4. [Reverse Proxy — Flow chi tiết](#4-reverse-proxy--flow-chi-tiết)
5. [Load Balancing — Cơ chế bên trong](#5-load-balancing--cơ-chế-bên-trong)
6. [SSL/TLS Termination](#6-ssltls-termination)
7. [Nginx Config Deep Dive](#7-nginx-config-deep-dive)
8. [Quy trình Deploy ứng dụng Web](#8-quy-trình-deploy-ứng-dụng-web)
9. [Docker & Containerization](#9-docker--containerization)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Câu hỏi phỏng vấn](#11-câu-hỏi-phỏng-vấn)

---

# 1. Nginx là gì?

## Định nghĩa

**Nginx** (đọc: "engine-x") là một **web server**, **reverse proxy**, và **load balancer** mã nguồn mở, nổi tiếng với khả năng xử lý **hàng chục nghìn connections đồng thời** với bộ nhớ rất thấp.

## Tại sao Nginx ra đời?

```
Vấn đề C10K (năm 2000):
  "Làm sao 1 server xử lý 10,000 connections cùng lúc?"

Apache (mô hình cũ):
  Mỗi connection = 1 process/thread
  10,000 connections = 10,000 threads
  → Tốn RAM khổng lồ → Server sụp

  Request 1 → Thread 1 (chiếm RAM)
  Request 2 → Thread 2 (chiếm RAM)
  ...
  Request 10000 → Thread 10000 → 💥 HẾT RAM

Nginx (2004, Igor Sysoev):
  Event-driven model
  1 worker process → xử lý HÀNG NGHÌN connections
  10,000 connections = vài MB RAM

  Request 1 ─┐
  Request 2 ─┼─► Worker Process (event loop) → xử lý lần lượt
  ...        ─┤   Đang chờ I/O? → chuyển sang request khác
  Request N ─┘   I/O xong? → quay lại xử lý tiếp
```

## Nginx dùng để làm gì?

| Vai trò | Giải thích |
|---|---|
| **Web Server** | Serve static files (HTML, CSS, JS, images) |
| **Reverse Proxy** | Đứng trước backend, forward requests |
| **Load Balancer** | Phân phối traffic tới nhiều backend servers |
| **SSL Terminator** | Xử lý HTTPS, backend chỉ cần HTTP |
| **Cache Server** | Cache responses, giảm load backend |
| **API Gateway** | Routing, rate limiting, authentication |

---

# 2. Kiến trúc bên trong — Master/Worker

## Mô hình Master-Worker

```
                    ┌─────────────────────────────┐
                    │        MASTER PROCESS        │
                    │  PID: 1                      │
                    │  ┌─────────────────────────┐ │
                    │  │ • Đọc config file       │ │
                    │  │ • Tạo/quản lý workers   │ │
                    │  │ • Bind ports (80, 443)   │ │
                    │  │ • Nhận signals (reload)  │ │
                    │  │ • KHÔNG xử lý requests  │ │
                    │  └─────────────────────────┘ │
                    └──────────┬──────────────────┘
                               │ fork()
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
  │  WORKER PROCESS  │ │  WORKER PROCESS  │ │  WORKER PROCESS  │
  │  PID: 101        │ │  PID: 102        │ │  PID: 103        │
  │                  │ │                  │ │                  │
  │  Event Loop      │ │  Event Loop      │ │  Event Loop      │
  │  ┌────────────┐  │ │  ┌────────────┐  │ │  ┌────────────┐  │
  │  │ Conn 1     │  │ │  │ Conn 4     │  │ │  │ Conn 7     │  │
  │  │ Conn 2     │  │ │  │ Conn 5     │  │ │  │ Conn 8     │  │
  │  │ Conn 3     │  │ │  │ Conn 6     │  │ │  │ Conn 9     │  │
  │  │ ...        │  │ │  │ ...        │  │ │  │ ...        │  │
  │  └────────────┘  │ │  └────────────┘  │ │  └────────────┘  │
  └──────────────────┘ └──────────────────┘ └──────────────────┘

  Thông thường: số workers = số CPU cores
  worker_processes auto;  ← Nginx tự detect số cores
```

## Vai trò từng process

| Process | Vai trò | Số lượng |
|---|---|---|
| **Master** | Đọc config, quản lý workers, bind ports, nhận signals | **1** |
| **Worker** | Xử lý requests, chạy event loop, serve content | **= CPU cores** |
| **Cache Manager** | Quản lý cache entries (expiration, size) | 1 (nếu dùng cache) |
| **Cache Loader** | Load cache từ disk vào shared memory lúc khởi động | 1 (nếu dùng cache) |

## Graceful Reload (Zero Downtime)

```
nginx -s reload  (hoặc kill -HUP <master_pid>)

  Master nhận signal SIGHUP
    │
    ├── 1. Đọc config MỚI
    ├── 2. Validate config → nếu lỗi → giữ config cũ, không reload
    ├── 3. Tạo WORKER MỚI với config mới
    ├── 4. Gửi SIGQUIT tới WORKER CŨ:
    │        "Hoàn thành requests đang xử lý, rồi tự tắt"
    │        Worker cũ KHÔNG nhận request mới
    │        Worker cũ xong hết → tự exit
    └── 5. Worker mới nhận toàn bộ requests

  → Không mất connection nào! (zero downtime reload)
```

---

# 3. Event-Driven & Non-Blocking I/O

## Tại sao event-driven mà nhanh?

```
Thread-per-Connection (Apache prefork):
────────────────────────────────────────
  Thread 1: [Nhận request] [Đọc file......chờ.....xong] [Trả response]
  Thread 2: [Nhận request] [Query DB.......chờ........xong] [Trả response]
  Thread 3: [Nhận request] [Gọi API........chờ..........xong] [Trả response]
  → Mỗi thread BỊ CHẶN (blocked) trong khi chờ I/O
  → 10,000 connections = 10,000 threads blocked → lãng phí!


Event-Driven (Nginx):
────────────────────────────────────────
  Worker:
    [Nhận req A] → gửi đọc file (non-blocking) → KHÔNG CHỜ, xử lý tiếp
    [Nhận req B] → gửi query DB (non-blocking) → KHÔNG CHỜ, xử lý tiếp
    [Nhận req C] → gửi gọi API (non-blocking) → KHÔNG CHỜ, xử lý tiếp
    [File A ready!] → trả response A
    [DB B ready!] → trả response B
    [API C ready!] → trả response C

  → 1 worker xử lý HÀNG NGHÌN connections
  → Không bao giờ bị blocked chờ I/O
```

## Cơ chế kỹ thuật

Nginx dùng **OS-level event notification**:

| OS | Cơ chế | Giải thích |
|---|---|---|
| **Linux** | `epoll` | Kernel thông báo khi file descriptor sẵn sàng |
| **FreeBSD/macOS** | `kqueue` | Tương tự epoll cho BSD systems |
| **Windows** | `IOCP` | I/O Completion Ports |

```
                    ┌──────────────────────────────┐
                    │         OS Kernel             │
                    │  ┌──────────────────────────┐ │
                    │  │  epoll / kqueue          │ │
                    │  │  "Theo dõi 10,000 FDs    │ │
                    │  │   Thông báo khi có event" │ │
                    │  └───────────┬──────────────┘ │
                    └──────────────┼────────────────┘
                                   │ event notification
                                   ▼
                    ┌──────────────────────────────┐
                    │      Nginx Worker Process     │
                    │                              │
                    │  Event Loop:                 │
                    │  while (true) {              │
                    │    events = epoll_wait();    │  ← chờ events từ kernel
                    │    for (event in events) {   │
                    │      handle(event);          │  ← xử lý từng event
                    │    }                         │
                    │  }                           │
                    └──────────────────────────────┘
```

## So sánh Apache vs Nginx

| | Apache (prefork/worker) | Nginx |
|---|---|---|
| **Mô hình** | Thread/Process per connection | Event-driven |
| **10K connections** | 10K threads → ~10GB RAM | Vài workers → ~100MB RAM |
| **Static files** | Chậm (qua module) | 🟢 Cực nhanh (sendfile) |
| **Dynamic content** | 🟢 Tốt (mod_php, mod_python) | Phải proxy tới backend (PHP-FPM, Gunicorn) |
| **Config** | `.htaccess` per-directory | Tập trung 1 file nginx.conf |
| **Config reload** | Restart (downtime) | 🟢 Graceful reload (zero downtime) |
| **Memory** | 🔴 Tốn | 🟢 Ít |

---

# 4. Reverse Proxy — Flow chi tiết

## Trong bụng Nginx, 1 request đi thế nào?

```
Client (browser)
  │
  │  ① TCP connection tới Nginx (port 443)
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│                         NGINX                               │
│                                                             │
│  ② SSL/TLS Handshake (nếu HTTPS)                           │
│     → Giải mã request                                       │
│                                                             │
│  ③ Parse HTTP request                                       │
│     → Method, URI, Headers, Body                            │
│                                                             │
│  ④ Match server block (server_name)                         │
│     → api.example.com → server block 1                      │
│     → www.example.com → server block 2                      │
│                                                             │
│  ⑤ Match location block (URI)                               │
│     → /api/*        → proxy_pass http://backend             │
│     → /static/*     → serve từ disk                         │
│     → /             → serve index.html (SPA fallback)       │
│                                                             │
│  ⑥ Xử lý theo location:                                    │
│                                                             │
│     Nếu STATIC FILE:                                        │
│     → sendfile() → kernel copy file trực tiếp → response    │
│     → Không qua userspace → siêu nhanh!                     │
│                                                             │
│     Nếu PROXY_PASS:                                         │
│     ⑥a. Chọn upstream server (load balancing algorithm)     │
│     ⑥b. Mở connection tới backend (hoặc reuse keep-alive)  │
│     ⑥c. Forward request + thêm headers (X-Real-IP, etc.)   │
│     ⑥d. Nhận response từ backend                           │
│     ⑥e. Có thể cache response                              │
│     ⑥f. Gzip compress (nếu config)                         │
│                                                             │
│  ⑦ Gửi response về client                                  │
│     → SSL encrypt (nếu HTTPS)                               │
│     → Gửi qua TCP                                           │
│                                                             │
│  ⑧ Log access log                                           │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
Client nhận response
```

## Request Processing Phases (thứ tự xử lý)

Nginx xử lý mỗi request qua **11 phases** theo thứ tự:

| Phase | Giai đoạn | Ví dụ module |
|---|---|---|
| 1. **POST_READ** | Đọc request xong | `realip` (lấy IP thật qua proxy) |
| 2. **SERVER_REWRITE** | Rewrite URL trong server block | `rewrite` |
| 3. **FIND_CONFIG** | Tìm location block khớp | Core |
| 4. **REWRITE** | Rewrite URL trong location block | `rewrite` |
| 5. **POST_REWRITE** | Sau rewrite → tìm lại location (nếu URL đổi) | Core |
| 6. **PREACCESS** | Kiểm tra trước access | `limit_req` (rate limiting) |
| 7. **ACCESS** | Kiểm tra quyền truy cập | `auth_basic`, `allow/deny` |
| 8. **POST_ACCESS** | Sau kiểm tra quyền | Core |
| 9. **PRECONTENT** | Trước khi tạo content | `try_files` |
| 10. **CONTENT** | Tạo response content | `proxy_pass`, `fastcgi`, `static` |
| 11. **LOG** | Ghi log | `access_log` |

---

# 5. Load Balancing — Cơ chế bên trong

## Algorithms deep dive

### Round Robin — Mặc định

```
Cơ chế: Luân phiên, mỗi server nhận 1 request rồi chuyển sang server kế tiếp.

  State nội bộ: current = 0

  Request 1: servers[0 % 3] = Server A    → current++
  Request 2: servers[1 % 3] = Server B    → current++
  Request 3: servers[2 % 3] = Server C    → current++
  Request 4: servers[0 % 3] = Server A    → quay lại
```

### Weighted Round Robin — Có trọng số

```nginx
upstream backend {
    server 10.0.0.1:3000 weight=5;  # Server mạnh (8 CPU, 32GB RAM)
    server 10.0.0.2:3000 weight=3;  # Server trung bình
    server 10.0.0.3:3000 weight=1;  # Server yếu
}
```

```
Nginx dùng smooth weighted round-robin:

  Cứ mỗi 9 requests (5+3+1):
  Server A nhận 5 requests  (weight 5)
  Server B nhận 3 requests  (weight 3)
  Server C nhận 1 request   (weight 1)

  Nhưng KHÔNG gửi 5 cái liền cho A rồi 3 cái cho B!
  Nginx xen kẽ để phân bổ đều:
  A, B, A, A, B, C, A, B, A  ← smooth distribution
```

### Least Connections — Server ít connection nhất

```
Cơ chế: Đếm số active connections, gửi tới server có ÍT NHẤT.

  Server A: 12 active connections
  Server B: 3 active connections   ← ít nhất → gửi tới đây
  Server C: 8 active connections

  Phù hợp khi: requests có thời gian xử lý khác nhau
  (1 request nhanh 10ms, 1 request chậm 5s)
```

### IP Hash — Sticky Sessions

```
Cơ chế: Hash client IP → luôn tới CÙNG server.

  hash(192.168.1.1) % 3 = 1 → luôn tới Server B
  hash(192.168.1.2) % 3 = 0 → luôn tới Server A
  hash(192.168.1.3) % 3 = 2 → luôn tới Server C

  Tại sao cần: Session lưu trên server
  → User login ở Server A → session ở A
  → Request tiếp tới Server B → KHÔNG CÓ session → bị đá ra
  → IP Hash → luôn tới A → giữ session

  Nhược điểm: 1 server chết → user bị mất session
  Giải pháp tốt hơn: Centralized session (Redis)
```

## Health Checks

```nginx
upstream backend {
    server 10.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 10.0.0.2:3000 max_fails=3 fail_timeout=30s;
    server 10.0.0.3:3000 backup;  # chỉ dùng khi servers khác chết
}
```

```
Passive Health Check (Nginx Open Source):
  → Nếu backend trả lỗi 3 lần (max_fails=3)
  → Đánh dấu server "down" trong 30 giây (fail_timeout=30s)
  → Sau 30s → thử lại
  → Nếu OK → đánh dấu "up"

  Server A: ✅ up
  Server B: ❌ failed 3 lần → down 30s → thử lại...
  Server C: 🟡 backup (chỉ dùng khi A+B chết)
```

---

# 6. SSL/TLS Termination

## SSL Termination là gì?

```
KHÔNG CÓ SSL Termination:
  Client ──HTTPS──► Nginx ──HTTPS──► Backend
  → Backend phải xử lý SSL → tốn CPU
  → Mỗi backend server cần SSL certificate
  → Certificates khó quản lý

CÓ SSL Termination (phổ biến):
  Client ──HTTPS──► Nginx ──HTTP──► Backend
                    ↑ SSL xử lý ở đây
  → Backend chỉ cần HTTP → đơn giản
  → SSL certificate chỉ cần ở Nginx
  → Nginx tối ưu cho SSL (hardware acceleration)

  Tại sao an toàn?
  → Nginx ↔ Backend thường ở CÙNG mạng nội bộ (private network)
  → Không ai từ ngoài truy cập được → HTTP ở đây OK
```

## TLS Handshake Flow

```
Client                                     Nginx (Server)
  │                                          │
  │──── ClientHello ────────────────────────►│
  │     (TLS version, cipher suites,         │
  │      random number)                      │
  │                                          │
  │◄──── ServerHello ─────────────────────── │
  │      (chosen cipher, random number,      │
  │       server certificate)                │
  │                                          │
  │  Client kiểm tra certificate:            │
  │  → CA có tin cậy không?                  │
  │  → Domain khớp không?                    │
  │  → Hết hạn chưa?                         │
  │                                          │
  │──── Key Exchange ──────────────────────► │
  │     (client tạo pre-master secret,       │
  │      encrypt bằng server public key)     │
  │                                          │
  │     Cả 2 bên tính session key            │
  │     từ pre-master secret                 │
  │                                          │
  │◄═══ Encrypted Communication ════════════►│
  │     (dùng symmetric key — AES)           │
  │                                          │

  Tổng thời gian: ~100-300ms (1 RTT cho TLS 1.3)
```

## Let's Encrypt — Free SSL

```bash
# Cài Certbot
sudo apt install certbot python3-certbot-nginx

# Tự động lấy certificate + cấu hình Nginx
sudo certbot --nginx -d example.com -d www.example.com

# Auto-renew (certificate hết hạn mỗi 90 ngày)
sudo certbot renew --dry-run

# Certbot tự thêm vào nginx config:
#   ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
#   ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
```

---

# 7. Nginx Config Deep Dive

## Cấu trúc config

```nginx
# ==========================================
# MAIN CONTEXT — Cấu hình global
# ==========================================
worker_processes auto;           # Số worker = số CPU cores
worker_connections 1024;         # Mỗi worker tối đa 1024 connections
                                 # Max connections = workers × worker_connections
                                 # Ví dụ: 4 cores × 1024 = 4096 đồng thời

events {
    use epoll;                   # Sử dụng epoll (Linux)
    multi_accept on;             # Worker nhận nhiều connections cùng lúc
}


# ==========================================
# HTTP CONTEXT — Cấu hình HTTP server
# ==========================================
http {
    # ── MIME types ──
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # ── Logging ──
    log_format main '$remote_addr - $request_method $request_uri '
                    '$status $body_bytes_sent "$http_user_agent"';
    access_log /var/log/nginx/access.log main;
    error_log  /var/log/nginx/error.log warn;

    # ── Performance ──
    sendfile        on;          # Kernel copy file (skip userspace)
    tcp_nopush      on;          # Gom nhiều packets trước khi gửi
    tcp_nodelay     on;          # Gửi ngay, không chờ buffer đầy
    keepalive_timeout 65;        # Giữ connection mở 65 giây

    # ── Gzip ──
    gzip on;
    gzip_types text/plain text/css application/json
               application/javascript text/xml;
    gzip_min_length 1000;        # Chỉ nén file > 1KB


    # ==========================================
    # UPSTREAM — Định nghĩa backend servers
    # ==========================================
    upstream api_servers {
        least_conn;                               # Load balancing algorithm
        server 127.0.0.1:3001 weight=3;
        server 127.0.0.1:3002 weight=2;
        server 127.0.0.1:3003 backup;
    }


    # ==========================================
    # SERVER BLOCK — Virtual host
    # ==========================================

    # Server 1: Redirect HTTP → HTTPS
    server {
        listen 80;
        server_name example.com www.example.com;
        return 301 https://$host$request_uri;
    }

    # Server 2: HTTPS — Main config
    server {
        listen 443 ssl http2;
        server_name example.com;

        # ── SSL ──
        ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        # ── Security headers ──
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000" always;


        # ── LOCATION BLOCKS ──

        # API → proxy tới backend
        location /api/ {
            proxy_pass http://api_servers;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 5s;        # Timeout kết nối tới backend
            proxy_read_timeout    60s;       # Timeout chờ response
            proxy_send_timeout    60s;       # Timeout gửi request body
        }

        # WebSocket → cần thêm Upgrade headers
        location /ws/ {
            proxy_pass http://api_servers;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 86400s;       # Giữ WS connection lâu (24h)
        }

        # Static files → serve trực tiếp
        location /static/ {
            alias /var/www/static/;
            expires 30d;                     # Cache 30 ngày
            add_header Cache-Control "public, immutable";
        }

        # SPA fallback → mọi route trả index.html
        location / {
            root /var/www/frontend/dist;
            try_files $uri $uri/ /index.html;
            # try_files: thử file → thử thư mục → fallback index.html
            # → React Router / Vue Router xử lý routing phía client
        }
    }
}
```

## Location matching priority

```
Nginx chọn location theo ĐỘ ƯU TIÊN, KHÔNG PHẢI thứ tự trong config:

  1. location = /exact        ← Exact match (ưu tiên cao nhất)
  2. location ^~ /prefix      ← Prefix match, DỪNG tìm regex
  3. location ~ /regex        ← Regex (case-sensitive)
  4. location ~* /regex       ← Regex (case-insensitive)
  5. location /prefix         ← Prefix match thường
  6. location /               ← Catch-all (ưu tiên thấp nhất)

Ví dụ:
  Request: GET /api/users/123

  location = /api/users/123  ← Match? Có → DÙNG NGAY (exact)
  location ^~ /api/          ← Match prefix? Có → DÙNG, dừng tìm regex
  location ~ ^/api/          ← Match regex? Có, nhưng ^~ đã dừng
  location /api/             ← Match prefix? Có, nhưng ưu tiên thấp
  location /                 ← Match? Có, nhưng ưu tiên thấp nhất
```

---

# 8. Quy trình Deploy ứng dụng Web

## Full Deployment Flow

```
  Developer                    CI/CD                         Server (Production)
      │                          │                                 │
  ① git push                     │                                 │
      │──────────────────────────►│                                │
      │                   ② CI Pipeline:                           │
      │                   ├── npm install                          │
      │                   ├── npm run lint                         │
      │                   ├── npm run test                         │
      │                   ├── npm run build                        │
      │                   │    (Frontend: Vite/Webpack → dist/)   │
      │                   │    (Backend: tsc → dist/)             │
      │                   │                                       │
      │                   ├── ③ Docker build                      │
      │                   │    → Tạo Docker image                 │
      │                   │    → Push lên Container Registry      │
      │                   │      (Docker Hub, AWS ECR, GCR)       │
      │                   │                                       │
      │                   └── ④ CD Pipeline:                      │
      │                        SSH vào server (hoặc K8s deploy)   │
      │                        ├── Pull Docker image mới ────────►│
      │                        ├── Stop container cũ             │
      │                        ├── Start container mới           │
      │                        └── Health check ── OK? ── Done!  │
      │                                                           │
      │                                              ⑤ Nginx:     │
      │                                              Reverse proxy│
      │                                              tới container│
      │                                                           │
  User truy cập example.com ──► DNS ──► Server ──► Nginx ──► App │
```

## Deploy Frontend (SPA — React/Vue/Angular)

```bash
# 1. Build production bundle
npm run build
# → Tạo thư mục dist/ chứa HTML, CSS, JS (minified + bundled)

# 2. Upload dist/ lên server
scp -r dist/ user@server:/var/www/frontend/

# 3. Nginx serve static files
# location / {
#     root /var/www/frontend/dist;
#     try_files $uri $uri/ /index.html;
# }

# Hoặc deploy lên CDN/Platform:
# → Vercel, Netlify, Cloudflare Pages (tự động)
# → AWS S3 + CloudFront
```

## Deploy Backend (Node.js/NestJS)

```bash
# Option 1: PM2 (Process Manager)
npm run build                        # Compile TypeScript → dist/
pm2 start dist/main.js --name api    # Chạy với PM2
pm2 save                             # Lưu config
pm2 startup                          # Auto-start khi server reboot

# PM2 features:
# → Auto-restart khi crash
# → Cluster mode (chạy nhiều instances = CPU cores)
# → Log management
# → Zero-downtime reload: pm2 reload api


# Option 2: Docker (recommended cho production)
# (Xem Section 9)
```

## Cấu trúc server production điển hình

```
                    Internet
                       │
                       ▼
              ┌────────────────┐
              │   Cloudflare   │  ← CDN + DDoS protection + DNS
              │    (optional)  │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │     Nginx      │  ← Reverse Proxy + SSL + Gzip + Static files
              │   (port 443)   │
              └───┬───────┬────┘
                  │       │
          ┌───────┘       └───────┐
          ▼                       ▼
  ┌──────────────┐      ┌──────────────┐
  │  Frontend    │      │   Backend     │
  │  (static)    │      │   (Node.js)   │
  │  /var/www/   │      │   :3000       │
  └──────────────┘      └──────┬───────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌──────────┐ ┌───────┐ ┌────────┐
              │PostgreSQL│ │ Redis │ │  S3    │
              │  :5432   │ │ :6379 │ │(files) │
              └──────────┘ └───────┘ └────────┘
```

---

# 9. Docker & Containerization

## Docker là gì?

```
KHÔNG CÓ Docker:
  Dev:  "Trên máy tôi chạy được!"
  Prod: "Tại sao không chạy?" (khác Node version, thiếu dependency, khác OS...)

CÓ Docker:
  Dev packages app + dependencies + OS vào 1 CONTAINER
  → Chạy ở đâu cũng giống nhau (dev = staging = production)

  Container ≠ VM:
  ┌────────────────────────┐   ┌────────────────────────┐
  │     Virtual Machine     │   │       Container        │
  │  ┌───────────────────┐ │   │  ┌───────────────────┐ │
  │  │     App            │ │   │  │     App            │ │
  │  │     Dependencies   │ │   │  │     Dependencies   │ │
  │  │     Guest OS       │ │   │  │     (no OS!)       │ │
  │  └───────────────────┘ │   │  └───────────────────┘ │
  │  Hypervisor            │   │  Docker Engine         │
  │  Host OS               │   │  Host OS               │
  └────────────────────────┘   └────────────────────────┘
  → VM: nặng (~GB), chậm start    → Container: nhẹ (~MB), nhanh (<1s)
```

## Dockerfile cho NestJS

```dockerfile
# ── Stage 1: Build ──
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci                            # Install dependencies (clean install)

COPY . .
RUN npm run build                     # TypeScript → dist/


# ── Stage 2: Production ──
FROM node:20-alpine AS production
WORKDIR /app

# Chỉ copy những gì CẦN THIẾT (giảm image size đáng kể)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Security: chạy với non-root user
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

```bash
# Build image
docker build -t my-api:1.0 .

# Run container
docker run -d --name api \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="secret" \
  my-api:1.0
```

## Docker Compose — Multi-container

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/mydb
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: mydb
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/var/www/frontend
      - ./certs:/etc/ssl
    depends_on:
      - api

volumes:
  postgres_data:
```

```bash
# Khởi động toàn bộ stack
docker compose up -d

# Xem logs
docker compose logs -f api

# Rebuild + restart
docker compose up -d --build
```

---

# 10. CI/CD Pipeline

## CI/CD là gì?

```
CI (Continuous Integration):
  Developer push code → tự động chạy:
  ├── Lint (kiểm tra code style)
  ├── Test (unit tests, integration tests)
  ├── Build (compile, bundle)
  └── Nếu FAIL → thông báo → developer fix

CD (Continuous Deployment/Delivery):
  CI pass → tự động:
  ├── Build Docker image
  ├── Push lên registry
  ├── Deploy lên server/cloud
  └── Health check → Done!

  CI ─────────────────────► CD
  "Code có lỗi không?"      "Deploy lên production"
```

## GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]        # Chỉ chạy khi push vào main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test              # Chờ test pass
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Build Docker image
      - run: docker build -t my-api:${{ github.sha }} .

      # Push to registry
      - run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push my-api:${{ github.sha }}

      # Deploy to server via SSH
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull my-api:${{ github.sha }}
            docker stop api-old || true
            docker rm api-old || true
            docker rename api api-old
            docker run -d --name api \
              -p 3000:3000 \
              --env-file .env \
              my-api:${{ github.sha }}
            sleep 5
            curl -f http://localhost:3000/health || (docker stop api && docker rename api-old api && docker start api)
```

---

# 11. Câu hỏi phỏng vấn

| Câu hỏi | Key answer |
|---|---|
| Nginx là gì? Tại sao dùng? | Web server + reverse proxy + load balancer. Event-driven model → xử lý hàng nghìn connections với ít RAM |
| Nginx xử lý được nhiều connection bằng cách nào? | Event-driven + non-blocking I/O (epoll/kqueue). 1 worker process xử lý hàng nghìn connections, không tạo thread/process cho mỗi connection |
| Master vs Worker process? | Master: đọc config, quản lý workers, bind ports. Worker: xử lý requests, chạy event loop. Số workers = CPU cores |
| Nginx reload config có downtime không? | Không! Graceful reload: tạo workers mới → workers cũ xong requests đang xử lý → tự tắt → zero downtime |
| SSL Termination là gì? | Nginx xử lý HTTPS (chặng client ↔ Nginx), forward HTTP tới backend (chặng Nginx ↔ backend). Backend không cần lo SSL |
| TLS Handshake? | ClientHello → ServerHello (certificate) → Key exchange → Symmetric encryption. TLS 1.3: 1 RTT |
| Location matching priority? | Exact (`=`) → Prefix stop (`^~`) → Regex (`~` `~*`) → Prefix → Catch-all (`/`) |
| Docker container vs VM? | Container: share host OS kernel, nhẹ (MB), start <1s. VM: có guest OS riêng, nặng (GB), start chậm |
| Multi-stage Docker build? | Stage 1: build (compile, install devDependencies). Stage 2: chỉ copy files cần thiết → image nhỏ hơn đáng kể |
| CI/CD là gì? | CI: tự động test + build khi push code. CD: tự động deploy khi CI pass. Giảm lỗi, tăng tốc release |
| Zero-downtime deploy? | Dùng rolling update: container mới start → health check pass → route traffic → stop container cũ |
| Reverse proxy vs Load balancer? | Reverse proxy: forward requests tới backend, ẩn infrastructure. Load balancer: phân phối requests tới NHIỀU backends. Nginx làm cả hai |
