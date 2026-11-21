import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { saveSettingsAction } from "../../actions";
import { Info } from "@/components/icons";

export const metadata = { title: "Admin · Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  await requireAdmin();
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <>
      <div className="page-head">
        <div><h1>Platform settings</h1><p>Global platform switches.</p></div>
      </div>
      <div className="dash-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <form action={saveSettingsAction} className="card card-pad">
          <div className="panel-title">Signups & pricing</div>
          <p className="panel-sub" style={{ marginBottom: 14 }}>These values are stored in the settings table.</p>
          <div className="form-grid">
            <label className="checkbox">
              <input type="checkbox" name="signups_open" defaultChecked={map.signups_open === "1"} />
              Allow new account signups
            </label>
            <div className="field">
              <label className="label" htmlFor="price">Default Pro price (INR)</label>
              <input id="price" className="input" type="number" name="default_price" defaultValue={map.default_price ?? "499"} min={0} />
            </div>
            <div><button className="btn btn-primary btn-sm" type="submit">Save settings</button></div>
          </div>
        </form>

        <div className="card card-pad">
          <div className="panel-title">Environment</div>
          <div className="timeline mt-8">
            <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}><span>Runtime</span><span className="mono small">Node {process.version}</span></div>
            <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}><span>Framework</span><span className="mono small">Next.js 16</span></div>
            <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}><span>Database</span><span className="mono small">SQLite (WAL)</span></div>
            <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}><span>Mode</span><span className="badge">{process.env.NODE_ENV}</span></div>
          </div>
          <div className="alert mt-16" style={{ display: "flex", gap: 8 }}>
            <Info width={14} height={14} style={{ flex: "none", marginTop: 2 }} />
            <span className="small">Every change here is written to the audit log with the acting admin and a hashed IP. Use a strong admin password and keep the admin area behind your proxy&apos;s access rules.</span>
          </div>
        </div>
      </div>
    </>
  );
}
