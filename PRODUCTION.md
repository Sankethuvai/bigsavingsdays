# Production readiness plan — Velo

Goal: make Velo safe and operable on a real domain, with every claim in the UI backed by
working code or explicitly documented as a third-party integration.

Environment target: single Node.js instance + persistent volume (SQLite/WAL) behind a
TLS-terminating reverse proxy or CDN. Scaling path documented in `README.md`.

Legend: `[x]` done and verified · `[~]` done, needs an external service or tool · `[ ]` pending

---

## P0 — Configuration and boot safety

- [x] Typed runtime config (`src/lib/env.ts`): app URL, session secret, IP salt, demo mode,
      seed mode, proxy trust, domain verification mode.
- [x] Fail fast in production when required secrets are missing (`src/instrumentation.ts`).
      Verified: missing `APP_URL`/`SESSION_SECRET`/`IP_HASH_SALT` exits 1 before serving.
- [x] Demo data and demo routes are impossible to enable accidentally in production.
      `SEED_DEMO=1` in production exits 1; `/demo` and `/api/demo` return 404 unless
      `DEMO_MODE=1`.
- [x] `.env.example` documents every variable; no real secrets in the repo.
- [x] Solid defaults for dev so `npm run dev` still works with zero setup.

## P1 — Security hardening

- [x] Password unlock cookie is signed (HMAC) and cannot be forged; secure/HttpOnly/SameSite.
      Verified with forged `=1` and tampered-signature cookies.
- [x] Login, signup, unlock, admin login, contact, QR and demo endpoints are rate limited
      (SQLite-backed, survives restarts, prunes itself).
- [x] Login is timing-equalized and does not reveal whether an email exists.
- [x] Open-redirect on `?next=` closed; redirect destinations re-validated at click time.
- [x] Password inputs bounded (min 8, max 200) to prevent scrypt DoS.
- [x] Expired sessions cleaned up; all sessions revoked on password change.
- [x] Signup respects the admin `signups_open` setting.
- [x] Demo routes (`/demo`, `/api/demo`) return 404 unless explicitly enabled.
- [x] Security headers: CSP, HSTS (prod), frame denial, referrer policy, permissions policy.
- [x] API keys hashed, rate limited per key (120/min, `429` + `Retry-After`).
- [x] Admin login generic errors; admin mutations written to an audit log.
- [x] CSV export neutralises formula injection.
- [x] Write APIs require a same-origin request; JSON bodies are capped at 32 KB.

## P2 — Data and product correctness

- [x] DB pragmas (`busy_timeout`, `synchronous`), extra indexes, startup maintenance.
- [x] Custom domains actually route links by Host, not just show DNS records.
- [x] Real DNS TXT verification in production (manual mode for local demos).
- [x] API: pagination, `limit`/`offset`, stable ordering, status codes, race-safe slug creation.
- [x] Link URLs accept only `http`/`https`; stored destinations re-checked on every redirect.
- [x] Health endpoint checks schema + WAL mode and stays cache-free.
- [x] API and dashboard expose domain-scoped short URLs where relevant.
- [x] Password hashes are never returned by the API.

## P3 — Operations

- [x] `output: "standalone"` build verified locally (including copied `.next/static`).
- [x] Multi-stage Dockerfile, non-root user, healthcheck, persistent volume.
      Written and reviewed; the image was **not built** because Docker is not installed here.
- [x] Compose example with TLS-ready reverse proxy notes.
- [x] Admin bootstrap script (`npm run admin:create`).
- [x] Backup script (online SQLite backup) + restore drill executed with matching row counts.
- [x] Maintenance script (expired sessions, old rate limits, demo links, optional click retention).
- [x] CI workflow: install, typecheck, build, smoke test.
- [x] Runbook: deploy, upgrade, rollback, backups, restore, scaling, known limits.
- [x] `npm audit` clean; dependency versions pinned.

## P4 — Verification

- [x] `npx tsc --noEmit`
- [x] Unit tests (crypto, URL validation, slug rules, CSV escaping, user agent) — 13/13.
- [x] Production mode: no demo routes, no seeded demo users, headers present, boot fails on
      missing secrets, bootstrap admin works.
- [x] Full smoke test against a production build: signup, login, rate limits, link create,
      redirect + click recorded, password unlock (including forged cookie), API key + CRUD +
      pagination + 401/403/409/429, CSV export, domains (manual + DNS failure), admin access
      control, signup toggle, audit log, static assets served — 125/125 checks.
- [x] Same smoke in demo-enabled dev mode — 125/125 checks.
- [x] DNS-failure path in production mode — 119/119 checks (domain stays pending without TXT).
- [x] Redirect load check: 1,000 requests, concurrency 25, p95 ≈ 22 ms, 0 errors;
      `PRAGMA integrity_check` still `ok`.
- [x] Backup → restore drill with row-count comparison (users/links/clicks identical).
- [x] Standalone server smoke on a clean volume.
- [ ] Browser E2E across marketing, auth, dashboard, admin; zero console errors.
      Not run: no browser automation was used in this environment. The HTTP smoke drives the
      real server-action forms but does not assert console output.
- [ ] Lighthouse: accessibility, best practices and SEO on `/`, `/pricing`, `/docs`, `/p/demo`.
      Not run: no Lighthouse/Chrome available here. Run it before launch.

## Verification evidence (2026-11-21)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npm test` | 13 pass, 0 fail |
| `npm run build` | pass, standalone emitted |
| Production smoke (`SEED_DEMO=0`, `DEMO_MODE=0`, manual DNS) | 125/125 |
| Demo-mode smoke (`SEED_DEMO=1`, `DEMO_MODE=1`) | 125/125 |
| DNS-mode smoke (`DOMAIN_VERIFY_MODE=dns`) | 119/119 |
| Boot with missing secrets | exit 1, names every missing key |
| Boot with `SEED_DEMO=1` in production | exit 1 |
| Backup → restore | integrity `ok`, row counts match |
| Maintenance script | runs clean, checkpoints WAL |
| Redirect load (1,000 @ 25 concurrency) | p50 11.7 ms, p95 21.7 ms, p99 81.1 ms, 0 errors |
| `/api/health` after load | `200`, DB/schema/WAL all true |
| `npm audit --omit=dev` | 0 vulnerabilities |

## Known integrations left to the operator

These are configurable services, not code gaps. The app degrades safely without them:

- Transactional email (verification, password reset, contact notifications): no provider is
  configured, so these flows are intentionally absent and documented in the UI.
- Card payments: plans are assigned manually or via the admin panel; no card data is handled.
- Telegram OTP: removed from this build; email/password is the supported auth path.
- Custom domain TLS issuance and automatic DNS writes: the app verifies DNS but the proxy or
  certificate manager issues certificates.
