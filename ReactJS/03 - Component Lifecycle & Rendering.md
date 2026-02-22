# Component Lifecycle & Rendering

> Tài liệu ôn tập phỏng vấn — Vòng đời component, cơ chế re-render, React.memo, React.lazy, Suspense, Error Boundaries, batching.

---

## Mục lục

1. [Vòng đời component](#1-vòng-đời-component)
2. [Cơ chế Re-render — Khi nào component render lại?](#2-cơ-chế-re-render--khi-nào-component-render-lại)
3. [React.memo — Ngăn re-render không cần thiết](#3-reactmemo--ngăn-re-render-không-cần-thiết)
4. [React.lazy & Suspense — Tải component theo yêu cầu](#4-reactlazy--suspense--tải-component-theo-yêu-cầu)
5. [Error Boundaries — Bắt lỗi render](#5-error-boundaries--bắt-lỗi-render)
6. [Batching — Gom cập nhật state](#6-batching--gom-cập-nhật-state)
7. [Strict Mode — Phát hiện vấn đề](#7-strict-mode--phát-hiện-vấn-đề)
8. [Câu hỏi phỏng vấn thường gặp](#8-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Vòng đời component

## Function component (Hooks)

```
MOUNTING (lắp vào DOM):
  1. Component được gọi — chạy code bên trong (useState, tính toán...)
  2. React render (tạo Virtual DOM)
  3. React cập nhật DOM thật
  4. Trình duyệt paint
  5. useEffect chạy (sau paint)

UPDATING (cập nhật):
  1. State/props thay đổi → component được gọi lại
  2. React render (tạo Virtual DOM mới)
  3. React diff → cập nhật DOM thật (chỉ phần thay đổi)
  4. Trình duyệt paint
  5. useEffect cleanup (của lần render trước) → useEffect mới chạy

UNMOUNTING (tháo khỏi DOM):
  1. useEffect cleanup chạy lần cuối
  2. Component bị huỷ
```

## Ánh xạ sang Class component (để đọc code cũ)

| Function (Hooks) | Class lifecycle | Thời điểm |
|---|---|---|
| `useState` khởi tạo | `constructor` | Khởi tạo state |
| `useEffect(() => {}, [])` | `componentDidMount` | Sau lần render đầu |
| `useEffect(() => {}, [deps])` | `componentDidUpdate` | Sau mỗi lần cập nhật (deps thay đổi) |
| useEffect return cleanup | `componentWillUnmount` | Trước khi huỷ |
| — | `shouldComponentUpdate` | `React.memo` thay thế |

---

# 2. Cơ chế Re-render — Khi nào component render lại?

## 3 lý do gây re-render

| Lý do | Giải thích |
|---|---|
| **1. State thay đổi** | Gọi setState/dispatch → component chứa state re-render |
| **2. Props thay đổi** | Component cha render lại → truyền props mới → con render lại |
| **3. Cha render lại** | Khi cha render → **TẤT CẢ con render lại** (dù props không đổi!) |

```
⚠️ Hiểu lầm phổ biến:
  "Component chỉ re-render khi props thay đổi" → SAI!
  Component re-render khi CHA render lại — dù props giữ nguyên.

  Parent re-render
    → Child re-render (dù props không đổi)
      → Grandchild re-render (dù props không đổi)

  Muốn ngăn → dùng React.memo()
```

## Re-render ≠ Cập nhật DOM

```
Re-render = React GỌI LẠI hàm component → tạo Virtual DOM mới
          → SO SÁNH với Virtual DOM cũ (diffing)
          → Nếu khác → cập nhật DOM thật
          → Nếu GIỐNG → KHÔNG đụng DOM (nhưng re-render vẫn xảy ra!)

Re-render tốn chi phí (chạy hàm, tạo object, diff) nhưng
KHÔNG tốn bằng cập nhật DOM thật.
```

---

# 3. React.memo — Ngăn re-render không cần thiết

## React.memo là gì?

Higher-Order Component bọc lấy component con. React so sánh props cũ và mới — nếu **giống nhau** → **bỏ qua re-render**.

```jsx
// Không có memo — luôn re-render khi cha render
function ExpensiveList({ items }) {
  console.log('ExpensiveList render');  // Chạy mỗi lần cha render
  return items.map(item => <div key={item.id}>{item.name}</div>);
}

// Có memo — chỉ re-render khi props thay đổi
const ExpensiveList = React.memo(function ExpensiveList({ items }) {
  console.log('ExpensiveList render');  // Chỉ chạy khi items thay đổi
  return items.map(item => <div key={item.id}>{item.name}</div>);
});
```

## Custom comparison function

```jsx
const UserCard = React.memo(
  function UserCard({ user, onClick }) {
    return <div onClick={onClick}>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    // Return true = GIỐNG (không re-render)
    // Return false = KHÁC (re-render)
    return prevProps.user.id === nextProps.user.id;
  }
);
```

## Khi nào dùng / không dùng React.memo

| Dùng | Không dùng |
|---|---|
| Component render nặng (danh sách dài, biểu đồ) | Component nhỏ, render nhanh |
| Props ít thay đổi | Props thay đổi mỗi render (memo vô ích) |
| Component con của parent re-render thường xuyên | Chưa có vấn đề hiệu suất |

---

# 4. React.lazy & Suspense — Tải component theo yêu cầu

## Code Splitting

```jsx
// Không có lazy — TẤT CẢ component tải lúc ban đầu
import HeavyChart from './HeavyChart';  // 500KB tải ngay dù chưa cần

// Có lazy — tải KHI CẦN
const HeavyChart = React.lazy(() => import('./HeavyChart'));
// → File HeavyChart thành chunk riêng → chỉ tải khi render lần đầu

function Dashboard() {
  return (
    <Suspense fallback={<Spinner />}>  {/* Hiện spinner trong khi tải */}
      <HeavyChart />
    </Suspense>
  );
}
```

## Route-level code splitting

```jsx
const Home = React.lazy(() => import('./pages/Home'));
const About = React.lazy(() => import('./pages/About'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

---

# 5. Error Boundaries — Bắt lỗi render

## Vấn đề

Nếu component con bị lỗi trong quá trình render → **toàn bộ ứng dụng crash** (màn trắng). Error Boundary bắt lỗi và hiện UI dự phòng (fallback).

## Cú pháp (chỉ dùng class component)

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };  // Cập nhật state khi có lỗi
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lỗi:', error, errorInfo);
    // Gửi lỗi lên dịch vụ theo dõi (Sentry, LogRocket...)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Có lỗi xảy ra!</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Sử dụng
<ErrorBoundary>
  <Dashboard />    {/* Nếu Dashboard lỗi → hiện fallback, không crash app */}
</ErrorBoundary>
```

## Error Boundary KHÔNG bắt được

| Không bắt được | Lý do |
|---|---|
| Lỗi trong event handler | Dùng try/catch thường |
| Lỗi trong code bất đồng bộ | setTimeout, fetch → try/catch |
| Lỗi server-side rendering | Xử lý ở tầng server |
| Lỗi trong chính Error Boundary | Cần Error Boundary cha bọc ngoài |

---

# 6. Batching — Gom cập nhật state

## React 17 vs React 18

```jsx
// React 17: Chỉ batch trong event handler của React
function handleClick() {
  setCount(c => c + 1);   // ─┐
  setName('Hùng');          // ─┤ → 1 re-render (batch)
  setAge(25);               // ─┘
}

setTimeout(() => {
  setCount(c => c + 1);   // → 1 re-render    ← React 17: KHÔNG batch
  setName('Hùng');          // → 1 re-render   ← 2 lần render!
}, 1000);

// React 18: Automatic batching — batch MỌI NƠI
setTimeout(() => {
  setCount(c => c + 1);   // ─┐
  setName('Hùng');          // ─┤ → 1 re-render (batch) ← React 18: batch!
}, 1000);

// Muốn KHÔNG batch (hiếm khi cần):
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1));  // Re-render NGAY
flushSync(() => setName('Hùng'));         // Re-render NGAY
```

---

# 7. Strict Mode — Phát hiện vấn đề

```jsx
<React.StrictMode>
  <App />
</React.StrictMode>
```

| Hành vi | Mục đích |
|---|---|
| **Render 2 lần** (chỉ dev) | Phát hiện side effects không an toàn |
| **Chạy useEffect 2 lần** (mount → unmount → mount) | Kiểm tra cleanup đúng chưa |
| Cảnh báo lifecycle methods cũ | Phát hiện API sẽ bị loại bỏ |

> Chỉ hoạt động ở development. Production build không bị ảnh hưởng.

---

# 8. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Component re-render khi nào? | (1) State thay đổi, (2) Props thay đổi, (3) Cha re-render. Lưu ý: cha render → con render dù props không đổi |
| React.memo là gì? | HOC bọc component, so sánh props cũ/mới (shallow comparison). Props giống → bỏ qua re-render. Dùng cho component nặng |
| React.lazy dùng để làm gì? | Code splitting — tải component khi cần thay vì tải hết lúc đầu. Kết hợp Suspense để hiện loading |
| Error Boundary là gì? | Class component bắt lỗi render ở component con. Hiện UI fallback thay vì crash toàn app. Không bắt lỗi trong event handler, async code |
| Batching là gì? React 18 có gì khác? | Gom nhiều setState → 1 re-render. React 17 chỉ batch trong event handler. React 18 batch mọi nơi (setTimeout, fetch...) |
| Strict Mode làm gì? | Chỉ dev: render 2 lần, chạy effect 2 lần để phát hiện side effects không an toàn. Production không ảnh hưởng |
| useEffect cleanup chạy khi nào? | (1) Trước khi effect chạy lại (deps thay đổi), (2) Khi component unmount. Dọn dẹp: clearInterval, removeEventListener, abort fetch |
