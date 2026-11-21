import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const source = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "velo.db");
if (!fs.existsSync(source)) {
  console.error(`Database not found at ${source}.`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = path.resolve(
  process.argv[2] ?? path.join(process.cwd(), "backups", `velo-${stamp}.db`)
);
fs.mkdirSync(path.dirname(destination), { recursive: true });

const db = new Database(source, { readonly: true });
db.pragma("busy_timeout = 5000");

// better-sqlite3 performs an online backup that is consistent while the app keeps running.
await db.backup(destination);

const check = new Database(destination, { readonly: true });
const integrity = check.pragma("integrity_check", { simple: true });
const counts = {
  users: check.prepare("SELECT COUNT(*) AS n FROM users").get().n,
  links: check.prepare("SELECT COUNT(*) AS n FROM links").get().n,
  clicks: check.prepare("SELECT COUNT(*) AS n FROM clicks").get().n,
};
check.close();
db.close();

if (String(integrity).toLowerCase() !== "ok") {
  console.error(`Backup written to ${destination} but integrity_check returned: ${integrity}`);
  process.exit(1);
}

const size = fs.statSync(destination).size;
console.log(`Backup OK: ${destination}`);
console.log(`Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Rows: ${counts.users} users, ${counts.links} links, ${counts.clicks} clicks`);
