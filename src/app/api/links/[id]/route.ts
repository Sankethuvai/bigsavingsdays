import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { forbiddenOrigin, readJson, sameOrigin } from "@/lib/http";
import { MAX_PASSWORD_LENGTH } from "@/lib/env";
import { normalizeUrl } from "@/lib/utils";

async function ownedLink(id: string, userId: string) {
  return getDb().prepare("SELECT * FROM links WHERE id = ? AND user_id = ?").get(id, userId) as
    | { id: string; password_hash: string | null }
    | undefined;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return forbiddenOrigin();

  const { id } = await params;
  const link = await ownedLink(id, user.id);
  if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const db = getDb();

  if (body.action === "toggle") {
    db.prepare("UPDATE links SET active = CASE active WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?").run(Date.now(), id);
    const row = db.prepare("SELECT active FROM links WHERE id = ?").get(id) as { active: number };
    return NextResponse.json({ ok: true, active: row.active });
  }

  const url = normalizeUrl(String(body.url ?? ""));
  if (!url) return NextResponse.json({ error: "Enter a valid http(s) URL." }, { status: 400 });

  const passwordInput = body.password;
  if (typeof passwordInput === "string" && passwordInput.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Passwords must be ${MAX_PASSWORD_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }
  let passwordHash = link.password_hash;
  if (passwordInput === "") passwordHash = null;
  else if (typeof passwordInput === "string" && passwordInput.length > 0) passwordHash = hashPassword(passwordInput);

  const limitRaw = Number(body.clickLimit ?? 0);
  const clickLimit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : null;
  const expiresRaw = String(body.expiresAt ?? "");
  let expiresAt: number | null = null;
  if (expiresRaw) {
    const parsedDate = new Date(`${expiresRaw}T23:59:59`).getTime();
    if (!Number.isFinite(parsedDate)) return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
    expiresAt = parsedDate;
  }

  db.prepare(
    `UPDATE links SET url = ?, title = ?, tags = ?, password_hash = ?, expires_at = ?, click_limit = ?, updated_at = ? WHERE id = ?`
  ).run(
    url,
    String(body.title ?? "").trim().slice(0, 120) || new URL(url).hostname,
    String(body.tags ?? "").trim().slice(0, 80),
    passwordHash,
    expiresAt,
    clickLimit,
    Date.now(),
    id
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return forbiddenOrigin();

  const { id } = await params;
  const link = await ownedLink(id, user.id);
  if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  getDb().prepare("DELETE FROM links WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
