import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import Arena from "@/models/Arena";
import { requireAuth } from "@/lib/guard";
import { listedArenaQuery } from "@/lib/arenaListing";
import { ensureDefaultGround } from "@/lib/defaultGround";

/** Grounds players can book. ?arena=<id> shows one arena's grounds; arenas hidden from the website are left out. */
export async function GET(req: NextRequest) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();
  await ensureDefaultGround();
  const visible = await Arena.find(await listedArenaQuery()).select("name slug").lean();
  const filter: Record<string, unknown> = { status: { $ne: "disabled" }, arena: { $in: visible.map((a: any) => a._id) } };
  const arena = req.nextUrl.searchParams.get("arena");
  if (arena && mongoose.isValidObjectId(arena)) filter.arena = visible.some((a: any) => String(a._id) === arena) ? arena : { $in: [] };
  const grounds = await Ground.find(filter).sort({ name: 1 }).lean();
  const byId = new Map(visible.map((a: any) => [String(a._id), { _id: String(a._id), name: a.name, slug: a.slug }]));
  return NextResponse.json({
    grounds: grounds.map((g: any) => ({ ...g, arena: byId.get(String(g.arena)) || null })),
    arenas: Array.from(byId.values()),
  });
}
