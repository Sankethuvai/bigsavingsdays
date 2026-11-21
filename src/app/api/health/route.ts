import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe. Deliberately unauthenticated and cheap: it checks that the
 * database answers, that the required schema exists, and that WAL is active.
 */
export async function GET() {
  const checks: Record<string, boolean> = { database: false, schema: false, wal: false };
  let ok = false;

  try {
    const db = getDb();
    checks.database = (db.prepare("SELECT 1 AS ok").get() as { ok: number }).ok === 1;

    const tables = db
      .prepare(
        `SELECT COUNT(*) AS n FROM sqlite_master
         WHERE type = 'table' AND name IN ('users','links','clicks','sessions','domains','rate_limits')`
      )
      .get() as { n: number };
    checks.schema = tables.n === 6;

    checks.wal = String(db.pragma("journal_mode", { simple: true })).toLowerCase() === "wal";
    ok = checks.database && checks.schema;
  } catch {
    ok = false;
  }

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      service: "bigsavingsdays",
      checks,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
