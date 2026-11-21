import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import crypto from "node:crypto";
import { getDb } from "./db";
import { randomId } from "./crypto";
import { appUrl, isProduction, sessionSecret, trustProxy } from "./env";

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

type SessionPayload = {
  uid: string;
  em: string;
  nm: string;
  ro: "user" | "admin";
  pl: "free" | "pro" | "business";
  col: string;
  cat: number;
  exp: number;
  sid: string;
};

function signSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", sessionSecret()).update(data).digest("base64url");
  return `${data}.${hmac}`;
}

function verifySession(token: string): SessionPayload | null {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;
  const data = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (!data || !signature) return null;

  try {
    const expected = crypto.createHmac("sha256", sessionSecret()).update(data).digest("base64url");
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const json = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (typeof json.exp !== "number" || json.exp < Date.now()) return null;
    return json;
  } catch {
    return null;
  }
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // 1. Signed stateless session (100% resilient across serverless Lambdas and cold starts)
  const payload = verifySession(token);
  if (payload) {
    try {
      const db = getDb();
      const existing = db.prepare("SELECT 1 FROM users WHERE id = ?").get(payload.uid);
      if (!existing && payload.em) {
        db.prepare(
          `INSERT OR IGNORE INTO users (id, email, name, password_hash, role, plan, avatar_color, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(payload.uid, payload.em, payload.nm, "external_authenticated", payload.ro, payload.pl, payload.col, payload.cat);
      }
    } catch {
      // Non-blocking in serverless environments
    }

    return {
      id: payload.uid,
      email: payload.em,
      name: payload.nm,
      role: payload.ro,
      plan: payload.pl,
      avatar_color: payload.col,
      created_at: payload.cat,
    };
  }

  // 2. Database session lookup fallback (for backwards compatibility)
  try {
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
  } catch {
    return null;
  }
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

export async function startSession(userId: string, partialUser?: Partial<SessionUser>): Promise<void> {
  const db = getDb();
  let user: SessionUser | undefined;

  if (partialUser && partialUser.email && partialUser.role) {
    user = {
      id: userId,
      email: partialUser.email,
      name: partialUser.name ?? "User",
      role: partialUser.role,
      plan: partialUser.plan ?? "free",
      avatar_color: partialUser.avatar_color ?? "#10B981",
      created_at: partialUser.created_at ?? Date.now(),
    };
  } else {
    try {
      user = db.prepare("SELECT id, email, name, role, plan, avatar_color, created_at FROM users WHERE id = ?").get(userId) as SessionUser | undefined;
    } catch {}
  }

  const sid = randomId(24);
  const now = Date.now();
  const expiresAt = now + SESSION_DAYS * 86_400_000;

  try {
    db.prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
    ).run(sid, userId, now, expiresAt);

    // Housekeeping: expired sessions and an upper bound per account.
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
    db.prepare(
      `DELETE FROM sessions WHERE user_id = ? AND id NOT IN (
         SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
       )`
    ).run(userId, userId);
  } catch {
    // Non-blocking in ephemeral serverless environments
  }

  const payload: SessionPayload = {
    uid: userId,
    em: user?.email ?? "",
    nm: user?.name ?? "User",
    ro: user?.role ?? "user",
    pl: user?.plan ?? "free",
    col: user?.avatar_color ?? "#10B981",
    cat: user?.created_at ?? now,
    exp: expiresAt,
    sid,
  };

  const signedToken = signSession(payload);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, signedToken, {
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
  if (token) {
    try {
      const payload = verifySession(token);
      const db = getDb();
      if (payload?.sid) {
        db.prepare("DELETE FROM sessions WHERE id = ?").run(payload.sid);
      } else {
        db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
      }
    } catch {}
  }
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
