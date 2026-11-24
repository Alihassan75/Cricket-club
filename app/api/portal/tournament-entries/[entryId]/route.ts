import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import TournamentEntry, { ACTIVE_ENTRY_STATUSES } from "@/models/TournamentEntry";
import { requireAuth } from "@/lib/guard";
import { parseEntry, teamKey } from "@/lib/tournamentEntries";
import { notify } from "@/lib/notifications";

async function mine(entryId: string, userId: string) {
  if (!mongoose.isValidObjectId(entryId)) return null;
  const entry = await TournamentEntry.findById(entryId);
  return entry && String(entry.user) === String(userId) ? entry : null;
}

/** Change your own entry while it is waiting (or after a rejection — it goes back to waiting). */
export async function PATCH(req: NextRequest, { params }: { params: { entryId: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  const parsed = parseEntry(await req.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    await connectDB();
    const entry = await mine(params.entryId, guard.auth.userId);
    if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (entry.status === "approved") return NextResponse.json({ error: "This entry was approved. Please contact the club to change it." }, { status: 409 });

    const key = teamKey(parsed.data.teamName);
    const clash = await TournamentEntry.findOne({ tournament: entry.tournament, teamNameKey: key, status: { $in: ACTIVE_ENTRY_STATUSES } });
    if (clash && String(clash._id) !== String(entry._id)) {
      return NextResponse.json({ error: `A team called "${parsed.data.teamName}" is already entered. Please choose a different team name.` }, { status: 409 });
    }
    if (entry.status === "rejected") {
      const t = await Tournament.findById(entry.tournament);
      if (!t || t.status === "Completed" || t.status === "Ongoing") return NextResponse.json({ error: "Registration is closed for this tournament." }, { status: 409 });
      const taken = (t.registeredTeams?.length || 0) + (await TournamentEntry.countDocuments({ tournament: entry.tournament, status: { $in: ACTIVE_ENTRY_STATUSES } }));
      if (taken >= t.numberOfTeams) return NextResponse.json({ error: "This tournament is full." }, { status: 409 });
    }

    Object.assign(entry, parsed.data, { teamNameKey: key, status: "pending", adminNote: undefined });
    await entry.save();
    await notify("tournament_entry", "Team entry updated", `${parsed.data.teamName} updated its entry and is waiting for review.`);
    return NextResponse.json({ entry });
  } catch (e) {
    console.error("Entry update failed:", e);
    return NextResponse.json({ error: "Could not save your changes." }, { status: 500 });
  }
}

/** Withdraw your own entry (not allowed once approved). */
export async function DELETE(_req: NextRequest, { params }: { params: { entryId: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  await connectDB();
  const entry = await mine(params.entryId, guard.auth.userId);
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  if (entry.status === "approved") return NextResponse.json({ error: "This entry was approved. Please contact the club to withdraw it." }, { status: 409 });
  await TournamentEntry.deleteOne({ _id: entry._id });
  return NextResponse.json({ ok: true });
}
