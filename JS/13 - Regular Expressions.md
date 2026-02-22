# 📘 JavaScript — Regular Expressions

> Regular Expressions (Regex) là công cụ **cực kỳ mạnh mẽ** cho string matching, validation, và text processing. Coding interview thường yêu cầu viết regex hoặc giải thích pattern phức tạp.

---

## Mục lục

1. [RegExp Basics — Literal vs Constructor](#1-regexp-basics--literal-vs-constructor)
2. [Character Classes, Quantifiers, Anchors](#2-character-classes-quantifiers-anchors)
3. [Groups — Capturing, Non-capturing, Named](#3-groups--capturing-non-capturing-named)
4. [Lookahead & Lookbehind Assertions](#4-lookahead--lookbehind-assertions)
5. [Flags — g, i, m, s, u, d, y](#5-flags--g-i-m-s-u-d-y)
6. [Methods — exec, test, match, matchAll, replace, split, search](#6-methods--exec-test-match-matchall-replace-split-search)
7. [Common Patterns — Email, URL, Phone, Password](#7-common-patterns--email-url-phone-password)
8. [Performance — ReDoS và cách tránh](#8-performance--redos-và-cách-tránh)
9. [ES2024-2025 Features mới](#9-es2024-2025-features-mới)
10. [Câu hỏi phỏng vấn](#10-câu-hỏi-phỏng-vấn)

---

# 1. RegExp Basics — Literal vs Constructor

## Hai cách tạo RegExp

```javascript
// 1. Literal — viết trực tiếp (compile lúc load)
const regex1 = /hello/gi;

// 2. Constructor — tạo từ string (compile lúc runtime)
const regex2 = new RegExp('hello', 'gi');

// Constructor hữu ích khi pattern là dynamic
const searchTerm = 'hello';
const regex3 = new RegExp(searchTerm, 'gi');

// ⚠️ Lưu ý: Constructor cần escape double
const literal = /\d+/;                    // Literal: \d
const constructor = new RegExp('\\d+');   // Constructor: \\d (escape \)
```

## Escape special characters

```javascript
// Các ký tự đặc biệt cần escape bằng \
// . * + ? ^ $ { } [ ] ( ) | \

const regex = /\$\d+\.\d{2}/;  // Match "$12.99"
regex.test('$12.99');  // true
regex.test('$12999');  // false

// Hàm escape user input an toàn
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const userInput = 'price is $10.00 (USD)';
const safeRegex = new RegExp(escapeRegExp(userInput));
```

---

# 2. Character Classes, Quantifiers, Anchors

## Character Classes

| Pattern | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| `.` | Bất kỳ ký tự nào (trừ `\n`) | `/a.c/` → "abc", "a1c" |
| `\d` | Chữ số `[0-9]` | `/\d{3}/` → "123" |
| `\D` | KHÔNG phải chữ số `[^0-9]` | `/\D+/` → "abc" |
| `\w` | Word char `[a-zA-Z0-9_]` | `/\w+/` → "hello_1" |
| `\W` | KHÔNG phải word char | `/\W/` → "@", " " |
| `\s` | Whitespace `[ \t\n\r\f\v]` | `/\s+/` → spaces |
| `\S` | KHÔNG phải whitespace | `/\S+/` → "hello" |
| `[abc]` | Một trong a, b, c | `/[aeiou]/` → vowels |
| `[^abc]` | KHÔNG phải a, b, c | `/[^0-9]/` → non-digit |
| `[a-z]` | Range a đến z | `/[A-Za-z]/` → letters |

```javascript
// Character class examples
/\d{3}-\d{4}/.test('123-4567');       // true — phone format
/[aeiou]/i.test('Hello');              // true — có vowel
/[^a-zA-Z]/.test('Hello World!');      // true — có non-letter (space, !)
/[\u0400-\u04FF]/.test('Привет');      // true — Cyrillic characters
```

## Quantifiers

| Pattern | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| `*` | 0 hoặc nhiều | `/bo*/` → "b", "bo", "booo" |
| `+` | 1 hoặc nhiều | `/bo+/` → "bo", "booo" (không "b") |
| `?` | 0 hoặc 1 | `/colou?r/` → "color", "colour" |
| `{n}` | Chính xác n lần | `/\d{4}/` → "2024" |
| `{n,}` | Ít nhất n lần | `/\d{2,}/` → "12", "123", "1234" |
| `{n,m}` | Từ n đến m lần | `/\d{2,4}/` → "12", "123", "1234" |

### Greedy vs Lazy

```javascript
const html = '<div>Hello</div><div>World</div>';

// Greedy (mặc định) — match DÀI NHẤT có thể
html.match(/<div>.*<\/div>/);
// → '<div>Hello</div><div>World</div>' (toàn bộ!)

// Lazy (thêm ?) — match NGẮN NHẤT có thể
html.match(/<div>.*?<\/div>/);
// → '<div>Hello</div>' (chỉ phần đầu)

// Lazy versions: *? +? ?? {n,m}?
```

## Anchors

| Pattern | Ý nghĩa |
|---------|---------|
| `^` | Đầu string (hoặc đầu dòng với flag `m`) |
| `$` | Cuối string (hoặc cuối dòng với flag `m`) |
| `\b` | Word boundary (ranh giới từ) |
| `\B` | KHÔNG phải word boundary |

```javascript
// Anchors
/^hello/.test('hello world');   // true — bắt đầu bằng "hello"
/world$/.test('hello world');   // true — kết thúc bằng "world"
/^hello$/.test('hello');        // true — chính xác "hello"
/^hello$/.test('hello world');  // false — có thêm ký tự

// Word boundary
/\bcat\b/.test('the cat sat');    // true — "cat" là từ riêng
/\bcat\b/.test('concatenate');    // false — "cat" nằm trong từ khác
/\Bcat\B/.test('concatenate');    // true — "cat" nằm giữa từ
```

---

# 3. Groups — Capturing, Non-capturing, Named

## Capturing Groups `( )`

```javascript
// Capturing group — lưu matched text
const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
const match = '2024-12-25'.match(dateRegex);

console.log(match[0]);  // '2024-12-25' — full match
console.log(match[1]);  // '2024'       — group 1 (year)
console.log(match[2]);  // '12'         — group 2 (month)
console.log(match[3]);  // '25'         — group 3 (day)

// Backreference — tham chiếu group đã match
const doubled = /(\w+)\s\1/;  // \1 = nội dung group 1
doubled.test('hello hello');  // true
doubled.test('hello world');  // false

// Replace với groups
'2024-12-25'.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1');
// → '25/12/2024' (đổi format)
```

## Non-capturing Groups `(?: )`

```javascript
// Non-capturing — group để logic, KHÔNG lưu
const regex = /(?:https?|ftp):\/\//;
const match = 'https://example.com'.match(regex);
console.log(match[0]);  // 'https://' — full match
console.log(match[1]);  // undefined — không có captured group

// So sánh:
'abc'.match(/(a)(b)(c)/);    // ['abc', 'a', 'b', 'c'] — 3 groups
'abc'.match(/(?:a)(b)(c)/);  // ['abc', 'b', 'c'] — 2 groups (a không capture)
```

## Named Groups `(?<name> )`

```javascript
// Named group — đặt tên cho group (ES2018)
const dateRegex = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const match = '2024-12-25'.match(dateRegex);

console.log(match.groups.year);   // '2024'
console.log(match.groups.month);  // '12'
console.log(match.groups.day);    // '25'

// Named backreference
const doubled = /(?<word>\w+)\s\k<word>/;
doubled.test('hello hello');  // true — \k<word> tham chiếu group "word"

// Replace với named groups
'2024-12-25'.replace(
  /(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/,
  '$<d>/$<m>/$<y>'
);
// → '25/12/2024'

// Destructuring named groups
const { groups: { year, month, day } } = dateRegex.exec('2024-12-25');
console.log(year, month, day);  // '2024' '12' '25'
```

## Alternation `|`

```javascript
// OR — match pattern A HOẶC pattern B
/cat|dog/.test('I love cats');   // true
/cat|dog/.test('I love dogs');   // true

// Kết hợp với groups
/(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day/.test('Monday');  // true
```

---

# 4. Lookahead & Lookbehind Assertions

> Assertions kiểm tra **context xung quanh** mà KHÔNG consume characters (zero-width).

```
┌──────────────────────────────────────────────────┐
│              Zero-Width Assertions                │
├─────────────────────┬────────────────────────────┤
│     Lookahead       │      Lookbehind            │
│   (nhìn phía SAU)   │   (nhìn phía TRƯỚC)        │
├─────────────────────┼────────────────────────────┤
│ Positive: (?=...)   │  Positive: (?<=...)        │
│ Negative: (?!...)   │  Negative: (?<!...)        │
└─────────────────────┴────────────────────────────┘
```

## Positive Lookahead `(?=...)`

```javascript
// Match "hello" CHỈ KHI theo sau bởi " world"
/hello(?= world)/.test('hello world');   // true
/hello(?= world)/.test('hello there');   // false

// Lookahead KHÔNG consume — "world" vẫn ngoài match
'hello world'.match(/hello(?= world)/);  // ['hello'] (không có 'world')

// Password phải có ít nhất 1 number
/(?=.*\d)/.test('hello1');    // true
/(?=.*\d)/.test('hello');     // false
```

## Negative Lookahead `(?!...)`

```javascript
// Match "hello" CHỈ KHI KHÔNG theo sau bởi " world"
/hello(?! world)/.test('hello there');   // true
/hello(?! world)/.test('hello world');   // false

// Match số KHÔNG theo sau bởi "px"
/\d+(?!px)/.test('100em');   // true
/\d+(?!px)/.test('100px');   // false (nhưng cẩn thận — match "10" trong "100px")
// Chính xác hơn:
/\d+(?!px)\b/.test('100px');  // false
```

## Positive Lookbehind `(?<=...)`

```javascript
// Match số CHỈ KHI phía trước là "$"
/(?<=\$)\d+/.test('$100');     // true
/(?<=\$)\d+/.test('€100');     // false

'$100 and €200'.match(/(?<=\$)\d+/);  // ['100']
'$100 and €200'.match(/(?<=€)\d+/);   // ['200']
```

## Negative Lookbehind `(?<!...)`

```javascript
// Match số KHÔNG có "$" phía trước
/(?<!\$)\d+/.test('€100');     // true
/(?<!\$)\d+/.test('$100');     // false (cẩn thận edge cases)

// Practical: match "bar" không phải sau "foo"
/(?<!foo)bar/.test('foobar');    // false
/(?<!foo)bar/.test('bazbar');    // true
```

## Kết hợp Lookahead — Password Validation

```javascript
// Password phải:
// - Ít nhất 8 ký tự
// - Có uppercase
// - Có lowercase
// - Có số
// - Có special character
const strongPassword = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

strongPassword.test('Abc12345!');   // true
strongPassword.test('abcdefgh');    // false — thiếu uppercase, số, special
strongPassword.test('ABC12345');    // false — thiếu lowercase, special
strongPassword.test('Abc1!');       // false — thiếu length
```

---

# 5. Flags — g, i, m, s, u, d, y

| Flag | Ý nghĩa | Ví dụ |
|------|---------|-------|
| `g` | **Global** — tìm tất cả matches, không dừng ở match đầu | `/a/g` |
| `i` | **Case-insensitive** | `/hello/i` match "HELLO" |
| `m` | **Multiline** — `^` `$` match đầu/cuối mỗi dòng | `/^hello/m` |
| `s` | **DotAll** — `.` match cả `\n` (ES2018) | `/a.b/s` match "a\nb" |
| `u` | **Unicode** — xử lý đúng Unicode surrogate pairs | `/\u{1F600}/u` |
| `d` | **HasIndices** — trả về index positions (ES2022) | `/a/d` |
| `y` | **Sticky** — match tại `lastIndex` chính xác | `/a/y` |

```javascript
// g — Global
'aaa'.match(/a/);    // ['a'] — chỉ match đầu tiên
'aaa'.match(/a/g);   // ['a', 'a', 'a'] — tất cả

// m — Multiline
const text = 'hello\nworld';
/^world/.test(text);    // false — ^ chỉ match đầu string
/^world/m.test(text);   // true — ^ match đầu mỗi dòng

// s — DotAll
/hello.world/.test('hello\nworld');    // false — . không match \n
/hello.world/s.test('hello\nworld');   // true — . match cả \n

// u — Unicode
'😀'.length;                    // 2 (surrogate pair)
/^.$/u.test('😀');              // true — xử lý đúng
/^.$/.test('😀');               // false — coi là 2 chars

// d — HasIndices (ES2022)
const match = /(?<year>\d{4})/d.exec('year: 2024');
console.log(match.indices[0]);         // [6, 10] — full match positions
console.log(match.indices.groups.year); // [6, 10] — named group positions

// y — Sticky
const stickyRegex = /\d+/y;
stickyRegex.lastIndex = 4;
stickyRegex.exec('abc 123');   // ['123'] — match tại index 4
stickyRegex.exec('abc 123');   // null — phải match TẠI lastIndex (7)
```

---

# 6. Methods — exec, test, match, matchAll, replace, split, search

## RegExp Methods

```javascript
const regex = /(\d{4})-(\d{2})/g;
const str = 'Dates: 2024-01 and 2024-12';

// regex.test(str) — Trả về boolean
/\d+/.test('hello 123');  // true

// regex.exec(str) — Trả về match object hoặc null
// Với /g, mỗi lần gọi trả về match tiếp theo
const r = /(\d+)/g;
r.exec('12 and 34');  // ['12', '12', index: 0]
r.exec('12 and 34');  // ['34', '34', index: 7]
r.exec('12 and 34');  // null (hết)
```

## String Methods

```javascript
const str = 'Hello World Hello JS';

// str.match(regex) — Trả về matches
str.match(/hello/i);     // ['Hello', index: 0, ...]  (không /g → chi tiết)
str.match(/hello/ig);    // ['Hello', 'Hello']         (/g → chỉ matches)

// str.matchAll(regex) — Iterator of match objects (ES2020)
// Bắt buộc dùng /g flag
const matches = [...str.matchAll(/Hello/g)];
matches[0];  // ['Hello', index: 0, ...]
matches[1];  // ['Hello', index: 12, ...]

// str.search(regex) — Trả về index đầu tiên (hoặc -1)
str.search(/World/);   // 6
str.search(/xyz/);     // -1

// str.replace(regex, replacement)
str.replace(/Hello/, 'Hi');     // 'Hi World Hello JS' (chỉ first)
str.replace(/Hello/g, 'Hi');    // 'Hi World Hi JS' (tất cả)

// Replace với function callback
'hello world'.replace(/\b\w/g, (char) => char.toUpperCase());
// → 'Hello World'

// str.replaceAll(string/regex, replacement) — ES2021
'aabbcc'.replaceAll('a', 'x');   // 'xxbbcc' — string, không cần /g
'aabbcc'.replaceAll(/a/g, 'x');  // 'xxbbcc' — regex phải có /g

// str.split(regex)
'one,two,,three'.split(/,+/);   // ['one', 'two', 'three']
'camelCase'.split(/(?=[A-Z])/); // ['camel', 'Case'] — split before uppercase
```

## So sánh Methods

| Method | Input | Return | Mục đích |
|--------|-------|--------|---------|
| `regex.test(str)` | regex, string | `boolean` | Kiểm tra match |
| `regex.exec(str)` | regex, string | Match object / null | Chi tiết match + groups |
| `str.match(regex)` | string, regex | Array / null | Nhanh, lấy matches |
| `str.matchAll(regex)` | string, regex+g | Iterator | Tất cả matches + chi tiết |
| `str.search(regex)` | string, regex | index / -1 | Tìm vị trí |
| `str.replace(regex, rep)` | string, regex | new string | Thay thế |
| `str.split(regex)` | string, regex | Array | Tách string |

---

# 7. Common Patterns — Email, URL, Phone, Password

> ⚠️ Regex cho email/URL thực tế rất phức tạp. Dưới đây là các pattern **thực dụng** cho interview và validation cơ bản.

```javascript
// 📧 Email (basic — đủ cho hầu hết cases)
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
emailRegex.test('user@example.com');       // true
emailRegex.test('user.name+tag@co.uk');    // true
emailRegex.test('invalid@');               // false

// 🌐 URL
const urlRegex = /^https?:\/\/[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=]*$/;
urlRegex.test('https://example.com');                 // true
urlRegex.test('http://sub.example.com/path?q=1');     // true

// 📱 Phone (Vietnam)
const vnPhoneRegex = /^(?:\+84|0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/;
vnPhoneRegex.test('0912345678');    // true
vnPhoneRegex.test('+84912345678');  // true

// 🔐 Strong Password
// Ít nhất 8 chars, uppercase, lowercase, number, special char
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=]).{8,}$/;
passwordRegex.test('MyP@ss1234');   // true
passwordRegex.test('weakpass');      // false

// 🆔 IPv4 Address
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
ipv4Regex.test('192.168.1.1');     // true
ipv4Regex.test('256.1.1.1');       // false

// 📅 Date (YYYY-MM-DD)
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
dateRegex.test('2024-12-25');      // true
dateRegex.test('2024-13-01');      // false

// 🔢 Số có dấu phẩy ngăn (1,000,000.50)
const numberRegex = /^\d{1,3}(,\d{3})*(\.\d{1,2})?$/;
numberRegex.test('1,000,000.50');  // true
numberRegex.test('100.99');        // true

// 🏷️ HTML tag (simple)
const htmlTagRegex = /<\/?[\w\s="'-]*\/?>/g;
'<div class="a">text</div>'.match(htmlTagRegex);
// ['<div class="a">', '</div>']

// 📝 Trim whitespace (leading/trailing)
const trimmed = '  hello world  '.replace(/^\s+|\s+$/g, '');
// → 'hello world'

// 🔄 CamelCase → kebab-case
'camelCaseString'.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
// → 'camel-case-string'

// 🔄 Slug from title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')     // Xóa special chars
    .replace(/\s+/g, '-')         // Space → dash
    .replace(/--+/g, '-')         // Multiple dashes → single
    .replace(/^-+|-+$/g, '');     // Trim dashes
}
slugify('Hello World! @2024');  // 'hello-world-2024'
```

---

# 8. Performance — ReDoS và cách tránh

## Catastrophic Backtracking

```javascript
// ❌ NGUY HIỂM — Nested quantifiers
const evil1 = /(a+)+$/;           // O(2^n)
const evil2 = /([a-zA-Z]+)*$/;    // O(2^n)
const evil3 = /(a|a)+$/;          // Overlapping alternatives
const evil4 = /(.*a){10}/;        // Nested .* với fixed char

// Test: exponential time
console.time('evil');
evil1.test('a'.repeat(25) + 'X');  // TREO!
console.timeEnd('evil');

// ✅ AN TOÀN — Refactored
const safe1 = /a+$/;              // Không nested
const safe2 = /[a-zA-Z]+$/;       // Không nested
```

## Best Practices

```javascript
// 1. Validate input length TRƯỚC khi regex
function safeValidate(input, regex, maxLen = 500) {
  if (typeof input !== 'string' || input.length > maxLen) return false;
  return regex.test(input);
}

// 2. Dùng atomic-like patterns (non-backtracking)
// Thay (a+)+ bằng a+
// Thay (a|b)* bằng [ab]*

// 3. Be specific — tránh .* khi có thể
// ❌ /.*@.*/ — quá broad
// ✅ /[^@]+@[^@]+/ — specific hơn, không backtrack

// 4. Dùng possessive quantifiers (nếu engine hỗ trợ)
// JS không hỗ trợ, nhưng RE2 library có

// 5. Benchmark regex
function benchRegex(regex, input, iterations = 10000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    regex.test(input);
  }
  return performance.now() - start;
}
```

---

# 9. ES2024-2025 Features mới

## `v` Flag — Unicode Sets (ES2024)

```javascript
// v flag thay thế u flag — hỗ trợ set operations
// Yêu cầu: v flag (không dùng chung với u)

// Set intersection (&&)
/[\p{Script=Greek}&&\p{Letter}]/v.test('α');  // true — Greek letters

// Set subtraction (--)
/[\p{Decimal_Number}--[0-9]]/v.test('٣');     // true — non-ASCII digits
/[\p{Decimal_Number}--[0-9]]/v.test('3');      // false — ASCII digit bị loại

// String properties trong character classes
/[\q{🇻🇳|🇺🇸|🇯🇵}]/v.test('🇻🇳');        // true — match flag emoji

// Nested character classes
/[[\p{ASCII}]&&[\p{Alpha}]]/v;  // ASCII letters only
```

## Unicode Property Escapes (đã có từ ES2018, mở rộng)

```javascript
// \p{...} — match Unicode property
/\p{Emoji}/u.test('😀');                     // true
/\p{Script=Han}/u.test('中');                // true — Chinese characters
/\p{Script=Hangul}/u.test('한');             // true — Korean
/\p{Alphabetic}/u.test('Ñ');                 // true

// Negation: \P{...}
/\P{Emoji}/u.test('a');                      // true — không phải emoji
```

---

# 10. Câu hỏi phỏng vấn

### Q1: Literal `/regex/` và `new RegExp()` khác gì? Khi nào dùng Constructor?

**A:** Literal compile lúc load (static). Constructor compile lúc runtime từ string — dùng khi pattern là **dynamic** (user input, variable). Lưu ý Constructor cần **double escape** (`\\d` thay vì `\d`). Constructor cũng cho phép tạo regex với flags dynamic.

---

### Q2: Greedy và Lazy quantifier khác gì?

**A:** **Greedy** (default: `*`, `+`, `{n,m}`) match **dài nhất** có thể rồi backtrack. **Lazy** (thêm `?`: `*?`, `+?`) match **ngắn nhất** rồi mở rộng. Ví dụ: `/<.*>/` (greedy) match `<div>text</div>` toàn bộ, `/<.*?>/` (lazy) chỉ match `<div>`.

---

### Q3: Lookahead và Lookbehind là gì? Cho ví dụ.

**A:** Là **zero-width assertions** — kiểm tra context xung quanh mà không consume characters.
- **Positive lookahead** `(?=...)`: phía sau phải match. VD: `/\d+(?=px)/` match số trước "px".
- **Negative lookahead** `(?!...)`: phía sau KHÔNG match.
- **Positive lookbehind** `(?<=...)`: phía trước phải match. VD: `/(?<=\$)\d+/` match số sau "$".
- **Negative lookbehind** `(?<!...)`: phía trước KHÔNG match.

---

### Q4: Capturing group, Non-capturing group, Named group khác gì?

**A:**
- **Capturing `()`**: Lưu matched text → truy cập qua `match[1]`, `$1`.
- **Non-capturing `(?:)`**: Group cho logic (alternation, quantifier) nhưng **không lưu** → performance tốt hơn.
- **Named `(?<name>)`**: Capturing + đặt tên → `match.groups.name`, `$<name>`. Dễ đọc, maintain hơn.

---

### Q5: `match()` vs `matchAll()` vs `exec()` — khi nào dùng gì?

**A:**
- `str.match(regex)`: Nhanh, dùng không flag g → chi tiết match + groups, có flag g → chỉ array strings.
- `str.matchAll(regex)`: ES2020, bắt buộc `/g`, trả về iterator tất cả matches **với đầy đủ groups** — thay thế vòng lặp exec.
- `regex.exec(str)`: Trả về 1 match, gọi nhiều lần với `/g` để iterate. Stateful (dùng lastIndex).

---

### Q6: ReDoS là gì? Regex nào gây ReDoS?

**A:** ReDoS (Regular Expression Denial of Service) khai thác regex có **catastrophic backtracking** để block CPU. Pattern nguy hiểm: nested quantifiers `(a+)+`, overlapping alternatives `(a|a)+`, nested `.*` với `(.+)+`. Phòng: tránh nested quantifiers, giới hạn input length, dùng RE2 engine, benchmark regex.

---

### Q7: Viết regex validate email cơ bản và giải thích.

**A:**
```javascript
/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```
- `^` `$` — match toàn bộ string
- `[a-zA-Z0-9._%+-]+` — local part: letters, digits, dots, underscores, etc.
- `@` — literal @
- `[a-zA-Z0-9.-]+` — domain: letters, digits, dots, hyphens
- `\.[a-zA-Z]{2,}` — TLD: dot + ít nhất 2 letters

---

### Q8: `g` flag ảnh hưởng thế nào đến `lastIndex`? Gotcha phổ biến?

**A:** Với `/g`, regex object giữ **`lastIndex`** — lần exec/test tiếp theo bắt đầu từ đó. Gotcha: dùng cùng regex object cho nhiều strings → lastIndex không reset:
```javascript
const r = /a/g;
r.test('abc'); // true, lastIndex = 1
r.test('abc'); // true, lastIndex = 2 (BẤT NGỜ nếu nghĩ reset)
r.test('abc'); // true, lastIndex = 3
r.test('abc'); // false, lastIndex = 0 (reset khi không match)
```
Fix: tạo regex mới mỗi lần, hoặc reset `r.lastIndex = 0`.
