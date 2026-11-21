import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { updateProfileAction, changePasswordAction } from "./actions";
import { signOutAction } from "@/app/actions/auth";
import { initials, formatDate } from "@/lib/utils";
import { Check, Info, Logout, Shield } from "@/components/icons";
import { ThemeRow } from "./theme-row";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const user = await requireUser("/dashboard/settings");
  const db = getDb();
  const linkCount = (db.prepare("SELECT COUNT(*) AS n FROM links WHERE user_id = ?").get(user.id) as { n: number }).n;
  const limit = user.plan === "free" ? 50 : user.plan === "pro" ? 5000 : 1_000_000;
  const pct = Math.min(100, Math.round((linkCount / limit) * 100));

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Your profile, security and workspace preferences.</p>
        </div>
      </div>

      {saved && <div className="card card-pad" style={{ marginBottom: 16, borderColor: "var(--lime-deep)", background: "color-mix(in srgb, var(--lime) 12%, var(--surface))" }}><span className="row gap-8"><Check width={16} height={16} style={{ color: "var(--success)" }} /> Changes saved.</span></div>}
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error === "current" ? "Your current password is incorrect." : error === "taken" ? "That email is already in use." : error === "short" ? "New password must be at least 8 characters." : error === "long" ? "Passwords must be 200 characters or fewer." : error === "rate" ? "Too many attempts. Try again later." : "Please check the fields and try again."}</div>}

      <div className="card card-pad">
        <div className="row gap-12">
          <span className="avatar avatar-xl" style={{ background: user.avatar_color }}>{initials(user.name)}</span>
          <div>
            <div className="panel-title" style={{ fontSize: 18 }}>{user.name}</div>
            <div className="panel-sub">{user.email} · joined {formatDate(user.created_at)}</div>
            <div className="row gap-4 mt-8"><span className="badge badge-lime">{user.plan} plan</span>{user.role === "admin" && <span className="badge">Admin</span>}</div>
          </div>
        </div>
      </div>

      <div className="dash-grid mt-16" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="stack">
          <form action={updateProfileAction} className="card card-pad">
            <div className="panel-title">Profile</div>
            <p className="panel-sub" style={{ marginBottom: 14 }}>How your workspace identifies you.</p>
            <div className="form-grid">
              <div className="field"><label className="label" htmlFor="name">Full name</label><input id="name" className="input" name="name" defaultValue={user.name} required /></div>
              <div className="field"><label className="label" htmlFor="email">Email address</label><input id="email" className="input" name="email" type="email" defaultValue={user.email} required /></div>
              <div><button className="btn btn-primary btn-sm" type="submit">Save profile</button></div>
            </div>
          </form>

          <form action={changePasswordAction} className="card card-pad">
            <div className="panel-title">Password</div>
            <p className="panel-sub" style={{ marginBottom: 14 }}>Use a long, unique password — at least 8 characters.</p>
            <div className="form-grid">
              <div className="field"><label className="label" htmlFor="current">Current password</label><input id="current" className="input" name="current" type="password" autoComplete="current-password" required maxLength={200} /></div>
              <div className="field"><label className="label" htmlFor="next">New password</label><input id="next" className="input" name="next" type="password" autoComplete="new-password" minLength={8} maxLength={200} required /></div>
              <div><button className="btn btn-primary btn-sm" type="submit">Update password</button></div>
            </div>
          </form>
        </div>

        <div className="stack">
          <div className="card card-pad">
            <div className="panel-title">Plan & usage</div>
            <div className="row-between mt-8"><span className="small muted">Links used</span><span className="small"><b>{linkCount.toLocaleString()}</b> / {limit.toLocaleString()}</span></div>
            <div className="bar mt-8"><i style={{ width: `${Math.max(pct, 2)}%` }} /></div>
            <p className="hint mt-8">{pct}% of your plan&apos;s link allowance.</p>
            <div className="divider" />
            <div className="kv"><dt>Plan</dt><dd style={{ textTransform: "capitalize" }}>{user.plan}</dd></div>
            <div className="kv"><dt>Billing</dt><dd>{user.plan === "free" ? "No card on file" : "Managed by the operator"}</dd></div>
            <div className="kv"><dt>Price</dt><dd>{user.plan === "free" ? "₹0" : user.plan === "pro" ? "₹499 / mo" : "₹1,499 / mo"}</dd></div>
            <a href="/contact" className="btn btn-ghost btn-sm btn-block mt-16">Contact us to change plan</a>
          </div>

          <div className="card card-pad">
            <div className="panel-title">Appearance</div>
            <p className="panel-sub" style={{ marginBottom: 12 }}>Velo remembers your choice on this device.</p>
            <ThemeRow />
          </div>

          <div className="card card-pad">
            <div className="panel-title">Session</div>
            <p className="panel-sub" style={{ marginBottom: 12 }}>Signed in as {user.email}.</p>
            <form action={signOutAction}>
              <button className="btn btn-ghost btn-sm btn-block" type="submit"><Logout width={14} height={14} /> Sign out</button>
            </form>
          </div>

          <div className="card card-pad">
            <div className="row gap-8"><Shield width={15} height={15} style={{ color: "var(--muted)" }} /><span className="small"><b>Privacy first</b></span></div>
            <p className="hint mt-8">Click IPs are hashed with a server-side salt before storage. No third-party analytics cookies are set on redirects.</p>
          </div>
        </div>
      </div>

      <div className="card card-pad mt-16">
        <div className="row gap-8" style={{ alignItems: "flex-start" }}>
          <Info width={15} height={15} style={{ color: "var(--muted)", marginTop: 3 }} />
          <p className="small muted">Email delivery, card payments and Telegram sign-in are operator integrations and are not enabled in this build. Plans are assigned by the operator. See the README for the production runbook.</p>
        </div>
      </div>
    </div>
  );
}
