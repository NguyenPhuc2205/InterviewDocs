# 📘 JavaScript — Prototypes & Inheritance

> Mọi thứ trong JavaScript đều liên quan đến **prototypes**. Hiểu prototypes = hiểu bản chất OOP trong JS.

---

## Mục lục

1. [Prototype là gì?](#1-prototype-là-gì)
2. [Prototype Chain](#2-prototype-chain)
3. [`__proto__` vs `prototype` vs `Object.getPrototypeOf()`](#3-__proto__-vs-prototype-vs-objectgetprototypeof)
4. [Constructor Functions](#4-constructor-functions)
5. [ES6 Classes — Syntax Sugar](#5-es6-classes)
6. [Inheritance — Kế thừa](#6-inheritance)
7. [instanceof & kiểm tra prototype](#7-instanceof)
8. [Câu hỏi phỏng vấn](#8-câu-hỏi-phỏng-vấn)

---

# 1. Prototype là gì?

> Mọi object trong JavaScript đều có một **hidden property** gọi là `[[Prototype]]` — link đến một object khác gọi là **prototype** của nó.

Khi bạn truy cập property/method trên object, nếu **không tìm thấy trên chính object** → JS engine sẽ **đi lên prototype** để tìm tiếp → rồi lên prototype của prototype → cho đến khi gặp `null`.

```javascript
const obj = { name: 'An' };

// obj không có method toString(), nhưng vẫn gọi được:
obj.toString(); // '[object Object]'

// Vì: obj → Object.prototype (có toString) → null
```

```
Prototype Chain:
obj { name: 'An' }
  └──→ Object.prototype { toString(), hasOwnProperty(), ... }
         └──→ null (kết thúc chain)
```

---

# 2. Prototype Chain

## Cơ chế tìm kiếm property

```javascript
const animal = { eats: true };
const rabbit = { jumps: true };

// Gán prototype cho rabbit
Object.setPrototypeOf(rabbit, animal);
// Hoặc: rabbit.__proto__ = animal;

console.log(rabbit.jumps);  // true  — tìm thấy trên chính rabbit
console.log(rabbit.eats);   // true  — KHÔNG có trên rabbit, tìm lên animal
console.log(rabbit.flies);  // undefined — không tìm thấy ở đâu cả
```

```
Property Lookup:
rabbit.eats
  1. Tìm trên rabbit          → Không có
  2. Tìm trên animal (proto)  → Có! Trả về true
  
rabbit.flies
  1. Tìm trên rabbit          → Không có
  2. Tìm trên animal          → Không có
  3. Tìm trên Object.prototype → Không có
  4. null → undefined
```

## Chain dài hơn

```javascript
const living = { alive: true };
const animal = Object.create(living);
animal.eats = true;

const rabbit = Object.create(animal);
rabbit.jumps = true;

console.log(rabbit.jumps);  // true  (rabbit)
console.log(rabbit.eats);   // true  (animal)
console.log(rabbit.alive);  // true  (living)

// Ghi đè property KHÔNG ảnh hưởng prototype:
rabbit.eats = false;
console.log(rabbit.eats);   // false (rabbit's OWN property)
console.log(animal.eats);   // true  (animal không bị thay đổi)
```

> **Quan trọng:** Khi **ghi** (set), property luôn được tạo/thay đổi **trên chính object**. Khi **đọc** (get), mới tìm lên prototype chain.

---

# 3. `__proto__` vs `prototype` vs `Object.getPrototypeOf()`

Đây là nguồn nhầm lẫn lớn nhất. Phân biệt rõ:

| Tên | Là gì | Dùng cho |
|-----|-------|----------|
| `__proto__` | Property trên **mọi object** → trỏ đến prototype của nó | ❌ Deprecated, không nên dùng trực tiếp |
| `prototype` | Property trên **function** → object sẽ là prototype khi dùng `new` | Chỉ có trên functions |
| `Object.getPrototypeOf()` | **Method** → lấy prototype của object | ✅ Cách chuẩn |

```javascript
function Person(name) {
  this.name = name;
}

Person.prototype.greet = function() {
  return `Hi, I'm ${this.name}`;
};

const an = new Person('An');

// Tất cả đều trỏ đến CÙNG 1 object:
an.__proto__ === Person.prototype                  // true
Object.getPrototypeOf(an) === Person.prototype     // true

// Nhưng:
an.prototype                                       // undefined! (an là object, ko phải function)
Person.__proto__ === Function.prototype             // true (Person là function)
```

```
┌─────────────────────┐         ┌──────────────────────┐
│   Person (function) │         │  Person.prototype    │
│                     │────────>│  { greet: fn }       │
│  .prototype ────────│         │  .constructor ───────│──> Person
└─────────────────────┘         └──────────────────────┘
                                          ▲
┌─────────────────────┐                   │
│     an (object)     │                   │
│  { name: 'An' }    │                   │
│  .__proto__ ────────│───────────────────┘
└─────────────────────┘
```

---

# 4. Constructor Functions

Trước ES6 classes, JavaScript dùng **constructor functions** để tạo objects:

```javascript
function Car(brand, model) {
  // this = {} (tạo bởi new)
  this.brand = brand;
  this.model = model;
  // return this (tự động)
}

// Methods ĐẶT TRÊN prototype (sharing giữa tất cả instances)
Car.prototype.getInfo = function() {
  return `${this.brand} ${this.model}`;
};

Car.prototype.start = function() {
  return `${this.brand} is starting...`;
};

const car1 = new Car('Toyota', 'Camry');
const car2 = new Car('Honda', 'Civic');

car1.getInfo();  // 'Toyota Camry'
car2.getInfo();  // 'Honda Civic'

// Cả hai CHIA SẺ cùng method qua prototype:
car1.getInfo === car2.getInfo  // true (cùng reference → tiết kiệm bộ nhớ)
```

### Tại sao đặt method trên prototype?

```javascript
// ❌ Đặt method BÊN TRONG constructor — mỗi instance tạo function MỚI
function BadCar(brand) {
  this.brand = brand;
  this.getInfo = function() { return this.brand; };  // Tạo function mới mỗi lần new!
}

const a = new BadCar('Toyota');
const b = new BadCar('Honda');
a.getInfo === b.getInfo  // false! (2 functions khác nhau → lãng phí bộ nhớ)

// ✅ Đặt method trên prototype — tất cả instances CHIA SẺ
function GoodCar(brand) {
  this.brand = brand;
}
GoodCar.prototype.getInfo = function() { return this.brand; };

const c = new GoodCar('Toyota');
const d = new GoodCar('Honda');
c.getInfo === d.getInfo  // true (cùng 1 function → tiết kiệm bộ nhớ)
```

---

# 5. ES6 Classes

> **ES6 Class** là **syntax sugar** cho prototype-based inheritance. Bên dưới vẫn dùng prototype.

```javascript
class Animal {
  // Constructor — hàm khởi tạo
  constructor(name) {
    this.name = name;       // Instance property
  }

  // Method — tự động đặt trên prototype
  speak() {
    return `${this.name} makes a sound`;
  }

  // Static method — gọi trên CLASS, không phải instance
  static create(name) {
    return new Animal(name);
  }

  // Getter/Setter
  get info() {
    return `Animal: ${this.name}`;
  }

  set rename(newName) {
    this.name = newName;
  }
}

const dog = new Animal('Rex');
dog.speak();             // 'Rex makes a sound'
dog.info;                // 'Animal: Rex' (getter, không cần ())
Animal.create('Miu');    // Static method — gọi trên class

// Chứng minh vẫn là prototype:
typeof Animal                        // 'function'
dog.__proto__ === Animal.prototype   // true
```

## Class vs Constructor Function

| | Constructor Function | ES6 Class |
|---|---|---|
| **Syntax** | `function Foo() {}` | `class Foo {}` |
| **Methods** | Thêm thủ công vào `.prototype` | Tự động đặt trên prototype |
| **Hoisting** | ✅ Hoist | ❌ Không hoist (TDZ) |
| **Bắt buộc `new`** | Không (có thể gọi nhầm) | ✅ Bắt buộc `new` |
| **Strict mode** | Phải tự thêm | ✅ Tự động strict mode |
| **Bản chất** | Function | Function (syntax sugar) |

---

# 6. Inheritance — Kế thừa

## Prototype-based (ES5)

```javascript
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a sound`;
};

function Dog(name, breed) {
  Animal.call(this, name);  // Gọi constructor cha
  this.breed = breed;
}

// Kế thừa prototype:
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;  // Fix lại constructor reference

Dog.prototype.bark = function() {
  return `${this.name} barks!`;
};

const rex = new Dog('Rex', 'German Shepherd');
rex.speak();  // 'Rex makes a sound' (từ Animal.prototype)
rex.bark();   // 'Rex barks!'
```

## Class-based (ES6) — Clean hơn

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a sound`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);    // GỌI constructor cha — BẮT BUỘC trước khi dùng this
    this.breed = breed;
  }

  bark() {
    return `${this.name} barks!`;
  }

  // Override method cha
  speak() {
    return `${this.name} woof!`;  // Ghi đè
  }

  // Gọi method cha từ method con
  fullSpeak() {
    return super.speak() + ' (woof)';  // Gọi Animal.speak()
  }
}

const rex = new Dog('Rex', 'Shepherd');
rex.speak();       // 'Rex woof!' (method overriding)
rex.bark();        // 'Rex barks!'
rex.fullSpeak();   // 'Rex makes a sound (woof)'
```

## Prototype Chain sau khi kế thừa

```
rex (Dog instance)
  └──→ Dog.prototype { bark(), speak() (override) }
         └──→ Animal.prototype { speak() (original) }
                └──→ Object.prototype { toString(), ... }
                       └──→ null
```

---

# 7. instanceof & Kiểm tra prototype

```javascript
class Animal {}
class Dog extends Animal {}
class Cat extends Animal {}

const rex = new Dog();

rex instanceof Dog      // true  — Dog.prototype nằm trong chain
rex instanceof Animal   // true  — Animal.prototype cũng nằm trong chain
rex instanceof Object   // true  — Object.prototype nằm trong mọi chain
rex instanceof Cat      // false

// Kiểm tra own property vs inherited
const obj = { a: 1 };
Object.setPrototypeOf(obj, { b: 2 });

obj.a            // 1 (own)
obj.b            // 2 (inherited)
obj.hasOwnProperty('a')   // true
obj.hasOwnProperty('b')   // false (b nằm trên prototype)

'a' in obj       // true (tìm cả chain)
'b' in obj       // true (tìm cả chain)

// Lặp qua own properties
Object.keys(obj)         // ['a'] — chỉ own, enumerable
Object.getOwnPropertyNames(obj) // ['a'] — chỉ own, kể cả non-enumerable

// for...in lặp qua CẢ inherited enumerable properties
for (let key in obj) {
  console.log(key);  // 'a', 'b' (cả inherited!)
  if (obj.hasOwnProperty(key)) {
    // Chỉ own properties
  }
}
```

---

# 8. Câu hỏi phỏng vấn

## Q1: "Giải thích Prototypal Inheritance"

> **A:** JavaScript sử dụng **prototype-based inheritance**, khác với class-based inheritance trong Java/C++. Mỗi object có một hidden link `[[Prototype]]` trỏ đến object khác. Khi truy cập property/method không tồn tại trên object, JS engine tự động tìm lên **prototype chain** — đi qua các prototype liên tiếp cho đến khi tìm thấy hoặc gặp `null`.
>
> ES6 `class` chỉ là syntax sugar — bên dưới vẫn dùng prototype. `extends` tạo prototype chain, `super` gọi constructor/method của prototype cha.

## Q2: "`__proto__` và `prototype` khác nhau thế nào?"

> **A:** `prototype` là property trên **function** — nó là object sẽ trở thành prototype cho các instances tạo bởi `new`. `__proto__` (hoặc `Object.getPrototypeOf()`) là property trên **mọi object** — trỏ đến prototype thực sự của object đó.
>
> Khi `new Person()`, object mới có `__proto__` = `Person.prototype`. Nên dùng `Object.getPrototypeOf()` thay vì `__proto__` vì `__proto__` đã deprecated.

## Q3: "ES6 Class có phải là class thực sự không?"

> **A:** Không. ES6 Class là **syntax sugar** cho constructor function + prototype. Bên dưới vẫn là prototype-based. `typeof class Foo {}` trả về `'function'`. Sự khác biệt so với constructor function: class bắt buộc `new`, tự động strict mode, không hoist, và syntax clean hơn cho inheritance (`extends`, `super`).

## Q4: "Tại sao đặt method trên prototype thay vì trong constructor?"

> **A:** Nếu đặt method **trong constructor**, mỗi lần `new` sẽ tạo **bản copy mới** của function → N instances = N functions → lãng phí bộ nhớ. Đặt trên **prototype** → tất cả instances **chia sẻ** cùng 1 function qua prototype chain → tiết kiệm bộ nhớ và nhất quán.

---

> 📅 Tạo ngày: 2026-02-12
> 📚 Nguồn: MDN Web Docs, ECMAScript Specification, JavaScript: The Definitive Guide
> 🎯 Mục tiêu: Hiểu prototype chain — nền tảng OOP trong JavaScript
