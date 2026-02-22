# Performance Optimization

> Tài liệu ôn tập phỏng vấn — Tối ưu hiệu suất React: React.memo, useMemo, useCallback, code splitting, lazy loading, virtualization, Profiler, khi nào KHÔNG nên optimize.

---

## Mục lục

1. [Nguyên tắc tối ưu](#1-nguyên-tắc-tối-ưu)
2. [Ngăn re-render không cần thiết](#2-ngăn-re-render-không-cần-thiết)
3. [Code Splitting & Lazy Loading](#3-code-splitting--lazy-loading)
4. [Virtualization — Render danh sách lớn](#4-virtualization--render-danh-sách-lớn)
5. [Debounce & Throttle](#5-debounce--throttle)
6. [Image Optimization](#6-image-optimization)
7. [React Profiler — Đo hiệu suất](#7-react-profiler--đo-hiệu-suất)
8. [Câu hỏi phỏng vấn thường gặp](#8-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Nguyên tắc tối ưu

> **"Premature optimization is the root of all evil"** — Donald Knuth. Tối ưu chỉ khi **đo được** có vấn đề. Không đoán, phải đo.

```
Quy trình tối ưu đúng cách:

1. Viết code ĐÚNG trước
2. Đo hiệu suất (React DevTools Profiler, Chrome Performance)
3. Xác định BOTTLENECK (chỗ chậm nhất)
4. Tối ưu chỗ đó
5. Đo lại → xác nhận cải thiện
```

---

# 2. Ngăn re-render không cần thiết

## React.memo — Component con

```jsx
// ❌ Child render lại mỗi khi Parent render (dù props không đổi)
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveChild data={staticData} />  {/* Render lại vô ích! */}
    </div>
  );
}

// ✅ React.memo — skip re-render khi props giống
const ExpensiveChild = React.memo(function ExpensiveChild({ data }) {
  // Chỉ render khi data thay đổi (shallow comparison)
  return <HeavyVisualization data={data} />;
});
```

## useMemo + useCallback — Ổn định props

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState('all');

  // ❌ Tạo object/array mới mỗi render → memo con VÔ ÍCH
  const config = { theme: 'dark', lang: 'vi' };         // Mới mỗi render
  const handleClick = () => console.log('clicked');       // Mới mỗi render

  // ✅ Ổn định tham chiếu
  const config = useMemo(() => ({ theme: 'dark', lang: 'vi' }), []);
  const handleClick = useCallback(() => console.log('clicked'), []);

  return <MemoChild config={config} onClick={handleClick} />;
}
```

## Tóm tắt bộ ba chống re-render

```
React.memo   → Bọc component con, skip render khi props giống
useMemo      → Ổn định giá trị (object, array, kết quả tính toán)
useCallback  → Ổn định hàm (callback truyền xuống con)

Quy tắc: useMemo/useCallback CHỈ có ý nghĩa khi kết hợp React.memo
         (hoặc khi giá trị là dependency của hook khác)
```

---

# 3. Code Splitting & Lazy Loading

```jsx
// Trước: TẤT CẢ code tải 1 lần → bundle lớn → load chậm
import Dashboard from './pages/Dashboard';  // 200KB
import Analytics from './pages/Analytics';  // 300KB
import Settings from './pages/Settings';    // 100KB
// → Bundle: 600KB tải ngay dù user chỉ vào trang chủ

// Sau: Tải KHI CẦN → bundle nhỏ hơn, load nhanh hơn
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Settings = React.lazy(() => import('./pages/Settings'));
// → Bundle chính nhỏ. Khi vào /dashboard → tải chunk Dashboard

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

---

# 4. Virtualization — Render danh sách lớn

## Vấn đề

```
10.000 sản phẩm → 10.000 DOM nodes → trình duyệt chậm, lag
Nhưng user CHỈ THẤY 20 sản phẩm trên màn hình tại 1 thời điểm
→ Tại sao phải render 10.000?
```

## Giải pháp: Chỉ render phần nhìn thấy

```jsx
import { FixedSizeList } from 'react-window';

function ProductList({ products }) {
  return (
    <FixedSizeList
      height={600}          // Chiều cao vùng nhìn thấy
      itemCount={products.length}  // Tổng số item
      itemSize={80}          // Chiều cao mỗi item
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ProductCard product={products[index]} />
        </div>
      )}
    </FixedSizeList>
  );
  // Chỉ render ~10 item trên màn hình, scroll → render item mới, huỷ item cũ
}
```

| Thư viện | Đặc điểm |
|---|---|
| **react-window** | Nhẹ (~6KB), đủ dùng cho hầu hết trường hợp |
| **react-virtuoso** | API dễ dùng hơn, hỗ trợ dynamic height |
| **@tanstack/react-virtual** | Headless, linh hoạt, framework-agnostic |

---

# 5. Debounce & Throttle

```jsx
// Debounce: Chỉ thực thi sau khi user NGỪNG gõ một khoảng thời gian
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);  // Chờ 300ms sau keystroke cuối

  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery);  // Gọi API 1 lần thay vì mỗi keystroke
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}

// Throttle: Thực thi tối đa 1 lần mỗi X ms
// Dùng cho: scroll handler, resize handler, mouse move
```

---

# 6. Image Optimization

| Kỹ thuật | Giải thích |
|---|---|
| **Lazy loading** | `<img loading="lazy" />` — chỉ tải ảnh khi gần vùng nhìn thấy |
| **Responsive images** | `srcSet` — trình duyệt chọn ảnh phù hợp kích thước màn hình |
| **Format hiện đại** | WebP, AVIF nhẹ hơn JPEG/PNG 30-50% |
| **Placeholder** | Hiện ảnh mờ/skeleton → thay bằng ảnh thật khi tải xong |

---

# 7. React Profiler — Đo hiệu suất

```
React DevTools → Profiler tab:
1. Bấm Record
2. Tương tác với app
3. Bấm Stop
4. Xem:
   - Component nào render
   - Render bao lâu
   - Tại sao render (props changed? state changed? parent rendered?)
```

```jsx
// Profiler component (code)
<Profiler id="ProductList" onRender={(id, phase, duration) => {
  console.log(`${id} ${phase}: ${duration}ms`);
  // phase: "mount" hoặc "update"
}}>
  <ProductList />
</Profiler>
```

---

# 8. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Khi nào dùng React.memo? | Component render nặng + props ít thay đổi + parent render thường. KHÔNG dùng mặc định cho mọi component |
| useMemo và useCallback khác gì? | useMemo ghi nhớ giá trị, useCallback ghi nhớ hàm. Cả hai tránh tạo lại khi deps không đổi. Chỉ có ý nghĩa với React.memo hoặc làm deps cho hook khác |
| Code splitting là gì? | Chia bundle thành chunks nhỏ, tải khi cần. React.lazy + import() + Suspense. Thường split theo route |
| Virtualization là gì? | Chỉ render items trong vùng nhìn thấy. 10.000 items → render 20 items trên màn hình. Dùng react-window hoặc react-virtuoso |
| Khi nào KHÔNG nên optimize? | Khi chưa đo được vấn đề, component đơn giản, render nhanh. Premature optimization thêm phức tạp vô ích |
