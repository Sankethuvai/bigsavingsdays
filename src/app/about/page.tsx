import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/auth";
import { Check, Shield, Zap, Sparkles } from "@/components/icons";
import { demoEnabled } from "@/lib/env";

export const metadata = { title: "About", description: "Why BigSavingsDays exists and the principles behind the product." };

const values = [
  { icon: Zap, title: "Speed & Trust", text: "A deal redirect must be instant and trustworthy. When shoppers see bigsavingsdays.com, they know they are getting genuine discounts without spam." },
  { icon: Shield, title: "Affiliate Integrity", text: "We never hijack or strip affiliate tags. Your Amazon Associate tags, Flipkart IDs, and UTM parameters remain intact." },
  { icon: Sparkles, title: "Conversion Focused", text: "Designed from the ground up to boost CTR, with discount badges, 1-click coupon copying, and mobile Deals Hubs." },
];

export default async function AboutPage() {
  const showDemo = demoEnabled();
  const user = await getSessionUser();
  return (
    <>
      <SiteNav signedIn={!!user} />
      <main>
        <section className="section-sm" style={{ paddingTop: 64 }}>
          <div className="shell" style={{ maxWidth: 760 }}>
            <span className="kicker">About</span>
            <h1 style={{ fontSize: "clamp(38px, 6vw, 62px)" }}>The link platform built for maximum savings.</h1>
            <p className="section-sub" style={{ fontSize: 18 }}>
              BigSavingsDays started with a clear observation: standard short links look suspicious and depress click-through rates. Deal publishers, Telegram channels, and shopping influencers needed a domain that signals instant value, verified discounts, and maximum savings.
            </p>
            <p className="mt-24 muted">
              BigSavingsDays provides high-converting deal shortlinks, verified discount badges, mobile Deals Hub bio pages, and granular conversion tracking to empower creators and shoppers alike.
            </p>
          </div>
        </section>

        <section className="section-sm" style={{ background: "var(--bg-elev)", borderBlock: "1px solid var(--line)" }}>
          <div className="shell bento">
            {values.map((v) => (
              <div key={v.title} className="bento-item bento-4">
                <div className="icon-box"><v.icon /></div>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-sm">
          <div className="shell" style={{ maxWidth: 760 }}>
            <div className="card card-pad">
              <div className="panel-title">What ships in this build</div>
              <div className="plan-features mt-16">
                {[
                  "Working redirects with click tracking and hashed visitor counts",
                  "Email/password auth with scrypt hashing and server sessions",
                  "Link management: slugs, tags, expiry, password, click caps",
                  "Analytics: 7/30/90-day trends, countries, devices, referrers",
                  "QR codes (PNG) and public bio pages",
                  "Custom domains with real DNS TXT verification and Host routing",
                  "REST API with bearer keys, rate limiting and CSV export",
                  "Admin panel: users, links, platform metrics, settings",
                  "Dark mode, responsive layout and accessible components",
                ].map((f) => <div key={f} className="plan-feature"><Check /><span>{f}</span></div>)}
              </div>
              <div className="row gap-8 mt-24">
                {showDemo && <Link href="/demo" className="btn btn-primary">Open the live demo</Link>}
                <Link href="/docs" className="btn btn-ghost">Read the API docs</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
