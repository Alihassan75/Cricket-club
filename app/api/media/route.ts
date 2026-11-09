import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireStaff } from "@/lib/guard";
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
});

// Public: anyone can view the gallery.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("album")) filter.album = sp.get("album");
  if (sp.get("type")) filter.type = sp.get("type");
  if (sp.get("tournament")) filter.tournament = sp.get("tournament");

  await connectDB();
  const media = await Media.find(filter).sort({ createdAt: -1 }).limit(Number(sp.get("limit")) || 200);
  return NextResponse.json({ media });
}

export async function POST(req: NextRequest) {
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
  const media = await Media.create({ ...data, tournament: data.tournament || undefined });
  return NextResponse.json({ media }, { status: 201 });
}
