# BigSavingsDays — The High-Converting Deal & Affiliate Link Platform

An original URL-shortener and Deals Hub platform built with Next.js 16, React 19 and SQLite.
Redirects, discount badges, analytics, QR codes, Deals Hub bio pages, custom domains, REST API and an admin panel.

**Domain**: `https://bigsavingsdays.com/`

> Designed specifically for affiliate marketers, Telegram deal channels, WhatsApp communities, and shopping influencers to maximize click-through rates (CTR) and buyer trust.

For the hardening checklist and verification evidence, see [`PRODUCTION.md`](./PRODUCTION.md).

---

## Run locally

```bash
cd velo
npm install
npm run dev
```

Open http://localhost:3000. Development mode creates and seeds `data/velo.db`
(demo users, links and clicks) so the dashboard is not empty.

Demo accounts in development:

| Role | Email | Password |
| --- | --- | --- |
| Creator | `demo@velo.link` | `demo1234` |
| Admin | `admin@velo.link` | `admin1234` |

`/demo` signs straight into the creator workspace.

### Tests

```bash
npm test          # unit tests (crypto, URLs, slugs, CSV, user agent)
npx tsc --noEmit  # typecheck
npm run build     # production build (standalone output)
npm run smoke     # end-to-end smoke against a running server (see below)
```

`npm run smoke` drives the real application over HTTP, including its server-action
forms. It expects a running server and configuration through environment variables:

```bash
BASE_URL=http://localhost:3000 \
EXPECT_DEMO=0 \
EXPECT_PROD=0 \
DOMAIN_MODE=manual \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='…' \
DB_PATH=./data/velo.db \
npm run smoke
```

`EXPECT_DEMO=1` asserts the demo routes exist. `DOMAIN_MODE=dns` asserts that a domain
without a TXT record stays pending. `EXPECT_PROD=1` asserts HSTS and Secure cookies.

---

## Production deployment

Target: **one Node.js instance + a persistent volume** behind a TLS-terminating reverse
proxy or CDN. SQLite in WAL mode handles this workload well. Read
[Scaling](#scaling) before running more than one instance.

### 1. Configuration

Copy `.env.example` to `.env` and set at least:

| Variable | Required | Notes |
| --- | --- | --- |
| `APP_URL` | yes | Public `https://` origin used for links and cookies |
| `SESSION_SECRET` | yes | ≥ 32 chars, signs password-unlock cookies. `openssl rand -base64 32` |
| `IP_HASH_SALT` | yes | ≥ 16 chars, salts visitor IP hashes. `openssl rand -hex 24` |
| `DATABASE_PATH` | yes | Absolute path on the persistent volume, e.g. `/data/velo.db` |
| `DEMO_MODE` | no | Defaults to off in production. Keep it off |
| `SEED_DEMO` | no | Defaults to off in production. Must be `0`; boot fails otherwise |
| `TRUST_PROXY` | no | `1` (default) behind a proxy that sets `X-Forwarded-For` |
| `DOMAIN_VERIFY_MODE` | no | `dns` (default in production) or `manual` for local demos |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | multi-instance | Must be identical on every instance |

Production boot **fails fast** if `APP_URL`, `SESSION_SECRET`, `IP_HASH_SALT` are missing or
`SEED_DEMO=1`. Section headers in `.env.example` list the exact rules.

### 2. Build and start

```bash
npm ci
npm run build
npm start          # honours PORT (default 3000)
```

The build uses `output: "standalone"`. To run the traced bundle directly:

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
PORT=3000 node .next/standalone/server.js
```

### 3. First admin

There are no default accounts in production. Create one after the database exists:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-very-long-password' \
  npm run admin:create -- "Your Name"
```

The password must be 12–200 characters. If the email already exists, the account is
promoted to admin and its password is reset.

### 4. Docker

```bash
docker compose up -d --build
```

The image runs as a non-root user, stores SQLite on the `velo-data` volume at
`/data/velo.db`, and exposes port 3000 on loopback only. Put Caddy/nginx/Traefik in front
for TLS:

```caddyfile
velo.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

Docker is optional; the standalone server is the supported runtime.

### 5. Reverse proxy requirements

Forward `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, and (for the CDN) `CF-IPCountry` or
`X-Vercel-IP-Country`. TLS terminates at the proxy. The app sends HSTS, a strict CSP, frame
denial and `nosniff` on every response.

Do not cache HTML or API responses. `/api/health` is `no-store` by design.

---

## Custom domains

1. User adds `go.brand.com` in **Dashboard → Domains** (Pro/Business).
2. DNS: `CNAME go.brand.com → <your server hostname>`.
3. DNS: `TXT _velo.go.brand.com → velo-verify-…` (shown in the UI).
4. **Verify DNS** performs a real `resolveTxt` lookup and only marks the domain verified
   when the token matches. `DOMAIN_VERIFY_MODE=manual` skips the lookup and is intended
   for local development and CI only.
5. Requests whose `Host`/`X-Forwarded-Host` matches a verified domain resolve only links
   attached to that domain. Unverified or unknown hosts return 404; the primary app host
   serves only links with no custom domain.

The app verifies ownership. Your proxy or certificate manager issues TLS certificates.

---

## Backups, restore, maintenance

All scripts use `DATABASE_PATH` (default `./data/velo.db`).

```bash
npm run db:backup                       # online, consistent SQLite backup -> backups/
npm run db:backup -- /secure/velo.db    # explicit destination
npm run db:maintain                     # expired sessions, rate limits, old audit rows
CLICK_RETENTION_DAYS=365 npm run db:maintain -- --vacuum
npm run db:restore -- backups/velo-2026-11-21T….db --force
```

The backup script runs `PRAGMA integrity_check` and prints row counts. The restore script
refuses to overwrite without `--force` and validates the backup first. **Stop the app
before restoring.** Schedule a nightly backup and copy it off the volume; a backup on the
same disk is not a backup.

For point-in-time recovery, also snapshot the volume. WAL mode means `-wal` and `-shm`
files may exist; the backup API handles them correctly.

---

## Scaling

One Node process is the supported topology. SQLite serialises writes, which is fine for
link creation and click inserts at this scale.

Before running multiple instances:

- Move rate limits and sessions to a shared store (Postgres/Redis), or route all writes to
  one SQLite writer.
- Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` identically on all instances, otherwise server
  actions fail with “Failed to find Server Action”.
- Use a shared database, not a per-container SQLite file. Do not put SQLite on NFS.
- Put click ingestion behind a queue if you exceed roughly a few hundred writes/second.

---

## Security model

- Passwords: scrypt with a per-user salt; login timing-equalised with a dummy hash.
- Sessions: random 192-bit tokens, HttpOnly + SameSite=Lax + Secure in production, capped
  per account, expired sessions pruned. Password changes revoke other sessions.
- Rate limits: SQLite fixed windows for login, signup, unlock, admin login, contact, demo
  and API keys; they survive restarts and prune themselves.
- Unlock cookies: HMAC-signed, bound to the link's current password hash, expire in 30
  minutes. A forged `=1` cookie does nothing.
- Input: destination URLs restricted to `http`/`https` and re-checked on every redirect;
  slugs validated against a reserved list; JSON bodies capped at 32 KB.
- CSRF: SameSite cookies plus an Origin check on cookie-authenticated write APIs.
- Headers: CSP, HSTS (production), `frame-ancestors 'none'`, `X-Frame-Options: DENY`,
  referrer and permissions policies, `nosniff`.
- Audit log: admin login/mutations, domain changes and account security events, with a
  salted IP hash.
- Demo routes are 404 unless `DEMO_MODE=1`; demo seeding is off unless `SEED_DEMO=1`.

Operational expectations: keep Node and dependencies patched, run `npm audit --omit=dev`,
serve only over TLS, restrict `/admin` at the proxy if you can, and protect `.env` and the
database file (`chmod 600`).

---

## Operator integrations (not included)

The app does not pretend these exist. It degrades safely without them:

- **Transactional email** — no provider is configured, so verification, password reset and
  contact notifications are not sent. The contact endpoint validates and rate limits, then
  logs; wire your provider in `src/app/contact/actions.ts`.
- **Card payments** — no card data is handled. Assign plans in the admin panel. Add a
  provider webhook if you need self-serve billing.
- **Telegram / social sign-in** — not implemented; email + password is the auth path.
- **TLS issuance and DNS writes** — your proxy or certificate manager handles certificates;
  the app only verifies TXT records.

---

## Project layout

```
src/app          routes, server actions, API handlers
src/components   UI
src/lib          db, auth, crypto, rate limiting, domains, CSV, config
scripts          smoke test, admin bootstrap, backup, restore, maintenance
tests            unit tests (node:test)
```

The SQLite schema is created and migrated automatically on first request. `PRAGMA
user_version` is set so future migrations can be additive.
