import "server-only";
import { headers } from "next/headers";
import { getDb } from "./db";

export type HostDomain = { id: string; hostname: string; status: string };

/** Host headers may include a port, a trailing dot, and proxy comma lists. */
export function normalizeHost(value: string | null | undefined): string {
  return (value ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

export async function currentHost(): Promise<string> {
  const h = await headers();
  return normalizeHost(h.get("x-forwarded-host") ?? h.get("host"));
}

/** Returns the domain row for a host, whatever its verification state. */
export function domainByHost(host: string): HostDomain | null {
  if (!host) return null;
  const row = getDb()
    .prepare("SELECT id, hostname, status FROM domains WHERE hostname = ?")
    .get(host) as HostDomain | undefined;
  return row ?? null;
}

/**
 * Domain-scoped links are only served from a verified custom domain. The main app host
 * serves links with no domain, so a custom-domain slug can never shadow a normal one.
 */
export function resolveServeDomain(host: string): { id: string; hostname: string } | null {
  const domain = domainByHost(host);
  if (!domain || domain.status !== "verified") return null;
  return { id: domain.id, hostname: domain.hostname };
}

/** A link's canonical public URL, honouring its custom domain when it has one. */
export function linkShortUrl(base: string, slug: string, hostname?: string | null): string {
  if (hostname) return `https://${hostname}/${slug}`;
  if (base.includes("vercel.app")) return `https://bigsavingsdays.com/${slug}`;
  return `${base}/${slug}`;
}
