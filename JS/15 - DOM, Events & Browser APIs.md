# 📘 JavaScript — DOM, Events & Browser APIs

> Dù bạn chủ yếu làm backend, kiến thức DOM và Event Model là **nền tảng JavaScript** mà phỏng vấn luôn kiểm tra. Hiểu DOM giúp hiểu cách browser render và xử lý tương tác.

---

## Mục lục

1. [DOM Tree & Node Types](#1-dom-tree--node-types)
2. [Element Selection Methods](#2-element-selection-methods)
3. [DOM Manipulation](#3-dom-manipulation)
4. [Event Flow — Capturing → Target → Bubbling](#4-event-flow--capturing--target--bubbling)
5. [Event Delegation](#5-event-delegation)
6. [Custom Events & dispatchEvent](#6-custom-events--dispatchevent)
7. [Observer APIs](#7-observer-apis)
8. [Storage APIs](#8-storage-apis)
9. [Câu hỏi phỏng vấn](#9-câu-hỏi-phỏng-vấn)

---

# 1. DOM Tree & Node Types

> DOM (Document Object Model) là **tree representation** của HTML document mà JavaScript có thể tương tác.

```
document
└── html (Element)
    ├── head (Element)
    │   └── title (Element)
    │       └── "My Page" (Text)
    └── body (Element)
        ├── h1 (Element)
        │   └── "Hello" (Text)
        ├── <!-- comment --> (Comment)
        └── p (Element)
            └── "World" (Text)
```

## Node Types

| nodeType | Tên | Ví dụ | Constant |
|----------|-----|-------|----------|
| 1 | Element | `<div>`, `<p>` | `Node.ELEMENT_NODE` |
| 3 | Text | `"Hello"` | `Node.TEXT_NODE` |
| 8 | Comment | `<!-- ... -->` | `Node.COMMENT_NODE` |
| 9 | Document | `document` | `Node.DOCUMENT_NODE` |
| 11 | DocumentFragment | `fragment` | `Node.DOCUMENT_FRAGMENT_NODE` |

```javascript
const div = document.createElement('div');
console.log(div.nodeType);   // 1 (Element)
console.log(div.nodeName);   // 'DIV'

const text = document.createTextNode('Hello');
console.log(text.nodeType);  // 3 (Text)
console.log(text.nodeValue); // 'Hello'
```

## Node Relationships

```javascript
const parent = document.querySelector('.parent');

// Di chuyển trong tree
parent.parentNode;          // Node cha
parent.parentElement;       // Element cha (null nếu parent là Document)
parent.childNodes;          // NodeList (bao gồm Text, Comment nodes)
parent.children;            // HTMLCollection (chỉ Element nodes)
parent.firstChild;          // Node con đầu (có thể là Text)
parent.firstElementChild;   // Element con đầu
parent.lastChild;           // Node con cuối
parent.lastElementChild;    // Element con cuối
parent.nextSibling;         // Node kế tiếp (có thể là Text)
parent.nextElementSibling;  // Element kế tiếp
parent.previousSibling;     // Node trước
parent.previousElementSibling; // Element trước
```

## HTMLCollection vs NodeList

| | HTMLCollection | NodeList |
|--|---------------|----------|
| Trả về bởi | `getElementsBy*`, `.children` | `querySelectorAll`, `.childNodes` |
| **Live** | ✅ Tự cập nhật khi DOM thay đổi | ❌ Static (querySelectorAll) |
| forEach | ❌ Không có | ✅ Có |
| Contains | Elements only | Elements + Text + Comments |

```javascript
// HTMLCollection — LIVE
const divs = document.getElementsByTagName('div');
console.log(divs.length);  // 3
document.body.appendChild(document.createElement('div'));
console.log(divs.length);  // 4 — Tự cập nhật!

// NodeList (querySelectorAll) — STATIC
const divs2 = document.querySelectorAll('div');
console.log(divs2.length);  // 3
document.body.appendChild(document.createElement('div'));
console.log(divs2.length);  // 3 — Không đổi!

// Convert to Array
const arr1 = Array.from(divs);        // HTMLCollection → Array
const arr2 = [...divs2];              // NodeList → Array
```

---

# 2. Element Selection Methods

| Method | Returns | Live? | Performance |
|--------|---------|-------|-------------|
| `getElementById('id')` | Element / null | — | Nhanh nhất |
| `getElementsByClassName('cls')` | HTMLCollection | ✅ Live | Nhanh |
| `getElementsByTagName('div')` | HTMLCollection | ✅ Live | Nhanh |
| `querySelector('.cls')` | Element / null | — | Trung bình |
| `querySelectorAll('.cls')` | NodeList | ❌ Static | Trung bình |

```javascript
// getElementById — Nhanh nhất, chỉ 1 element
const header = document.getElementById('header');

// querySelector — CSS selector, linh hoạt nhất
const el = document.querySelector('.card:first-child > .title');
const el2 = document.querySelector('[data-id="123"]');

// querySelectorAll — Tất cả matches
const cards = document.querySelectorAll('.card');
cards.forEach(card => card.classList.add('active'));

// getElementsByClassName — Live collection
const items = document.getElementsByClassName('item');
// ⚠️ Live collection → iterate cẩn thận (length thay đổi khi modify DOM)

// closest — Tìm ancestor gần nhất match selector
const button = document.querySelector('button');
const form = button.closest('form');        // Tìm form cha gần nhất
const card = button.closest('.card');        // Tìm .card ancestor

// matches — Kiểm tra element match selector
button.matches('.btn-primary');  // true/false
button.matches('[disabled]');    // true/false
```

---

# 3. DOM Manipulation

## Tạo và thêm elements

```javascript
// Tạo element
const div = document.createElement('div');
div.className = 'card';
div.id = 'card-1';
div.textContent = 'Hello';
div.innerHTML = '<span>Hello</span>';  // ⚠️ XSS risk với user input

// Attributes
div.setAttribute('data-id', '123');
div.getAttribute('data-id');            // '123'
div.removeAttribute('data-id');
div.dataset.id;                         // '123' (data-id → dataset.id)
div.hasAttribute('data-id');            // boolean

// Classes
div.classList.add('active', 'visible');
div.classList.remove('active');
div.classList.toggle('dark-mode');       // Add nếu chưa có, remove nếu có
div.classList.contains('visible');       // true/false
div.classList.replace('old', 'new');

// Style
div.style.backgroundColor = 'red';      // Inline style
div.style.cssText = 'color: blue; font-size: 16px';  // Multiple
const computed = getComputedStyle(div);  // Computed style (readonly)
computed.fontSize;                        // '16px'
```

## Thêm/Xóa/Di chuyển

```javascript
// Thêm vào cuối
parent.appendChild(child);           // Trả về child
parent.append(child, 'text', el2);   // Multiple, cả text. Không return.
parent.append('Hello');              // Thêm text node

// Thêm vào đầu
parent.prepend(child);

// Thêm trước/sau element
reference.before(newEl);             // Thêm trước reference
reference.after(newEl);              // Thêm sau reference

// Insert tại vị trí cụ thể
parent.insertBefore(newEl, referenceEl);

// insertAdjacentHTML — Hiệu quả, không parse lại existing DOM
element.insertAdjacentHTML('beforebegin', '<div>Before</div>');
element.insertAdjacentHTML('afterbegin', '<div>First child</div>');
element.insertAdjacentHTML('beforeend', '<div>Last child</div>');
element.insertAdjacentHTML('afterend', '<div>After</div>');

// Xóa
element.remove();                    // Xóa chính nó
parent.removeChild(child);          // Xóa con, trả về child

// Replace
parent.replaceChild(newEl, oldEl);  // Cũ
oldEl.replaceWith(newEl);           // Mới (ES6)

// Clone
const clone = element.cloneNode(true);   // true = deep clone (con cháu)
const shallow = element.cloneNode(false); // false = chỉ element, không con
```

## DocumentFragment — Batch DOM updates

```javascript
// ❌ Thêm 1000 items trực tiếp → 1000 reflows!
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  list.appendChild(li);  // Trigger reflow mỗi lần!
}

// ✅ DocumentFragment — 1 lần reflow
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = `Item ${i}`;
  fragment.appendChild(li);  // Thêm vào fragment (in-memory)
}
list.appendChild(fragment);  // 1 lần reflow duy nhất!
```

---

# 4. Event Flow — Capturing → Target → Bubbling

```
                         │ Capturing Phase (đi xuống)
                         ▼
┌─────────────────────────────────────────────┐
│ document                                     │
│  ┌─────────────────────────────────────────┐ │
│  │ <html>                                   │ │
│  │  ┌─────────────────────────────────────┐ │ │
│  │  │ <body>                               │ │ │
│  │  │  ┌─────────────────────────────────┐ │ │ │
│  │  │  │ <div>                            │ │ │ │
│  │  │  │  ┌─────────────────────────────┐ │ │ │ │
│  │  │  │  │ <button> ← TARGET           │ │ │ │ │
│  │  │  │  └─────────────────────────────┘ │ │ │ │
│  │  │  └─────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                         ▲
                         │ Bubbling Phase (đi lên)

Event Flow: Capturing (1) → Target (2) → Bubbling (3)
```

```javascript
// Bubbling (default) — event đi TỪ target LÊN document
document.querySelector('.outer').addEventListener('click', () => {
  console.log('outer');
});
document.querySelector('.inner').addEventListener('click', () => {
  console.log('inner');
});
// Click .inner → "inner" → "outer" (bubbles up)

// Capturing — event đi TỪ document XUỐNG target
document.querySelector('.outer').addEventListener('click', () => {
  console.log('outer capturing');
}, true);  // true = capturing phase
// hoặc: { capture: true }

document.querySelector('.inner').addEventListener('click', () => {
  console.log('inner');
});
// Click .inner → "outer capturing" → "inner"
```

## Stop Propagation

```javascript
// stopPropagation — Ngăn event lan sang elements khác
element.addEventListener('click', (event) => {
  event.stopPropagation();  // KHÔNG bubble lên parent nữa
});

// stopImmediatePropagation — Ngăn cả listeners KHÁC trên CÙNG element
element.addEventListener('click', (e) => {
  console.log('First handler');
  e.stopImmediatePropagation();  // Dừng hẳn
});
element.addEventListener('click', () => {
  console.log('Second handler');  // KHÔNG được gọi!
});
```

## preventDefault

```javascript
// preventDefault — Ngăn default behavior, KHÔNG ngăn propagation
const link = document.querySelector('a');
link.addEventListener('click', (event) => {
  event.preventDefault();  // Không navigate
  console.log('Link clicked but not navigated');
});

const form = document.querySelector('form');
form.addEventListener('submit', (event) => {
  event.preventDefault();  // Không submit form
  // Custom validation & AJAX submit
});

// Kiểm tra event có cancelable không
if (event.cancelable) {
  event.preventDefault();
}
```

## Event Object Properties

```javascript
element.addEventListener('click', (event) => {
  event.target;          // Element THỰC SỰ được click
  event.currentTarget;   // Element mà listener được gắn vào (= this)
  event.type;            // 'click'
  event.timeStamp;       // Thời điểm event xảy ra
  event.bubbles;         // true/false
  event.cancelable;      // true/false
  event.defaultPrevented; // true nếu preventDefault() đã gọi
  event.eventPhase;      // 1: Capturing, 2: Target, 3: Bubbling
  event.isTrusted;       // true nếu từ user action (không phải code)

  // Mouse events
  event.clientX;         // X từ viewport
  event.clientY;         // Y từ viewport
  event.pageX;           // X từ document (bao gồm scroll)
  event.pageY;           // Y từ document
  event.button;          // 0: left, 1: middle, 2: right

  // Keyboard events
  event.key;             // 'Enter', 'a', 'Shift'
  event.code;            // 'Enter', 'KeyA', 'ShiftLeft'
  event.altKey;          // true nếu Alt đang nhấn
  event.ctrlKey;         // true nếu Ctrl đang nhấn
  event.shiftKey;        // true nếu Shift đang nhấn
  event.metaKey;         // true nếu Cmd/Win đang nhấn
});
```

---

# 5. Event Delegation

> Thay vì gắn listener cho **mỗi child**, gắn **1 listener** trên parent → handle qua `event.target`.

```javascript
// ❌ Gắn listener cho mỗi button (100 buttons = 100 listeners)
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', handleClick);
});
// Vấn đề: buttons thêm sau không có listener

// ✅ Event Delegation — 1 listener trên parent
document.querySelector('.button-container').addEventListener('click', (event) => {
  // Kiểm tra target
  if (event.target.matches('.btn')) {
    handleClick(event);
  }

  // Hoặc tìm closest ancestor match
  const btn = event.target.closest('.btn');
  if (btn) {
    const action = btn.dataset.action;
    console.log('Button action:', action);
  }
});
```

**Ưu điểm:**
- **Ít memory** — 1 listener thay vì N listeners
- **Dynamic elements** — elements thêm sau vẫn hoạt động
- **Cleanup đơn giản** — chỉ remove 1 listener

```javascript
// Practical example: Todo list với delegation
const todoList = document.querySelector('#todo-list');

todoList.addEventListener('click', (event) => {
  const target = event.target;

  if (target.matches('.delete-btn')) {
    target.closest('li').remove();
  }

  if (target.matches('.toggle-btn')) {
    target.closest('li').classList.toggle('completed');
  }

  if (target.matches('.edit-btn')) {
    const li = target.closest('li');
    const text = li.querySelector('.text');
    text.contentEditable = true;
    text.focus();
  }
});

// Thêm todo mới — TỰ ĐỘNG có click handling nhờ delegation!
function addTodo(text) {
  const li = document.createElement('li');
  li.innerHTML = `
    <span class="text">${text}</span>
    <button class="toggle-btn">Toggle</button>
    <button class="delete-btn">Delete</button>
    <button class="edit-btn">Edit</button>
  `;
  todoList.appendChild(li);
}
```

---

# 6. Custom Events & dispatchEvent

```javascript
// Tạo Custom Event
const myEvent = new CustomEvent('user:login', {
  detail: {
    userId: 123,
    username: 'minh',
    timestamp: Date.now()
  },
  bubbles: true,      // Có bubble lên parent
  cancelable: true,    // Có thể preventDefault
  composed: false      // Có vượt qua Shadow DOM không
});

// Listen
document.addEventListener('user:login', (event) => {
  console.log('User logged in:', event.detail.username);
});

// Dispatch
document.dispatchEvent(myEvent);

// Kiểm tra event bị cancel
const cancelled = !element.dispatchEvent(myEvent);  // true nếu preventDefault()

// ✅ Practical: Component communication
class CartComponent {
  addItem(item) {
    this.items.push(item);
    // Phát event cho components khác
    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: { items: this.items, total: this.getTotal() },
      bubbles: true
    }));
  }
}

class HeaderComponent {
  constructor() {
    document.addEventListener('cart:updated', (e) => {
      this.updateCartBadge(e.detail.items.length);
    });
  }
}
```

---

# 7. Observer APIs

## IntersectionObserver — Visibility detection

```javascript
// Detect khi element xuất hiện/biến mất trong viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      console.log('Element visible:', entry.target);
      console.log('Visible ratio:', entry.intersectionRatio);  // 0-1
      entry.target.classList.add('animate-in');
      observer.unobserve(entry.target);  // Ngừng theo dõi
    }
  });
}, {
  root: null,          // null = viewport (mặc định)
  rootMargin: '0px',   // Expand/shrink observation area
  threshold: [0, 0.5, 1]  // Callback khi 0%, 50%, 100% visible
});

// Observe elements
document.querySelectorAll('.lazy-section').forEach(el => {
  observer.observe(el);
});

// Cleanup
observer.disconnect();

// ✅ Use cases:
// - Lazy loading images
// - Infinite scroll
// - Scroll animations
// - Analytics (element visibility tracking)
// - Ads viewability
```

## MutationObserver — DOM changes detection

```javascript
// Detect thay đổi trong DOM tree
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    switch (mutation.type) {
      case 'childList':
        console.log('Children changed:', mutation.addedNodes, mutation.removedNodes);
        break;
      case 'attributes':
        console.log('Attribute changed:', mutation.attributeName,
          'from', mutation.oldValue, 'to', mutation.target.getAttribute(mutation.attributeName));
        break;
      case 'characterData':
        console.log('Text changed:', mutation.target.textContent);
        break;
    }
  });
});

observer.observe(document.getElementById('app'), {
  childList: true,      // Theo dõi con thêm/xóa
  attributes: true,     // Theo dõi attribute thay đổi
  characterData: true,  // Theo dõi text thay đổi
  subtree: true,        // Theo dõi cả descendants
  attributeOldValue: true,  // Lưu giá trị cũ
  attributeFilter: ['class', 'data-id']  // Chỉ theo dõi attributes cụ thể
});

// Cleanup
observer.disconnect();

// ✅ Use cases:
// - Third-party script monitoring
// - Auto-save khi content thay đổi
// - Dynamic DOM → trigger re-render
// - Accessibility: detect DOM changes → announce
```

## ResizeObserver — Element resize detection

```javascript
// Detect khi element thay đổi kích thước
const observer = new ResizeObserver((entries) => {
  entries.forEach(entry => {
    const { width, height } = entry.contentRect;
    console.log(`${entry.target.id}: ${width}x${height}`);

    // Responsive component logic
    if (width < 600) {
      entry.target.classList.add('compact');
    } else {
      entry.target.classList.remove('compact');
    }
  });
});

observer.observe(document.getElementById('sidebar'));
observer.observe(document.getElementById('main-content'));

// ✅ Use cases:
// - Responsive components (không dùng media query)
// - Chart/Canvas resize
// - Virtualized list resize
// - Layout debugging
```

---

# 8. Storage APIs

## So sánh

| | localStorage | sessionStorage | Cookies | IndexedDB |
|--|-------------|---------------|---------|-----------|
| Dung lượng | ~5-10MB | ~5-10MB | ~4KB | Hàng trăm MB+ |
| Lifetime | Vĩnh viễn | Đến khi tab đóng | Theo `Max-Age`/`Expires` | Vĩnh viễn |
| Gửi kèm request | ❌ | ❌ | ✅ Tự động | ❌ |
| Accessible từ | Same origin | Same origin, same tab | Same origin + path | Same origin |
| API | Sync | Sync | `document.cookie` | Async (IDB API) |
| Data type | String only | String only | String only | Structured (objects, blobs) |

## localStorage & sessionStorage

```javascript
// Set
localStorage.setItem('user', JSON.stringify({ name: 'Minh', age: 25 }));
localStorage.setItem('theme', 'dark');

// Get
const user = JSON.parse(localStorage.getItem('user'));
const theme = localStorage.getItem('theme');  // 'dark'
const missing = localStorage.getItem('xyz');   // null

// Remove
localStorage.removeItem('theme');

// Clear all
localStorage.clear();

// Length & key
localStorage.length;        // Số items
localStorage.key(0);        // Key tại index 0

// Listen storage changes (across tabs!)
window.addEventListener('storage', (event) => {
  console.log('Key:', event.key);
  console.log('Old:', event.oldValue);
  console.log('New:', event.newValue);
  console.log('URL:', event.url);
  // ⚠️ CHỈ fire ở TAB KHÁC, không fire ở tab hiện tại!
});

// sessionStorage — API giống hệt, khác lifetime
sessionStorage.setItem('temp', 'data');  // Mất khi đóng tab
```

## Cookies (JavaScript)

```javascript
// Set cookie
document.cookie = 'name=Minh; path=/; max-age=3600; SameSite=Lax';
document.cookie = 'theme=dark; path=/; max-age=86400';
// ⚠️ Mỗi lần gán = THÊM cookie (không ghi đè tất cả)

// Get all cookies
console.log(document.cookie);  // 'name=Minh; theme=dark' (tất cả trên 1 string)

// Parse cookies
function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
getCookie('name');  // 'Minh'

// Delete cookie — set max-age=0
document.cookie = 'name=; max-age=0; path=/';

// ⚠️ HttpOnly cookies KHÔNG đọc được bằng JavaScript (document.cookie)
// → Server phải set, chỉ gửi qua HTTP requests
```

## IndexedDB (cơ bản)

```javascript
// Mở database
const request = indexedDB.open('MyDB', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  // Tạo object store (giống table)
  const store = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
  store.createIndex('name', 'name', { unique: false });
};

request.onsuccess = (event) => {
  const db = event.target.result;

  // Add data
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  store.add({ name: 'Minh', age: 25 });
  store.add({ name: 'Lan', age: 23 });

  // Read data
  const getTx = db.transaction('users', 'readonly');
  const getStore = getTx.objectStore('users');
  const getRequest = getStore.get(1);
  getRequest.onsuccess = () => {
    console.log(getRequest.result);  // { id: 1, name: 'Minh', age: 25 }
  };

  // Query by index
  const index = getStore.index('name');
  const nameRequest = index.get('Lan');
  nameRequest.onsuccess = () => {
    console.log(nameRequest.result);
  };
};

// ✅ Thực tế: dùng thư viện idb (wrapper Promise cho IndexedDB)
import { openDB } from 'idb';

const db = await openDB('MyDB', 1, {
  upgrade(db) {
    db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
  }
});

await db.add('users', { name: 'Minh', age: 25 });
const user = await db.get('users', 1);
const allUsers = await db.getAll('users');
```

---

# 9. Câu hỏi phỏng vấn

### Q1: Event Bubbling và Capturing khác gì? Thứ tự thế nào?

**A:** Event flow có 3 phases: **Capturing** (document → target), **Target** (element được click), **Bubbling** (target → document). Mặc định listeners chạy ở **Bubbling** phase. Để chạy ở Capturing: `addEventListener(event, handler, true)` hoặc `{ capture: true }`. `stopPropagation()` ngăn lan tiếp.

---

### Q2: Event Delegation là gì? Tại sao cần?

**A:** Thay vì gắn listener cho N children, gắn **1 listener trên parent** → check `event.target` hoặc `event.target.closest()`. Ưu điểm: ít memory (1 vs N listeners), dynamic elements tự động hoạt động, cleanup đơn giản. Dựa trên Event Bubbling — events từ child bubble lên parent.

---

### Q3: `event.target` và `event.currentTarget` khác gì?

**A:** `event.target` = element **THỰC SỰ** gây ra event (user click). `event.currentTarget` = element **mà listener được gắn vào** (= `this` trong handler). Trong delegation: target là child thực tế, currentTarget là parent container.

---

### Q4: HTMLCollection và NodeList khác gì?

**A:** **HTMLCollection** (từ `getElementsBy*`): chỉ Elements, **live** (tự update khi DOM thay đổi), không có `forEach`. **NodeList** (từ `querySelectorAll`): Elements + Text + Comments, **static** (snapshot), có `forEach`. Cả hai đều convert được bằng `Array.from()` hoặc spread.

---

### Q5: localStorage, sessionStorage, cookies khác gì?

**A:**
- **localStorage**: ~5MB, vĩnh viễn, same origin, sync API, không gửi kèm request.
- **sessionStorage**: ~5MB, mất khi đóng tab, cùng tab only.
- **Cookies**: ~4KB, server-accessible (gửi mỗi request), có HttpOnly/Secure/SameSite, `Max-Age` control.
- **IndexedDB**: hàng trăm MB, async API, structured data (objects), vĩnh viễn.

---

### Q6: IntersectionObserver dùng để làm gì? Ưu điểm so với scroll event?

**A:** IntersectionObserver detect khi element vào/ra viewport (hoặc container). Ưu điểm: **asynchronous** (không block main thread), **callback-based** (chỉ chạy khi thay đổi — không chạy mỗi scroll pixel), hiệu quả hơn scroll + getBoundingClientRect (gây forced reflow). Use cases: lazy loading, infinite scroll, scroll animations, ads viewability.

---

### Q7: MutationObserver dùng khi nào?

**A:** Detect **DOM changes**: thêm/xóa nodes, attribute thay đổi, text thay đổi. Use cases: monitoring third-party scripts modify DOM, auto-save khi content editable thay đổi, accessibility announcements, React/Vue-like reactivity implementation. Thay thế deprecated `Mutation Events` (DOMSubtreeModified).

---

### Q8: DocumentFragment là gì? Tại sao cần?

**A:** DocumentFragment là **container in-memory** — thêm nhiều elements vào Fragment rồi append Fragment vào DOM **1 lần**. Tránh **N reflows** (mỗi appendChild trigger reflow). Khi append Fragment, chỉ children được move, Fragment trở nên trống. Performance tốt hơn đáng kể cho batch DOM updates.

---

### Q9: Custom Events dùng thế nào? Use case?

**A:** `new CustomEvent('name', { detail: data, bubbles: true })` + `element.dispatchEvent(event)`. Listen bằng `addEventListener`. Use cases: **component communication** không coupling (pub/sub pattern), **analytics events**, **plugin systems**, custom form validation triggers. `detail` property chứa data tùy ý.
