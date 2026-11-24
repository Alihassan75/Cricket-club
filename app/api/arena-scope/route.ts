import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import { requireSuperAdminLive } from "@/lib/guard";
import { SCOPE_COOKIE } from "@/lib/arenaScope";

/** Backyard Manager: choose which arena the dashboard is showing (or "" for all arenas). */
export async function POST(req: NextRequest) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  const { arenaId } = await req.json().catch(() => ({}));
  const res = NextResponse.json({ ok: true });
  if (!arenaId) {
    res.cookies.set(SCOPE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
  if (!mongoose.isValidObjectId(arenaId)) return NextResponse.json({ error: "Arena not found." }, { status: 404 });
  await connectDB();
  if (!(await Arena.exists({ _id: arenaId }))) return NextResponse.json({ error: "Arena not found." }, { status: 404 });
  res.cookies.set(SCOPE_COOKIE, String(arenaId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
