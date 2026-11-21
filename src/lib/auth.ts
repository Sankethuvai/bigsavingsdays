import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "./db";
import { randomId } from "./crypto";
import { appUrl, isProduction, trustProxy } from "./env";

export const SESSION_COOKIE = "velo_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  plan: "free" | "pro" | "business";
  avatar_color: string;
  created_at: number;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.plan, u.avatar_color, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .get(token) as (SessionUser & { expires_at: number }) | undefined;

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    plan: row.plan,
    avatar_color: row.avatar_color,
    created_at: row.created_at,
  };
});

export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function startSession(userId: string): Promise<void> {
  const db = getDb();
  const id = randomId(24);
  const now = Date.now();
  db.prepare(
    "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(id, userId, now, now + SESSION_DAYS * 86_400_000);

  // Housekeeping: expired sessions and an upper bound per account.
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  db.prepare(
    `DELETE FROM sessions WHERE user_id = ? AND id NOT IN (
       SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
     )`
  ).run(userId, userId);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

/** Log out every session for an account, optionally keeping the current one. */
export async function revokeAllSessions(userId: string, keepToken?: string): Promise<void> {
  if (keepToken) {
    getDb().prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?").run(userId, keepToken);
  } else {
    getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  }
}

export async function currentSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(token);
  jar.delete(SESSION_COOKIE);
}

export async function getBaseUrl(): Promise<string> {
  // Prefer explicit configuration. Falling back to request headers is safe in development
  // but would let a spoofed Host header poison generated links in production.
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (isProduction) return appUrl();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getClientIp(): Promise<string> {
  // When Node is exposed directly, any client-supplied forwarding header is attacker
  // controlled, so ignore them all and let the limiter key on a constant bucket.
  if (!trustProxy()) return "unknown";
  const h = await headers();
  const direct = h.get("cf-connecting-ip") ?? h.get("x-real-ip");
  if (direct) return direct.trim();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
