import { NextRequest, NextResponse } from "next/server";
import { verifyTokenEdge, AUTH_COOKIE_NAME } from "@/lib/auth-edge";
import { BACKYARD_ONLY_PATHS, BACKYARD_ONLY_API } from "@/lib/roles";

const STAFF_PREFIXES = ["/dashboard"];
const PORTAL_PREFIXES = ["/portal"];
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-otp"];

function homeFor(role: string) {
  return role === "customer" ? "/portal" : "/dashboard";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? await verifyTokenEdge(token) : null;

  // Parts of the system that belong to the Backyard Manager only (not split per arena).
  if (BACKYARD_ONLY_API.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (!payload) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (payload.role !== "super_admin") return NextResponse.json({ error: "Only the Backyard Manager can do this." }, { status: 403 });
    return NextResponse.next();
  }

  const isStaffArea = STAFF_PREFIXES.some((p) => pathname.startsWith(p));
  const isPortalArea = PORTAL_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if ((isStaffArea || isPortalArea) && !payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = isPortalArea ? `?next=${encodeURIComponent(pathname + req.nextUrl.search)}` : "";
    return NextResponse.redirect(url);
  }

  // Customers never see the staff dashboard; staff/admin have no need for the
  // customer portal, but aren't blocked from it (they might book for themselves).
  if (isStaffArea && payload?.role === "customer") {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  // Managers, website settings and the like belong to the Backyard Manager only.
  if (payload && payload.role !== "super_admin" && BACKYARD_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Calendar and grounds/slots belong to each arena's manager, not the Backyard Manager.
  if (payload?.role === "super_admin" && ["/dashboard/calendar", "/dashboard/grounds", "/dashboard/customers", "/dashboard/teams", "/dashboard/matches"].some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/bookings";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && payload && pathname !== "/reset-password") {
    const url = req.nextUrl.clone();
    url.pathname = homeFor(payload.role);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/memberships/:path*",
    "/api/staff/:path*",
    "/api/equipment/:path*",
    "/api/maintenance/:path*",
    "/api/expenses/:path*",
    "/api/reports/:path*",
    "/api/coupons/:path*",
    "/api/search/:path*",
    "/dashboard/:path*",
    "/portal/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-otp",
  ],
};
