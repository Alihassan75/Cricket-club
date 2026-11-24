import { withBust } from "@/lib/withBust";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireSuperAdminLive } from "@/lib/guard";
import Media from "@/models/Media";
import Ground from "@/models/Ground";
import Tournament from "@/models/Tournament";
import Arena from "@/models/Arena";
import { getScope } from "@/lib/arenaScope";
import { ensureDefaultArena } from "@/lib/arenas";

// Sample pictures live in /public/demo (illustrations, not real photos).
const ALBUMS: Record<string, { file: string; title: string }[]> = {
  Matches: [
    { file: "matches-1", title: "Match night under the lights" },
    { file: "matches-2", title: "Bowled him! Leg stump gone" },
    { file: "matches-3", title: "SIX! Over the roof" },
    { file: "matches-4", title: "Chasing 168 — scoreboard" },
  ],
  Tournaments: [
    { file: "tournaments-1", title: "Champions — winner's trophy" },
    { file: "tournaments-2", title: "Knockout bracket" },
    { file: "tournaments-3", title: "Podium finish" },
    { file: "tournaments-4", title: "Night Premier League registration" },
  ],
  Practice: [
    { file: "practice-1", title: "Nets session" },
    { file: "practice-2", title: "Bowling machine training" },
    { file: "practice-3", title: "Cone drills" },
    { file: "practice-4", title: "Catching practice" },
  ],
  Events: [
    { file: "events-1", title: "Awards night" },
    { file: "events-2", title: "Club social night" },
    { file: "events-3", title: "Junior coaching camp" },
    { file: "events-4", title: "Corporate Cup" },
  ],
  Ground: [
    { file: "ground-1", title: "Indoor arena" },
    { file: "ground-2", title: "Pitch layout" },
    { file: "ground-3", title: "Sunset at the ground" },
    { file: "ground-4", title: "Seating & pavilion" },
  ],
  Team: [
    { file: "team-1", title: "Team huddle" },
    { file: "team-2", title: "Kit reveal" },
    { file: "team-3", title: "Captain's moment" },
    { file: "team-4", title: "Team photo" },
  ],
};

/** Adds sample gallery pictures (all 6 albums), ground photos and tournament covers. Safe to press twice. */
async function _POST() {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  try {
    await connectDB();
    await ensureDefaultArena();
    const scope = await getScope(guard.auth);
    const arenaId = scope.arenaId || String(((await Arena.findOne().sort({ createdAt: 1 }).select("_id").lean()) as any)?._id || "") || undefined;
    const tournaments = await Tournament.find(arenaId ? { arena: arenaId } : {}).sort({ startDate: 1 });

    let added = 0;
    if ((await Media.countDocuments({ isDemo: true })) === 0) {
      const docs: any[] = [];
      Object.entries(ALBUMS).forEach(([album, items]) =>
        items.forEach((it, i) =>
          docs.push({
            arena: arenaId, type: "image", source: "upload", url: `/demo/${it.file}.svg`, title: it.title, album,
            featured: i === 0, isDemo: true,
            tournament: album === "Tournaments" && tournaments.length ? tournaments[i % tournaments.length]._id : undefined,
          })
        )
      );
      await Media.insertMany(docs);
      added = docs.length;
    }

    let grounds = 0;
    for (const g of await Ground.find({ status: { $ne: "disabled" } })) {
      if (!g.images || g.images.length === 0) {
        await Ground.updateOne({ _id: g._id }, { images: ["/demo/ground-hero-1.svg", "/demo/ground-hero-2.svg", "/demo/ground-1.svg"] });
        grounds++;
      }
    }

    let covers = 0;
    for (let i = 0; i < tournaments.length; i++) {
      if (!tournaments[i].coverImage) {
        await Tournament.updateOne({ _id: tournaments[i]._id }, { coverImage: `/demo/tournament-cover-${(i % 3) + 1}.svg` });
        covers++;
      }
    }
    return NextResponse.json({ ok: true, added, grounds, tournaments: covers });
  } catch (e: any) {
    console.error("demo content failed:", e);
    return NextResponse.json({ error: `Database error: ${e?.message || "unknown"}` }, { status: 500 });
  }
}

/** Removes everything the button above added (your own uploads are never touched). */
async function _DELETE() {
  const guard = await requireSuperAdminLive();
  if ("error" in guard) return guard.error;
  try {
    await connectDB();
    const media = await Media.deleteMany({ isDemo: true });
    await Ground.updateMany({}, { $pull: { images: { $regex: "^/demo/" } } });
    await Tournament.updateMany({ coverImage: { $regex: "^/demo/" } }, { $unset: { coverImage: "" } });
    return NextResponse.json({ ok: true, removed: media.deletedCount });
  } catch (e: any) {
    return NextResponse.json({ error: `Database error: ${e?.message || "unknown"}` }, { status: 500 });
  }
}

export const POST = withBust(_POST);
export const DELETE = withBust(_DELETE);
