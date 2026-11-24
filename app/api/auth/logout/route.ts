import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { cookies } from "next/headers";
import { SCOPE_COOKIE } from "@/lib/arenaScope";

export async function POST() {
  clearAuthCookie();
  cookies().set(SCOPE_COOKIE, "", { path: "/", maxAge: 0 }); // forget the Backyard Manager's arena picker
  return NextResponse.json({ message: "Logged out." });
}
