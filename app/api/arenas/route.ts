import { withBust } from "@/lib/withBust";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import Ground from "@/models/Ground";
import User from "@/models/User";
import { requireSuperAdminLive } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";
import { arenaAdminSchema } from "@/lib/arenaSchema";
import { ensureDefaultArena, uniqueSlug } from "@/lib/arenas";

/** Backyard Manager: every arena, with how many grounds it has and who runs it. */
export async function GET() {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  await connectDB();
  await ensureDefaultArena();
  const arenas: any[] = await Arena.find().sort({ createdAt: 1 }).lean();
  const [grounds, managers] = await Promise.all([
    Ground.aggregate([{ $match: { status: { $ne: "disabled" } } }, { $group: { _id: "$arena", n: { $sum: 1 } } }]),
    User.find({ role: { $in: ["arena_manager", "staff"] }, arena: { $exists: true } }).select("name email role arena isActive").lean(),
  ]);
  const gCount = new Map(grounds.map((g: any) => [String(g._id), g.n]));
  return NextResponse.json({
    arenas: arenas.map((a) => ({
      ...a,
      groundCount: gCount.get(String(a._id)) || 0,
      managers: (managers as any[]).filter((m) => String(m.arena) === String(a._id)).map((m) => ({ _id: m._id, name: m.name, email: m.email, role: m.role, isActive: m.isActive !== false })),
    })),
  });
}

/** Backyard Manager: add a new arena (a page on the website like "Pasha Arena"). */
async function _POST(req: NextRequest) {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  const parsed = arenaAdminSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  if (!parsed.data.name) return NextResponse.json({ error: "Please enter the arena's name." }, { status: 400 });
  await connectDB();
  const slug = parsed.data.slug ? parsed.data.slug : await uniqueSlug(parsed.data.name);
  if (await Arena.exists({ slug })) return NextResponse.json({ error: "Another arena already uses that web address." }, { status: 409 });
  const arena = await Arena.create({ ...parsed.data, slug, status: parsed.data.status || "active" });
  return NextResponse.json({ arena }, { status: 201 });
}

export const POST = withBust(_POST);
