# React Router & Navigation

> Tài liệu ôn tập phỏng vấn — React Router v6: cấu hình routes, nested routes, dynamic routes, protected routes, navigation, outlet, layout pattern.

---

## Mục lục

1. [React Router v6 — Cơ bản](#1-react-router-v6--cơ-bản)
2. [Cấu hình Routes](#2-cấu-hình-routes)
3. [Nested Routes & Outlet](#3-nested-routes--outlet)
4. [Dynamic Routes — Tham số URL](#4-dynamic-routes--tham-số-url)
5. [Navigation — Điều hướng](#5-navigation--điều-hướng)
6. [Protected Routes — Bảo vệ trang](#6-protected-routes--bảo-vệ-trang)
7. [Layout Pattern](#7-layout-pattern)
8. [Câu hỏi phỏng vấn thường gặp](#8-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. React Router v6 — Cơ bản

## Client-side Routing là gì?

Trong SPA (Single Page Application), trình duyệt **không tải lại trang** khi chuyển URL. JavaScript **thay đổi nội dung** hiển thị dựa trên URL — đây là client-side routing.

```
Không có Router:
  /          → Tải trang index.html
  /about     → Tải trang about.html      ← Server trả file mới, tải lại toàn trang
  /dashboard → Tải trang dashboard.html

Có Router (SPA):
  /          → Hiện <Home />
  /about     → Hiện <About />             ← JavaScript thay component, KHÔNG tải lại trang
  /dashboard → Hiện <Dashboard />
```

## Cài đặt

```bash
npm install react-router-dom
```

---

# 2. Cấu hình Routes

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="*" element={<NotFound />} />   {/* 404 — mọi URL không khớp */}
      </Routes>
    </BrowserRouter>
  );
}
```

## Các loại Router

| Router | Dùng cho | URL ví dụ |
|---|---|---|
| **BrowserRouter** | Web app thông thường | `/about`, `/products/123` |
| **HashRouter** | Khi server không hỗ trợ SPA routing | `/#/about`, `/#/products/123` |
| **MemoryRouter** | Testing, React Native | Không hiện trong URL |

---

# 3. Nested Routes & Outlet

## Nested Routes

```jsx
<Routes>
  <Route path="/dashboard" element={<DashboardLayout />}>
    {/* Route con — hiển thị bên trong DashboardLayout */}
    <Route index element={<DashboardHome />} />           {/* /dashboard */}
    <Route path="profile" element={<Profile />} />         {/* /dashboard/profile */}
    <Route path="settings" element={<Settings />} />       {/* /dashboard/settings */}
  </Route>
</Routes>
```

## Outlet — Nơi hiển thị route con

```jsx
function DashboardLayout() {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>
        <Outlet />    {/* ← Route con hiển thị TẠI ĐÂY */}
      </main>
    </div>
  );
}

// Khi URL = /dashboard          → Outlet hiện <DashboardHome />
// Khi URL = /dashboard/profile  → Outlet hiện <Profile />
// Khi URL = /dashboard/settings → Outlet hiện <Settings />
```

---

# 4. Dynamic Routes — Tham số URL

```jsx
// Định nghĩa route với tham số :id
<Route path="/products/:id" element={<ProductDetail />} />

// Lấy tham số trong component
import { useParams } from 'react-router-dom';

function ProductDetail() {
  const { id } = useParams();  // URL: /products/42 → id = "42"
  // Fetch product theo id...
}
```

## Query Parameters

```jsx
import { useSearchParams } from 'react-router-dom';

function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = searchParams.get('page') || '1';      // ?page=2 → "2"
  const sort = searchParams.get('sort') || 'newest';  // ?sort=price → "price"

  const nextPage = () => {
    setSearchParams({ page: Number(page) + 1, sort });
  };

  return (
    <div>
      <p>Trang: {page}, Sắp xếp: {sort}</p>
      <button onClick={nextPage}>Trang tiếp</button>
    </div>
  );
}
```

---

# 5. Navigation — Điều hướng

```jsx
import { Link, NavLink, useNavigate } from 'react-router-dom';

// 1. Link — thay thế <a> tag (không tải lại trang)
<Link to="/about">Giới thiệu</Link>

// 2. NavLink — Link + tự thêm class "active" khi URL khớp
<NavLink
  to="/dashboard"
  className={({ isActive }) => isActive ? 'nav-active' : ''}
>
  Dashboard
</NavLink>

// 3. useNavigate — điều hướng bằng code (sau khi submit form, login...)
function LoginForm() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    await login();
    navigate('/dashboard');           // Chuyển trang
    navigate('/dashboard', { replace: true });  // Thay thế history (không back được)
    navigate(-1);                     // Quay lại trang trước
  };
}
```

---

# 6. Protected Routes — Bảo vệ trang

```jsx
// Component bảo vệ — kiểm tra đăng nhập
function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;  // Chưa đăng nhập → về login
  }

  return children;
}

// Sử dụng
<Routes>
  <Route path="/login" element={<Login />} />

  {/* Bọc route cần bảo vệ */}
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  }>
    <Route index element={<DashboardHome />} />
    <Route path="settings" element={<Settings />} />
  </Route>
</Routes>

// Hoặc dùng layout route
function ProtectedLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

<Routes>
  <Route element={<ProtectedLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
  </Route>
</Routes>
```

---

# 7. Layout Pattern

```jsx
// Layout chung cho toàn app
function RootLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />    {/* Nội dung thay đổi theo route */}
      </main>
      <Footer />
    </>
  );
}

// Layout cho phần Admin
function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}

// Gom lại
<Routes>
  <Route element={<RootLayout />}>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />

    <Route element={<ProtectedLayout />}>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
      </Route>
    </Route>
  </Route>
</Routes>
```

---

# 8. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Client-side routing là gì? | Thay đổi URL và nội dung hiển thị bằng JavaScript, không tải lại trang. SPA chỉ tải 1 file HTML → JS điều khiển hiển thị |
| Link khác NavLink? | Link: điều hướng cơ bản. NavLink: tự thêm class/style khi route đang active — dùng cho navigation menu |
| Outlet dùng để làm gì? | Vị trí hiển thị component của route con bên trong route cha. Giống "lỗ" để con hiện vào |
| Protected Route triển khai thế nào? | Component wrapper kiểm tra auth state. Đã đăng nhập → render children/Outlet. Chưa → Navigate to /login |
| useParams vs useSearchParams? | useParams: đọc path params (`/products/:id`). useSearchParams: đọc/ghi query string (`?page=2&sort=price`) |
