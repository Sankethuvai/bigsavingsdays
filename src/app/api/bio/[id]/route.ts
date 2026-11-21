import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { normalizeUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare("SELECT url, page_id FROM page_links WHERE id = ?")
    .get(id) as { url: string; page_id: string } | undefined;

  const fallback = new URL("/", appUrl());
  if (!row) return NextResponse.redirect(fallback);

  // Re-validate at click time so a stale or hand-edited row can never become an
  // open redirect to a non-http(s) scheme.
  const destination = normalizeUrl(row.url);
  if (!destination) return NextResponse.redirect(fallback);

  db.prepare("UPDATE page_links SET clicks = clicks + 1 WHERE id = ?").run(id);
  return NextResponse.redirect(destination);
}
