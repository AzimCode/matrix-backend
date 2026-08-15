import { Test } from '@nestjs/testing';
import { AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  AppException,
  ConflictAppException,
  UnauthorizedAppException,
} from '../common/exceptions/app.exception';

describe('UsersService — account management', () => {
  let service: UsersService;
  let prisma: any;

  const admin = {
    id: 'admin-1',
    email: 'admin@matrix.dev',
    role: AdminRole.ADMIN,
    passwordHash: 'hash',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  beforeEach(async () => {
    prisma = {
      adminUser: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      refreshToken: { updateMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('rejects a duplicate email', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(admin);

      await expect(service.create('admin@matrix.dev', 'Password1234', AdminRole.EDITOR)).rejects.toThrow(
        ConflictAppException,
      );
    });

    it('stores a hash, never the raw password, and omits it from the response', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);
      prisma.adminUser.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...admin, ...data, id: 'new-1' }),
      );

      const result = await service.create('New@Matrix.dev', 'Password1234', AdminRole.EDITOR);

      const stored = prisma.adminUser.create.mock.calls[0][0].data;
      expect(stored.passwordHash).not.toBe('Password1234');
      expect(await argon2.verify(stored.passwordHash, 'Password1234')).toBe(true);
      expect(stored.email).toBe('new@matrix.dev'); // normalized
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('lockout protection', () => {
    it('refuses to delete the account you are signed in with', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(admin);

      await expect(service.remove('admin-1', 'admin-1')).rejects.toThrow(AppException);
      expect(prisma.adminUser.delete).not.toHaveBeenCalled();
    });

    it('refuses to delete the last remaining ADMIN', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(admin);
      prisma.adminUser.count.mockResolvedValue(0); // no other admins

      await expect(service.remove('admin-1', 'someone-else')).rejects.toThrow(AppException);
      expect(prisma.adminUser.delete).not.toHaveBeenCalled();
    });

    it('allows deleting an admin when another one remains', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(admin);
      prisma.adminUser.count.mockResolvedValue(1);

      await service.remove('admin-1', 'someone-else');

      expect(prisma.adminUser.delete).toHaveBeenCalledWith({ where: { id: 'admin-1' } });
    });

    it('refuses to strip your own admin role', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(admin);

      await expect(service.updateRole('admin-1', AdminRole.EDITOR, 'admin-1')).rejects.toThrow(
        AppException,
      );
      expect(prisma.adminUser.update).not.toHaveBeenCalled();
    });

    it('refuses to demote the last remaining ADMIN', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(admin);
      prisma.adminUser.count.mockResolvedValue(0);

      await expect(service.updateRole('admin-1', AdminRole.EDITOR, 'other-admin')).rejects.toThrow(
        AppException,
      );
    });
  });

  describe('changeOwnPassword', () => {
    it('rejects a wrong current password', async () => {
      const hash = await argon2.hash('RealPassword123');
      prisma.adminUser.findUnique.mockResolvedValue({ ...admin, passwordHash: hash });

      await expect(
        service.changeOwnPassword('admin-1', 'WrongPassword123', 'NewPassword1234'),
      ).rejects.toThrow(UnauthorizedAppException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('revokes every existing session once the password changes', async () => {
      const hash = await argon2.hash('RealPassword123');
      prisma.adminUser.findUnique.mockResolvedValue({ ...admin, passwordHash: hash });

      await service.changeOwnPassword('admin-1', 'RealPassword123', 'NewPassword1234');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'admin-1', revoked: false },
          data: { revoked: true },
        }),
      );
    });
  });
});
