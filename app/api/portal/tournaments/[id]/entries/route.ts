import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import TournamentEntry, { ACTIVE_ENTRY_STATUSES } from "@/models/TournamentEntry";
import { requireAuth } from "@/lib/guard";
import { getOrCreatePortalCustomer } from "@/lib/portalCustomer";
import { parseEntry, teamKey } from "@/lib/tournamentEntries";
import { rateLimit } from "@/lib/rateLimit";
import { notify } from "@/lib/notifications";

const MAX_ENTRIES_PER_PERSON = 3;

/** A customer enters a team in a tournament: team name, captain, vice captain and players. Waits for the club to approve. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  const parsed = parseEntry(await req.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 }); // typos never count against the limit
  const rl = rateLimit(`entry:${guard.auth.userId}`, 10, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many entries — please wait a while and try again." }, { status: 429 });
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });

  try {
    await connectDB();
    const tournament = await Tournament.findById(params.id);
    if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
    if (tournament.status === "Completed" || tournament.status === "Ongoing") {
      return NextResponse.json({ error: "Registration is closed for this tournament." }, { status: 409 });
    }

    const taken = (tournament.registeredTeams?.length || 0) + (await TournamentEntry.countDocuments({ tournament: params.id, status: { $in: ACTIVE_ENTRY_STATUSES } }));
    if (taken >= tournament.numberOfTeams) return NextResponse.json({ error: "This tournament is full." }, { status: 409 });

    const key = teamKey(parsed.data.teamName);
    if (await TournamentEntry.findOne({ tournament: params.id, teamNameKey: key, status: { $in: ACTIVE_ENTRY_STATUSES } })) {
      return NextResponse.json({ error: `A team called "${parsed.data.teamName}" is already entered. Please choose a different team name.` }, { status: 409 });
    }
    const mineCount = await TournamentEntry.countDocuments({ tournament: params.id, user: guard.auth.userId, status: { $in: ACTIVE_ENTRY_STATUSES } });
    if (mineCount >= MAX_ENTRIES_PER_PERSON) {
      return NextResponse.json({ error: `You already have ${MAX_ENTRIES_PER_PERSON} teams entered in this tournament.` }, { status: 409 });
    }

    const customer = await getOrCreatePortalCustomer(guard.auth.userId);
    const entry = await TournamentEntry.create({
      ...parsed.data,
      tournament: params.id,
      customer: customer._id,
      user: guard.auth.userId,
      teamNameKey: key,
      status: "pending",
    });
    await notify("tournament_entry", "New team entry", `${parsed.data.teamName} entered ${tournament.name} (captain ${parsed.data.captainName}, ${parsed.data.captainPhone}).`);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e: any) {
    console.error("Tournament entry failed:", e);
    return NextResponse.json({ error: "Could not save your entry. Please try again." }, { status: 500 });
  }
}
