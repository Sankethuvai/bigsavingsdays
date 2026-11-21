import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = new URL(request.url).searchParams.get("type") ?? "links";
  const db = getDb();

  let rows: Record<string, unknown>[];
  let filename: string;

  if (type === "clicks") {
    rows = db
      .prepare(
        `SELECT l.slug, datetime(c.ts/1000, 'unixepoch') AS clicked_at, c.country,
                c.device, c.browser, c.os, c.referrer
         FROM clicks c JOIN links l ON l.id = c.link_id
         WHERE l.user_id = ? ORDER BY c.ts DESC LIMIT 100000`
      )
      .all(user.id) as Record<string, unknown>[];
    filename = "velo-clicks.csv";
  } else {
    rows = db
      .prepare(
        `SELECT l.slug, l.url, l.title, l.tags,
                CASE l.active WHEN 1 THEN 'live' ELSE 'paused' END AS status,
                datetime(l.created_at/1000, 'unixepoch') AS created_at,
                COUNT(c.id) AS clicks
         FROM links l LEFT JOIN clicks c ON c.link_id = l.id
         WHERE l.user_id = ? GROUP BY l.id ORDER BY l.created_at DESC`
      )
      .all(user.id) as Record<string, unknown>[];
    filename = "velo-links.csv";
  }

  const body = toCsv(rows);
  return new NextResponse(body || "no data\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
