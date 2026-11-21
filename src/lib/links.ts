import "server-only";
import { getDb } from "./db";
import { randomId, randomSlug } from "./crypto";

export type NewLink = {
  userId: string;
  domainId?: string | null;
  slug: string;
  url: string;
  title: string;
  tags: string;
  passwordHash?: string | null;
  expiresAt?: number | null;
  clickLimit?: number | null;
};

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code?: unknown }).code).startsWith("SQLITE_CONSTRAINT")
  );
}

/**
 * Inserts a link and reports slug conflicts instead of leaking a 500. Uniqueness is
 * enforced by the database, so two concurrent requests cannot claim the same slug.
 */
export function insertLink(input: NewLink): { ok: true; id: string } | { ok: false; reason: "slug_taken" } {
  const id = randomId(8);
  const now = Date.now();
  try {
    getDb()
      .prepare(
        `INSERT INTO links
           (id, user_id, domain_id, slug, url, title, tags, password_hash,
            expires_at, click_limit, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        id,
        input.userId,
        input.domainId ?? null,
        input.slug,
        input.url,
        input.title,
        input.tags,
        input.passwordHash ?? null,
        input.expiresAt ?? null,
        input.clickLimit ?? null,
        now,
        now
      );
    return { ok: true, id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "slug_taken" };
    throw error;
  }
}

/** Finds an unused generated slug. The insert still defends against the race. */
export function generateSlug(): string {
  const db = getDb();
  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = randomSlug(7);
    if (!db.prepare("SELECT 1 FROM links WHERE slug = ?").get(slug)) return slug;
  }
  return randomSlug(10);
}

/**
 * Resolves a domain chosen for a new link. Only the owner's verified domains may be used,
 * otherwise a link would be created that can never resolve.
 */
export function resolveOwnedDomain(
  userId: string,
  value: unknown
): { ok: true; id: string | null; hostname: string | null } | { ok: false } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, id: null, hostname: null };
  }
  const raw = String(value).trim();
  if (!raw) return { ok: true, id: null, hostname: null };
  const row = getDb()
    .prepare(
      `SELECT id, hostname FROM domains
       WHERE user_id = ? AND status = 'verified' AND (id = ? OR hostname = ?)`
    )
    .get(userId, raw, raw.toLowerCase()) as { id: string; hostname: string } | undefined;
  if (!row) return { ok: false };
  return { ok: true, id: row.id, hostname: row.hostname };
}
