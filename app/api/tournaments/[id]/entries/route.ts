import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import TournamentEntry from "@/models/TournamentEntry";
import { requireStaff } from "@/lib/guard";
import { tournamentGuard } from "@/lib/arenaScope";

/** Staff: every team entry for a tournament (contact details included). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  const denied = await tournamentGuard(guard.auth, params.id);
  if (denied) return denied;
  await connectDB();
  const entries = await TournamentEntry.find({ tournament: params.id }).sort({ createdAt: -1 });
  return NextResponse.json({ entries });
}
