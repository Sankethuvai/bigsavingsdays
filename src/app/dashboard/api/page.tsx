import Link from "next/link";
import { requireUser, getBaseUrl } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ApiKeysManager } from "@/components/api-keys-manager";
import type { ApiKeyRow } from "@/lib/types";
import { Code } from "@/components/icons";

export const metadata = { title: "API keys" };
export const dynamic = "force-dynamic";

export default async function ApiPage() {
  const user = await requireUser("/dashboard/api");
  const base = await getBaseUrl();
  const rows = getDb()
    .prepare("SELECT id, name, prefix, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id) as Pick<ApiKeyRow, "id" | "name" | "prefix" | "last_used_at" | "created_at">[];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>API</h1>
          <p>Build BigSavingsDays into your product with a predictable JSON API.</p>
        </div>
        <Link href="/docs" className="btn btn-ghost btn-sm">Read the docs</Link>
      </div>

      <ApiKeysManager initial={rows} />

      <div className="dash-grid mt-16">
        <div className="card card-pad">
          <div className="row gap-8"><div className="icon-box" style={{ margin: 0 }}><Code /></div><div><div className="panel-title">Quick start</div><div className="panel-sub">Create a link with one request</div></div></div>
          <pre className="code-block">{`curl -X POST ${base}/api/v1/links \\
  -H "Authorization: Bearer bsd_sk_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/launch",
    "slug": "launch",
    "title": "Launch page"
  }'`}</pre>
          <p className="hint mt-8">Response includes id, slug, shortUrl and metadata.</p>
        </div>

        <div className="card card-pad">
          <div className="panel-title">Endpoints</div>
          <div className="timeline mt-8">
            {[
              ["GET", "/api/v1/links", "List your links"],
              ["POST", "/api/v1/links", "Create a link"],
              ["GET", "/api/v1/links/:slug", "Link details"],
              ["GET", "/api/v1/links/:slug/stats", "Click analytics"],
              ["DELETE", "/api/v1/links/:slug", "Delete a link"],
              ["GET", "/api/health", "Service status"],
            ].map(([method, path, desc]) => (
              <div key={path + method} className="timeline-row" style={{ gridTemplateColumns: "54px 1fr", gap: 8 }}>
                <span className={`badge ${method === "GET" ? "badge-green" : method === "POST" ? "badge-blue" : "badge-red"}`}>{method}</span>
                <div><div className="mono small">{path}</div><div className="tiny muted">{desc}</div></div>
              </div>
            ))}
          </div>
          <p className="hint mt-12">Rate limit: 120 requests / minute per key. List endpoints accept <code>limit</code> (max 200) and <code>offset</code>.</p>
        </div>
      </div>
    </div>
  );
}
