import "server-only";
import { getDb } from "./db";

export type RateResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

/**
 * Fixed-window limiter backed by SQLite. Works across restarts and across workers that
 * share the same database file. Callers choose a namespaced bucket and a window.
 */
export function rateLimit(bucket: string, limit: number, windowMs: number): RateResult {
  const db = getDb();
  const now = Date.now();

  const result = db.transaction(() => {
    const row = db
      .prepare("SELECT count, reset_at FROM rate_limits WHERE bucket = ?")
      .get(bucket) as { count: number; reset_at: number } | undefined;

    let count: number;
    let resetAt: number;
    if (!row || row.reset_at <= now) {
      count = 1;
      resetAt = now + windowMs;
      db.prepare(
        `INSERT INTO rate_limits (bucket, count, reset_at) VALUES (?, ?, ?)
         ON CONFLICT(bucket) DO UPDATE SET count = excluded.count, reset_at = excluded.reset_at`
      ).run(bucket, count, resetAt);
    } else {
      count = row.count + 1;
      resetAt = row.reset_at;
      db.prepare("UPDATE rate_limits SET count = ? WHERE bucket = ?").run(count, bucket);
    }
    return { count, resetAt };
  })();

  // Bounded opportunistic cleanup keeps the table small without a background job.
  if (Math.random() < 0.02) {
    db.prepare("DELETE FROM rate_limits WHERE reset_at < ?").run(now);
  }

  return {
    ok: result.count <= limit,
    remaining: Math.max(0, limit - result.count),
    resetAt: result.resetAt,
    retryAfter: Math.max(1, Math.ceil((result.resetAt - now) / 1000)),
  };
}

export function clearRateLimit(bucket: string): void {
  getDb().prepare("DELETE FROM rate_limits WHERE bucket = ?").run(bucket);
}
