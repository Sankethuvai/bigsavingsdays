"use client";

import { useState } from "react";
import { CopyButton } from "./copy-button";
import { Key, Plus, Trash, X, Check, Shield } from "./icons";
import { timeAgo } from "@/lib/utils";

type KeyRow = { id: string; name: string; prefix: string; last_used_at: number | null; created_at: number };

export function ApiKeysManager({ initial }: { initial: KeyRow[] }) {
  const [keys, setKeys] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create key");
      setSecret(data.key);
      setKeys((prev) => [{ id: data.id, name: data.name, prefix: data.prefix, last_used_at: null, created_at: Date.now() }, ...prev]);
      setOpen(false);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      setError("Could not revoke that key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-pad row-between">
          <div>
            <div className="panel-title">API keys</div>
            <p className="panel-sub">Bearer tokens for the REST API. Shown once, stored hashed.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}><Plus width={14} height={14} /> Create key</button>
        </div>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="data" style={{ minWidth: 600 }}>
            <thead><tr><th>Name</th><th>Key</th><th>Created</th><th>Last used</th><th></th></tr></thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td><div className="row gap-8"><Key width={14} height={14} style={{ color: "var(--muted)" }} />{k.name}</div></td>
                  <td className="mono">{k.prefix}…</td>
                  <td className="muted">{new Date(k.created_at).toLocaleDateString()}</td>
                  <td className="muted">{k.last_used_at ? timeAgo(k.last_used_at) : "Never"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="icon-action" onClick={() => revoke(k.id)} disabled={busy} aria-label={`Revoke ${k.name}`} style={{ color: "var(--danger)" }}><Trash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {keys.length === 0 && <div className="empty"><Key /><p>No keys yet. Create one to use the API.</p></div>}
        </div>
      </div>

      {open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Create API key">
            <div className="modal-head">
              <div><h3>Create an API key</h3><p className="panel-sub">Give it a name you&apos;ll recognise later.</p></div>
              <button className="icon-action" onClick={() => setOpen(false)} aria-label="Close"><X /></button>
            </div>
            <form onSubmit={create} className="modal-body">
              <div className="field">
                <label className="label">Key name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Production app" autoFocus />
              </div>
              {error && <p className="error-text mt-8">{error}</p>}
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create key"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {secret && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true" aria-label="API key created">
            <div className="modal-head">
              <div><h3>Copy your key now</h3><p className="panel-sub">This is the only time it will be shown.</p></div>
              <button className="icon-action" onClick={() => setSecret(null)} aria-label="Close"><X /></button>
            </div>
            <div className="modal-body">
              <div className="alert" style={{ marginBottom: 12, display: "flex", gap: 8 }}><Shield width={15} height={15} /> Store it in a secret manager, never in client-side code.</div>
              <div className="card card-pad mono small" style={{ wordBreak: "break-all" }}>{secret}</div>
              <div className="modal-foot">
                <CopyButton text={secret} label="Copy key" className="btn btn-primary" />
                <button className="btn btn-ghost" onClick={() => setSecret(null)}><Check width={14} height={14} /> Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !open && !secret && <p className="error-text mt-16">{error}</p>}
    </>
  );
}
