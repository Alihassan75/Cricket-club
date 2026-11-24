import { withBust } from "@/lib/withBust";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { unlink } from "fs/promises";
import path from "path";
import { connectDB } from "@/lib/mongodb";
import Media from "@/models/Media";
import { requireStaff } from "@/lib/guard";
import { getScope, inScope, outOfScope } from "@/lib/arenaScope";

const patchSchema = z.object({
  title: z.string().max(120).optional(),
  album: z.string().optional(),
  featured: z.boolean().optional(),
});

async function _PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  await connectDB();
  const own = await Media.findById(params.id).select("arena");
  if (own && !inScope(await getScope(guard.auth), own.arena)) return outOfScope("That item");
  const media = await Media.findByIdAndUpdate(params.id, parsed.data, { new: true });
  if (!media) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ media });
}

async function _DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  const own = await Media.findById(params.id).select("arena");
  if (own && !inScope(await getScope(guard.auth), own.arena)) return outOfScope("That item");
  const media = await Media.findByIdAndDelete(params.id);
  if (!media) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Clean up locally stored files (Cloudinary files stay in your Cloudinary library).
  if (media.url.startsWith("/uploads/")) {
    try {
      await unlink(path.join(process.cwd(), "public", media.url));
    } catch {}
  }
  return NextResponse.json({ ok: true });
}

export const PATCH = withBust(_PATCH);
export const DELETE = withBust(_DELETE);
