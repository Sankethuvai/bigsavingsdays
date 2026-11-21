import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function dbPath() {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "velo.db");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function usage() {
  console.error(`Usage:
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run admin:create [-- Name]

Creates an admin account or promotes an existing account and resets its password.
The password must be at least 12 characters. Prefer the environment variables so the
password does not end up in your shell history.`);
}

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const nameArg = process.argv.indexOf("--");
const name = nameArg >= 0 ? process.argv.slice(nameArg + 1).join(" ").trim() : "Administrator";

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("ADMIN_EMAIL must be a valid email address.");
  usage();
  process.exit(1);
}
if (password.length < 12 || password.length > 200) {
  console.error("ADMIN_PASSWORD must be 12–200 characters.");
  usage();
  process.exit(1);
}

const file = dbPath();
if (!fs.existsSync(file)) {
  console.error(`Database not found at ${file}. Start the app once so it can create the schema.`);
  process.exit(1);
}

const db = new Database(file);
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
if (existing) {
  db.prepare("UPDATE users SET role = 'admin', password_hash = ?, name = COALESCE(NULLIF(?, ''), name) WHERE email = ?")
    .run(hashPassword(password), name, email);
  console.log(`Promoted existing account ${email} to admin and reset its password.`);
} else {
  const id = crypto.randomBytes(16).toString("hex");
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, plan, avatar_color, created_at) VALUES (?, ?, ?, ?, 'admin', 'business', '#B6F24A', ?)"
  ).run(id, email, name || "Administrator", hashPassword(password), Date.now());
  console.log(`Created admin account ${email}.`);
}
db.close();
