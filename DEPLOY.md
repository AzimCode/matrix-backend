# Deploying to Railway

The stack needs four things: the API, PostgreSQL, Redis, and S3-compatible
storage for the CV and media files. Railway provides the first three; object
storage comes from Cloudflare R2, which has a free tier and no egress fees.

Render works the same way — the service names differ, the steps do not.

---

## 1. Object storage (Cloudflare R2)

Railway has no S3 service, and its disks are ephemeral: anything written to
the container's filesystem disappears on the next deploy. Uploads have to live
somewhere external.

1. Sign up at [Cloudflare](https://dash.cloudflare.com) → **R2** → **Create bucket**
   (name it e.g. `matrix-portfolio`).
2. **Manage R2 API Tokens** → **Create API Token** → *Object Read & Write*,
   scoped to that bucket.
3. Save the **Access Key ID**, **Secret Access Key**, and the **S3 API endpoint**
   (looks like `https://<account-id>.r2.cloudflarestorage.com`).

Media files are served through public URLs, so make the bucket public:
**Settings → Public access → Allow**, and note the public URL.

The CV is different — it is fetched through a short-lived signed URL, so it
stays private regardless of that setting.

---

## 2. Backend on Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
   → pick `matrix-backend`. Railway detects the Dockerfile automatically.
2. In the project: **+ New** → **Database** → **Add PostgreSQL**.
3. **+ New** → **Database** → **Add Redis**.
4. Open the API service → **Variables** and set:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — Railway substitutes it |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `JWT_SECRET` | your saved secret |
| `JWT_REFRESH_SECRET` | your saved secret |
| `IP_HASH_PEPPER` | your saved secret — see the warning below |
| `COOKIE_SECRET` | your saved secret |
| `S3_ENDPOINT` | the R2 endpoint |
| `S3_BUCKET` | `matrix-portfolio` |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | the R2 token pair |
| `S3_REGION` | `auto` |
| `S3_FORCE_PATH_STYLE` | `true` |
| `CORS_ORIGIN` | the frontend URL, filled in at step 4 |
| `TRUST_PROXY` | `1` |
| `RATE_LIMIT_MAX` | `100` |
| `RATE_LIMIT_WINDOW` | `60` |

`TRUST_PROXY=1` is not optional here. Railway puts a load balancer in front of
the app, so without it every visitor looks like the same client and they all
share one rate-limit bucket — one busy visitor throttles the whole site.

Do **not** set `SWAGGER_ENABLED`. On a public deployment that would expose the
admin API documentation to everyone.

5. **Settings → Networking → Generate Domain** to get the API URL.

### Migrations

`docker-compose.yml` runs migrations in a separate one-shot container, which
Railway has no equivalent for. Run them once from your machine, pointing at the
production database (copy `DATABASE_URL` from the Postgres service → Connect):

```bash
$env:DATABASE_URL="<production-url>"; npx.cmd prisma migrate deploy
```

(PowerShell has no inline `VAR=value cmd` syntax, and `npx` is a .ps1 that the
default execution policy blocks — hence `$env:` and the `.cmd` suffix. In bash
it would be `DATABASE_URL="..." npx prisma migrate deploy`.)

### The first admin account

The seed script creates demo content *and* an admin user. On production you
want the account without Alexander Ivanov's fake projects, so create it
directly instead of seeding:

```bash
$env:DATABASE_URL="<production-url>"; npx.cmd ts-node prisma/create-admin.ts you@example.com 'YourStrongPassword123'
```

Then add your real content through the API.

If you would rather start from the demo data and edit it, run
`$env:DATABASE_URL="<production-url>"; npx.cmd prisma db seed` instead — but
change the seeded password immediately via `PATCH /api/auth/password`.

---

## 3. Frontend on Railway

1. **+ New** → **GitHub Repo** → `matrix-frontend`.
2. Variables: `VITE_API_BASE_URL` = `https://<your-api-domain>/api`
   (note the `/api` suffix — the backend serves everything under it).
3. Settings → Build: `npm run build`, publish directory `dist`.
4. Generate a domain, then go back and set the backend's `CORS_ORIGIN` to that
   exact URL — scheme included, no trailing slash. The browser blocks the API
   otherwise.

Vite inlines `VITE_*` variables at build time, so changing the API URL later
requires a redeploy, not just a restart.

---

## 4. After deploying

Check the API is healthy — this reports the database, Redis, and storage
separately, so a failure points straight at the culprit:

```bash
curl https://<your-api-domain>/health
```

Then confirm the site loads its content and submit the contact form once to
verify writes reach the database.

---

## Costs

Railway's free credit covers a small project; Postgres and Redis together are
the bulk of it. R2 is free below 10 GB. Expect roughly $5/month once the free
credit runs out, less if the site is idle.

---

## Keep these safe

`.env` is deliberately not in git, so these exist only on your machine and in
Railway's variables. Put them in a password manager:

- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` — losing them signs
  everyone out; regenerating is otherwise harmless.
- `IP_HASH_PEPPER` — **changing this breaks analytics continuity.** Visitor
  hashes are derived from it, so the same person counts as a new visitor
  afterwards and historical sessions stop matching new ones.
- The admin email and password.
- The R2 token pair — Cloudflare shows the secret only once.

## Backups

Railway snapshots Postgres on paid plans. Regardless, a manual dump before any
risky change is cheap:

```bash
pg_dump "<production-url>" > backup-$(date +%F).sql
```

The database holds everything editable on the site. Files in R2 are separate
and are not covered by a Postgres dump.
