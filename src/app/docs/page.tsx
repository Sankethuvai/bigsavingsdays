import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { publicBaseUrl } from "@/lib/env";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "API documentation",
  description: "BigSavingsDays REST API: create deal links, read stats, manage domains. Bearer auth, predictable JSON, 120 req/min.",
};

const nav = [
  ["quickstart", "Quickstart"],
  ["auth", "Authentication"],
  ["create", "Create a link"],
  ["list", "List & fetch"],
  ["stats", "Analytics"],
  ["delete", "Delete"],
  ["errors", "Errors"],
  ["limits", "Rate limits"],
];

export default async function DocsPage() {
  const user = await getSessionUser();
  const base = publicBaseUrl() ?? "https://bigsavingsdays.com";

  return (
    <>
      <SiteNav signedIn={!!user} />
      <main className="section-sm">
        <div className="shell">
          <div className="section-head" style={{ marginBottom: 30 }}>
            <span className="kicker">Developers</span>
            <h2>BigSavingsDays API <span className="serif">v1</span></h2>
            <p className="section-sub">High-performance API for deal publishers, Telegram bots, and automated affiliate syndication.</p>
          </div>

          <div className="doc-layout">
            <aside className="doc-nav" aria-label="Docs navigation">
              {nav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
            </aside>

            <div className="doc-body">
              <section id="quickstart">
                <h2>Quickstart</h2>
                <p>Create a key in <Link href="/dashboard/api" style={{ textDecoration: "underline" }}>Dashboard → API</Link>, then make your first request. All endpoints are under <code>{base}/api/v1</code>.</p>
                <pre className="code-block">{`curl ${base}/api/v1/links \\
  -H "Authorization: Bearer bsd_sk_your_key"`}</pre>
              </section>

              <section id="auth">
                <h2>Authentication</h2>
                <p>Send your key as a bearer token. Keys are scoped to one workspace, shown once at creation, and stored as a SHA-256 hash.</p>
                <pre className="code-block">{`Authorization: Bearer bsd_sk_...`}</pre>
                <p>Never put a key in client-side JavaScript or a public repository. Rotate immediately if a key leaks — revoking is instant.</p>
              </section>

              <section id="create">
                <h2>Create a link</h2>
                <p><code>POST /api/v1/links</code> — returns <code>201</code> with the created link. <code>url</code> is required; <code>slug</code>, <code>title</code> and <code>tags</code> are optional.</p>
                <pre className="code-block">{`curl -X POST ${base}/api/v1/links \\
  -H "Authorization: Bearer bsd_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/spring-sale",
    "slug": "spring",
    "title": "Spring sale",
    "tags": "campaign,email"
  }'

// 201 Created
{
  "id": "4f2a9c01",
  "slug": "spring",
  "url": "https://example.com/spring-sale",
  "shortUrl": "${base}/spring",
  "created_at": 1770000000000
}`}</pre>
                <p>If the slug is taken you get <code>409</code>. If it is reserved or malformed, <code>400</code>. Omit it and BigSavingsDays generates a 7-character slug.</p>
              </section>

              <section id="list">
                <h2>List &amp; fetch</h2>
                <p><code>GET /api/v1/links?limit=50&amp;offset=0</code> returns a stable, newest-first page with lifetime click counts. <code>limit</code> is capped at 200. The response includes <code>total</code>, <code>limit</code> and <code>offset</code>. <code>GET /api/v1/links/:slug</code> returns one link.</p>
                <pre className="code-block">{`GET /api/v1/links?limit=50&offset=0
GET /api/v1/links/spring`}</pre>
              </section>

              <section id="stats">
                <h2>Analytics</h2>
                <p><code>GET /api/v1/links/:slug/stats</code> returns totals, a 30-day daily series, countries, devices and referrers.</p>
                <pre className="code-block">{`{
  "data": {
    "totals": { "total": 4821, "period": 1830, "unique": 3920, "last": 1770000000000 },
    "daily": [{ "date": "2026-02-01", "label": "Feb 1", "value": 64 }],
    "countries": [{ "label": "India", "n": 1220, "pct": 34 }]
  }
}`}</pre>
              </section>

              <section id="delete">
                <h2>Delete a link</h2>
                <p><code>DELETE /api/v1/links/:slug</code> permanently removes a link and its click history.</p>
                <pre className="code-block">{`curl -X DELETE ${base}/api/v1/links/spring \\
  -H "Authorization: Bearer bsd_sk_..."`}</pre>
              </section>

              <section id="errors">
                <h2>Errors</h2>
                <p>Errors always include an <code>error</code> string. We use conventional status codes:</p>
                <pre className="code-block">{`400  Invalid body, url, slug or date
401  Missing or invalid API key
403  Plan limit reached
404  Link not found
409  Slug already taken
429  Rate limit exceeded`}</pre>
              </section>

              <section id="limits">
                <h2>Rate limits</h2>
                <p>120 requests per minute per key, enforced with a fixed window stored in the same SQLite database, so limits survive restarts. Responses send <code>X-RateLimit-Remaining</code>; a <code>429</code> includes <code>Retry-After</code>.</p>
              </section>


            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
