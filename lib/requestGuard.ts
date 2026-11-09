import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { verifyCaptcha } from "@/lib/captcha";

/**
 * Cheap checks that run BEFORE the database is touched:
 *  1. rate limit per IP  2. (optionally) the captcha must be solved.
 * Returns a ready-made error response, or null when the request may continue.
 */
export function protect(
  req: NextRequest,
  body: any,
  opts: { scope: string; limit: number; windowMs: number; captcha?: boolean }
): NextResponse | null {
  const rl = rateLimit(`${opts.scope}:${clientIp(req)}`, opts.limit, opts.windowMs);
  if (!rl.ok) {
    const mins = Math.ceil(rl.retryAfterSec / 60);
    return NextResponse.json(
      { error: `Too many attempts. Please wait ${mins > 1 ? `${mins} minutes` : "a minute"} and try again.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  if (opts.captcha && !verifyCaptcha(body?.captchaToken, body?.captchaAnswer)) {
    return NextResponse.json({ error: "The captcha was wrong or expired — please try the new one.", captchaFailed: true }, { status: 400 });
  }
  return null;
}
