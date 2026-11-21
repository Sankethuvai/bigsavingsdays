import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toggleUserPlanAction } from "../../actions";
import { formatDate, initials } from "@/lib/utils";

export const metadata = { title: "Admin · Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  await requireAdmin();
  const users = getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.plan, u.role, u.created_at,
              COUNT(DISTINCT l.id) AS links,
              COUNT(c.id) AS clicks
       FROM users u
       LEFT JOIN links l ON l.user_id = u.id
       LEFT JOIN clicks c ON c.link_id = l.id
       GROUP BY u.id ORDER BY u.created_at DESC`
    )
    .all() as { id: string; name: string; email: string; plan: string; role: string; created_at: number; links: number; clicks: number }[];

  return (
    <>
      <div className="page-head">
        <div><h1>Users</h1><p>{users.length} accounts · cycle a plan badge to change the plan.</p></div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>User</th><th>Email</th><th>Plan</th><th>Role</th><th>Links</th><th>Clicks</th><th>Joined</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="row gap-8">
                    <span className="avatar" style={{ width: 26, height: 26, fontSize: 9, background: "var(--surface-2)", color: "var(--ink-soft)" }}>{initials(u.name)}</span>
                    <span style={{ fontWeight: 550 }}>{u.name}</span>
                  </div>
                </td>
                <td className="muted small">{u.email}</td>
                <td>
                  <form action={toggleUserPlanAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className={`badge ${u.plan === "free" ? "" : "badge-lime"}`} style={{ cursor: "pointer", textTransform: "capitalize", border: "1px solid var(--line)" }} title="Cycle plan">{u.plan}</button>
                  </form>
                </td>
                <td><span className={`badge ${u.role === "admin" ? "badge-blue" : ""}`} style={{ textTransform: "capitalize" }}>{u.role}</span></td>
                <td>{u.links}</td>
                <td style={{ fontWeight: 600 }}>{u.clicks.toLocaleString()}</td>
                <td className="muted small">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
