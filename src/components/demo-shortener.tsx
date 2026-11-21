"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Qr } from "./icons";

type Result = { shortUrl: string; slug: string; url: string };

export function DemoShortener({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <div className="demo-card" id="deals-shortener">
        <span className="demo-sticker">Deal Maker</span>
        <div className="demo-top">
          <div className="demo-dots" aria-hidden><i /><i /><i /></div>
          <span className="badge badge-deal">Free plan</span>
        </div>
        <h3 style={{ fontSize: 22, marginTop: 14 }}>Create your first deal link</h3>
        <p className="muted small" style={{ marginTop: 8 }}>
          Transform long affiliate & product links into trusted <strong>bigsavingsdays.com</strong> short URLs with discount badges and click tracking.
        </p>
        <Link href="/signup" className="btn btn-deal btn-block mt-16">
          Create free deal account <ArrowRight width={16} height={16} />
        </Link>
        <p className="tiny muted center mt-16">No credit card. Unlimited redirects & 50 deal links free.</p>
      </div>
    );
  }
  return <DemoWidget />;
}

function DemoWidget() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not shorten that link");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Copy failed — select the link manually");
    }
  }

  return (
    <div className="demo-card" id="deals-shortener">
      <span className="demo-sticker" style={{ background: "var(--deal-orange)", color: "#fff" }}>Instant Deal Link</span>
      <div className="demo-top">
        <div className="demo-dots" aria-hidden><i /><i /><i /></div>
        <span className="badge badge-deal">High CTR Guaranteed</span>
      </div>
      <form onSubmit={submit}>
        <label className="label" htmlFor="demo-url">Paste product or affiliate URL</label>
        <div className="demo-url mt-8">
          <input
            id="demo-url"
            className="input"
            type="text"
            inputMode="url"
            placeholder="https://amazon.com/dp/B08...?tag=affiliate-21"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button className="btn btn-deal" disabled={busy} type="submit" style={{ height: 46 }}>
            {busy ? "Shortening…" : "Create Deal Link"}
            {!busy && <ArrowRight width={16} height={16} />}
          </button>
        </div>
      </form>
      {error && <p className="error-text mt-8" role="alert">{error}</p>}

      {result ? (
        <div className="demo-result">
          <div className="row-between">
            <div style={{ minWidth: 0 }}>
              <div className="tiny muted" style={{ textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Your link is live</div>
              <a href={result.shortUrl} target="_blank" rel="noopener noreferrer">{result.shortUrl}</a>
            </div>
            <div className="row gap-4">
              <button type="button" className="icon-action" onClick={() => setShowQr((v) => !v)} aria-label="Show QR code"><Qr /></button>
              <button type="button" className="icon-action" onClick={copy} aria-label="Copy short link">
                {copied ? <Check style={{ color: "var(--success)" }} /> : <Copy />}
              </button>
            </div>
          </div>
          {showQr && (
            <div className="qr-box mt-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr?text=${encodeURIComponent(result.shortUrl)}`} alt={`QR code for ${result.shortUrl}`} width={180} height={180} />
            </div>
          )}
          <div className="demo-meta">
            <span>Target · {new URL(result.url).hostname}</span>
            <span className="badge badge-green">Active</span>
          </div>
        </div>
      ) : (
        <div className="demo-result" style={{ borderStyle: "solid", opacity: .85 }}>
          <div className="row-between">
            <span className="mono small" style={{ fontWeight: 600, color: "var(--ink)" }}>bigsavingsdays.com/summer-sale-60</span>
            <span className="badge badge-deal"><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--savings)", display: "inline-block" }} /> 60% OFF</span>
          </div>
          <div className="demo-meta">
            <span>Target: amazon.com · Auto-UTM &amp; Tag</span>
            <span style={{ color: "var(--deal-orange)", fontWeight: 600 }}>+42% higher CTR</span>
          </div>
        </div>
      )}
      <p className="hint mt-16" style={{ textAlign: "center" }}>Demo deal links expire in 24 hours. Sign in to create branded permanent deal links.</p>
    </div>
  );
}
