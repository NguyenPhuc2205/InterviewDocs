# React Fundamentals

> Tài liệu ôn tập phỏng vấn — Toàn bộ kiến thức nền tảng về React: React là gì, Virtual DOM, JSX, Components, Props & State, Reconciliation, React Fiber.

---

## Mục lục

1. [React là gì?](#1-react-là-gì)
2. [Virtual DOM — Cách React cập nhật giao diện](#2-virtual-dom--cách-react-cập-nhật-giao-diện)
3. [JSX — JavaScript XML](#3-jsx--javascript-xml)
4. [Components — Function vs Class](#4-components--function-vs-class)
5. [Props và State](#5-props-và-state)
6. [Reconciliation — Thuật toán so sánh](#6-reconciliation--thuật-toán-so-sánh)
7. [React Fiber — Kiến trúc nền tảng](#7-react-fiber--kiến-trúc-nền-tảng)
8. [One-way Data Flow — Luồng dữ liệu một chiều](#8-one-way-data-flow--luồng-dữ-liệu-một-chiều)
9. [Câu hỏi phỏng vấn thường gặp](#9-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. React là gì?

React là một **thư viện JavaScript** (library, không phải framework) do Facebook (Meta) phát triển, dùng để xây dựng **giao diện người dùng** (UI).

## Tại sao gọi là "thư viện" chứ không phải "framework"?

| | Library (Thư viện) | Framework (Khung) |
|---|---|---|
| **Ai kiểm soát** | **Bạn** gọi thư viện khi cần | Framework **gọi code của bạn** |
| **Phạm vi** | Giải quyết **1 việc** (React = UI) | Giải quyết **nhiều việc** (routing, state, HTTP...) |
| **Ví dụ** | React, Lodash | Angular, NestJS, Next.js |

> React chỉ lo **render UI**. Routing, state management, HTTP requests — bạn phải tự chọn thư viện khác (React Router, Redux, Axios...).

## Đặc điểm cốt lõi

| Đặc điểm | Giải thích |
|---|---|
| **Component-based** | Giao diện chia thành các khối nhỏ (component), mỗi khối có logic và UI riêng |
| **Declarative** | Bạn **mô tả** giao diện muốn thấy, React tự lo cách cập nhật DOM |
| **Virtual DOM** | React không thao tác trực tiếp DOM thật — nó dùng bản sao ảo để tính toán thay đổi tối thiểu |
| **One-way data flow** | Dữ liệu chảy từ cha → con. Con muốn gửi ngược lên cha phải qua callback |

### Declarative vs Imperative

```javascript
// Imperative (jQuery) — bạn NÓI TỪ BƯỚC MỘT cách cập nhật
const button = document.getElementById('btn');
button.textContent = 'Đã bấm';
button.classList.add('active');

// Declarative (React) — bạn MÔ TẢ kết quả, React tự lo
function Button({ clicked }) {
  return (
    <button className={clicked ? 'active' : ''}>
      {clicked ? 'Đã bấm' : 'Bấm đi'}
    </button>
  );
}
```

> Ví von: Imperative = "rẽ trái, đi 200m, rẽ phải, qua cầu..." (chỉ đường từng bước). Declarative = "đưa tôi đến quán phở" (nói kết quả, taxi tự đi).

---

# 2. Virtual DOM — Cách React cập nhật giao diện

## DOM thật là gì?

DOM (Document Object Model) là **cấu trúc cây** mà trình duyệt tạo ra từ HTML. Mỗi thẻ HTML là một **node** trong cây. Khi bạn thay đổi DOM → trình duyệt phải **tính lại layout, repaint** → rất tốn kém.

## Virtual DOM là gì?

Virtual DOM là một **bản sao nhẹ** của DOM thật, tồn tại trong bộ nhớ JavaScript (chỉ là object JS, không phải DOM thật). React dùng nó để **tính toán trước** những gì cần thay đổi, rồi **cập nhật DOM thật một lần** với số thay đổi tối thiểu.

## Quy trình cập nhật

```
1. State thay đổi (ví dụ: setState, useState)

2. React tạo Virtual DOM MỚI (phản ánh state mới)

3. So sánh (Diffing):
   Virtual DOM cũ  ←→  Virtual DOM mới
   Tìm ra những node BỊ THAY ĐỔI

4. Cập nhật DOM thật (Commit):
   Chỉ cập nhật ĐÚNG những node thay đổi
   → Không cần render lại toàn bộ trang

Ví dụ:
   State: count = 5 → count = 6
   Virtual DOM cũ: <span>5</span>
   Virtual DOM mới: <span>6</span>
   Diff: chỉ text "5" → "6" thay đổi
   Commit: cập nhật DUY NHẤT text node đó trong DOM thật
```

## Tại sao không thao tác DOM thật trực tiếp?

| Thao tác DOM thật trực tiếp | Qua Virtual DOM |
|---|---|
| Mỗi thay đổi → trình duyệt tính lại layout ngay | Gom nhiều thay đổi → cập nhật 1 lần (batching) |
| 100 thay đổi = 100 lần repaint | 100 thay đổi = 1 lần repaint |
| Chậm khi UI phức tạp | Nhanh hơn cho UI phức tạp |

> **Lưu ý quan trọng:** Virtual DOM không luôn nhanh hơn DOM thật. Với app đơn giản (ít thay đổi), thao tác DOM trực tiếp có thể nhanh hơn. Virtual DOM tối ưu cho **app phức tạp có nhiều thay đổi liên tục**.

---

# 3. JSX — JavaScript XML

## JSX là gì?

JSX là **phần mở rộng cú pháp** cho JavaScript, cho phép viết code trông giống HTML bên trong JavaScript. JSX **không phải HTML** — nó được Babel biên dịch thành các lời gọi hàm JavaScript.

```jsx
// Bạn viết JSX:
const element = <h1 className="title">Xin chào!</h1>;

// Babel biên dịch thành:
const element = React.createElement('h1', { className: 'title' }, 'Xin chào!');

// React.createElement trả về object (Virtual DOM node):
const element = {
  type: 'h1',
  props: {
    className: 'title',
    children: 'Xin chào!'
  }
};
```

## Quy tắc JSX quan trọng

| Quy tắc | Giải thích | Ví dụ |
|---|---|---|
| **Một gốc duy nhất** | JSX phải trả về 1 element gốc | Dùng `<div>` hoặc `<>...</>` (Fragment) |
| **className thay class** | `class` là từ khoá JS | `<div className="box">` |
| **htmlFor thay for** | `for` là từ khoá JS | `<label htmlFor="email">` |
| **camelCase** | Attribute dùng camelCase | `onClick`, `onChange`, `tabIndex` |
| **Self-closing bắt buộc** | Thẻ không có con phải đóng | `<img />`, `<input />`, `<br />` |
| **Biểu thức trong `{}`** | Chèn JS bằng dấu ngoặc nhọn | `{user.name}`, `{isAdmin && <Admin />}` |

## Fragment — Tránh thêm div thừa

```jsx
// ❌ Thêm div không cần thiết
function App() {
  return (
    <div>
      <h1>Tiêu đề</h1>
      <p>Nội dung</p>
    </div>
  );
}

// ✅ Fragment — không thêm node vào DOM
function App() {
  return (
    <>
      <h1>Tiêu đề</h1>
      <p>Nội dung</p>
    </>
  );
}
```

## Render có điều kiện

```jsx
// 1. Toán tử && (hiện hoặc không hiện)
{isAdmin && <AdminPanel />}

// 2. Toán tử bậc 3 (hiện cái này hoặc cái kia)
{isLoggedIn ? <Dashboard /> : <LoginForm />}

// 3. Return sớm
function Page({ user }) {
  if (!user) return <LoginForm />;
  return <Dashboard user={user} />;
}
```

## Render danh sách

```jsx
function UserList({ users }) {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>  // key BẮT BUỘC
      ))}
    </ul>
  );
}
```

> **Tại sao cần `key`?** React dùng `key` để nhận diện phần tử nào thêm/xoá/thay đổi khi danh sách cập nhật. Không có `key` → React phải render lại toàn bộ danh sách. Xem thêm ở phần Reconciliation.

---

# 4. Components — Function vs Class

## Component là gì?

Component là **khối xây dựng** (building block) của React. Mỗi component là một **hàm hoặc class** nhận đầu vào (props) và trả về JSX mô tả giao diện.

```
Trang web = cây các components lồng nhau

        <App>
       /     \
   <Header>   <Main>
    /    \       \
 <Logo> <Nav>  <PostList>
                /    \
           <Post>   <Post>
```

## Function Component (Hiện đại — nên dùng)

```jsx
function Welcome({ name, age }) {
  return (
    <div>
      <h1>Xin chào, {name}!</h1>
      <p>Tuổi: {age}</p>
    </div>
  );
}

// Arrow function — viết gọn hơn
const Welcome = ({ name, age }) => (
  <div>
    <h1>Xin chào, {name}!</h1>
    <p>Tuổi: {age}</p>
  </div>
);
```

## Class Component (Legacy — cần biết để đọc code cũ)

```jsx
class Welcome extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  componentDidMount() {
    console.log('Component đã mount');
  }

  render() {
    return (
      <div>
        <h1>Xin chào, {this.props.name}!</h1>
        <p>Đếm: {this.state.count}</p>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Tăng
        </button>
      </div>
    );
  }
}
```

## So sánh Function vs Class

| | Function Component | Class Component |
|---|---|---|
| **Cú pháp** | Hàm JS trả về JSX | Class kế thừa React.Component |
| **State** | `useState()` hook | `this.state` + `this.setState()` |
| **Lifecycle** | `useEffect()` hook | `componentDidMount`, `componentDidUpdate`... |
| **`this`** | Không có `this` | Phải cẩn thận với `this` binding |
| **Code** | Ngắn gọn hơn | Dài dòng hơn |
| **Hiện tại** | **Chuẩn mới** — luôn dùng | Legacy — chỉ đọc code cũ |

> Từ React 16.8+ (Hooks), function component có thể làm **mọi thứ** mà class component làm. React team khuyến nghị dùng function component cho mọi dự án mới.

---

# 5. Props và State

## Props — Dữ liệu từ cha truyền xuống

Props (properties) là **đầu vào** của component, được truyền từ component cha. Props là **read-only** — component con **không được phép sửa** props.

```jsx
// Cha truyền props
<UserCard name="Hùng" age={25} isAdmin={true} />

// Con nhận props
function UserCard({ name, age, isAdmin }) {
  // ❌ props.name = "Khác"; // KHÔNG ĐƯỢC SỬA
  return (
    <div>
      <h2>{name}</h2>
      <p>Tuổi: {age}</p>
      {isAdmin && <span>👑 Admin</span>}
    </div>
  );
}
```

### Props nâng cao

```jsx
// Default props
function Button({ label = "Bấm", color = "blue" }) { ... }

// Children — nội dung lồng bên trong
function Card({ children, title }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="card-body">{children}</div>
    </div>
  );
}

<Card title="Thông báo">
  <p>Nội dung bất kỳ ở đây</p>   {/* ← children */}
  <button>OK</button>             {/* ← cũng là children */}
</Card>

// Callback props — con gọi hàm của cha
function Child({ onSubmit }) {
  return <button onClick={() => onSubmit('data')}>Gửi</button>;
}

function Parent() {
  const handleSubmit = (data) => console.log(data);
  return <Child onSubmit={handleSubmit} />;
}
```

## State — Dữ liệu nội bộ, thay đổi được

State là dữ liệu **riêng** của component, khi state thay đổi → component **re-render**.

```jsx
function Counter() {
  const [count, setCount] = useState(0);  // [giá trị, hàm cập nhật]

  return (
    <div>
      <p>Đếm: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(prev => prev + 1)}>+1 (functional)</button>
    </div>
  );
}
```

### Tại sao dùng functional update `prev => prev + 1`?

```jsx
// ❌ Có thể sai khi gọi liên tiếp
const handleTriple = () => {
  setCount(count + 1);  // count = 0 → set 1
  setCount(count + 1);  // count vẫn = 0 → set 1  (không phải 2!)
  setCount(count + 1);  // count vẫn = 0 → set 1  (không phải 3!)
};
// Kết quả: count = 1 (không phải 3)

// ✅ Functional update — luôn nhận giá trị mới nhất
const handleTriple = () => {
  setCount(prev => prev + 1);  // 0 → 1
  setCount(prev => prev + 1);  // 1 → 2
  setCount(prev => prev + 1);  // 2 → 3
};
// Kết quả: count = 3 ✅
```

## So sánh Props vs State

| | Props | State |
|---|---|---|
| **Ai sở hữu** | Component **cha** | Component **chính nó** |
| **Sửa được?** | **Không** (read-only) | **Có** (qua setState/useState) |
| **Thay đổi → re-render?** | Có (khi cha truyền props mới) | Có (khi gọi setState) |
| **Mục đích** | Truyền dữ liệu cha → con | Lưu trạng thái nội bộ |
| **Ví von** | Tham số truyền vào hàm | Biến cục bộ trong hàm |

---

# 6. Reconciliation — Thuật toán so sánh

## Reconciliation là gì?

Khi state/props thay đổi, React tạo cây Virtual DOM mới rồi **so sánh** với cây cũ để tìm ra sự khác biệt. Quá trình này gọi là **Reconciliation** (hoà giải).

## Quy tắc Diffing

Thuật toán so sánh 2 cây hoàn chỉnh có độ phức tạp O(n³) — quá chậm. React giả định 2 điều để đưa về **O(n)**:

### Quy tắc 1: Khác loại element → huỷ cây con, tạo mới

```jsx
// Trước:
<div>
  <Counter />
</div>

// Sau:
<span>
  <Counter />
</span>

// div → span: KHÁC LOẠI → React huỷ toàn bộ <div> và <Counter> bên trong
// Tạo <span> mới + <Counter> mới (state bị reset!)
```

### Quy tắc 2: Cùng loại element → giữ lại, cập nhật attributes

```jsx
// Trước:
<div className="old" title="abc" />

// Sau:
<div className="new" title="abc" />

// Cùng là <div> → React CHỈ CẬP NHẬT className (old → new), giữ nguyên title
```

### Vai trò của `key` trong danh sách

```jsx
// Không có key — React so sánh theo VỊ TRÍ (index)
// Trước:             Sau (thêm "An" đầu danh sách):
<li>Bình</li>        <li>An</li>     ← React: "Bình" → "An" (sửa text)
<li>Cường</li>       <li>Bình</li>   ← React: "Cường" → "Bình" (sửa text)
                     <li>Cường</li>  ← React: tạo mới
// → Sửa 2 item + tạo 1 = 3 thao tác (không hiệu quả!)

// Có key — React so sánh theo KEY
<li key="binh">Bình</li>      <li key="an">An</li>      ← Mới, tạo
<li key="cuong">Cường</li>    <li key="binh">Bình</li>   ← Key khớp, giữ nguyên
                               <li key="cuong">Cường</li> ← Key khớp, giữ nguyên
// → Chỉ tạo 1 item mới = 1 thao tác (hiệu quả!)
```

### Key nên dùng gì?

| Loại key | Dùng được? | Lý do |
|---|---|---|
| **ID từ data** (user.id) | ✅ Tốt nhất | Ổn định, duy nhất |
| **Index** (0, 1, 2...) | ⚠️ Chỉ khi danh sách tĩnh | Thay đổi thứ tự → index thay đổi → re-render sai |
| **Math.random()** | ❌ Tuyệt đối không | Mỗi render tạo key mới → huỷ/tạo lại mọi thứ |

---

# 7. React Fiber — Kiến trúc nền tảng

## React Fiber là gì?

Fiber là **kiến trúc nội bộ** của React (từ React 16+), thay thế Stack Reconciler cũ. Fiber cho phép React **chia nhỏ công việc render** thành nhiều phần và **tạm dừng / tiếp tục** khi cần.

## Tại sao cần Fiber?

```
Stack Reconciler cũ (React 15):
  Render bắt đầu → chạy đến hết → KHÔNG THỂ dừng giữa chừng
  Nếu cây component lớn → render lâu → UI đơ (jank)

  ┌─ Render ──────────────────────────────────────┐
  │ Component A → B → C → D → E → F → G → H      │  ← Chạy 1 mạch
  └────────────────────────────────────────────────┘
  Trong suốt thời gian này: trình duyệt KHÔNG THỂ xử lý click, input...

Fiber (React 16+):
  Chia công việc thành từng đơn vị nhỏ (unit of work)
  Mỗi đơn vị xong → kiểm tra "có việc gì quan trọng hơn không?"
  Có → tạm dừng render, xử lý việc quan trọng → quay lại

  ┌─ Render ─┐ ┌─ Xử lý click ─┐ ┌─ Render tiếp ─┐
  │ A → B → C │ │ User bấm nút  │ │ D → E → F → G │
  └───────────┘ └────────────────┘ └────────────────┘
```

## Hai giai đoạn render

| Giai đoạn | Tên | Đặc điểm |
|---|---|---|
| **Render phase** | Tính toán | Tạo Virtual DOM mới, so sánh (diff). **Có thể bị gián đoạn** — React có thể tạm dừng, huỷ, làm lại |
| **Commit phase** | Áp dụng | Cập nhật DOM thật. **Chạy đồng bộ, không bị gián đoạn** — vì DOM đang thay đổi, không thể dừng giữa chừng |

## Concurrent Features (React 18)

Fiber là nền tảng cho các tính năng **Concurrent** trong React 18:

| Tính năng | Giải thích |
|---|---|
| **useTransition** | Đánh dấu cập nhật state là "không khẩn cấp" → React ưu tiên input/click trước |
| **useDeferredValue** | Trì hoãn giá trị — hiện giá trị cũ cho user thấy ngay, tính giá trị mới ngầm |
| **Suspense** | Hiện fallback (loading) trong khi chờ component tải xong |

```jsx
function Search() {
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setText(e.target.value);  // Cập nhật input NGAY (ưu tiên cao)
    startTransition(() => {
      setSearchResult(search(e.target.value));  // Cập nhật kết quả SAU (ưu tiên thấp)
    });
  };

  return (
    <div>
      <input value={text} onChange={handleChange} />
      {isPending ? <Spinner /> : <Results data={searchResult} />}
    </div>
  );
}
```

---

# 8. One-way Data Flow — Luồng dữ liệu một chiều

## Luồng dữ liệu trong React

```
         Cha (Parent)
         │
         │  props ↓ (dữ liệu chảy XUỐNG)
         │
         Con (Child)
         │
         │  props ↓
         │
         Cháu (Grandchild)

Con KHÔNG THỂ sửa props → Muốn gửi ngược lên phải dùng callback:

         Cha ──── state: count = 0 ──── hàm: increment()
         │                                    ↑
         │  props: { count, onIncrement }     │  gọi callback
         │                                    │
         Con ── bấm nút → onIncrement() ──────┘
```

## Tại sao luồng một chiều?

| Ưu điểm | Giải thích |
|---|---|
| **Dễ debug** | Dữ liệu chỉ đi 1 hướng → dễ theo dõi nguồn gốc |
| **Dễ dự đoán** | Biết data đến từ đâu, thay đổi ở đâu |
| **Ít lỗi** | Không có 2 nơi cùng sửa 1 dữ liệu (hai chiều → dễ xung đột) |

---

# 9. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| React là gì? Library hay framework? | **Library** — chỉ lo render UI. Không có routing, HTTP, state management sẵn. Bạn gọi React, không phải React gọi code bạn |
| Virtual DOM là gì? Tại sao cần? | Bản sao nhẹ của DOM thật trong bộ nhớ JS. React diff 2 bản Virtual DOM → tìm thay đổi tối thiểu → cập nhật DOM thật 1 lần. Tránh re-render/repaint không cần thiết |
| JSX là gì? Có bắt buộc không? | Phần mở rộng cú pháp cho JS, viết giống HTML. Babel biên dịch thành `React.createElement()`. Không bắt buộc nhưng ai cũng dùng |
| Props khác state thế nào? | Props: cha truyền xuống, read-only. State: nội bộ component, thay đổi được bằng setState. Cả hai thay đổi đều gây re-render |
| Tại sao cần `key` khi render danh sách? | React dùng key để nhận diện element nào thêm/xoá/đổi chỗ. Không có key → React so sánh theo index → sai khi thay đổi thứ tự. Nên dùng ID duy nhất, tránh index |
| Reconciliation hoạt động thế nào? | So sánh 2 cây Virtual DOM. 2 giả định: (1) khác loại element → huỷ tạo lại, (2) cùng loại → cập nhật attributes. Key giúp nhận diện element trong danh sách |
| React Fiber là gì? | Kiến trúc nội bộ React 16+. Chia render thành đơn vị nhỏ, có thể tạm dừng/tiếp tục → không chặn main thread → UI mượt hơn. Nền tảng cho Concurrent Mode |
| React 18 có gì mới? | Concurrent rendering (useTransition, useDeferredValue), automatic batching, Suspense cho data fetching, createRoot API mới |
| Declarative khác imperative? | Declarative: mô tả **cái gì** (UI trông thế nào). Imperative: mô tả **cách nào** (từng bước thao tác DOM). React là declarative |
| One-way data flow là gì? | Dữ liệu chảy từ cha → con qua props. Con muốn gửi ngược phải gọi callback. Dễ debug, dễ dự đoán, ít lỗi |
