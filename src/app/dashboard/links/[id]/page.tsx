import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getBaseUrl } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { dailySeries, breakdown, linkStats } from "@/lib/analytics";
import { AreaChart } from "@/components/area-chart";
import { CopyButton } from "@/components/copy-button";
import { formatDate, formatNumber, timeAgo, displayUrl, percent } from "@/lib/utils";
import { linkShortUrl } from "@/lib/domains";
import { ArrowUpRight, Clock, Download, Globe, Lock, Qr, Trend } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function LinkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const db = getDb();
  const base = await getBaseUrl();

  const link = db
    .prepare(
      `SELECT l.*, d.hostname AS domain_host FROM links l
       LEFT JOIN domains d ON d.id = l.domain_id
       WHERE l.id = ? AND l.user_id = ?`
    )
    .get(id, user.id) as
    | {
        id: string; slug: string; url: string; title: string; tags: string; active: number;
        password_hash: string | null; expires_at: number | null; click_limit: number | null;
        created_at: number; updated_at: number; domain_host: string | null;
      }
    | undefined;

  if (!link) notFound();

  const stats = linkStats(link.id, 30);
  const series = dailySeries({ linkId: link.id, days: 30 });
  const devices = breakdown(user.id, "device", 30, link.id);
  const countries = breakdown(user.id, "country", 30, link.id);
  const referrers = breakdown(user.id, "referrer", 30, link.id);
  const browsers = breakdown(user.id, "browser", 30, link.id);
  const shortUrl = linkShortUrl(base, link.slug, link.domain_host);

  const recent = db
    .prepare("SELECT ts, country, device, browser, os, referrer FROM clicks WHERE link_id = ? ORDER BY ts DESC LIMIT 14")
    .all(link.id) as { ts: number; country: string; device: string; browser: string; os: string; referrer: string }[];

  return (
    <div className="page">
      <div className="crumbs" style={{ marginBottom: 12 }}>
        <Link href="/dashboard/links">Links</Link>
        <span style={{ opacity: .4 }}>/</span>
        <b className="mono">/{link.slug}</b>
      </div>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="row gap-8" style={{ flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 26 }}>/{link.slug}</h1>
            <span className={`badge ${link.active ? "badge-green" : "badge-red"}`}>{link.active ? "Live" : "Paused"}</span>
            {link.password_hash && <span className="badge"><Lock width={11} height={11} /> Password</span>}
          </div>
          <p>{link.title || displayUrl(link.url, 70)}</p>
        </div>
        <div className="row gap-8">
          <CopyButton text={shortUrl} label="Copy short link" />
          <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Open <ArrowUpRight width={13} height={13} /></a>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Total clicks</div>
          <div className="kpi-value">{formatNumber(stats.total)}</div>
          <div className="kpi-delta"><span className="delta-up">{formatNumber(stats.period)}</span> in last 30 days</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Unique visitors</div>
          <div className="kpi-value">{formatNumber(stats.unique)}</div>
          <div className="kpi-delta">Hashed IPs, no cookies</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Last click</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{stats.last ? timeAgo(stats.last) : "Never"}</div>
          <div className="kpi-delta">{stats.last ? formatDate(stats.last) : "Share it to start"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Countries</div>
          <div className="kpi-value">{countries.length}</div>
          <div className="kpi-delta">Top: {countries[0]?.label ?? "—"}</div>
        </div>
      </div>

      <div className="detail-grid mt-16">
        <div className="stack">
          <div className="card chart-card">
            <div className="chart-head">
              <div>
                <div className="panel-title">Clicks over time</div>
                <div className="panel-sub">Last 30 days</div>
              </div>
              <span className="badge badge-lime"><Trend width={12} height={12} /> {formatNumber(stats.period)} this period</span>
            </div>
            <AreaChart data={series} height={230} id={`link-${link.id}`} />
          </div>

          <div className="card">
            <div className="card-pad">
              <div className="panel-title">Recent clicks</div>
              <div className="panel-sub">Newest first</div>
            </div>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table className="data" style={{ minWidth: 520 }}>
                <thead><tr><th>Time</th><th>Country</th><th>Device</th><th>Referrer</th></tr></thead>
                <tbody>
                  {recent.map((c, i) => (
                    <tr key={i}>
                      <td className="nowrap">{timeAgo(c.ts)}</td>
                      <td>{c.country}</td>
                      <td style={{ textTransform: "capitalize" }}>{c.device} <span className="muted">· {c.browser}</span></td>
                      <td className="muted">{c.referrer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recent.length === 0 && <div className="empty">No clicks yet.</div>}
          </div>
        </div>

        <div className="stack">
          <div className="card card-pad">
            <div className="panel-title">Link details</div>
            <dl style={{ marginTop: 10 }}>
              <div className="kv"><dt>Destination</dt><dd><a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cobalt)", textDecoration: "underline" }}>{displayUrl(link.url, 40)}</a></dd></div>
              <div className="kv"><dt>Short URL</dt><dd className="mono">{shortUrl.replace(/^https?:\/\//, "")}</dd></div>
              <div className="kv"><dt>Created</dt><dd>{formatDate(link.created_at)}</dd></div>
              <div className="kv"><dt>Expires</dt><dd>{link.expires_at ? formatDate(link.expires_at) : "Never"}</dd></div>
              <div className="kv"><dt>Click cap</dt><dd>{link.click_limit ?? "Unlimited"}</dd></div>
              <div className="kv"><dt>Tags</dt><dd>{link.tags ? link.tags.split(",").map((t) => <span key={t} className="badge" style={{ marginRight: 4 }}>{t.trim()}</span>) : "—"}</dd></div>
            </dl>
            <div className="row gap-8 mt-16">
              <Link href="/dashboard/links" className="btn btn-ghost btn-sm">Back to links</Link>
              <a href={`/api/qr?text=${encodeURIComponent(shortUrl)}&size=1000`} download={`${link.slug}-qr.png`} className="btn btn-soft btn-sm"><Download width={13} height={13} /> QR</a>
            </div>
          </div>

          <div className="card card-pad">
            <div className="panel-title">Devices</div>
            <div style={{ marginTop: 12 }}>
              {devices.map((d) => (
                <div key={d.label} className="bar-row">
                  <div className="bar-label"><span style={{ textTransform: "capitalize" }}>{d.label}</span><span>{percent(d.n, devices.reduce((s, x) => s + x.n, 0))}%</span></div>
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
            <div style={{ marginTop: 10 }}>
              {referrers.map((r) => (
                <div key={r.label} className="list-row" style={{ padding: "8px 0" }}>
                  <span className="link-fav" style={{ width: 24, height: 24, borderRadius: 6 }}>{r.label.slice(0, 2)}</span>
                  <div className="main"><div className="t" style={{ fontSize: 12.5 }}>{r.label}</div></div>
                  <span className="small muted">{r.n}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
