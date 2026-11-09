import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";
import TournamentEntry, { ACTIVE_ENTRY_STATUSES } from "@/models/TournamentEntry";

const updateSchema = z.object({
  name: z.string().trim().min(2, "Tournament name must be at least 2 characters.").optional(),
  logoUrl: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  numberOfTeams: z.number().int("Number of teams must be a whole number.").min(2, "A tournament needs at least 2 teams.").optional(),
  entryFee: z.number().min(0).optional(),
  prizeMoney: z.number().min(0).optional(),
  format: z.enum(["Knockout", "League", "Round Robin"]).optional(),
  rules: z.string().optional(),
  status: z.enum(["Upcoming", "Registration Open", "Ongoing", "Completed"]).optional(),
  winner: z.string().optional(),
  coverImage: z.string().trim().max(300, "Cover image link is too long.").optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const tournament = await Tournament.findById(params.id)
    .populate("registeredTeams", "name logoUrl matchesPlayed matchesWon matchesLost")
    .populate("winner", "name");
  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  return NextResponse.json({ tournament });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid update." }, { status: 400 });
  }

  await connectDB();
  const current = await Tournament.findById(params.id);
  if (!current) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  const start = parsed.data.startDate ?? current.startDate;
  const end = parsed.data.endDate ?? current.endDate;
  if (end < start) return NextResponse.json({ error: "End date can't be before the start date." }, { status: 400 });
  if (parsed.data.numberOfTeams !== undefined) {
    const taken = (current.registeredTeams?.length || 0) + (await TournamentEntry.countDocuments({ tournament: params.id, status: { $in: ACTIVE_ENTRY_STATUSES } }));
    if (parsed.data.numberOfTeams < taken) {
      return NextResponse.json({ error: `${taken} teams are already entered, so the tournament can't be reduced to ${parsed.data.numberOfTeams} teams.` }, { status: 400 });
    }
  }
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.coverImage === "") {
    delete update.coverImage;
    update.$unset = { coverImage: "" };
  }
  const tournament = await Tournament.findByIdAndUpdate(params.id, update, { new: true }).populate(
    "registeredTeams",
    "name logoUrl"
  );
  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  return NextResponse.json({ tournament });
}
