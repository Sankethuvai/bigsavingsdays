import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Privacy Policy", description: "How BigSavingsDays handles deal data, click analytics, cookies and account information." };

export default async function PrivacyPage() {
  const user = await getSessionUser();
  return (
    <>
      <SiteNav signedIn={!!user} />
      <main className="section-sm">
        <div className="shell prose">
          <span className="kicker">Legal</span>
          <h1>Privacy Policy</h1>
          <p className="muted">Last updated: November 21, 2026 · BigSavingsDays.com</p>

          <h2>What we collect</h2>
          <ul>
            <li><b>Account data:</b> name, email, hashed password, plan and workspace preferences.</li>
            <li><b>Link data:</b> destinations, slugs, titles, deal tags, access controls and creation timestamps.</li>
            <li><b>Click data:</b> timestamp, country, region/city when provided by the network, device type, browser, operating system, referrer and a salted hash of the IP address.</li>
            <li><b>Billing data:</b> handled by our payment processor. BigSavingsDays never stores full card numbers.</li>
          </ul>

          <h2>What we do not collect</h2>
          <p>We do not set advertising cookies on redirects. We do not sell personal data. We do not build cross-site behavioural profiles. Deployments store click IPs as a SHA-256 hash with a server-side salt, not in plain text.</p>

          <h2 id="cookies">Cookies</h2>
          <p>BigSavingsDays uses a minimal number of first-party cookies:</p>
          <ul>
            <li><code>bsd_session</code> / <code>velo_session</code> — keeps you signed in securely. HttpOnly, SameSite=Lax.</li>
            <li><code>bsd_unlock_*</code> — remembers a deal password unlock for 30 minutes.</li>
            <li><code>bsd-theme</code> — remembers your light/dark mode preference.</li>
          </ul>
          <p>No third-party surveillance or tracking cookies are set on redirects.</p>

          <h2>Legal bases</h2>
          <p>For visitors in the EEA/UK, we rely on legitimate interests for security and aggregate analytics, contract necessity for account features, and consent where required for optional communications. You can object to analytics processing by contacting us.</p>

          <h2>Retention</h2>
          <p>Click data is retained according to plan (30 days on Free, unlimited on paid plans). Account data is retained while the account exists. Backups are rotated within 30 days of deletion. Aggregated, de-identified counts may be kept for capacity planning.</p>

          <h2>Your rights</h2>
          <p>You can access, correct, export or delete your data from the dashboard, or by contacting us. You may also lodge a complaint with your local data protection authority. We respond to verified requests within 30 days.</p>

          <h2>Processors</h2>
          <p>A production deployment would use a hosting provider, a transactional email provider, a payment processor and an error-monitoring service. Each would be bound by a data processing agreement.</p>

          <h2>Security</h2>
          <p>Passwords use scrypt with per-user salts. Sessions are HttpOnly and SameSite. API keys are shown once and stored hashed. Access to production is restricted and logged. No system is perfectly secure; report issues responsibly.</p>

          <h2>Contact</h2>
          <p>Privacy questions: <Link href="/contact" style={{ textDecoration: "underline" }}>contact us</Link>.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
