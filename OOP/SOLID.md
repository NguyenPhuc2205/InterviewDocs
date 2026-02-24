# Nguyên Lý SOLID — Hướng Dẫn Chi Tiết

> **Trọng tâm phỏng vấn** — SOLID là bộ 5 nguyên lý thiết kế hướng đối tượng mà **mọi cuộc phỏng vấn backend** đều hỏi. Tài liệu này giải thích từng nguyên lý bằng ví dụ TypeScript thực tế, có code vi phạm và tuân thủ để so sánh.
>
> Tham khảo thêm: [DIP, IoC & DI chi tiết](./NestJS/00%20-%20DIP,%20IoC%20%26%20DI.md) — tài liệu riêng về nguyên lý D

---

## Mục lục

1. [SOLID là gì?](#1-solid-là-gì)
2. [S — Single Responsibility (Đơn trách nhiệm)](#2-s--single-responsibility)
3. [O — Open/Closed (Mở–Đóng)](#3-o--openclosed)
4. [L — Liskov Substitution (Thay thế Liskov)](#4-l--liskov-substitution)
5. [I — Interface Segregation (Phân tách giao diện)](#5-i--interface-segregation)
6. [D — Dependency Inversion (Đảo ngược phụ thuộc)](#6-d--dependency-inversion)
7. [SOLID trong thực tế — Khi nào áp dụng?](#7-solid-trong-thực-tế)
8. [Câu hỏi phỏng vấn](#8-câu-hỏi-phỏng-vấn)

---

# 1. SOLID là gì?

## Nguồn gốc

**SOLID** là viết tắt của 5 nguyên lý thiết kế hướng đối tượng (OOP), được **Robert C. Martin** (Uncle Bob) đề xuất vào đầu những năm 2000. Tên gọi SOLID do **Michael Feathers** gợi ý.

| Chữ cái | Nguyên lý | Ý nghĩa ngắn |
|---------|-----------|---------------|
| **S** | Single Responsibility | Mỗi class chỉ có **1 lý do** để thay đổi |
| **O** | Open/Closed | **Mở** cho mở rộng, **đóng** cho sửa đổi |
| **L** | Liskov Substitution | Class con **thay thế** được class cha mà không gây lỗi |
| **I** | Interface Segregation | Interface nhỏ, gọn — **không ép** implement thứ không cần |
| **D** | Dependency Inversion | Phụ thuộc vào **trừu tượng**, không phụ thuộc vào chi tiết |

## Tại sao quan trọng?

Không có SOLID, dự án lớn sẽ gặp:

```
Dự án không SOLID:
├── Sửa 1 file → hỏng 5 file khác (coupling chặt)
├── Thêm tính năng → phải sửa code cũ (không mở rộng được)
├── Test → phải mock cả thế giới (dependency chằng chịt)
├── Đọc code → không biết class này làm gì (quá nhiều trách nhiệm)
└── Bảo trì → nhà phát triển mới mất 2 tuần để hiểu 1 file

Dự án có SOLID:
├── Sửa 1 file → chỉ ảnh hưởng 1 file (loose coupling)
├── Thêm tính năng → tạo file mới, không sửa file cũ
├── Test → mock 1-2 interface đơn giản
├── Đọc code → tên class = trách nhiệm duy nhất
└── Bảo trì → 30 phút hiểu 1 module
```

---

# 2. S — Single Responsibility

## Phát biểu

> **Mỗi class chỉ nên có một lý do duy nhất để thay đổi.**

Nghĩa là: mỗi class chỉ đảm nhận **một trách nhiệm** (responsibility). Nếu class có 2 lý do để thay đổi, nó đang làm quá nhiều việc.

## "Lý do để thay đổi" là gì?

Nhiều người hiểu SRP là "class chỉ làm 1 việc" — nhưng đó là hiểu **chưa đủ**. Uncle Bob định nghĩa chính xác hơn:

> **Một module nên chịu trách nhiệm trước một và chỉ một actor (bên liên quan).**

"Actor" là **nhóm người/bộ phận** sẽ yêu cầu thay đổi class đó. Ví dụ:
- Bộ phận **kế toán** yêu cầu thay đổi cách tính lương → đó là 1 actor
- Bộ phận **nhân sự** yêu cầu thay đổi format báo cáo → đó là actor khác
- Nếu 1 class `Employee` phục vụ cả 2 bộ phận → vi phạm SRP

## ❌ Vi phạm SRP

```typescript
class UserService {
  // Trách nhiệm 1: Xác thực người dùng
  async login(email: string, password: string) {
    const user = await this.findByEmail(email)
    if (!user) throw new Error('Không tìm thấy người dùng')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('Sai mật khẩu')
    return this.generateToken(user)
  }

  // Trách nhiệm 2: Gửi email
  async sendWelcomeEmail(user: User) {
    const html = this.renderTemplate('welcome', user)  // tạo nội dung email
    await this.mailer.send(user.email, 'Chào mừng', html)
  }

  // Trách nhiệm 3: Ghi log
  logActivity(userId: string, action: string) {
    fs.appendFileSync('activity.log', `${userId}: ${action}\n`)
  }

  // Trách nhiệm 4: Truy vấn database
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }
}
```

**Vấn đề**: `UserService` có **4 lý do để thay đổi**:
1. Đổi logic xác thực → sửa `UserService`
2. Đổi template email → sửa `UserService`
3. Đổi cách ghi log (từ file sang database) → sửa `UserService`
4. Đổi cách truy vấn database → sửa `UserService`

## ✅ Tuân thủ SRP

```typescript
// Mỗi class = 1 trách nhiệm = 1 lý do thay đổi

class AuthService {
  constructor(
    private userRepo: UserRepository,
    private tokenService: TokenService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email)
    if (!user) throw new Error('Không tìm thấy người dùng')
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('Sai mật khẩu')
    return this.tokenService.generate(user)
  }
}

class MailService {
  async sendWelcome(user: User) {
    const html = this.renderTemplate('welcome', user)
    await this.mailer.send(user.email, 'Chào mừng', html)
  }
}

class ActivityLogger {
  log(userId: string, action: string) {
    // Ghi vào database hoặc file — chỉ class này biết
  }
}

class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }
}
```

Giờ đổi cách ghi log? Chỉ sửa `ActivityLogger`. Đổi database? Chỉ sửa `UserRepository`. Các class khác **không bị ảnh hưởng**.

## SRP trong NestJS

NestJS **ép bạn tuân thủ SRP** qua kiến trúc:

```
Controller  → chỉ nhận request, trả response (1 trách nhiệm)
Service     → chỉ xử lý logic nghiệp vụ (1 trách nhiệm)
Repository  → chỉ truy vấn database (1 trách nhiệm)
Guard       → chỉ kiểm tra quyền (1 trách nhiệm)
Pipe        → chỉ validate/transform dữ liệu (1 trách nhiệm)
```

## Dấu hiệu vi phạm SRP

| Dấu hiệu | Giải thích |
|-----------|-----------|
| Class có từ "And" hoặc "Manager" trong tên | `UserAndOrderService` → 2 trách nhiệm |
| File hơn 200-300 dòng | Có thể class đang làm quá nhiều |
| Constructor có 5+ dependency | Class cần quá nhiều thứ → có thể tách |
| Khi mô tả class phải dùng "và" | "Class này xử lý đăng nhập **và** gửi email **và** ghi log" |
| Nhiều bộ phận khác nhau yêu cầu sửa cùng 1 class | 2 actor → 2 class |

---

# 3. O — Open/Closed

## Phát biểu

> **Class nên mở cho mở rộng (open for extension), nhưng đóng cho sửa đổi (closed for modification).**

Nghĩa là: khi cần thêm tính năng mới, bạn **tạo code mới** (mở rộng) thay vì **sửa code cũ** (sửa đổi).

## Tại sao "đóng cho sửa đổi"?

Mỗi lần sửa code cũ:
- Có thể **phá hỏng** tính năng đang hoạt động
- Phải **test lại** tất cả test case cũ
- Nếu nhiều người cùng sửa 1 file → **xung đột** (merge conflict)
- Code đang chạy trên production → sửa = **rủi ro**

## ❌ Vi phạm OCP

```typescript
class PaymentProcessor {
  process(method: string, amount: number) {
    if (method === 'credit_card') {
      // Xử lý thẻ tín dụng
      console.log(`Thanh toán ${amount} bằng thẻ tín dụng`)
    } else if (method === 'momo') {
      // Xử lý MoMo
      console.log(`Thanh toán ${amount} bằng MoMo`)
    } else if (method === 'zalopay') {
      // Xử lý ZaloPay
      console.log(`Thanh toán ${amount} bằng ZaloPay`)
    }
    // Thêm phương thức mới? → Phải SỬA class này, thêm else if
    // → Vi phạm OCP: đang SỬA ĐỔI code cũ thay vì MỞ RỘNG
  }
}
```

**Vấn đề**: Mỗi lần thêm phương thức thanh toán mới (VNPay, PayPal...) → phải mở `PaymentProcessor` ra sửa → rủi ro phá hỏng logic cũ.

## ✅ Tuân thủ OCP — Dùng Strategy Pattern

```typescript
// Bước 1: Định nghĩa interface (trừu tượng)
interface PaymentStrategy {
  pay(amount: number): void
}

// Bước 2: Mỗi phương thức thanh toán = 1 class riêng
class CreditCardPayment implements PaymentStrategy {
  pay(amount: number) {
    console.log(`Thanh toán ${amount} bằng thẻ tín dụng`)
  }
}

class MoMoPayment implements PaymentStrategy {
  pay(amount: number) {
    console.log(`Thanh toán ${amount} bằng MoMo`)
  }
}

class ZaloPayPayment implements PaymentStrategy {
  pay(amount: number) {
    console.log(`Thanh toán ${amount} bằng ZaloPay`)
  }
}

// Bước 3: PaymentProcessor ĐÓNG cho sửa đổi
class PaymentProcessor {
  constructor(private strategy: PaymentStrategy) {}

  process(amount: number) {
    this.strategy.pay(amount)  // Ủy thác cho strategy
  }
}

// Sử dụng:
const processor = new PaymentProcessor(new MoMoPayment())
processor.process(100000)

// Thêm VNPay? → Tạo class VNPayPayment mới → KHÔNG SỬA PaymentProcessor
class VNPayPayment implements PaymentStrategy {
  pay(amount: number) {
    console.log(`Thanh toán ${amount} bằng VNPay`)
  }
}
```

**Thêm phương thức mới = tạo class mới**. `PaymentProcessor` **không bao giờ cần sửa**.

## OCP trong NestJS — Ví dụ thực tế

```typescript
// Middleware chain — thêm middleware mới không sửa code cũ
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware, AuthMiddleware)  // Thêm middleware mới ở đây
      .forRoutes('*')
  }
}

// Guard — thêm guard mới không sửa controller
@UseGuards(AuthGuard, RolesGuard)  // Thêm guard mới = thêm vào danh sách
@Controller('admin')
class AdminController {}

// Provider — thay implementation không sửa service
providers: [
  { provide: 'IMailer', useClass: ResendMailer }  // Đổi sang SmtpMailer? Sửa ở đây, không sửa service
]
```

## Dấu hiệu vi phạm OCP

| Dấu hiệu | Giải thích |
|-----------|-----------|
| Chuỗi `if/else if` hoặc `switch` dài | Mỗi nhánh = 1 behavior → nên tách thành class riêng |
| Thêm tính năng = sửa class cũ | Đang "mở cho sửa đổi" → cần refactor |
| Tham số `type` hoặc `kind` rồi rẽ nhánh theo kiểu | Dấu hiệu của Strategy Pattern bị thiếu |

---

# 4. L — Liskov Substitution

## Phát biểu

> **Class con phải thay thế được class cha mà không làm thay đổi tính đúng đắn của chương trình.**

Nghĩa là: nếu bạn dùng class cha ở đâu đó, bạn phải có thể **thay bằng bất kỳ class con nào** mà code vẫn hoạt động đúng — không gây lỗi, không thay đổi hành vi mong đợi.

Nguyên lý này do **Barbara Liskov** đề xuất năm 1987.

## Ghi nhớ đơn giản

> Nếu `Dog extends Animal`, thì mọi nơi dùng `Animal` đều phải hoạt động đúng khi thay bằng `Dog`.

## ❌ Vi phạm LSP — Ví dụ kinh điển: Hình chữ nhật & Hình vuông

```typescript
class Rectangle {
  constructor(protected width: number, protected height: number) {}

  setWidth(w: number) { this.width = w }
  setHeight(h: number) { this.height = h }

  getArea(): number { return this.width * this.height }
}

// Hình vuông KẾ THỪA hình chữ nhật — sai về mặt toán học nhưng "có vẻ đúng"
class Square extends Rectangle {
  setWidth(w: number) {
    this.width = w
    this.height = w  // ← Buộc chiều cao = chiều rộng (vì là hình vuông)
  }

  setHeight(h: number) {
    this.width = h   // ← Buộc chiều rộng = chiều cao
    this.height = h
  }
}
```

**Test với Rectangle** — hoạt động đúng:

```typescript
function testArea(rect: Rectangle) {
  rect.setWidth(5)
  rect.setHeight(4)
  // Mong đợi: 5 × 4 = 20
  console.log(rect.getArea())  // Rectangle → 20 ✅
}
```

**Thay bằng Square** — SAI:

```typescript
const square = new Square(0, 0)
testArea(square)
// setWidth(5) → width=5, height=5
// setHeight(4) → width=4, height=4
// getArea() = 16 ❌ (mong đợi 20!)
```

**Vi phạm LSP**: `Square` không thể thay thế `Rectangle` — hành vi bị thay đổi.

## ✅ Tuân thủ LSP — Giải pháp

```typescript
// Dùng interface thay vì kế thừa sai
interface Shape {
  getArea(): number
}

class Rectangle implements Shape {
  constructor(private width: number, private height: number) {}
  getArea(): number { return this.width * this.height }
}

class Square implements Shape {
  constructor(private side: number) {}
  getArea(): number { return this.side * this.side }
}

// Hàm tính diện tích — hoạt động đúng với MỌI Shape
function printArea(shape: Shape) {
  console.log(`Diện tích: ${shape.getArea()}`)
}

printArea(new Rectangle(5, 4))  // 20 ✅
printArea(new Square(5))         // 25 ✅
```

## ❌ Vi phạm LSP thực tế trong backend

```typescript
class BaseNotificationService {
  send(userId: string, message: string): void {
    // Gửi thông báo
  }
}

class EmailNotification extends BaseNotificationService {
  send(userId: string, message: string): void {
    // Gửi email — OK
  }
}

class SmsNotification extends BaseNotificationService {
  send(userId: string, message: string): void {
    if (message.length > 160) {
      throw new Error('SMS tối đa 160 ký tự')  // ← Vi phạm LSP!
    }
    // Gửi SMS
  }
}
```

**Vấn đề**: Code gọi `send()` với `BaseNotificationService` mong đợi **luôn hoạt động**. Nhưng `SmsNotification` ném lỗi khi tin nhắn dài — **hành vi không mong đợi** khi thay thế.

## ✅ Sửa

```typescript
interface NotificationService {
  canSend(message: string): boolean  // Kiểm tra trước
  send(userId: string, message: string): void
}

class SmsNotification implements NotificationService {
  canSend(message: string): boolean {
    return message.length <= 160  // Khai báo giới hạn rõ ràng
  }

  send(userId: string, message: string): void {
    // Gửi SMS — code gọi đã kiểm tra canSend() trước
  }
}
```

## Quy tắc kiểm tra vi phạm LSP

| Quy tắc | Vi phạm khi |
|---------|-------------|
| **Tiền điều kiện** (precondition) | Class con yêu cầu **chặt hơn** class cha |
| **Hậu điều kiện** (postcondition) | Class con trả về **lỏng hơn** (ít đảm bảo hơn) class cha |
| **Bất biến** (invariant) | Class con **phá vỡ** điều kiện luôn đúng của class cha |
| **Ngoại lệ** | Class con ném **lỗi mới** mà class cha không ném |
| **Hành vi** | Thay class con vào → **kết quả khác** mong đợi |

## LSP trong thực tế

> **Quy tắc đơn giản**: Nếu bạn cần dùng `instanceof` để kiểm tra kiểu của class con → có thể đang vi phạm LSP.

```typescript
// ❌ Phải check kiểu → thiết kế sai
function processPayment(payment: Payment) {
  if (payment instanceof CryptoPayment) {
    // Xử lý riêng cho crypto — vì CryptoPayment hành vi khác
  } else {
    payment.process()
  }
}

// ✅ Mọi Payment đều hoạt động giống nhau
function processPayment(payment: Payment) {
  payment.process()  // Không cần biết class con là gì
}
```

---

# 5. I — Interface Segregation

## Phát biểu

> **Không nên ép class implement interface mà nó không dùng.**

Nghĩa là: interface nên **nhỏ và gọn** (focused), mỗi interface chỉ chứa các phương thức liên quan đến **1 nhóm hành vi**. Đừng tạo interface "béo" (fat interface) chứa mọi thứ.

## ❌ Vi phạm ISP — Interface béo

```typescript
// Interface "béo" — ép tất cả worker implement mọi thứ
interface Worker {
  work(): void
  eat(): void
  sleep(): void
  attendMeeting(): void
  writeReport(): void
}

// Robot implementation — robot không ăn, không ngủ
class RobotWorker implements Worker {
  work() { console.log('Robot đang làm việc') }
  eat() { /* Không làm gì — robot không ăn */ }         // ← Buộc implement vô nghĩa
  sleep() { /* Không làm gì — robot không ngủ */ }       // ← Buộc implement vô nghĩa
  attendMeeting() { /* Không làm gì */ }                  // ← Buộc implement vô nghĩa
  writeReport() { console.log('Robot tạo báo cáo tự động') }
}
```

**Vấn đề**: `RobotWorker` buộc phải implement `eat()` và `sleep()` — những thứ **vô nghĩa** với robot. Nếu interface thêm phương thức `takeVacation()`, robot lại phải implement thêm một phương thức vô nghĩa nữa.

## ✅ Tuân thủ ISP — Interface gọn

```typescript
// Tách thành nhiều interface nhỏ, mỗi interface = 1 nhóm hành vi
interface Workable {
  work(): void
}

interface Eatable {
  eat(): void
}

interface Sleepable {
  sleep(): void
}

interface Reportable {
  writeReport(): void
}

// Con người — implement đầy đủ
class HumanWorker implements Workable, Eatable, Sleepable, Reportable {
  work() { console.log('Đang làm việc') }
  eat() { console.log('Đang ăn trưa') }
  sleep() { console.log('Đang ngủ') }
  writeReport() { console.log('Đang viết báo cáo') }
}

// Robot — chỉ implement những gì cần
class RobotWorker implements Workable, Reportable {
  work() { console.log('Robot đang làm việc') }
  writeReport() { console.log('Robot tạo báo cáo tự động') }
  // Không cần eat(), sleep() → KHÔNG bị ép implement
}
```

## ISP trong NestJS — Ví dụ thực tế

```typescript
// ❌ Interface béo cho Repository
interface IRepository<T> {
  findAll(): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
  softDelete(id: string): Promise<void>
  restore(id: string): Promise<void>
  findWithPagination(page: number, limit: number): Promise<T[]>
  search(query: string): Promise<T[]>
  bulkCreate(data: Partial<T>[]): Promise<T[]>
  export(): Promise<Buffer>
}
// Một số entity không cần softDelete, search, export
// → Buộc implement thừa

// ✅ Tách nhỏ
interface IReadable<T> {
  findAll(): Promise<T[]>
  findById(id: string): Promise<T | null>
}

interface IWritable<T> {
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

interface ISoftDeletable<T> {
  softDelete(id: string): Promise<void>
  restore(id: string): Promise<void>
}

interface ISearchable<T> {
  search(query: string): Promise<T[]>
}

// UserRepository — cần đọc, ghi, xóa mềm
class UserRepository implements IReadable<User>, IWritable<User>, ISoftDeletable<User> {
  // Chỉ implement những gì cần
}

// LogRepository — chỉ cần đọc và ghi, không cần xóa mềm hay tìm kiếm
class LogRepository implements IReadable<Log>, IWritable<Log> {
  // Gọn hơn nhiều
}
```

## Dấu hiệu vi phạm ISP

| Dấu hiệu | Giải thích |
|-----------|-----------|
| Phương thức trống hoặc ném `NotImplementedError` | Class bị ép implement thứ không cần |
| Interface có 10+ phương thức | Có thể tách thành nhiều interface nhỏ |
| Thêm phương thức vào interface → nhiều class phải sửa | Interface quá "béo" |
| Tên interface quá chung chung (`IService`, `IManager`) | Thiếu tính rõ ràng về trách nhiệm |

---

# 6. D — Dependency Inversion

## Phát biểu

> **Module cấp cao không nên phụ thuộc vào module cấp thấp. Cả hai nên phụ thuộc vào trừu tượng.**
>
> **Trừu tượng không nên phụ thuộc vào chi tiết. Chi tiết nên phụ thuộc vào trừu tượng.**

## Tài liệu chi tiết

DIP đã được giải thích **rất chi tiết** trong tài liệu riêng, bao gồm:
- Mối quan hệ giữa DIP, IoC và DI
- Ví dụ TypeScript trước/sau khi áp dụng
- Phân tích mâu thuẫn giữa các nguồn
- 10 câu hỏi phỏng vấn riêng về DIP/IoC/DI

👉 **Xem tại**: [00 - DIP, IoC & DI.md](../NestJS/00%20-%20DIP,%20IoC%20%26%20DI.md)

## Tóm tắt nhanh

```
❌ Vi phạm DIP:
  AuthService ──phụ thuộc──▶ ResendMailer (class cụ thể)

✅ Tuân thủ DIP:
  AuthService ──phụ thuộc──▶ IMailer (interface) ◀──implement── ResendMailer
                                                  ◀──implement── SmtpMailer
                                                  ◀──implement── MockMailer
```

```typescript
// ❌ Phụ thuộc class cụ thể
class AuthService {
  private mailer = new ResendMailer()  // Liên kết chặt
}

// ✅ Phụ thuộc trừu tượng
class AuthService {
  constructor(private mailer: IMailer) {}  // Không biết class cụ thể
}
```

---

# 7. SOLID trong thực tế

## Khi nào nên áp dụng?

SOLID không phải **luật bắt buộc** — nó là **hướng dẫn** (guideline). Áp dụng quá mức cũng gây hại:

| Tình huống | Nên áp dụng SOLID? |
|------------|-------------------|
| Dự án lớn, nhiều người | **Có** — SOLID giúp code dễ bảo trì, dễ phối hợp |
| Startup MVP, cần ship nhanh | **Vừa phải** — SRP và DIP quan trọng nhất, còn lại linh hoạt |
| Script nhỏ, dùng 1 lần | **Không cần** — thêm interface/pattern → phức tạp hóa |
| Thư viện/framework cho người khác dùng | **Bắt buộc** — OCP và ISP rất quan trọng |
| Phỏng vấn | **Phải biết** — kể cả không áp dụng 100%, phải hiểu |

## Lỗi thường gặp khi áp dụng SOLID

| Lỗi | Giải thích |
|-----|-----------|
| **Quá nhiều interface** | Mỗi class 1 interface, dù chỉ có 1 implementation → phức tạp hóa vô ích |
| **Quá nhiều class** | Tách quá nhỏ → 50 file cho 1 tính năng → khó theo dõi |
| **Interface cho tương lai** | Tạo trừu tượng "phòng khi cần" mà chưa bao giờ có implementation thứ 2 |
| **Tuân thủ mù quáng** | Áp dụng SOLID mà không hiểu bối cảnh → code phức tạp hơn vấn đề |

## Quy tắc thực tế

> **YAGNI** (You Ain't Gonna Need It — Bạn sẽ không cần đâu): Đừng tạo trừu tượng cho thứ chưa cần. Khi có **implementation thứ 2**, mới tách interface.
>
> **Quy tắc 3** (Rule of Three): Khi pattern lặp lại **lần thứ 3**, mới refactor. Lần 1-2 để yên.

```typescript
// ❌ Quá mức — class chỉ có 1 implementation, tạo interface thừa
interface IUserNameFormatter {
  format(name: string): string
}
class UserNameFormatter implements IUserNameFormatter {
  format(name: string) { return name.trim().toLowerCase() }
}

// ✅ Đủ dùng — khi chỉ có 1 implementation, dùng class trực tiếp
class UserNameFormatter {
  format(name: string) { return name.trim().toLowerCase() }
}
// Khi cần implementation thứ 2 → tách interface lúc đó
```

## Bảng tóm tắt SOLID

```
┌─────┬──────────────────────┬────────────────────────────────────────┐
│     │ Nguyên lý            │ Ghi nhớ                                │
├─────┼──────────────────────┼────────────────────────────────────────┤
│  S  │ Đơn trách nhiệm      │ 1 class = 1 lý do thay đổi            │
│  O  │ Mở–Đóng              │ Thêm tính năng = tạo mới, không sửa cũ│
│  L  │ Thay thế Liskov      │ Class con thay thế class cha không lỗi │
│  I  │ Phân tách giao diện  │ Interface nhỏ, gọn — đừng ép thừa     │
│  D  │ Đảo ngược phụ thuộc  │ Phụ thuộc interface, không phụ thuộc   │
│     │                      │ class cụ thể                           │
└─────┴──────────────────────┴────────────────────────────────────────┘
```

---

# 8. Câu hỏi phỏng vấn

## Câu 1: SOLID là gì? Kể tên 5 nguyên lý.

**Trả lời**: "SOLID là bộ 5 nguyên lý thiết kế hướng đối tượng giúp tạo ra code dễ bảo trì, dễ mở rộng, dễ test. S — Đơn trách nhiệm: mỗi class 1 lý do thay đổi. O — Mở–Đóng: mở cho mở rộng, đóng cho sửa đổi. L — Thay thế Liskov: class con thay thế class cha không gây lỗi. I — Phân tách giao diện: interface nhỏ gọn, không ép implement thừa. D — Đảo ngược phụ thuộc: phụ thuộc vào trừu tượng, không phụ thuộc chi tiết."

## Câu 2: Giải thích SRP bằng ví dụ thực tế?

**Trả lời**: "SRP nói mỗi class chỉ có 1 lý do thay đổi. Ví dụ: nếu tôi có `UserService` vừa xử lý đăng nhập, vừa gửi email, vừa ghi log — khi đổi cách ghi log, tôi phải sửa `UserService` dù logic đăng nhập không đổi. Giải pháp: tách thành `AuthService`, `MailService`, `Logger` — mỗi class 1 trách nhiệm. Trong NestJS, kiến trúc Controller/Service/Repository tự nhiên tuân thủ SRP."

## Câu 3: OCP áp dụng thế nào khi thêm phương thức thanh toán?

**Trả lời**: "Thay vì viết if/else kiểm tra loại thanh toán trong 1 class, tôi tạo interface `PaymentStrategy` với phương thức `pay()`, rồi mỗi phương thức thanh toán (MoMo, ZaloPay, VNPay) implement interface đó. `PaymentProcessor` nhận `PaymentStrategy`, gọi `pay()` mà không biết class cụ thể. Thêm phương thức mới = tạo class mới, không sửa `PaymentProcessor`."

## Câu 4: Cho ví dụ vi phạm LSP?

**Trả lời**: "Ví dụ kinh điển: `Square extends Rectangle`. Hình chữ nhật cho phép đặt chiều rộng và chiều cao độc lập, nhưng hình vuông buộc 2 chiều bằng nhau. Khi hàm nào đó đặt width=5, height=4 rồi tính diện tích — dùng Rectangle thì 20, dùng Square thì 16. Class con thay đổi hành vi mong đợi của class cha — vi phạm LSP. Giải pháp: dùng interface `Shape` chung với phương thức `getArea()`, không kế thừa."

## Câu 5: ISP khác SRP thế nào?

**Trả lời**: "SRP nói về class — mỗi class 1 trách nhiệm. ISP nói về interface — mỗi interface chỉ chứa phương thức liên quan đến 1 nhóm hành vi. SRP hướng dẫn cách nhóm logic trong class. ISP hướng dẫn cách thiết kế hợp đồng giữa các class. Ví dụ: class `Logger` tuân thủ SRP (chỉ ghi log), nhưng nếu interface `ILogger` có cả `log()`, `sendAlert()`, `formatReport()` thì vi phạm ISP."

## Câu 6: Nguyên lý nào quan trọng nhất trong SOLID?

**Trả lời**: "Không có nguyên lý nào 'quan trọng nhất' — chúng bổ sung cho nhau. Tuy nhiên, nếu phải chọn 2 nguyên lý ưu tiên cho dự án thực tế, tôi chọn SRP và DIP. SRP giúp code dễ hiểu, DIP giúp code dễ test và thay thế implementation. Trong NestJS, DI container đã giúp tuân thủ DIP gần như tự động."

## Câu 7: Khi nào KHÔNG nên áp dụng SOLID?

**Trả lời**: "Khi dự án nhỏ, script chạy 1 lần, hoặc MVP cần ship nhanh — áp dụng SOLID quá mức sẽ phức tạp hóa code. Ví dụ: tạo interface cho class chỉ có 1 implementation → thêm file thừa. Quy tắc tôi dùng: áp dụng khi có lý do cụ thể (nhiều implementation, cần test dễ, team lớn), không áp dụng 'phòng khi cần'."

## Câu 8: SOLID liên quan đến Design Pattern thế nào?

**Trả lời**: "SOLID là nguyên lý — nói 'nên thiết kế thế nào'. Design Pattern là giải pháp cụ thể — nói 'làm bằng cách nào'. Nhiều design pattern sinh ra để hiện thực hóa SOLID: Strategy Pattern giúp tuân thủ OCP. Factory Pattern giúp tuân thủ DIP. Observer Pattern giúp tuân thủ SRP (tách logic lắng nghe). Decorator Pattern giúp tuân thủ OCP (thêm hành vi mà không sửa class)."

## Câu 9: Phân biệt trừu tượng (Abstraction) vs interface vs abstract class?

**Trả lời**: "Trừu tượng là khái niệm — nghĩa là 'ẩn chi tiết, chỉ lộ ra những gì cần thiết'. Interface là cơ chế trong ngôn ngữ — khai báo hợp đồng (tên phương thức, tham số, kiểu trả về) mà không có implementation. Abstract class cũng là hợp đồng nhưng có thể chứa implementation mặc định. Trong TypeScript, interface bị xóa khi biên dịch (chỉ tồn tại lúc viết code), abstract class vẫn tồn tại khi chạy."

## Câu 10: Cho ví dụ 1 đoạn code vi phạm nhiều nguyên lý SOLID cùng lúc?

**Trả lời**:

```typescript
// Vi phạm S, O, D cùng lúc
class OrderService {
  process(order: Order) {
    // Vi phạm S: vừa validate, vừa lưu DB, vừa gửi mail
    if (!order.items.length) throw new Error('Giỏ hàng trống')

    // Vi phạm D: phụ thuộc class cụ thể
    const db = new MySqlDatabase()
    db.save(order)

    // Vi phạm O: if/else theo loại thanh toán
    if (order.paymentMethod === 'momo') { /* ... */ }
    else if (order.paymentMethod === 'card') { /* ... */ }

    const mailer = new GmailMailer()  // Vi phạm D
    mailer.send(order.email, 'Đơn hàng', '...')
  }
}
```

"Giải pháp: tách thành `OrderValidator` (S), `OrderRepository` (S+D), `PaymentStrategy` (O), `NotificationService` (S+D) — mỗi class 1 trách nhiệm, phụ thuộc interface, mở rộng bằng strategy."

---

## Tham khảo

| Nguồn | Đường dẫn |
|-------|-----------|
| Robert C. Martin — Clean Architecture | [blog.cleancoder.com](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) |
| Robert C. Martin — SOLID gốc | [The Principles of OOD](http://butunclebob.com/ArticleS.UncleBob.PrinciplesOfOod) |
| DIP, IoC & DI chi tiết | [00 - DIP, IoC & DI.md](../NestJS/00%20-%20DIP,%20IoC%20%26%20DI.md) |
