"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { dummyPasswordHash, hashPassword, randomId, sha256, verifyPassword } from "@/lib/crypto";
import { endSession, getClientIp, startSession } from "@/lib/auth";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, isProduction } from "@/lib/env";

export type AuthState = { error?: string } | null;

/** Only same-origin absolute paths are allowed as post-login destinations. */
function safeNext(value: string): string {
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  return value;
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/dashboard"));

  if (!email || !password) return { error: "Enter your email and password." };
  if (password.length > MAX_PASSWORD_LENGTH) return { error: "Email or password is incorrect." };

  const ip = await getClientIp();
  const ipBucket = `login:ip:${sha256(ip)}`;
  const emailBucket = `login:email:${sha256(email)}`;
  const ipLimit = rateLimit(ipBucket, 20, 15 * 60_000);
  const emailLimit = rateLimit(emailBucket, 10, 15 * 60_000);
  if (!ipLimit.ok || !emailLimit.ok) {
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const user = getDb()
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .get(email) as { id: string; password_hash: string } | undefined;

  // Always perform a scrypt verification so response time does not reveal account existence.
  const valid = verifyPassword(password, user?.password_hash ?? dummyPasswordHash());
  if (!user || !valid) {
    return { error: "Email or password is incorrect." };
  }

  clearRateLimit(emailBucket);
  await startSession(user.id);
  redirect(next);
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Please enter your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (password.length > MAX_PASSWORD_LENGTH) return { error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` };

  const db = getDb();
  const signups = db.prepare("SELECT value FROM settings WHERE key = 'signups_open'").get() as { value: string } | undefined;
  if (signups?.value === "0") return { error: "New signups are temporarily closed. Please check back soon." };

  const ip = await getClientIp();
  const limit = rateLimit(`signup:ip:${sha256(ip)}`, 5, 60 * 60_000);
  if (!limit.ok) return { error: "Too many accounts created from this network. Try again later." };

  const exists = db.prepare("SELECT 1 FROM users WHERE email = ?").get(email);
  if (exists) return { error: "An account with that email already exists. Try signing in." };

  const colors = ["#B6F24A", "#FF5A2B", "#9DB0FF", "#22C3A6", "#E5488A", "#8B5CF6"];
  const id = randomId(8);
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, role, plan, avatar_color, created_at)
     VALUES (?, ?, ?, ?, 'user', 'free', ?, ?)`
  ).run(id, email, name, hashPassword(password), colors[Math.floor(Math.random() * colors.length)], Date.now());

  if (isProduction) {
    console.info(`[auth] new account ${id} created`);
  }
  await startSession(id);
  redirect("/dashboard?welcome=1");
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
