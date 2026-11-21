"use server";

import { redirect } from "next/navigation";
import { getClientIp } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function contactAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().slice(0, 254);
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
    redirect("/contact?error=1");
  }

  const ip = await getClientIp();
  const limit = rateLimit(`contact:ip:${sha256(ip)}`, 5, 60 * 60_000);
  if (!limit.ok) redirect("/contact?error=rate");

  // No email provider is configured in this build. In production, enqueue a transactional
  // email here (see README) and keep the endpoint rate limited.
  console.info(`[contact] message from ${email}`);
  redirect("/contact?sent=1");
}
