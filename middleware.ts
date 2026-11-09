import { NextRequest, NextResponse } from "next/server";
import { verifyTokenEdge, AUTH_COOKIE_NAME } from "@/lib/auth-edge";

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

  const isStaffArea = STAFF_PREFIXES.some((p) => pathname.startsWith(p));
  const isPortalArea = PORTAL_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if ((isStaffArea || isPortalArea) && !payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Customers never see the staff dashboard; staff/admin have no need for the
  // customer portal, but aren't blocked from it (they might book for themselves).
  if (isStaffArea && payload?.role === "customer") {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
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
    "/dashboard/:path*",
    "/portal/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-otp",
  ],
};
