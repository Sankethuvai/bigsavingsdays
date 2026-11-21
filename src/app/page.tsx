import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { DemoShortener } from "@/components/demo-shortener";
import { DashboardPreview } from "@/components/dashboard-preview";
import { AreaChart } from "@/components/area-chart";
import { PricingPlans } from "@/components/pricing-plans";
import { getSessionUser } from "@/lib/auth";
import { demoEnabled } from "@/lib/env";
import {
  ArrowRight, ArrowUpRight, Chart, Check, Code, Globe, Lock, Qr,
  Shield, Sparkles, Trend, Zap, LinkIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const faqs = [
  {
    q: "How does BigSavingsDays increase click-through rates (CTR)?",
    a: "Generic shortlinks look suspicious and depress click-through rates. BigSavingsDays links carry a trusted domain (bigsavingsdays.com) that immediately signals verified discounts, sales, and savings, resulting in up to 42% higher CTR on Telegram, WhatsApp, and social media.",
  },
  {
    q: "Are affiliate tags and UTM parameters preserved?",
    a: "Yes. BigSavingsDays never strips or overrides your affiliate IDs. Amazon Associates tags, Flipkart affiliate IDs, and campaign UTM parameters are fully preserved throughout the redirect.",
  },
  {
    q: "What is Deals Hub?",
    a: "Deals Hub gives you a mobile-first link-in-bio storefront where you can showcase multiple product discounts, display live percentage discount badges (e.g., 70% OFF), provide 1-click coupon code copy buttons, and direct shoppers to your deals.",
  },
  {
    q: "What happens when a flash sale expires?",
    a: "Unlike standard shorteners that lead to dead pages or full-price products, BigSavingsDays allows you to configure smart fallback redirects to active category sales or alternative deals when an offer sells out.",
  },
  {
    q: "Can I connect my own custom domain?",
    a: "Yes. You can use bigsavingsdays.com directly or attach your own branded deals domain with automatic SSL and DNS verification.",
  },
  {
    q: "Is there an automated API for bots and syndication?",
    a: "Yes. BigSavingsDays includes a REST API v1 with bearer token authentication for automated Telegram bots, bulk link generation, and live analytics extraction.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  })),
};

export default async function HomePage() {
  const user = await getSessionUser();
  const showDemo = demoEnabled();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <SiteNav signedIn={!!user} />
      <main>
        {/* HERO */}
        <section className="hero">
          <div className="shell hero-grid">
            <div>
              <div className="eyebrow-pill">
                <span className="tag" style={{ background: "var(--deal-orange)", color: "#fff" }}>🔥 Flash Deal</span>
                <span>Deals Hub + Auto-Affiliate Engine live</span>
                <ArrowRight width={13} height={13} />
              </div>
              <h1>
                Supercharge your deals.<br />
                Shorten, share &amp; <span className="serif" style={{ color: "var(--savings-deep)" }}>maximize savings.</span>
              </h1>
              <p className="hero-lead">
                The high-converting deal link platform built for affiliate marketers, Telegram deal channels, and creators. Short links that signal instant <strong>DISCOUNT</strong>, never spam.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn btn-deal btn-lg">
                  Create Deal Link <ArrowRight width={17} height={17} />
                </Link>
                {showDemo ? (
                  <Link href="/demo" className="btn btn-ghost btn-lg">Explore creator demo</Link>
                ) : (
                  <Link href="/docs" className="btn btn-ghost btn-lg">Read the API docs</Link>
                )}
              </div>
              <div className="hero-proof">
                <div className="proof-stack" aria-hidden>
                  {["#10B981", "#FF5722", "#3B82F6", "#F59E0B"].map((c, i) => (
                    <span key={c} style={{ background: c, color: "#fff" }}>
                      {["70%", "LOOT", "SAVE", "40%"][i]}
                    </span>
                  ))}
                </div>
                <div className="hero-note">
                  <b style={{ color: "var(--ink)" }}>+42% Average CTR Increase</b><br />
                  Trusted by 10,000+ deal publishers &amp; shopping channels.
                </div>
              </div>
            </div>
            <DemoShortener enabled={showDemo} />
          </div>
        </section>

        {/* STRIP */}
        <div className="logo-strip">
          <div className="shell logo-strip-inner">
            <span className="logo-strip-label">Powering</span>
            <div className="marquee">
              {[
                "Telegram Deal Channels", "Amazon Associates", "Flipkart Affiliates", "Coupon Hubs",
                "Instagram Bio Stores", "YouTube Creators", "WhatsApp Deal Groups", "D2C Brands",
                "Telegram Deal Channels", "Amazon Associates", "Flipkart Affiliates", "Coupon Hubs",
                "Instagram Bio Stores", "YouTube Creators", "WhatsApp Deal Groups", "D2C Brands",
              ].map((label, i) => (
                <span key={`${label}-${i}`}><span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--savings)", display: "inline-block" }} />{label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* PRODUCT BENTO */}
        <section className="section" id="product">
          <div className="shell">
            <div className="section-head">
              <span className="kicker">The Deal Link Engine</span>
              <h2>Engineered for maximum click-through &amp; conversion.</h2>
              <p className="section-sub">
                Generic shorteners look like spam links. BigSavingsDays builds buyer confidence with verified discount tags, coupon previews, and fast redirects.
              </p>
            </div>
            <div className="bento">
              <div className="bento-item bento-8">
                <div className="icon-box"><Chart /></div>
                <h3>Conversion analytics that drive revenue</h3>
                <p>Track every click with channel origin (Telegram, WhatsApp, Instagram, YouTube), peak shopping hours, devices, and countries. Optimize your deal posts with real data.</p>
                <div className="bento-visual">
                  <div className="card" style={{ padding: 14, background: "var(--bg-elev)" }}>
                    <AreaChart
                      data={[18, 26, 34, 48, 52, 75, 88, 92, 115, 140, 132, 168, 185, 210, 240, 290].map((value, i) => ({ label: `Day ${i + 1}`, value }))}
                      height={150}
                      id="bento"
                    />
                  </div>
                </div>
              </div>
              <div className="bento-item bento-4 bento-lime" style={{ background: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.25)" }}>
                <div className="icon-box" style={{ background: "var(--savings)", color: "#fff" }}><Qr /></div>
                <h3>Deal QR codes with discount badges</h3>
                <p>Generate high-res QR codes for packaging, flyers, or social stories. Scan directly into deals with pre-applied coupons.</p>
                <div style={{ marginTop: 18, display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ width: 84, height: 84, background: "#fff", borderRadius: 8, display: "grid", placeItems: "center", padding: 6, border: "1px solid var(--line)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/api/qr?text=https%3A%2F%2Fbigsavingsdays.com%2Fdemo&size=120" alt="" width={72} height={72} />
                  </div>
                  <span className="badge badge-deal">SVG · PNG · 4K</span>
                </div>
              </div>
              <div className="bento-item bento-4" id="deals-hub">
                <div className="icon-box"><Globe /></div>
                <h3>Deals Hub (Bio Storefronts)</h3>
                <p>Create a mobile storefront in your bio. Showcase today’s top discounts, flash sales, and coupons all in one curated link.</p>
                <div className="timeline" style={{ marginTop: 16 }}>
                  <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}>
                    <span className="mono small">bigsavingsdays.com/p/topdeals</span><span className="badge badge-deal">Live</span>
                  </div>
                  <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}>
                    <span className="mono small">bigsavingsdays.com/p/tech-loot</span><span className="badge badge-deal">75% OFF</span>
                  </div>
                </div>
              </div>
              <div className="bento-item bento-4">
                <div className="icon-box"><Lock /></div>
                <h3>Deal safeguards &amp; expiry fallbacks</h3>
                <p>Never lose traffic to dead links. When a flash sale ends, automatically redirect shoppers to an active alternative deal or category.</p>
                <div className="stack" style={{ gap: 10, marginTop: 16 }}>
                  <label className="row-between small"><span className="row gap-8"><Lock width={14} height={14} /> VIP Deal Password</span><span className="switch"><input type="checkbox" defaultChecked disabled /><span /></span></label>
                  <label className="row-between small"><span className="row gap-8"><Trend width={14} height={14} /> Flash Deal Cap</span><span className="mono">1,000 clicks</span></label>
                  <label className="row-between small"><span className="row gap-8"><Shield width={14} height={14} /> Safe Link Scanner</span><span className="badge badge-green">Verified</span></label>
                </div>
              </div>
              <div className="bento-item bento-4 bento-ink">
                <div className="icon-box"><Code /></div>
                <h3>Automated Affiliate &amp; Deal API</h3>
                <p>Bulk shorten deal feeds, auto-inject your affiliate tags, and fetch real-time click volume programmatically via JSON API.</p>
                <div className="code-block" style={{ marginTop: 16, fontSize: 10.5, padding: "10px 12px" }}>
                  <span className="c">// POST /api/v1/links</span><br />
                  <span className="k">curl</span> -X POST .../links <span className="s">\</span><br />
                  &nbsp;&nbsp;-H <span className="s">&quot;Authorization: Bearer bsd_sk_…&quot;</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ANALYTICS SHOWCASE */}
        <section className="section" id="analytics" style={{ background: "var(--bg-elev)", borderBlock: "1px solid var(--line)" }}>
          <div className="shell">
            <div className="section-head">
              <span className="kicker">The workspace</span>
              <h2>It looks like a product. <span className="serif">It works like one.</span></h2>
              <p className="section-sub">A fast dashboard that answers three questions: what&apos;s working, who&apos;s clicking, and what to do next.</p>
            </div>
            <DashboardPreview />
            <div className="row" style={{ justifyContent: "center", marginTop: 28, gap: 18, flexWrap: "wrap" }}>
              {["Live click feed", "Country & device split", "Referrer insights", "CSV export", "Team-ready admin"].map((f) => (
                <span key={f} className="chip"><Check width={13} height={13} style={{ color: "var(--success)" }} />{f}</span>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section">
          <div className="shell">
            <div className="section-head">
              <span className="kicker">How it works</span>
              <h2>Three steps to viral deal conversions.</h2>
            </div>
            <div className="steps">
              <div className="step">
                <div className="step-num">01</div>
                <h3>Paste the product destination</h3>
                <p>Drop any e-commerce or affiliate link (Amazon, Flipkart, Shopify). BigSavingsDays cleans unnecessary tracking clutter while keeping your affiliate tag intact.</p>
              </div>
              <div className="step">
                <div className="step-num">02</div>
                <h3>Add discount tags &amp; coupon codes</h3>
                <p>Attach visual badges like <code>70% OFF</code>, promo codes with 1-click copy, and fallback destinations for when flash sales sell out.</p>
              </div>
              <div className="step">
                <div className="step-num">03</div>
                <h3>Broadcast to Telegram, WA &amp; Bio</h3>
                <p>Watch clicks surge in real time. Know which channels (WhatsApp vs Telegram vs YouTube) drive your highest-converting buyer traffic.</p>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="section-sm" style={{ borderBlock: "1px solid var(--line)", background: "var(--bg-elev)" }}>
          <div className="shell bento">
            <div className="bento-item bento-3">
              <div className="icon-box"><Zap /></div>
              <h3>Fast by default</h3>
              <p>Redirects in a few milliseconds. No interstitial ads, no countdown pages, ever.</p>
            </div>
            <div className="bento-item bento-3">
              <div className="icon-box"><Shield /></div>
              <h3>Private analytics</h3>
              <p>No cookies on the redirect. IPs are hashed before storage. GDPR-minded from the start.</p>
            </div>
            <div className="bento-item bento-3">
              <div className="icon-box"><Sparkles /></div>
              <h3>Zero clutter</h3>
              <p>No upsell modals, no forced tours. A tool that respects your attention.</p>
            </div>
            <div className="bento-item bento-3">
              <div className="icon-box"><Globe /></div>
              <h3>Your own domain</h3>
              <p>Serve branded links from a domain you own, with a real DNS TXT ownership check.</p>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="section" id="pricing">
          <div className="shell">
            <PricingPlans />
          </div>
        </section>

        {/* FAQ */}
        <section className="section" style={{ background: "var(--bg-elev)", borderBlock: "1px solid var(--line)" }}>
          <div className="shell">
            <div className="section-head center">
              <span className="kicker">FAQ</span>
              <h2>Reasonable questions, straight answers.</h2>
            </div>
            <div className="faq">
              {faqs.map(({ q, a }) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <div className="answer">{a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section">
          <div className="shell">
            <div className="cta-band">
              <h2>Your deals deserve links that build buyer trust.</h2>
              <p>Start with BigSavingsDays.com today. Create branded deal links, build your Deals Hub bio store, and watch conversion rates soar.</p>
              <div className="hero-actions">
                <Link href="/signup" className="btn btn-deal btn-lg">Create Free Deal Account <ArrowRight width={17} height={17} /></Link>
                <Link href="/docs" className="btn btn-ghost btn-lg">Read the API docs <ArrowUpRight width={16} height={16} /></Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
