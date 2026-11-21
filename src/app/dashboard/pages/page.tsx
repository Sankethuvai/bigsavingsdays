import Link from "next/link";
import { requireUser, getBaseUrl } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addPageLinkAction, createPageAction, deletePageAction, deletePageLinkAction, updatePageAction } from "./actions";
import type { PageRow, PageLinkRow } from "@/lib/types";
import { ArrowUpRight, Grid, Plus, Trash, Edit } from "@/components/icons";
import { CopyButton } from "@/components/copy-button";
import { formatNumber, initials } from "@/lib/utils";

export const metadata = { title: "Bio pages" };
export const dynamic = "force-dynamic";

export default async function PagesDashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireUser("/dashboard/pages");
  const db = getDb();
  const base = await getBaseUrl();

  const pages = db.prepare("SELECT * FROM pages WHERE user_id = ? ORDER BY created_at DESC").all(user.id) as PageRow[];
  const pageLinks = pages.length
    ? (db
        .prepare(`SELECT * FROM page_links WHERE page_id IN (${pages.map(() => "?").join(",")}) ORDER BY sort_order`)
        .all(...pages.map((p) => p.id)) as PageLinkRow[])
    : [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Bio pages</h1>
          <p>One link in your bio. Every destination, tracked.</p>
        </div>
        <details className="row" style={{ position: "relative" }}>
          <summary className="btn btn-primary btn-sm" style={{ listStyle: "none", cursor: "pointer" }}><Plus width={14} height={14} /> New page</summary>
          <div className="card card-pad" style={{ position: "absolute", right: 0, top: 44, width: 340, zIndex: 20, boxShadow: "var(--shadow-lg)" }}>
            <form action={createPageAction} className="form-grid">
              <div className="field"><label className="label">Page title</label><input className="input" name="title" placeholder="Demo Creator" required /></div>
              <div className="field"><label className="label">Public handle</label><div className="input-group"><span className="addon">/p/</span><input className="input" name="slug" placeholder="your-name" required /></div></div>
              <div className="field"><label className="label">Short bio</label><textarea className="textarea" name="bio" placeholder="What you make, in one line." rows={3} /></div>
              <button className="btn btn-primary btn-sm" type="submit">Create page</button>
            </form>
          </div>
        </details>
      </div>

      {error && (
        <div className="alert" style={{ marginBottom: 16 }}>
          {error === "taken" ? "That public handle is already taken." : error === "slug" ? "Choose a valid handle (2–48 letters, numbers, - or _)." : error === "link" ? "Add a label and a valid URL." : "Please check the fields and try again."}
        </div>
      )}

      {pages.length === 0 && (
        <div className="card empty">
          <Grid />
          <p>No bio pages yet. Create one to give your audience a single, trackable link.</p>
        </div>
      )}

      <div className="stack">
        {pages.map((page) => {
          const links = pageLinks.filter((l) => l.page_id === page.id);
          const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
          const publicUrl = `${base}/p/${page.slug}`;
          return (
            <div key={page.id} className="card">
              <div className="card-pad">
                <div className="row-between" style={{ flexWrap: "wrap", gap: 12 }}>
                  <div className="row gap-12">
                    <span className="avatar avatar-lg" style={{ background: page.avatar_color }}>{initials(page.title)}</span>
                    <div>
                      <div className="panel-title" style={{ fontSize: 16 }}>{page.title}</div>
                      <div className="panel-sub mono">/p/{page.slug} · {links.length} links · {formatNumber(totalClicks)} clicks</div>
                    </div>
                  </div>
                  <div className="row gap-8">
                    <CopyButton text={publicUrl} label="Copy URL" className="btn btn-ghost btn-sm" />
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Open <ArrowUpRight width={13} height={13} /></a>
                  </div>
                </div>

                <div className="divider" />

                <div className="detail-grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
                  <div>
                    <div className="panel-title" style={{ marginBottom: 8 }}>Links on this page</div>
                    {links.length === 0 && <p className="small muted">Nothing here yet. Add your first destination.</p>}
                    {links.map((l) => (
                      <div key={l.id} className="list-row">
                        <span className="link-fav">{l.label.slice(0, 2)}</span>
                        <div className="main">
                          <div className="t">{l.label}</div>
                          <div className="s mono">{l.url.replace(/^https?:\/\//, "").slice(0, 50)}</div>
                        </div>
                        <span className="badge">{formatNumber(l.clicks)}</span>
                        <form action={deletePageLinkAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="pageId" value={page.id} />
                          <button className="icon-action" type="submit" aria-label={`Remove ${l.label}`}><Trash /></button>
                        </form>
                      </div>
                    ))}
                    <form action={addPageLinkAction} className="row gap-8 mt-16" style={{ flexWrap: "wrap" }}>
                      <input type="hidden" name="pageId" value={page.id} />
                      <input className="input" name="label" placeholder="Label" required style={{ width: 120, flex: 1 }} />
                      <input className="input" name="url" placeholder="https://…" required style={{ width: 180, flex: 2 }} />
                      <button className="btn btn-soft btn-sm" type="submit"><Plus width={13} height={13} /> Add</button>
                    </form>
                  </div>

                  <div>
                    <div className="panel-title" style={{ marginBottom: 8 }}>Page settings</div>
                    <form action={updatePageAction} className="form-grid">
                      <input type="hidden" name="id" value={page.id} />
                      <div className="field"><label className="label">Title</label><input className="input" name="title" defaultValue={page.title} /></div>
                      <div className="field"><label className="label">Bio</label><textarea className="textarea" name="bio" defaultValue={page.bio} rows={2} /></div>
                      <div className="field"><label className="label">Theme</label>
                        <select className="select" name="theme" defaultValue={page.theme}>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </div>
                      <div className="row gap-8">
                        <button className="btn btn-primary btn-sm" type="submit"><Edit width={13} height={13} /> Save</button>
                      </div>
                    </form>
                    <form action={deletePageAction} className="mt-16">
                      <input type="hidden" name="id" value={page.id} />
                      <button className="btn btn-danger btn-sm" type="submit"><Trash width={13} height={13} /> Delete page</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card card-pad mt-24">
        <div className="row gap-12">
          <div className="icon-box" style={{ margin: 0 }}><Grid /></div>
          <div>
            <div className="panel-title">Tip: use a short bio page link in every profile</div>
            <p className="panel-sub">Velo records a click on the page link and on the individual destination, so you see both intent and outcome.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
