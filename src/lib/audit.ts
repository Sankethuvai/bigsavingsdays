import "server-only";
import { getDb } from "./db";
import { hashIp } from "./crypto";
import { getClientIp } from "./auth";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  target?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Append-only record of security-sensitive actions. Never throws: losing an audit row must
 * not break the user-facing operation. The caller may pass an explicit IP when it has not
 * been resolved yet (for example from a route handler).
 */
export async function audit(input: AuditInput, ip?: string): Promise<void> {
  try {
    const resolved = ip ?? (await getClientIp());
    getDb()
      .prepare(
        `INSERT INTO audit_log (actor_id, action, target, meta, ip_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.actorId ?? null,
        input.action.slice(0, 80),
        input.target?.slice(0, 200) ?? null,
        input.meta ? JSON.stringify(input.meta).slice(0, 2000) : null,
        hashIp(resolved),
        Date.now()
      );
  } catch (error) {
    console.error("[audit] could not write entry", input.action, error);
  }
}
