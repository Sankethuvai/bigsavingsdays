import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const sourceArg = process.argv[2];
const force = process.argv.includes("--force");
if (!sourceArg) {
  console.error("Usage: npm run db:restore -- backups/velo-YYYY-MM-DD.db [--force]");
  process.exit(1);
}

const source = path.resolve(sourceArg);
const target = path.resolve(process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "velo.db"));

if (!fs.existsSync(source)) {
  console.error(`Backup not found at ${source}`);
  process.exit(1);
}
if (fs.existsSync(target) && !force) {
  console.error(`Refusing to overwrite ${target}. Re-run with --force after stopping the app.`);
  process.exit(1);
}

const check = new Database(source, { readonly: true });
const integrity = check.pragma("integrity_check", { simple: true });
const tables = check.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('users','links','clicks')").get().n;
const counts = tables === 3
  ? {
      users: check.prepare("SELECT COUNT(*) AS n FROM users").get().n,
      links: check.prepare("SELECT COUNT(*) AS n FROM links").get().n,
      clicks: check.prepare("SELECT COUNT(*) AS n FROM clicks").get().n,
    }
  : null;
check.close();

if (String(integrity).toLowerCase() !== "ok" || !counts) {
  console.error("Backup failed validation; refusing to restore.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
for (const suffix of ["-wal", "-shm"]) fs.rmSync(`${target}${suffix}`, { force: true });
fs.copyFileSync(source, target);

console.log(`Restored ${source} -> ${target}`);
console.log(`Rows: ${counts.users} users, ${counts.links} links, ${counts.clicks} clicks`);
console.log("Start the app again when you are ready.");
