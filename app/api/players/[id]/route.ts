import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Player from "@/models/Player";
import { requireStaff } from "@/lib/guard";
import { teamGuard } from "@/lib/arenaScope";
import { zodMessage } from "@/lib/validation";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  photo: z.string().optional(),
  age: z.number().int().positive().optional(),
  phone: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  role: z.enum(["Batsman", "Bowler", "All-rounder", "Wicket Keeper"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid update." }, { status: 400 });
  }

  await connectDB();
  const own = await Player.findById(params.id).select("team");
  if (!own) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  const denied = await teamGuard(guard.auth, String(own.team));
  if (denied) return denied;
  const player = await Player.findByIdAndUpdate(params.id, parsed.data, { new: true });
  if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  return NextResponse.json({ player });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const own = await Player.findById(params.id).select("team");
  if (!own) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  const denied = await teamGuard(guard.auth, String(own.team));
  if (denied) return denied;
  const player = await Player.findByIdAndDelete(params.id);
  if (!player) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  return NextResponse.json({ message: "Player removed." });
}
