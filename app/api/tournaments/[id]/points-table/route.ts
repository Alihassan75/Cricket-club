import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireStaff } from "@/lib/guard";
import { tournamentGuard } from "@/lib/arenaScope";
import { computePointsTable } from "@/lib/matchStats";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const denied = await tournamentGuard(guard.auth, params.id);
  if (denied) return denied;
  await connectDB();
  const table = await computePointsTable(params.id);
  return NextResponse.json({ table });
}
