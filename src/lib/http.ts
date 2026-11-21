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
    const allowed = new URL(appUrl()).origin;
    if (origin === allowed) return true;
    // Local development and Vercel preview deployments
    if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    if (/\.vercel\.app$/.test(new URL(origin).hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

export function forbiddenOrigin(): NextResponse {
  return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
}
