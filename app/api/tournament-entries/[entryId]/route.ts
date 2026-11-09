import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import TournamentEntry, { ACTIVE_ENTRY_STATUSES } from "@/models/TournamentEntry";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";
import { notify } from "@/lib/notifications";

const schema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  adminNote: z.string().trim().max(200, "Note must be at most 200 characters.").optional(),
  feePaid: z.boolean().optional(),
});

/** Staff reviews an entry: approve / reject (with an optional note for the team) and tick "entry fee received". */
export async function PATCH(req: NextRequest, { params }: { params: { entryId: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  if (!mongoose.isValidObjectId(params.entryId)) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  try {
    await connectDB();
    const entry = await TournamentEntry.findById(params.entryId);
    if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    const before = entry.status;
    const { status, adminNote, feePaid } = parsed.data;

    if (status && status !== "rejected" && before === "rejected") {
      const t = await Tournament.findById(entry.tournament);
      if (t) {
        const taken = (t.registeredTeams?.length || 0) + (await TournamentEntry.countDocuments({ tournament: entry.tournament, status: { $in: ACTIVE_ENTRY_STATUSES } }));
        if (taken >= t.numberOfTeams) return NextResponse.json({ error: "The tournament is already full, so this entry can't be restored." }, { status: 409 });
      }
    }
    if (status) entry.status = status;
    if (adminNote !== undefined) entry.adminNote = adminNote || undefined;
    if (feePaid !== undefined) entry.feePaid = feePaid;
    await entry.save();

    if (status && status !== before && status !== "pending" && entry.user) {
      const t = await Tournament.findById(entry.tournament).select("name");
      await notify(
        "tournament_entry",
        status === "approved" ? "Team entry approved" : "Team entry not accepted",
        status === "approved"
          ? `${entry.teamName} is in! Your entry for ${t?.name || "the tournament"} was approved.`
          : `${entry.teamName}: your entry for ${t?.name || "the tournament"} wasn't accepted.${entry.adminNote ? " " + entry.adminNote : ""}`,
        String(entry.user)
      );
    }
    return NextResponse.json({ entry });
  } catch (e: any) {
    console.error("Entry review failed:", e);
    return NextResponse.json({ error: `Database error: ${e?.message || "unknown"}` }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { entryId: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;
  if (!mongoose.isValidObjectId(params.entryId)) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  await connectDB();
  await TournamentEntry.deleteOne({ _id: params.entryId });
  return NextResponse.json({ ok: true });
}
