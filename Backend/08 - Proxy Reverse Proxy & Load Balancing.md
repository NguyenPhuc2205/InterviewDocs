# Proxy, Reverse Proxy & Load Balancing

> **Kiến thức system design** — Forward/Reverse Proxy, Nginx, Load Balancing algorithms. Biết để trả lời câu hỏi "Hệ thống của bạn scale thế nào?"

---

# 1. Forward Proxy

## Là gì?

Forward Proxy đứng **phía client** — đại diện client gửi request tới server. Server KHÔNG biết client thật là ai.

```
Client A ──┐
Client B ──┼──► Forward Proxy ──► Internet ──► Server
Client C ──┘
               (proxy gửi request                (server thấy IP
                thay mặt clients)                  của proxy, không
                                                   thấy IP client)
```

## Dùng khi nào?

| Use case | Giải thích |
|---|---|
| **Ẩn danh** | Server không biết IP client thật |
| **Access Control** | Công ty chặn nhân viên vào Facebook |
| **Caching** | Cache content thường dùng |
| **Bypass geo-restriction** | VPN = Forward Proxy |

---

# 2. Reverse Proxy

## Là gì?

Reverse Proxy đứng **phía server** — đại diện server nhận request từ client. Client KHÔNG biết server thật ở đâu.

```
                                   ┌──► App Server 1 (port 3001)
Client ──► Internet ──► Nginx ─────┼──► App Server 2 (port 3002)
                       (reverse    └──► App Server 3 (port 3003)
                        proxy)
                                   Client chỉ thấy Nginx (port 80),
                                   không biết có 3 servers phía sau
```

## Dùng khi nào?

| Use case | Giải thích |
|---|---|
| **Load Balancing** | Phân phối requests tới nhiều servers |
| **SSL Termination** | Reverse proxy xử lý HTTPS → forward HTTP tới backend |
| **Caching** | Cache static files, API responses |
| **Security** | Ẩn backend servers, WAF, rate limiting |
| **Compression** | Gzip responses trước khi trả client |

## Forward vs Reverse — So sánh

| | Forward Proxy | Reverse Proxy |
|---|---|---|
| **Ở phía** | Client | Server |
| **Bảo vệ** | Client (ẩn identity) | Server (ẩn infrastructure) |
| **Client biết?** | Có (cấu hình proxy) | Không (transparent) |
| **Ví dụ** | VPN, corporate proxy | Nginx, HAProxy, CDN |

---

# 3. Nginx — Reverse Proxy phổ biến nhất

```nginx
# /etc/nginx/nginx.conf

# Upstream — định nghĩa group backend servers
upstream backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name api.example.com;

    # Redirect HTTP → HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate     /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    # Reverse proxy → backend
    location /api/ {
        proxy_pass http://backend;              # forward tới upstream
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location / {
        root /var/www/frontend;
        try_files $uri $uri/ /index.html;       # SPA fallback
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
}
```

---

# 4. Load Balancing

## Tại sao cần?

1 server → giới hạn traffic → cần **nhiều servers** → cần **phân phối requests**.

## Algorithms phổ biến

### Round Robin (mặc định Nginx)

```
Request 1 → Server A
Request 2 → Server B
Request 3 → Server C
Request 4 → Server A  ← lặp lại
```

**Ưu điểm**: Đơn giản, công bằng.
**Nhược điểm**: Không xét server nào đang bận.

### Weighted Round Robin

```nginx
upstream backend {
    server 127.0.0.1:3001 weight=3;  # nhận 3x requests
    server 127.0.0.1:3002 weight=1;  # nhận 1x requests
}
# Server mạnh hơn → weight cao hơn
```

### Least Connections

```
→ Forward request tới server có ÍT CONNECTION NHẤT hiện tại
→ Phù hợp khi requests có thời gian xử lý khác nhau
```

```nginx
upstream backend {
    least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### IP Hash

```
→ Hash client IP → luôn route tới CÙNG server
→ Giải quyết session persistence (sticky sessions)
```

```nginx
upstream backend {
    ip_hash;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

### So sánh

| Algorithm | Cơ chế | Dùng khi |
|---|---|---|
| **Round Robin** | Lần lượt | Default, servers đồng đều |
| **Weighted RR** | Lần lượt + trọng số | Servers khác nhau về capacity |
| **Least Connections** | Server ít connection nhất | Requests có thời gian xử lý khác nhau |
| **IP Hash** | Hash IP → cùng server | Cần session persistence |

## L4 vs L7 Load Balancing

| | L4 (Transport) | L7 (Application) |
|---|---|---|
| **Layer** | TCP/UDP | HTTP/HTTPS |
| **Nhìn thấy** | IP + Port | URL, Headers, Cookies, Body |
| **Routing** | Chỉ dựa trên IP/Port | Dựa trên URL path, header content |
| **Performance** | 🟢 Nhanh hơn | 🔴 Chậm hơn (phải parse HTTP) |
| **Ví dụ** | AWS NLB | Nginx, AWS ALB |
| **Use case** | Database, TCP services | HTTP APIs, microservices routing |

---

# 5. CDN (Content Delivery Network)

```
Không CDN:
  User (Vietnam) ──► Server (US) ──► 200ms latency

Có CDN:
  User (Vietnam) ──► CDN Edge (Singapore) ──► 20ms latency
                     (cached content)
```

**CDN** = Network of edge servers phân bố toàn cầu. Cache static content (images, CSS, JS) ở server gần user nhất.

---

# 6. API Gateway

```
                              ┌──► User Service
Client ──► API Gateway ───────┼──► Order Service
           │                  └──► Payment Service
           │
           ├── Authentication
           ├── Rate Limiting
           ├── Request Routing
           ├── Response Aggregation
           └── Protocol Translation
```

**API Gateway** = Single entry point cho tất cả API requests. Xử lý cross-cutting concerns.

---

# 7. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| Forward vs Reverse Proxy? | Forward: phía client (ẩn client). Reverse: phía server (ẩn server, load balancing) |
| Nginx dùng làm gì? | Reverse proxy, load balancer, SSL termination, serve static files |
| Round Robin vs Least Connections? | RR: lần lượt. LC: chọn server ít connection nhất. LC tốt hơn khi request time khác nhau |
| L4 vs L7 LB? | L4: TCP layer (nhanh, không biết HTTP). L7: HTTP layer (routing theo URL/header) |
| CDN là gì? | Network of edge servers cache static content gần user → giảm latency |
| API Gateway? | Single entry point cho microservices. Xử lý auth, rate limit, routing, aggregation |
