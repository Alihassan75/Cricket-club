import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import { requireStaff } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";
import { attachEntryCounts } from "@/lib/tournamentEntries";

const createSchema = z.object({
  name: z.string().trim().min(2, "Tournament name must be at least 2 characters."),
  logoUrl: z.string().optional(),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  numberOfTeams: z.number().int("Number of teams must be a whole number.").min(2, "A tournament needs at least 2 teams."),
  entryFee: z.number().min(0).default(0),
  prizeMoney: z.number().min(0).default(0),
  format: z.enum(["Knockout", "League", "Round Robin"]).default("League"),
  rules: z.string().optional(),
});

export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const docs = await Tournament.find().populate("registeredTeams", "name logoUrl").sort({ startDate: -1 });
  const tournaments = await attachEntryCounts(JSON.parse(JSON.stringify(docs)));
  return NextResponse.json({ tournaments });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid tournament data." }, { status: 400 });
  }

  if (parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: "End date can't be before the start date." }, { status: 400 });
  }

  await connectDB();
  const tournament = await Tournament.create(parsed.data);
  return NextResponse.json({ tournament }, { status: 201 });
}
