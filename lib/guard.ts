import { NextResponse } from "next/server";
import { getAuthFromCookies, TokenPayload } from "@/lib/auth";

const STAFF_ROLES = ["super_admin", "arena_manager", "staff"];

/** Returns the authenticated user, or an unauthorized NextResponse to return early. */
export function requireAuth(): { auth: TokenPayload } | { error: NextResponse } {
  const auth = getAuthFromCookies();
  if (!auth) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  return { auth };
}

/** Same as requireAuth, but also rejects customer accounts (ground/booking management is staff-only). */
export function requireStaff(): { auth: TokenPayload } | { error: NextResponse } {
  const result = requireAuth();
  if ("error" in result) return result;
  if (!STAFF_ROLES.includes(result.auth.role)) {
    return { error: NextResponse.json({ error: `Not authorized: your account role is "${result.auth.role}". This needs super_admin, arena_manager or staff — fix the role in the database, then log out and log in again.` }, { status: 403 }) };
  }
  return result;
}
