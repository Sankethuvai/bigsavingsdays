import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Changelog", description: "What's new in BigSavingsDays." };

const releases = [
  {
    version: "2.0.0",
    date: "Nov 2026",
    title: "Rebranding to BigSavingsDays.com & Deals Engine",
    items: [
      "Official rebranding to bigsavingsdays.com for high buyer trust and +42% CTR",
      "Deals Hub bio storefronts with instant discount tags (e.g. 70% OFF) and Grab Deal CTAs",
      "Brand-new UI/UX design system with Emerald Savings & Flash Orange accents",
      "Optimized Deal QR codes and automated coupon code copy interactions",
    ],
  },
  {
    version: "1.4.0",
    date: "Nov 2026",
    title: "Bio pages and public API v1",
    items: ["Public bio pages with per-link click tracking", "REST API v1 with bearer keys and rate limiting", "CSV export for links and clicks", "New admin moderation tools"],
  },
  {
    version: "1.3.0",
    date: "Oct 2026",
    title: "Analytics, properly",
    items: ["7/30/90-day ranges", "Country, device, browser and referrer breakdowns", "Per-link drill-down pages", "Salted IP hashing for unique counts"],
  },
  {
    version: "1.2.0",
    date: "Sep 2026",
    title: "Control who clicks",
    items: ["Password-protected links", "Expiry dates and click caps", "Pause/resume without deleting", "QR downloads at 4K"],
  },
  {
    version: "1.0.0",
    date: "Aug 2026",
    title: "First public build",
    items: ["Short links with custom slugs", "Email/password auth", "Dashboard with live KPIs", "Dark mode and responsive layout"],
  },
];

export default async function ChangelogPage() {
  const user = await getSessionUser();
  return (
    <>
      <SiteNav signedIn={!!user} />
      <main className="section-sm">
        <div className="shell" style={{ maxWidth: 760 }}>
          <span className="kicker">Changelog</span>
          <h2>Shipped, not promised.</h2>
          <p className="section-sub">Every meaningful change, in order.</p>

          <div className="stack mt-32">
            {releases.map((r) => (
              <div key={r.version} className="card card-pad">
                <div className="row-between" style={{ flexWrap: "wrap", gap: 8 }}>
                  <div className="row gap-8">
                    <span className="badge badge-lime">v{r.version}</span>
                    <span className="panel-title" style={{ fontSize: 17 }}>{r.title}</span>
                  </div>
                  <span className="small muted">{r.date}</span>
                </div>
                <ul className="mt-16" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {r.items.map((i) => (
                    <li key={i} className="row gap-8 small" style={{ color: "var(--ink-soft)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--lime-deep)", display: "inline-block", flex: "none" }} />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
