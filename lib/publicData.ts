import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import Ground from "@/models/Ground";
import Tournament from "@/models/Tournament";
import Media from "@/models/Media";
import { getListedArenas, listedArenaIds } from "@/lib/arenaListing";
import { ensureDefaultArena } from "@/lib/arenas";
import { ensureDefaultGround } from "@/lib/defaultGround";
import { attachEntryCounts } from "@/lib/tournamentEntries";

/**
 * Data for the public website pages. Each loader runs its MongoDB queries in parallel and the
 * result is cached for 60s (cleared right away when staff change something). Visitors therefore
 * get pages without waiting on the database; only the first visit after a change pays for the queries.
 */
const OPTS = { revalidate: 60, tags: ["public"] };
const J = <T,>(x: unknown): T => JSON.parse(JSON.stringify(x));

// Only what the gallery grid needs — no createdAt/updatedAt/publicId noise.
const MEDIA_FIELDS = "type source url thumbnailUrl title album arena tournament featured";

export const getArenasPage = unstable_cache(
  async () => {
    await connectDB();
    await ensureDefaultArena();
    const [arenas, counts] = await Promise.all([
      getListedArenas(),
      Ground.aggregate([{ $match: { status: { $ne: "disabled" } } }, { $group: { _id: "$arena", n: { $sum: 1 } } }]),
    ]);
    const n: Record<string, number> = {};
    for (const c of counts) n[String(c._id)] = c.n;
    return { arenas, counts: n };
  },
  ["page-arenas"],
  OPTS
);

export const getGroundsPage = unstable_cache(
  async () => {
    await connectDB();
    await ensureDefaultGround();
    const ids = await listedArenaIds();
    return J<any[]>(await Ground.find({ arena: { $in: ids }, status: { $ne: "disabled" } }).sort({ name: 1 }).lean());
  },
  ["page-grounds"],
  OPTS
);

export const getTournamentsPage = unstable_cache(
  async () => {
    await connectDB();
    const ids = await listedArenaIds();
    const ts = J<any[]>(await Tournament.find({ arena: { $in: ids } }).sort({ startDate: -1 }).lean());
    return attachEntryCounts(ts);
  },
  ["page-tournaments"],
  OPTS
);

export const getGalleryPage = unstable_cache(
  async () => {
    await connectDB();
    const ids = await listedArenaIds();
    return J<any[]>(await Media.find({ $or: [{ arena: { $in: ids } }, { arena: null }] }).select(MEDIA_FIELDS).sort({ createdAt: -1 }).limit(200).lean());
  },
  ["page-gallery"],
  OPTS
);

/** If `slug` is an old address of a renamed arena, the arena's current address (otherwise null). */
export async function getArenaCurrentSlug(slug: string): Promise<string | null> {
  await connectDB();
  const old: any = await Arena.findOne({ previousSlugs: slug }).select("slug").lean();
  if (!old) return null;
  const now = (await getListedArenas()).find((a) => a.slug === old.slug);
  return now ? now.slug : null;
}

export const getArenaDetail = unstable_cache(
  async (slug: string) => {
    await connectDB();
    const arena = (await getListedArenas()).find((a) => a.slug === slug);
    if (!arena) return null;
    const [grounds, tournaments, media] = await Promise.all([
      Ground.find({ arena: arena._id, status: { $ne: "disabled" } }).sort({ name: 1 }).lean(),
      Tournament.find({ arena: arena._id }).sort({ startDate: -1 }).lean(),
      Media.find({ arena: arena._id }).select(MEDIA_FIELDS).sort({ createdAt: -1 }).limit(120).lean(),
    ]);
    return { arena, grounds: J<any[]>(grounds), tournaments: await attachEntryCounts(J<any[]>(tournaments)), media: J<any[]>(media) };
  },
  ["page-arena-detail"],
  OPTS
);

export const getHomePage = unstable_cache(
  async () => {
    await connectDB();
    await Promise.all([ensureDefaultGround(), ensureDefaultArena()]);
    const arenasAll = await getListedArenas();
    const listed = arenasAll.map((a) => String(a._id));
    const inListed = { arena: { $in: listed } };
    const mediaListed = { $or: [{ arena: { $in: listed } }, { arena: null }] }; // arena galleries + the main-page gallery
    const [tournaments, grounds, featured, latest, tCount, mCount] = await Promise.all([
      Tournament.find({ ...inListed, status: { $ne: "Completed" } }).sort({ startDate: 1 }).limit(3).lean(),
      Ground.find({ ...inListed, status: "active" }).sort({ name: 1 }).limit(4).lean(),
      Media.find({ ...mediaListed, featured: true }).select(MEDIA_FIELDS).sort({ createdAt: -1 }).limit(8).lean(),
      Media.find(mediaListed).select(MEDIA_FIELDS).sort({ createdAt: -1 }).limit(8).lean(),
      Tournament.estimatedDocumentCount(),
      Media.estimatedDocumentCount(),
    ]);
    const gs = J<any[]>(grounds);
    // Arena names for the ground cards come from the already-loaded list (no extra query).
    const arenaById: Record<string, any> = {};
    for (const a of arenasAll) arenaById[String(a._id)] = { _id: a._id, name: a.name, slug: a.slug };
    return {
      arenaList: arenasAll.slice(0, 6),
      ts: await attachEntryCounts(J<any[]>(tournaments)),
      gs,
      media: J<any[]>(featured.length ? featured : latest),
      tCount, mCount, arenaById,
    };
  },
  ["page-home"],
  OPTS
);
