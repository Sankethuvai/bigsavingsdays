import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getClientIp } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = await getClientIp();
  const limit = rateLimit(`qr:ip:${sha256(ip)}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many QR requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").slice(0, 900);
  const sizeRaw = Number(searchParams.get("size") ?? 480);
  const size = Number.isFinite(sizeRaw) ? Math.min(Math.max(Math.round(sizeRaw), 120), 1200) : 480;

  if (!text) {
    return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
  }

  try {
    const png = await QRCode.toBuffer(text, {
      type: "png",
      width: size,
      margin: 1,
      color: { dark: "#0d1220", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=86400",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not generate QR code" }, { status: 400 });
  }
}
