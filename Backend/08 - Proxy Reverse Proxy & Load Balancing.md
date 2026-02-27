# Proxy, Reverse Proxy & Cân bằng tải — Proxy, Reverse Proxy & Load Balancing

> Tài liệu ôn tập phỏng vấn — Kiến thức thiết kế hệ thống (System Design): Forward Proxy (proxy xuôi), Reverse Proxy (proxy ngược), Nginx, các thuật toán cân bằng tải (Load Balancing), CDN (mạng phân phối nội dung), và API Gateway (cổng API). Biết để trả lời câu hỏi: "Hệ thống của bạn mở rộng (scale) thế nào?"

---

# 1. Forward Proxy (Proxy xuôi)

## Khái niệm

Forward Proxy (proxy xuôi) đứng **phía client** — đại diện client gửi yêu cầu tới server. Server **không biết** client thật là ai — chỉ thấy địa chỉ IP của proxy.

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

# 2. Reverse Proxy (Proxy ngược)

## Khái niệm

Reverse Proxy (proxy ngược) đứng **phía server** — đại diện server nhận yêu cầu từ client. Client **không biết** server thật ở đâu — chỉ thấy reverse proxy.

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

# 4. Cân bằng tải (Load Balancing)

## Tại sao cần cân bằng tải?

1 server có giới hạn lưu lượng (traffic) → cần **nhiều server** → cần **phân phối yêu cầu** đều giữa các server.

## Các thuật toán cân bằng tải phổ biến

### Round Robin (Luân phiên — mặc định Nginx)

```
Request 1 → Server A
Request 2 → Server B
Request 3 → Server C
Request 4 → Server A  ← lặp lại
```

**Ưu điểm**: Đơn giản, công bằng.
**Nhược điểm**: Không xét server nào đang bận.

### Weighted Round Robin (Luân phiên có trọng số)

```nginx
upstream backend {
    server 127.0.0.1:3001 weight=3;  # nhận 3x requests
    server 127.0.0.1:3002 weight=1;  # nhận 1x requests
}
# Server mạnh hơn → weight cao hơn
```

### Least Connections (Ít kết nối nhất)

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

### IP Hash (Băm địa chỉ IP — Phiên cố định)

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

## Cân bằng tải L4 và L7 (L4 vs L7 Load Balancing)

| | L4 (Tầng truyền tải — Transport) | L7 (Tầng ứng dụng — Application) |
|---|---|---|
| **Tầng mạng** | TCP/UDP | HTTP/HTTPS |
| **Nhìn thấy gì** | Địa chỉ IP + Cổng | URL, Headers, Cookies, Body |
| **Định tuyến (Routing)** | Chỉ dựa trên IP/Cổng | Dựa trên đường dẫn URL, nội dung header |
| **Hiệu suất** | 🟢 Nhanh hơn (không cần phân tích HTTP) | 🔴 Chậm hơn (phải phân tích HTTP) |
| **Ví dụ** | AWS NLB | Nginx, AWS ALB |
| **Dùng khi** | Cơ sở dữ liệu, dịch vụ TCP | HTTP API, định tuyến microservices |

---

# 5. CDN (Content Delivery Network — Mạng phân phối nội dung)

```
Không CDN:
  User (Vietnam) ──► Server (US) ──► 200ms latency

Có CDN:
  User (Vietnam) ──► CDN Edge (Singapore) ──► 20ms latency
                     (cached content)
```

**CDN** = Mạng các máy chủ biên (edge server) phân bố toàn cầu. Lưu bản sao (cache) nội dung tĩnh (hình ảnh, CSS, JS) tại máy chủ gần người dùng nhất → giảm độ trễ (latency) đáng kể.

---

# 6. API Gateway (Cổng API)

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

**API Gateway (Cổng API)** = Điểm vào duy nhất (single entry point) cho tất cả các yêu cầu API. Xử lý các mối quan tâm chung (cross-cutting concerns) như xác thực, giới hạn tốc độ, định tuyến, gộp phản hồi, và chuyển đổi giao thức.

---

# 7. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Forward Proxy khác Reverse Proxy thế nào? | Forward Proxy (ở phía client): ẩn danh tính client. Reverse Proxy (ở phía server): ẩn hạ tầng server, cân bằng tải, xử lý SSL |
| Nginx dùng làm gì? | Reverse proxy (proxy ngược), cân bằng tải (load balancer), xử lý SSL (SSL termination), phục vụ file tĩnh (static files) |
| Round Robin khác Least Connections thế nào? | Round Robin: luân phiên gửi lần lượt. Least Connections: chọn server có ít kết nối nhất. Least Connections tốt hơn khi các yêu cầu có thời gian xử lý khác nhau |
| L4 khác L7 Load Balancing thế nào? | L4 (tầng TCP): nhanh, không biết nội dung HTTP. L7 (tầng HTTP): định tuyến theo đường dẫn URL, header — linh hoạt hơn nhưng chậm hơn |
| CDN là gì? | Mạng các máy chủ biên (edge server) phân bố toàn cầu, lưu bản sao nội dung tĩnh gần người dùng → giảm độ trễ |
| API Gateway là gì? | Điểm vào duy nhất cho microservices. Xử lý xác thực, giới hạn tốc độ, định tuyến, gộp phản hồi |
