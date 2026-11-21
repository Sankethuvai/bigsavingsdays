import "server-only";
import { getDb } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

export type ApiUser = { id: string; name: string; email: string; plan: string };

export type ApiAuth =
  | { user: ApiUser; keyId: string; remaining: number }
  | { error: string; status: number; retryAfter?: number };

export function authenticateApi(request: Request): ApiAuth {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || (!token.startsWith("bsd_sk_") && !token.startsWith("velo_sk_")) || token.length > 200) {
    return { error: "Missing or invalid bearer token", status: 401 };
  }
  const row = getDb()
    .prepare(
      `SELECT k.id AS key_id, u.id, u.name, u.email, u.plan
       FROM api_keys k JOIN users u ON u.id = k.user_id WHERE k.key_hash = ?`
    )
    .get(sha256(token)) as { key_id: string; id: string; name: string; email: string; plan: string } | undefined;

  if (!row) return { error: "Invalid API key", status: 401 };

  const limit = rateLimit(`api:key:${row.key_id}`, 120, 60_000);
  if (!limit.ok) {
    return { error: "Rate limit exceeded (120/min)", status: 429, retryAfter: limit.retryAfter };
  }

  getDb().prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(Date.now(), row.key_id);
  return {
    user: { id: row.id, name: row.name, email: row.email, plan: row.plan },
    keyId: row.key_id,
    remaining: limit.remaining,
  };
}
