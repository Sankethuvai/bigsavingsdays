import "server-only";
import { getDb } from "./db";
import { hashIp, sha256 } from "./crypto";
import { countryName, parseUserAgent, referrerHost } from "./utils";

export type ClickInput = {
  linkId: string;
  ip: string;
  ua: string;
  referrer: string | null;
  countryCode: string | null;
};

export function recordClick(input: ClickInput) {
  const { device, browser, os } = parseUserAgent(input.ua);
  getDb()
    .prepare(
      `INSERT INTO clicks (link_id, ts, country, city, device, browser, os, referrer, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.linkId,
      Date.now(),
      countryName(input.countryCode ?? "") === "Unknown" ? "Unknown" : countryName(input.countryCode!),
      "",
      device,
      browser,
      os,
      referrerHost(input.referrer),
      hashIp(input.ip)
    );
}

const DAY = 86_400_000;

export function dailySeries(opts: { userId?: string; linkId?: string; days?: number }) {
  const days = opts.days ?? 30;
  const db = getDb();
  const since = Date.now() - (days - 1) * DAY;

  let rows: { day: string; n: number }[];
  if (opts.linkId) {
    rows = db
      .prepare(
        `SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') AS day, COUNT(*) AS n
         FROM clicks WHERE link_id = ? AND ts >= ?
         GROUP BY day ORDER BY day`
      )
      .all(opts.linkId, since) as { day: string; n: number }[];
  } else {
    rows = db
      .prepare(
        `SELECT strftime('%Y-%m-%d', c.ts/1000, 'unixepoch') AS day, COUNT(*) AS n
         FROM clicks c JOIN links l ON l.id = c.link_id
         WHERE l.user_id = ? AND c.ts >= ?
         GROUP BY day ORDER BY day`
      )
      .all(opts.userId, since) as { day: string; n: number }[];
  }

  const map = new Map(rows.map((r) => [r.day, r.n]));
  const out: { date: string; label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    out.push({
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: map.get(key) ?? 0,
    });
  }
  return out;
}

export function totalsFor(userId: string) {
  const db = getDb();
  const now = Date.now();
  const total = (db
    .prepare(
      `SELECT COUNT(*) AS n FROM clicks c JOIN links l ON l.id = c.link_id WHERE l.user_id = ?`
    )
    .get(userId) as { n: number }).n;
  const last30 = (db
    .prepare(
      `SELECT COUNT(*) AS n FROM clicks c JOIN links l ON l.id = c.link_id WHERE l.user_id = ? AND c.ts >= ?`
    )
    .get(userId, now - 30 * DAY) as { n: number }).n;
  const prev30 = (db
    .prepare(
      `SELECT COUNT(*) AS n FROM clicks c JOIN links l ON l.id = c.link_id WHERE l.user_id = ? AND c.ts >= ? AND c.ts < ?`
    )
    .get(userId, now - 60 * DAY, now - 30 * DAY) as { n: number }).n;
  const links = (db
    .prepare("SELECT COUNT(*) AS n FROM links WHERE user_id = ?")
    .get(userId) as { n: number }).n;
  const activeLinks = (db
    .prepare("SELECT COUNT(*) AS n FROM links WHERE user_id = ? AND active = 1")
    .get(userId) as { n: number }).n;
  const countries = (db
    .prepare(
      `SELECT COUNT(DISTINCT c.country) AS n FROM clicks c JOIN links l ON l.id = c.link_id WHERE l.user_id = ?`
    )
    .get(userId) as { n: number }).n;

  const growth = prev30 === 0 ? (last30 > 0 ? 100 : 0) : Math.round(((last30 - prev30) / prev30) * 100);
  return { total, last30, prev30, growth, links, activeLinks, countries };
}

export function breakdown(
  userId: string,
  column: "country" | "device" | "browser" | "referrer" | "os",
  days = 30,
  linkId?: string
) {
  const db = getDb();
  const since = Date.now() - days * DAY;
  const safe = column;
  const rows = linkId
    ? (db
        .prepare(
          `SELECT ${safe} AS label, COUNT(*) AS n FROM clicks
           WHERE link_id = ? AND ts >= ? GROUP BY ${safe} ORDER BY n DESC LIMIT 8`
        )
        .all(linkId, since) as { label: string; n: number }[])
    : (db
        .prepare(
          `SELECT c.${safe} AS label, COUNT(*) AS n FROM clicks c
           JOIN links l ON l.id = c.link_id
           WHERE l.user_id = ? AND c.ts >= ? GROUP BY c.${safe} ORDER BY n DESC LIMIT 8`
        )
        .all(userId, since) as { label: string; n: number }[]);
  const total = rows.reduce((s, r) => s + r.n, 0);
  return rows.map((r) => ({ ...r, pct: total ? Math.round((r.n / total) * 100) : 0 }));
}

export function topLinks(userId: string, days = 30) {
  const since = Date.now() - days * DAY;
  return getDb()
    .prepare(
      `SELECT l.id, l.slug, l.title, l.url, l.active, l.created_at,
              COUNT(c.id) AS clicks,
              MAX(c.ts) AS last_click
       FROM links l LEFT JOIN clicks c ON c.link_id = l.id AND c.ts >= ?
       WHERE l.user_id = ?
       GROUP BY l.id ORDER BY clicks DESC, l.created_at DESC LIMIT 6`
    )
    .all(since, userId) as {
    id: string; slug: string; title: string; url: string; active: number;
    created_at: number; clicks: number; last_click: number | null;
  }[];
}

export function recentClicks(userId: string, limit = 8) {
  return getDb()
    .prepare(
      `SELECT c.ts, c.country, c.device, c.browser, c.referrer, l.slug, l.title
       FROM clicks c JOIN links l ON l.id = c.link_id
       WHERE l.user_id = ? ORDER BY c.ts DESC LIMIT ?`
    )
    .all(userId, limit) as {
    ts: number; country: string; device: string; browser: string;
    referrer: string; slug: string; title: string;
  }[];
}

export function linkStats(linkId: string, days = 30) {
  const db = getDb();
  const since = Date.now() - days * DAY;
  const total = (db.prepare("SELECT COUNT(*) AS n FROM clicks WHERE link_id = ?").get(linkId) as { n: number }).n;
  const period = (db
    .prepare("SELECT COUNT(*) AS n FROM clicks WHERE link_id = ? AND ts >= ?")
    .get(linkId, since) as { n: number }).n;
  const unique = (db
    .prepare("SELECT COUNT(DISTINCT ip_hash) AS n FROM clicks WHERE link_id = ?")
    .get(linkId) as { n: number }).n;
  const last = (db
    .prepare("SELECT MAX(ts) AS ts FROM clicks WHERE link_id = ?")
    .get(linkId) as { ts: number | null }).ts;
  return { total, period, unique, last };
}

export function platformSeries(days = 30) {
  const since = Date.now() - (days - 1) * DAY;
  const rows = getDb()
    .prepare(
      `SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') AS day, COUNT(*) AS n
       FROM clicks WHERE ts >= ? GROUP BY day ORDER BY day`
    )
    .all(since) as { day: string; n: number }[];
  const map = new Map(rows.map((r) => [r.day, r.n]));
  const out: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY);
    out.push({
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: map.get(d.toISOString().slice(0, 10)) ?? 0,
    });
  }
  return out;
}

export function platformTopLinks(limit = 6) {
  return getDb()
    .prepare(
      `SELECT l.slug, l.title, u.email, COUNT(c.id) AS clicks
       FROM links l JOIN users u ON u.id = l.user_id
       LEFT JOIN clicks c ON c.link_id = l.id
       GROUP BY l.id ORDER BY clicks DESC LIMIT ?`
    )
    .all(limit) as { slug: string; title: string; email: string; clicks: number }[];
}

export function recentUsers(limit = 6) {
  return getDb()
    .prepare("SELECT id, name, email, plan, role, created_at FROM users ORDER BY created_at DESC LIMIT ?")
    .all(limit) as { id: string; name: string; email: string; plan: string; role: string; created_at: number }[];
}

export function adminOverview() {
  const db = getDb();
  const now = Date.now();
  const users = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  const links = (db.prepare("SELECT COUNT(*) AS n FROM links").get() as { n: number }).n;
  const clicks = (db.prepare("SELECT COUNT(*) AS n FROM clicks").get() as { n: number }).n;
  const clicks30 = (db
    .prepare("SELECT COUNT(*) AS n FROM clicks WHERE ts >= ?")
    .get(now - 30 * DAY) as { n: number }).n;
  const activeUsers = (db
    .prepare(
      `SELECT COUNT(DISTINCT l.user_id) AS n FROM clicks c JOIN links l ON l.id = c.link_id WHERE c.ts >= ?`
    )
    .get(now - 30 * DAY) as { n: number }).n;
  const mrr = (db
    .prepare(
      `SELECT
        SUM(CASE plan WHEN 'pro' THEN 499 WHEN 'business' THEN 1499 ELSE 0 END) AS n
       FROM users`
    )
    .get() as { n: number | null }).n ?? 0;
  return { users, links, clicks, clicks30, activeUsers, mrr };
}

export function linkUnavailable(
  link: { active: number; expires_at: number | null; click_limit: number | null },
  clickCount: number
): "disabled" | "expired" | "limit" | null {
  if (!link.active) return "disabled";
  if (link.expires_at && link.expires_at < Date.now()) return "expired";
  if (link.click_limit && clickCount >= link.click_limit) return "limit";
  return null;
}

export function keyHash(key: string) {
  return sha256(key);
}
