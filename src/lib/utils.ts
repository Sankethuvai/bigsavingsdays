export const RESERVED_SLUGS = new Set([
  "api", "admin", "dashboard", "login", "signup", "logout", "pricing", "docs",
  "terms", "privacy", "about", "blog", "help", "support", "status", "p", "r",
  "s", "qr", "demo", "changelog", "contact", "assets", "static", "public", "favicon.ico", "robots.txt",
  "sitemap.xml", "manifest.webmanifest", "opengraph-image", "icon", "apple-icon",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-_]{1,47}$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function normalizeUrl(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function displayUrl(url: string, max = 46): string {
  const clean = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function shortHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(ms);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function countryName(code: string): string {
  if (!code || code.length !== 2) return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const s = ua || "";
  let device = "desktop";
  if (/iPad|Tablet/i.test(s)) device = "tablet";
  else if (/Mobi|iPhone|Android.*Mobile/i.test(s)) device = "mobile";

  let browser = "Other";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\//.test(s)) browser = "Opera";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung Internet";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s)) browser = "Safari";

  let os = "Other";
  if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Windows/.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(s)) os = "macOS";
  else if (/Linux/.test(s)) os = "Linux";

  return { device, browser, os };
}

export function referrerHost(referrer: string | null): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("localhost")) return "Direct";
    return host;
  } catch {
    return "Direct";
  }
}

export function planLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
