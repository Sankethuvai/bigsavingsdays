import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Terms of Service", description: "BigSavingsDays terms of service, acceptable use and fair-use policy." };

export default async function TermsPage() {
  const user = await getSessionUser();
  return (
    <>
      <SiteNav signedIn={!!user} />
      <main className="section-sm">
        <div className="shell prose">
          <span className="kicker">Legal</span>
          <h1>Terms of Service</h1>
          <p className="muted">Last updated: November 21, 2026 · BigSavingsDays.com</p>

          <div className="alert mt-24" style={{ maxWidth: 680 }}>These terms govern the use of the BigSavingsDays.com deal shortening, Deals Hub, and affiliate link management platform.</div>

          <h2>1. The agreement</h2>
          <p>By creating an account or using BigSavingsDays (&ldquo;the service&rdquo;), you agree to these terms. If you use BigSavingsDays for an organisation, you confirm you have authority to bind that organisation.</p>

          <h2>2. Your account</h2>
          <p>You are responsible for keeping your credentials and API keys secure, and for all activity under your workspace. Provide accurate information and tell us promptly about unauthorised access.</p>

          <h2>3. Acceptable use</h2>
          <p id="acceptable-use">You may not use BigSavingsDays to:</p>
          <ul>
            <li>distribute malware, phishing pages, or deceptive redirects;</li>
            <li>publish content that is illegal, sexually exploitative of minors, or incites violence;</li>
            <li>evade platform safety systems, spam filters, or rate limits;</li>
            <li>infringe intellectual property or violate privacy rights;</li>
            <li>send unsolicited bulk messages or operate click fraud.</li>
          </ul>
          <p>We may disable links or suspend workspaces that violate these rules, with notice where practical. Serious abuse may be reported to relevant authorities.</p>

          <h2>4. Links and content</h2>
          <p>You keep ownership of the destinations you link to and the metadata you provide. You grant us the limited licence needed to operate the service — storing URLs, generating redirects, and producing aggregate analytics. We do not sell click data.</p>

          <h2>5. Plans and billing</h2>
          <p>Paid plans renew automatically until cancelled. Prices are shown in INR and exclude applicable taxes. Refunds are handled case by case within 14 days of a charge. Downgrading never breaks existing redirects; it changes feature access.</p>

          <h2>6. Availability</h2>
          <p>We target high availability but do not guarantee uninterrupted service on free plans. Business plans may include a separate SLA. Scheduled maintenance is announced on the status page.</p>

          <h2>7. Termination</h2>
          <p>You may delete your account at any time. We may suspend accounts for material breach, non-payment, or risk to the platform. On termination, links stop redirecting after a short grace period, and data is deleted per the Privacy Policy.</p>

          <h2>8. Liability</h2>
          <p>To the maximum extent permitted by law, BigSavingsDays is not liable for indirect or consequential losses, lost profits, or lost data. Our aggregate liability is limited to the amount you paid in the twelve months before the claim.</p>

          <h2>9. Contact</h2>
          <p>Questions about these terms? <Link href="/contact" style={{ textDecoration: "underline" }}>Contact us</Link>.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
