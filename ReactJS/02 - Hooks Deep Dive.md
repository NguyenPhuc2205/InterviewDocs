# Hooks Deep Dive

> Tài liệu ôn tập phỏng vấn — Toàn bộ React Hooks: useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, useLayoutEffect, custom hooks, quy tắc hooks, stale closure.

---

## Mục lục

1. [Hooks là gì?](#1-hooks-là-gì)
2. [useState — Quản lý state](#2-usestate--quản-lý-state)
3. [useEffect — Side effects](#3-useeffect--side-effects)
4. [useRef — Tham chiếu không gây re-render](#4-useref--tham-chiếu-không-gây-re-render)
5. [useMemo — Ghi nhớ giá trị tính toán](#5-usememo--ghi-nhớ-giá-trị-tính-toán)
6. [useCallback — Ghi nhớ hàm](#6-usecallback--ghi-nhớ-hàm)
7. [useReducer — State phức tạp](#7-usereducer--state-phức-tạp)
8. [useContext — Chia sẻ dữ liệu không cần props](#8-usecontext--chia-sẻ-dữ-liệu-không-cần-props)
9. [useLayoutEffect — Chạy đồng bộ sau render](#9-uselayouteffect--chạy-đồng-bộ-sau-render)
10. [Custom Hooks — Tái sử dụng logic](#10-custom-hooks--tái-sử-dụng-logic)
11. [Rules of Hooks — Quy tắc bắt buộc](#11-rules-of-hooks--quy-tắc-bắt-buộc)
12. [Stale Closure — Bẫy phổ biến](#12-stale-closure--bẫy-phổ-biến)
13. [Câu hỏi phỏng vấn thường gặp](#13-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Hooks là gì?

Hooks là các **hàm đặc biệt** cho phép function component sử dụng state và các tính năng khác của React (trước đây chỉ class component làm được).

```
Trước Hooks (React < 16.8):
  Function component = "stateless" → chỉ nhận props, trả về JSX
  Muốn state/lifecycle → phải dùng Class component

Sau Hooks (React 16.8+):
  Function component = có thể có state, side effects, refs, context...
  Class component = legacy, không cần nữa
```

---

# 2. useState — Quản lý state

## Cú pháp

```jsx
const [state, setState] = useState(initialValue);
//      ↑       ↑                    ↑
//  giá trị  hàm cập nhật     giá trị ban đầu
```

## Các cách cập nhật state

```jsx
function Example() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState({ name: 'Hùng', age: 25 });
  const [items, setItems] = useState(['a', 'b', 'c']);

  // 1. Gán giá trị trực tiếp
  setCount(5);

  // 2. Functional update — nhận giá trị trước, trả về giá trị mới
  setCount(prev => prev + 1);  // Luôn dùng khi phụ thuộc giá trị cũ!

  // 3. Cập nhật object — PHẢI spread, không được mutate
  setUser(prev => ({ ...prev, age: 26 }));  // ✅ Tạo object mới
  // user.age = 26; setUser(user);           // ❌ Mutate trực tiếp → không re-render

  // 4. Cập nhật array — PHẢI tạo array mới
  setItems(prev => [...prev, 'd']);          // Thêm phần tử
  setItems(prev => prev.filter(i => i !== 'b'));  // Xoá phần tử
  setItems(prev => prev.map(i => i === 'a' ? 'A' : i));  // Sửa phần tử
}
```

## Lazy initialization — Khởi tạo nặng

```jsx
// ❌ Tính toán mỗi lần render (dù chỉ dùng giá trị ban đầu)
const [data, setData] = useState(expensiveCalculation());

// ✅ Chỉ tính 1 lần (lần render đầu tiên)
const [data, setData] = useState(() => expensiveCalculation());
```

## Batching — Gom nhiều setState

```jsx
function handleClick() {
  setCount(c => c + 1);  // Không re-render ngay
  setName('Hùng');        // Không re-render ngay
  setAge(25);             // Không re-render ngay
  // → React gom lại → RE-RENDER 1 LẦN DUY NHẤT (React 18 automatic batching)
}
```

---

# 3. useEffect — Side effects

## Side effect là gì?

Side effect là bất kỳ thao tác nào **ngoài việc render UI**: gọi API, đăng ký sự kiện, thao tác DOM, setTimeout, ghi log...

## Cú pháp và dependency array

```jsx
useEffect(() => {
  // Logic side effect
  return () => {
    // Cleanup (tuỳ chọn) — chạy khi unmount hoặc trước khi effect chạy lại
  };
}, [dependencies]); // Mảng phụ thuộc
```

## Ba kiểu dependency array

```jsx
// 1. Không có dependency array → chạy SAU MỖI LẦN render
useEffect(() => {
  console.log('Chạy mỗi lần render');
});

// 2. Mảng rỗng [] → chạy 1 LẦN DUY NHẤT sau lần render đầu
useEffect(() => {
  console.log('Chỉ chạy 1 lần (componentDidMount)');
  return () => console.log('Cleanup khi unmount (componentWillUnmount)');
}, []);

// 3. Có dependencies → chạy khi dependencies thay đổi
useEffect(() => {
  console.log(`userId thay đổi: ${userId}`);
  fetchUser(userId);
}, [userId]);  // Chỉ chạy lại khi userId thay đổi
```

## Cleanup function — Tại sao cần?

```jsx
// Ví dụ: Đăng ký sự kiện → phải huỷ khi component unmount
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);  // ← Cleanup!
    // Nếu không cleanup → memory leak: event listener vẫn tồn tại dù component đã biến mất
  };
}, []);

// Ví dụ: Subscription
useEffect(() => {
  const subscription = dataSource.subscribe(data => setData(data));
  return () => subscription.unsubscribe();  // ← Cleanup!
}, []);
```

## Thứ tự chạy

```
1. Component render (tạo Virtual DOM)
2. React cập nhật DOM thật
3. Trình duyệt vẽ lên màn hình (paint)
4. useEffect chạy ← SAU khi paint (không chặn UI)
```

---

# 4. useRef — Tham chiếu không gây re-render

## Hai công dụng chính

### 1. Truy cập DOM element trực tiếp

```jsx
function AutoFocusInput() {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current.focus();  // Truy cập DOM thật
  }, []);

  return <input ref={inputRef} placeholder="Tự động focus" />;
}
```

### 2. Lưu giá trị không gây re-render

```jsx
function Timer() {
  const [count, setCount] = useState(0);
  const intervalRef = useRef(null);    // Thay đổi .current KHÔNG gây re-render
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;  // Đếm số lần render — không cần re-render
  });

  const start = () => {
    intervalRef.current = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
  };

  const stop = () => {
    clearInterval(intervalRef.current);  // Dùng ref để truy cập intervalId
  };

  return (
    <div>
      <p>Đếm: {count} (Render lần thứ {renderCountRef.current})</p>
      <button onClick={start}>Bắt đầu</button>
      <button onClick={stop}>Dừng</button>
    </div>
  );
}
```

## useRef vs useState

| | useRef | useState |
|---|---|---|
| **Thay đổi giá trị** | `ref.current = newValue` | `setState(newValue)` |
| **Gây re-render?** | **KHÔNG** | **CÓ** |
| **Dùng cho** | DOM refs, giá trị giữa các render (intervalId, previous value) | Dữ liệu hiển thị trên UI |

---

# 5. useMemo — Ghi nhớ giá trị tính toán

## Vấn đề

```jsx
function ProductList({ products, filter }) {
  // ❌ filteredProducts tính lại MỖI LẦN render (dù products/filter không đổi)
  const filteredProducts = products.filter(p => p.category === filter);
  // Nếu products có 100.000 phần tử → chậm!
}
```

## Giải pháp: useMemo

```jsx
function ProductList({ products, filter }) {
  // ✅ Chỉ tính lại khi products hoặc filter thay đổi
  const filteredProducts = useMemo(() => {
    return products.filter(p => p.category === filter);
  }, [products, filter]);

  return filteredProducts.map(p => <ProductCard key={p.id} product={p} />);
}
```

## Khi nào dùng / không dùng

| Dùng | Không dùng |
|---|---|
| Tính toán nặng (lọc/sắp xếp danh sách lớn) | Phép tính đơn giản (`a + b`) |
| Giá trị dùng làm dependency cho hook khác | Mọi biến — useMemo cũng có chi phí |
| Giá trị truyền xuống component con (tránh re-render con) | Khi chưa chắc có vấn đề hiệu suất |

---

# 6. useCallback — Ghi nhớ hàm

## Vấn đề

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ handleClick TẠO MỚI mỗi lần Parent render
  const handleClick = () => console.log('clicked');

  return <Child onClick={handleClick} />;
  // Child nhận props mới (hàm mới) → RE-RENDER dù logic không đổi
}
```

## Giải pháp: useCallback

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // ✅ Giữ nguyên tham chiếu hàm giữa các lần render
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);  // Chỉ tạo hàm mới khi dependencies thay đổi

  return <Child onClick={handleClick} />;
  // Child nhận CÙNG tham chiếu hàm → KHÔNG re-render (nếu dùng React.memo)
}

const Child = React.memo(({ onClick }) => {
  console.log('Child render');
  return <button onClick={onClick}>Bấm</button>;
});
```

## useMemo vs useCallback

```jsx
// useCallback(fn, deps)  ===  useMemo(() => fn, deps)
// useCallback ghi nhớ HÀM
// useMemo ghi nhớ GIÁ TRỊ (kết quả của hàm)

const memoizedValue = useMemo(() => computeExpensive(a, b), [a, b]);
const memoizedFn = useCallback(() => doSomething(a, b), [a, b]);
```

---

# 7. useReducer — State phức tạp

## Khi nào dùng useReducer thay useState?

- State có **nhiều trường** liên quan với nhau
- Logic cập nhật **phức tạp** (nhiều action khác nhau)
- Cần **tách biệt** logic ra khỏi component

## Cú pháp

```jsx
const [state, dispatch] = useReducer(reducer, initialState);

// reducer = hàm nhận (state hiện tại, action) → trả về state mới
function reducer(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'RESET':
      return { ...state, count: 0 };
    case 'SET_NAME':
      return { ...state, name: action.payload };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
```

## Ví dụ thực tế — Form phức tạp

```jsx
const initialState = {
  name: '',
  email: '',
  isSubmitting: false,
  error: null,
};

function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, error: null };
    case 'SUBMIT_SUCCESS':
      return { ...initialState };  // Reset form
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, error: action.error };
    default:
      return state;
  }
}

function RegistrationForm() {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const handleSubmit = async () => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      await api.register(state);
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (err) {
      dispatch({ type: 'SUBMIT_ERROR', error: err.message });
    }
  };

  return (
    <form>
      <input
        value={state.name}
        onChange={e => dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })}
      />
      <button onClick={handleSubmit} disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Đang gửi...' : 'Đăng ký'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

## useState vs useReducer

| | useState | useReducer |
|---|---|---|
| **State đơn giản** | ✅ Tốt | Quá phức tạp |
| **State phức tạp** | Nhiều useState lộn xộn | ✅ Gom logic vào reducer |
| **Logic cập nhật** | Inline trong component | Tách biệt, dễ test |
| **Quen thuộc với Redux** | — | ✅ Cùng pattern |

---

# 8. useContext — Chia sẻ dữ liệu không cần props

## Vấn đề: Prop Drilling

```
App (theme = "dark")
  └── Header (props: theme)
        └── NavBar (props: theme)     ← Không dùng, chỉ truyền tiếp
              └── ThemeButton (cần theme)   ← Chỉ đây cần dùng!

→ Phải truyền theme qua 3 cấp dù chỉ 1 component cần
→ "Prop drilling" — khoan props xuyên nhiều tầng
```

## Giải pháp: useContext

```jsx
// 1. Tạo Context
const ThemeContext = createContext('light');  // Giá trị mặc định

// 2. Cung cấp giá trị (Provider)
function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Header />    {/* Không cần truyền theme qua props */}
    </ThemeContext.Provider>
  );
}

// 3. Dùng giá trị (Consumer)
function ThemeButton() {
  const { theme, setTheme } = useContext(ThemeContext);  // Lấy trực tiếp!
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Chế độ: {theme}
    </button>
  );
}
```

## Nhược điểm của Context

| Nhược điểm | Giải thích |
|---|---|
| **Re-render tất cả consumers** | Khi value thay đổi → MỌI component dùng useContext đều re-render, kể cả không dùng phần thay đổi |
| **Không phải state management** | Context chỉ là cơ chế **truyền dữ liệu**, không tối ưu cho dữ liệu thay đổi liên tục |
| **Debug khó** | Nhiều Provider lồng nhau → khó theo dõi giá trị đến từ đâu |

---

# 9. useLayoutEffect — Chạy đồng bộ sau render

## useLayoutEffect vs useEffect

```
Render → DOM cập nhật → useLayoutEffect → Paint → useEffect
                              ↑                       ↑
                    Chạy TRƯỚC paint          Chạy SAU paint
                    (chặn paint)             (không chặn)
```

| | useEffect | useLayoutEffect |
|---|---|---|
| **Chạy khi nào** | **Sau** khi trình duyệt paint | **Trước** khi trình duyệt paint |
| **Chặn paint?** | Không | **Có** — paint bị hoãn cho đến khi xong |
| **Dùng cho** | API calls, subscriptions, hầu hết side effects | Đo kích thước DOM, ngăn nhấp nháy UI |

```jsx
// Ví dụ: Tooltip cần đo kích thước element trước khi hiện
function Tooltip({ children, content }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    // Đo kích thước DOM TRƯỚC khi paint → tránh nhấp nháy
    const rect = ref.current.getBoundingClientRect();
    setPosition({ top: rect.top - 30, left: rect.left });
  }, []);

  return (
    <>
      <span ref={ref}>{children}</span>
      <div style={{ position: 'absolute', ...position }}>{content}</div>
    </>
  );
}
```

---

# 10. Custom Hooks — Tái sử dụng logic

## Custom hook là gì?

Custom hook là **hàm JavaScript bắt đầu bằng `use`**, dùng các hooks khác bên trong. Mục đích: **tái sử dụng logic** giữa nhiều component.

```jsx
// Custom hook: useFetch
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(data => { setData(data); setLoading(false); })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err); setLoading(false);
        }
      });

    return () => controller.abort();  // Cleanup: huỷ request
  }, [url]);

  return { data, loading, error };
}

// Dùng trong bất kỳ component nào
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <div>{user.name}</div>;
}
```

## Các custom hooks phổ biến

```jsx
// useLocalStorage — đồng bộ state với localStorage
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

// useDebounce — trì hoãn giá trị
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// useToggle — bật/tắt
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
}
```

---

# 11. Rules of Hooks — Quy tắc bắt buộc

## Quy tắc 1: Chỉ gọi hooks ở CẤP ĐỘ CAO NHẤT

```jsx
// ❌ Trong if/else
if (isLoggedIn) {
  useEffect(() => { ... });  // Sai!
}

// ❌ Trong vòng lặp
for (let i = 0; i < 5; i++) {
  useState(0);  // Sai!
}

// ❌ Sau return sớm
if (!data) return null;
useEffect(() => { ... });  // Sai! Nằm sau return

// ✅ Luôn gọi ở cấp cao nhất
useEffect(() => {
  if (isLoggedIn) {  // Logic điều kiện BÊN TRONG hook
    fetchProfile();
  }
}, [isLoggedIn]);
```

**Tại sao?** React dựa vào **thứ tự gọi hooks** để nhận diện hook nào là hook nào. Nếu điều kiện thay đổi → thứ tự gọi thay đổi → React bị lẫn lộn state.

## Quy tắc 2: Chỉ gọi hooks trong Function Component hoặc Custom Hook

```jsx
// ❌ Trong hàm JS thường
function helper() {
  const [count, setCount] = useState(0);  // Sai!
}

// ✅ Trong function component
function MyComponent() {
  const [count, setCount] = useState(0);  // Đúng!
}

// ✅ Trong custom hook (tên bắt đầu bằng "use")
function useCounter() {
  const [count, setCount] = useState(0);  // Đúng!
  return { count, setCount };
}
```

---

# 12. Stale Closure — Bẫy phổ biến

## Stale closure là gì?

Khi callback bên trong useEffect/setTimeout/setInterval **bắt giữ** (close over) giá trị state **cũ** — và không lấy được giá trị mới nhất.

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(count);    // ← Luôn in 0! (stale closure)
      setCount(count + 1);   // ← Luôn set 0 + 1 = 1!
    }, 1000);
    return () => clearInterval(interval);
  }, []);  // dependency array rỗng → callback bắt giữ count = 0 mãi mãi

  return <p>{count}</p>;  // Hiển thị: 1 (không tăng tiếp)
}
```

## Cách sửa

```jsx
// Cách 1: Functional update (phổ biến nhất)
setCount(prev => prev + 1);  // Không phụ thuộc vào closure

// Cách 2: Thêm dependency (nếu cần đọc giá trị)
useEffect(() => {
  const interval = setInterval(() => {
    console.log(count);    // Lấy giá trị mới mỗi khi count thay đổi
    setCount(c => c + 1);
  }, 1000);
  return () => clearInterval(interval);
}, [count]);  // ← Chạy lại khi count thay đổi

// Cách 3: Dùng useRef để luôn có giá trị mới nhất
const countRef = useRef(count);
countRef.current = count;  // Cập nhật mỗi render

useEffect(() => {
  const interval = setInterval(() => {
    console.log(countRef.current);  // Luôn đúng!
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

---

# 13. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Hooks là gì? Tại sao cần? | Hàm đặc biệt cho phép function component dùng state, side effects, refs. Trước 16.8 chỉ class component làm được. Hooks giúp tái sử dụng logic, code ngắn gọn hơn |
| useEffect chạy khi nào? | Sau render + paint. Dependency `[]` = chạy 1 lần, `[a, b]` = chạy khi a/b đổi, không có = mỗi render |
| useEffect vs useLayoutEffect? | useEffect chạy sau paint (không chặn UI). useLayoutEffect chạy trước paint (chặn UI) — dùng khi cần đo DOM, tránh nhấp nháy |
| useMemo vs useCallback? | useMemo ghi nhớ **giá trị** (kết quả tính toán). useCallback ghi nhớ **hàm** (tham chiếu hàm). Cả hai đều tránh tính/tạo lại khi deps không đổi |
| useState vs useReducer? | useState: state đơn giản. useReducer: state phức tạp, nhiều action, muốn tách logic cập nhật ra khỏi component |
| Stale closure là gì? | Callback bắt giữ giá trị state cũ (lúc closure được tạo). Sửa bằng: functional update (`prev => prev + 1`), thêm deps, hoặc useRef |
| Custom hook là gì? | Hàm bắt đầu bằng `use`, dùng hooks bên trong, tái sử dụng logic giữa nhiều component. Ví dụ: useFetch, useDebounce, useToggle |
| Rules of hooks? | (1) Chỉ gọi ở cấp cao nhất (không trong if/loop), (2) Chỉ gọi trong function component hoặc custom hook |
| Cleanup trong useEffect để làm gì? | Dọn dẹp trước khi component unmount hoặc trước khi effect chạy lại: huỷ subscription, clearInterval, abort fetch request. Không cleanup → memory leak |
| Context có thay thế Redux không? | Không hoàn toàn. Context là cơ chế truyền dữ liệu, không tối ưu cho dữ liệu thay đổi thường xuyên (re-render mọi consumer). Redux/Zustand quản lý state phức tạp với performance tốt hơn |
