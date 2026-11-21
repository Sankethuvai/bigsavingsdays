import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dailySeries, totalsFor, breakdown, topLinks } from "@/lib/analytics";
import { AreaChart } from "@/components/area-chart";
import { formatNumber, percent, timeAgo, displayUrl } from "@/lib/utils";
import { Download, Trend, Globe, Chart, ArrowUpRight } from "@/components/icons";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const ranges = [7, 30, 90] as const;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysRaw } = await searchParams;
  const days = ranges.includes(Number(daysRaw) as 7 | 30 | 90) ? Number(daysRaw) : 30;

  const user = await requireUser("/dashboard/analytics");
  const totals = totalsFor(user.id);
  const series = dailySeries({ userId: user.id, days });
  const devices = breakdown(user.id, "device", days);
  const countries = breakdown(user.id, "country", days);
  const referrers = breakdown(user.id, "referrer", days);
  const browsers = breakdown(user.id, "browser", days);
  const links = topLinks(user.id, days);
  const periodClicks = series.reduce((s, d) => s + d.value, 0);
  const best = series.reduce((a, b) => (b.value > a.value ? b : a), series[0] ?? { label: "—", value: 0 });
  const totalDevice = devices.reduce((s, d) => s + d.n, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Everything your links did, without the noise.</p>
        </div>
        <div className="row gap-8">
          <div className="seg">
            {ranges.map((r) => (
              <Link key={r} href={`/dashboard/analytics?days=${r}`} className={days === r ? "active" : ""}>{r}d</Link>
            ))}
          </div>
          <a href="/api/export?type=clicks" className="btn btn-ghost btn-sm"><Download width={14} height={14} /> Export CSV</a>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Clicks <span className="badge tiny">{days}d</span></div>
          <div className="kpi-value">{formatNumber(periodClicks)}</div>
          <div className="kpi-delta"><span className={totals.growth >= 0 ? "delta-up" : "delta-down"}>{totals.growth >= 0 ? "↑" : "↓"} {Math.abs(totals.growth)}%</span> vs prior 30d</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Best day</div>
          <div className="kpi-value">{formatNumber(best.value)}</div>
          <div className="kpi-delta">{best.label}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Daily average</div>
          <div className="kpi-value">{formatNumber(Math.round(periodClicks / days))}</div>
          <div className="kpi-delta">across {days} days</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Countries</div>
          <div className="kpi-value">{countries.length}</div>
          <div className="kpi-delta">Top: {countries[0]?.label ?? "—"}</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="stack">
          <div className="card chart-card">
            <div className="chart-head">
              <div>
                <div className="panel-title">Click trend</div>
                <div className="panel-sub">Last {days} days · all links</div>
              </div>
              <span className="badge badge-lime"><Trend width={12} height={12} /> {formatNumber(periodClicks)} clicks</span>
            </div>
            <AreaChart data={series} height={260} id={`analytics-${days}`} />
          </div>

          <div className="card">
            <div className="card-pad"><div className="panel-title">Links performance</div><div className="panel-sub">Top links in this period</div></div>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="data">
                <thead><tr><th>Link</th><th>Destination</th><th>Clicks</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {links.map((l) => (
                    <tr key={l.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>/{l.slug}</td>
                      <td className="link-target">{displayUrl(l.url, 40)}</td>
                      <td style={{ fontWeight: 650 }}>{formatNumber(l.clicks)}</td>
                      <td><span className={`badge ${l.active ? "badge-green" : "badge-red"}`}>{l.active ? "Live" : "Paused"}</span></td>
                      <td style={{ textAlign: "right" }}><Link href={`/dashboard/links/${l.id}`} className="icon-action"><ArrowUpRight /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {links.length === 0 && <div className="empty">No links yet.</div>}
          </div>
        </div>

        <div className="stack">
          <div className="card card-pad">
            <div className="panel-title">Devices</div>
            <div style={{ marginTop: 12 }}>
              {devices.map((d) => (
                <div key={d.label} className="bar-row">
                  <div className="bar-label"><span style={{ textTransform: "capitalize" }}>{d.label}</span><span>{percent(d.n, totalDevice)}%</span></div>
                  <div className="bar"><i style={{ width: `${Math.max(d.pct, 3)}%` }} /></div>
                </div>
              ))}
              {devices.length === 0 && <p className="small muted">No data.</p>}
            </div>
          </div>
          <div className="card card-pad">
            <div className="panel-title">Top countries</div>
            <div style={{ marginTop: 12 }}>
              {countries.map((c) => (
                <div key={c.label} className="bar-row">
                  <div className="bar-label"><span>{c.label}</span><span>{c.n}</span></div>
                  <div className="bar"><i style={{ width: `${Math.max(c.pct, 3)}%` }} /></div>
                </div>
              ))}
              {countries.length === 0 && <p className="small muted">No data.</p>}
            </div>
          </div>
          <div className="card card-pad">
            <div className="panel-title">Referrers</div>
            <div style={{ marginTop: 6 }}>
              {referrers.map((r) => (
                <div key={r.label} className="list-row" style={{ padding: "8px 0" }}>
                  <span className="link-fav" style={{ width: 24, height: 24, borderRadius: 6 }}>{r.label.slice(0, 2)}</span>
                  <div className="main"><div className="t" style={{ fontSize: 12.5 }}>{r.label}</div><div className="s">{r.pct}% of clicks</div></div>
                  <span className="small muted">{formatNumber(r.n)}</span>
                </div>
              ))}
              {referrers.length === 0 && <p className="small muted">No data.</p>}
            </div>
          </div>
          <div className="card card-pad">
            <div className="panel-title">Browsers</div>
            <div className="row gap-4" style={{ flexWrap: "wrap", marginTop: 10 }}>
              {browsers.map((b) => (<span key={b.label} className="chip">{b.label} · {b.n}</span>))}
              {browsers.length === 0 && <p className="small muted">No data.</p>}
            </div>
            <div className="alert mt-16" style={{ fontSize: 12 }}>
              <span className="row gap-8"><Globe width={13} height={13} /> Geographic and browser telemetry is aggregated in real-time at the edge.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
