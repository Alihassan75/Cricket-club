import { withBust } from "@/lib/withBust";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireStaff, requireAuth } from "@/lib/guard";
import { getScope, arenaFilter, arenaForCreate } from "@/lib/arenaScope";
import mongoose from "mongoose";
import { youtubeId } from "@/lib/youtube";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  type: z.enum(["image", "video"]),
  source: z.enum(["upload", "youtube"]).default("upload"),
  url: z.string().url().or(z.string().startsWith("/uploads/")),
  thumbnailUrl: z.string().optional(),
  publicId: z.string().optional(),
  title: z.string().max(120).optional(),
  album: z.string().default("Matches"),
  tournament: z.string().optional(),
  featured: z.boolean().default(false),
  mainPage: z.boolean().optional(), // super admin: show on the main (club-wide) gallery instead of one arena
});

// Public: anyone can view the gallery.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("album")) filter.album = sp.get("album");
  if (sp.get("type")) filter.type = sp.get("type");
  if (sp.get("tournament")) filter.tournament = sp.get("tournament");
  // public: ?arena=<id> shows one arena's gallery. The dashboard asks with ?scope=1 and sees only its own arena.
  if (sp.get("scope") === "1") {
    const guard = requireStaff();
    if ("error" in guard) return guard.error;
    Object.assign(filter, arenaFilter(await getScope(guard.auth)));
  } else if (sp.get("arena") && mongoose.isValidObjectId(sp.get("arena"))) {
    filter.arena = sp.get("arena");
  }

  await connectDB();
  const media = await Media.find(filter).sort({ createdAt: -1 }).limit(Number(sp.get("limit")) || 200);
  return NextResponse.json({ media });
}

async function _POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid media data." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.source === "youtube") {
    const id = youtubeId(data.url);
    if (!id) return NextResponse.json({ error: "That doesn't look like a YouTube link." }, { status: 400 });
    data.thumbnailUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  await connectDB();
  const scope = await getScope(guard.auth);
  const { mainPage, ...fields } = data;
  // main page = no arena. Only the Backyard (super admin) may post there; with no arena picked it is the default.
  if (scope.all && (mainPage || !scope.arenaId)) {
    const media = await Media.create({ ...fields, tournament: fields.tournament || undefined });
    return NextResponse.json({ media }, { status: 201 });
  }
  const target = arenaForCreate(scope);
  if ("error" in target) return target.error;
  const media = await Media.create({ ...fields, arena: target.arenaId, tournament: fields.tournament || undefined });
  return NextResponse.json({ media }, { status: 201 });
}

export const POST = withBust(_POST);
