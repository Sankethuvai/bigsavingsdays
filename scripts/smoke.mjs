/**
 * Velo end-to-end smoke test.
 *
 * Drives the running application over HTTP, including the real React Server Action forms
 * (login, signup, unlock, domains, admin settings) by replaying each form's hidden
 * $ACTION fields. No test-only endpoints are added to the app.
 *
 * Environment:
 *   BASE_URL          default http://127.0.0.1:3000
 *   EXPECT_DEMO       1 or 0 (default 0)
 *   EXPECT_PROD       1 to assert Secure cookies + HSTS (default 0)
 *   DOMAIN_MODE       manual | dns | skip (default skip)
 *   ADMIN_EMAIL       optional admin account for admin flow
 *   ADMIN_PASSWORD    optional admin password
 *   DB_PATH           optional SQLite path for audit assertions
 */
import Database from "better-sqlite3";
import path from "node:path";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const EXPECT_DEMO = process.env.EXPECT_DEMO === "1";
const EXPECT_PROD = process.env.EXPECT_PROD === "1";
const DOMAIN_MODE = process.env.DOMAIN_MODE ?? "skip";
const DB_PATH = process.env.DB_PATH ?? "";
const RUN = Date.now().toString(36);
const PASSWORD = "smoke-test-password-9f3a";
const EMAIL = `smoke-${RUN}@example.test`;

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    return true;
  }
  failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  return false;
}

async function step(name, fn) {
  try {
    await fn();
  } catch (error) {
    failures.push(`${name} — threw: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`FAIL ${name} — threw`, error);
  }
}

function decode(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttrs(source) {
  const attrs = {};
  for (const match of source.matchAll(/([A-Za-z_:$][\w:.$-]*)="([^"]*)"/g)) {
    attrs[match[1]] = decode(match[2]);
  }
  return attrs;
}

function forms(html) {
  return [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)].map((match) => ({
    attrs: parseAttrs(match[1]),
    inputs: [...match[2].matchAll(/<input\b([^>]*?)\/?>/g)].map((input) => parseAttrs(input[1])),
    html: match[2],
  }));
}

function findForm(html, predicate) {
  const form = forms(html).find(predicate);
  if (!form) throw new Error("form not found on page");
  return form;
}

class Session {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
    this.lastSetCookies = [];
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  absorb(response) {
    const list = response.headers.getSetCookie?.() ?? [];
    this.lastSetCookies = list;
    for (const raw of list) {
      const [pair, ...attrs] = raw.split(";");
      const index = pair.indexOf("=");
      if (index < 0) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      const expired = attrs.some((a) => /max-age=0/i.test(a.trim()));
      if (expired || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async fetch(pathname, options = {}) {
    const headers = new Headers(options.headers ?? {});
    const cookie = this.cookieHeader();
    if (cookie) headers.set("cookie", cookie);
    if (options.origin === false) headers.delete("origin");
    else if (!headers.has("origin")) headers.set("origin", BASE);
    const response = await fetch(pathname.startsWith("http") ? pathname : `${BASE}${pathname}`, {
      ...options,
      headers,
      redirect: options.redirect ?? "manual",
    });
    this.absorb(response);
    return response;
  }

  async html(pathname) {
    const response = await this.fetch(pathname);
    return { response, body: await response.text() };
  }

  async submit(pagePath, form, fields) {
    const data = new FormData();
    const provided = new Set(Object.keys(fields));
    for (const input of form.inputs) {
      if (!input.name || provided.has(input.name)) continue;
      if (input.type === "submit" || input.type === "button") continue;
      // Only replay hidden state; visible fields are supplied explicitly.
      if (input.type === "hidden" || input.name.startsWith("$ACTION")) {
        data.append(input.name, input.value ?? "");
      }
    }
    for (const [key, value] of Object.entries(fields)) data.append(key, String(value));
    const response = await this.fetch(pagePath, { method: "POST", body: data, redirect: "manual" });
    const body = await response.text();
    return { response, body, location: response.headers.get("location") ?? "" };
  }
}

function json(session, pathname, options = {}) {
  return session.fetch(pathname, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
}

async function jsonBody(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function waitFor(predicate, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

function dbRows(sql, ...params) {
  if (!DB_PATH) return [];
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return db.prepare(sql).all(...params);
  } finally {
    db.close();
  }
}

function dbExec(sql, ...params) {
  if (!DB_PATH) return;
  const db = new Database(DB_PATH);
  try {
    db.pragma("busy_timeout = 5000");
    db.prepare(sql).run(...params);
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// 1. Public surface, headers, health
// ---------------------------------------------------------------------------
const anonymous = new Session("anonymous");

await step("public pages and headers", async () => {
  const home = await anonymous.fetch("/");
  check("home returns 200", home.status === 200, `status ${home.status}`);
  const html = await home.text();
  check("home renders", html.includes("Short links"));
  check("no x-powered-by", !home.headers.get("x-powered-by"));

  const cssHref = html.match(/\/_next\/static\/[^"']+\.css/)?.[0];
  check("page references built CSS", Boolean(cssHref));
  if (cssHref) {
    const css = await anonymous.fetch(cssHref);
    check("built CSS is served", css.status === 200, `status ${css.status}`);
    check("CSS content type", (css.headers.get("content-type") ?? "").includes("text/css"));
    await css.text();
  }
  const jsHref = html.match(/\/_next\/static\/[^"']+\.js/)?.[0];
  check("page references built JS", Boolean(jsHref));
  if (jsHref) {
    const js = await anonymous.fetch(jsHref);
    check("built JS is served", js.status === 200, `status ${js.status}`);
    await js.text();
  }
  const icon = await anonymous.fetch("/icon.svg");
  check("icon is served", icon.status === 200, `status ${icon.status}`);
  await icon.text();

  const csp = home.headers.get("content-security-policy") ?? "";
  check("CSP present", csp.includes("default-src 'self'"));
  check("CSP blocks framing", csp.includes("frame-ancestors 'none'"));
  check("CSP blocks objects", csp.includes("object-src 'none'"));
  check("X-Frame-Options DENY", home.headers.get("x-frame-options") === "DENY");
  check("nosniff", home.headers.get("x-content-type-options") === "nosniff");
  check("referrer policy", (home.headers.get("referrer-policy") ?? "").includes("strict-origin"));
  check("permissions policy", (home.headers.get("permissions-policy") ?? "").includes("camera=()"));
  if (EXPECT_PROD) {
    check("HSTS in production", (home.headers.get("strict-transport-security") ?? "").includes("max-age="));
  }

  for (const pathname of ["/pricing", "/docs", "/terms", "/privacy", "/status", "/changelog", "/contact", "/login", "/signup"]) {
    const response = await anonymous.fetch(pathname);
    check(`${pathname} returns 200`, response.status === 200, `status ${response.status}`);
    await response.text();
  }

  const sitemap = await anonymous.fetch("/sitemap.xml");
  check("sitemap returns 200", sitemap.status === 200);
  check("sitemap is XML", (sitemap.headers.get("content-type") ?? "").includes("xml"));
  await sitemap.text();
  const robots = await anonymous.fetch("/robots.txt");
  check("robots returns 200", robots.status === 200);
  await robots.text();

  const health = await anonymous.fetch("/api/health");
  const healthData = await jsonBody(health);
  check("health returns 200", health.status === 200, `status ${health.status}`);
  check("health reports ok", healthData.status === "ok", JSON.stringify(healthData));
  check("health checks schema", healthData.checks?.schema === true);
  check("health checks wal", healthData.checks?.wal === true);
  check("health is not cached", (health.headers.get("cache-control") ?? "").includes("no-store"));

  const missing = await anonymous.fetch("/definitely-not-a-real-slug-xyz");
  check("unknown slug returns 404", missing.status === 404, `status ${missing.status}`);
  await missing.text();
});

await step("demo routes follow the feature flag", async () => {
  const demoPage = await anonymous.fetch("/demo");
  const body = await demoPage.text();
  if (EXPECT_DEMO) {
    check("demo route redirects signed-in", demoPage.status === 303 || demoPage.status === 307, `status ${demoPage.status}`);
    check("demo route sets a session", [...anonymous.cookies.keys()].includes("velo_session"));
  } else {
    check("demo route is 404 outside development", demoPage.status === 404, `status ${demoPage.status}`);
    check("demo 404 body is boring", !body.includes("dashboard"));
  }

  const api = await anonymous.fetch("/api/demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/demo" }),
  });
  const apiBody = await jsonBody(api);
  if (EXPECT_DEMO) {
    check("demo API creates a link", api.status === 200, `status ${api.status}`);
    check("demo API returns shortUrl", typeof apiBody.shortUrl === "string");
    if (apiBody.shortUrl) {
      const target = new URL(apiBody.shortUrl).pathname;
      const redirect = await anonymous.fetch(target);
      check("demo link redirects", redirect.status === 307 || redirect.status === 308, `status ${redirect.status}`);
      await redirect.text();
    }
  } else {
    check("demo API is 404 outside development", api.status === 404, `status ${api.status}`);
  }
});

// ---------------------------------------------------------------------------
// 2. Signup, login, sessions, open redirect
// ---------------------------------------------------------------------------
const creator = new Session("creator");

await step("signup through the real form", async () => {
  const page = await creator.html("/signup");
  const form = findForm(page.body, (candidate) => candidate.inputs.some((i) => i.name === "email"));
  const result = await creator.submit("/signup", form, {
    name: "Smoke Tester",
    email: EMAIL,
    password: PASSWORD,
  });
  check("signup redirects", result.response.status === 303 || result.response.status === 307, `status ${result.response.status}`);
  check("signup lands on dashboard", result.location.includes("/dashboard"), result.location);

  const sessionCookie = creator.lastSetCookies.find((cookie) => cookie.startsWith("velo_session="));
  check("signup sets a session cookie", Boolean(sessionCookie));
  check("session cookie is HttpOnly", (sessionCookie ?? "").toLowerCase().includes("httponly"));
  check("session cookie is SameSite=Lax", (sessionCookie ?? "").toLowerCase().includes("samesite=lax"));
  if (EXPECT_PROD) check("session cookie is Secure", (sessionCookie ?? "").toLowerCase().includes("secure"));

  const dashboard = await creator.fetch("/dashboard");
  const dashboardHtml = await dashboard.text();
  check("dashboard requires the session and renders", dashboard.status === 200 && dashboardHtml.includes("Smoke Tester"), `status ${dashboard.status}`);
});

await step("duplicate signup is rejected", async () => {
  const other = new Session("duplicate-signup");
  const page = await other.html("/signup");
  const form = findForm(page.body, (candidate) => candidate.inputs.some((i) => i.name === "email"));
  const result = await other.submit("/signup", form, { name: "Duplicate", email: EMAIL, password: PASSWORD });
  check("duplicate signup does not create a session", ![...other.cookies.keys()].includes("velo_session"));
  check("duplicate signup explains", /already exists/i.test(result.body), "no explanation in response");
});

await step("login rejects wrong and over-long passwords generically", async () => {
  const attacker = new Session("attacker");
  for (const password of ["definitely-wrong", "x".repeat(201)]) {
    const page = await attacker.html("/login");
    const form = findForm(page.body, (candidate) => candidate.inputs.some((i) => i.name === "password"));
    const result = await attacker.submit("/login", form, { email: EMAIL, password });
    check("bad login does not set a session", ![...attacker.cookies.keys()].includes("velo_session"));
    check("bad login is generic", /email or password is incorrect/i.test(result.body));
  }
});

await step("login works and closes the open redirect", async () => {
  const login = new Session("login");
  const page = await login.html("/login");
  const form = findForm(page.body, (candidate) => candidate.inputs.some((i) => i.name === "password"));
  const result = await login.submit("/login", form, {
    email: EMAIL,
    password: PASSWORD,
    next: "//evil.example/steal",
  });
  check("login redirects", result.response.status === 303 || result.response.status === 307, `status ${result.response.status}`);
  check("login ignores protocol-relative next", !result.location.includes("evil.example"), result.location);
  check("login redirects to dashboard", result.location.endsWith("/dashboard"), result.location);
  check("login sets a session", [...login.cookies.keys()].includes("velo_session"));

  const forged = new Session("forged");
  forged.cookies.set("velo_session", "forged-session-token");
  const dashboard = await forged.fetch("/dashboard");
  check("forged session is rejected", dashboard.status === 303 || dashboard.status === 307, `status ${dashboard.status}`);
  await dashboard.text();
});

// ---------------------------------------------------------------------------
// 3. Link creation, validation, redirects, analytics
// ---------------------------------------------------------------------------
let normalLink = null;
let secretLink = null;
let csvLink = null;

await step("link API enforces content type, size, origin and input rules", async () => {
  const wrongType = await creator.fetch("/api/links", { method: "POST", body: "url=https://example.com" });
  check("non-JSON content type is 415", wrongType.status === 415, `status ${wrongType.status}`);
  await wrongType.text();

  const badJson = await creator.fetch("/api/links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not json",
  });
  check("invalid JSON is 400", badJson.status === 400, `status ${badJson.status}`);
  await badJson.text();

  const crossOrigin = await creator.fetch("/api/links", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ url: "https://example.com" }),
  });
  check("cross-origin write is 403", crossOrigin.status === 403, `status ${crossOrigin.status}`);
  await crossOrigin.text();

  const huge = await creator.fetch("/api/links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://example.com", title: "x".repeat(40_000) }),
  });
  check("oversized body is 413", huge.status === 413, `status ${huge.status}`);
  await huge.text();

  const badUrl = await json(creator, "/api/links", {
    method: "POST",
    body: JSON.stringify({ url: "javascript:alert(1)" }),
  });
  check("javascript URL is rejected", badUrl.status === 400, `status ${badUrl.status}`);
  await badUrl.text();

  const reserved = await json(creator, "/api/links", {
    method: "POST",
    body: JSON.stringify({ url: "https://example.com", slug: "admin" }),
  });
  check("reserved slug is rejected", reserved.status === 400, `status ${reserved.status}`);
  await reserved.text();

  const stranger = new Session("stranger");
  const unauthorized = await stranger.fetch("/api/links", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  check("unauthenticated link write is 401", unauthorized.status === 401, `status ${unauthorized.status}`);
  await unauthorized.text();
});

await step("create, redirect, record a click, pause and resume", async () => {
  const create = await json(creator, "/api/links", {
    method: "POST",
    body: JSON.stringify({
      url: "https://example.com/landing?utm=smoke",
      slug: `smoke-${RUN}`,
      title: "Smoke landing",
      tags: "smoke",
    }),
  });
  const created = await jsonBody(create);
  check("link create returns 201", create.status === 201, `status ${create.status}`);
  check("link create returns a short URL", typeof created.shortUrl === "string");
  normalLink = created;

  const duplicate = await json(creator, "/api/links", {
    method: "POST",
    body: JSON.stringify({ url: "https://example.com/other", slug: `smoke-${RUN}` }),
  });
  check("duplicate slug returns 409", duplicate.status === 409, `status ${duplicate.status}`);
  await duplicate.text();

  const target = new URL(created.shortUrl).pathname;
  const redirect = await anonymous.fetch(target);
  check("short link redirects to destination", (redirect.headers.get("location") ?? "").startsWith("https://example.com/landing"), redirect.headers.get("location") ?? "no location");
  await redirect.text();

  const recorded = await waitFor(async () => {
    const list = await creator.fetch(`/api/links?limit=500`);
    const data = await jsonBody(list);
    const row = (data.links ?? []).find((link) => link.slug === created.slug);
    return row && row.clicks >= 1;
  });
  check("click is recorded", recorded);

  const pause = await json(creator, `/api/links/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "toggle" }),
  });
  const pauseData = await jsonBody(pause);
  check("link pauses", pause.status === 200 && pauseData.active === 0, `status ${pause.status}`);

  const paused = await anonymous.fetch(target);
  const pausedBody = await paused.text();
  check("paused link does not redirect", paused.status === 200 && !paused.headers.get("location"));
  check("paused link explains", /switched off/i.test(pausedBody));

  const resume = await json(creator, `/api/links/${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "toggle" }),
  });
  const resumeData = await jsonBody(resume);
  check("link resumes", resume.status === 200 && resumeData.active === 1);
});

await step("password links use a signed, expiring unlock cookie", async () => {
  const create = await json(creator, "/api/links", {
    method: "POST",
    body: JSON.stringify({
      url: "https://example.com/secret",
      slug: `secret-${RUN}`,
      password: "open-sesame",
    }),
  });
  const created = await jsonBody(create);
  check("password link created", create.status === 201, `status ${create.status}`);
  secretLink = created;
  const target = new URL(created.shortUrl).pathname;

  const forged = new Session("forged-unlock");
  forged.cookies.set(`velo_unlock_${created.id}`, "1");
  const forgedPage = await forged.fetch(target);
  const forgedBody = await forgedPage.text();
  check("forged unlock cookie does not redirect", forgedPage.status === 200 && !forgedPage.headers.get("location"));
  check("forged unlock cookie still shows the form", /protected/i.test(forgedBody));

  const malformed = new Session("malformed-unlock");
  malformed.cookies.set(`velo_unlock_${created.id}`, "9999999999999.deadbeef");
  const malformedPage = await malformed.fetch(target);
  check("malformed unlock token is rejected", malformedPage.status === 200 && !malformedPage.headers.get("location"));
  await malformedPage.text();

  const visitor = new Session("unlock-visitor");
  const page = await visitor.html(target);
  const form = findForm(page.body, (candidate) => candidate.inputs.some((i) => i.name === "password"));

  const wrong = await visitor.submit(target, form, { password: "wrong-password" });
  check("wrong password keeps the lock", wrong.location.includes("error=1") || /didn&apos;t match|didn't match/i.test(wrong.body), wrong.location || "no error");

  const freshPage = await visitor.html(target);
  const freshForm = findForm(freshPage.body, (candidate) => candidate.inputs.some((i) => i.name === "password"));
  const unlock = await visitor.submit(target, freshForm, { password: "open-sesame" });
  check("correct password unlocks", unlock.response.status === 303 || unlock.response.status === 307, `status ${unlock.response.status}`);
  const tokenCookie = visitor.lastSetCookies.find((cookie) => cookie.startsWith(`velo_unlock_${created.id}=`));
  check("unlock sets a signed token, not a flag", Boolean(tokenCookie) && /=\d+\.[A-Za-z0-9_-]+/.test(tokenCookie ?? ""), tokenCookie ?? "missing");

  const unlocked = await visitor.fetch(target);
  check("unlocked link redirects", (unlocked.headers.get("location") ?? "").startsWith("https://example.com/secret"), unlocked.headers.get("location") ?? "no location");
  await unlocked.text();
});

// ---------------------------------------------------------------------------
// 4. CSV export
// ---------------------------------------------------------------------------
await step("CSV export neutralises formulas", async () => {
  const create = await json(creator, "/api/links", {
    method: "POST",
    body: JSON.stringify({ url: "https://example.com/csv", title: "=SUM(A1:A2)", slug: `csv-${RUN}` }),
  });
  csvLink = await jsonBody(create);
  check("csv fixture link created", create.status === 201, `status ${create.status}`);

  const exported = await creator.fetch("/api/export?type=links");
  const body = await exported.text();
  check("CSV export returns 200", exported.status === 200, `status ${exported.status}`);
  check("CSV is an attachment", (exported.headers.get("content-disposition") ?? "").includes("attachment"));
  check("CSV escapes formula title", body.includes("'=SUM(A1:A2)"), "formula was not prefixed");
  check("CSV has a header row", body.startsWith("slug,url,title,tags,status,created_at,clicks"));

  const clicks = await creator.fetch("/api/export?type=clicks");
  const clicksBody = await clicks.text();
  check("clicks CSV returns 200", clicks.status === 200, `status ${clicks.status}`);
  check("clicks CSV has data", clicksBody.includes("clicked_at"));
});

// ---------------------------------------------------------------------------
// 5. API keys and API v1
// ---------------------------------------------------------------------------
let apiKey = null;

await step("API keys and v1 links", async () => {
  const keyResponse = await json(creator, "/api/keys", {
    method: "POST",
    body: JSON.stringify({ name: "Smoke key" }),
  });
  const keyData = await jsonBody(keyResponse);
  check("API key created", keyResponse.status === 201 && typeof keyData.key === "string", `status ${keyResponse.status}`);
  apiKey = keyData.key;

  const noAuth = await anonymous.fetch("/api/v1/links");
  check("v1 without a key is 401", noAuth.status === 401, `status ${noAuth.status}`);
  await noAuth.text();

  const badAuth = await anonymous.fetch("/api/v1/links", { headers: { authorization: "Bearer velo_sk_nope" } });
  check("v1 with a bad key is 401", badAuth.status === 401, `status ${badAuth.status}`);
  await badAuth.text();

  const list = await anonymous.fetch("/api/v1/links?limit=1", { headers: { authorization: `Bearer ${apiKey}` } });
  const listData = await jsonBody(list);
  check("v1 list returns 200", list.status === 200, `status ${list.status}`);
  check("v1 list paginates", Array.isArray(listData.data) && listData.data.length <= 1 && listData.total >= 2, JSON.stringify(listData).slice(0, 200));
  check("v1 list includes shortUrl", listData.data?.every((row) => typeof row.shortUrl === "string"));

  const created = await anonymous.fetch("/api/v1/links", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/api", slug: `api-${RUN}` }),
  });
  const createdData = await jsonBody(created);
  check("v1 create returns 201", created.status === 201, `status ${created.status}`);

  const duplicate = await anonymous.fetch("/api/v1/links", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ url: "https://example.com/api2", slug: `api-${RUN}` }),
  });
  check("v1 duplicate slug is 409", duplicate.status === 409, `status ${duplicate.status}`);
  await duplicate.text();

  const detail = await anonymous.fetch(`/api/v1/links/${createdData.slug}`, { headers: { authorization: `Bearer ${apiKey}` } });
  const detailData = await jsonBody(detail);
  check("v1 detail returns 200", detail.status === 200, `status ${detail.status}`);
  check("v1 detail includes shortUrl", typeof detailData.data?.shortUrl === "string");

  const stats = await anonymous.fetch(`/api/v1/links/${createdData.slug}/stats`, { headers: { authorization: `Bearer ${apiKey}` } });
  check("v1 stats returns 200", stats.status === 200, `status ${stats.status}`);
  await stats.text();

  const deleted = await anonymous.fetch(`/api/v1/links/${createdData.slug}`, { method: "DELETE", headers: { authorization: `Bearer ${apiKey}` } });
  check("v1 delete returns 200", deleted.status === 200, `status ${deleted.status}`);
  await deleted.text();
});

await step("API key rate limit returns 429", async () => {
  let limited = false;
  for (let i = 0; i < 135; i++) {
    const response = await anonymous.fetch("/api/v1/links?limit=1", { headers: { authorization: `Bearer ${apiKey}` } });
    await response.text();
    if (response.status === 429) {
      limited = true;
      check("rate limit sends Retry-After", Boolean(response.headers.get("retry-after")));
      break;
    }
  }
  check("121+ requests per minute are limited", limited);
});

// ---------------------------------------------------------------------------
// 6. Custom domains and Host routing
// ---------------------------------------------------------------------------
let domainHost = null;

await step("custom domains verify and route by Host", async () => {
  if (DOMAIN_MODE === "skip") return;

  // Custom domains are a paid feature; promote the fixture account before exercising them.
  dbExec("UPDATE users SET plan = 'pro' WHERE email = ?", EMAIL);

  const host = `go-${RUN}.example.test`;
  const page = await creator.html("/dashboard/domains");
  const addForm = findForm(page.body, (form) => form.inputs.some((input) => input.name === "hostname"));
  const added = await creator.submit("/dashboard/domains", addForm, { hostname: host });
  check("domain add responds", added.response.status < 500, `status ${added.response.status}`);
  check("domain add did not error", !added.location.includes("error="), added.location);

  const pending = await creator.html("/dashboard/domains");
  check("domain is listed as pending", pending.body.includes(host) && /Pending DNS/i.test(pending.body));
  const verifyForm = findForm(pending.body, (form) => form.inputs.some((i) => i.name === "id") && form.html.includes("Verify DNS"));
  const domainId = verifyForm.inputs.find((input) => input.name === "id")?.value;
  check("domain id is present", Boolean(domainId));

  const verified = await creator.submit("/dashboard/domains", verifyForm, { id: domainId });
  const after = await creator.html("/dashboard/domains");

  if (DOMAIN_MODE === "dns") {
    check("DNS mode refuses a missing record", verified.location.includes("error=dns"), verified.location || "no redirect");
    check("domain stays pending", /Pending DNS/i.test(after.body));
    return;
  }

  check("manual mode verifies", verified.location === "" || verified.location.includes("/dashboard/domains"), verified.location);
  check("domain becomes verified", /Verified/i.test(after.body));
  domainHost = host;

  const create = await json(creator, "/api/links", {
    method: "POST",
    body: JSON.stringify({
      url: "https://example.com/domain",
      slug: `domain-${RUN}`,
      domainId,
    }),
  });
  const created = await jsonBody(create);
  check("domain-scoped link created", create.status === 201, `status ${create.status}`);
  check("short URL uses the custom domain", (created.shortUrl ?? "").startsWith(`https://${host}/`), created.shortUrl ?? "missing");

  // The app prefers x-forwarded-host, which lets us exercise Host routing locally.
  const routed = await anonymous.fetch(`/domain-${RUN}`, { headers: { "x-forwarded-host": host } });
  check("custom Host resolves its link", (routed.headers.get("location") ?? "") === "https://example.com/domain", routed.headers.get("location") ?? "no location");
  await routed.text();

  const wrongHost = await anonymous.fetch(`/domain-${RUN}`, { headers: { "x-forwarded-host": "other.example.test" } });
  check("other Host does not resolve the link", wrongHost.status === 404, `status ${wrongHost.status}`);
  await wrongHost.text();

  const mainHost = await anonymous.fetch(`/domain-${RUN}`);
  check("primary Host does not serve domain links", mainHost.status === 404, `status ${mainHost.status}`);
  await mainHost.text();

  const unverified = await anonymous.fetch(`/domain-${RUN}`, {
    headers: { "x-forwarded-host": `unverified-${RUN}.example.test` },
  });
  check("unknown Host does not fall through", unverified.status === 404, `status ${unverified.status}`);
  await unverified.text();
});

// ---------------------------------------------------------------------------
// 7. Admin: access control, settings, audit log
// ---------------------------------------------------------------------------
await step("admin access control and settings", async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  const blocked = await anonymous.fetch("/admin");
  check("anonymous admin access redirects", blocked.status === 303 || blocked.status === 307, `status ${blocked.status}`);
  await blocked.text();

  if (!adminEmail || !adminPassword) return;

  const admin = new Session("admin");
  const loginPage = await admin.html("/admin/login");
  const loginForm = findForm(loginPage.body, (form) => form.inputs.some((input) => input.name === "password"));
  const login = await admin.submit("/admin/login", loginForm, { email: adminEmail, password: adminPassword });
  check("admin login redirects", login.response.status === 303 || login.response.status === 307, `status ${login.response.status}`);
  check("admin login lands on admin", login.location.endsWith("/admin"), login.location);

  const panel = await admin.fetch("/admin");
  const panelBody = await panel.text();
  check("admin panel renders", panel.status === 200 && /Admin|Platform|MRR/i.test(panelBody), `status ${panel.status}`);

  const usersPage = await admin.html("/admin/users");
  check("admin users page renders", usersPage.response.status === 200);

  const settingsPage = await admin.html("/admin/settings");
  const settingsForm = findForm(settingsPage.body, (form) => form.inputs.some((input) => input.name === "signups_open"));
  const closed = await admin.submit("/admin/settings", settingsForm, { default_price: "499" });
  check("admin can close signups", closed.response.status < 500, `status ${closed.response.status}`);

  const blockedSignup = new Session("signup-closed");
  const signupPage = await blockedSignup.html("/signup");
  const signupForm = findForm(signupPage.body, (form) => form.inputs.some((input) => input.name === "email"));
  const attempt = await blockedSignup.submit("/signup", signupForm, {
    name: "Blocked User",
    email: `blocked-${RUN}@example.test`,
    password: PASSWORD,
  });
  check("signup respects the admin switch", /temporarily closed/i.test(attempt.body));

  const reopenPage = await admin.html("/admin/settings");
  const reopenForm = findForm(reopenPage.body, (form) => form.inputs.some((input) => input.name === "signups_open"));
  const reopened = await admin.submit("/admin/settings", reopenForm, { signups_open: "on", default_price: "499" });
  check("admin can reopen signups", reopened.response.status < 500);

  if (DB_PATH) {
    const rows = dbRows("SELECT action FROM audit_log WHERE action LIKE 'admin.%' ORDER BY id DESC LIMIT 20");
    const actions = rows.map((row) => row.action);
    check("admin login is audited", actions.includes("admin.login"));
    check("admin settings change is audited", actions.includes("admin.settings.saved"));
  }
});

// ---------------------------------------------------------------------------
// 8. Data integrity and summary
// ---------------------------------------------------------------------------
await step("database stays healthy after the run", async () => {
  const health = await anonymous.fetch("/api/health");
  const data = await jsonBody(health);
  check("health still ok", health.status === 200 && data.status === "ok", JSON.stringify(data));
  if (DB_PATH) {
    const rows = dbRows("PRAGMA integrity_check");
    check("sqlite integrity_check is ok", rows[0]?.integrity_check === "ok", JSON.stringify(rows));
  }
});

console.log(`\n${passed} checks passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\nFailures:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("Smoke test passed.");
