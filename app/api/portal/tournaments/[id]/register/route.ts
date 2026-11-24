import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import { requireAuth } from "@/lib/guard";
import type { Types } from "mongoose";

const schema = z.object({ teamId: z.string() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Select a team." }, { status: 400 });

  await connectDB();
  const tournament = await Tournament.findById(params.id);
  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });

  if (tournament.status === "Completed" || tournament.status === "Ongoing") {
    return NextResponse.json({ error: "Registration is closed for this tournament." }, { status: 409 });
  }
  if (tournament.registeredTeams.some((t: Types.ObjectId) => t.toString() === parsed.data.teamId)) {
    return NextResponse.json({ error: "This team is already registered." }, { status: 409 });
  }
  if (tournament.registeredTeams.length >= tournament.numberOfTeams) {
    return NextResponse.json({ error: "This tournament is full." }, { status: 409 });
  }

  tournament.registeredTeams.push(parsed.data.teamId as any);
  await tournament.save();

  return NextResponse.json({ message: "Team registered." });
}
