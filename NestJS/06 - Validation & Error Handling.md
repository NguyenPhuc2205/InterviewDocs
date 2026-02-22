# Validation & Error Handling

> Tài liệu ôn tập phỏng vấn — class-validator, ValidationPipe, custom validators, DTO patterns, global exception filters, custom exceptions, error response format.

---

## Mục lục

1. [DTO Pattern — Data Transfer Object](#1-dto-pattern--data-transfer-object)
2. [class-validator — Validate bằng decorators](#2-class-validator--validate-bằng-decorators)
3. [ValidationPipe — Cấu hình toàn cục](#3-validationpipe--cấu-hình-toàn-cục)
4. [Custom Validators](#4-custom-validators)
5. [Exception Filters — Xử lý lỗi tập trung](#5-exception-filters--xử-lý-lỗi-tập-trung)
6. [Custom Exceptions](#6-custom-exceptions)
7. [Error Response Format chuẩn](#7-error-response-format-chuẩn)
8. [Câu hỏi phỏng vấn thường gặp](#8-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. DTO Pattern — Data Transfer Object

## DTO là gì?

DTO là **class định nghĩa cấu trúc dữ liệu** đầu vào/đầu ra. Kết hợp class-validator để **validate tự động** trước khi vào controller.

```
Request body → ValidationPipe → DTO (validate + transform) → Controller

Nếu validate thất bại → trả 400 Bad Request tự động → KHÔNG vào controller
```

## Cấu trúc DTO

```typescript
// create-user.dto.ts
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Mật khẩu phải có ít nhất 1 chữ hoa và 1 số',
  })
  password: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

// update-user.dto.ts — PartialType: tất cả field trở thành optional
export class UpdateUserDto extends PartialType(CreateUserDto) {}
// Kế thừa validation rules nhưng mọi field đều optional

// Controller
@Post()
create(@Body() dto: CreateUserDto) {
  // dto đã được validate — nếu sai thì không vào đây
  return this.usersService.create(dto);
}
```

---

# 2. class-validator — Validate bằng decorators

## Decorators phổ biến

| Decorator | Kiểu | Ví dụ |
|---|---|---|
| `@IsString()` | String | |
| `@IsNumber()` | Number | |
| `@IsBoolean()` | Boolean | |
| `@IsEmail()` | Email hợp lệ | `user@example.com` |
| `@IsNotEmpty()` | Không rỗng | |
| `@IsOptional()` | Cho phép undefined | |
| `@MinLength(n)` | String >= n ký tự | `@MinLength(8)` |
| `@MaxLength(n)` | String <= n ký tự | `@MaxLength(100)` |
| `@Min(n)` | Number >= n | `@Min(0)` |
| `@Max(n)` | Number <= n | `@Max(1000)` |
| `@IsEnum(E)` | Giá trị trong enum | `@IsEnum(Role)` |
| `@IsArray()` | Array | |
| `@IsUUID()` | UUID hợp lệ | |
| `@IsDateString()` | ISO date string | `2024-01-15` |
| `@Matches(regex)` | Khớp regex | `@Matches(/^[a-z]+$/)` |
| `@ValidateNested()` | Validate object con | Kết hợp `@Type(() => Class)` |

## Nested Validation

```typescript
class AddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;
}

class CreateUserDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)  // class-transformer — chuyển plain object → class
  address: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })  // Validate MỖI phần tử trong array
  @Type(() => AddressDto)
  addresses: AddressDto[];
}
```

---

# 3. ValidationPipe — Cấu hình toàn cục

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // Loại bỏ property không có trong DTO
    forbidNonWhitelisted: true,  // Lỗi nếu gửi property lạ
    transform: true,        // Tự động chuyển kiểu (string → number)
    transformOptions: {
      enableImplicitConversion: true,  // Query params string → number tự động
    },
  }));

  await app.listen(3000);
}
```

## whitelist: true — Bảo mật quan trọng

```typescript
// DTO chỉ cho phép name và email
class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
}

// Request body chứa field lạ:
{ "name": "Hùng", "email": "...", "isAdmin": true }  // isAdmin KHÔNG có trong DTO

// whitelist: true → { name: "Hùng", email: "..." }  // isAdmin bị loại bỏ
// forbidNonWhitelisted: true → 400 Error  // Lỗi luôn, không cho qua
```

## transform: true — Chuyển kiểu tự động

```typescript
// Không có transform:
@Get(':id')
findOne(@Param('id') id: string) {  // id luôn là string
  console.log(typeof id);  // "string"
}

// Có transform:
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {  // Tự chuyển string → number
  console.log(typeof id);  // "number"
}
```

---

# 4. Custom Validators

```typescript
// Custom validator: kiểm tra email chưa tồn tại trong DB
@ValidatorConstraint({ async: true })
@Injectable()
export class IsEmailUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return !user;  // true = hợp lệ (chưa tồn tại)
  }

  defaultMessage() {
    return 'Email $value đã được sử dụng';
  }
}

// Tạo decorator
export function IsEmailUnique(options?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsEmailUniqueConstraint,
    });
  };
}

// Sử dụng
class RegisterDto {
  @IsEmail()
  @IsEmailUnique()   // ← Custom validator
  email: string;
}
```

---

# 5. Exception Filters — Xử lý lỗi tập trung

## Built-in Exceptions

| Exception | Status | Khi nào dùng |
|---|---|---|
| `BadRequestException` | 400 | Input không hợp lệ |
| `UnauthorizedException` | 401 | Chưa đăng nhập / token hết hạn |
| `ForbiddenException` | 403 | Không có quyền |
| `NotFoundException` | 404 | Resource không tìm thấy |
| `ConflictException` | 409 | Xung đột (email trùng) |
| `InternalServerErrorException` | 500 | Lỗi server |

## Global Exception Filter

```typescript
@Catch()  // Bắt TẤT CẢ exceptions
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message;
    }

    // Log lỗi
    this.logger.error(`${request.method} ${request.url} → ${status}`, {
      exception,
      body: request.body,
    });

    // Response format chuẩn
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

// Đăng ký global
app.useGlobalFilters(new AllExceptionsFilter(new Logger()));
```

---

# 6. Custom Exceptions

```typescript
// Business logic exception
export class InsufficientBalanceException extends HttpException {
  constructor(currentBalance: number, requiredAmount: number) {
    super(
      {
        statusCode: 400,
        message: 'Số dư không đủ',
        error: 'INSUFFICIENT_BALANCE',
        details: { currentBalance, requiredAmount },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

// Dùng trong service
async withdraw(userId: string, amount: number) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (user.balance < amount) {
    throw new InsufficientBalanceException(user.balance, amount);
  }
  // ...
}
```

---

# 7. Error Response Format chuẩn

```typescript
// Thống nhất format cho toàn app
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email không hợp lệ" },
    { "field": "password", "message": "Mật khẩu phải có ít nhất 8 ký tự" }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users"
}

// Success response cũng nên có format
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1 }  // Cho pagination
}
```

---

# 8. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| DTO dùng để làm gì? | Class định nghĩa cấu trúc + validation cho dữ liệu đầu vào. Kết hợp class-validator để validate tự động trước khi vào controller |
| whitelist trong ValidationPipe? | Loại bỏ property không có trong DTO. Bảo mật: ngăn người dùng gửi field lạ (isAdmin, role) |
| Pipes khác Filters? | Pipes: transform/validate INPUT (trước handler). Filters: xử lý EXCEPTIONS (sau handler, khi có lỗi) |
| PartialType, PickType, OmitType? | PartialType: tất cả optional. PickType: chỉ lấy vài field. OmitType: bỏ vài field. Dùng cho update DTO |
| Exception Filter dùng khi nào? | Xử lý lỗi tập trung: log, format response, gửi notification. Global filter bắt tất cả exception |
