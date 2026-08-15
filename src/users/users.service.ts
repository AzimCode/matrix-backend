import { HttpStatus, Injectable } from '@nestjs/common';
import { AdminRole, AdminUser } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  AppException,
  ConflictAppException,
  NotFoundAppException,
  UnauthorizedAppException,
} from '../common/exceptions/app.exception';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_BASE_MS = 30_000; // 30s, doubles per additional attempt past threshold

/** The shape returned to clients — never carries passwordHash. */
export interface PublicAdminUser {
  id: string;
  email: string;
  role: AdminRole;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicAdminUser(user: AdminUser): PublicAdminUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { id } });
  }

  async findAll(): Promise<PublicAdminUser[]> {
    const users = await this.prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map(toPublicAdminUser);
  }

  async create(email: string, password: string, role: AdminRole): Promise<PublicAdminUser> {
    const normalized = email.toLowerCase();
    if (await this.findByEmail(normalized)) {
      throw new ConflictAppException('An admin user with this email already exists');
    }
    const user = await this.prisma.adminUser.create({
      data: { email: normalized, passwordHash: await hashPassword(password), role },
    });
    return toPublicAdminUser(user);
  }

  async updateRole(id: string, role: AdminRole, actingUserId: string): Promise<PublicAdminUser> {
    const user = await this.requireUser(id);

    // Demoting yourself, or the last remaining ADMIN, would leave nobody able
    // to manage users — the account would have to be fixed straight in the DB.
    if (user.role === AdminRole.ADMIN && role !== AdminRole.ADMIN) {
      if (id === actingUserId) {
        throw new AppException(
          'CANNOT_DEMOTE_SELF',
          'You cannot remove your own admin role',
          HttpStatus.CONFLICT,
        );
      }
      await this.assertNotLastAdmin(id);
    }

    const updated = await this.prisma.adminUser.update({ where: { id }, data: { role } });
    return toPublicAdminUser(updated);
  }

  async remove(id: string, actingUserId: string): Promise<void> {
    const user = await this.requireUser(id);
    if (id === actingUserId) {
      throw new AppException(
        'CANNOT_DELETE_SELF',
        'You cannot delete the account you are signed in with',
        HttpStatus.CONFLICT,
      );
    }
    if (user.role === AdminRole.ADMIN) {
      await this.assertNotLastAdmin(id);
    }
    await this.prisma.adminUser.delete({ where: { id } });
  }

  /** Self-service change: proves ownership with the current password. */
  async changeOwnPassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.requireUser(id);
    const valid = await argon2.verify(user.passwordHash, currentPassword).catch(() => false);
    if (!valid) {
      throw new UnauthorizedAppException('Current password is incorrect');
    }
    await this.setPassword(id, newPassword);
  }

  /** Administrative reset: no current password, so it is ADMIN-only at the controller. */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.requireUser(id);
    await this.setPassword(id, newPassword);
  }

  private async setPassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.adminUser.update({
        where: { id },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      // Any session opened with the old password is no longer trustworthy.
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revoked: false },
        data: { revoked: true },
      }),
    ]);
  }

  private async requireUser(id: string): Promise<AdminUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundAppException('Admin user');
    }
    return user;
  }

  private async assertNotLastAdmin(id: string): Promise<void> {
    const otherAdmins = await this.prisma.adminUser.count({
      where: { role: AdminRole.ADMIN, id: { not: id } },
    });
    if (otherAdmins === 0) {
      throw new AppException(
        'LAST_ADMIN',
        'This is the only remaining admin account; promote another user first',
        HttpStatus.CONFLICT,
      );
    }
  }

  async recordSuccessfulLogin(id: string): Promise<void> {
    await this.prisma.adminUser.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  }

  /** Progressive-delay lockout: doubles the lock window per attempt beyond the threshold. */
  async recordFailedLogin(user: AdminUser): Promise<{ locked: boolean; retryAfterSeconds: number }> {
    const attempts = user.failedLoginAttempts + 1;
    let lockedUntil: Date | null = null;
    let retryAfterSeconds = 0;

    if (attempts >= LOCKOUT_THRESHOLD) {
      const overBy = attempts - LOCKOUT_THRESHOLD;
      const delayMs = LOCKOUT_BASE_MS * Math.pow(2, overBy);
      lockedUntil = new Date(Date.now() + delayMs);
      retryAfterSeconds = Math.ceil(delayMs / 1000);
    }

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });

    return { locked: lockedUntil !== null, retryAfterSeconds };
  }

  isLocked(user: AdminUser): { locked: boolean; retryAfterSeconds: number } {
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return { locked: true, retryAfterSeconds: Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000) };
    }
    return { locked: false, retryAfterSeconds: 0 };
  }
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}
