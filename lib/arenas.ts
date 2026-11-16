import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import Ground from "@/models/Ground";
import Tournament from "@/models/Tournament";
import Media from "@/models/Media";
import User from "@/models/User";
import ArenaSettings from "@/models/ArenaSettings";
import { BRAND, LEGACY_NAMES } from "@/lib/brand";

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "arena";

/** A slug nobody else uses yet: pasha-arena, pasha-arena-2, … */
export async function uniqueSlug(name: string, exceptId?: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; i < 200; i++) {
    const hit: any = await Arena.findOne({ slug }).select("_id").lean();
    if (!hit || String(hit._id) === exceptId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Older databases have one club and no arenas. The first time anything needs arenas, the existing club
 * becomes the first arena and every ground / tournament / photo that had no arena moves into it,
 * so nothing disappears. Does nothing once at least one arena exists.
 */
export async function ensureDefaultArena() {
  try {
    await connectDB();
    if (await Arena.exists({})) return;
    const s: any = await ArenaSettings.findOne().lean();
    const name = !s?.arenaName || LEGACY_NAMES.includes(s.arenaName) ? BRAND : s.arenaName;
    const arena = await Arena.findOneAndUpdate(
      { slug: await uniqueSlug(name) },
      {
        $setOnInsert: {
          name,
          slug: await uniqueSlug(name),
          tagline: "Indoor cricket, tournaments and more.",
          address: s?.address, phone: s?.phone, whatsapp: s?.whatsapp, email: s?.email,
          openingTime: s?.openingTime, closingTime: s?.closingTime,
          socialLinks: s?.socialLinks || {},
          paymentInstructions: s?.paymentInstructions, bookingRules: s?.bookingRules, cancellationPolicy: s?.cancellationPolicy,
          status: "active",
        },
      },
      { upsert: true, new: true }
    );
    await Promise.all([
      Ground.updateMany({ arena: { $exists: false } }, { arena: arena._id }),
      Tournament.updateMany({ arena: { $exists: false } }, { arena: arena._id }),
      Media.updateMany({ arena: { $exists: false } }, { arena: arena._id }),
      // existing arena managers / staff work for the first arena until the Backyard Manager moves them
      User.updateMany({ role: { $in: ["arena_manager", "staff"] }, arena: { $exists: false } }, { arena: arena._id }),
    ]);
  } catch (e) {
    console.error("ensureDefaultArena failed:", e);
  }
}
