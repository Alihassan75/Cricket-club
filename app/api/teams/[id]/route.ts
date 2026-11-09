import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Team from "@/models/Team";
import Player from "@/models/Player";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  logoUrl: z.string().optional(),
  captainName: z.string().min(2).optional(),
  viceCaptainName: z.string().optional(),
  phone: z.string().min(7).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const team = await Team.findById(params.id);
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
  const players = await Player.find({ team: params.id }).sort({ createdAt: 1 });
  return NextResponse.json({ team, players });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid update." }, { status: 400 });
  }

  await connectDB();
  const team = await Team.findByIdAndUpdate(params.id, parsed.data, { new: true });
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
  return NextResponse.json({ team });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  await Player.deleteMany({ team: params.id });
  const team = await Team.findByIdAndDelete(params.id);
  if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
  return NextResponse.json({ message: "Team deleted." });
}
