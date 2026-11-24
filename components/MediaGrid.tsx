"use client";
import { useState } from "react";
import { youtubeId } from "@/lib/youtube";

export type PublicMedia = {
  _id: string;
  type: "image" | "video";
  source: "upload" | "youtube";
  url: string;
  thumbnailUrl?: string;
  title?: string;
  album: string;
};

export default function MediaGrid({ items, albums }: { items: PublicMedia[]; albums?: string[] }) {
  const [album, setAlbum] = useState("All");
  const [kind, setKind] = useState<"all" | "image" | "video">("all");
  const [open, setOpen] = useState<PublicMedia | null>(null);

  const shown = items.filter((m) => (album === "All" || m.album === album) && (kind === "all" || m.type === kind));

  return (
    <div>
      {albums && (
        <div className="flex gap-2 flex-wrap mb-6 items-center">
          {["All", ...albums].map((a) => (
            <button key={a} onClick={() => setAlbum(a)} className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border ${album === a ? "bg-pitch text-white border-pitch" : "bg-white text-gray-600 border-line"}`}>
              {a}
            </button>
          ))}
          <span className="flex-1" />
          {(["all", "image", "video"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${kind === k ? "bg-ball text-white" : "bg-gray-100 text-gray-600"}`}>
              {k === "all" ? "Everything" : k === "image" ? "Photos" : "Videos"}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="text-gray-500 text-sm py-10 text-center">No photos or videos here yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {shown.map((m) => (
            <button key={m._id} onClick={() => setOpen(m)} className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 group">
              {m.type === "image" ? (
                <img src={m.url} alt={m.title || m.album} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : m.thumbnailUrl ? (
                <img src={m.thumbnailUrl} alt={m.title || m.album} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <video src={m.url} muted preload="metadata" className="w-full h-full object-cover" />
              )}
              {m.type === "video" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center text-lg">▶</span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setOpen(null)}>
          <button className="absolute top-4 right-5 text-white text-3xl" aria-label="Close">×</button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {open.type === "image" ? (
              <img src={open.url} alt={open.title || ""} className="max-h-[80vh] mx-auto rounded-full" />
            ) : open.source === "youtube" && youtubeId(open.url) ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId(open.url)}?autoplay=1`}
                className="w-full aspect-video rounded-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            ) : (
              <video src={open.url} controls autoPlay className="max-h-[80vh] mx-auto rounded-full" />
            )}
            {open.title && <div className="text-white/80 text-sm text-center mt-3">{open.title}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
