import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AdminRole } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Full-stack e2e suite. Requires a real Postgres + Redis + S3-compatible
 * storage reachable via the env vars the app is configured with (see
 * README → "Running tests" for the docker compose command that provides
 * these). Not run as part of `npm test` — use `npm run test:e2e`.
 */
describe('THE MATRIX API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: any;

  const adminEmail = `e2e-admin-${Date.now()}@matrix.dev`;
  const adminPassword = 'SuperSecret123!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    httpServer = app.getHttpServer();
    prisma = app.get(PrismaService);

    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
        role: AdminRole.ADMIN,
      },
    });
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({ where: { email: adminEmail } });
    await app.close();
  });

  describe('GET /health', () => {
    it('reports the status of the API, database, redis, and storage', async () => {
      const res = await request(httpServer).get('/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          database: expect.any(String),
          redis: expect.any(String),
          storage: expect.any(String),
        }),
      );
    });
  });

  describe('GET /api/profile', () => {
    it('returns the public profile without leaking the phone number', async () => {
      const res = await request(httpServer).get('/api/profile').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).not.toHaveProperty('phone');
    });
  });

  describe('Auth flow', () => {
    it('rejects a bad password with a generic 401', async () => {
      const res = await request(httpServer)
        .post('/api/auth/login')
        .send({ email: adminEmail, password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed request bodies with a validation error', async () => {
      const res = await request(httpServer).post('/api/auth/login').send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('logs in with correct credentials and sets httpOnly session cookies', async () => {
      const res = await request(httpServer)
        .post('/api/auth/login')
        .send({ email: adminEmail, password: adminPassword })
        .expect(200);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c) => c.startsWith('access_token=') && c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some((c) => c.startsWith('refresh_token=') && c.includes('HttpOnly'))).toBe(true);
      expect(res.body.data.user.email).toBe(adminEmail);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('rejects an admin route with no session at all', async () => {
      await request(httpServer).get('/api/admin/profile').expect(401);
    });

    it('rejects a tampered/invalid JWT', async () => {
      await request(httpServer)
        .get('/api/admin/profile')
        .set('Cookie', ['access_token=not-a-real-jwt.definitely.invalid'])
        .expect(401);
    });

    it('allows an authenticated admin request with a valid session cookie', async () => {
      const login = await request(httpServer).post('/api/auth/login').send({ email: adminEmail, password: adminPassword });
      const cookies = extractCookiePairs(login.headers['set-cookie'] as unknown as string[]);

      const res = await request(httpServer).get('/api/admin/profile').set('Cookie', cookies).expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('eventually throttles repeated login attempts from the same client', async () => {
      const results: number[] = [];
      for (let i = 0; i < 7; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await request(httpServer)
          .post('/api/auth/login')
          .send({ email: adminEmail, password: 'definitely-not-the-password' });
        results.push(res.status);
      }

      expect(results).toContain(429);
    });
  });

  describe('Project CRUD (admin)', () => {
    it('supports the full create → read → delete lifecycle behind CSRF + auth', async () => {
      const login = await request(httpServer).post('/api/auth/login').send({ email: adminEmail, password: adminPassword });
      const sessionCookies = extractCookiePairs(login.headers['set-cookie'] as unknown as string[]);

      const primed = await request(httpServer).get('/api/admin/profile').set('Cookie', sessionCookies);
      const csrfCookie = extractCookiePairs(primed.headers['set-cookie'] as unknown as string[] | undefined).find((c) =>
        c.startsWith('csrf_token='),
      );
      const allCookies = [...sessionCookies, ...(csrfCookie ? [csrfCookie] : [])];
      const csrfToken = csrfCookie?.split('=')[1];

      const created = await request(httpServer)
        .post('/api/admin/projects')
        .set('Cookie', allCookies)
        .set('X-CSRF-Token', csrfToken ?? '')
        .send({ title: 'E2E Test Project', description: 'Created by the e2e suite', year: 2026 })
        .expect(201);

      const projectId = created.body.data.id;
      expect(created.body.data.slug).toBe('e2e-test-project');

      await request(httpServer).get(`/api/projects/${created.body.data.slug}`).expect(200);

      await request(httpServer)
        .delete(`/api/admin/projects/${projectId}`)
        .set('Cookie', allCookies)
        .set('X-CSRF-Token', csrfToken ?? '')
        .expect(200);
    });

    it('rejects a mutating admin request missing the CSRF header', async () => {
      const login = await request(httpServer).post('/api/auth/login').send({ email: adminEmail, password: adminPassword });
      const sessionCookies = extractCookiePairs(login.headers['set-cookie'] as unknown as string[]);

      const res = await request(httpServer)
        .post('/api/admin/projects')
        .set('Cookie', sessionCookies)
        .send({ title: 'Should Fail', description: 'No CSRF token', year: 2026 });

      expect(res.status).toBe(403);
    });
  });
});

function extractCookiePairs(setCookieHeaders: string[] | undefined): string[] {
  if (!setCookieHeaders) {
    return [];
  }
  return setCookieHeaders.map((header) => header.split(';')[0]);
}
