import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./crypto";

type DB = Database.Database;

const globalForDb = globalThis as unknown as { __veloDb?: DB };

function getDatabaseFilePath(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "bigsavingsdays.db");
  }
  return path.join(process.cwd(), "data", "velo.db");
}

function createDb(): DB {
  const file = getDatabaseFilePath();

  if (file !== ":memory:") {
    try {
      fs.mkdirSync(path.dirname(path.resolve(/*turbopackIgnore: true*/ file)), { recursive: true });
    } catch {
      // In serverless / read-only environments, ignore if directory exists or fails
    }
  }

  const db = new Database(file);
  try {
    db.pragma("journal_mode = WAL");
  } catch {
    try {
      db.pragma("journal_mode = DELETE");
    } catch {}
  }
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

function seed(db: DB) {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (existing.n > 0) return;

  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (id, email, name, password_hash, role, plan, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertUser.run(
    "usr_bsd_admin", "admin@bigsavingsdays.com", "BigSavingsDays Admin", hashPassword("admin1234"),
    "admin", "business", "#FF5722", now
  );
  insertUser.run(
    "usr_bsd_creator", "user@bigsavingsdays.com", "Deals Creator", hashPassword("user1234"),
    "user", "pro", "#10B981", now
  );

  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").run("signups_open", "1");
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").run("default_price", "499");
}

export function getDb(): DB {
  if (!globalForDb.__veloDb) globalForDb.__veloDb = createDb();
  return globalForDb.__veloDb;
}
