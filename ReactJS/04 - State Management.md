# State Management

> Tài liệu ôn tập phỏng vấn — Quản lý state trong React: Context API, prop drilling, useReducer + Context, Redux concept, so sánh Zustand/Recoil/Jotai, khi nào cần state management.

---

## Mục lục

1. [Các loại state trong React](#1-các-loại-state-trong-react)
2. [Prop Drilling — Vấn đề truyền props nhiều tầng](#2-prop-drilling--vấn-đề-truyền-props-nhiều-tầng)
3. [Context API — Giải pháp built-in](#3-context-api--giải-pháp-built-in)
4. [useReducer + Context — "Redux nhà làm"](#4-usereducer--context--redux-nhà-làm)
5. [Redux — Khái niệm cốt lõi](#5-redux--khái-niệm-cốt-lõi)
6. [So sánh các thư viện state management](#6-so-sánh-các-thư-viện-state-management)
7. [Khi nào cần State Management Library?](#7-khi-nào-cần-state-management-library)
8. [Câu hỏi phỏng vấn thường gặp](#8-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Các loại state trong React

| Loại | Phạm vi | Ví dụ | Quản lý bằng |
|---|---|---|---|
| **Local state** | 1 component | Form input, toggle | useState, useReducer |
| **Shared state** | Vài component cha-con | Theme, giỏ hàng | Lifting state up, Context |
| **Global state** | Toàn app | User đăng nhập, ngôn ngữ | Context, Redux, Zustand |
| **Server state** | Dữ liệu từ API | Danh sách sản phẩm | React Query, SWR |
| **URL state** | Trong URL | /products?page=2&sort=price | React Router, useSearchParams |

> Sai lầm phổ biến: **Dồn mọi thứ vào global state**. Phần lớn state nên ở **local**. Chỉ "nâng lên" khi nhiều component cần.

---

# 2. Prop Drilling — Vấn đề truyền props nhiều tầng

```
App (user, theme)
  └── Layout (user, theme)           ← Không dùng, chỉ truyền
        └── Sidebar (user, theme)    ← Không dùng, chỉ truyền
              └── UserAvatar (user)  ← Chỉ đây cần!
              └── ThemeBtn (theme)   ← Chỉ đây cần!
```

**Vấn đề:** Mỗi lần thêm/bớt prop → sửa tất cả component trung gian. Code khó bảo trì.

**Giải pháp:**
1. **Component composition** — Truyền component thay vì data
2. **Context API** — Chia sẻ data không cần truyền qua từng tầng
3. **State management library** — Cho trường hợp phức tạp

```jsx
// Component composition — giảm prop drilling
function App() {
  const user = useUser();
  return (
    <Layout>
      <Sidebar>
        <UserAvatar user={user} />    {/* Truyền trực tiếp */}
      </Sidebar>
    </Layout>
  );
}

// Layout và Sidebar nhận children — không cần biết user
function Layout({ children }) { return <div className="layout">{children}</div>; }
function Sidebar({ children }) { return <aside>{children}</aside>; }
```

---

# 3. Context API — Giải pháp built-in

## Cấu trúc hoàn chỉnh

```jsx
// 1. Tạo Context + Provider
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (credentials) => {
    const user = await api.login(credentials);
    setUser(user);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 2. Custom hook để dùng Context (best practice)
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải dùng bên trong AuthProvider');
  }
  return context;
}

// 3. Bọc Provider ở cấp cao
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

// 4. Dùng ở bất kỳ đâu
function Navbar() {
  const { user, logout } = useAuth();  // Lấy trực tiếp — không cần prop drilling
  return user ? <button onClick={logout}>Đăng xuất</button> : <LoginLink />;
}
```

## Nhược điểm của Context

| Nhược điểm | Chi tiết |
|---|---|
| **Re-render mọi consumer** | Value thay đổi → TẤT CẢ component dùng useContext re-render, kể cả không dùng phần thay đổi |
| **Không tối ưu cho high-frequency updates** | Ví dụ: cập nhật vị trí chuột → tất cả consumer re-render |
| **Provider hell** | Nhiều context lồng nhau trở nên khó đọc |

```jsx
// Provider hell
<AuthProvider>
  <ThemeProvider>
    <LanguageProvider>
      <CartProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </CartProvider>
    </LanguageProvider>
  </ThemeProvider>
</AuthProvider>
```

---

# 4. useReducer + Context — "Redux nhà làm"

```jsx
// Reducer
const initialState = { items: [], total: 0 };

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        items: [...state.items, action.payload],
        total: state.total + action.payload.price,
      };
    case 'REMOVE_ITEM':
      const item = state.items.find(i => i.id === action.payload);
      return {
        items: state.items.filter(i => i.id !== action.payload),
        total: state.total - (item?.price || 0),
      };
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

// Context + Provider
const CartContext = createContext(null);

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart phải dùng trong CartProvider');
  return context;
}

// Sử dụng
function AddToCartButton({ product }) {
  const { dispatch } = useCart();
  return (
    <button onClick={() => dispatch({ type: 'ADD_ITEM', payload: product })}>
      Thêm vào giỏ
    </button>
  );
}

function CartTotal() {
  const { state } = useCart();
  return <p>Tổng: {state.total.toLocaleString()}đ</p>;
}
```

---

# 5. Redux — Khái niệm cốt lõi

## Ba nguyên tắc

| Nguyên tắc | Giải thích |
|---|---|
| **Single source of truth** | Toàn bộ app state nằm trong **một** store duy nhất |
| **State is read-only** | Chỉ thay đổi state bằng cách dispatch **action** |
| **Pure reducers** | Reducer là hàm thuần — nhận (state, action) → trả về state mới, không side effects |

## Luồng dữ liệu

```
UI → dispatch(action) → Reducer → Cập nhật Store → UI re-render

Ví dụ:
  Bấm nút → dispatch({ type: 'INCREMENT' })
          → reducer(state, action) → { count: state.count + 1 }
          → Store cập nhật
          → Component đọc count mới → re-render
```

## Redux Toolkit (cách viết hiện đại)

```jsx
import { createSlice, configureStore } from '@reduxjs/toolkit';

// Slice = reducer + actions gom lại
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; },      // "Mutate" trực tiếp (Immer xử lý)
    decrement: (state) => { state.value -= 1; },
    addBy: (state, action) => { state.value += action.payload; },
  },
});

const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

// React component
function Counter() {
  const count = useSelector(state => state.counter.value);
  const dispatch = useDispatch();

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => dispatch(counterSlice.actions.increment())}>+1</button>
    </div>
  );
}
```

---

# 6. So sánh các thư viện state management

| | Context + useReducer | Redux Toolkit | Zustand | Jotai | Recoil |
|---|---|---|---|---|---|
| **Loại** | Built-in | Flux pattern | Flux-like | Atomic | Atomic |
| **Boilerplate** | Ít | Trung bình | **Rất ít** | Rất ít | Trung bình |
| **Bundle size** | 0KB (built-in) | ~11KB | **~1KB** | ~3KB | ~14KB |
| **Performance** | Kém (re-render mọi consumer) | Tốt (selector) | **Tốt** (selector) | Tốt (atomic) | Tốt (atomic) |
| **DevTools** | Không | Có | Có | Có | Có |
| **Học** | Dễ | Trung bình | **Dễ** | Dễ | Trung bình |
| **Phù hợp** | State đơn giản, ít thay đổi | App lớn, team lớn | App vừa-lớn | App vừa | App vừa |

## Zustand — Đơn giản nhất

```jsx
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  name: 'Hùng',
  increment: () => set((state) => ({ count: state.count + 1 })),
  setName: (name) => set({ name }),
}));

// Dùng trong component — tự động re-render khi giá trị thay đổi
function Counter() {
  const count = useStore((state) => state.count);  // Chỉ re-render khi count đổi
  const increment = useStore((state) => state.increment);
  return <button onClick={increment}>{count}</button>;
}
```

---

# 7. Khi nào cần State Management Library?

```
                        ┌─ useState/useReducer đủ chưa?
                        │
         Có ◄───────────┤  State chỉ dùng trong 1-2 component?
                        │
                        └──► Không → Nhiều component cần chung state
                                     │
                     ┌───────────────┤
                     │               │
         Ít thay đổi?          Thay đổi thường xuyên?
              │                       │
              ▼                       ▼
        Context API            Zustand / Redux / Jotai
      (theme, ngôn ngữ,        (giỏ hàng, thông báo,
       user auth)               form phức tạp, realtime)
```

| Tình huống | Nên dùng |
|---|---|
| State 1 component | `useState` / `useReducer` |
| Chia sẻ giữa cha-con gần | Lifting state up |
| Chia sẻ theme/auth (ít thay đổi) | Context API |
| Server state (API data) | React Query / SWR |
| Global state phức tạp | Zustand (nhỏ gọn) hoặc Redux (team lớn) |

---

# 8. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Prop drilling là gì? Cách giải quyết? | Truyền props qua nhiều tầng component trung gian không cần. Giải quyết: Component composition, Context API, state management library |
| Context API có thay thế Redux không? | Không hoàn toàn. Context = cơ chế truyền dữ liệu, re-render tất cả consumer. Redux = quản lý state với selector (chỉ re-render component cần), middleware, devtools |
| Khi nào dùng Redux vs Zustand? | Redux: app lớn, team lớn, cần middleware phức tạp, async logic (RTK Query). Zustand: app vừa, ít boilerplate, đơn giản hơn |
| useReducer khác Redux thế nào? | useReducer: local state, không có store global, không middleware. Redux: global store, middleware (thunk, saga), devtools, time travel |
| Atomic state là gì? | Mỗi atom là 1 đơn vị state nhỏ nhất, component chỉ subscribe atom cần → chỉ re-render khi atom đó thay đổi. Jotai, Recoil dùng pattern này |
| Server state khác client state thế nào? | Server state: dữ liệu từ API, cần cache/refetch/invalidate. Client state: dữ liệu local (UI state). Dùng React Query/SWR cho server state |
