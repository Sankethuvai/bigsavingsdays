import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { endSession, startSession } from "@/lib/auth";
import { demoEnabled } from "@/lib/env";

export async function GET(request: Request) {
  if (!demoEnabled()) {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const db = getDb();
  const demo = db.prepare("SELECT id FROM users WHERE email IN ('user@bigsavingsdays.com', 'admin@bigsavingsdays.com') LIMIT 1").get() as { id: string } | undefined;
  if (!demo) return NextResponse.redirect(new URL("/login", request.url));
  await endSession();
  await startSession(demo.id);
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
