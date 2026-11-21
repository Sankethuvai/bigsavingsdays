import "server-only";
import { NextResponse } from "next/server";
import { appUrl, isProduction } from "./env";

export const MAX_JSON_BYTES = 32 * 1024;

type JsonFailure = { ok: false; response: NextResponse };
type JsonSuccess<T> = { ok: true; data: T };

/** Strict JSON reader with an explicit body limit and content-type check. */
export async function readJson<T = Record<string, unknown>>(
  request: Request,
  maxBytes = MAX_JSON_BYTES
): Promise<JsonSuccess<T> | JsonFailure> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 }),
    };
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body too large" }, { status: 413 }),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Could not read request body" }, { status: 400 }) };
  }
  if (text.length > maxBytes) {
    return { ok: false, response: NextResponse.json({ error: "Request body too large" }, { status: 413 }) };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
}

/**
 * Browser CSRF defence for cookie-authenticated API routes. Bearer-token clients usually
 * send no Origin header and are unaffected. SameSite=Lax is the first line of defence.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const hostHeader = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

    // 1. Same-site / same-host check against request's own Host header
    if (hostHeader) {
      const normalizedHost = hostHeader.split(",")[0].trim().toLowerCase();
      if (originUrl.host.toLowerCase() === normalizedHost) {
        return true;
      }
    }

    // 2. Modern browser Sec-Fetch-Site header
    const secFetchSite = request.headers.get("sec-fetch-site");
    if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
      return true;
    }

    // 3. Localhost and loopback
    if (
      originUrl.hostname === "localhost" ||
      originUrl.hostname === "127.0.0.1" ||
      originUrl.hostname.endsWith(".localhost")
    ) {
      return true;
    }

    // 4. Any Vercel deployment preview or production host (*.vercel.app)
    if (originUrl.hostname.endsWith(".vercel.app")) {
      return true;
    }

    // 5. Configured brand domain and subdomains (*.bigsavingsdays.com)
    if (
      originUrl.hostname === "bigsavingsdays.com" ||
      originUrl.hostname.endsWith(".bigsavingsdays.com")
    ) {
      return true;
    }

    // 6. Match against configured appUrl
    const app = appUrl();
    if (app) {
      const allowed = new URL(app);
      if (originUrl.origin === allowed.origin || originUrl.hostname === allowed.hostname) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function forbiddenOrigin(): NextResponse {
  return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
}
