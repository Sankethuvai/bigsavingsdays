import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getBaseUrl } from "@/lib/auth";
import { dailySeries, totalsFor, breakdown, topLinks, recentClicks } from "@/lib/analytics";
import { AreaChart } from "@/components/area-chart";
import { formatNumber, timeAgo, percent, displayUrl } from "@/lib/utils";
import { ArrowUpRight, ArrowUp, Chart, LinkIcon, Plus, Qr, Trend, Users, Globe } from "@/components/icons";
import { getDb } from "@/lib/db";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const user = await requireUser();
  const base = await getBaseUrl();

  const t = totalsFor(user.id);
  const series = dailySeries({ userId: user.id, days: 30 });
  const links = topLinks(user.id, 30);
  const devices = breakdown(user.id, "device", 30);
  const countries = breakdown(user.id, "country", 30);
  const referrers = breakdown(user.id, "referrer", 30);
  const recent = recentClicks(user.id, 7);
  const pages = (getDb().prepare("SELECT COUNT(*) AS n FROM pages WHERE user_id = ?").get(user.id) as { n: number }).n;
  const domains = (getDb().prepare("SELECT COUNT(*) AS n FROM domains WHERE user_id = ?").get(user.id) as { n: number }).n;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Good to see you, {user.name.split(" ")[0]}.</h1>
          <p>Here&apos;s what your links did in the last 30 days.</p>
        </div>
        <div className="row gap-8">
          <Link href="/dashboard/analytics" className="btn btn-ghost btn-sm">Full analytics</Link>
          <Link href="/dashboard/links?new=1" className="btn btn-primary btn-sm"><Plus width={14} height={14} /> Create link</Link>
        </div>
      </div>

      {welcome === "1" && (
        <div className="card card-pad" style={{ marginBottom: 16, borderColor: "var(--lime-deep)", background: "color-mix(in srgb, var(--lime) 14%, var(--surface))" }}>
          <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="panel-title">Your workspace is ready.</div>
              <p className="panel-sub">Create your first link, or connect a domain to make it yours.</p>
            </div>
            <Link href="/dashboard/links?new=1" className="btn btn-primary btn-sm">Create first link</Link>
          </div>
        </div>
      )}

      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Clicks <span className="badge tiny">30d</span></div>
          <div className="kpi-value">{formatNumber(t.last30)}</div>
          <div className="kpi-delta">
            <span className={t.growth >= 0 ? "delta-up" : "delta-down"}>{t.growth >= 0 ? "↑" : "↓"} {Math.abs(t.growth)}%</span>
            vs previous 30 days
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Active links <LinkIcon width={14} height={14} /></div>
          <div className="kpi-value">{t.activeLinks}</div>
          <div className="kpi-delta">{t.links - t.activeLinks} paused · {formatNumber(t.total)} lifetime clicks</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Countries reached <Globe width={14} height={14} /></div>
          <div className="kpi-value">{t.countries}</div>
          <div className="kpi-delta">Top: {countries[0]?.label ?? "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Workspace <Users width={14} height={14} /></div>
          <div className="kpi-value">{pages + domains}</div>
          <div className="kpi-delta">{pages} bio page{pages === 1 ? "" : "s"} · {domains} domain{domains === 1 ? "" : "s"}</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="stack">
          <div className="card chart-card">
            <div className="chart-head">
              <div>
                <div className="panel-title">Clicks over time</div>
                <div className="panel-sub">Last 30 days · all links</div>
              </div>
              <span className="badge badge-lime"><Trend width={12} height={12} /> {t.growth >= 0 ? "+" : ""}{t.growth}%</span>
            </div>
            <AreaChart data={series} height={220} id="overview" />
          </div>

          <div className="card">
            <div className="card-pad row-between" style={{ paddingBottom: 6 }}>
              <div>
                <div className="panel-title">Top links</div>
                <div className="panel-sub">Ranked by clicks, last 30 days</div>
              </div>
              <Link href="/dashboard/links" className="btn btn-ghost btn-sm">All links</Link>
            </div>
            <div style={{ padding: "0 22px 12px" }}>
              {links.length === 0 ? (
                <div className="empty">
                  <LinkIcon />
                  <p>No links yet. Your first one takes 20 seconds.</p>
                  <Link href="/dashboard/links?new=1" className="btn btn-primary btn-sm mt-16">Create a link</Link>
                </div>
              ) : (
                links.map((l) => (
                  <div key={l.id} className="list-row">
                    <span className="link-fav">{l.slug.slice(0, 2)}</span>
                    <div className="main">
                      <div className="t">
                        <Link href={`/dashboard/links/${l.id}`} className="link-slug">{base.replace(/^https?:\/\//, "")}/{l.slug}</Link>
                      </div>
                      <div className="s">{l.title || displayUrl(l.url)}</div>
                    </div>
                    <span className={`badge ${l.active ? "badge-green" : "badge-red"}`}>{l.active ? "Live" : "Paused"}</span>
                    <div style={{ width: 64, textAlign: "right" }}>
                      <div style={{ fontWeight: 650, fontSize: 13 }}>{formatNumber(l.clicks)}</div>
                      <div className="tiny muted">{l.last_click ? timeAgo(l.last_click) : "no clicks"}</div>
                    </div>
                    <Link href={`/dashboard/links/${l.id}`} className="icon-action" aria-label={`Open ${l.slug}`}><ArrowUpRight /></Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card card-pad">
            <div className="panel-title">Devices</div>
            <div className="panel-sub" style={{ marginBottom: 14 }}>How people arrive</div>
            {devices.length === 0 && <p className="small muted">No click data yet.</p>}
            {devices.map((d) => (
              <div key={d.label} className="bar-row">
                <div className="bar-label"><span style={{ textTransform: "capitalize" }}>{d.label}</span><span>{percent(d.n, devices.reduce((s, x) => s + x.n, 0))}%</span></div>
                <div className="bar"><i style={{ width: `${Math.max(d.pct, 3)}%` }} /></div>
              </div>
            ))}
          </div>

          <div className="card card-pad">
            <div className="panel-title">Top countries</div>
            <div className="panel-sub" style={{ marginBottom: 14 }}>Where the clicks live</div>
            {countries.map((c) => (
              <div key={c.label} className="bar-row">
                <div className="bar-label"><span>{c.label}</span><span>{c.n}</span></div>
                <div className="bar"><i style={{ width: `${Math.max(c.pct, 3)}%` }} /></div>
              </div>
            ))}
            {countries.length === 0 && <p className="small muted">No data yet.</p>}
          </div>

          <div className="card card-pad">
            <div className="panel-title">Recent clicks</div>
            <div className="panel-sub" style={{ marginBottom: 10 }}>Live-ish feed</div>
            {recent.length === 0 && <p className="small muted">Share a link to see activity here.</p>}
            {recent.map((c, i) => (
              <div key={i} className="list-row" style={{ padding: "8px 0" }}>
                <span className="avatar" style={{ width: 26, height: 26, fontSize: 9, background: "var(--surface-2)", color: "var(--muted)" }}>
                  {c.country.slice(0, 2).toUpperCase()}
                </span>
                <div className="main">
                  <div className="t" style={{ fontSize: 12.5 }}>/{c.slug}</div>
                  <div className="s">{c.country} · {c.device} · {c.referrer}</div>
                </div>
                <span className="tiny muted nowrap">{timeAgo(c.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-pad mt-24">
        <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="row gap-12">
            <div className="icon-box" style={{ margin: 0 }}><Qr /></div>
            <div>
              <div className="panel-title">Turn a link into something physical</div>
              <p className="panel-sub">Every link ships with a print-ready QR code. No extra charge, no watermark.</p>
            </div>
          </div>
          <Link href="/dashboard/links" className="btn btn-ghost btn-sm">Browse links <ArrowUpRight width={13} height={13} /></Link>
        </div>
      </div>

      <div className="row gap-16 mt-24" style={{ justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>
        <span className="row gap-4"><Chart width={13} height={13} /> Data refreshed on every request</span>
        <span className="row gap-4"><ArrowUp width={13} height={13} /> Referrers: {referrers[0]?.label ?? "—"}</span>
      </div>
    </div>
  );
}
