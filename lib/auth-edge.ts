import { jwtVerify } from "jose";

/**
 * IMPORTANT: this file exists purely because Next.js middleware runs in the
 * Edge Runtime, not Node.js. `jsonwebtoken` (used everywhere else in this
 * app — lib/auth.ts, every API route, every server component) depends on
 * Node's `crypto` module, which isn't reliably available in the Edge
 * Runtime. When middleware imported `verifyToken` from lib/auth.ts, jwt.verify()
 * silently threw inside its own try/catch and always returned null — so
 * every request looked unauthenticated even with a perfectly valid cookie,
 * even though the exact same token verified fine everywhere else in the app
 * (Route Handlers and Server Components run in the Node.js runtime).
 *
 * `jose` works in both runtimes, so middleware uses it — and ONLY
 * middleware. Signing still happens via jsonwebtoken in lib/auth.ts; jose
 * can verify those same HS256 tokens without any format changes.
 *
 * The cookie name is duplicated here (rather than imported from lib/auth.ts)
 * so that importing this file into middleware never pulls jsonwebtoken (or
 * anything else Node-only) into the Edge bundle. If you ever rename the
 * cookie in lib/auth.ts, update AUTH_COOKIE_NAME here too.
 */
export const AUTH_COOKIE_NAME = "arena_token";

export interface EdgeTokenPayload {
  userId: string;
  role: string;
  email: string;
}

const encoder = new TextEncoder();

export async function verifyTokenEdge(token: string): Promise<EdgeTokenPayload | null> {
  try {
    const secret = encoder.encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as EdgeTokenPayload;
  } catch {
    return null;
  }
}
