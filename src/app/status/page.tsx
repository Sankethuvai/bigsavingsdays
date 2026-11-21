import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Check, Info } from "@/components/icons";

export const metadata = { title: "Status", description: "Live BigSavingsDays service checks." };
export const dynamic = "force-dynamic";

type Check = { name: string; ok: boolean; detail: string };

function currentChecks(): Check[] {
  const checks: Check[] = [
    { name: "Web application", ok: true, detail: "This response was rendered by the app" },
  ];
  try {
    const db = getDb();
    const alive = (db.prepare("SELECT 1 AS ok").get() as { ok: number }).ok === 1;
    checks.push({ name: "Database", ok: alive, detail: alive ? "SQLite answered a query" : "No response" });

    const tables = db
      .prepare(
        `SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'
         AND name IN ('users','links','clicks','sessions','domains','rate_limits')`
      )
      .get() as { n: number };
    checks.push({ name: "Schema", ok: tables.n === 6, detail: `${tables.n} of 6 core tables present` });

    const wal = String(db.pragma("journal_mode", { simple: true })).toLowerCase() === "wal";
    checks.push({ name: "Write-ahead log", ok: wal, detail: wal ? "WAL enabled" : "WAL is not active" });
  } catch {
    checks.push({ name: "Database", ok: false, detail: "Database check failed" });
  }
  return checks;
}

export default async function StatusPage() {
  const user = await getSessionUser();
  const checks = currentChecks();
  const healthy = checks.every((check) => check.ok);

  return (
    <>
      <SiteNav signedIn={!!user} />
      <main className="section-sm">
        <div className="shell" style={{ maxWidth: 900 }}>
          <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="kicker">Status</span>
              <h2 style={{ fontSize: 40 }}>{healthy ? "All systems operational." : "Degraded."}</h2>
              <p className="section-sub">Live checks taken while rendering this page.</p>
            </div>
            <span className={`badge ${healthy ? "badge-green" : "badge-red"}`} style={{ padding: "8px 14px" }}>
              <Check width={13} height={13} /> {healthy ? "Healthy" : "Attention needed"}
            </span>
          </div>

          <div className="card mt-24">
            {checks.map((check) => (
              <div key={check.name} className="list-row" style={{ padding: "14px 20px" }}>
                <div className="main">
                  <div className="t">{check.name}</div>
                  <div className="s">{check.detail}</div>
                </div>
                <span className={`badge ${check.ok ? "badge-green" : "badge-red"}`}>
                  {check.ok ? "Operational" : "Degraded"}
                </span>
              </div>
            ))}
          </div>

          <div className="card card-pad mt-16">
            <div className="row gap-8" style={{ alignItems: "flex-start" }}>
              <Info width={16} height={16} style={{ color: "var(--muted)", marginTop: 2 }} />
              <p className="small muted">
                This page performs live checks; it does not invent uptime history. For historical uptime
                and alerting, point your monitor at <code>/api/health</code>. It returns <code>200</code> when
                the database, schema and WAL mode are healthy and <code>503</code> otherwise.
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
