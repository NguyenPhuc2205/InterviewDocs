# Tài liệu ôn tập phỏng vấn OOP (Fresher / Junior / Middle)

> Mục tiêu: Hiểu sâu OOP, trả lời phỏng vấn mạch lạc. Nội dung tập trung vào khái niệm, bản chất, ví dụ và câu trả lời mẫu.

---

## 1) OOP là gì? (Bản chất)

**OOP (Object-Oriented Programming)** là cách tổ chức chương trình xoay quanh **đối tượng**. Mỗi đối tượng bao gồm:

- **State (trạng thái):** dữ liệu của đối tượng.
- **Behavior (hành vi):** các hành động đối tượng có thể thực hiện.

**Lợi ích cốt lõi:**

1. **Tái sử dụng (Reusability):** kế thừa và composition giúp giảm trùng lặp.
2. **Dễ mở rộng (Extensibility):** thêm tính năng mà ít sửa code cũ.
3. **Dễ bảo trì (Maintainability):** đóng gói giúp cô lập thay đổi.
4. **Ánh xạ nghiệp vụ:** mô hình hóa đúng thực tế (User, Order, Invoice...).

---

## 2) 4 tính chất OOP (hiểu sâu)

### 2.1 Encapsulation (Đóng gói)

**Bản chất:** kiểm soát truy cập dữ liệu và hành vi bên trong đối tượng.

**Lý do quan trọng:**

- Tránh thay đổi dữ liệu không hợp lệ.
- Che giấu chi tiết triển khai (implementation hiding).
- Cho phép thay đổi nội bộ mà không ảnh hưởng bên ngoài.

```ts
class BankAccount {
  private balance = 0;

  deposit(amount: number) {
    if (amount <= 0) throw new Error("Invalid amount");
    this.balance += amount;
  }

  withdraw(amount: number) {
    if (amount > this.balance) throw new Error("Insufficient funds");
    this.balance -= amount;
  }

  getBalance() {
    return this.balance;
  }
}
```

**Nói trong phỏng vấn:**

> Encapsulation giúp kiểm soát truy cập state. Bên ngoài chỉ dùng API public, tránh sai lệch dữ liệu và giảm coupling. Nhờ đó class dễ bảo trì và thay đổi nội bộ mà không ảnh hưởng code gọi.

---

### 2.2 Abstraction (Trừu tượng)

**Bản chất:** tập trung vào *cái gì* đối tượng làm, bỏ qua *làm như thế nào*.

- Định nghĩa **hợp đồng (contract)**.
- Ẩn chi tiết triển khai phức tạp.

```ts
abstract class PaymentGateway {
  abstract pay(amount: number): Promise<void>;
}

class MomoGateway extends PaymentGateway {
  async pay(amount: number) {
    // triển khai cụ thể
  }
}
```

**Nói trong phỏng vấn:**

> Abstraction giúp giảm độ phức tạp. Client chỉ cần biết pay() làm gì, không cần biết Momo/ZaloPay triển khai ra sao.

---

### 2.3 Inheritance (Kế thừa)

**Bản chất:** class con nhận thuộc tính/hành vi từ class cha.

**Khi nào dùng:** khi có mối quan hệ **is-a** thực sự.

```ts
class Employee {
  constructor(public name: string) {}
  work() { console.log("Working..."); }
}

class Developer extends Employee {
  code() { console.log("Coding..."); }
}
```

**Lưu ý quan trọng:**

- Kế thừa sai sẽ gây ràng buộc cứng (tight coupling).
- Ưu tiên **composition** khi có thể.

**Nói trong phỏng vấn:**

> Inheritance dùng khi class con thực sự là một dạng của class cha (is-a). Nếu chỉ để tái sử dụng code thì nên dùng composition để giảm coupling.

---

### 2.4 Polymorphism (Đa hình)

**Bản chất:** cùng một interface/cha, nhiều cách triển khai khác nhau.

```ts
interface Notifier {
  notify(message: string): void;
}

class EmailNotifier implements Notifier {
  notify(message: string) { console.log("Email:", message); }
}

class SmsNotifier implements Notifier {
  notify(message: string) { console.log("SMS:", message); }
}

function sendAll(notifiers: Notifier[], msg: string) {
  notifiers.forEach(n => n.notify(msg));
}
```

**Nói trong phỏng vấn:**

> Polymorphism cho phép gọi cùng một method nhưng hành vi khác nhau tùy implementation. Nó giúp mở rộng hệ thống mà không sửa code gọi.

---

## 3) Quan hệ giữa các class (hiểu đúng bản chất)

### 3.1 Association

- Mối quan hệ “biết nhau” lỏng lẻo.
- Ví dụ: `Teacher` biết `Student`, nhưng vòng đời độc lập.

### 3.2 Aggregation

- “has-a” nhưng **không** phụ thuộc vòng đời.
- Ví dụ: `Team` có `Member`, member có thể tồn tại độc lập.

### 3.3 Composition

- “has-a” và **phụ thuộc vòng đời**.
- Ví dụ: `House` chứa `Room`. Xóa house thì room không còn.

**Phỏng vấn thường hỏi:** phân biệt aggregation vs composition → trả lời dựa trên **vòng đời**.

---

## 4) Interface vs Abstract Class (trả lời chuẩn)

| Tiêu chí | Interface | Abstract class |
|---------|-----------|----------------|
| Bản chất | Contract | Contract + code chung |
| Kế thừa | Multiple | Single inheritance |
| Khi dùng | Chuẩn hóa hành vi | Chia sẻ logic mặc định |

**Câu trả lời mẫu:**

> Interface dùng khi tôi chỉ cần chuẩn hóa hành vi, cho phép nhiều implementation. Abstract class dùng khi tôi muốn vừa chuẩn hóa vừa chia sẻ logic chung. Nếu cần nhiều type kết hợp thì interface phù hợp hơn vì hỗ trợ multiple inheritance.

---

## 5) SOLID (giải thích sâu + ví dụ thực tế)

### S — Single Responsibility

**Ý nghĩa:** Một class chỉ nên có **một lý do** để thay đổi.

**Ví dụ sai:** `UserService` vừa login, vừa gửi email, vừa log.

**Ví dụ đúng:** tách `AuthService`, `EmailService`, `Logger`.

### O — Open/Closed

**Ý nghĩa:** mở rộng được, không sửa code cũ.

**Ví dụ:** dùng interface `PaymentGateway`, thêm `Momo`, `ZaloPay` mà không sửa logic gọi.

### L — Liskov Substitution

**Ý nghĩa:** subclass phải thay thế được superclass mà không làm sai logic.

**Ví dụ:** `Square` kế thừa `Rectangle` nhưng override setWidth/setHeight làm sai tính chất → vi phạm LSP.

### I — Interface Segregation

**Ý nghĩa:** interface nhỏ, tránh bắt class implement thứ không cần.

### D — Dependency Inversion

**Ý nghĩa:** phụ thuộc vào abstraction, không phụ thuộc concrete.

**Ví dụ:** `OrderService` phụ thuộc `PaymentGateway` interface, injected từ ngoài.

**Câu trả lời mẫu:**

> SOLID giúp thiết kế hệ thống linh hoạt. SRP giảm coupling; OCP dễ mở rộng; LSP bảo toàn đúng đắn khi kế thừa; ISP tránh interface “to”; DIP giúp test dễ hơn nhờ mock abstraction.

---

## 6) Design Patterns thường gặp (trả lời thực tế)

### 6.1 Singleton

**Dùng khi:** chỉ cần 1 instance toàn hệ thống (config, cache).

**Cẩn trọng:** dễ gây state global khó test.

### 6.2 Factory

**Dùng khi:** tạo object dựa trên loại, giảm if/else và tuân thủ OCP.

### 6.3 Strategy

**Dùng khi:** cần thay đổi thuật toán/logic runtime.

**Câu trả lời mẫu:**

> Strategy giúp hoán đổi hành vi mà không sửa code client. Factory giải quyết khởi tạo, còn Strategy giải quyết hành vi.

---

## 7) Câu hỏi phỏng vấn theo cấp độ (trả lời mẫu)

### ✅ Fresher

**Q1: OOP là gì?**

> OOP là cách lập trình dựa trên đối tượng, mỗi đối tượng có state và behavior. Nó giúp code dễ tái sử dụng, mở rộng và mô hình hóa nghiệp vụ rõ ràng.

**Q2: Encapsulation và Abstraction khác nhau thế nào?**

> Encapsulation là che giấu dữ liệu và kiểm soát truy cập. Abstraction là che giấu độ phức tạp, chỉ cung cấp contract cần thiết. Encapsulation là kỹ thuật; Abstraction là mục tiêu thiết kế.

**Q3: Class khác object?**

> Class là bản thiết kế; object là instance cụ thể được tạo từ class.

---

### ✅ Junior

**Q1: Khi nào dùng interface, khi nào dùng abstract class?**

> Interface dùng để chuẩn hóa hành vi và hỗ trợ nhiều implementation. Abstract class dùng khi cần chia sẻ code chung và giới hạn kế thừa đơn. Nếu chỉ cần contract thì interface phù hợp hơn.

**Q2: Phân biệt aggregation và composition?**

> Aggregation là has-a nhưng không phụ thuộc vòng đời. Composition là has-a và phụ thuộc vòng đời, đối tượng con bị hủy khi đối tượng cha bị hủy.

**Q3: Polymorphism giúp gì trong thiết kế?**

> Cho phép thay thế implementation khác nhau qua cùng interface, giúp mở rộng không sửa code gọi.

---

### ✅ Middle

**Q1: Giải thích LSP bằng ví dụ thực tế?**

> Nếu một class con thay thế class cha mà làm sai hành vi đã cam kết thì vi phạm LSP. Ví dụ `Square` kế thừa `Rectangle` nhưng khi setWidth thì setHeight theo, làm sai kỳ vọng diện tích → không thể thay thế `Rectangle`.

**Q2: DIP khác DI như thế nào?**

> DIP là nguyên lý thiết kế: module cấp cao không phụ thuộc module cấp thấp, cả hai phụ thuộc abstraction. DI là kỹ thuật để thực thi DIP bằng cách tiêm dependency từ ngoài.

**Q3: Nếu có nhiều logic thanh toán khác nhau, bạn thiết kế thế nào?**

> Tôi tạo interface `PaymentGateway`, mỗi phương thức là 1 implementation. Dùng factory hoặc DI để chọn gateway, đảm bảo OCP và dễ test.

---

## 8) Lỗi thường gặp khi dùng OOP

- Dùng inheritance để tái sử dụng code → dễ gây coupling.
- Class quá to (vi phạm SRP) → khó test và bảo trì.
- Lạm dụng Singleton → state global khó debug.
- Interface “to” (god interface) → vi phạm ISP.

---

## 9) Checklist ôn tập nhanh (chuẩn phỏng vấn)

✅ Nắm chắc 4 tính chất OOP và nói được bản chất
✅ Phân biệt rõ: Encapsulation vs Abstraction
✅ Nêu được khi nào dùng inheritance vs composition
✅ Giải thích được association / aggregation / composition dựa vào vòng đời
✅ SOLID: nêu ý nghĩa + ví dụ thực tế
✅ 3 pattern cơ bản: Singleton, Factory, Strategy
✅ Trả lời Q&A theo level mạch lạc

---

> Nếu bạn muốn mình thêm phần thực hành (bài tập thiết kế class, refactor code theo SOLID), mình sẽ bổ sung.
