import { NextRequest, NextResponse } from "next/server";
import { createCaptcha } from "@/lib/captcha";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`captcha:${clientIp(req)}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  return NextResponse.json(createCaptcha(), { headers: { "Cache-Control": "no-store" } });
}
