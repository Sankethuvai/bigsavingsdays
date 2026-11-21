import test from "node:test";
import assert from "node:assert/strict";

import {
  hashPassword,
  verifyPassword,
  issueUnlockToken,
  verifyUnlockToken,
  randomSlug,
  sha256,
} from "../src/lib/crypto.ts";
import { normalizeUrl, slugify, isValidSlug, formatNumber, parseUserAgent } from "../src/lib/utils.ts";
import { csvCell, toCsv } from "../src/lib/csv.ts";

test("password hashing round-trips and rejects wrong passwords", () => {
  const stored = hashPassword("correct horse battery staple");
  assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(verifyPassword("correct horse battery staple", stored), true);
  assert.equal(verifyPassword("wrong password", stored), false);
  assert.equal(verifyPassword("anything", "not-a-hash"), false);
});

test("password hashes are salted per call", () => {
  assert.notEqual(hashPassword("same"), hashPassword("same"));
});

test("unlock tokens are signed, expiring and bound to the password hash", () => {
  const slug = "spring-sale";
  const hash = hashPassword("open-sesame");
  const token = issueUnlockToken(slug, hash, 60_000);

  assert.equal(verifyUnlockToken(token, slug, hash), true);
  assert.equal(verifyUnlockToken(token, "other-slug", hash), false);
  assert.equal(verifyUnlockToken(token, slug, hashPassword("changed")), false);
  assert.equal(verifyUnlockToken("1.deadbeef", slug, hash), false);
  assert.equal(verifyUnlockToken(undefined, slug, hash), false);

  // A token cannot simply be extended by editing the timestamp without the secret.
  const [expires, signature] = token.split(".");
  assert.equal(verifyUnlockToken(`${Number(expires) + 60_000}.${signature}`, slug, hash), false);

  const expired = issueUnlockToken(slug, hash, -1);
  assert.equal(verifyUnlockToken(expired, slug, hash), false);
});

test("random slugs use the unambiguous alphabet and requested length", () => {
  const slug = randomSlug(9);
  assert.equal(slug.length, 9);
  assert.match(slug, /^[23456789abcdefghjkmnpqrstuvwxyz]+$/);
  assert.notEqual(randomSlug(9), randomSlug(9));
});

test("sha256 is stable", () => {
  assert.equal(sha256("velo"), sha256("velo"));
  assert.equal(sha256("velo").length, 64);
});

test("normalizeUrl accepts only http(s) destinations", () => {
  assert.equal(normalizeUrl("https://example.com/a?b=1"), "https://example.com/a?b=1");
  assert.equal(normalizeUrl("example.com"), "https://example.com/");
  assert.equal(normalizeUrl("  http://localhost:3000/x  "), "http://localhost:3000/x");
  assert.equal(normalizeUrl("javascript:alert(1)"), null);
  assert.equal(normalizeUrl("ftp://example.com/file"), null);
  assert.equal(normalizeUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(normalizeUrl(""), null);
  assert.equal(normalizeUrl("not a url"), null);
});

test("slug rules reject reserved and malformed values", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
  assert.equal(slugify("  --Already--Slugged--  "), "already--slugged");
  assert.equal(isValidSlug("abc"), true);
  assert.equal(isValidSlug("a_b-c9"), true);
  assert.equal(isValidSlug("a"), false);
  assert.equal(isValidSlug("-leading"), false);
  assert.equal(isValidSlug("has space"), false);
  assert.equal(isValidSlug("admin"), false);
  assert.equal(isValidSlug("api"), false);
  assert.equal(isValidSlug("demo"), false);
});

test("number formatting is compact", () => {
  assert.equal(formatNumber(999), "999");
  assert.equal(formatNumber(1_500), "1.5K");
  assert.equal(formatNumber(2_000_000), "2M");
});

test("user agent parsing identifies common devices", () => {
  assert.equal(parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile/15E148 Safari/604.1").device, "mobile");
  assert.equal(parseUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131.0").browser, "Chrome");
  assert.equal(parseUserAgent("Mozilla/5.0 (Linux; Android 15) SamsungBrowser/27.0").os, "Android");
});

test("CSV cells neutralise spreadsheet formulas", () => {
  assert.equal(csvCell("=1+1"), "'=1+1");
  assert.equal(csvCell("+SUM(A1)"), "'+SUM(A1)");
  assert.equal(csvCell("-2"), "'-2");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell(42), "42");
});

test("CSV quoting handles commas, quotes and newlines", () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
  assert.equal(csvCell(null), "");
});

test("toCsv keeps header order and escapes every row", () => {
  const csv = toCsv([
    { slug: "a", title: "=danger", clicks: 2 },
    { slug: "b,c", title: 'quote " here', clicks: 3 },
  ]);
  const lines = csv.split("\n");
  assert.equal(lines[0], "slug,title,clicks");
  assert.equal(lines[1], "a,'=danger,2");
  assert.equal(lines[2], '"b,c","quote "" here",3');
});

test("toCsv returns empty output for no rows", () => {
  assert.equal(toCsv([]), "");
});

test("linkShortUrl defaults to bigsavingsdays.com for vercel preview hosts", async () => {
  const { linkShortUrl } = await import("../src/lib/domains.ts");
  assert.equal(linkShortUrl("https://bigsavingsdays-preview.vercel.app", "spring-sale"), "https://bigsavingsdays.com/spring-sale");
  assert.equal(linkShortUrl("https://bigsavingsdays.com", "summer-deal"), "https://bigsavingsdays.com/summer-deal");
  assert.equal(linkShortUrl("https://bigsavingsdays.com", "exclusive", "go.deals.com"), "https://go.deals.com/exclusive");
});

test("sameOrigin permits matching host, vercel previews, and bigsavingsdays domains", async () => {
  const { sameOrigin } = await import("../src/lib/http.ts");

  // Vercel deployment preview origin matching its Host header
  const req1 = new Request("https://bigsavingsdays-abc.vercel.app/api/links", {
    headers: {
      origin: "https://bigsavingsdays-abc.vercel.app",
      host: "bigsavingsdays-abc.vercel.app",
    },
  });
  assert.equal(sameOrigin(req1), true);

  // Custom domain with www matching Host
  const req2 = new Request("https://www.bigsavingsdays.com/api/links", {
    headers: {
      origin: "https://www.bigsavingsdays.com",
      host: "www.bigsavingsdays.com",
    },
  });
  assert.equal(sameOrigin(req2), true);

  // Modern browser sec-fetch-site same-origin
  const req3 = new Request("https://any-domain.com/api/links", {
    headers: {
      origin: "https://any-domain.com",
      "sec-fetch-site": "same-origin",
    },
  });
  assert.equal(sameOrigin(req3), true);

  // Block attacker cross-site request
  const req4 = new Request("https://bigsavingsdays.com/api/links", {
    headers: {
      origin: "https://malicious-site.xyz",
      host: "bigsavingsdays.com",
      "sec-fetch-site": "cross-site",
    },
  });
  assert.equal(sameOrigin(req4), false);
});
