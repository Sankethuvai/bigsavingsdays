import { AreaChart } from "./area-chart";
import { ArrowUpRight, Chart, Globe, LinkIcon, Qr } from "./icons";

const series = [
  18, 22, 19, 26, 31, 28, 35, 42, 39, 47, 52, 49, 58, 63, 61, 70,
  68, 76, 83, 79, 88, 95, 91, 102, 110, 107, 118, 125, 121, 134,
].map((value, i) => ({
  label: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  value,
}));

const demoLinks = [
  { slug: "iphone-16-pro", title: "iPhone 16 Pro — Flat 25% Off Deal", clicks: "14.2K", trend: "+38%" },
  { slug: "sony-xm5-loot", title: "Sony WH-1000XM5 (50% Off Flash Sale)", clicks: "8.6K", trend: "+24%" },
  { slug: "summer-sneakers", title: "Nike Air Max Summer Sale (Code: SAVE40)", clicks: "6.9K", trend: "+42%" },
];

export function DashboardPreview() {
  return (
    <div className="preview-shell" aria-hidden>
      <aside className="preview-side">
        <div className="row gap-8" style={{ padding: "4px 8px 18px" }}>
          <span className="preview-logo" style={{ background: "var(--deal-orange)", color: "#fff", fontWeight: 800 }}>%</span>
          <b style={{ fontFamily: "var(--font-display)", letterSpacing: "-.03em" }}>BigSavingsDays</b>
        </div>
        {[
          { icon: <Chart />, label: "Overview", active: true },
          { icon: <LinkIcon />, label: "Links" },
          { icon: <Qr />, label: "QR codes" },
          { icon: <Globe />, label: "Domains" },
        ].map((item) => (
          <div key={item.label} className={`preview-nav${item.active ? " active" : ""}`}>
            {item.icon}<span>{item.label}</span>
          </div>
        ))}
        <div className="preview-side-foot">
          <div className="preview-user" />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700 }}>Demo Creator</div>
            <div style={{ fontSize: 9, opacity: .55 }}>Pro plan</div>
          </div>
        </div>
      </aside>
      <div className="preview-main">
        <div className="preview-top">
          <div>
            <div className="preview-title">Overview</div>
            <div className="preview-sub">Feb 1 – Mar 1, 2026</div>
          </div>
          <div className="preview-avatars"><i /><i /><i /></div>
        </div>
        <div className="preview-kpis">
          {[
            ["Total deal clicks", "84,912", "+38.2%"],
            ["Unique shoppers", "62,408", "+24.4%"],
            ["Live deal links", "248", "+18"],
          ].map(([label, value, delta]) => (
            <div key={label} className="preview-kpi">
              <div className="preview-kpi-label">{label}</div>
              <div className="preview-kpi-value">{value}</div>
              <div className="preview-kpi-delta">{delta}</div>
            </div>
          ))}
        </div>
        <div className="preview-chart">
          <div className="row-between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>Clicks</span>
            <span className="preview-legend"><i /> Last 30 days</span>
          </div>
          <AreaChart data={series} height={130} compact id="preview" />
        </div>
        <div className="preview-table">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>Top links</span>
            <span style={{ fontSize: 9, opacity: .5 }}>View all</span>
          </div>
          {demoLinks.map((l) => (
            <div key={l.slug} className="preview-row">
              <span className="preview-fav">{l.slug[0]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>velo.link/{l.slug}</div>
                <div style={{ fontSize: 9, opacity: .5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.title}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{l.clicks}</span>
              <span style={{ fontSize: 9, color: "var(--success)" }}>{l.trend}</span>
              <ArrowUpRight width={11} height={11} style={{ opacity: .35 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
