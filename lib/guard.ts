import { NextResponse } from "next/server";
import { getAuthFromCookies, TokenPayload } from "@/lib/auth";
import { isRevoked } from "@/lib/revoked";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const STAFF_ROLES = ["super_admin", "arena_manager", "staff"];

/** Returns the authenticated user, or an unauthorized NextResponse to return early. */
export function requireAuth(): { auth: TokenPayload } | { error: NextResponse } {
  const auth = getAuthFromCookies();
  if (!auth) {
    return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  }
  if (isRevoked(auth.userId, (auth as any).iat)) {
    return { error: NextResponse.json({ error: "Your session ended because your account was changed. Please sign in again." }, { status: 401 }) };
  }
  return { auth };
}

/** Backyard Manager only (site-wide controls: managers, website settings). */
export function requireSuperAdmin(): { auth: TokenPayload } | { error: NextResponse } {
  const result = requireAuth();
  if ("error" in result) return result;
  if (result.auth.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Only the Backyard Manager can do this." }, { status: 403 }) };
  }
  return result;
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

/**
 * Backyard Manager only, checked against the database right now (not just the sign-in token),
 * so a manager who was demoted or switched off loses these powers immediately. Use with `await`.
 */
export async function requireSuperAdminLive(): Promise<{ auth: TokenPayload } | { error: NextResponse }> {
  const result = requireSuperAdmin();
  if ("error" in result) return result;
  await connectDB();
  const user = await User.findById(result.auth.userId).select("role isActive");
  if (!user || user.role !== "super_admin" || user.isActive === false) {
    return { error: NextResponse.json({ error: "Only the Backyard Manager can do this." }, { status: 403 }) };
  }
  return result;
}
