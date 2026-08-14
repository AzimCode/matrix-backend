import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { parseDurationMs } from '../common/utils/duration.util';
import { AccountLockedException, UnauthorizedAppException } from '../common/exceptions/app.exception';
import { SafeAdminUser, TokenPair } from './interfaces/tokens.interface';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async validateCredentials(email: string, password: string): Promise<SafeAdminUser> {
    const user = await this.users.findByEmail(email);

    // Constant-shape response whether the user exists or not, to avoid
    // leaking account enumeration through timing/response differences.
    if (!user) {
      await argon2.hash(password).catch(() => undefined);
      throw new UnauthorizedAppException();
    }

    const lockState = this.users.isLocked(user);
    if (lockState.locked) {
      throw new AccountLockedException(lockState.retryAfterSeconds);
    }

    const valid = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!valid) {
      const result = await this.users.recordFailedLogin(user);
      if (result.locked) {
        throw new AccountLockedException(result.retryAfterSeconds);
      }
      throw new UnauthorizedAppException();
    }

    await this.users.recordSuccessfulLogin(user.id);

    return this.toSafeUser(user);
  }

  async issueTokenPair(user: SafeAdminUser): Promise<TokenPair> {
    const payload: AuthenticatedUser = { sub: user.id, email: user.email, role: user.role };

    const accessTtl = this.config.jwt.accessTtl;
    const refreshTtl = this.config.jwt.refreshTtl;

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.jwt.accessSecret,
      expiresIn: accessTtl,
    });

    const refreshTokenId = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: refreshTokenId },
      { secret: this.config.jwt.refreshSecret, expiresIn: refreshTtl },
    );

    const refreshExpiresAt = new Date(Date.now() + parseDurationMs(refreshTtl));
    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + parseDurationMs(accessTtl)),
      refreshTokenExpiresAt: refreshExpiresAt,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let decoded: AuthenticatedUser & { jti: string };
    try {
      decoded = await this.jwt.verifyAsync(refreshToken, { secret: this.config.jwt.refreshSecret });
    } catch {
      throw new UnauthorizedAppException('Invalid or expired refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: decoded.jti } });
    const tokenHash = this.hashToken(refreshToken);

    if (!stored || stored.revoked || stored.tokenHash !== tokenHash || stored.expiresAt < new Date()) {
      // Reuse of a revoked/rotated token indicates possible theft — revoke the whole chain.
      if (stored?.revoked) {
        await this.revokeAllForUser(decoded.sub);
        this.logger.warn(`Refresh token reuse detected for user ${decoded.sub}`);
      }
      throw new UnauthorizedAppException('Invalid or expired refresh token');
    }

    const user = await this.users.findById(decoded.sub);
    if (!user) {
      throw new UnauthorizedAppException();
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const pair = await this.issueTokenPair(this.toSafeUser(user));

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { replacedBy: this.decodeJti(pair.refreshToken) },
    });

    return pair;
  }

  async revoke(refreshToken: string): Promise<void> {
    try {
      const decoded = this.jwt.decode(refreshToken) as { jti?: string } | null;
      if (decoded?.jti) {
        await this.prisma.refreshToken.updateMany({
          where: { id: decoded.jti },
          data: { revoked: true },
        });
      }
    } catch {
      // Best-effort revocation; logout must still succeed client-side.
    }
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
  }

  private decodeJti(token: string): string {
    const decoded = this.jwt.decode(token) as { jti: string };
    return decoded.jti;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'EDITOR';
    lastLoginAt: Date | null;
    createdAt: Date;
  }): SafeAdminUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }
}
