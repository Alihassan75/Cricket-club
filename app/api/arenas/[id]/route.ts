import { uniqueSlug } from "@/lib/arenas";
import { withBust } from "@/lib/withBust";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import { requireAuth } from "@/lib/guard";
import { zodMessage } from "@/lib/validation";
import { arenaAdminSchema, arenaProfileSchema } from "@/lib/arenaSchema";
import { getScope, inScope } from "@/lib/arenaScope";
import User from "@/models/User";

/**
 * Edit an arena's page. The Backyard Manager can edit any arena (and its visibility / web address);
 * an arena manager can only edit their own arena's details.
 */
async function _PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Arena not found." }, { status: 404 });
  await connectDB();
  const me: any = await User.findById(guard.auth.userId).select("role isActive").lean();
  if (!me || me.isActive === false) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const isBackyard = me.role === "super_admin";
  if (!isBackyard && !["arena_manager", "staff"].includes(me.role)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!isBackyard) {
    const scope = await getScope(guard.auth);
    if (!inScope(scope, params.id)) return NextResponse.json({ error: "You can only edit your own arena." }, { status: 403 });
  }
  const parsed = (isBackyard ? arenaAdminSchema : arenaProfileSchema).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  const data: any = parsed.data;
  if (data.slug && (await Arena.exists({ slug: data.slug, _id: { $ne: params.id } }))) {
    return NextResponse.json({ error: "Another arena already uses that web address." }, { status: 409 });
  }
  // Renaming an arena renames its web address too (unless an admin typed a new address on purpose);
  // the old address is remembered so old links and bookmarks keep working.
  const current: any = await Arena.findById(params.id).select("name slug previousSlugs").lean();
  if (!current) return NextResponse.json({ error: "Arena not found." }, { status: 404 });
  const update: any = { ...data };
  const typedNewSlug = data.slug && data.slug !== current.slug;
  if (!typedNewSlug) {
    delete update.slug;
    if (data.name && data.name.trim() !== current.name) update.slug = await uniqueSlug(data.name, params.id);
  }
  if (update.slug && update.slug !== current.slug) {
    update.previousSlugs = Array.from(new Set([...(current.previousSlugs || []), current.slug])).filter((x) => x !== update.slug);
  }
  const arena = await Arena.findByIdAndUpdate(params.id, update, { new: true });
  if (!arena) return NextResponse.json({ error: "Arena not found." }, { status: 404 });
  return NextResponse.json({ arena });
}

export const PATCH = withBust(_PATCH);
