import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Match from "@/models/Match";
import { requireStaff } from "@/lib/guard";
import { notify } from "@/lib/notifications";
import { zodMessage } from "@/lib/validation";
import mongoose from "mongoose";
import Team from "@/models/Team";
import Ground from "@/models/Ground";

const createSchema = z.object({
  teamA: z.string({ required_error: "Please choose Team A." }).min(1, "Please choose Team A."),
  teamB: z.string({ required_error: "Please choose Team B." }).min(1, "Please choose Team B."),
  ground: z.string({ required_error: "Please choose a ground." }).min(1, "Please choose a ground."),
  tournament: z.string().optional(),
  date: z.string({ required_error: "Please choose the match date." }).min(1, "Please choose the match date."),
  startTime: z.string({ required_error: "Please choose the start time." }).min(1, "Please choose the start time."),
  overs: z.number({ invalid_type_error: "Overs must be a number." }).int("Overs must be a whole number.").positive("Overs must be at least 1."),
  matchType: z.enum(["Friendly", "League", "Tournament", "Practice"]).default("Friendly"),
  umpire: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("status")) filter.status = sp.get("status");
  if (sp.get("tournamentId")) filter.tournament = sp.get("tournamentId");
  if (sp.get("teamId")) filter.$or = [{ teamA: sp.get("teamId") }, { teamB: sp.get("teamId") }];
  if (sp.get("date")) filter.date = sp.get("date");

  const matches = await Match.find(filter)
    .populate("teamA", "name logoUrl")
    .populate("teamB", "name logoUrl")
    .populate("ground", "name groundNumber")
    .populate("winner", "name")
    .sort({ date: -1, startTime: -1 });

  return NextResponse.json({ matches });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid match data." }, { status: 400 });
  }
  const data = { ...parsed.data, tournament: parsed.data.tournament || undefined, umpire: parsed.data.umpire?.trim() || undefined };
  if (data.teamA === data.teamB) {
    return NextResponse.json({ error: "A team can't play itself." }, { status: 400 });
  }
  for (const [label, id] of [["Team A", data.teamA], ["Team B", data.teamB], ["The ground", data.ground]] as const) {
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: `${label} isn't valid — please choose it from the list.` }, { status: 400 });
  }
  if (data.tournament && !mongoose.isValidObjectId(data.tournament)) {
    return NextResponse.json({ error: "That tournament isn't valid." }, { status: 400 });
  }

  try {
    await connectDB();
    const [a, b, g] = await Promise.all([Team.findById(data.teamA), Team.findById(data.teamB), Ground.findById(data.ground)]);
    if (!a) return NextResponse.json({ error: "Team A no longer exists." }, { status: 404 });
    if (!b) return NextResponse.json({ error: "Team B no longer exists." }, { status: 404 });
    if (!g) return NextResponse.json({ error: "That ground no longer exists." }, { status: 404 });

    const match = await Match.create(data);
    if (data.tournament) {
      await notify("tournament_match", "Tournament match scheduled", `A new tournament match has been scheduled on ${data.date} at ${data.startTime}.`);
    }
    return NextResponse.json({ match }, { status: 201 });
  } catch (e: any) {
    console.error("Match create failed:", e);
    return NextResponse.json({ error: `Could not schedule the match: ${e?.message || "database error"}` }, { status: 500 });
  }
}
