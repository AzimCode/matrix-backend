import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { AccountLockedException, UnauthorizedAppException } from '../common/exceptions/app.exception';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<UsersService>;
  let prisma: { refreshToken: Record<string, jest.Mock> };
  let jwt: jest.Mocked<JwtService>;

  const baseUser = {
    id: 'user-1',
    email: 'admin@matrix.dev',
    role: 'ADMIN' as const,
    lastLoginAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
      recordFailedLogin: jest.fn(),
      isLocked: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    prisma = {
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    const configService = {
      jwt: { accessSecret: 'access-secret', refreshSecret: 'refresh-secret', accessTtl: '15m', refreshTtl: '7d' },
    } as unknown as AppConfigService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: AppConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('validateCredentials', () => {
    it('throws UnauthorizedAppException for a non-existent user without leaking which field was wrong', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(service.validateCredentials('nobody@matrix.dev', 'whatever')).rejects.toThrow(
        UnauthorizedAppException,
      );
    });

    it('throws AccountLockedException when the account is currently locked', async () => {
      users.findByEmail.mockResolvedValue({ ...baseUser, passwordHash: 'hash', failedLoginAttempts: 5 } as any);
      users.isLocked.mockReturnValue({ locked: true, retryAfterSeconds: 30 });

      await expect(service.validateCredentials(baseUser.email, 'wrong')).rejects.toThrow(AccountLockedException);
    });

    it('records a failed attempt and rejects on wrong password', async () => {
      const hash = await argon2.hash('correct-password');
      users.findByEmail.mockResolvedValue({ ...baseUser, passwordHash: hash, failedLoginAttempts: 0 } as any);
      users.isLocked.mockReturnValue({ locked: false, retryAfterSeconds: 0 });
      users.recordFailedLogin.mockResolvedValue({ locked: false, retryAfterSeconds: 0 });

      await expect(service.validateCredentials(baseUser.email, 'wrong-password')).rejects.toThrow(
        UnauthorizedAppException,
      );
      expect(users.recordFailedLogin).toHaveBeenCalled();
    });

    it('resolves and resets attempts on correct password', async () => {
      const hash = await argon2.hash('correct-password');
      users.findByEmail.mockResolvedValue({ ...baseUser, passwordHash: hash, failedLoginAttempts: 2 } as any);
      users.isLocked.mockReturnValue({ locked: false, retryAfterSeconds: 0 });

      const result = await service.validateCredentials(baseUser.email, 'correct-password');

      expect(result.email).toBe(baseUser.email);
      expect(users.recordSuccessfulLogin).toHaveBeenCalledWith(baseUser.id);
    });
  });

  describe('issueTokenPair', () => {
    it('persists a hashed refresh token record scoped to the user', async () => {
      prisma.refreshToken.create.mockResolvedValue({});

      const pair = await service.issueTokenPair(baseUser);

      expect(pair.accessToken).toBe('signed.jwt.token');
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: baseUser.id }) }),
      );
    });
  });

  describe('refresh', () => {
    it('rejects an unknown or already-consumed refresh token', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: baseUser.id, email: baseUser.email, role: baseUser.role, jti: 'jti-1' });
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('some.refresh.token')).rejects.toThrow(UnauthorizedAppException);
    });

    it('revokes the whole chain when a revoked token is replayed (theft detection)', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: baseUser.id, email: baseUser.email, role: baseUser.role, jti: 'jti-1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'jti-1',
        revoked: true,
        tokenHash: 'irrelevant',
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(service.refresh('replayed.refresh.token')).rejects.toThrow(UnauthorizedAppException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: baseUser.id, revoked: false } }),
      );
    });
  });
});
