# THE MATRIX — SYSTEM PROFILE · Backend

A production-ready, framework-structured REST API for an interactive personal portfolio/CV site. This service owns **data, auth, media, and analytics** — nothing about the Matrix visual layer (animations, glitch effects, 3D, scroll interactions) lives here. Any frontend can be swapped in without touching this backend.

## Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 20 + TypeScript (strict) |
| Framework | NestJS 10 (modular: controllers / services / DTOs / guards) |
| Database | PostgreSQL + Prisma ORM |
| Cache / rate-limit store | Redis |
| Object storage | S3-compatible (AWS S3, Cloudflare R2, or local MinIO) |
| Auth | JWT access + refresh (httpOnly cookies), Argon2id password hashing |
| Docs | OpenAPI/Swagger at `/docs` (non-production only) |
| Containerization | Docker + docker-compose |

## Architecture

```
src/
├── auth/            # login/refresh/logout/me, JWT strategy, argon2, lockout
├── users/            # AdminUser data access (internal, used by auth)
├── profile/          # singleton Profile: public + admin
├── experience/        # work experience CRUD
├── projects/         # project archive: CRUD, filtering, technologies, gallery
├── skills/           # skill matrix + relations
├── education/         # education CRUD
├── certificates/       # certificates CRUD
├── resume/           # CV/resume versions, S3-backed, signed download URLs
├── media/            # admin media library (upload/validate/delete)
├── analytics/         # privacy-first event tracking + admin overview
├── admin/            # admin dashboard aggregator
├── site/             # /api/site (frontend "one call" contract) + /api/system/status
├── health/            # /health liveness/readiness probe
├── common/            # response envelope, filters, guards, prisma, cache, storage, utils
└── config/            # typed, validated environment configuration
```

Every feature module follows the same shape: `*.service.ts` (business logic + Prisma access), a public `*.controller.ts`, an `admin-*.controller.ts` behind auth + roles, and `dto/*.ts` for validated input. There is no monolithic business-logic file.

## Getting started (Docker — recommended)

```bash
cp .env.example .env
docker compose up --build
```

This starts the API, PostgreSQL, Redis, and MinIO (as a local S3 stand-in, auto-provisioned with a bucket). The API runs its Prisma migrations automatically on boot. Once it's up:

```bash
# Apply schema + seed demo Matrix CV data (profile, experience, projects, skill matrix, education, certificates, an admin user)
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

API: `http://localhost:3000/api` · Swagger: `http://localhost:3000/docs` · MinIO console: `http://localhost:9001` (minioadmin/minioadmin)

The seed script prints a generated admin login (default `admin@matrix.dev` / `ChangeMe123!` unless overridden via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). **Change this password immediately** via a real password-rotation flow before deploying anywhere reachable.

## Getting started (local, without Docker)

Requires Node.js 20+, a running PostgreSQL, a running Redis, and an S3-compatible endpoint.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, S3_*, JWT secrets, etc.
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

## Environment variables

See [`.env.example`](.env.example) for the full list with inline comments. Everything is validated on boot (`src/config/env.validation.ts`) — the app refuses to start with a missing or malformed value (e.g. a JWT secret under 32 characters). No secret ever has a working default outside of local Docker Compose.

## API overview

All endpoints are namespaced under `/api`, except `/health`. Every response uses the same envelope:

```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

| Area | Public | Admin (JWT cookie + role) |
|---|---|---|
| Profile | `GET /profile` | `GET/PATCH /admin/profile` |
| Experience | `GET /experience`, `GET /experience/:id` | full CRUD under `/admin/experience` |
| Projects | `GET /projects`, `GET /projects/featured`, `GET /projects/:slug` | full CRUD under `/admin/projects` |
| Skills | `GET /skills`, `GET /skills/matrix`, `GET /skills/:id`, `GET /skills/:id/relations` | CRUD + relations under `/admin/skills` |
| Education / Certificates | `GET /education`, `GET /certificates` | CRUD under `/admin/education`, `/admin/certificates` |
| Resume | `GET /resume`, `GET /resume/download` (redirects to a short-lived signed URL) | upload/activate/delete under `/admin/resume` |
| Media | — | upload/delete under `/admin/media` |
| Analytics | `POST /analytics/track` (page views) | `/admin/analytics/overview`, `/admin/analytics/projects` |
| Frontend contract | `GET /site` (everything in one call), `GET /system/status` (Matrix presentation data) | `GET /admin/dashboard` |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | `GET /auth/me` |

Full request/response schemas are in Swagger at `/docs` (development only).

### `GET /api/system/status` — the Matrix hook

The backend doesn't animate anything, but it does own the state the frontend animates *from*:

```json
{
  "systemStatus": "ONLINE",
  "availability": "AVAILABLE",
  "accentColor": "#00ff41",
  "profileVersion": "2.7.1",
  "terminalMessages": ["INITIALIZING PROFILE...", "IDENTITY FOUND", "ACCESS GRANTED"]
}
```

These fields live on `Profile` and are editable via `PATCH /api/admin/profile` — no redeploy needed to change the boot sequence text or system status shown on the site.

## Security

- **Auth**: JWT access token (short-lived, httpOnly cookie) + rotating refresh token (hashed at rest, reuse triggers full session revocation for that user).
- **Passwords**: Argon2id.
- **Brute force**: progressive-delay account lockout after 5 failed attempts, plus a strict per-IP rate limit on `/auth/login`.
- **CSRF**: double-submit cookie pattern, enforced only on mutating requests from an authenticated (cookie-bearing) session — the public API (profile, projects, site) is unaffected.
- **Rate limiting**: global default limiter (`@nestjs/throttler`) plus stricter per-route limits on login and analytics tracking.
- **Input validation**: `class-validator` DTOs on every mutating endpoint, `whitelist + forbidNonWhitelisted` globally — unknown fields are rejected, not silently dropped.
- **XSS**: free-text fields (bio, project descriptions) are sanitized server-side (DOMPurify, all tags stripped) regardless of what the frontend does.
- **File uploads**: real content is sniffed from magic bytes and must match the declared MIME type (blocks a renamed `.exe`); SVGs are sanitized (scripts/event handlers stripped) before storage; size-limited; filenames sanitized.
- **Privacy**: IPs are never stored — only a salted SHA-256 hash (`IP_HASH_PEPPER`), used solely for abuse detection and analytics session bucketing. Passwords, tokens, and message bodies are redacted from application logs.
- **Errors**: a single global exception filter normalizes every error (including raw Prisma errors) into the standard envelope; stack traces and internal messages never reach the client.
- **Headers**: Helmet CSP, CORS restricted to an explicit origin whitelist, secure/httpOnly/`SameSite=strict` cookies.
- **Authorization**: every route requires a valid JWT by default (`@Public()` opts a route out explicitly); admin routes additionally require `@Roles(...)`.

## Caching

Public, rarely-changing endpoints (`/profile`, `/experience`, `/projects*`, `/skills*`, `/education`, `/certificates`, `/resume`, `/site`, `/system/status`) are cached in Redis for 5 minutes. Every admin mutation invalidates the relevant keys immediately, so edits are visible right away — content editors never have to "wait for cache" or redeploy.

## Testing

```bash
npm test                 # unit tests (mocked Prisma/services — no infra needed)
npm run test:cov         # unit tests with coverage
npm run test:e2e         # full-stack e2e — requires DATABASE_URL/REDIS_URL/S3_* pointing at real services
```

For e2e, the simplest path is running against the Docker Compose stack:

```bash
docker compose up -d postgres redis minio minio-init
npx prisma migrate deploy
npm run test:e2e
```

Coverage includes:
- **Unit**: auth (credential validation, lockout, refresh-token rotation/reuse detection), profile (private-field exclusion, caching), projects (slug uniqueness, visibility rules), skills (matrix assembly, self-relation rejection), analytics (never throws, aggregation shape), media (magic-byte sniffing, MIME-mismatch rejection, oversized-file rejection, SVG sanitization), roles guard, CSRF middleware, and the global exception filter (Prisma error mapping, no stack-trace leakage).
- **e2e**: health check, public profile shape, login (success/failure/lockout path), invalid-JWT rejection, unauthenticated admin access rejection, CSRF enforcement on mutating admin requests, project create → read → delete lifecycle, and login rate limiting.

> This scaffold was authored without a local Node.js runtime available, so the suite above has not been executed in this environment — run `npm install && npm test` to verify before deploying.

## Deployment

The app is a plain Node process reading everything from environment variables — no cloud-specific code. To deploy anywhere (a VM, ECS, Cloud Run, Railway, Fly.io, etc.):

1. Provision PostgreSQL, Redis, and an S3-compatible bucket.
2. Build the image: `docker build -t matrix-backend .`
3. Run migrations: `npx prisma migrate deploy` (or let the container's start command do it, as in `docker-compose.yml`).
4. Set all variables from `.env.example` with production values (strong random `JWT_SECRET`/`JWT_REFRESH_SECRET`/`IP_HASH_PEPPER`/`COOKIE_SECRET`, real `CORS_ORIGIN`, `NODE_ENV=production`).
5. Point your load balancer's health check at `GET /health`.
6. Terminate TLS in front of the app (load balancer/reverse proxy) — cookies are marked `Secure` automatically once `NODE_ENV=production`.

Swagger (`/docs`) is disabled automatically outside of `NODE_ENV !== production`.

## Notes on scope decisions

- **Rate-limit storage** uses `@nestjs/throttler`'s in-memory store by default, which is correct for a single-instance deployment. If you horizontally scale the API, swap in a Redis-backed throttler storage adapter so limits are shared across instances.
- **Migrations**: the full data model lives in [`prisma/schema.prisma`](prisma/schema.prisma). Generate the initial migration locally with `npx prisma migrate dev --name init` — this wasn't pre-generated in this scaffold since it requires a live database connection to produce correct SQL.
