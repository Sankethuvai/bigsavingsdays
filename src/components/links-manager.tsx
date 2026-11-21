"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { displayUrl, formatDate, formatNumber, timeAgo } from "@/lib/utils";
import {
  ArrowUpRight, Check, Copy, Download, Edit, LinkIcon, Plus, Qr, Search,
  Trash, X, Filter,
} from "./icons";

export type ManagedLink = {
  id: string;
  slug: string;
  url: string;
  title: string;
  tags: string;
  active: number;
  clicks: number;
  hasPassword: boolean;
  expires_at: number | null;
  click_limit: number | null;
  created_at: number;
  domainId: string | null;
  domain: string | null;
  shortUrl: string;
};

type Toast = { id: number; message: string };

const blankForm = {
  url: "",
  slug: "",
  title: "",
  tags: "",
  password: "",
  expiresAt: "",
  clickLimit: "",
  domainId: "",
};

export function LinksManager({
  initial,
  base,
  domains = [],
  autoOpen = false,
}: {
  initial: ManagedLink[];
  base: string;
  domains?: { id: string; hostname: string }[];
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const [links, setLinks] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "paused">("all");
  const [createOpen, setCreateOpen] = useState(autoOpen);
  const [qrLink, setQrLink] = useState<ManagedLink | null>(null);
  const [editLink, setEditLink] = useState<ManagedLink | null>(null);
  const [deleteLink, setDeleteLink] = useState<ManagedLink | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blankForm);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    setLinks(initial);
  }, [initial]);

  useEffect(() => {
    if (autoOpen) setCreateOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => setToasts((t) => t.slice(1)), 2600);
    return () => clearTimeout(timer);
  }, [toasts]);

  const selectedHost = (() => {
    const chosen = domains.find((d) => d.id === form.domainId);
    return chosen?.hostname ?? base.replace(/^https?:\/\//, "");
  })();

  function toast(message: string) {
    setToasts((t) => [...t, { id: Date.now(), message }]);
  }

  const filtered = useMemo(
    () =>
      links.filter((l) => {
        const matchesQuery =
          !query ||
          l.slug.toLowerCase().includes(query.toLowerCase()) ||
          l.url.toLowerCase().includes(query.toLowerCase()) ||
          l.title.toLowerCase().includes(query.toLowerCase()) ||
          l.tags.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "all" || (filter === "live" ? l.active === 1 : l.active === 0);
        return matchesQuery && matchesFilter;
      }),
    [links, query, filter]
  );

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast("Copied to clipboard");
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast("Copy failed — select manually");
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create link");
      setLinks((prev) => [
        {
          id: data.id, slug: data.slug, url: data.url, title: data.title, tags: data.tags,
          active: 1, clicks: 0, hasPassword: !!form.password, expires_at: null,
          click_limit: form.clickLimit ? Number(form.clickLimit) : null, created_at: Date.now(),
          domainId: data.domainId ?? null,
          domain: data.domain ?? null,
          shortUrl: data.shortUrl ?? `${base}/${data.slug}`,
        },
        ...prev,
      ]);
      setCreateOpen(false);
      setForm(blankForm);
      setAdvanced(false);
      toast("Link created");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(l: ManagedLink) {
    const optimistic = l.active ? 0 : 1;
    setLinks((prev) => prev.map((x) => (x.id === l.id ? { ...x, active: optimistic } : x)));
    try {
      const res = await fetch(`/api/links/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      if (!res.ok) throw new Error();
      toast(optimistic ? "Link resumed" : "Link paused");
      router.refresh();
    } catch {
      setLinks((prev) => prev.map((x) => (x.id === l.id ? { ...x, active: l.active } : x)));
      toast("Could not update link");
    }
  }

  async function remove() {
    if (!deleteLink) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/links/${deleteLink.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLinks((prev) => prev.filter((x) => x.id !== deleteLink.id));
      setDeleteLink(null);
      toast("Link deleted");
      router.refresh();
    } catch {
      toast("Could not delete link");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editLink) return;
    setBusy(true);
    setError("");
    const body = {
      url: editLink.url,
      title: editLink.title,
      tags: editLink.tags,
      password: editLink.hasPassword ? undefined : undefined,
      expiresAt: editLink.expires_at ? new Date(editLink.expires_at).toISOString().slice(0, 10) : "",
      clickLimit: editLink.click_limit ?? "",
    };
    try {
      const res = await fetch(`/api/links/${editLink.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save changes");
      setLinks((prev) => prev.map((x) => (x.id === editLink.id ? editLink : x)));
      setEditLink(null);
      toast("Changes saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search slug, destination, tag…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search links" />
        </div>
        <div className="seg">
          {(["all", "live", "paused"] as const).map((f) => (
            <button key={f} type="button" className={filter === f ? "active" : ""} onClick={() => setFilter(f)} style={{ textTransform: "capitalize" }}>
              {f}
            </button>
          ))}
        </div>
        <span className="small muted" style={{ marginLeft: "auto" }}>{filtered.length} of {links.length} links</span>
        <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}><Plus width={14} height={14} /> New link</button>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Link</th>
              <th>Clicks</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const short = l.shortUrl.replace(/^https?:\/\//, "");
              return (
                <tr key={l.id}>
                  <td>
                    <div className="link-cell">
                      <span className="link-fav">{l.slug.slice(0, 2)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className="row gap-4">
                          <Link href={`/dashboard/links/${l.id}`} className="link-slug">{short}</Link>
                          <button className="icon-action" style={{ width: 22, height: 22 }} onClick={() => copy(l.shortUrl, l.id)} aria-label="Copy link">
                            {copied === l.id ? <Check width={12} height={12} style={{ color: "var(--success)" }} /> : <Copy width={12} height={12} />}
                          </button>
                        </div>
                        <div className="link-target">{displayUrl(l.title ? `${l.title} — ${l.url}` : l.url, 58)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 650 }}>{formatNumber(l.clicks)}</div>
                    <div className="tiny muted">{l.created_at ? timeAgo(l.created_at) : ""}</div>
                  </td>
                  <td>
                    <div className="row gap-4">
                      <span className={`badge ${l.active ? "badge-green" : "badge-red"}`}>{l.active ? "Live" : "Paused"}</span>
                      {l.hasPassword && <span className="badge" title="Password protected">Lock</span>}
                      {l.expires_at && <span className="badge" title={`Expires ${formatDate(l.expires_at)}`}>Exp</span>}
                    </div>
                  </td>
                  <td className="muted small">{formatDate(l.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-action" onClick={() => setQrLink(l)} aria-label="Show QR"><Qr /></button>
                      <button className="icon-action" onClick={() => { setEditLink(l); setError(""); }} aria-label="Edit link"><Edit /></button>
                      <button className="icon-action" onClick={() => toggle(l)} aria-label={l.active ? "Pause link" : "Resume link"} title={l.active ? "Pause" : "Resume"}>
                        <Filter />
                      </button>
                      <button className="icon-action" onClick={() => setDeleteLink(l)} aria-label="Delete link" style={{ color: "var(--danger)" }}><Trash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty">
            <LinkIcon />
            <p>{links.length === 0 ? "No links yet. Create your first one." : "No links match that search."}</p>
            {links.length === 0 && <button className="btn btn-primary btn-sm mt-16" onClick={() => setCreateOpen(true)}>Create a link</button>}
          </div>
        )}
      </div>

      {/* CREATE */}
      {createOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setCreateOpen(false); }}>
          <div className="modal modal-lg" role="dialog" aria-modal="true" aria-label="Create a new link">
            <div className="modal-head">
              <div>
                <h3>Create a new link</h3>
                <p className="panel-sub">Paste a destination, then make it yours.</p>
              </div>
              <button className="icon-action" onClick={() => setCreateOpen(false)} aria-label="Close"><X /></button>
            </div>
            <form onSubmit={create} className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label className="label" htmlFor="new-url">Destination URL</label>
                  <input id="new-url" className="input" placeholder="https://example.com/page" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required autoFocus />
                </div>
                <div className="form-grid form-grid-2">
                  <div className="field">
                    <label className="label" htmlFor="new-slug">Custom slug</label>
                    <div className="input-group">
                      <span className="addon">{selectedHost}/</span>
                      <input id="new-slug" className="input" placeholder="spring-sale" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                    </div>
                    <span className="hint">Leave empty for a generated slug.</span>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="new-title">Title <span className="muted">(optional)</span></label>
                    <input id="new-title" className="input" placeholder="Spring campaign" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label className="label" htmlFor="new-tags">Tags <span className="muted">(comma separated)</span></label>
                  <input id="new-tags" className="input" placeholder="campaign, instagram" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>

                {domains.length > 0 && (
                  <div className="field">
                    <label className="label" htmlFor="new-domain">Domain</label>
                    <select id="new-domain" className="select" value={form.domainId} onChange={(e) => setForm({ ...form, domainId: e.target.value })}>
                      <option value="">{base.replace(/^https?:\/\//, "")} (default)</option>
                      {domains.map((d) => <option key={d.id} value={d.id}>{d.hostname}</option>)}
                    </select>
                    <span className="hint">Use a verified custom domain for branded links.</span>
                  </div>
                )}

                <button type="button" className="row gap-4 small muted" onClick={() => setAdvanced((v) => !v)} style={{ background: "none", border: 0, cursor: "pointer", padding: 0, textAlign: "left" }}>
                  <Filter width={13} height={13} /> {advanced ? "Hide" : "Show"} access controls
                </button>

                {advanced && (
                  <div className="form-grid form-grid-2">
                    <div className="field">
                      <label className="label" htmlFor="new-pass">Password <span className="muted">(optional)</span></label>
                      <input id="new-pass" className="input" type="password" maxLength={200} placeholder="Leave empty for public" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="new-exp">Expiry date</label>
                      <input id="new-exp" className="input" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="new-cap">Click limit</label>
                      <input id="new-cap" className="input" type="number" min={1} placeholder="Unlimited" value={form.clickLimit} onChange={(e) => setForm({ ...form, clickLimit: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
              {error && <p className="error-text mt-16">{error}</p>}
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create link"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR */}
      {qrLink && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setQrLink(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="QR code">
            <div className="modal-head">
              <div><h3>QR code</h3><p className="panel-sub">Scan or download — destination can change later.</p></div>
              <button className="icon-action" onClick={() => setQrLink(null)} aria-label="Close"><X /></button>
            </div>
            <div className="modal-body">
              <div className="qr-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/qr?text=${encodeURIComponent(qrLink.shortUrl)}&size=600`} alt={`QR code for ${base}/${qrLink.slug}`} width={240} height={240} />
              </div>
              <p className="center mono small mt-16">{base.replace(/^https?:\/\//, "")}/{qrLink.slug}</p>
              <div className="modal-foot">
                <a className="btn btn-ghost" href={`/api/qr?text=${encodeURIComponent(qrLink.shortUrl)}&size=1200`} download={`${qrLink.slug}-qr.png`}>
                  <Download width={15} height={15} /> Download PNG
                </a>
                <button className="btn btn-primary" onClick={() => copy(qrLink.shortUrl, qrLink.id)}>Copy link</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT */}
      {editLink && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setEditLink(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Edit link">
            <div className="modal-head">
              <div><h3>Edit link</h3><p className="panel-sub mono">/{editLink.slug}</p></div>
              <button className="icon-action" onClick={() => setEditLink(null)} aria-label="Close"><X /></button>
            </div>
            <form onSubmit={saveEdit} className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label className="label">Destination URL</label>
                  <input className="input" value={editLink.url} onChange={(e) => setEditLink({ ...editLink, url: e.target.value })} required />
                </div>
                <div className="field">
                  <label className="label">Title</label>
                  <input className="input" value={editLink.title} onChange={(e) => setEditLink({ ...editLink, title: e.target.value })} />
                </div>
                <div className="form-grid form-grid-2">
                  <div className="field">
                    <label className="label">Tags</label>
                    <input className="input" value={editLink.tags} onChange={(e) => setEditLink({ ...editLink, tags: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label">Click limit</label>
                    <input className="input" type="number" min={1} placeholder="Unlimited" value={editLink.click_limit ?? ""} onChange={(e) => setEditLink({ ...editLink, click_limit: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Expiry date</label>
                  <input className="input" type="date" value={editLink.expires_at ? new Date(editLink.expires_at).toISOString().slice(0, 10) : ""} onChange={(e) => setEditLink({ ...editLink, expires_at: e.target.value ? new Date(`${e.target.value}T23:59:59`).getTime() : null })} />
                </div>
                <p className="hint">Slugs are permanent so existing links never break. Delete and recreate to change one.</p>
              </div>
              {error && <p className="error-text mt-16">{error}</p>}
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setEditLink(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE */}
      {deleteLink && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDeleteLink(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Delete link">
            <div className="modal-head">
              <div><h3>Delete this link?</h3><p className="panel-sub">This can&apos;t be undone. {formatNumber(deleteLink.clicks)} clicks of history will be removed.</p></div>
              <button className="icon-action" onClick={() => setDeleteLink(null)} aria-label="Close"><X /></button>
            </div>
            <div className="modal-body">
              <div className="card card-pad mono small">/{deleteLink.slug}</div>
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={() => setDeleteLink(null)}>Keep it</button>
                <button className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete link"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="toast-wrap">
        {toasts.map((t) => (<div key={t.id} className="toast"><Check width={14} height={14} />{t.message}</div>))}
      </div>
    </>
  );
}
