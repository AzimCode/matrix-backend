import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { hashPassword } from './users.service';

/**
 * Creates the very first ADMIN from environment variables.
 *
 * Managed platforms give no shell into the container, so there is otherwise no
 * way to seed an account: the admin API needs an admin to call it, and the
 * database is only reachable from inside the private network. This closes that
 * loop without exposing the database publicly.
 *
 * Runs only when the table is completely empty — not merely when that email is
 * missing — so a deliberately deleted account cannot be silently resurrected by
 * leftover environment variables.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!email || !password) {
      return;
    }

    const existing = await this.prisma.adminUser.count();
    if (existing > 0) {
      this.logger.log(
        `BOOTSTRAP_ADMIN_* is set but ${existing} admin account(s) already exist — skipping. ` +
          'Remove those variables once the first account is confirmed.',
      );
      return;
    }

    const problems = passwordProblems(password);
    if (problems.length) {
      this.logger.error(`Refusing to bootstrap an admin: password needs ${problems.join(', ')}.`);
      return;
    }

    await this.prisma.adminUser.create({
      data: { email, passwordHash: await hashPassword(password), role: AdminRole.ADMIN },
    });

    this.logger.warn(
      `Bootstrapped the first ADMIN account (${email}). ` +
        'Delete BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD now — leaving a password ' +
        'in the environment is a standing risk, and it serves no further purpose.',
    );
  }
}

/** Same rules as CreateAdminUserDto, so a bootstrapped password is never weaker. */
function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 12) problems.push('at least 12 characters');
  if (!/[a-z]/.test(password)) problems.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) problems.push('an uppercase letter');
  if (!/[0-9]/.test(password)) problems.push('a digit');
  return problems;
}
