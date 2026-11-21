import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <div className="notfound">
        <div>
          <div className="big">404</div>
          <h1 style={{ fontSize: 28, marginTop: 12 }}>This link went looking for a better story.</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 440, marginInline: "auto" }}>
            The page or short link you followed doesn&apos;t exist, was deleted, or never did.
          </p>
          <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
            <Link href="/" className="btn btn-deal">Back to BigSavingsDays</Link>
            <Link href="/dashboard" className="btn btn-ghost">Open dashboard</Link>
          </div>
        </div>
      </div>
    </>
  );
}
