import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateApi } from "@/lib/api-auth";
import { dailySeries, breakdown, linkStats } from "@/lib/analytics";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = authenticateApi(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: auth.retryAfter ? { "Retry-After": String(auth.retryAfter) } : undefined }
    );
  }
  const { slug } = await params;
  const link = getDb().prepare("SELECT id FROM links WHERE slug = ? AND user_id = ?").get(slug, auth.user.id) as { id: string } | undefined;
  if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      totals: linkStats(link.id, 30),
      daily: dailySeries({ linkId: link.id, days: 30 }),
      countries: breakdown(auth.user.id, "country", 30, link.id),
      devices: breakdown(auth.user.id, "device", 30, link.id),
      referrers: breakdown(auth.user.id, "referrer", 30, link.id),
    },
  });
}
