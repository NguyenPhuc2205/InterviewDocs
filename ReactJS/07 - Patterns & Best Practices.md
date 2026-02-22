# Patterns & Best Practices

> Tài liệu ôn tập phỏng vấn — Các design patterns phổ biến trong React: Compound Components, Render Props, HOC, Controlled vs Uncontrolled, Container/Presentational, Custom Hook patterns, key prop.

---

## Mục lục

1. [Controlled vs Uncontrolled Components](#1-controlled-vs-uncontrolled-components)
2. [Higher-Order Components (HOC)](#2-higher-order-components-hoc)
3. [Render Props](#3-render-props)
4. [Compound Components](#4-compound-components)
5. [Container / Presentational Pattern](#5-container--presentational-pattern)
6. [Custom Hook Pattern](#6-custom-hook-pattern)
7. [Best Practices tổng hợp](#7-best-practices-tổng-hợp)
8. [Câu hỏi phỏng vấn thường gặp](#8-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Controlled vs Uncontrolled Components

## Controlled — React kiểm soát giá trị

```jsx
function ControlledForm() {
  const [name, setName] = useState('');

  return (
    <input
      value={name}                           // React kiểm soát giá trị
      onChange={e => setName(e.target.value)} // Mỗi thay đổi → cập nhật state
    />
  );
  // Luôn biết giá trị hiện tại → dễ validate, format, disable submit
}
```

## Uncontrolled — DOM tự quản lý giá trị

```jsx
function UncontrolledForm() {
  const inputRef = useRef(null);

  const handleSubmit = () => {
    console.log(inputRef.current.value);  // Lấy giá trị khi cần
  };

  return (
    <input ref={inputRef} defaultValue="Hùng" />  // DOM tự quản lý
  );
  // Đơn giản hơn nhưng khó validate real-time, khó format
}
```

| | Controlled | Uncontrolled |
|---|---|---|
| **Giá trị** | Trong React state | Trong DOM |
| **Cập nhật** | onChange → setState | Không cần |
| **Đọc giá trị** | Từ state (luôn biết) | Từ ref (khi cần) |
| **Validate real-time** | ✅ Dễ | ❌ Khó |
| **Performance** | Render lại mỗi keystroke | Ít render hơn |
| **Dùng khi** | Form phức tạp, validate | Form đơn giản, file input |

> **Best practice:** Mặc định dùng **Controlled**. Dùng Uncontrolled cho file input hoặc tích hợp thư viện DOM bên ngoài.

---

# 2. Higher-Order Components (HOC)

## HOC là gì?

HOC là **hàm** nhận component → trả về component mới với chức năng bổ sung. Pattern "bọc lớp ngoài" để thêm logic mà không sửa component gốc.

```jsx
// HOC: thêm loading logic
function withLoading(WrappedComponent) {
  return function WithLoadingComponent({ isLoading, ...props }) {
    if (isLoading) return <Spinner />;
    return <WrappedComponent {...props} />;
  };
}

// HOC: thêm authentication check
function withAuth(WrappedComponent) {
  return function WithAuthComponent(props) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    return <WrappedComponent {...props} user={user} />;
  };
}

// Sử dụng
const UserListWithLoading = withLoading(UserList);
const DashboardWithAuth = withAuth(Dashboard);

<UserListWithLoading isLoading={loading} users={users} />
<DashboardWithAuth />
```

## Nhược điểm HOC → Tại sao hooks thay thế

| Nhược điểm | Giải thích |
|---|---|
| **Wrapper hell** | Nhiều HOC lồng nhau: `withAuth(withLoading(withTheme(Component)))` |
| **Prop collision** | 2 HOC cùng inject prop tên giống → đè lên nhau |
| **Khó debug** | DevTools hiện nhiều wrapper, khó tìm component thật |

> Hiện tại: Hầu hết HOC đã được thay thế bằng **Custom Hooks**. Vẫn cần biết HOC để đọc code cũ.

---

# 3. Render Props

## Render Props là gì?

Component nhận **một hàm (function) qua props**, gọi hàm đó để quyết định render gì. Cho phép chia sẻ logic giữa các component.

```jsx
// Mouse tracker — chia sẻ logic theo dõi chuột
function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return render(position);  // Gọi hàm render, truyền data
}

// Sử dụng — mỗi nơi render khác nhau
<MouseTracker render={({ x, y }) => <p>Chuột ở: ({x}, {y})</p>} />
<MouseTracker render={({ x, y }) => <Cursor x={x} y={y} />} />

// Dùng children thay render prop
<MouseTracker>
  {({ x, y }) => <p>Chuột ở: ({x}, {y})</p>}
</MouseTracker>
```

> Tương tự HOC, Render Props đã phần lớn được thay thế bằng Custom Hooks. Nhưng vẫn hữu ích trong một số trường hợp (ví dụ: `<Formik>`, `<Query>`).

---

# 4. Compound Components

## Compound Components là gì?

Nhóm component **làm việc cùng nhau** để tạo giao diện phức tạp, chia sẻ state ngầm qua Context. Người dùng component có toàn quyền sắp xếp, bỏ bớt, tuỳ chỉnh.

```jsx
// Compound component: Accordion
const AccordionContext = createContext(null);

function Accordion({ children }) {
  const [activeIndex, setActiveIndex] = useState(null);
  return (
    <AccordionContext.Provider value={{ activeIndex, setActiveIndex }}>
      <div className="accordion">{children}</div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ index, title, children }) {
  const { activeIndex, setActiveIndex } = useContext(AccordionContext);
  const isOpen = activeIndex === index;

  return (
    <div>
      <button onClick={() => setActiveIndex(isOpen ? null : index)}>
        {title} {isOpen ? '▲' : '▼'}
      </button>
      {isOpen && <div className="content">{children}</div>}
    </div>
  );
}

// Gắn vào Accordion
Accordion.Item = AccordionItem;

// Sử dụng — linh hoạt, dễ đọc
<Accordion>
  <Accordion.Item index={0} title="Phần 1">
    Nội dung phần 1
  </Accordion.Item>
  <Accordion.Item index={1} title="Phần 2">
    Nội dung phần 2
  </Accordion.Item>
</Accordion>
```

> Ví dụ thực tế: `<Select>`, `<Tabs>`, `<Dropdown>` trong Radix UI, Headless UI.

---

# 5. Container / Presentational Pattern

```
Container (Logic)          Presentational (UI)
  - Fetch dữ liệu           - Nhận data qua props
  - Xử lý state             - Chỉ render UI
  - Gọi API                 - Không biết data đến từ đâu
  - Truyền data xuống       - Dễ tái sử dụng
```

```jsx
// Container — logic
function UserListContainer() {
  const { data, loading } = useFetch('/api/users');
  if (loading) return <Spinner />;
  return <UserList users={data} />;
}

// Presentational — chỉ UI
function UserList({ users }) {
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
```

> Hiện tại pattern này thường thay bằng Custom Hooks (logic ở hook, UI ở component). Nhưng vẫn là cách tư duy tốt: **tách logic khỏi UI**.

---

# 6. Custom Hook Pattern

Custom Hooks đã thay thế hầu hết HOC và Render Props — cách hiện đại nhất để tái sử dụng logic.

```jsx
// Thay vì HOC withAuth:
function useRequireAuth(redirectTo = '/login') {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate(redirectTo);
  }, [user, navigate, redirectTo]);

  return user;
}

// Thay vì Render Props MouseTracker:
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return position;
}

// Sử dụng — đơn giản, rõ ràng
function Dashboard() {
  const user = useRequireAuth();
  const { x, y } = useMousePosition();
  if (!user) return null;
  return <div>Chào {user.name}, chuột ở ({x}, {y})</div>;
}
```

---

# 7. Best Practices tổng hợp

| Quy tắc | Giải thích |
|---|---|
| **Component nhỏ, làm 1 việc** | Dễ đọc, dễ test, dễ tái sử dụng |
| **Tách logic vào custom hooks** | Component chỉ lo render UI |
| **Colocation** — đặt state gần nơi dùng | Không "nâng" state lên trừ khi cần chia sẻ |
| **Key ổn định** | Dùng ID, không dùng index cho danh sách thay đổi |
| **Controlled components** cho form | Dễ validate, dễ reset, dễ kiểm soát |
| **Không optimize sớm** | Đo trước, optimize sau |
| **Đặt tên rõ ràng** | `isLoading`, `handleSubmit`, `useAuth` — đọc là hiểu |
| **Tránh inline object/array trong JSX** | `style={{ color: 'red' }}` tạo object mới mỗi render |

---

# 8. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Controlled vs Uncontrolled? | Controlled: React state kiểm soát giá trị (value + onChange). Uncontrolled: DOM tự quản lý (ref). Mặc định dùng controlled |
| HOC là gì? Nhược điểm? | Hàm nhận component → trả component mới. Nhược: wrapper hell, prop collision, khó debug. Nay thay bằng hooks |
| Render Props là gì? | Component nhận function qua props, gọi function đó để render. Chia sẻ logic mà không cần inherit |
| Compound Components dùng khi nào? | Khi nhóm component phải làm việc cùng nhau (Tabs, Select, Accordion). Chia sẻ state ngầm qua Context, cho người dùng linh hoạt tuỳ chỉnh |
| Custom Hooks thay thế pattern nào? | Thay thế hầu hết HOC và Render Props. Đơn giản hơn, rõ ràng hơn, không wrapper hell |
| Khi nào dùng pattern nào? | Hooks cho logic reuse (hầu hết). Compound Components cho UI components library. HOC/Render Props cho legacy code |
