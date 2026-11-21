import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PricingPlans } from "@/components/pricing-plans";
import { getSessionUser } from "@/lib/auth";
import { Check } from "@/components/icons";
import { demoEnabled } from "@/lib/env";

export const metadata = {
  title: "Pricing",
  description: "Simple pricing for short links, QR codes, analytics and custom domains. Free to start, no credit card.",
};

const comparison = [
  ["Links", "50", "5,000", "1,000,000"],
  ["Click history", "Retained", "Retained", "Retained"],
  ["Custom domains", "—", "1", "10"],
  ["QR code downloads", "PNG", "PNG", "PNG"],
  ["API access", "Yes", "Yes", "Yes"],
  ["CSV export", "Yes", "Yes", "Yes"],
  ["Password & expiry links", "Yes", "Yes", "Yes"],
  ["Support", "Community", "Priority", "Priority"],
];

export default async function PricingPage() {
  const showDemo = demoEnabled();
  const user = await getSessionUser();
  return (
    <>
      <SiteNav signedIn={!!user} />
      <main>
        <section className="section-sm" style={{ paddingTop: 56 }}>
          <div className="shell">
            <div className="section-head center" style={{ marginBottom: 34 }}>
              <span className="kicker">Pricing</span>
              <h2>Simple plans. <span className="serif">Serious numbers.</span></h2>
              <p className="section-sub">Every plan includes unlimited redirects, QR codes and privacy-first tracking. Pay for volume and control, not for the basics.</p>
            </div>
            <PricingPlans compact />
          </div>
        </section>

        <section className="section-sm" style={{ background: "var(--bg-elev)", borderBlock: "1px solid var(--line)" }}>
          <div className="shell">
            <div className="section-head"><h2 style={{ fontSize: 32 }}>Compare plans</h2></div>
            <div className="table-wrap">
              <table className="data" style={{ minWidth: 640 }}>
                <thead><tr><th>Feature</th><th>Free</th><th>Pro</th><th>Business</th></tr></thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row[0]}>
                      <td style={{ fontWeight: 550 }}>{row[0]}</td>
                      {row.slice(1).map((cell, i) => (
                        <td key={i} className={cell === "—" ? "muted" : ""}>{cell === "Yes" ? <Check width={15} height={15} style={{ color: "var(--success)" }} /> : cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted mt-16">All prices exclude GST. Annual plans are billed once and renew yearly. Need a custom contract? <Link href="/contact" style={{ textDecoration: "underline" }}>Talk to us</Link>.</p>
          </div>
        </section>

        <section className="section">
          <div className="shell">
            <div className="section-head center"><h2>Before you ask</h2></div>
            <div className="faq">
              {[
                ["Is there a free trial on paid plans?", "No trial clock — the free plan is genuinely usable. Upgrade when you need more links, custom domains or longer history, and downgrade whenever."],
                ["What counts as a link?", "Every unique short link you create. Editing an existing link does not count again. Redirects are unlimited on every plan."],
                ["Do you charge per click?", "Never. Clicks are unlimited. We don't throttle or monetise redirects with ads or interstitials."],
                ["Can I cancel and keep my links?", "Yes. Existing links keep redirecting after downgrade. You simply lose access to features above the free tier until you upgrade again."],
              ].map(([q, a]) => (
                <details key={q}><summary>{q}</summary><div className="answer">{a}</div></details>
              ))}
            </div>
          </div>
        </section>

        <section className="section-sm">
          <div className="shell">
            <div className="cta-band">
              <h2>Start free. Grow when it earns it.</h2>
              <p>No card, no sales call, no dark pattern at the exit.</p>
              <div className="hero-actions"><Link href="/signup" className="btn btn-lime btn-lg">Create free account</Link>{showDemo && <Link href="/demo" className="btn btn-ghost btn-lg">Try the demo</Link>}</div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
