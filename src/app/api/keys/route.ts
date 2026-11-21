import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { randomId, sha256 } from "@/lib/crypto";
import crypto from "node:crypto";
import { forbiddenOrigin, readJson, sameOrigin } from "@/lib/http";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const keys = getDb()
    .prepare("SELECT id, name, prefix, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id);
  return NextResponse.json({ keys }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return forbiddenOrigin();

  const parsed = await readJson<{ name?: unknown }>(request, 2048);
  if (!parsed.ok) return parsed.response;

  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ?").get(user.id) as { n: number }).n;
  if (count >= 10) return NextResponse.json({ error: "You can have up to 10 active keys." }, { status: 403 });

  const secret = crypto.randomBytes(24).toString("hex");
  const key = `velo_sk_${secret}`;
  const id = randomId(8);
  const requested = typeof parsed.data.name === "string" ? parsed.data.name : "";
  const name = requested.trim().slice(0, 40) || "Default key";
  db.prepare(
    "INSERT INTO api_keys (id, user_id, name, prefix, key_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, user.id, name, key.slice(0, 15), sha256(key), Date.now());
  return NextResponse.json({ id, name, key, prefix: key.slice(0, 15) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return forbiddenOrigin();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  getDb().prepare("DELETE FROM api_keys WHERE id = ? AND user_id = ?").run(id, user.id);
  return NextResponse.json({ ok: true });
}
