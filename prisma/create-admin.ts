/**
 * Creates a single ADMIN account, without the demo content the seed script
 * inserts. Intended for bootstrapping a production database.
 *
 *   npx.cmd ts-node prisma/create-admin.ts you@example.com 'YourPassword123'
 *
 * DATABASE_URL is read from the environment (or .env), so point it at the
 * target database before running.
 */
import { PrismaClient, AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';

const MIN_PASSWORD_LENGTH = 12;

async function main(): Promise<void> {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error('Usage: ts-node prisma/create-admin.ts <email> <password>');
    process.exit(1);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const normalized = email.toLowerCase();
    const existing = await prisma.adminUser.findUnique({ where: { email: normalized } });
    if (existing) {
      console.error(`An account already exists for ${normalized}.`);
      process.exit(1);
    }

    await prisma.adminUser.create({
      data: {
        email: normalized,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        role: AdminRole.ADMIN,
      },
    });

    console.log(`Created ADMIN account: ${normalized}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
