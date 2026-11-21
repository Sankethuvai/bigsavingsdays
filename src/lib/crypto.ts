import crypto from "node:crypto";
import { ipSalt, sessionSecret } from "./env";

/** scrypt password hashing: salt:hash (hex) */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  let candidate: Buffer;
  let expected: Buffer;
  try {
    candidate = crypto.scryptSync(password, salt, 64);
    expected = Buffer.from(hash, "hex");
  } catch {
    return false;
  }
  if (expected.length !== 64 || candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

/**
 * A real hash used when an account does not exist, so failed logins take the same time
 * whether or not the email is registered.
 */
let timingHash: string | null = null;
export function dummyPasswordHash(): string {
  timingHash ??= hashPassword("bsd-timing-equalizer-not-a-real-password");
  return timingHash;
}

export function randomId(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function randomSlug(length = 7): string {
  // Human-friendly, unambiguous alphabet.
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Salted, one-way visitor fingerprint. The salt is never stored with the hash. */
export function hashIp(ip: string): string {
  return sha256(`ip|${ipSalt()}|${ip}`);
}

function signUnlockPayload(slug: string, passwordHash: string, expiresAt: number): string {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(`unlock|${slug}|${passwordHash}|${expiresAt}`)
    .digest("base64url");
}

/** Password-unlock cookie value: `<expiresAt>.<hmac>`. Bound to the current password hash. */
export function issueUnlockToken(slug: string, passwordHash: string, ttlMs = 30 * 60_000): string {
  const expiresAt = Date.now() + ttlMs;
  return `${expiresAt}.${signUnlockPayload(slug, passwordHash, expiresAt)}`;
}

export function verifyUnlockToken(
  token: string | undefined,
  slug: string,
  passwordHash: string
): boolean {
  if (!token) return false;
  const [expiresRaw, signature] = token.split(".");
  if (!expiresRaw || !signature) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;

  const expected = Buffer.from(signUnlockPayload(slug, passwordHash, expiresAt));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}
