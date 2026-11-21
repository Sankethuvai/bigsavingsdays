/**
 * Central runtime configuration.
 *
 * Nothing here is read at build time except `isProduction`, so the same build can be
 * promoted between environments. Production secrets are validated at boot in
 * `src/instrumentation.ts` and again lazily if a code path needs them.
 */

export const isProduction = process.env.NODE_ENV === "production";

const DEV_SESSION_SECRET = "velo-development-session-secret-do-not-use-in-production";
const DEV_IP_SALT = "velo-development-ip-salt";

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Public origin used for generated short links, sitemap and metadata. */
export function appUrl(): string {
  const configured = publicBaseUrl(true);
  if (configured) return configured;
  if (isProduction) {
    throw new Error("APP_URL (or NEXT_PUBLIC_APP_URL) must be set in production.");
  }
  return "http://localhost:3000";
}

/**
 * Non-throwing origin for build-time metadata (layout, robots, sitemap), where a local
 * fallback is preferable to failing the build. Runtime code should use `appUrl()`.
 */
export function publicBaseUrl(allowNull = false): string | null {
  const configured = clean(process.env.APP_URL) ?? clean(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured.replace(/\/+$/, "");
  return allowNull ? null : "http://localhost:3000";
}

/** Key used to sign password-unlock cookies. Rotating it invalidates unlocks only. */
export function sessionSecret(): string {
  const secret = clean(process.env.SESSION_SECRET);
  if (secret && secret.length >= 32) return secret;
  if (isProduction) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }
  return DEV_SESSION_SECRET;
}

/** Salt for one-way visitor IP hashes. Never stored alongside the hash. */
export function ipSalt(): string {
  const salt = clean(process.env.IP_HASH_SALT);
  if (salt && salt.length >= 16) return salt;
  if (isProduction) {
    throw new Error("IP_HASH_SALT must be at least 16 characters in production.");
  }
  return DEV_IP_SALT;
}

/** DNS CNAME target shown to users who connect a custom domain. */
export function cnameTarget(): string {
  const configured = clean(process.env.DOMAIN_CNAME_TARGET);
  if (configured) return configured;
  try {
    return new URL(publicBaseUrl() ?? "http://localhost").hostname;
  } catch {
    return "localhost";
  }
}

/** The public demo workspace is opt-in outside development. */
export function demoEnabled(): boolean {
  const flag = clean(process.env.DEMO_MODE);
  if (flag === "1") return true;
  if (flag === "0") return false;
  return !isProduction;
}

/** Demo seed data is opt-in outside development. */
export function seedDemo(): boolean {
  const flag = clean(process.env.SEED_DEMO);
  if (flag === "1") return true;
  if (flag === "0") return false;
  return !isProduction;
}

/**
 * Most deployments sit behind a proxy that sets X-Forwarded-For. Set TRUST_PROXY=0 only
 * when the Node server is exposed directly and the proxy headers are stripped upstream.
 */
export function trustProxy(): boolean {
  return clean(process.env.TRUST_PROXY) !== "0";
}

/**
 * DNS verification is the production default. `manual` exists for local demos and CI,
 * where looking up `_velo.<domain>` would fail by design.
 */
export function domainVerifyMode(): "dns" | "manual" {
  const mode = clean(process.env.DOMAIN_VERIFY_MODE);
  if (mode === "manual") return "manual";
  if (mode === "dns") return "dns";
  return isProduction ? "dns" : "manual";
}

/** Minimum password length for self-serve accounts. */
export const MIN_PASSWORD_LENGTH = 8;
/** Upper bound keeps scrypt work predictable. */
export const MAX_PASSWORD_LENGTH = 200;
/** Admin accounts get a stronger floor. */
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

export type EnvProblem = { key: string; problem: string };

/** Collect every production configuration problem instead of failing one at a time. */
export function envProblems(): EnvProblem[] {
  if (!isProduction) return [];
  const problems: EnvProblem[] = [];

  if (!clean(process.env.APP_URL) && !clean(process.env.NEXT_PUBLIC_APP_URL)) {
    problems.push({ key: "APP_URL", problem: "required (public https origin)" });
  } else {
    try {
      const url = new URL(appUrl());
      if (url.protocol !== "https:" && url.hostname !== "localhost") {
        problems.push({ key: "APP_URL", problem: "must use https outside localhost" });
      }
    } catch {
      problems.push({ key: "APP_URL", problem: "is not a valid URL" });
    }
  }

  const secret = clean(process.env.SESSION_SECRET);
  if (!secret || secret.length < 32) {
    problems.push({ key: "SESSION_SECRET", problem: "required, at least 32 characters" });
  }

  const salt = clean(process.env.IP_HASH_SALT);
  if (!salt || salt.length < 16) {
    problems.push({ key: "IP_HASH_SALT", problem: "required, at least 16 characters" });
  }

  if (clean(process.env.SEED_DEMO) === "1") {
    problems.push({ key: "SEED_DEMO", problem: "must be 0 in production" });
  }

  return problems;
}
