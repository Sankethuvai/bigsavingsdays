import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { contactAction } from "./actions";
import { Check, Info, Mail, Code } from "@/components/icons";

export const metadata = { title: "Contact", description: "Talk to the BigSavingsDays team about deal plans, bulk affiliate APIs or support." };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  const user = await getSessionUser();

  return (
    <>
      <SiteNav signedIn={!!user} />
      <main className="section-sm">
        <div className="shell" style={{ maxWidth: 960 }}>
          <div className="section-head"><span className="kicker">Contact</span><h2>Tell us what you&apos;re trying to do.</h2><p className="section-sub">Migrations, plans, API questions or a bug. We read everything.</p></div>

          <div className="dash-grid" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
            <div className="card card-pad">
              {sent === "1" ? (
                <div className="center" style={{ padding: "30px 0" }}>
                  <div className="icon-box" style={{ margin: "0 auto 14px", color: "var(--success)" }}><Check /></div>
                  <h3 style={{ fontSize: 22 }}>Message received</h3>
                  <p className="muted mt-8 small">In this demo no email is sent. In production this would hit your support inbox.</p>
                </div>
              ) : (
                <form action={contactAction} className="form-grid">
                  <div className="form-grid form-grid-2">
                    <div className="field"><label className="label" htmlFor="name">Name</label><input id="name" className="input" name="name" required /></div>
                    <div className="field"><label className="label" htmlFor="email">Email</label><input id="email" className="input" name="email" type="email" required /></div>
                  </div>
                  <div className="field"><label className="label" htmlFor="topic">Topic</label>
                    <select id="topic" className="select" name="topic" defaultValue="support">
                      <option value="support">Support</option>
                      <option value="sales">Plans & sales</option>
                      <option value="migration">Migration</option>
                      <option value="api">API</option>
                      <option value="security">Security report</option>
                    </select>
                  </div>
                  <div className="field"><label className="label" htmlFor="message">Message</label><textarea id="message" className="textarea" name="message" rows={6} required minLength={10} placeholder="Give us the context — links, screenshots, what you expected." /></div>
                  {error === "rate" ? <p className="error-text">Too many messages from this network. Try again later.</p> : error ? <p className="error-text">Please add your name, a valid email and at least 10 characters.</p> : null}
                  <div><button className="btn btn-primary" type="submit">Send message</button></div>
                  <p className="hint">Demo form — no message is transmitted or stored.</p>
                </form>
              )}
            </div>

            <div className="stack">
              <div className="card card-pad">
                <div className="row gap-8"><Mail width={16} height={16} style={{ color: "var(--muted)" }} /><span className="panel-title">Email</span></div>
                <p className="small muted mt-8">{process.env.SUPPORT_EMAIL ?? "support@example.com"}</p>
                <p className="hint mt-8">Configured with <code>SUPPORT_EMAIL</code>.</p>
              </div>
              <div className="card card-pad">
                <div className="row gap-8"><Code width={16} height={16} style={{ color: "var(--muted)" }} /><span className="panel-title">Docs</span></div>
                <p className="small muted mt-8">API quickstart, error codes and rate limits.</p>
                <Link href="/docs" className="btn btn-ghost btn-sm mt-8">Read the docs</Link>
              </div>
              <div className="card card-pad">
                <div className="row gap-8"><Info width={16} height={16} style={{ color: "var(--muted)" }} /><span className="panel-title">Response times</span></div>
                <div className="kv mt-8"><dt>Free</dt><dd>2–3 business days</dd></div>
                <div className="kv"><dt>Pro</dt><dd>Under 24 hours</dd></div>
                <div className="kv"><dt>Business</dt><dd>4 business hours</dd></div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
