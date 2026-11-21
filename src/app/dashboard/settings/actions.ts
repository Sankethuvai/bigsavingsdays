"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  currentSessionToken,
  getClientIp,
  requireUser,
  revokeAllSessions,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hashPassword, sha256, verifyPassword } from "@/lib/crypto";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser("/dashboard/settings");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (name.length < 2) redirect("/dashboard/settings?error=name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/dashboard/settings?error=email");

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, user.id);
  if (existing) redirect("/dashboard/settings?error=taken");

  db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, user.id);
  await audit({ actorId: user.id, action: "account.profile_updated" });
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=profile");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser("/dashboard/settings");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < MIN_PASSWORD_LENGTH) redirect("/dashboard/settings?error=short");
  if (next.length > MAX_PASSWORD_LENGTH || current.length > MAX_PASSWORD_LENGTH) {
    redirect("/dashboard/settings?error=long");
  }

  const ip = await getClientIp();
  const limit = rateLimit(`password-change:${user.id}:${sha256(ip)}`, 5, 60 * 60_000);
  if (!limit.ok) redirect("/dashboard/settings?error=rate");

  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string };
  if (!verifyPassword(current, row.password_hash)) redirect("/dashboard/settings?error=current");

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), user.id);
  // A password change invalidates every other session for the account.
  await revokeAllSessions(user.id, await currentSessionToken() ?? undefined);
  await audit({ actorId: user.id, action: "account.password_changed" });
  redirect("/dashboard/settings?saved=password");
}
