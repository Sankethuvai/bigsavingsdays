import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toggleLinkActiveAction } from "../../actions";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata = { title: "Admin · Links" };
export const dynamic = "force-dynamic";

export default async function AdminLinks() {
  await requireAdmin();
  const links = getDb()
    .prepare(
      `SELECT l.id, l.slug, l.url, l.title, l.active, l.created_at, u.email,
              COUNT(c.id) AS clicks
       FROM links l JOIN users u ON u.id = l.user_id
       LEFT JOIN clicks c ON c.link_id = l.id
       GROUP BY l.id ORDER BY l.created_at DESC LIMIT 200`
    )
    .all() as { id: string; slug: string; url: string; title: string; active: number; created_at: number; email: string; clicks: number }[];

  return (
    <>
      <div className="page-head">
        <div><h1>Links</h1><p>Newest 200 links across all workspaces. Toggle to moderate.</p></div>
        <a href="/api/export?type=clicks" className="btn btn-ghost btn-sm">Export clicks (own)</a>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Slug</th><th>Title</th><th>Owner</th><th>Clicks</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id}>
                <td className="mono" style={{ fontWeight: 600 }}>/{l.slug}</td>
                <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title || l.url}</td>
                <td className="muted small">{l.email}</td>
                <td style={{ fontWeight: 600 }}>{formatNumber(l.clicks)}</td>
                <td><span className={`badge ${l.active ? "badge-green" : "badge-red"}`}>{l.active ? "Live" : "Disabled"}</span></td>
                <td className="muted small">{formatDate(l.created_at)}</td>
                <td style={{ textAlign: "right" }}>
                  <form action={toggleLinkActiveAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button type="submit" className="btn btn-ghost btn-sm">{l.active ? "Disable" : "Enable"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
