# Testing trong NestJS

> Tài liệu ôn tập phỏng vấn — Unit testing services, testing controllers, TestingModule, mocking providers, e2e testing, testing guards/pipes/interceptors.

---

## Mục lục

1. [Tổng quan Testing trong NestJS](#1-tổng-quan-testing-trong-nestjs)
2. [TestingModule — Tạo module test](#2-testingmodule--tạo-module-test)
3. [Unit Testing Services](#3-unit-testing-services)
4. [Unit Testing Controllers](#4-unit-testing-controllers)
5. [Mocking Providers](#5-mocking-providers)
6. [Testing Guards, Pipes, Interceptors](#6-testing-guards-pipes-interceptors)
7. [E2E Testing](#7-e2e-testing)
8. [Câu hỏi phỏng vấn thường gặp](#8-câu-hỏi-phỏng-vấn-thường-gặp)

---

# 1. Tổng quan Testing trong NestJS

```
Unit Test          Integration Test        E2E Test
    │                    │                     │
Test 1 hàm/class   Test nhiều lớp cùng    Test toàn app
một cách biệt lập  nhau (service + DB)    (HTTP request thật)
    │                    │                     │
Nhanh, nhiều      Trung bình             Chậm, ít
Mock dependencies  Ít mock hơn           Không mock (hoặc mock DB)
```

| | Unit Test | E2E Test |
|---|---|---|
| **Phạm vi** | 1 class/method | Toàn bộ flow |
| **Tốc độ** | Rất nhanh | Chậm |
| **Dependencies** | Mock hết | Inject thật (hoặc test DB) |
| **Phát hiện** | Bug logic cụ thể | Bug tích hợp, routing, middleware |
| **Framework** | Jest | Jest + Supertest |

---

# 2. TestingModule — Tạo module test

```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,  // Mock PrismaService
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## TestingModule vs Module thật

```
Module thật (AppModule):
  Service → PrismaService → Database thật
  Chậm, phụ thuộc DB, side effects

TestingModule:
  Service → MockPrismaService → Không DB
  Nhanh, biệt lập, kiểm soát được đầu ra
```

---

# 3. Unit Testing Services

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get(UsersService);
    prisma = module.get(PrismaService);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', name: 'Hùng', email: 'hung@test.com' };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should throw ConflictException when email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });

      await expect(
        service.create({ name: 'Test', email: 'test@test.com', password: '12345678' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password before saving', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) => {
        return Promise.resolve({ id: '1', ...data });
      });

      const result = await service.create({
        name: 'Test',
        email: 'new@test.com',
        password: 'plaintext',
      });

      // Password đã được hash
      expect(result.password).not.toBe('plaintext');
    });
  });
});
```

---

# 4. Unit Testing Controllers

```typescript
describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{
        provide: UsersService,
        useValue: {
          findAll: jest.fn(),
          findById: jest.fn(),
          create: jest.fn(),
        },
      }],
    }).compile();

    controller = module.get(UsersController);
    service = module.get(UsersService);
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const mockUsers = [{ id: '1', name: 'Hùng' }];
      jest.spyOn(service, 'findAll').mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(result).toEqual(mockUsers);
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});
```

---

# 5. Mocking Providers

## Các cách Mock

```typescript
// 1. Object mock đơn giản
{
  provide: UsersService,
  useValue: {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
  },
}

// 2. Auto-mock toàn bộ methods
import { createMock } from '@golevelup/ts-jest';
{
  provide: UsersService,
  useValue: createMock<UsersService>(),
}

// 3. jest-mock-extended (typed mock)
import { mockDeep } from 'jest-mock-extended';
{
  provide: PrismaService,
  useValue: mockDeep<PrismaService>(),
}

// 4. Factory mock
{
  provide: ConfigService,
  useFactory: () => ({
    get: jest.fn((key: string) => {
      const config = { JWT_SECRET: 'test-secret', DB_HOST: 'localhost' };
      return config[key];
    }),
  }),
}
```

---

# 6. Testing Guards, Pipes, Interceptors

```typescript
// Testing Guard
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMock<ExecutionContext>();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny when user role not in required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { role: Role.USER },
    });

    expect(guard.canActivate(context)).toBe(false);
  });
});
```

---

# 7. E2E Testing

```typescript
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('should create user with valid data', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Hùng', email: 'hung@test.com', password: 'Pass1234' })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('hung@test.com');
        });
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Hùng', email: 'invalid', password: 'Pass1234' })
        .expect(400);
    });
  });

  describe('GET /users (authenticated)', () => {
    let token: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'Pass1234' });
      token = res.body.accessToken;
    });

    it('should return users when authenticated', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });
  });
});
```

---

# 8. Câu hỏi phỏng vấn thường gặp

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Unit test khác E2E test? | Unit: test 1 class biệt lập, mock dependencies, nhanh. E2E: test toàn flow (HTTP → controller → service → DB), dùng supertest |
| TestingModule dùng để làm gì? | Tạo module cách ly cho test. Inject mock providers thay vì dependencies thật (DB, API bên ngoài) |
| Mock provider thế nào? | `{ provide: Service, useValue: { method: jest.fn() } }` hoặc dùng jest-mock-extended/createMock cho typed mocks |
| Test guard thế nào? | Tạo mock ExecutionContext, mock Reflector trả về metadata mong muốn, gọi canActivate() và kiểm tra kết quả |
| Khi nào dùng E2E test? | Test flow end-to-end: routing đúng, validation chạy, guards chạy, response format đúng. Bổ sung cho unit test, không thay thế |
