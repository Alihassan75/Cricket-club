import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Ground from "@/models/Ground";
import { requireStaff } from "@/lib/guard";
import { INDOOR_GROUND, INDOOR_NAME } from "@/lib/defaultGround";
import { getScope, arenaForCreate } from "@/lib/arenaScope";

/** One click from Dashboard → Grounds: Indoor Cricket becomes this arena's only active ground, with 4 fixed slots. Nothing is deleted. */
export async function POST() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  try {
    await connectDB();
    const target = arenaForCreate(await getScope(guard.auth));
    if ("error" in target) return target.error;
    // only THIS arena's grounds are touched — other arenas are never affected
    const hidden = await Ground.updateMany({ arena: target.arenaId, name: { $ne: INDOOR_NAME } }, { status: "disabled" });
    await Ground.findOneAndUpdate({ arena: target.arenaId, name: INDOOR_NAME }, { ...INDOOR_GROUND, arena: target.arenaId }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return NextResponse.json({ ok: true, hidden: hidden.modifiedCount });
  } catch (e: any) {
    console.error("setup-indoor failed:", e);
    return NextResponse.json({ error: `Database error: ${e?.message || "unknown error"}` }, { status: 500 });
  }
}
