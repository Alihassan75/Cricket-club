import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import { requireStaff } from "@/lib/guard";
import { getScope } from "@/lib/arenaScope";
import { ensureDefaultArena } from "@/lib/arenas";

/** The arena the signed-in person works inside (an arena manager's own arena, or the one the Backyard Manager picked). */
export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;
  await connectDB();
  await ensureDefaultArena();
  const scope = await getScope(guard.auth);
  if (!scope.arenaId) {
    return NextResponse.json({ arena: null, reason: scope.none ? "unlinked" : "all" });
  }
  const arena = await Arena.findById(scope.arenaId);
  return NextResponse.json({ arena, reason: arena ? undefined : "missing" });
}
