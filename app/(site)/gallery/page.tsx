import { ALBUMS } from "@/models/Media";
import MediaGrid from "@/components/MediaGrid";
import { getGalleryPage } from "@/lib/publicData";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const media = await getGalleryPage();
  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <h1 className="font-display uppercase text-4xl sm:text-5xl break-words mb-2">Gallery</h1>
      <p className="text-gray-500 mb-8">Match days, tournaments, practice sessions and more.</p>
      <MediaGrid items={media} albums={[...ALBUMS]} />
    </div>
  );
}
