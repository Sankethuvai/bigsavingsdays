import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { adminOverview, platformSeries, platformTopLinks, recentUsers } from "@/lib/analytics";
import { AreaChart } from "@/components/area-chart";
import { formatNumber, timeAgo, initials } from "@/lib/utils";
import { ArrowUpRight, Users, LinkIcon, Chart, Trend, Globe } from "@/components/icons";

export const metadata = { title: "Admin overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await requireAdmin();
  const stats = adminOverview();
  const series = platformSeries(30);
  const top = platformTopLinks(6);
  const users = recentUsers(6);
  const period = series.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Platform overview</h1>
          <p>All workspaces, deal links and clicks across BigSavingsDays.com.</p>
        </div>
        <span className="badge badge-green">Operational</span>
      </div>

      <div className="stat-strip">
        <div className="kpi"><div className="kpi-label">Total users <Users width={14} height={14} /></div><div className="kpi-value">{formatNumber(stats.users)}</div><div className="kpi-delta">{stats.activeUsers} active in 30d</div></div>
        <div className="kpi"><div className="kpi-label">Links <LinkIcon width={14} height={14} /></div><div className="kpi-value">{formatNumber(stats.links)}</div><div className="kpi-delta">{formatNumber(stats.clicks)} lifetime clicks</div></div>
        <div className="kpi"><div className="kpi-label">Clicks (30d) <Chart width={14} height={14} /></div><div className="kpi-value">{formatNumber(stats.clicks30)}</div><div className="kpi-delta">Across all workspaces</div></div>
        <div className="kpi"><div className="kpi-label">Est. MRR <Trend width={14} height={14} /></div><div className="kpi-value">₹{stats.mrr.toLocaleString("en-IN")}</div><div className="kpi-delta">Demo billing, not collected</div></div>
      </div>

      <div className="dash-grid">
        <div className="stack">
          <div className="card chart-card">
            <div className="chart-head">
              <div><div className="panel-title">Platform clicks</div><div className="panel-sub">Last 30 days · {formatNumber(period)} total</div></div>
              <span className="badge badge-lime"><Trend width={12} height={12} /> Live</span>
            </div>
            <AreaChart data={series} height={240} id="admin" />
          </div>

          <div className="card">
            <div className="card-pad"><div className="panel-title">Top links platform-wide</div><div className="panel-sub">By lifetime clicks</div></div>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="data" style={{ minWidth: 560 }}>
                <thead><tr><th>Slug</th><th>Owner</th><th>Title</th><th>Clicks</th></tr></thead>
                <tbody>
                  {top.map((l) => (
                    <tr key={l.slug}>
                      <td className="mono" style={{ fontWeight: 600 }}>/{l.slug}</td>
                      <td className="muted small">{l.email}</td>
                      <td>{l.title || "—"}</td>
                      <td style={{ fontWeight: 650 }}>{formatNumber(l.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card card-pad">
            <div className="row-between" style={{ marginBottom: 6 }}>
              <div className="panel-title">Newest users</div>
              <Link href="/admin/users" className="small muted">View all</Link>
            </div>
            {users.map((u) => (
              <div key={u.id} className="list-row">
                <span className="avatar" style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}>{initials(u.name)}</span>
                <div className="main">
                  <div className="t">{u.name}</div>
                  <div className="s">{u.email}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="badge" style={{ textTransform: "capitalize" }}>{u.plan}</div>
                  <div className="tiny muted mt-8">{timeAgo(u.created_at)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card card-pad">
            <div className="panel-title">Health</div>
            <div className="timeline mt-8">
              <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}><span>Redirect service</span><span className="badge badge-green">Operational</span></div>
              <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}><span>Analytics ingestion</span><span className="badge badge-green">Operational</span></div>
              <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}><span>API</span><span className="badge badge-green">Operational</span></div>
              <div className="timeline-row" style={{ gridTemplateColumns: "1fr auto" }}><span>QR generator</span><span className="badge badge-green">Operational</span></div>
            </div>
            <p className="hint mt-12">Demo status page. Wire to your uptime provider in production.</p>
          </div>

          <div className="card card-pad">
            <div className="row gap-8"><Globe width={15} height={15} style={{ color: "var(--muted)" }} /><span className="panel-title">Data quality</span></div>
            <div className="kv mt-8"><dt>Click rows</dt><dd>{formatNumber(stats.clicks)}</dd></div>
            <div className="kv"><dt>Users</dt><dd>{stats.users}</dd></div>
            <div className="kv"><dt>Avg. links / user</dt><dd>{(stats.links / Math.max(stats.users, 1)).toFixed(1)}</dd></div>
            <div className="kv"><dt>Avg. clicks / link</dt><dd>{(stats.clicks / Math.max(stats.links, 1)).toFixed(1)}</dd></div>
          </div>
        </div>
      </div>

      <div className="card card-pad mt-16">
        <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div><div className="panel-title">Need the moderation queue?</div><p className="panel-sub">Disable links, adjust plans and manage users from the tables.</p></div>
          <div className="row gap-8"><Link href="/admin/users" className="btn btn-ghost btn-sm">Users</Link><Link href="/admin/links" className="btn btn-primary btn-sm">Moderate links <ArrowUpRight width={13} height={13} /></Link></div>
        </div>
      </div>
    </>
  );
}
