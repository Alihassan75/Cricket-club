import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Player from "@/models/Player";
import Team from "@/models/Team";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  name: z.string().min(2),
  photo: z.string().optional(),
  age: z.number().int().positive().optional(),
  phone: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  role: z.enum(["Batsman", "Bowler", "All-rounder", "Wicket Keeper"]),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const players = await Player.find({ team: params.id }).sort({ createdAt: 1 });
  return NextResponse.json({ players });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid player data." }, { status: 400 });
  }

  await connectDB();
  const team = await Team.findById(params.id);
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });

  const player = await Player.create({ ...parsed.data, team: params.id });
  return NextResponse.json({ player }, { status: 201 });
}
