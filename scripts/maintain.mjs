import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "velo.db");
if (!fs.existsSync(file)) {
  console.error(`Database not found at ${file}.`);
  process.exit(1);
}

const now = Date.now();
const retentionDays = Number(process.env.CLICK_RETENTION_DAYS ?? 0);
const vacuum = process.argv.includes("--vacuum");

const db = new Database(file);
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

const removed = {
  sessions: db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now).changes,
  rate_limits: db.prepare("DELETE FROM rate_limits WHERE reset_at < ?").run(now).changes,
  audit_old: db.prepare("DELETE FROM audit_log WHERE created_at < ?").run(now - 180 * 86_400_000).changes,
  demo_links: db.prepare("DELETE FROM links WHERE tags = 'demo' AND expires_at IS NOT NULL AND expires_at < ?")
    .run(now - 3 * 86_400_000).changes,
  clicks: 0,
};
if (retentionDays > 0) {
  removed.clicks = db.prepare("DELETE FROM clicks WHERE ts < ?").run(now - retentionDays * 86_400_000).changes;
}

db.pragma("wal_checkpoint(TRUNCATE)");
if (vacuum) db.exec("VACUUM");
db.close();

console.log("Maintenance complete:");
for (const [key, value] of Object.entries(removed)) console.log(`  ${key}: ${value} removed`);
if (retentionDays === 0) console.log("  clicks: retained (set CLICK_RETENTION_DAYS to prune)");
if (vacuum) console.log("  database vacuumed");
