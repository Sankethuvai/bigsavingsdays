import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>The high-converting deal & affiliate link platform. Shorten links, build deals hubs, display verified discount badges, and track high-value clicks.</p>
            <div className="row gap-8 mt-16">
              <span className="badge"><span className="dot" style={{ width: 6, height: 6, borderRadius: 99, background: "var(--success)", display: "inline-block" }} /> All systems operational</span>
            </div>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><Link href="/#product">Features</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/docs">API docs</Link></li>
              <li><Link href="/#analytics">Analytics</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/status">Status</Link></li>
              <li><Link href="/changelog">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/privacy#cookies">Cookies</Link></li>
              <li><Link href="/terms#acceptable-use">Acceptable use</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© {new Date().getFullYear()} BigSavingsDays.com. The deal link platform for creators & affiliate marketers.</div>
          <div className="row gap-16">
            <Link href="/docs">Docs</Link>
            <Link href="/status">Status</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
