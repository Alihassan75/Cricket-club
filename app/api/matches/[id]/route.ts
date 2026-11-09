import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Match from "@/models/Match";
import { requireStaff } from "@/lib/guard";
import { applyMatchResult } from "@/lib/matchStats";
import { zodMessage } from "@/lib/validation";

const scoreSchema = z.object({
  runs: z.number().int().min(0).optional(),
  wickets: z.number().int().min(0).max(10).optional(),
  overs: z.number().int().min(0).optional(),
  balls: z.number().int().min(0).max(5).optional(),
  extras: z.number().int().min(0).optional(),
});

const updateSchema = z.object({
  status: z.enum(["Scheduled", "Live", "Completed", "Cancelled"]).optional(),
  umpire: z.string().optional(),
  battingFirst: z.enum(["teamA", "teamB"]).optional(),
  scoreA: scoreSchema.optional(),
  scoreB: scoreSchema.optional(),
  winner: z.string().optional(), // "teamA" | "teamB" | "tie" | a team ObjectId
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const match = await Match.findById(params.id)
    .populate("teamA", "name logoUrl")
    .populate("teamB", "name logoUrl")
    .populate("ground", "name groundNumber")
    .populate("winner", "name");
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
  return NextResponse.json({ match });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid update." }, { status: 400 });
  }

  await connectDB();
  const match = await Match.findById(params.id);
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });

  const wasCompleted = match.status === "Completed";
  const { status, umpire, battingFirst, scoreA, scoreB, winner } = parsed.data;

  if (status) match.status = status;
  if (umpire !== undefined) match.umpire = umpire;
  if (battingFirst) match.battingFirst = battingFirst;
  if (scoreA) match.scoreA = { ...match.scoreA.toObject(), ...scoreA };
  if (scoreB) match.scoreB = { ...match.scoreB.toObject(), ...scoreB };

  // Resolve "teamA"/"teamB"/"tie" shorthand to an actual team id (or clear it for a tie).
  let winnerId: string | undefined;
  if (winner === "teamA") winnerId = match.teamA.toString();
  else if (winner === "teamB") winnerId = match.teamB.toString();
  else if (winner === "tie") winnerId = undefined;
  else if (winner) winnerId = winner;

  const justCompleted = match.status === "Completed" && !wasCompleted;

  if (justCompleted) {
    // Auto-determine the winner from the scoreboard if the caller didn't say.
    if (winnerId === undefined && winner !== "tie") {
      if (match.scoreA.runs > match.scoreB.runs) winnerId = match.teamA.toString();
      else if (match.scoreB.runs > match.scoreA.runs) winnerId = match.teamB.toString();
    }
    match.winner = winnerId as any;
    await applyMatchResult(match.teamA.toString(), match.teamB.toString(), winnerId);
  } else if (winner !== undefined) {
    match.winner = winnerId as any;
  }

  await match.save();

  return NextResponse.json({ match });
}
