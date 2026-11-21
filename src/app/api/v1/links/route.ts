import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateApi } from "@/lib/api-auth";
import { getBaseUrl } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { linkShortUrl } from "@/lib/domains";
import { readJson } from "@/lib/http";
import { generateSlug, insertLink, resolveOwnedDomain } from "@/lib/links";
import { MAX_PASSWORD_LENGTH } from "@/lib/env";
import { isValidSlug, normalizeUrl, slugify } from "@/lib/utils";

const LIMITS: Record<string, number> = { free: 50, pro: 5000, business: 1_000_000 };

function authHeaders(remaining: number) {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "Cache-Control": "no-store",
  };
}

export async function GET(request: Request) {
  const auth = authenticateApi(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: auth.retryAfter ? { "Retry-After": String(auth.retryAfter) } : undefined }
    );
  }

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 50) || 50, 1), 200);
  const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);

  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) AS n FROM links WHERE user_id = ?").get(auth.user.id) as { n: number }).n;
  const rows = db
    .prepare(
      `SELECT l.id, l.slug, l.url, l.title, l.tags, l.active, l.created_at,
              d.hostname AS domain, COUNT(c.id) AS clicks
       FROM links l
       LEFT JOIN clicks c ON c.link_id = l.id
       LEFT JOIN domains d ON d.id = l.domain_id
       WHERE l.user_id = ? GROUP BY l.id
       ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?`
    )
    .all(auth.user.id, limit, offset) as ({ domain: string | null; slug: string } & Record<string, unknown>)[];

  const base = await getBaseUrl();
  const data = rows.map((row) => ({
    ...row,
    shortUrl: linkShortUrl(base, row.slug, row.domain),
  }));

  return NextResponse.json(
    { data, count: data.length, total, limit, offset },
    { headers: authHeaders(auth.remaining) }
  );
}

export async function POST(request: Request) {
  const auth = authenticateApi(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: auth.retryAfter ? { "Retry-After": String(auth.retryAfter) } : undefined }
    );
  }

  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const url = normalizeUrl(String(body.url ?? ""));
  if (!url) return NextResponse.json({ error: "A valid url is required" }, { status: 400 });

  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS n FROM links WHERE user_id = ?").get(auth.user.id) as { n: number }).n;
  if (count >= (LIMITS[auth.user.plan] ?? 50)) {
    return NextResponse.json(
      { error: "Plan link limit reached" },
      { status: 403, headers: authHeaders(auth.remaining) }
    );
  }

  const domain = resolveOwnedDomain(auth.user.id, body.domainId ?? body.domain);
  if (!domain.ok) {
    return NextResponse.json({ error: "Unknown or unverified domain" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer` }, { status: 400 });
  }

  const expiresRaw = String(body.expiresAt ?? "");
  let expiresAt: number | null = null;
  if (expiresRaw) {
    const parsedDate = new Date(`${expiresRaw}T23:59:59`).getTime();
    if (!Number.isFinite(parsedDate)) return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
    expiresAt = parsedDate;
  }
  const limitRaw = Number(body.clickLimit ?? 0);
  const clickLimit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : null;

  const customSlug = String(body.slug ?? "").trim();
  let slug = customSlug ? slugify(customSlug) : "";
  if (slug) {
    if (!isValidSlug(slug)) return NextResponse.json({ error: "Invalid or reserved slug" }, { status: 400 });
    if (db.prepare("SELECT 1 FROM links WHERE slug = ? AND domain_id IS ?").get(slug, domain.id)) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
  }

  const title = String(body.title ?? "").slice(0, 120) || new URL(url).hostname;
  const tags = String(body.tags ?? "").slice(0, 80);

  for (let attempt = 0; attempt < 6; attempt++) {
    if (!slug) slug = generateSlug();
    const created = insertLink({
      userId: auth.user.id,
      domainId: domain.id,
      slug,
      url,
      title,
      tags,
      passwordHash: password ? hashPassword(password) : null,
      expiresAt,
      clickLimit,
    });
    if (created.ok) {
      const base = await getBaseUrl();
      return NextResponse.json(
        {
          id: created.id,
          slug,
          url,
          shortUrl: linkShortUrl(base, slug, domain.hostname),
          domain: domain.hostname,
          created_at: Date.now(),
        },
        { status: 201, headers: authHeaders(auth.remaining) }
      );
    }
    if (customSlug) return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    slug = "";
  }

  return NextResponse.json({ error: "Could not create link" }, { status: 500 });
}
