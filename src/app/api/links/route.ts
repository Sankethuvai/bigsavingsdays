import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getBaseUrl, getSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { linkShortUrl } from "@/lib/domains";
import { forbiddenOrigin, readJson, sameOrigin } from "@/lib/http";
import { generateSlug, insertLink, resolveOwnedDomain } from "@/lib/links";
import { MAX_PASSWORD_LENGTH } from "@/lib/env";
import { isValidSlug, normalizeUrl, slugify } from "@/lib/utils";

const LIMITS: Record<string, number> = { free: 50, pro: 5000, business: 1_000_000 };

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 200) || 200, 1), 500);
  const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);

  const rows = getDb()
    .prepare(
      `SELECT l.id, l.slug, l.url, l.title, l.tags, l.active, l.domain_id,
              l.expires_at, l.click_limit, l.created_at, l.updated_at,
              COUNT(c.id) AS clicks
       FROM links l
       LEFT JOIN clicks c ON c.link_id = l.id
       WHERE l.user_id = ? GROUP BY l.id
       ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?`
    )
    .all(user.id, limit, offset);
  return NextResponse.json({ links: rows, limit, offset });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return forbiddenOrigin();

  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const url = normalizeUrl(String(body.url ?? ""));
  if (!url) return NextResponse.json({ error: "Enter a valid http(s) URL." }, { status: 400 });

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Passwords must be ${MAX_PASSWORD_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS n FROM links WHERE user_id = ?").get(user.id) as { n: number }).n;
  const limit = LIMITS[user.plan] ?? 50;
  if (count >= limit) {
    return NextResponse.json(
      { error: `Your ${user.plan} plan allows ${limit} links. Upgrade to add more.` },
      { status: 403 }
    );
  }

  const domain = resolveOwnedDomain(user.id, body.domainId ?? body.domain);
  if (!domain.ok) {
    return NextResponse.json({ error: "Choose one of your verified domains." }, { status: 400 });
  }

  const customSlug = String(body.slug ?? "").trim().toLowerCase();
  let slug = customSlug ? slugify(customSlug) : "";
  if (slug) {
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "That slug is invalid or reserved. Use 2–48 letters, numbers, - or _." },
        { status: 400 }
      );
    }
    if (db.prepare("SELECT 1 FROM links WHERE slug = ? AND domain_id IS ?").get(slug, domain.id)) {
      return NextResponse.json({ error: "That slug is already taken. Try another." }, { status: 409 });
    }
  }

  const expiresRaw = String(body.expiresAt ?? "");
  let expiresAt: number | null = null;
  if (expiresRaw) {
    const parsedDate = new Date(`${expiresRaw}T23:59:59`).getTime();
    if (!Number.isFinite(parsedDate)) return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
    expiresAt = parsedDate;
  }
  const limitRaw = Number(body.clickLimit ?? 0);
  const clickLimit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : null;
  const title = String(body.title ?? "").trim().slice(0, 120) || new URL(url).hostname;
  const tags = String(body.tags ?? "").trim().slice(0, 80);

  for (let attempt = 0; attempt < 6; attempt++) {
    if (!slug) slug = generateSlug();
    const created = insertLink({
      userId: user.id,
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
          domainId: domain.id,
          domain: domain.hostname,
          title,
          tags,
          active: 1,
          clicks: 0,
        },
        { status: 201 }
      );
    }
    if (customSlug) {
      return NextResponse.json({ error: "That slug is already taken. Try another." }, { status: 409 });
    }
    slug = "";
  }

  return NextResponse.json({ error: "Could not create a link. Try again." }, { status: 500 });
}
