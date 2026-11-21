import { requireUser, getBaseUrl } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { linkShortUrl } from "@/lib/domains";
import { LinksManager, type ManagedLink } from "@/components/links-manager";

export const metadata = { title: "Links" };
export const dynamic = "force-dynamic";

export default async function LinksPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: isNew } = await searchParams;
  const user = await requireUser("/dashboard/links");
  const base = await getBaseUrl();

  const rows = getDb()
    .prepare(
      `SELECT l.id, l.slug, l.url, l.title, l.tags, l.active, l.password_hash,
              l.domain_id, d.hostname AS domain, l.expires_at, l.click_limit, l.created_at,
              COUNT(c.id) AS clicks
       FROM links l
       LEFT JOIN clicks c ON c.link_id = l.id
       LEFT JOIN domains d ON d.id = l.domain_id
       WHERE l.user_id = ? GROUP BY l.id ORDER BY l.created_at DESC`
    )
    .all(user.id) as {
      id: string; slug: string; url: string; title: string; tags: string; active: number;
      password_hash: string | null; domain_id: string | null; domain: string | null;
      expires_at: number | null; click_limit: number | null; created_at: number; clicks: number;
    }[];

  const links: ManagedLink[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    url: r.url,
    title: r.title,
    tags: r.tags,
    active: r.active,
    clicks: r.clicks,
    hasPassword: !!r.password_hash,
    expires_at: r.expires_at,
    click_limit: r.click_limit,
    created_at: r.created_at,
    domainId: r.domain_id,
    domain: r.domain,
    shortUrl: linkShortUrl(base, r.slug, r.domain),
  }));

  const domains = getDb()
    .prepare("SELECT id, hostname FROM domains WHERE user_id = ? AND status = 'verified' ORDER BY hostname")
    .all(user.id) as { id: string; hostname: string }[];

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Links</h1>
          <p>{links.length} total · {totalClicks.toLocaleString()} clicks · {links.filter((l) => l.active).length} live</p>
        </div>
      </div>
      <LinksManager initial={links} base={base} domains={domains} autoOpen={isNew === "1"} />
    </div>
  );
}
