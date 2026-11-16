import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Team from "@/models/Team";
import { requireStaff } from "@/lib/guard";
import { getScope, teamIdsOf, arenaForCreate } from "@/lib/arenaScope";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().optional(),
  captainName: z.string().min(2),
  viceCaptainName: z.string().optional(),
  phone: z.string().min(7),
});

export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const ids = await teamIdsOf(await getScope(guard.auth));
  const teams = await Team.find(ids === null ? {} : { _id: { $in: ids } }).sort({ name: 1 });
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid team data." }, { status: 400 });
  }

  await connectDB();
  const existing = await Team.findOne({ name: parsed.data.name });
  if (existing) {
    return NextResponse.json({ error: "A team with this name already exists." }, { status: 409 });
  }

  // a team added by an arena belongs to that arena; the Backyard Manager (viewing all arenas) adds it for everyone
  const scope = await getScope(guard.auth);
  let arenas: string[] = [];
  if (!scope.all) {
    const target = arenaForCreate(scope);
    if ("error" in target) return target.error;
    arenas = [target.arenaId];
  }
  const team = await Team.create({ ...parsed.data, arenas });
  return NextResponse.json({ team }, { status: 201 });
}
