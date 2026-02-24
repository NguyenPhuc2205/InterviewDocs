# DIP, IoC & DI — Ba Khái Niệm Ai Cũng Nhầm

> **Đọc trước khi vào NestJS** — Đây là kiến thức nền tảng về thiết kế phần mềm, không gắn với framework nào. Hiểu đúng 3 khái niệm này sẽ giúp bạn hiểu tại sao NestJS (và Spring, Angular, .NET...) hoạt động như vậy.

---

## Mục lục

1. [Tại sao hay bị nhầm?](#1-tại-sao-hay-bị-nhầm)
2. [Dependency là gì? — Bước đầu tiên](#2-dependency-là-gì)
3. [Dependency Inversion Principle (DIP) — Nguyên lý SOLID](#3-dependency-inversion-principle-dip)
4. [Inversion of Control (IoC) — Nguyên lý thiết kế](#4-inversion-of-control-ioc)
5. [Dependency Injection (DI) — Kỹ thuật cụ thể](#5-dependency-injection-di)
6. [IoC Container — Công cụ tự động hóa](#6-ioc-container)
7. [Mối quan hệ giữa DIP, IoC và DI — Giải quyết mâu thuẫn](#7-mối-quan-hệ-giữa-dip-ioc-và-di)
8. [Phân tích các nguồn mâu thuẫn](#8-phân-tích-các-nguồn-mâu-thuẫn)
9. [Ví dụ thực tế trong TypeScript](#9-ví-dụ-thực-tế-trong-typescript)
10. [Câu hỏi phỏng vấn thường gặp](#10-câu-hỏi-phỏng-vấn)

---

# 1. Tại sao hay bị nhầm?

Ba khái niệm DIP, IoC, DI có tên gọi **rất giống nhau** và đều xoay quanh chữ "dependency" (phụ thuộc) và "inversion" (đảo ngược). Kết quả là:

- Nhiều lập trình viên **dùng lẫn lộn** 3 thuật ngữ như thể chúng là 1
- Các bài viết trên mạng **mâu thuẫn nhau** về mối quan hệ giữa chúng
- Phỏng vấn hỏi "DI là gì?" thì trả lời "IoC", hoặc ngược lại

**Sự thật**: Chúng là **3 thứ khác nhau**, ở **3 mức trừu tượng khác nhau**:

```
┌────────────────────────────────────────────────────┐
│                                                    │
│   DIP    = Nguyên lý thiết kế (SOLID - chữ D)     │  ← "Nên phụ thuộc vào cái gì?"
│                                                    │
│   IoC    = Nguyên lý thiết kế (rộng hơn)           │  ← "Ai kiểm soát cái gì?"
│                                                    │
│   DI     = Kỹ thuật / Mẫu thiết kế                │  ← "Truyền dependency bằng cách nào?"
│                                                    │
└────────────────────────────────────────────────────┘
```

Tóm gọn:
- **DIP** nói: "Đừng phụ thuộc vào chi tiết, hãy phụ thuộc vào trừu tượng"
- **IoC** nói: "Đừng tự kiểm soát, hãy để bên ngoài kiểm soát"
- **DI** nói: "Đây là cách cụ thể để truyền dependency từ bên ngoài vào"

---

# 2. Dependency là gì?

Trước khi nói "đảo ngược dependency", phải hiểu **dependency** nghĩa là gì.

## Định nghĩa

**Dependency** (phụ thuộc) xảy ra khi **class A cần class B để hoàn thành công việc**. Class A không thể hoạt động nếu thiếu class B.

```typescript
class MailService {
  send(to: string, body: string) {
    console.log(`Gửi mail đến ${to}: ${body}`)
  }
}

class AuthService {
  private mailService = new MailService()  // ← AuthService PHỤ THUỘC vào MailService

  register(email: string) {
    // ... tạo tài khoản ...
    this.mailService.send(email, 'Chào mừng!')  // ← Không có MailService thì không gửi mail được
  }
}
```

Ở đây:
- `AuthService` **phụ thuộc** vào `MailService`
- `MailService` là **dependency** (phần phụ thuộc) của `AuthService`
- `AuthService` là **dependent** (bên phụ thuộc)

## Vấn đề của phụ thuộc trực tiếp

Khi class A trực tiếp tạo (`new`) class B bên trong mình, ta gọi là **liên kết chặt** (tight coupling). Hậu quả:

| Vấn đề | Giải thích |
|--------|-----------|
| **Không thể thay thế** | Muốn đổi từ `MailService` sang `SmsService` → phải sửa bên trong `AuthService` |
| **Không thể test** | Viết unit test cho `AuthService` thì buộc phải gửi mail thật — vì không thể thay `MailService` bằng mock |
| **Lan truyền thay đổi** | Sửa constructor `MailService` (thêm tham số) → phải sửa **tất cả** nơi `new MailService(...)` |
| **Khó tái sử dụng** | Muốn dùng `AuthService` ở dự án khác mà dự án đó không có `MailService` → lỗi |

**Đây chính là bối cảnh mà DIP, IoC và DI ra đời để giải quyết.**

---

# 3. Dependency Inversion Principle (DIP)

## DIP là gì?

**DIP** (Dependency Inversion Principle — Nguyên lý Đảo ngược Phụ thuộc) là **nguyên lý cuối cùng** trong 5 nguyên lý SOLID, do **Robert C. Martin** (Uncle Bob) đề xuất năm 1996.

DIP phát biểu 2 quy tắc:

> **Quy tắc 1**: Module cấp cao không nên phụ thuộc vào module cấp thấp. Cả hai nên phụ thuộc vào **trừu tượng** (abstraction).
>
> **Quy tắc 2**: Trừu tượng không nên phụ thuộc vào chi tiết. Chi tiết nên phụ thuộc vào **trừu tượng**.

Nghe trừu tượng quá — hãy dịch sang ngôn ngữ lập trình viên:

| Thuật ngữ | Nghĩa trong code |
|-----------|-------------------|
| **Module cấp cao** | Class chứa logic nghiệp vụ chính (ví dụ: `AuthService`, `OrderService`) |
| **Module cấp thấp** | Class thực hiện chi tiết kỹ thuật (ví dụ: `MySqlDatabase`, `ResendMailer`, `StripePayment`) |
| **Trừu tượng** | Interface hoặc abstract class (ví dụ: `IDatabase`, `IMailer`, `IPayment`) |
| **Chi tiết** | Class cụ thể — implementation (ví dụ: `MySqlDatabase`, `PostgresDatabase`) |

## Tại sao gọi là "Đảo ngược"?

Trong thiết kế thông thường (**không** có DIP), chiều phụ thuộc là:

```
Module cấp cao ──phụ thuộc──▶ Module cấp thấp

    AuthService ──────────▶ MailService (concrete class)
    OrderService ─────────▶ StripePayment (concrete class)
```

Chiều phụ thuộc **đi từ trên xuống** — module cấp cao biết rõ module cấp thấp nào nó đang dùng.

Khi áp dụng DIP, chiều phụ thuộc **bị đảo ngược**:

```
Module cấp cao ──phụ thuộc──▶ Trừu tượng ◀──phụ thuộc── Module cấp thấp

    AuthService ───────▶ IMailer ◀──────── ResendMailer
                                 ◀──────── SmtpMailer
                                 ◀──────── MockMailer
```

Bây giờ:
- `AuthService` (cấp cao) phụ thuộc vào `IMailer` (trừu tượng) — **không biết** dùng Resend hay SMTP
- `ResendMailer` (cấp thấp) **implement** `IMailer` — nó phải tuân theo giao diện mà cấp cao định nghĩa
- Module cấp thấp **phụ thuộc ngược** lên trừu tượng — **đó là lý do gọi "inversion"**

## Ví dụ code: TRƯỚC và SAU khi áp dụng DIP

### ❌ Trước — Vi phạm DIP

```typescript
// Module cấp thấp — chi tiết cụ thể
class ResendMailer {
  send(to: string, subject: string, body: string) {
    // Gọi API Resend để gửi mail
    console.log(`[Resend] Gửi mail đến ${to}`)
  }
}

// Module cấp cao — phụ thuộc TRỰC TIẾP vào module cấp thấp
class AuthService {
  private mailer = new ResendMailer()  // ← Liên kết chặt với ResendMailer

  register(email: string) {
    // ... tạo tài khoản ...
    this.mailer.send(email, 'Xin chào', 'Chào mừng bạn!')
  }
}
```

**Vấn đề**: `AuthService` biết rõ nó dùng `ResendMailer`. Muốn chuyển sang SMTP? Phải mở `AuthService` ra sửa. Muốn test? Buộc phải gọi API Resend thật.

### ✅ Sau — Tuân thủ DIP

```typescript
// Trừu tượng — interface do cấp cao định nghĩa
interface IMailer {
  send(to: string, subject: string, body: string): void
}

// Module cấp thấp — implement trừu tượng (chi tiết phụ thuộc vào trừu tượng)
class ResendMailer implements IMailer {
  send(to: string, subject: string, body: string) {
    console.log(`[Resend] Gửi mail đến ${to}`)
  }
}

class SmtpMailer implements IMailer {
  send(to: string, subject: string, body: string) {
    console.log(`[SMTP] Gửi mail đến ${to}`)
  }
}

// Module cấp cao — phụ thuộc vào trừu tượng (không biết chi tiết)
class AuthService {
  constructor(private mailer: IMailer) {}  // ← Chỉ biết IMailer, không biết class cụ thể

  register(email: string) {
    // ... tạo tài khoản ...
    this.mailer.send(email, 'Xin chào', 'Chào mừng bạn!')
  }
}
```

Bây giờ `AuthService` hoạt động với **bất kỳ IMailer nào** — Resend, SMTP, hay mock để test. Và **không cần sửa** `AuthService` khi thêm phương thức gửi mail mới.

## Tóm tắt DIP

```
┌─────────────────────────────────────────────────────────┐
│  DIP = Nguyên lý thiết kế (Design Principle)            │
│                                                         │
│  Thuộc: SOLID — chữ D                                   │
│  Mức:   Nguyên lý (nói "nên làm gì", không nói "làm   │
│          bằng cách nào")                                │
│  Phát biểu:                                             │
│    1. Cấp cao ← phụ thuộc → Trừu tượng ← implement     │
│       bởi → Cấp thấp                                   │
│    2. Trừu tượng không phụ thuộc chi tiết               │
│  Lợi ích: Giảm liên kết, dễ thay thế, dễ test          │
│  KHÔNG nói cách truyền dependency — chỉ nói CHIỀU       │
│  phụ thuộc nên đi thế nào                               │
└─────────────────────────────────────────────────────────┘
```

---

# 4. Inversion of Control (IoC)

## IoC là gì?

**IoC** (Inversion of Control — Đảo ngược Quyền kiểm soát) là **nguyên lý thiết kế** nói rằng: **thay vì class tự kiểm soát mọi thứ, hãy để bên ngoài kiểm soát**.

"Kiểm soát" ở đây có thể là:
1. **Kiểm soát luồng thực thi** (flow of control) — ai quyết định thứ tự chạy?
2. **Kiểm soát việc tạo dependency** — ai quyết định tạo đối tượng gì?
3. **Kiểm soát vòng đời** — ai quyết định khi nào tạo, khi nào hủy?

## "Đảo ngược" cái gì?

### Cách truyền thống — Class tự kiểm soát

```typescript
class AuthService {
  private mailer: ResendMailer
  private db: MySqlDatabase

  constructor() {
    // AuthService TỰ MÌNH quyết định tạo gì, cấu hình gì
    this.mailer = new ResendMailer({ apiKey: 'xxx' })  // ← Tự tạo
    this.db = new MySqlDatabase({ host: 'localhost' }) // ← Tự tạo
  }
}
```

`AuthService` **kiểm soát** tất cả — nó quyết định:
- Dùng class nào (`ResendMailer`, `MySqlDatabase`)
- Tạo khi nào (`new` trong constructor)
- Cấu hình gì (`apiKey`, `host`)

### Sau khi "đảo ngược" — Bên ngoài kiểm soát

```typescript
class AuthService {
  // AuthService KHÔNG TỰ TẠO gì cả — nhận từ bên ngoài
  constructor(
    private mailer: IMailer,    // ← Ai đó sẽ truyền vào
    private db: IDatabase       // ← Ai đó sẽ truyền vào
  ) {}
}

// "Ai đó" (bên ngoài) kiểm soát:
const mailer = new ResendMailer({ apiKey: 'xxx' })
const db = new MySqlDatabase({ host: 'localhost' })
const auth = new AuthService(mailer, db)  // ← Quyền kiểm soát nằm ở BÊN NGOÀI
```

Quyền kiểm soát đã **đảo ngược**: từ "class tự tạo" → "bên ngoài tạo và đưa vào".

## IoC trong luồng thực thi — Ví dụ framework

IoC không chỉ áp dụng cho dependency. Ví dụ kinh điển nhất là **framework vs thư viện**:

```
Thư viện (Library) — BẠN kiểm soát:
──────────────────────────────────
  const app = express()
  app.get('/users', handler)    // ← BẠN quyết định khi nào gọi gì
  app.listen(3000)              // ← BẠN quyết định khi nào lắng nghe

Framework — FRAMEWORK kiểm soát:
──────────────────────────────────
  @Controller('/users')         // ← FRAMEWORK quyết định khi nào gọi handler
  class UsersController {
    @Get()
    findAll() { return ... }    // ← Bạn chỉ viết logic, framework gọi bạn
  }
```

Đây gọi là **Hollywood Principle** (Nguyên tắc Hollywood):

> "Đừng gọi chúng tôi, chúng tôi sẽ gọi bạn" — Framework gọi code của bạn, không phải bạn gọi framework.

## Các kỹ thuật hiện thực hóa IoC

IoC là nguyên lý **rộng**. Có nhiều kỹ thuật để đạt được IoC:

| Kỹ thuật | Cách làm | Ví dụ |
|----------|----------|-------|
| **Dependency Injection** | Truyền dependency qua constructor/setter/interface | NestJS, Spring, Angular |
| **Service Locator** | Class hỏi một "kho" trung tâm để lấy dependency | `container.get(MailService)` |
| **Template Method** | Class cha định nghĩa khung, class con cài chi tiết | `abstract class Hook { abstract execute() }` |
| **Strategy Pattern** | Truyền thuật toán từ bên ngoài | `sort(arr, compareFn)` |
| **Observer/Event** | Đăng ký lắng nghe, framework gọi khi sự kiện xảy ra | `EventEmitter.on('event', handler)` |
| **Factory Pattern** | Giao việc tạo đối tượng cho factory bên ngoài | `DataAccessFactory.create()` |

Trong số này, **Dependency Injection** là kỹ thuật **phổ biến nhất** và **được khuyến khích nhất** để hiện thực hóa IoC.

## Tóm tắt IoC

```
┌─────────────────────────────────────────────────────────┐
│  IoC = Nguyên lý thiết kế (Design Principle)            │
│                                                         │
│  Mức:   Nguyên lý — rộng hơn DIP, không thuộc SOLID    │
│  Phát biểu: "Đừng tự kiểm soát, hãy để bên ngoài      │
│   kiểm soát việc tạo dependency, luồng thực thi,       │
│   vòng đời đối tượng"                                   │
│  Hiện thực hóa bằng: DI, Service Locator, Factory,     │
│   Template Method, Strategy, Observer...                │
│  KHÔNG nói cụ thể dùng kỹ thuật nào — chỉ nói          │
│  HƯỚNG kiểm soát nên như thế nào                        │
└─────────────────────────────────────────────────────────┘
```

---

# 5. Dependency Injection (DI)

## DI là gì?

**DI** (Dependency Injection — Tiêm phụ thuộc) là **kỹ thuật cụ thể** (design pattern) để hiện thực hóa IoC. Thay vì class tự tạo dependency, **dependency được truyền từ bên ngoài vào**.

Nói đơn giản:
- **Không dùng DI**: Class tự `new` dependency bên trong mình
- **Dùng DI**: Ai đó tạo dependency và **truyền vào** class qua constructor, setter, hoặc interface

## Ba loại Dependency Injection

### 1. Constructor Injection — Truyền qua hàm khởi tạo (phổ biến nhất)

```typescript
class AuthService {
  constructor(private mailer: IMailer) {}  // ← Nhận dependency qua constructor

  register(email: string) {
    this.mailer.send(email, 'Xin chào', 'Chào mừng!')
  }
}

// Sử dụng:
const auth = new AuthService(new ResendMailer())
```

**Ưu điểm**: Dependency bất biến (immutable), rõ ràng (nhìn constructor biết class cần gì), dễ test.

**NestJS, Angular, Spring đều ưu tiên cách này.**

### 2. Property Injection (Setter Injection) — Truyền qua thuộc tính

```typescript
class AuthService {
  mailer!: IMailer  // ← Khai báo, nhưng chưa gán

  register(email: string) {
    this.mailer.send(email, 'Xin chào', 'Chào mừng!')
  }
}

// Sử dụng:
const auth = new AuthService()
auth.mailer = new ResendMailer()  // ← Truyền dependency sau khi tạo
```

**Nhược điểm**: Có thể quên gán → lỗi runtime. Dependency có thể bị thay đổi sau khi tạo.

### 3. Interface Injection — Truyền qua phương thức do interface quy định

```typescript
interface IMailerAware {
  setMailer(mailer: IMailer): void
}

class AuthService implements IMailerAware {
  private mailer!: IMailer

  setMailer(mailer: IMailer): void {
    this.mailer = mailer
  }

  register(email: string) {
    this.mailer.send(email, 'Xin chào', 'Chào mừng!')
  }
}
```

**Ít phổ biến** — chủ yếu dùng trong các framework cũ.

## So sánh 3 loại

| Loại | Ưu điểm | Nhược điểm | Khi nào dùng |
|------|---------|-----------|--------------|
| **Constructor** | Bất biến, rõ ràng, dễ test | Constructor có thể có nhiều tham số | 90% trường hợp — cách mặc định |
| **Property** | Linh hoạt, dependency tùy chọn | Có thể null/undefined, không an toàn | Khi dependency là tùy chọn |
| **Interface** | Hợp đồng rõ ràng | Code phức tạp, ít framework hỗ trợ | Rất hiếm dùng |

## DI khác gì DIP?

Đây là câu hỏi **hay bị nhầm nhất**:

| | DIP | DI |
|---|---|---|
| **Loại** | Nguyên lý (Principle) | Kỹ thuật / Mẫu thiết kế (Pattern) |
| **Hỏi gì** | "Nên phụ thuộc vào **cái gì**?" | "Truyền dependency **bằng cách nào**?" |
| **Trả lời** | "Phụ thuộc vào trừu tượng, không phụ thuộc vào chi tiết" | "Truyền qua constructor / setter / interface" |
| **Không nói** | Không nói cách truyền dependency | Không nói phải dùng interface hay class cụ thể |
| **Ví dụ** | Dùng `IMailer` thay vì `ResendMailer` | `constructor(mailer: IMailer)` thay vì `this.mailer = new ResendMailer()` |

**Bạn có thể dùng DI mà KHÔNG tuân thủ DIP:**

```typescript
// DI ✅ (dependency truyền từ ngoài vào)
// DIP ❌ (vẫn phụ thuộc vào class cụ thể, không phải trừu tượng)
class AuthService {
  constructor(private mailer: ResendMailer) {}  // ← DI nhưng không DIP!
}
```

**Và bạn có thể tuân thủ DIP mà KHÔNG dùng DI:**

```typescript
// DIP ✅ (phụ thuộc vào trừu tượng)
// DI ❌ (tự tạo dependency qua factory, không inject từ ngoài)
class AuthService {
  private mailer: IMailer

  constructor() {
    this.mailer = MailerFactory.create()  // ← DIP nhưng không DI — dùng Factory
  }
}
```

Tuy nhiên, **dùng cả hai** mới đạt được thiết kế tối ưu.

---

# 6. IoC Container

## IoC Container là gì?

Khi dùng DI thủ công, **bạn** phải tự tạo và truyền mọi dependency:

```typescript
// DI thủ công — BẠN tự quản lý tất cả
const config = new ConfigService()
const resend = new ResendClient(config.get('RESEND_API_KEY'))
const mailer = new ResendMailer(resend)
const db = new PrismaDatabase(config.get('DATABASE_URL'))
const userRepo = new UserRepository(db)
const auth = new AuthService(mailer, userRepo)  // ← Phải biết thứ tự tạo

// Dự án lớn: 50+ service, mỗi service 5+ dependency → KHÔNG THỂ quản lý thủ công
```

**IoC Container** (còn gọi là DI Container) là **công cụ tự động hóa** quá trình này:

```
┌─────────────────────────────────────────────┐
│  IoC Container                              │
│                                             │
│  1. Bạn ĐĂNG KÝ: "IMailer → ResendMailer"  │
│  2. Container TỰ PHÂN TÍCH dependency      │
│  3. Container TỰ TẠO instance đúng thứ tự  │
│  4. Container TỰ TRUYỀN (inject) vào       │
│  5. Container TỰ QUẢN LÝ vòng đời         │
│                                             │
└─────────────────────────────────────────────┘
```

## Ví dụ trong NestJS

```typescript
// Bạn chỉ cần ĐĂNG KÝ
@Module({
  providers: [
    { provide: IMailer, useClass: ResendMailer },  // "Khi ai cần IMailer, hãy tạo ResendMailer"
    AuthService,                                    // "AuthService cần IMailer, tôi sẽ lo"
  ],
})
export class AuthModule {}

// Container tự làm phần còn lại:
// 1. Đọc constructor AuthService → thấy cần IMailer
// 2. Tìm: IMailer → ResendMailer
// 3. Tạo ResendMailer
// 4. Tạo AuthService(resendMailer)
// 5. Lưu singleton, tái sử dụng
```

## Các IoC Container phổ biến

| Ngôn ngữ / Framework | IoC Container |
|----------------------|---------------|
| **NestJS** (TypeScript) | `NestContainer` — tích hợp sẵn |
| **Angular** (TypeScript) | `Injector` — tích hợp sẵn |
| **Spring** (Java) | `ApplicationContext` — tích hợp sẵn |
| **.NET Core** (C#) | `ServiceProvider` — tích hợp sẵn |
| **Laravel** (PHP) | `Service Container` — tích hợp sẵn |

---

# 7. Mối quan hệ giữa DIP, IoC và DI

## Câu trả lời dứt khoát

**DIP, IoC và DI KHÔNG có quan hệ cha-con.** Chúng là 3 khái niệm **ở 3 mức trừu tượng khác nhau**, **bổ sung cho nhau**, nhưng **không phải loại này implement loại kia**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  DIP (Nguyên lý SOLID)         IoC (Nguyên lý Thiết kế)                │
│  "Phụ thuộc vào trừu tượng"    "Để bên ngoài kiểm soát"               │
│         │                              │                                │
│         │   ╔══════════════════════╗    │                                │
│         └──▶║  DI (Mẫu thiết kế)  ║◀───┘                                │
│             ║  "Truyền dependency  ║                                    │
│             ║   qua constructor"   ║                                    │
│             ╚══════════════════════╝                                    │
│                      │                                                  │
│                      ▼                                                  │
│             ┌──────────────────┐                                       │
│             │  IoC Container    │                                       │
│             │  (Công cụ tự     │                                       │
│             │   động hóa DI)   │                                       │
│             └──────────────────┘                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Giải thích sơ đồ:

1. **DIP** nói: "Hãy phụ thuộc vào trừu tượng (interface)" → Đây là **mục tiêu thiết kế**
2. **IoC** nói: "Hãy để bên ngoài kiểm soát việc tạo dependency" → Đây là **cách tiếp cận**
3. **DI** là **kỹ thuật cụ thể** giúp bạn đạt được cả DIP lẫn IoC: vừa phụ thuộc vào trừu tượng (DIP), vừa để bên ngoài truyền dependency vào (IoC)
4. **IoC Container** là **công cụ** tự động hóa quá trình DI

## Bảng so sánh chi tiết

| Tiêu chí | DIP | IoC | DI |
|----------|-----|-----|-----|
| **Loại** | Nguyên lý (SOLID - chữ D) | Nguyên lý thiết kế | Kỹ thuật / Mẫu thiết kế |
| **Người đặt tên** | Robert C. Martin (1996) | Martin Fowler phổ biến hóa (2004) | Martin Fowler đặt tên (2004) |
| **Trả lời câu hỏi** | "Phụ thuộc vào **cái gì**?" | "**Ai** kiểm soát?" | "Truyền dependency **bằng cách nào**?" |
| **Mức trừu tượng** | Cao — nguyên lý | Cao — nguyên lý | Thấp — kỹ thuật cụ thể |
| **Phạm vi** | Chiều phụ thuộc giữa các module | Quyền kiểm soát luồng + dependency | Cách truyền dependency |
| **Cần interface?** | **Bắt buộc** — cốt lõi của DIP | Không bắt buộc | Khuyến khích nhưng không bắt buộc |
| **Ví dụ ngắn** | Dùng `IMailer` thay `ResendMailer` | Không `new` trong class, nhận từ ngoài | `constructor(mailer: IMailer)` |
| **Có thể dùng riêng?** | Có — dùng Factory + interface | Có — dùng Event, Template Method | Có — inject class cụ thể (không interface) |

## Mối quan hệ thực tế — Vòng tròn bổ sung

```
Trong thực tế, 3 khái niệm thường DÙNG CÙNG nhau:

  Bước 1 (DIP): Thiết kế interface IMailer
  Bước 2 (IoC): Quyết định AuthService KHÔNG TỰ tạo MailService
  Bước 3 (DI):  Truyền IMailer qua constructor AuthService
  Bước 4 (Container): NestJS tự động làm bước 2-3

Nhưng chúng KHÔNG BẮT BUỘC dùng cùng nhau:

  ✅ DIP không cần DI    → Dùng Factory Pattern + interface
  ✅ DI không cần DIP    → Inject class cụ thể (không interface)  
  ✅ IoC không cần DI    → Dùng Service Locator hoặc Event
  ✅ DI không cần IoC Container → Inject thủ công (tự new và truyền vào)
```

---

# 8. Phân tích các nguồn mâu thuẫn

Các bài viết trên mạng mâu thuẫn nhau vì **góc nhìn khác nhau**. Hãy phân tích từng nguồn:

## Nguồn 1: Viblo (tiếng Việt)

> "IoC là design pattern để implement DIP"

**Đúng một phần, sai một phần**:
- ✅ Đúng: IoC **hỗ trợ** đạt được mục tiêu của DIP
- ❌ Sai: IoC **không chỉ** để implement DIP. IoC rộng hơn — nó áp dụng cho cả luồng thực thi (framework vs thư viện), không chỉ chiều phụ thuộc. Và IoC là **nguyên lý**, không phải pattern

> "DI là subtype của IoC"

- ✅ Đúng: DI là **một trong nhiều kỹ thuật** để hiện thực hóa IoC

## Nguồn 2: TutorialsTeacher

Trình bày 4 bước nối tiếp: **IoC → DIP → DI → IoC Container**

**Cách nhìn này hợp lý** vì nó thể hiện quá trình **tiến hóa** thiết kế:
1. IoC: ý tưởng "đừng tự kiểm soát" (dùng Factory)
2. DIP: cải tiến — "phụ thuộc vào interface" (Factory trả về interface)
3. DI: cải tiến tiếp — "truyền dependency qua constructor" (bỏ Factory)
4. IoC Container: tự động hóa DI

**Nhưng đừng hiểu nhầm** đây là quan hệ cha-con. Đây chỉ là **các bước tiến hóa của thiết kế** — mỗi bước là khái niệm độc lập.

## Nguồn 3: C# Corner

> "IoC là nguyên lý rộng, DI là pattern implement IoC, DIP là SOLID principle riêng"

**Chính xác nhất** trong 3 nguồn. Định nghĩa rõ ràng:
- IoC = nguyên lý (principle) — rộng
- DI = kỹ thuật (pattern) — cụ thể, hiện thực hóa IoC
- DIP = nguyên lý SOLID — riêng biệt, bổ sung cho IoC

## Tổng kết: Đâu là cách hiểu chuẩn?

```
┌──────────────────────────────────────────────────────┐
│  CÁCH HIỂU ĐÚNG:                                     │
│                                                       │
│  ● DIP = Nguyên lý SOLID → nói về CHIỀU phụ thuộc    │
│  ● IoC = Nguyên lý thiết kế → nói về QUYỀN kiểm soát │
│  ● DI  = Kỹ thuật cụ thể → CÁCH truyền dependency    │
│                                                       │
│  DI giúp hiện thực hóa CẢ DIP và IoC cùng lúc.       │
│  Nhưng 3 cái KHÔNG phải cha-con.                      │
│  Chúng ở 3 chiều khác nhau, bổ sung cho nhau.         │
└──────────────────────────────────────────────────────┘
```

**Cách giải thích cho phỏng vấn**:

> "DIP là nguyên lý trong SOLID nói rằng module cấp cao nên phụ thuộc vào trừu tượng, không phụ thuộc trực tiếp vào module cấp thấp. IoC là nguyên lý thiết kế rộng hơn, nói rằng class không nên tự kiểm soát việc tạo dependency mà nên để bên ngoài kiểm soát. DI là kỹ thuật cụ thể để hiện thực hóa IoC — truyền dependency qua constructor, setter hoặc interface. Ba cái bổ sung cho nhau: DIP nói phụ thuộc cái gì, IoC nói ai kiểm soát, DI nói truyền bằng cách nào."

---

# 9. Ví dụ thực tế trong TypeScript

Hãy xem toàn bộ quá trình tiến hóa từ **code tệ** đến **code tốt**, áp dụng lần lượt DIP, IoC, DI.

## Giai đoạn 0 — Không áp dụng gì

```typescript
// ❌ Vi phạm tất cả: DIP, IoC
class OrderService {
  placeOrder(userId: string, items: string[]) {
    // Tự tạo dependency — vi phạm IoC
    // Phụ thuộc class cụ thể — vi phạm DIP
    const db = new MySqlDatabase('localhost', 'root', 'password')
    const mailer = new GmailMailer('smtp.gmail.com', 587)

    const order = { userId, items, createdAt: new Date() }
    db.insert('orders', order)
    mailer.send(userId, 'Đơn hàng đã tạo', JSON.stringify(order))
  }
}
```

**Vấn đề**: Đổi database? Sửa `OrderService`. Đổi mail? Sửa `OrderService`. Test? Phải kết nối MySQL + Gmail thật.

## Giai đoạn 1 — Áp dụng DIP (phụ thuộc vào trừu tượng)

```typescript
// ✅ DIP: Tạo interface
interface IDatabase {
  insert(table: string, data: Record<string, unknown>): void
}

interface IMailer {
  send(to: string, subject: string, body: string): void
}

// Module cấp thấp implement interface
class MySqlDatabase implements IDatabase {
  insert(table: string, data: Record<string, unknown>) {
    console.log(`[MySQL] INSERT INTO ${table}`)
  }
}

class GmailMailer implements IMailer {
  send(to: string, subject: string, body: string) {
    console.log(`[Gmail] Gửi mail đến ${to}`)
  }
}

// ✅ DIP: Module cấp cao phụ thuộc interface
// ❌ IoC: Vẫn TỰ tạo dependency (qua Factory)
class OrderService {
  private db: IDatabase = DatabaseFactory.create()    // Biết interface — DIP ✅
  private mailer: IMailer = MailerFactory.create()     // Nhưng tự tạo — IoC ❌

  placeOrder(userId: string, items: string[]) {
    const order = { userId, items, createdAt: new Date() }
    this.db.insert('orders', order)
    this.mailer.send(userId, 'Đơn hàng đã tạo', JSON.stringify(order))
  }
}
```

**Tiến bộ**: Dùng interface → có thể thay implementation. **Thiếu**: Vẫn tự tạo qua Factory.

## Giai đoạn 2 — Áp dụng IoC + DI (để bên ngoài kiểm soát, truyền qua constructor)

```typescript
// ✅ DIP + IoC + DI — code hoàn chỉnh
class OrderService {
  constructor(
    private db: IDatabase,     // ← DI: nhận từ ngoài, IoC: không tự tạo
    private mailer: IMailer    // ← DIP: phụ thuộc interface, không phải class cụ thể
  ) {}

  placeOrder(userId: string, items: string[]) {
    const order = { userId, items, createdAt: new Date() }
    this.db.insert('orders', order)
    this.mailer.send(userId, 'Đơn hàng đã tạo', JSON.stringify(order))
  }
}

// Sử dụng — tạo ứng dụng:
const db = new MySqlDatabase()
const mailer = new GmailMailer()
const orderService = new OrderService(db, mailer)  // ← DI thủ công
```

## Giai đoạn 3 — Dùng IoC Container (NestJS tự động hóa)

```typescript
// Trong NestJS — container tự động tất cả
@Module({
  providers: [
    { provide: 'IDatabase', useClass: MySqlDatabase },
    { provide: 'IMailer', useClass: GmailMailer },
    OrderService,
  ],
})
export class OrderModule {}

@Injectable()
class OrderService {
  constructor(
    @Inject('IDatabase') private db: IDatabase,
    @Inject('IMailer') private mailer: IMailer,
  ) {}

  placeOrder(userId: string, items: string[]) {
    // ... logic không đổi
  }
}

// NestJS Container tự:
// 1. Tạo MySqlDatabase
// 2. Tạo GmailMailer
// 3. Tạo OrderService(mysqlDb, gmailMailer)
// 4. Quản lý vòng đời (singleton mặc định)
```

## Bảng tiến hóa

| Giai đoạn | DIP | IoC | DI | Container | Đặc điểm |
|-----------|-----|-----|-----|-----------|-----------|
| 0 | ❌ | ❌ | ❌ | ❌ | Liên kết chặt hoàn toàn |
| 1 | ✅ | ❌ | ❌ | ❌ | Dùng interface + Factory |
| 2 | ✅ | ✅ | ✅ | ❌ | Constructor injection thủ công |
| 3 | ✅ | ✅ | ✅ | ✅ | Framework tự động — NestJS |

---

# 10. Câu hỏi phỏng vấn

## Câu 1: DIP, IoC, DI khác nhau thế nào?

**Trả lời**: "DIP là nguyên lý SOLID nói rằng module cấp cao phụ thuộc vào trừu tượng, không phụ thuộc vào chi tiết cụ thể. IoC là nguyên lý thiết kế rộng hơn, nói rằng class không tự kiểm soát việc tạo dependency mà để bên ngoài kiểm soát. DI là kỹ thuật cụ thể: truyền dependency qua constructor, setter hoặc interface. DIP nói phụ thuộc vào cái gì, IoC nói ai kiểm soát, DI nói truyền bằng cách nào."

## Câu 2: DIP và DI có phải cùng 1 thứ không?

**Trả lời**: "Không. DIP là nguyên lý — nói 'nên phụ thuộc vào trừu tượng'. DI là kỹ thuật — nói 'truyền dependency qua constructor'. Có thể dùng DI mà không tuân thủ DIP (inject class cụ thể thay vì interface). Ngược lại, có thể tuân thủ DIP mà không dùng DI (dùng Factory Pattern). Nhưng dùng cả hai thì tối ưu nhất."

## Câu 3: IoC là design pattern hay design principle?

**Trả lời**: "IoC là design principle — nguyên lý thiết kế. Nó nói 'hãy đảo ngược kiểm soát' nhưng không quy định cách làm. DI mới là design pattern — kỹ thuật cụ thể implement IoC."

## Câu 4: Tại sao nhiều bài viết nhầm DI với IoC?

**Trả lời**: "Vì DI là cách phổ biến nhất để hiện thực hóa IoC, nên nhiều người đồng nhất hai khái niệm. Nhưng IoC rộng hơn — bao gồm cả Service Locator, Template Method, Event Pattern. DI chỉ là một kỹ thuật trong số đó."

## Câu 5: DIP trong SOLID cụ thể phát biểu gì?

**Trả lời**: "DIP phát biểu 2 quy tắc: (1) Module cấp cao không phụ thuộc vào module cấp thấp, cả hai phụ thuộc vào trừu tượng. (2) Trừu tượng không phụ thuộc vào chi tiết, chi tiết phụ thuộc vào trừu tượng. Ví dụ: AuthService không import trực tiếp ResendMailer, mà phụ thuộc vào interface IMailer. ResendMailer phải implement IMailer — chi tiết tuân theo trừu tượng."

## Câu 6: Tại sao gọi là 'Inversion' (Đảo ngược)?

**Trả lời**: "Trong DIP: bình thường module cấp cao phụ thuộc trực tiếp vào module cấp thấp — chiều đi từ trên xuống. Khi áp dụng DIP, module cấp thấp phải implement interface do cấp cao định nghĩa — chiều phụ thuộc **đảo ngược**, đi từ dưới lên trừu tượng. Trong IoC: bình thường class tự kiểm soát việc tạo dependency. Khi áp dụng IoC, quyền kiểm soát được **đảo ngược** cho bên ngoài."

## Câu 7: Có phải lúc nào cũng cần interface không?

**Trả lời**: "Không bắt buộc. DIP yêu cầu phụ thuộc vào trừu tượng, nhưng 'trừu tượng' có thể là interface, abstract class, hoặc thậm chí class cha. DI hoàn toàn không yêu cầu interface — có thể inject class cụ thể. Tuy nhiên, dùng interface là cách tốt nhất để đạt cả DIP lẫn DI."

## Câu 8: IoC Container và DI Container khác gì nhau?

**Trả lời**: "Cùng một thứ — hai tên gọi khác nhau. IoC Container nhấn mạnh nguyên lý (IoC), DI Container nhấn mạnh kỹ thuật (DI). Trong thực tế, chúng là framework tự động hóa việc tạo và inject dependency — ví dụ NestContainer trong NestJS, ApplicationContext trong Spring."

## Câu 9: Ngoài DI, còn cách nào khác hiện thực hóa IoC?

**Trả lời**: "Có. Service Locator — class hỏi một 'kho' trung tâm để lấy dependency. Template Method — class cha định nghĩa khung, class con cài chi tiết. Strategy Pattern — truyền thuật toán từ bên ngoài. Observer/Event — đăng ký và lắng nghe sự kiện. Trong số này, DI được ưu tiên vì rõ ràng nhất và dễ test nhất."

## Câu 10: Lợi ích thực tế của việc áp dụng cả 3?

**Trả lời**: "(1) Loose coupling — thay đổi implementation không ảnh hưởng business logic. (2) Dễ test — thay dependency thật bằng mock trong unit test. (3) Dễ mở rộng — thêm implementation mới chỉ cần implement interface, không sửa code cũ (Open/Closed Principle). (4) Code rõ ràng — nhìn constructor biết class cần gì. (5) Framework hỗ trợ tốt — NestJS, Spring, Angular tích hợp sẵn IoC Container."

---

## Tham khảo

| Nguồn | Đường dẫn |
|-------|-----------|
| Robert C. Martin (1996) — DIP gốc | [The Dependency Inversion Principle](https://web.archive.org/web/20110714224327/http://www.objectmentor.com/resources/articles/dip.pdf) |
| Martin Fowler (2004) — Đặt tên DI | [Inversion of Control Containers and the Dependency Injection pattern](https://martinfowler.com/articles/injection.html) |
| TutorialsTeacher — IoC Series | [tutorialsteacher.com/ioc](https://www.tutorialsteacher.com/ioc/introduction) |
| C# Corner — So sánh 3 khái niệm | [c-sharpcorner.com](https://www.c-sharpcorner.com/article/inversion-of-control-vs-dependency-injection-vs-dependency-inversion/) |
| Viblo — Bài tiếng Việt | [viblo.asia](https://viblo.asia/p/dependency-inversion-inversion-of-control-and-dependency-injection-qzakzNYBkyO) |
