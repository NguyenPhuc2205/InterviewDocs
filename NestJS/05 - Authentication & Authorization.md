# Authentication & Authorization trong NestJS

> Tài liệu ôn tập phỏng vấn — Passport.js strategies, JWT module setup, custom decorators, Guards cho RBAC, refresh token flow trong NestJS.

---

## Mục lục

1. [Kiến trúc Auth trong NestJS](#1-kiến-trúc-auth-trong-nestjs)
2. [Passport.js & Strategies](#2-passportjs--strategies)
3. [JWT Module Setup](#3-jwt-module-setup)
4. [Guards — Bảo vệ routes](#4-guards--bảo-vệ-routes)
5. [Custom Decorators](#5-custom-decorators)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [Refresh Token Flow](#7-refresh-token-flow)
8. [Câu hỏi phỏng vấn thường gặp](#8-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Kiến trúc Auth trong NestJS

```
Client gửi request
  │
  ▼
Guard (kiểm tra JWT/session)
  │
  ├── Không hợp lệ → 401 Unauthorized
  │
  ▼ Hợp lệ
Strategy (Passport) xác thực token → gắn user vào request
  │
  ▼
Controller nhận request.user
  │
  ▼
RBAC Guard (nếu cần kiểm tra role)
  │
  ├── Không đủ quyền → 403 Forbidden
  │
  ▼ Đủ quyền
Handler xử lý logic
```

---

# 2. Passport.js & Strategies

## Strategy Pattern

Mỗi cách xác thực là 1 **Strategy** (chiến lược): JWT, Local (username/password), Google OAuth, v.v.

```typescript
// Local Strategy — Xác thực bằng email/password
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });  // Mặc định 'username', đổi thành 'email'
  }

  async validate(email: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return user;  // Gắn vào request.user
  }
}

// JWT Strategy — Xác thực bằng JWT token
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Bearer <token>
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // payload = { sub: 'user-id', email: 'user@example.com', role: 'admin' }
    return { userId: payload.sub, email: payload.email, role: payload.role };
    // → gắn vào request.user
  }
}
```

---

# 3. JWT Module Setup

```typescript
// auth.module.ts
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },  // Access token 15 phút
      }),
    }),
    PassportModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

```typescript
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
```

---

# 4. Guards — Bảo vệ routes

```typescript
// Dùng AuthGuard của Passport
@Controller('users')
export class UsersController {
  // 1. Local Guard — login (username + password)
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // 2. JWT Guard — bảo vệ route cần đăng nhập
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}

// Custom JWT Guard — tái sử dụng
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    return user;
  }
}

// Dùng @UseGuards(JwtAuthGuard) thay @UseGuards(AuthGuard('jwt'))
```

## Global Guard — Bảo vệ mọi route

```typescript
// Mặc định MỌI route cần đăng nhập, dùng @Public() để exempt
@Module({
  providers: [{
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  }],
})
export class AppModule {}

// Decorator @Public()
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Guard kiểm tra metadata
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;  // Route @Public() → cho qua
    return super.canActivate(context);
  }
}

// Sử dụng
@Public()
@Post('register')
register(@Body() dto: RegisterDto) { ... }  // Không cần token
```

---

# 5. Custom Decorators

```typescript
// @CurrentUser() — lấy user từ request
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;  // @CurrentUser('email') → chỉ lấy email
  },
);

// Sử dụng
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: User) {
  return user;  // Thay req.user — clean hơn
}

@Get('email')
@UseGuards(JwtAuthGuard)
getEmail(@CurrentUser('email') email: string) {
  return { email };
}
```

---

# 6. Role-Based Access Control (RBAC)

```typescript
// Roles enum
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

// @Roles() decorator
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// RolesGuard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;  // Không yêu cầu role → cho qua

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// Sử dụng
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Delete(':id')
deleteUser(@Param('id') id: string) {
  return this.usersService.delete(id);
}
```

## Thứ tự Guards

```
Request → JwtAuthGuard (xác thực) → RolesGuard (phân quyền) → Handler

JwtAuthGuard chạy trước → gắn user vào request
RolesGuard chạy sau → đọc user.role để kiểm tra quyền
```

---

# 7. Refresh Token Flow

```
1. Login → Server trả { accessToken (15m), refreshToken (7d) }

2. Gọi API bình thường → gửi accessToken trong header
   Authorization: Bearer <accessToken>

3. accessToken hết hạn → 401

4. Client gọi /auth/refresh → gửi refreshToken

5. Server:
   - Verify refreshToken
   - Kiểm tra refreshToken trong DB (chưa bị thu hồi?)
   - Tạo accessToken MỚI + refreshToken MỚI (rotation)
   - Xoá refreshToken cũ, lưu refreshToken mới

6. Client nhận tokens mới → tiếp tục gọi API
```

```typescript
@Controller('auth')
export class AuthController {
  @Post('refresh')
  async refreshTokens(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }
}

@Injectable()
export class AuthService {
  async refreshTokens(token: string) {
    const payload = this.jwtService.verify(token, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: await hash(token) },
    });

    if (!storedToken) {
      // Token không trong DB → có thể bị tái sử dụng → thu hồi tất cả
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      throw new UnauthorizedException('Phát hiện hoạt động đáng ngờ');
    }

    // Xoá token cũ
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Tạo tokens mới
    const newTokens = await this.generateTokens(payload.sub);

    // Lưu refresh token mới
    await this.prisma.refreshToken.create({
      data: {
        token: await hash(newTokens.refreshToken),
        userId: payload.sub,
        expiresAt: addDays(new Date(), 7),
      },
    });

    return newTokens;
  }
}
```

---

# 8. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Guard khác Middleware thế nào? | Middleware chạy trước routing, Guard chạy SAU routing (biết handler nào sẽ chạy). Guard access được metadata (Reflector) |
| Passport Strategy là gì? | Mỗi cách xác thực là 1 Strategy (Local, JWT, Google OAuth). validate() trả user → gắn vào request |
| Implement RBAC trong NestJS? | @Roles decorator gắn metadata cho handler → RolesGuard kiểm tra user.role có nằm trong required roles không |
| @Public() hoạt động thế nào? | Gắn metadata `isPublic = true` → Global JwtAuthGuard đọc metadata → nếu isPublic → skip authentication |
| Refresh token rotation? | Mỗi lần refresh → tạo cặp token mới, xoá cũ. Nếu token cũ bị dùng lại → phát hiện tái sử dụng → thu hồi tất cả |
