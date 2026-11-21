import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import type { PageRow, PageLinkRow } from "@/lib/types";
import { ArrowUpRight } from "@/components/icons";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getDb().prepare("SELECT title, bio FROM pages WHERE slug = ?").get(slug) as PageRow | undefined;
  return page ? { title: page.title, description: page.bio } : { title: "Page not found" };
}

export default async function BioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const page = db.prepare("SELECT * FROM pages WHERE slug = ?").get(slug) as PageRow | undefined;
  if (!page) notFound();
  const links = db.prepare("SELECT * FROM page_links WHERE page_id = ? ORDER BY sort_order").all(page.id) as PageLinkRow[];

  return (
    <div className="bio-page" data-theme={page.theme === "dark" ? "dark" : undefined} style={page.theme === "dark" ? { background: "#0b0f19" } : undefined}>
      <div className="bio-card">
        <div className="bio-avatar" style={{ background: page.avatar_color, color: "#fff" }}>{initials(page.title)}</div>
        <div className="row" style={{ justifyContent: "center", gap: 8, alignItems: "center" }}>
          <h1>{page.title}</h1>
          <span className="badge badge-deal" style={{ fontSize: 11, padding: "2px 8px" }}>✓ Deals Hub</span>
        </div>
        {page.bio && <p className="bio-text">{page.bio}</p>}
        <div className="bio-links">
          {links.map((l) => {
            // Check for discount patterns like "70% OFF" or "[Coupon]"
            const hasDiscount = /\b\d{1,2}%\s*(off)?/i.test(l.label);
            return (
              <a key={l.id} className="bio-link" href={`/api/bio/${l.id}`} rel="noopener" target="_blank">
                <span className="row gap-8" style={{ alignItems: "center" }}>
                  <span>{l.label}</span>
                  {hasDiscount && (
                    <span className="badge badge-deal" style={{ fontSize: 10, padding: "2px 6px" }}>⚡ Loot Deal</span>
                  )}
                </span>
                <span className="row gap-8" style={{ alignItems: "center", color: "var(--deal-orange)" }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Grab Deal</span>
                  <ArrowUpRight width={14} height={14} />
                </span>
              </a>
            );
          })}
          {links.length === 0 && <p className="small muted">No deals listed on this hub yet.</p>}
        </div>
        <p className="bio-foot">
          Powered by <Link href="/">BigSavingsDays.com</Link> · {links.length} active {links.length === 1 ? "deal" : "deals"}
        </p>
      </div>
    </div>
  );
}
