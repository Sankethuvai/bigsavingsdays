import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { DomainRow } from "@/lib/types";
import { addDomainAction, deleteDomainAction, verifyDomainAction } from "./actions";
import { Check, Globe, Plus, Trash, Info } from "@/components/icons";
import { cnameTarget, domainVerifyMode } from "@/lib/env";

export const metadata = { title: "Domains" };
export const dynamic = "force-dynamic";

export default async function DomainsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireUser("/dashboard/domains");
  const domains = getDb().prepare("SELECT * FROM domains WHERE user_id = ? ORDER BY created_at DESC").all(user.id) as DomainRow[];
  const limit = user.plan === "business" ? 10 : user.plan === "pro" ? 1 : 0;
  const manual = domainVerifyMode() === "manual";
  const cname = cnameTarget();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Domains</h1>
          <p>Connect a domain so links carry your brand, not ours.</p>
        </div>
        <span className="badge">{domains.length} / {limit} domains used</span>
      </div>

      {error && (
        <div className="alert" style={{ marginBottom: 16 }}>
          {error === "invalid" ? "Enter a valid domain like go.yourbrand.com." : error === "taken" ? "That domain is already connected." : error === "reserved" ? "That hostname belongs to Velo itself and cannot be connected." : error === "dns" ? "The TXT record was not found yet. DNS can take up to 24 hours to propagate, then try again." : error === "plan" ? "Custom domains are only available on Pro and Business plans." : "You have used every custom domain on your plan. Upgrade or remove one to add another."}
        </div>
      )}

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="panel-title">Add a custom domain</div>
        <p className="panel-sub" style={{ marginBottom: 12 }}>Use a subdomain like go.yourbrand.com. Root domains need an A record too.</p>
        <form action={addDomainAction} className="row gap-8" style={{ flexWrap: "wrap" }}>
          <input className="input" name="hostname" placeholder="go.yourbrand.com" style={{ flex: 1, minWidth: 220 }} required />
          <button className="btn btn-primary btn-sm" type="submit"><Plus width={14} height={14} /> Connect domain</button>
        </form>
      </div>

      <div className="stack">
        {domains.map((d) => (
          <div key={d.id} className="card card-pad">
            <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
              <div className="row gap-12">
                <div className="icon-box" style={{ margin: 0 }}><Globe /></div>
                <div>
                  <div className="panel-title">{d.hostname}</div>
                  <div className="panel-sub">Added {new Date(d.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="row gap-8">
                <span className={`badge ${d.status === "verified" ? "badge-green" : "badge-blue"}`}>{d.status === "verified" ? <><Check width={11} height={11} /> Verified</> : "Pending DNS"}</span>
                {d.status !== "verified" && (
                  <form action={verifyDomainAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="btn btn-soft btn-sm" type="submit">Verify DNS</button>
                  </form>
                )}
                <form action={deleteDomainAction}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="icon-action" type="submit" aria-label="Remove domain" style={{ color: "var(--danger)" }}><Trash /></button>
                </form>
              </div>
            </div>

            {d.status !== "verified" && (
              <div className="mt-16">
                <table className="data" style={{ minWidth: 480 }}>
                  <thead><tr><th>Type</th><th>Name</th><th>Value</th></tr></thead>
                  <tbody>
                    <tr><td>CNAME</td><td className="mono">{d.hostname}</td><td className="mono">{cname}</td></tr>
                    <tr><td>TXT</td><td className="mono">_velo.{d.hostname}</td><td className="mono">{d.verification_token}</td></tr>
                  </tbody>
                </table>
                <p className="hint mt-8">DNS changes can take up to 24 hours. Velo checks the TXT record when you press Verify DNS. TLS certificates are issued by your reverse proxy or certificate manager once DNS points at this server.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {domains.length === 0 && (
        <div className="card empty">
          <Globe />
          <p>No domains connected yet. Free plans use velo.link; Pro and Business can bring their own.</p>
        </div>
      )}

      <div className="card card-pad mt-24">
        <div className="row gap-8" style={{ alignItems: "flex-start" }}>
          <Info width={16} height={16} style={{ color: "var(--muted)", marginTop: 2 }} />
          <p className="small muted">
            {manual
              ? "Manual verification is enabled (DOMAIN_VERIFY_MODE=manual). This is for local development only; production requires the TXT record to match."
              : "A domain is served only after the _velo TXT record matches its verification token. Point the CNAME at this server and let your proxy or certificate manager handle TLS."}
          </p>
        </div>
      </div>
    </div>
  );
}
