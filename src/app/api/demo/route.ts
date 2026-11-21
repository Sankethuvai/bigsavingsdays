import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getBaseUrl, getClientIp } from "@/lib/auth";
import { demoEnabled } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { forbiddenOrigin, readJson, sameOrigin } from "@/lib/http";
import { generateSlug, insertLink } from "@/lib/links";
import { hashIp } from "@/lib/crypto";
import { normalizeUrl } from "@/lib/utils";

export async function POST(request: Request) {
  // The public demo only exists when the operator explicitly enables it.
  if (!demoEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (!sameOrigin(request)) return forbiddenOrigin();

  const ip = await getClientIp();
  const limit = rateLimit(`demo:ip:${hashIp(ip)}`, 8, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demo limit reached. Create a free account for more links." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const parsed = await readJson<{ url?: unknown }>(request, 8 * 1024);
  if (!parsed.ok) return parsed.response;

  const raw = typeof parsed.data.url === "string" ? parsed.data.url : "";
  const url = normalizeUrl(raw);
  if (!url) {
    return NextResponse.json({ error: "That doesn't look like a valid http(s) URL." }, { status: 400 });
  }

  const db = getDb();
  const demo = db.prepare("SELECT id FROM users WHERE email = 'demo@velo.link'").get() as { id: string } | undefined;
  if (!demo) {
    return NextResponse.json({ error: "Demo workspace unavailable" }, { status: 503 });
  }

  const now = Date.now();
  let created: ReturnType<typeof insertLink> | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `d${generateSlug().slice(0, 5)}`;
    created = insertLink({
      userId: demo.id,
      slug,
      url,
      title: "Homepage demo link",
      tags: "demo",
      expiresAt: now + 86_400_000,
    });
    if (created.ok) {
      // Keep the demo table tidy: remove old demo links.
      db.prepare("DELETE FROM links WHERE tags = 'demo' AND expires_at < ?").run(now - 3 * 86_400_000);
      const base = await getBaseUrl();
      return NextResponse.json({
        slug,
        url,
        shortUrl: `${base}/${slug}`,
        remaining: limit.remaining,
      });
    }
  }

  return NextResponse.json({ error: "Could not create a demo link. Try again." }, { status: 503 });
}
