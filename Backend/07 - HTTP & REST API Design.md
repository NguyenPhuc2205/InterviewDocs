# HTTP & Thiết kế REST API

> Tài liệu ôn tập phỏng vấn — bao gồm toàn bộ kiến thức nền tảng về giao thức HTTP và thiết kế REST API: các phương thức HTTP, mã trạng thái (status code), nguyên tắc REST, quy ước đặt tên endpoint, phân trang (pagination), phiên bản hoá API (versioning), lọc/sắp xếp, định dạng phản hồi lỗi, và sự khác biệt giữa HTTP/1.1, HTTP/2, HTTP/3.

---

## Mục lục

1. [HTTP là gì?](#1-http-là-gì)
2. [Các phương thức HTTP](#2-các-phương-thức-http)
3. [Mã trạng thái HTTP](#3-mã-trạng-thái-http)
4. [REST — Nguyên tắc thiết kế API](#4-rest--nguyên-tắc-thiết-kế-api)
5. [Quy ước đặt tên Endpoint](#5-quy-ước-đặt-tên-endpoint)
6. [Phân trang — Pagination](#6-phân-trang--pagination)
7. [Lọc, sắp xếp, và chọn trường](#7-lọc-sắp-xếp-và-chọn-trường)
8. [Phiên bản hoá API — Versioning](#8-phiên-bản-hoá-api--versioning)
9. [Định dạng phản hồi lỗi](#9-định-dạng-phản-hồi-lỗi)
10. [HTTP/1.1, HTTP/2, và HTTP/3](#10-http11-http2-và-http3)
11. [Câu hỏi phỏng vấn thường gặp](#11-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. HTTP là gì?

**HTTP (HyperText Transfer Protocol — Giao thức truyền tải siêu văn bản)** là giao thức nền tảng của World Wide Web, quy định cách client (trình duyệt, ứng dụng di động, v.v.) và server trao đổi dữ liệu qua mạng.

**Đặc điểm cốt lõi:**

| Đặc điểm | Giải thích |
|---|---|
| **Mô hình yêu cầu-phản hồi (Request-Response)** | Client gửi yêu cầu → server xử lý → server trả phản hồi. Server **không bao giờ** chủ động gửi dữ liệu nếu client không yêu cầu |
| **Không trạng thái (Stateless)** | Mỗi yêu cầu hoàn toàn **độc lập** — server không nhớ yêu cầu trước đó. Nếu cần "nhớ" (ví dụ: đăng nhập), phải dùng cơ chế bổ sung (cookie, token) |
| **Dựa trên văn bản (Text-based — HTTP/1.1)** | Header và body dưới dạng văn bản → dễ đọc, dễ debug. HTTP/2 chuyển sang nhị phân (binary) để tăng tốc |

```
Cấu trúc một yêu cầu HTTP:
┌──────────────────────────────────────────┐
│  POST /api/users HTTP/1.1                │ ← Dòng yêu cầu: phương thức + đường dẫn + phiên bản
│  Host: api.example.com                   │ ← Header: thông tin bổ sung
│  Content-Type: application/json          │
│  Authorization: Bearer eyJhbGci...       │
│                                          │
│  {"name": "Nguyen", "email": "n@t.com"}  │ ← Body: dữ liệu gửi kèm
└──────────────────────────────────────────┘

Cấu trúc một phản hồi HTTP:
┌──────────────────────────────────────────┐
│  HTTP/1.1 201 Created                    │ ← Dòng trạng thái: phiên bản + mã + mô tả
│  Content-Type: application/json          │ ← Header
│                                          │
│  {"id": 1, "name": "Nguyen", ...}        │ ← Body: dữ liệu trả về
└──────────────────────────────────────────┘
```

---

# 2. Các phương thức HTTP

| Phương thức | Mục đích | Luỹ đẳng (Idempotent)? | An toàn (Safe)? | Có Body? |
|---|---|---|---|---|
| **GET** | Lấy tài nguyên | ✅ Có | ✅ Có | ❌ Không |
| **POST** | Tạo tài nguyên mới | ❌ Không | ❌ Không | ✅ Có |
| **PUT** | Thay thế **toàn bộ** tài nguyên | ✅ Có | ❌ Không | ✅ Có |
| **PATCH** | Cập nhật **một phần** tài nguyên | ❌ Không* | ❌ Không | ✅ Có |
| **DELETE** | Xoá tài nguyên | ✅ Có | ❌ Không | ❌ Thường không |
| **OPTIONS** | Kiểm tra phương thức được hỗ trợ | ✅ Có | ✅ Có | ❌ Không |
| **HEAD** | Giống GET nhưng không trả body | ✅ Có | ✅ Có | ❌ Không |

### Hai khái niệm quan trọng

**Luỹ đẳng (Idempotent)** — gọi 1 lần hay N lần, **kết quả trên server giống nhau**. Ví dụ: `DELETE /users/1` gọi 3 lần → user vẫn bị xoá (1 lần), kết quả cuối cùng không đổi. Ngược lại, `POST /orders` gọi 3 lần → tạo 3 đơn hàng → **không luỹ đẳng**.

**An toàn (Safe)** — **không thay đổi trạng thái** server. GET chỉ đọc dữ liệu, không tạo/sửa/xoá gì. POST tạo dữ liệu mới → **không an toàn**.

> **PUT so với PATCH — câu hỏi phỏng vấn kinh điển:**
>
> `PUT /users/1` gửi **toàn bộ** đối tượng — trường nào không gửi sẽ bị đặt về `null`. Ví dụ: gửi `{name: "A"}` mà thiếu `email` → email bị xoá.
>
> `PATCH /users/1` chỉ gửi **các trường cần sửa** — trường không gửi giữ nguyên giá trị cũ. Ví dụ: gửi `{name: "A"}` → chỉ sửa name, email giữ nguyên.

---

# 3. Mã trạng thái HTTP

Mã trạng thái (Status Code) nằm trong dòng đầu tiên của phản hồi HTTP, cho biết **kết quả xử lý** yêu cầu.

## 2xx — Thành công

| Mã | Tên | Dùng khi | Phương thức thường dùng |
|---|---|---|---|
| **200** | OK | Yêu cầu thành công, có dữ liệu trả về | GET, PUT, PATCH |
| **201** | Created (Đã tạo) | Tài nguyên mới được tạo thành công | POST |
| **204** | No Content (Không nội dung) | Thành công nhưng không có dữ liệu trả về | DELETE |

## 3xx — Chuyển hướng (Redirect)

| Mã | Tên | Dùng khi |
|---|---|---|
| **301** | Moved Permanently (Đã chuyển vĩnh viễn) | URL cũ đã thay đổi vĩnh viễn sang URL mới. Trình duyệt và công cụ tìm kiếm cập nhật URL |
| **302** | Found (Tìm thấy — chuyển hướng tạm) | Chuyển hướng tạm thời — URL cũ vẫn giữ nguyên |
| **304** | Not Modified (Chưa thay đổi) | Tài nguyên chưa thay đổi so với bản cache → trình duyệt dùng bản cache, server không gửi lại body → tiết kiệm băng thông |

## 4xx — Lỗi phía client

| Mã | Tên | Dùng khi |
|---|---|---|
| **400** | Bad Request (Yêu cầu sai) | Dữ liệu đầu vào không hợp lệ (validation thất bại) |
| **401** | Unauthorized (Chưa xác thực) | Chưa đăng nhập hoặc token không hợp lệ/hết hạn. Lưu ý: tên gọi "Unauthorized" gây nhầm lẫn nhưng thực tế nghĩa là **chưa xác thực** |
| **403** | Forbidden (Không có quyền) | Đã xác thực (biết bạn là ai) nhưng **không có quyền** truy cập tài nguyên này |
| **404** | Not Found (Không tìm thấy) | Tài nguyên không tồn tại |
| **405** | Method Not Allowed (Phương thức không cho phép) | Route tồn tại nhưng phương thức HTTP không được hỗ trợ (ví dụ: gửi DELETE tới route chỉ hỗ trợ GET) |
| **409** | Conflict (Xung đột) | Xung đột dữ liệu — email đã tồn tại, version không khớp (optimistic locking) |
| **422** | Unprocessable Entity (Thực thể không xử lý được) | Cú pháp đúng nhưng **ngữ nghĩa sai** — ví dụ: ngày bắt đầu lớn hơn ngày kết thúc |
| **429** | Too Many Requests (Quá nhiều yêu cầu) | Vượt quá giới hạn tốc độ (rate limit) |

> **Phỏng vấn hay hỏi:** "401 khác 403 thế nào?" → **401** = "Tôi **chưa biết bạn là ai**" (chưa xác thực — cần đăng nhập). **403** = "Tôi **biết bạn là ai**, nhưng bạn **không có quyền**" (đã xác thực nhưng bị từ chối).

## 5xx — Lỗi phía server

| Mã | Tên | Dùng khi |
|---|---|---|
| **500** | Internal Server Error (Lỗi server nội bộ) | Lỗi không xác định trên server — code bị exception, cơ sở dữ liệu lỗi, v.v. |
| **502** | Bad Gateway (Cổng xấu) | Reverse proxy (Nginx) nhận phản hồi lỗi từ backend phía sau — backend crash hoặc trả phản hồi không hợp lệ |
| **503** | Service Unavailable (Dịch vụ không khả dụng) | Server quá tải hoặc đang bảo trì — thường kèm header `Retry-After` cho biết khi nào thử lại |
| **504** | Gateway Timeout (Cổng hết thời gian chờ) | Backend phía sau không phản hồi kịp thời → reverse proxy hết thời gian chờ |

---

# 4. REST — Nguyên tắc thiết kế API

## REST là gì?

**REST (Representational State Transfer — Chuyển giao trạng thái đại diện)** là một **phong cách kiến trúc** (architectural style) cho thiết kế API, được Roy Fielding đề xuất trong luận án tiến sĩ năm 2000. REST không phải là giao thức hay tiêu chuẩn — nó là một **tập hợp các ràng buộc** (constraints) mà nếu API tuân thủ đầy đủ thì được gọi là **RESTful API**.

**Nói đơn giản:** REST định nghĩa cách client và server giao tiếp qua HTTP sao cho hệ thống đơn giản, dễ mở rộng, và dễ bảo trì. Mọi thứ được xem là **tài nguyên** (resource) — người dùng, bài viết, đơn hàng — và mỗi tài nguyên có một URL duy nhất để định danh.

## 6 ràng buộc (Constraints) của REST

| Ràng buộc | Giải thích | Ý nghĩa thực tế |
|---|---|---|
| **Client-Server (Tách biệt client và server)** | Client xử lý giao diện, server xử lý dữ liệu và logic → hai bên phát triển **độc lập** | Frontend (React) và backend (NestJS) không phụ thuộc nhau, deploy riêng |
| **Stateless (Không trạng thái)** | Mỗi yêu cầu chứa **đầy đủ** thông tin cần thiết → server **không lưu** trạng thái phiên giữa các yêu cầu | Mỗi yêu cầu gửi kèm token xác thực, server không nhớ yêu cầu trước |
| **Cacheable (Có thể lưu bộ nhớ đệm)** | Phản hồi phải chỉ rõ có được cache không → giảm tải server, tăng tốc client | Header `Cache-Control`, `ETag`, `Expires` cho biết cache được hay không |
| **Uniform Interface (Giao diện thống nhất)** | Giao tiếp thống nhất qua: **tài nguyên** (resource), **biểu diễn** (representation = JSON/XML), và **thông điệp tự mô tả** (self-descriptive messages) | URL xác định tài nguyên, phương thức HTTP xác định hành động, Content-Type xác định định dạng |
| **Layered System (Hệ thống phân tầng)** | Client không biết mình nói chuyện trực tiếp với server hay qua proxy/load balancer/CDN | Thêm Nginx, CDN, API Gateway mà client không cần thay đổi gì |
| **Code on Demand (Tuỳ chọn)** | Server có thể gửi mã thực thi cho client (ví dụ: JavaScript) | Ít khi dùng trong REST API thực tế |

## Tài nguyên và URL — Cốt lõi của REST

Trong REST, mọi thứ là **tài nguyên (resource)**. Mỗi tài nguyên có một **URL duy nhất** (Uniform Resource Locator) để định danh, và **phương thức HTTP** quyết định hành động lên tài nguyên đó.

```
Tài nguyên "Người dùng":
  URL: /users         → đại diện tập hợp tất cả người dùng
  URL: /users/123     → đại diện người dùng có id 123

Hành động (dùng phương thức HTTP, KHÔNG dùng động từ trong URL):
  GET    /users       → Lấy danh sách người dùng
  POST   /users       → Tạo người dùng mới
  GET    /users/123   → Lấy thông tin người dùng 123
  PUT    /users/123   → Cập nhật toàn bộ thông tin người dùng 123
  DELETE /users/123   → Xoá người dùng 123
```

---

# 5. Quy ước đặt tên Endpoint

```
✅ Đúng — tuân thủ REST:
GET    /users              → Lấy danh sách người dùng
GET    /users/123          → Lấy người dùng có id 123
POST   /users              → Tạo người dùng mới
PUT    /users/123          → Cập nhật toàn bộ người dùng 123
PATCH  /users/123          → Cập nhật một phần người dùng 123
DELETE /users/123          → Xoá người dùng 123
GET    /users/123/orders   → Lấy đơn hàng của người dùng 123 (tài nguyên lồng nhau)

❌ Sai — vi phạm REST:
GET    /getUsers           → Không dùng động từ — phương thức HTTP đã xác định hành động
GET    /user               → Dùng số nhiều (users), không dùng số ít
POST   /users/create       → Thừa — POST đã ngụ ý "tạo mới"
GET    /users/123/delete   → Dùng phương thức DELETE, không nhét hành động vào URL
```

**Các quy tắc quan trọng:**

| Quy tắc | Ví dụ |
|---|---|
| Dùng **danh từ số nhiều** cho tên tài nguyên | `/users`, `/orders`, `/products` |
| Dùng **dấu gạch nối** (-) thay vì gạch dưới (_) | `/user-profiles` chứ không phải `/user_profiles` |
| **Chữ thường** toàn bộ URL | `/api/users` chứ không phải `/api/Users` |
| Tài nguyên lồng nhau biểu diễn **quan hệ sở hữu** | `/users/123/orders` = đơn hàng thuộc về người dùng 123 |
| Không quá **3 cấp** lồng nhau | `/users/123/orders/456` là giới hạn hợp lý |

---

# 6. Phân trang — Pagination

## Phân trang theo độ lệch (Offset-based)

```
GET /users?page=3&limit=20

Phản hồi:
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

**Ưu điểm:** Đơn giản, cho phép nhảy tới bất kỳ trang nào (trang 1, trang 5, trang 10...).

**Nhược điểm:** Chậm khi trang lớn (`OFFSET 10000` → cơ sở dữ liệu phải quét 10000 dòng rồi bỏ qua). Dữ liệu có thể bị lặp hoặc thiếu nếu có thêm/xoá giữa hai lần gọi.

## Phân trang theo con trỏ (Cursor-based)

```
GET /users?cursor=abc123&limit=20

Phản hồi:
{
  "data": [...],
  "meta": {
    "nextCursor": "def456",    // null nếu hết dữ liệu
    "hasMore": true
  }
}
```

**Ưu điểm:** Hiệu suất ổn định bất kể vị trí (dùng `WHERE id > cursor` thay vì `OFFSET`). Dữ liệu nhất quán khi có thêm/xoá.

**Nhược điểm:** Không thể nhảy tới trang bất kỳ — chỉ đi tiếp (next) hoặc lùi (prev).

### So sánh

| | Offset (Độ lệch) | Cursor (Con trỏ) |
|---|---|---|
| **Hiệu suất trang lớn** | 🔴 Chậm (quét rồi bỏ qua) | 🟢 Nhanh (WHERE + LIMIT) |
| **Nhảy trang** | ✅ Được | ❌ Chỉ tiến/lùi |
| **Dữ liệu nhất quán** | 🔴 Có thể bị lặp/thiếu | 🟢 Ổn định |
| **Độ phức tạp** | Đơn giản | Phức tạp hơn |
| **Phù hợp khi** | Trang quản trị, ít dữ liệu | Cuộn vô tận (infinite scroll), bảng tin (feed), API công cộng |

---

# 7. Lọc, sắp xếp, và chọn trường

```
GET /users?role=admin&status=active          → Lọc (filtering): chỉ lấy admin đang hoạt động
GET /users?sort=-createdAt,+name             → Sắp xếp (sorting): - giảm dần, + tăng dần
GET /users?fields=id,name,email              → Chọn trường (field selection): chỉ trả về 3 trường → giảm kích thước phản hồi
GET /users?search=alice                      → Tìm kiếm văn bản (text search)
```

**Tại sao cần chọn trường (field selection)?** Khi danh sách tài nguyên có nhiều trường (20+ trường mỗi đối tượng), client thường chỉ cần vài trường → giảm kích thước phản hồi, giảm dữ liệu truyền tải, tăng tốc độ tải trang.

---

# 8. Phiên bản hoá API — Versioning

Khi API thay đổi (thêm/bớt trường, đổi cấu trúc), cần giữ **phiên bản cũ hoạt động** cho client chưa cập nhật. Có 3 chiến lược chính:

| Chiến lược | Ví dụ | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **Đường dẫn URI (URI Path)** | `/api/v1/users` | Đơn giản, rõ ràng, dễ debug | URL thay đổi khi đổi phiên bản |
| **Tham số truy vấn (Query Param)** | `/api/users?version=1` | Không đổi URL cơ bản | Dễ quên tham số, khó cache |
| **Header** | `Accept: application/vnd.api.v1+json` | URL sạch, tách biệt hoàn toàn | Khó debug (không thấy trong URL), khó test bằng trình duyệt |

> **Phổ biến nhất trong thực tế:** **Đường dẫn URI** (`/api/v1/...`) — đơn giản, dễ hiểu, dễ debug, nhìn vào URL là biết phiên bản nào.

---

# 9. Định dạng phản hồi lỗi

Một định dạng lỗi nhất quán giúp client xử lý lỗi dễ dàng và cung cấp thông tin rõ ràng cho lập trình viên debug.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu đầu vào không hợp lệ",
    "details": [
      { "field": "email", "message": "Email không hợp lệ" },
      { "field": "password", "message": "Mật khẩu tối thiểu 8 ký tự" }
    ]
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "path": "/api/users"
}
```

**Các trường quan trọng:**

| Trường | Mục đích |
|---|---|
| `success` | `true` hoặc `false` — client kiểm tra nhanh thành công/thất bại |
| `error.code` | Mã lỗi chuỗi (VALIDATION_ERROR, NOT_FOUND...) — dễ dùng trong code hơn so với số |
| `error.message` | Mô tả lỗi tổng quan — hiển thị cho người dùng hoặc ghi log |
| `error.details` | Chi tiết từng trường lỗi — tiện cho form validation (hiển thị lỗi cạnh mỗi trường) |
| `timestamp` | Thời điểm xảy ra lỗi — hữu ích cho debug và theo dõi log |
| `path` | Đường dẫn API gây lỗi — giúp xác định nhanh endpoint nào có vấn đề |

---

# 10. HTTP/1.1, HTTP/2, và HTTP/3

## Sự tiến hoá của giao thức HTTP

| | HTTP/1.1 (1997) | HTTP/2 (2015) | HTTP/3 (2022) |
|---|---|---|---|
| **Giao thức nền** | TCP | TCP | **UDP** (qua QUIC) |
| **Định dạng** | Văn bản (text) | Nhị phân (binary) | Nhị phân (binary) |
| **Ghép kênh (Multiplexing)** | ❌ Mỗi yêu cầu cần 1 kết nối riêng | ✅ Nhiều yêu cầu trên 1 kết nối | ✅ + không bị HOL blocking |
| **Nén header (Header Compression)** | ❌ Không | ✅ HPACK | ✅ QPACK |
| **Server Push** | ❌ Không | ✅ Có | ✅ Có |

### Vấn đề chính của HTTP/1.1

```
HTTP/1.1 — Mỗi yêu cầu phải chờ yêu cầu trước xong:
  Kết nối 1: [Yêu cầu HTML]──chờ──[Phản hồi HTML] → [Yêu cầu CSS]──chờ──[Phản hồi CSS]
  Kết nối 2: [Yêu cầu JS]──chờ──[Phản hồi JS]     → [Yêu cầu ảnh]──chờ──[Phản hồi ảnh]
  
  → Phải mở nhiều kết nối TCP (thường 6 kết nối song song)
  → Mỗi kết nối cần bắt tay TCP riêng → tốn thời gian
```

### HTTP/2 giải quyết bằng ghép kênh (Multiplexing)

```
HTTP/2 — Nhiều yêu cầu trên 1 kết nối, xen kẽ nhau:
  Kết nối 1: [HTML][CSS][JS][ảnh] → tất cả trên cùng 1 kết nối
  
  → Chỉ cần 1 kết nối TCP duy nhất
  → Không phải chờ tuần tự → nhanh hơn đáng kể

Nhược điểm: Nếu 1 gói tin TCP bị mất → TẤT CẢ yêu cầu bị chặn (HOL blocking ở tầng TCP)
```

### HTTP/3 giải quyết bằng QUIC (UDP)

```
HTTP/3 (QUIC) — Mỗi yêu cầu là 1 luồng (stream) độc lập:
  Luồng 1: [HTML] → mất gói tin → chỉ luồng 1 bị ảnh hưởng
  Luồng 2: [CSS]  → vẫn chạy bình thường
  Luồng 3: [JS]   → vẫn chạy bình thường
  
  → Không còn HOL blocking
  → Bắt tay nhanh hơn (0-RTT với kết nối lại)
  → Chuyển mạng mượt mà (từ Wi-Fi sang 4G không bị đứt kết nối)
```

---

# 11. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| PUT khác PATCH thế nào? | PUT thay thế **toàn bộ** tài nguyên (trường thiếu bị xoá). PATCH chỉ cập nhật **một phần** (trường không gửi giữ nguyên) |
| Idempotent (luỹ đẳng) nghĩa là gì? | Gọi N lần cho kết quả giống gọi 1 lần. GET, PUT, DELETE là luỹ đẳng. POST thì không — mỗi lần gọi tạo thêm 1 tài nguyên mới |
| 401 khác 403 thế nào? | 401 = chưa xác thực (chưa biết bạn là ai — cần đăng nhập). 403 = đã xác thực nhưng không có quyền (biết bạn là ai nhưng bạn không được phép) |
| REST là gì? Có bao nhiêu ràng buộc? | REST là phong cách kiến trúc thiết kế API do Roy Fielding đề xuất. Có 6 ràng buộc: Client-Server, Stateless, Cacheable, Uniform Interface, Layered System, Code on Demand (tuỳ chọn) |
| Offset khác Cursor pagination thế nào? | Offset: đơn giản, nhảy trang được, nhưng chậm khi trang lớn. Cursor: hiệu suất ổn định, dữ liệu nhất quán, nhưng không nhảy trang được |
| API Versioning nên dùng cách nào? | Đường dẫn URI (`/api/v1/users`) phổ biến nhất — đơn giản, rõ ràng, dễ debug |
| HTTP/2 cải tiến gì so với HTTP/1.1? | Ghép kênh (nhiều yêu cầu trên 1 kết nối), nén header (HPACK), server push, định dạng nhị phân thay vì văn bản |
| HTTP/3 khác HTTP/2 thế nào? | Dùng QUIC (UDP) thay TCP → không bị HOL blocking ở tầng truyền tải, bắt tay nhanh hơn, chuyển mạng mượt mà |
