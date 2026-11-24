import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Team from "@/models/Team";
import { requireAuth } from "@/lib/guard";

export async function GET() {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;

  await connectDB();
  const teams = await Team.find().select("name").sort({ name: 1 });
  return NextResponse.json({ teams });
}
