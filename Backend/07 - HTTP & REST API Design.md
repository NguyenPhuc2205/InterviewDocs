# HTTP & REST API Design

> **Kiến thức nền tảng** — HTTP methods, status codes, REST principles, versioning, và pagination. Mọi backend developer đều cần nắm vững.

---

# 1. HTTP Methods

| Method | Mục đích | Idempotent? | Safe? | Request Body |
|---|---|---|---|---|
| **GET** | Lấy resource | ✅ Có | ✅ Có | ❌ Không |
| **POST** | Tạo resource mới | ❌ Không | ❌ Không | ✅ Có |
| **PUT** | Thay thế TOÀN BỘ resource | ✅ Có | ❌ Không | ✅ Có |
| **PATCH** | Cập nhật MỘT PHẦN resource | ❌ Không* | ❌ Không | ✅ Có |
| **DELETE** | Xóa resource | ✅ Có | ❌ Không | ❌ Không (thường) |
| **OPTIONS** | Kiểm tra methods được hỗ trợ | ✅ Có | ✅ Có | ❌ Không |
| **HEAD** | Giống GET nhưng không trả body | ✅ Có | ✅ Có | ❌ Không |

**Idempotent** = Gọi 1 lần hay N lần → kết quả giống nhau. `DELETE /users/1` gọi 3 lần → user vẫn bị xóa (1 lần).
**Safe** = Không thay đổi server state. GET chỉ đọc, không sửa.

> 💡 PUT vs PATCH: `PUT` gửi **toàn bộ** object (thiếu field → set null). `PATCH` chỉ gửi **fields cần sửa**.

---

# 2. HTTP Status Codes

## 2xx — Thành công

| Code | Tên | Dùng khi |
|---|---|---|
| **200** | OK | Request thành công (GET, PUT, PATCH, DELETE) |
| **201** | Created | Resource mới được tạo (POST) |
| **204** | No Content | Thành công nhưng không trả body (DELETE) |

## 3xx — Redirect

| Code | Tên | Dùng khi |
|---|---|---|
| **301** | Moved Permanently | URL thay đổi vĩnh viễn |
| **302** | Found | Redirect tạm thời |
| **304** | Not Modified | Cache còn valid → dùng cache |

## 4xx — Client Error

| Code | Tên | Dùng khi |
|---|---|---|
| **400** | Bad Request | Input không hợp lệ (validation fail) |
| **401** | Unauthorized | Chưa xác thực (no/invalid token) |
| **403** | Forbidden | Đã xác thực nhưng không có quyền |
| **404** | Not Found | Resource không tồn tại |
| **405** | Method Not Allowed | HTTP method không được hỗ trợ cho route |
| **409** | Conflict | Xung đột (duplicate email, version conflict) |
| **422** | Unprocessable Entity | Syntax đúng nhưng semantics sai |
| **429** | Too Many Requests | Rate limit exceeded |

## 5xx — Server Error

| Code | Tên | Dùng khi |
|---|---|---|
| **500** | Internal Server Error | Lỗi không xác định trên server |
| **502** | Bad Gateway | Reverse proxy nhận response lỗi từ upstream |
| **503** | Service Unavailable | Server quá tải hoặc đang maintenance |
| **504** | Gateway Timeout | Upstream server không phản hồi kịp |

---

# 3. REST Principles

REST (Representational State Transfer) — **architectural style** cho API design.

## 6 Constraints

| Constraint | Ý nghĩa |
|---|---|
| **Client-Server** | Tách biệt client và server → phát triển độc lập |
| **Stateless** | Mỗi request chứa đủ thông tin → server không lưu session |
| **Cacheable** | Responses có thể cached → tăng performance |
| **Uniform Interface** | Giao diện thống nhất: resources, representations, self-descriptive messages |
| **Layered System** | Client không biết nói chuyện trực tiếp với server hay proxy |
| **Code on Demand** | (Optional) Server có thể gửi executable code cho client |

## Naming Conventions

```
✅ Đúng:
GET    /users          → Lấy danh sách users
GET    /users/123      → Lấy user có id 123
POST   /users          → Tạo user mới
PUT    /users/123      → Update toàn bộ user 123
PATCH  /users/123      → Update 1 phần user 123
DELETE /users/123      → Xóa user 123
GET    /users/123/orders     → Orders của user 123 (nested resource)

❌ Sai:
GET    /getUsers         → Không dùng verb, đã có HTTP method
GET    /user             → Dùng plural (users)
POST   /users/create     → Redundant, POST đã ngụ ý create
GET    /users/123/delete → Dùng DELETE method, không dùng URL
```

---

# 4. Pagination

## Offset-based

```
GET /users?page=3&limit=20

Response:
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 3,
    "limit": 20,
    "totalPages": 8
  }
}
```

## Cursor-based

```
GET /users?cursor=abc123&limit=20

Response:
{
  "data": [...],
  "meta": {
    "nextCursor": "def456",    // null nếu hết
    "hasMore": true
  }
}
```

---

# 5. Filtering, Sorting, Field Selection

```
GET /users?role=admin&status=active          → Filtering
GET /users?sort=-createdAt,+name             → Sorting (- desc, + asc)
GET /users?fields=id,name,email              → Field selection (giảm payload)
GET /users?search=alice                      → Text search
```

---

# 6. Versioning

| Strategy | URL | Ưu/Nhược |
|---|---|---|
| **URI Path** | `/api/v1/users` | ✅ Đơn giản, rõ ràng. ❌ Thay đổi URL |
| **Query Param** | `/api/users?version=1` | ✅ Không đổi URL. ❌ Dễ quên |
| **Header** | `Accept: application/vnd.api.v1+json` | ✅ Clean URL. ❌ Khó debug |

> 💡 **Phổ biến nhất**: URI Path (`/api/v1/...`). Đơn giản, dễ hiểu, dễ debug.

---

# 7. Error Response Format

```json
// Chuẩn format nên dùng
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      { "field": "email", "message": "Email không hợp lệ" },
      { "field": "password", "message": "Tối thiểu 8 ký tự" }
    ]
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "path": "/api/users"
}
```

---

# 8. HTTP/2 và HTTP/3

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| **Protocol** | Text-based | Binary | Binary (QUIC) |
| **Multiplexing** | ❌ (1 request/connection) | ✅ Multiple streams | ✅ + no HOL blocking |
| **Header Compression** | ❌ | ✅ HPACK | ✅ QPACK |
| **Server Push** | ❌ | ✅ | ✅ |
| **Transport** | TCP | TCP | **UDP** (QUIC) |

---

# 9. Chốt — Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Key answer |
|---|---|
| PUT vs PATCH? | PUT: thay toàn bộ resource. PATCH: update 1 phần |
| Idempotent nghĩa là gì? | Gọi N lần → kết quả giống 1 lần. GET, PUT, DELETE: idempotent. POST: không |
| 401 vs 403? | 401: chưa xác thực (no token). 403: đã xác thực nhưng không có quyền |
| REST constraints? | Stateless, Client-Server, Cacheable, Uniform Interface, Layered System |
| Offset vs Cursor pagination? | Offset: đơn giản, chậm page lớn. Cursor: nhanh, không jump page |
| API versioning? | URI Path phổ biến nhất: `/api/v1/users` |
