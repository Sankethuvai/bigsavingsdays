"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { dummyPasswordHash, sha256, verifyPassword } from "@/lib/crypto";
import { getClientIp, requireAdmin, startSession } from "@/lib/auth";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";
import { MAX_PASSWORD_LENGTH } from "@/lib/env";
import { audit } from "@/lib/audit";

const GENERIC_ERROR = "Email or password is incorrect.";

export async function adminSignInAction(_prev: { error?: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") ?? "");
  if (!email || !password || password.length > MAX_PASSWORD_LENGTH) {
    return { error: GENERIC_ERROR };
  }

  const ip = await getClientIp();
  const ipBucket = `admin-login:ip:${sha256(ip)}`;
  const emailBucket = `admin-login:email:${sha256(email)}`;
  const ipLimit = rateLimit(ipBucket, 10, 15 * 60_000);
  const emailLimit = rateLimit(emailBucket, 5, 15 * 60_000);
  if (!ipLimit.ok || !emailLimit.ok) {
    await audit({ action: "admin.login.rate_limited", target: email });
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const user = getDb()
    .prepare("SELECT id, password_hash, role FROM users WHERE email = ?")
    .get(email) as { id: string; password_hash: string; role: string } | undefined;

  // Always hash so a non-existent account and a wrong password take the same time.
  const valid = verifyPassword(password, user?.password_hash ?? dummyPasswordHash());
  if (!user || !valid || user.role !== "admin") {
    await audit({ action: "admin.login.failed", target: email });
    return { error: GENERIC_ERROR };
  }

  clearRateLimit(emailBucket);
  await audit({ actorId: user.id, action: "admin.login" });
  await startSession(user.id);
  redirect("/admin");
}

export async function toggleUserPlanAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const row = getDb()
    .prepare(
      "UPDATE users SET plan = CASE plan WHEN 'free' THEN 'pro' WHEN 'pro' THEN 'business' ELSE 'free' END WHERE id = ? RETURNING plan"
    )
    .get(id) as { plan: string } | undefined;
  await audit({
    actorId: admin.id,
    action: "admin.user.plan_changed",
    target: id,
    meta: { plan: row?.plan },
  });
  revalidatePath("/admin/users");
}

export async function toggleLinkActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const row = getDb()
    .prepare("UPDATE links SET active = CASE active WHEN 1 THEN 0 ELSE 1 END WHERE id = ? RETURNING active, slug")
    .get(id) as { active: number; slug: string } | undefined;
  await audit({
    actorId: admin.id,
    action: "admin.link.toggled",
    target: row?.slug ?? id,
    meta: { active: row?.active },
  });
  revalidatePath("/admin/links");
  revalidatePath("/admin");
}

export async function saveSettingsAction(formData: FormData) {
  const admin = await requireAdmin();
  const signups = formData.get("signups_open") ? "1" : "0";
  const price = String(Number(formData.get("default_price") ?? 499));
  const db = getDb();
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  upsert.run("signups_open", signups);
  upsert.run("default_price", price);
  await audit({
    actorId: admin.id,
    action: "admin.settings.saved",
    meta: { signups_open: signups, default_price: price },
  });
  revalidatePath("/admin/settings");
}
