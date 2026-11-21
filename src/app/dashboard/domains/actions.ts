"use server";

import { promises as dns } from "node:dns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { randomId } from "@/lib/crypto";
import { appUrl, domainVerifyMode } from "@/lib/env";
import { normalizeHost } from "@/lib/domains";
import { audit } from "@/lib/audit";

const HOSTNAME_RE = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;

export async function addDomainAction(formData: FormData) {
  const user = await requireUser("/dashboard/domains");
  const raw = normalizeHost(
    String(formData.get("hostname") ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
  );
  if (!HOSTNAME_RE.test(raw) || /^\d{1,3}(\.\d{1,3}){3}$/.test(raw)) {
    redirect("/dashboard/domains?error=invalid");
  }

  // The application's own hostname can never be attached as a customer domain.
  try {
    if (raw === normalizeHost(new URL(appUrl()).hostname)) redirect("/dashboard/domains?error=reserved");
  } catch {
    /* appUrl only throws for an invalid production config, already checked at boot */
  }

  const db = getDb();
  if (db.prepare("SELECT 1 FROM domains WHERE hostname = ?").get(raw)) {
    redirect("/dashboard/domains?error=taken");
  }
  const count = (db.prepare("SELECT COUNT(*) AS n FROM domains WHERE user_id = ?").get(user.id) as { n: number }).n;
  const limit = user.plan === "business" ? 10 : user.plan === "pro" ? 1 : 0;
  if (count >= limit) {
    redirect(limit === 0 ? "/dashboard/domains?error=plan" : "/dashboard/domains?error=cap");
  }
  const id = randomId(8);
  db.prepare(
    "INSERT INTO domains (id, user_id, hostname, status, verification_token, created_at) VALUES (?, ?, ?, 'pending', ?, ?)"
  ).run(id, user.id, raw, `velo-verify-${randomId(4)}`, Date.now());
  await audit({ actorId: user.id, action: "domain.added", target: raw });
  revalidatePath("/dashboard/domains");
}

export async function verifyDomainAction(formData: FormData) {
  const user = await requireUser("/dashboard/domains");
  const id = String(formData.get("id") ?? "");
  const domain = getDb()
    .prepare("SELECT id, hostname, verification_token FROM domains WHERE id = ? AND user_id = ?")
    .get(id, user.id) as { id: string; hostname: string; verification_token: string } | undefined;
  if (!domain) redirect("/dashboard/domains?error=invalid");

  if (domainVerifyMode() === "dns") {
    let matches = false;
    try {
      const records = await Promise.race([
        dns.resolveTxt(`_velo.${domain.hostname}`),
        new Promise<string[][]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
      matches = records.some((parts) => parts.join("").trim() === domain.verification_token);
    } catch {
      matches = false;
    }
    if (!matches) {
      await audit({ actorId: user.id, action: "domain.verify_failed", target: domain.hostname });
      redirect("/dashboard/domains?error=dns");
    }
  }

  getDb().prepare("UPDATE domains SET status = 'verified' WHERE id = ? AND user_id = ?").run(id, user.id);
  await audit({
    actorId: user.id,
    action: "domain.verified",
    target: domain.hostname,
    meta: { mode: domainVerifyMode() },
  });
  revalidatePath("/dashboard/domains");
}

export async function deleteDomainAction(formData: FormData) {
  const user = await requireUser("/dashboard/domains");
  const id = String(formData.get("id") ?? "");
  const domain = getDb()
    .prepare("SELECT hostname FROM domains WHERE id = ? AND user_id = ?")
    .get(id, user.id) as { hostname: string } | undefined;
  getDb().prepare("DELETE FROM domains WHERE id = ? AND user_id = ?").run(id, user.id);
  if (domain) await audit({ actorId: user.id, action: "domain.deleted", target: domain.hostname });
  revalidatePath("/dashboard/domains");
}
