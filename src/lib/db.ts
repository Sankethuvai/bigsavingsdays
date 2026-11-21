import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { hashPassword, randomId } from "./crypto";
import { seedDemo } from "./env";

type DB = Database.Database;

const globalForDb = globalThis as unknown as { __veloDb?: DB };

function createDb(): DB {
  const file =
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "velo.db");

  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }

  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  migrate(db);
  seed(db);
  return db;
}

function migrate(db: DB) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      plan          TEXT NOT NULL DEFAULT 'free',
      telegram_id   TEXT,
      avatar_color  TEXT NOT NULL DEFAULT '#B6F24A',
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS domains (
      id                 TEXT PRIMARY KEY,
      user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hostname           TEXT NOT NULL UNIQUE,
      status             TEXT NOT NULL DEFAULT 'pending',
      verification_token TEXT NOT NULL,
      created_at         INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS links (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain_id     TEXT REFERENCES domains(id) ON DELETE SET NULL,
      slug          TEXT NOT NULL UNIQUE,
      url           TEXT NOT NULL,
      title         TEXT NOT NULL DEFAULT '',
      tags          TEXT NOT NULL DEFAULT '',
      password_hash TEXT,
      expires_at    INTEGER,
      click_limit   INTEGER,
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_links_user ON links(user_id);
    CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);

    CREATE TABLE IF NOT EXISTS clicks (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id  TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      ts       INTEGER NOT NULL,
      country  TEXT NOT NULL DEFAULT 'Unknown',
      city     TEXT NOT NULL DEFAULT '',
      device   TEXT NOT NULL DEFAULT 'desktop',
      browser  TEXT NOT NULL DEFAULT 'Other',
      os       TEXT NOT NULL DEFAULT 'Other',
      referrer TEXT NOT NULL DEFAULT 'Direct',
      ip_hash  TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_clicks_link_ts ON clicks(link_id, ts);
    CREATE INDEX IF NOT EXISTS idx_clicks_ts ON clicks(ts);

    CREATE TABLE IF NOT EXISTS pages (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug         TEXT NOT NULL UNIQUE,
      title        TEXT NOT NULL,
      bio          TEXT NOT NULL DEFAULT '',
      theme        TEXT NOT NULL DEFAULT 'light',
      avatar_color TEXT NOT NULL DEFAULT '#B6F24A',
      created_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS page_links (
      id         TEXT PRIMARY KEY,
      page_id    TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      label      TEXT NOT NULL,
      url        TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      clicks     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      prefix       TEXT NOT NULL,
      key_hash     TEXT NOT NULL,
      last_used_at INTEGER,
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_links_user_created ON links(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
    CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id);
    CREATE INDEX IF NOT EXISTS idx_page_links_page ON page_links(page_id);

    CREATE TABLE IF NOT EXISTS rate_limits (
      bucket   TEXT PRIMARY KEY,
      count    INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id   TEXT,
      action     TEXT NOT NULL,
      target     TEXT,
      meta       TEXT,
      ip_hash    TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
  `);

  // Defaults that must exist even when demo seeding is disabled.
  db.prepare("INSERT INTO settings (key, value) VALUES ('signups_open', '1') ON CONFLICT(key) DO NOTHING").run();
  db.prepare("INSERT INTO settings (key, value) VALUES ('default_price', '499') ON CONFLICT(key) DO NOTHING").run();

  // Track schema versions so future migrations can be additive instead of best-effort.
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version < 1) db.pragma("user_version = 1");
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seed(db: DB) {
  // Never seed demo accounts in production unless the operator explicitly opts in.
  if (!seedDemo()) return;
  const existing = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (existing.n > 0) return;

  const now = Date.now();
  const day = 86_400_000;
  const rand = mulberry32(42);

  const insertUser = db.prepare(
    `INSERT INTO users (id, email, name, password_hash, role, plan, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const demoId = randomId(8);
  const adminId = randomId(8);
  insertUser.run(
    demoId, "demo@velo.link", "Demo Creator", hashPassword("demo1234"),
    "user", "pro", "#B6F24A", now - 210 * day
  );
  insertUser.run(
    adminId, "admin@velo.link", "Velo Admin", hashPassword("admin1234"),
    "admin", "business", "#2B4CFF", now - 400 * day
  );

  const mayaId = randomId(8);
  const arjunId = randomId(8);
  const lenaId = randomId(8);
  const samId = randomId(8);
  insertUser.run(
    mayaId, "maya@studio.co", "Maya Kapoor", hashPassword("velo1234"),
    "user", "free", "#FF6B35", now - 120 * day
  );
  insertUser.run(
    arjunId, "arjun@shop.in", "Arjun Mehta", hashPassword("velo1234"),
    "user", "pro", "#22C3A6", now - 84 * day
  );
  insertUser.run(
    lenaId, "lena@news.dev", "Lena Fischer", hashPassword("velo1234"),
    "user", "free", "#E5488A", now - 41 * day
  );
  insertUser.run(
    samId, "sam@indie.dev", "Sam Okafor", hashPassword("velo1234"),
    "user", "business", "#8B5CF6", now - 22 * day
  );

  const demoDomainId = randomId(8);
  db.prepare(
    `INSERT INTO domains (id, user_id, hostname, status, verification_token, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(demoDomainId, demoId, "go.velo.link", "verified", "velo-verify-8f2a", now - 90 * day);

  type SeedLink = {
    slug: string; url: string; title: string; tags: string; age: number;
    weight: number; active?: boolean; expires?: number; owner?: string;
    domain?: boolean; password?: string;
  };

  const seedLinks: SeedLink[] = [
    { slug: "launch", url: "https://velo.link/blog/summer-launch", title: "Summer launch announcement", tags: "campaign", age: 58, weight: 9 },
    { slug: "drop-01", url: "https://shop.example.com/collections/drop-01", title: "Drop 01 — product page", tags: "commerce", age: 47, weight: 7 },
    { slug: "newsletter", url: "https://velo.link/newsletter", title: "Weekly newsletter signup", tags: "email", age: 44, weight: 4 },
    { slug: "podcast-12", url: "https://open.spotify.com/episode/example", title: "Podcast episode 12", tags: "content", age: 38, weight: 3 },
    { slug: "waitlist", url: "https://velo.link/waitlist", title: "Waitlist — Velo 2.0", tags: "product", age: 32, weight: 6 },
    { slug: "yt-demo", url: "https://youtube.com/watch?v=example", title: "YouTube walkthrough", tags: "video", age: 29, weight: 5 },
    { slug: "pricing-pdf", url: "https://velo.link/pricing.pdf", title: "Q3 pricing deck", tags: "sales", age: 25, weight: 2 },
    { slug: "event", url: "https://lu.ma/velo-live", title: "Velo Live — Mumbai", tags: "event", age: 21, weight: 4 },
    { slug: "ig-bio", url: "https://instagram.com/velo", title: "Instagram profile", tags: "social", age: 18, weight: 3 },
    { slug: "app", url: "https://apps.apple.com/app/example", title: "App Store download", tags: "product", age: 14, weight: 5 },
    { slug: "feedback", url: "https://tally.so/r/example", title: "Product feedback form", tags: "product", age: 9, weight: 2 },
    { slug: "partner", url: "https://velo.link/partners", title: "Partner programme", tags: "sales", age: 5, weight: 1 },
    { slug: "welcome", url: "https://velo.link/welcome", title: "Custom domain demo", tags: "demo", age: 20, weight: 2, domain: true },
    { slug: "secret", url: "https://velo.link/secret-destination", title: "Password-protected demo", tags: "demo", age: 16, weight: 1, password: "open-sesame" },
    { slug: "old-promo", url: "https://velo.link/2025-promo", title: "Expired winter promo", tags: "archive", age: 70, weight: 1, active: false },
    // Other workspaces so the admin tables reflect a real platform, not a single tenant.
    { slug: "maya-spring", url: "https://maya.studio/spring-collection", title: "Spring collection", tags: "shop", age: 52, weight: 3, owner: mayaId },
    { slug: "maya-notes", url: "https://maya.studio/journal", title: "Studio journal", tags: "blog", age: 26, weight: 2, owner: mayaId },
    { slug: "arjun-sale", url: "https://arjun.shop/sale", title: "Monsoon sale", tags: "commerce", age: 45, weight: 4, owner: arjunId },
    { slug: "lena-issue-42", url: "https://lena.news/issues/42", title: "Issue 42 — small tools", tags: "newsletter", age: 18, weight: 3, owner: lenaId },
    { slug: "sam-demo-day", url: "https://sam.dev/demo-day", title: "Demo day", tags: "event", age: 12, weight: 2, owner: samId },
    { slug: "sam-docs", url: "https://sam.dev/docs", title: "Product docs", tags: "product", age: 6, weight: 2, owner: samId },
  ];

  const insertLink = db.prepare(
    `INSERT INTO links (id, user_id, domain_id, slug, url, title, tags, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertClick = db.prepare(
    `INSERT INTO clicks (link_id, ts, country, city, device, browser, os, referrer, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const countries = [
    ["India", "Mumbai", 34], ["United States", "New York", 18], ["United Kingdom", "London", 9],
    ["Germany", "Berlin", 7], ["United Arab Emirates", "Dubai", 6], ["Singapore", "Singapore", 5],
    ["Canada", "Toronto", 5], ["Australia", "Sydney", 4], ["Brazil", "São Paulo", 3],
    ["Japan", "Tokyo", 3], ["Netherlands", "Amsterdam", 2], ["France", "Paris", 2],
  ] as const;
  const referrers = ["Direct", "instagram.com", "x.com", "linkedin.com", "newsletter", "google.com", "youtube.com", "whatsapp", "telegram"];
  const devices = [["mobile", 68], ["desktop", 26], ["tablet", 6]] as const;
  const browsers = ["Chrome", "Safari", "Edge", "Firefox", "Samsung Internet"];
  const oses = ["iOS", "Android", "macOS", "Windows", "Linux"];

  const pick = <T,>(list: readonly (readonly [T, number])[]): T => {
    const total = list.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [v, w] of list) {
      r -= w;
      if (r <= 0) return v;
    }
    return list[0][0];
  };

  const insertClicks = db.transaction(() => {
    for (const l of seedLinks) {
      const id = randomId(8);
      insertLink.run(
        id, l.owner ?? demoId, l.domain ? demoDomainId : null, l.slug, l.url, l.title,
        l.tags, l.active === false ? 0 : 1, now - l.age * day, now - l.age * day
      );
      if (l.password) {
        db.prepare("UPDATE links SET password_hash = ? WHERE id = ?").run(hashPassword(l.password), id);
      }

      for (let d = Math.min(l.age, 60); d >= 0; d--) {
        // gentle weekday seasonality + growth trend
        const date = now - d * day;
        const weekday = new Date(date).getDay();
        const weekend = weekday === 0 || weekday === 6 ? 0.62 : 1;
        const growth = 0.55 + (1 - d / 60) * 0.9;
        const count = Math.round(l.weight * weekend * growth * (0.55 + rand() * 0.9));
        for (let i = 0; i < count; i++) {
          const country = pick(countries.map((c) => [c, c[2]] as const));
          const device = pick(devices);
          const ts = date - Math.floor(rand() * day);
          insertClick.run(
            id, ts, country[0], country[1], device,
            browsers[Math.floor(rand() * browsers.length)],
            oses[Math.floor(rand() * oses.length)],
            referrers[Math.floor(rand() * referrers.length)],
            `seed-${Math.floor(rand() * 900)}`
          );
        }
      }

      // Make sure the current day has activity so dashboards never end on a false zero.
      const todayCount = 3 + Math.floor(rand() * 5);
      for (let i = 0; i < todayCount; i++) {
        const country = pick(countries.map((c) => [c, c[2]] as const));
        insertClick.run(
          id, now - Math.floor(rand() * 6 * 3_600_000), country[0], country[1], pick(devices),
          browsers[Math.floor(rand() * browsers.length)],
          oses[Math.floor(rand() * oses.length)],
          referrers[Math.floor(rand() * referrers.length)],
          `seed-${Math.floor(rand() * 900)}`
        );
      }
    }
  });
  insertClicks();

  // Bio page
  const pageId = randomId(8);
  db.prepare(
    `INSERT INTO pages (id, user_id, slug, title, bio, theme, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(pageId, demoId, "demo", "Demo Creator", "Design, build, ship. Notes on building small products that compound.", "light", "#B6F24A", now - 60 * day);

  const pageLink = db.prepare(
    `INSERT INTO page_links (id, page_id, label, url, sort_order, clicks) VALUES (?, ?, ?, ?, ?, ?)`
  );
  pageLink.run(randomId(8), pageId, "Latest drop", "https://shop.example.com/collections/drop-01", 0, 1842);
  pageLink.run(randomId(8), pageId, "Newsletter", "https://velo.link/newsletter", 1, 961);
  pageLink.run(randomId(8), pageId, "Podcast", "https://open.spotify.com/episode/example", 2, 540);
  pageLink.run(randomId(8), pageId, "Work with me", "https://velo.link/partners", 3, 213);

  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").run("signups_open", "1");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").run("default_price", "499");
}

export function getDb(): DB {
  if (!globalForDb.__veloDb) globalForDb.__veloDb = createDb();
  return globalForDb.__veloDb;
}
