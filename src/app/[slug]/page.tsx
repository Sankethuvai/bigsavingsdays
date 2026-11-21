import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { recordClick, linkUnavailable } from "@/lib/analytics";
import {
  issueUnlockToken,
  sha256,
  verifyPassword,
  verifyUnlockToken,
} from "@/lib/crypto";
import { getClientIp } from "@/lib/auth";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";
import { currentHost, domainByHost } from "@/lib/domains";
import { isProduction } from "@/lib/env";
import { normalizeUrl } from "@/lib/utils";
import { Lock } from "@/components/icons";

import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

const shellStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "var(--bg)",
};

function Unavailable({ title, copy }: { title: string; copy: string }) {
  return (
    <div style={shellStyle}>
      <div className="card card-pad center" style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo />
        </div>
        <h1 style={{ fontSize: 22 }}>{title}</h1>
        <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>{copy}</p>
        <Link href="/" className="btn btn-deal btn-block" style={{ marginTop: 22 }}>
          Explore Today&apos;s Active Deals
        </Link>
      </div>
    </div>
  );
}

export default async function SlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const db = getDb();

  // Custom domains are scoped: a verified Host only serves its own links, and an
  // unverified Host serves nothing. The primary app host only serves un-scoped links.
  const host = await currentHost();
  const domain = domainByHost(host);
  if (domain && domain.status !== "verified") notFound();

  const link = (domain
    ? db.prepare("SELECT * FROM links WHERE slug = ? AND domain_id = ?").get(slug, domain.id)
    : db.prepare("SELECT * FROM links WHERE slug = ? AND domain_id IS NULL").get(slug)) as
    | {
        id: string;
        url: string;
        active: number;
        expires_at: number | null;
        click_limit: number | null;
        password_hash: string | null;
      }
    | undefined;

  if (!link) notFound();

  const count = (db.prepare("SELECT COUNT(*) AS n FROM clicks WHERE link_id = ?").get(link.id) as { n: number }).n;
  const state = linkUnavailable(link, count);

  if (state) {
    const copy =
      state === "disabled"
        ? "This link has been switched off by its owner."
        : state === "expired"
          ? "This link reached its expiry date."
          : "This link hit its click limit.";
    return <Unavailable title="Link unavailable" copy={copy} />;
  }

  const destination = normalizeUrl(link.url);
  if (!destination) {
    return (
      <Unavailable
        title="Link unavailable"
        copy="This link points to a destination that is no longer valid."
      />
    );
  }

  if (link.password_hash) {
    const jar = await cookies();
    const unlocked = verifyUnlockToken(
      jar.get(`bsd_unlock_${link.id}`)?.value ?? jar.get(`velo_unlock_${link.id}`)?.value,
      slug,
      link.password_hash
    );

    async function unlock(formData: FormData) {
      "use server";
      const password = String(formData.get("password") ?? "");
      if (password.length > 200) redirect(`/${slug}?error=1`);

      const ip = await getClientIp();
      const bucket = `unlock:${link!.id}:${sha256(ip)}`;
      const limit = rateLimit(bucket, 10, 15 * 60_000);
      if (!limit.ok) redirect(`/${slug}?error=2`);

      const fresh = getDb()
        .prepare("SELECT password_hash FROM links WHERE id = ?")
        .get(link!.id) as { password_hash: string | null } | undefined;
      if (!fresh?.password_hash || !verifyPassword(password, fresh.password_hash)) {
        redirect(`/${slug}?error=1`);
      }

      clearRateLimit(bucket);
      const store = await cookies();
      store.set(`bsd_unlock_${link!.id}`, issueUnlockToken(slug, fresh.password_hash), {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: 30 * 60,
      });
      redirect(`/${slug}`);
    }

    if (!unlocked) {
      return (
        <div style={shellStyle}>
          <div className="card card-pad" style={{ maxWidth: 400, width: "100%" }}>
            <div className="icon-box"><Lock /></div>
            <h1 style={{ fontSize: 22 }}>This link is protected</h1>
            <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>
              Enter the password to continue to the destination.
            </p>
            <form action={unlock} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                className="input"
                type="password"
                name="password"
                placeholder="Password"
                autoFocus
                required
                maxLength={200}
                autoComplete="off"
              />
              {error === "1" ? <p className="error-text">That password didn&apos;t match.</p> : null}
              {error === "2" ? (
                <p className="error-text">Too many attempts. Try again in a few minutes.</p>
              ) : null}
              <button className="btn btn-primary btn-block" type="submit">Unlock link</button>
            </form>
          </div>
        </div>
      );
    }
  }

  const ip = await getClientIp();
  try {
    const h = await headers();
    recordClick({
      linkId: link.id,
      ip,
      ua: h.get("user-agent") ?? "",
      referrer: h.get("referer"),
      countryCode: h.get("cf-ipcountry") ?? h.get("x-vercel-ip-country"),
    });
  } catch (clickError) {
    // Analytics is best-effort: a redirect must never fail because a click could not be logged.
    console.error("[redirect] could not record click", clickError);
  }

  redirect(destination);
}
