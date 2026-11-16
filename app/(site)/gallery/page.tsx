import { connectDB } from "@/lib/mongodb";
import { listedArenaIds } from "@/lib/arenaListing";
import Media, { ALBUMS } from "@/models/Media";
import MediaGrid from "@/components/MediaGrid";
import { plain } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  await connectDB();
  const media = plain<any[]>(await Media.find({ arena: { $in: await listedArenaIds() } }).sort({ createdAt: -1 }).limit(500));
  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="font-display uppercase text-4xl sm:text-5xl break-words mb-2">Gallery</h1>
      <p className="text-gray-500 mb-8">Match days, tournaments, practice sessions and more.</p>
      <MediaGrid items={media} albums={[...ALBUMS]} />
    </div>
  );
}
