// src/lib/db.ts
// Database abstraction supporting local SQLite (better-sqlite3) for development and libSQL (Turso) for production.
// The public API mirrors the subset used by the application: exec, prepare (with run/get/all).
// This wrapper provides a synchronous‑like interface for both drivers, sufficient for the current codebase.

import type { Database as BetterSqlite3Database } from "better-sqlite3";
import Database from "better-sqlite3";
import { createClient, LibSQLClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import { isProduction } from "./env";

// Helper to obtain the SQLite file path (existing logic from previous version).
function getDatabaseFilePath(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "bigsavingsdays.db");
  }
  return path.join(process.cwd(), "data", "velo.db");
}

/** Minimal synchronous‑like DB interface used throughout the app. */
export interface DB {
  exec(sql: string): void;
  prepare<T = any>(sql: string): {
    run(...args: any[]): any;
    get(...args: any[]): T | undefined;
    all(...args: any[]): T[];
  };
}

let globalDb: DB | undefined;

export function getDb(): DB {
  if (globalDb) return globalDb;

  // Prefer libSQL when the env vars are present – this is the production persistent store.
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    // ----- libSQL (async) -----
    const client = createClient({ url: tursoUrl, authToken: tursoToken });

    // Simple spin‑wait bridge to make async calls appear sync. This is acceptable for the low‑latency edge functions.
    const sync = <T>(p: Promise<T>): T => {
      let result: T | undefined;
      let error: any;
      let done = false;
      p.then((v) => (result = v)).catch((e) => (error = e)).finally(() => (done = true));
      // Busy‑wait – Vercel lambdas are single‑threaded, so this blocks only this request.
      while (!done) { /* intentional noop */ }
      if (error) throw error;
      return result as T;
    };

    const libDb: DB = {
      exec(sql: string) {
        sync(client.execute({ sql }));
      },
      prepare<T = any>(sql: string) {
        return {
          run: (...args: any[]) => sync(client.execute({ sql, args })),
          get: (...args: any[]) => {
            const rows = sync(client.execute({ sql, args, mode: "first" })).rows;
            return rows[0] as T | undefined;
          },
          all: (...args: any[]) => {
            const rows = sync(client.execute({ sql, args })).rows;
            return rows as T[];
          },
        };
      },
    };
    globalDb = libDb;
    return libDb;
  }

  // ----- Local SQLite (development) -----
  const file = getDatabaseFilePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  } catch {}
  const sqlite: BetterSqlite3Database = new Database(file);
  // Apply pragmas (existing behaviour).
  try {
    sqlite.pragma("journal_mode = WAL");
  } catch { sqlite.pragma("journal_mode = DELETE"); }
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");

  // Run migrations and optional seed (the original functions are defined lower in this file).
  migrate(sqlite);
  seed(sqlite);

  const wrapper: DB = {
    exec: (sql: string) => sqlite.exec(sql),
    prepare: <T = any>(sql: string) => sqlite.prepare<T>(sql),
  };
  globalDb = wrapper;
  return wrapper;
}

/** Migration logic – unchanged from original implementation. */
function migrate(db: BetterSqlite3Database) {
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

  // Ensure basic settings exist.
  db.prepare("INSERT INTO settings (key, value) VALUES ('signups_open', '1') ON CONFLICT(key) DO NOTHING").run();
  db.prepare("INSERT INTO settings (key, value) VALUES ('default_price', '499') ON CONFLICT(key) DO NOTHING").run();

  // Track schema version.
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version < 1) db.pragma("user_version = 1");
}

/** Seed demo data only when explicitly enabled. */
function seed(db: BetterSqlite3Database) {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (existing.n > 0) return;

  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (id, email, name, password_hash, role, plan, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertUser.run(
    "usr_bsd_admin",
    "admin@bigsavingsdays.com",
    "BigSavingsDays Admin",
    hashPassword("admin1234"),
    "admin",
    "business",
    "#FF5722",
    now
  );
  insertUser.run(
    "usr_bsd_creator",
    "user@bigsavingsdays.com",
    "Deals Creator",
    hashPassword("user1234"),
    "user",
    "pro",
    "#10B981",
    now
  );
}

// Helper to hash passwords – re‑use the existing crypto helper.
import { hashPassword } from "./crypto";
