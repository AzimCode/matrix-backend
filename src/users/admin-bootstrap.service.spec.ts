import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { UsersService } from './users.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { PASSWORD_MAX_LENGTH } from './dto/password.rules';

describe('AdminBootstrapService', () => {
  let service: AdminBootstrapService;
  let prisma: {
    adminUser: { count: jest.Mock; create: jest.Mock; findUnique: jest.Mock };
  };
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    prisma = {
      adminUser: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'user-1',
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          }),
        ),
      },
    };
    // The real UsersService is wired in deliberately: the point of routing the
    // bootstrap through it is that both paths create an account identically,
    // and a mock would assert nothing about that.
    const moduleRef = await Test.createTestingModule({
      providers: [AdminBootstrapService, UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AdminBootstrapService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const setEnv = (email?: string, password?: string) => {
    if (email === undefined) delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    else process.env.BOOTSTRAP_ADMIN_EMAIL = email;
    if (password === undefined) delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    else process.env.BOOTSTRAP_ADMIN_PASSWORD = password;
  };

  it('does nothing when the variables are absent', async () => {
    setEnv(undefined, undefined);

    await service.onModuleInit();

    expect(prisma.adminUser.create).not.toHaveBeenCalled();
  });

  it('creates the first admin with a hashed password and normalized email', async () => {
    setEnv('Owner@Example.com', 'BootstrapPass123');

    await service.onModuleInit();

    const data = prisma.adminUser.create.mock.calls[0][0].data;
    expect(data.email).toBe('owner@example.com');
    expect(data.role).toBe('ADMIN');
    expect(data.passwordHash).not.toBe('BootstrapPass123');
    expect(await argon2.verify(data.passwordHash, 'BootstrapPass123')).toBe(true);
  });

  it('never resurrects an account once any admin exists', async () => {
    prisma.adminUser.count.mockResolvedValue(1);
    setEnv('owner@example.com', 'BootstrapPass123');

    await service.onModuleInit();

    expect(prisma.adminUser.create).not.toHaveBeenCalled();
  });

  it('refuses a password that would not pass the API rules', async () => {
    setEnv('owner@example.com', 'alllowercase1');

    await service.onModuleInit();

    expect(prisma.adminUser.create).not.toHaveBeenCalled();
  });

  it('refuses a password that is too short', async () => {
    setEnv('owner@example.com', 'Short1');

    await service.onModuleInit();

    expect(prisma.adminUser.create).not.toHaveBeenCalled();
  });

  it('refuses a password longer than the API allows', async () => {
    setEnv('owner@example.com', `Aa1${'x'.repeat(PASSWORD_MAX_LENGTH)}`);

    await service.onModuleInit();

    expect(prisma.adminUser.create).not.toHaveBeenCalled();
  });
});
