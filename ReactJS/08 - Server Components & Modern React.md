# Server Components & Modern React

> Tài liệu ôn tập phỏng vấn — React Server Components (RSC), Server vs Client Components, use() hook, Next.js App Router, Streaming SSR, Hydration.

---

## Mục lục

1. [Các mô hình rendering](#1-các-mô-hình-rendering)
2. [React Server Components (RSC)](#2-react-server-components-rsc)
3. [Server vs Client Components](#3-server-vs-client-components)
4. [Next.js App Router — RSC trong thực tế](#4-nextjs-app-router--rsc-trong-thực-tế)
5. [Hydration — "Tưới nước" cho HTML tĩnh](#5-hydration--tưới-nước-cho-html-tĩnh)
6. [Streaming SSR & Suspense](#6-streaming-ssr--suspense)
7. [Câu hỏi phỏng vấn thường gặp](#7-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Các mô hình rendering

| Mô hình | Máy render | Thời điểm | Ưu điểm | Nhược điểm |
|---|---|---|---|---|
| **CSR** (Client-Side) | Trình duyệt | Sau khi tải JS | Tương tác nhanh, SPA | SEO kém, load đầu chậm |
| **SSR** (Server-Side) | Server | Mỗi request | SEO tốt, load đầu nhanh | Server chịu tải, TTFB cao |
| **SSG** (Static Generation) | Server | Lúc build | Cực nhanh, CDN cache | Không dynamic, rebuild cần thời gian |
| **ISR** (Incremental Static) | Server | Build + revalidate | Nhanh + cập nhật được | Phức tạp hơn SSG |
| **RSC** (Server Components) | Server | Mỗi request (streaming) | Bundle nhỏ, truy cập DB trực tiếp | Mới, cần framework (Next.js) |

```
CSR: Server trả HTML trống → JS tải → JS render UI
     [-------------- Trắng/Loading ---------------][---- UI hiện ----]

SSR: Server render HTML hoàn chỉnh → gửi về → Hydration (gắn JS)
     [-- HTML hiện ngay --][---- Hydration ----][---- Tương tác được ----]

RSC: Server render component → stream HTML dần → không cần JS cho RSC
     [-- HTML stream dần --][-- Chỉ hydrate Client Components --]
```

---

# 2. React Server Components (RSC)

## RSC là gì?

Server Components là component **chạy trên server**, kết quả render (HTML/payload) được gửi về client. Code JavaScript của Server Component **không bao giờ gửi về trình duyệt** → bundle nhỏ hơn.

## Tại sao cần RSC?

```
Trước RSC (CSR):
  1. Client tải app.js (500KB) ← bao gồm code fetch data
  2. Client chạy JS → fetch('/api/products') → chờ response
  3. Client render UI
  Vấn đề: Client chờ 2 lần (tải JS + fetch data), bundle lớn

Với RSC:
  1. Server chạy component → fetch DB trực tiếp (không qua API)
  2. Server gửi HTML kết quả (không gửi code JS)
  3. Client nhận HTML → hiện ngay
  Lợi ích: Không chờ tải JS, bundle nhỏ, truy cập DB/file system trực tiếp
```

---

# 3. Server vs Client Components

| | Server Component | Client Component |
|---|---|---|
| **Chạy ở đâu** | Server | Trình duyệt |
| **Đánh dấu** | Mặc định (không cần gì) | `'use client'` ở đầu file |
| **JS gửi về client** | **Không** | Có |
| **useState, useEffect** | ❌ Không dùng được | ✅ Dùng được |
| **Event handler (onClick)** | ❌ Không | ✅ Có |
| **fetch API/DB trực tiếp** | ✅ Có | ❌ Qua API |
| **Dùng import nặng (markdown, date-fns)** | ✅ Không ảnh hưởng bundle | ⚠️ Tăng bundle |
| **Phù hợp** | Hiển thị data, layout, tĩnh | Tương tác, form, animation |

```jsx
// Server Component (mặc định trong Next.js App Router)
// Không có 'use client' → chạy trên server
async function ProductList() {
  const products = await db.product.findMany();  // Truy cập DB trực tiếp!
  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>
          {p.name} — {p.price.toLocaleString()}đ
          <AddToCartButton productId={p.id} />  {/* Client Component */}
        </li>
      ))}
    </ul>
  );
}

// Client Component — cần tương tác
'use client';
function AddToCartButton({ productId }) {
  const [added, setAdded] = useState(false);
  return (
    <button onClick={() => { addToCart(productId); setAdded(true); }}>
      {added ? '✓ Đã thêm' : 'Thêm vào giỏ'}
    </button>
  );
}
```

## Quy tắc kết hợp

```
Server Component CÓ THỂ import Client Component     ✅
Client Component KHÔNG THỂ import Server Component   ❌
Client Component CÓ THỂ nhận Server Component qua children/props  ✅

// ✅ Server Component render Client Component
async function Page() {
  const data = await fetchData();
  return <ClientChart data={data} />;
}

// ✅ Client Component nhận Server Component qua children
'use client';
function Modal({ children }) {
  const [open, setOpen] = useState(false);
  return open ? <div className="modal">{children}</div> : null;
}

// Ở server:
<Modal>
  <ServerContent />   {/* Server Component truyền qua children */}
</Modal>
```

---

# 4. Next.js App Router — RSC trong thực tế

## Cấu trúc thư mục

```
app/
├── layout.tsx          ← Root layout (Server Component)
├── page.tsx            ← Trang chủ /
├── loading.tsx         ← Loading UI (Suspense fallback)
├── error.tsx           ← Error UI (Error Boundary)
├── products/
│   ├── page.tsx        ← /products
│   ├── [id]/
│   │   └── page.tsx    ← /products/:id
│   └── loading.tsx
└── dashboard/
    ├── layout.tsx      ← Layout riêng cho /dashboard/*
    └── page.tsx
```

## Data Fetching trong Server Component

```jsx
// app/products/page.tsx — Server Component
async function ProductsPage() {
  const products = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 },  // ISR: cache 1 giờ
  }).then(r => r.json());

  return <ProductList products={products} />;
}
```

---

# 5. Hydration — "Tưới nước" cho HTML tĩnh

## Hydration là gì?

Server gửi HTML tĩnh (không tương tác). Client nhận HTML → **gắn event handlers và state** → HTML trở nên tương tác được. Quá trình này gọi là **Hydration**.

```
1. Server render HTML:
   <button>Bấm (0)</button>              ← Chỉ là text, bấm không có gì xảy ra

2. Client tải JS + Hydration:
   React gắn onClick, useState vào button
   <button onClick={handleClick}>Bấm (0)</button>  ← Giờ bấm được!

3. Người dùng bấm:
   <button onClick={handleClick}>Bấm (1)</button>  ← Hoạt động bình thường
```

## Vấn đề Hydration

| Vấn đề | Giải thích |
|---|---|
| **Hydration mismatch** | HTML từ server khác với React render trên client → cảnh báo/lỗi |
| **Time to Interactive (TTI)** | HTML hiện nhưng chưa hydrate → bấm nút không phản hồi |
| **Bundle lớn** | Hydrate toàn trang → tải JS cho mọi component dù chưa cần tương tác |

---

# 6. Streaming SSR & Suspense

## Streaming SSR

```
SSR truyền thống:
  Server phải render XONG toàn bộ → mới gửi HTML
  [════════ Render toàn trang ════════][──── Gửi HTML ────]

Streaming SSR:
  Server render TỪNG PHẦN → gửi ngay khi xong
  [═══ Header ═══][──gửi──]
  [═══ Content ═══][──gửi──]
  [═══ Comments ═══][──gửi──]
  → Người dùng thấy nội dung SỚM hơn
```

```jsx
// Streaming với Suspense
async function BlogPost({ id }) {
  const post = await getPost(id);

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>

      {/* Comments tải lâu → stream sau */}
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments postId={id} />   {/* Server render riêng, stream khi xong */}
      </Suspense>
    </article>
  );
}
```

---

# 7. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| CSR vs SSR vs SSG? | CSR: client render, tương tác nhanh, SEO kém. SSR: server render mỗi request, SEO tốt. SSG: render lúc build, nhanh nhất |
| React Server Components là gì? | Component chạy trên server, JS không gửi về client → bundle nhỏ. Truy cập DB/filesystem trực tiếp. Kết hợp với Client Components cho tương tác |
| Server khác Client Component? | Server: không có state/effects, truy cập server trực tiếp, JS không gửi client. Client: có `'use client'`, có tương tác, JS gửi về client |
| Hydration là gì? | Server gửi HTML tĩnh → client gắn JS (events, state) → HTML trở nên tương tác. Vấn đề: TTI dài, hydration mismatch |
| Streaming SSR là gì? | Server gửi HTML từng phần khi render xong, không chờ toàn bộ. Dùng Suspense để đánh dấu phần nào có thể stream tách biệt |
| 'use client' có nghĩa gì? | Đánh dấu file là Client Component — chạy trên trình duyệt, có thể dùng useState, useEffect, event handlers. Mặc định (không đánh dấu) là Server Component |
