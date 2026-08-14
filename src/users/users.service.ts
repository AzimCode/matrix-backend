import { Injectable } from '@nestjs/common';
import { AdminUser } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_BASE_MS = 30_000; // 30s, doubles per additional attempt past threshold

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { id } });
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
