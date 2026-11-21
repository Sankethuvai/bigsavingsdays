import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateApi } from "@/lib/api-auth";
import { getBaseUrl } from "@/lib/auth";
import { linkShortUrl } from "@/lib/domains";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = authenticateApi(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: auth.retryAfter ? { "Retry-After": String(auth.retryAfter) } : undefined }
    );
  }
  const { slug } = await params;
  const row = getDb()
    .prepare(
      `SELECT l.id, l.slug, l.url, l.title, l.tags, l.active, l.created_at,
              d.hostname AS domain, COUNT(c.id) AS clicks
       FROM links l
       LEFT JOIN clicks c ON c.link_id = l.id
       LEFT JOIN domains d ON d.id = l.domain_id
       WHERE l.slug = ? AND l.user_id = ? GROUP BY l.id`
    )
    .get(slug, auth.user.id) as ({ slug: string; domain: string | null } & Record<string, unknown>) | undefined;
  if (!row) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  const base = await getBaseUrl();
  return NextResponse.json({ data: { ...row, shortUrl: linkShortUrl(base, row.slug, row.domain) } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = authenticateApi(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: auth.retryAfter ? { "Retry-After": String(auth.retryAfter) } : undefined }
    );
  }
  const { slug } = await params;
  const row = getDb().prepare("SELECT id FROM links WHERE slug = ? AND user_id = ?").get(slug, auth.user.id) as { id: string } | undefined;
  if (!row) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  getDb().prepare("DELETE FROM links WHERE id = ?").run(row.id);
  return NextResponse.json({ ok: true });
}
