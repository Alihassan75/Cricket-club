import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import TournamentEntry from "@/models/TournamentEntry";
import { requireAuth } from "@/lib/guard";
import { attachEntryCounts } from "@/lib/tournamentEntries";

export async function GET() {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();
  const docs = await Tournament.find().populate("registeredTeams", "name").sort({ startDate: 1 });
  const tournaments = await attachEntryCounts(JSON.parse(JSON.stringify(docs)));
  const mine: any[] = JSON.parse(JSON.stringify(await TournamentEntry.find({ user: guard.auth.userId }).sort({ createdAt: -1 })));
  return NextResponse.json({
    tournaments: tournaments.map((t: any) => ({ ...t, myEntries: mine.filter((e) => String(e.tournament) === String(t._id)) })),
  });
}
