"use client";
import { useEffect, useRef, useState } from "react";

const ALBUMS = ["Matches", "Tournaments", "Practice", "Events", "Ground", "Team"];

type Media = {
  _id: string;
  type: "image" | "video";
  source: "upload" | "youtube";
  url: string;
  thumbnailUrl?: string;
  title?: string;
  album: string;
  featured: boolean;
};

type Sign =
  | { mode: "local" }
  | { mode: "cloudinary"; cloud: string; apiKey: string; timestamp: number; folder: string; signature: string };

function uploadToCloudinary(file: File, s: Extract<Sign, { mode: "cloudinary" }>, onProgress: (p: number) => void) {
  return new Promise<{ secure_url: string; resource_type: string; public_id: string }>((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", s.apiKey);
    fd.append("timestamp", String(s.timestamp));
    fd.append("folder", s.folder);
    fd.append("signature", s.signature);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${s.cloud}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        xhr.status < 300 ? resolve(body) : reject(new Error(body.error?.message || "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(fd);
  });
}

export default function GalleryPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [album, setAlbum] = useState("Matches");
  const [filter, setFilter] = useState("All");
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [demoMsg, setDemoMsg] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);

  const demo = async (method: "POST" | "DELETE") => {
    if (method === "DELETE" && !confirm("Remove all demo photos? Your own uploads stay.")) return;
    setDemoBusy(true);
    setDemoMsg("");
    try {
      const res = await fetch("/api/demo/content", { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setDemoMsg(`Failed (${res.status}): ${data.error || "unknown error"}`);
      else setDemoMsg(method === "POST" ? `Added ${data.added} gallery pictures, ${data.grounds} ground photo set(s) and ${data.tournaments} tournament cover(s).` : `Removed ${data.removed} demo picture(s).`);
      await load();
    } finally {
      setDemoBusy(false);
    }
  };

  const load = async () => {
    const res = await fetch("/api/media?scope=1");
    const data = await res.json().catch(() => ({}));
    setItems(data.media || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    try {
      const sign: Sign = await (await fetch("/api/media/sign")).json().catch(() => ({}));
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const label = `Uploading ${i + 1}/${list.length}: ${f.name}`;
        setProgress(label);
        let url = "";
        let type: "image" | "video" = f.type.startsWith("video/") ? "video" : "image";
        let thumbnailUrl: string | undefined;
        let publicId: string | undefined;

        if (sign.mode === "cloudinary") {
          const r = await uploadToCloudinary(f, sign, (p) => setProgress(`${label} — ${p}%`));
          url = r.secure_url;
          publicId = r.public_id;
          type = r.resource_type === "video" ? "video" : "image";
          if (type === "video") thumbnailUrl = url.replace(/\.[a-z0-9]+$/i, ".jpg");
        } else {
          const fd = new FormData();
          fd.append("file", f);
          const res = await fetch("/api/media/upload-local", { method: "POST", body: fd });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Upload failed");
          url = data.url;
          type = data.type;
        }

        const res = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, source: "upload", url, thumbnailUrl, publicId, album }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save file");
      }
      await load();
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addYoutube = async () => {
    setError("");
    const res = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "video", source: "youtube", url: ytUrl.trim(), title: ytTitle.trim() || undefined, album }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || "Could not add video");
    setYtUrl("");
    setYtTitle("");
    load();
  };

  const toggleFeatured = async (m: Media) => {
    await fetch(`/api/media/${m._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !m.featured }),
    });
    load();
  };

  const remove = async (m: Media) => {
    if (!confirm("Delete this item from the gallery?")) return;
    await fetch(`/api/media/${m._id}`, { method: "DELETE" });
    load();
  };

  const shown = filter === "All" ? items : items.filter((m) => m.album === filter);

  return (
    <div className="p-5 max-w-6xl">
      <h1 className="font-display uppercase text-3xl leading-none mb-1">Gallery</h1>
      <p className="text-sm text-gray-500 mb-5">Photos and videos you add here appear on your public website.</p>

      <div className="mb-5 rounded-2xl border border-gold bg-gold/15 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm max-w-xl">
          <b>Demo content.</b> Fill the website with sample pictures: 24 gallery items across Matches, Tournaments, Practice, Events, Ground and Team, plus a ground photo and tournament covers. They are illustrations, not real photos — remove them any time.
          {demoMsg && <div className="mt-2 text-xs font-semibold text-pitch break-words">{demoMsg}</div>}
        </div>
        <div className="flex gap-2">
          <button disabled={demoBusy} onClick={() => demo("POST")} className="rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-ball disabled:opacity-50">{demoBusy ? "Working…" : "Add demo photos"}</button>
          <button disabled={demoBusy} onClick={() => demo("DELETE")} className="rounded-full px-5 py-2.5 text-sm font-semibold border border-line bg-white disabled:opacity-50">Remove demo</button>
        </div>
      </div>

      <div className="bg-white border border-line rounded-xl p-4 mb-6 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold mb-2">Upload photos / videos</div>
          <select value={album} onChange={(e) => setAlbum(e.target.value)} className="border rounded-lg px-3 py-2 text-sm mb-2 w-full">
            {ALBUMS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => onFiles(e.target.files)}
            disabled={!!progress}
            className="text-sm w-full"
          />
          {progress && <div className="text-xs text-green mt-2">{progress}</div>}
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">Or add a YouTube video link</div>
          <input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="border rounded-lg px-3 py-2 text-sm mb-2 w-full" />
          <input value={ytTitle} onChange={(e) => setYtTitle(e.target.value)} placeholder="Title (optional)" className="border rounded-lg px-3 py-2 text-sm mb-2 w-full" />
          <button onClick={addYoutube} disabled={!ytUrl.trim()} className="bg-green text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
            Add video
          </button>
        </div>
      </div>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="flex gap-2 flex-wrap mb-4">
        {["All", ...ALBUMS].map((a) => (
          <button key={a} onClick={() => setFilter(a)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === a ? "bg-navy text-white border-navy" : "bg-white text-gray-600 border-line"}`}>
            {a}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : shown.length === 0 ? (
        <div className="text-sm text-gray-500">Nothing here yet — upload your first photo above.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {shown.map((m) => (
            <div key={m._id} className="bg-white border border-line rounded-xl overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100 relative">
                {m.type === "image" ? (
                  <img src={m.url} alt={m.title || ""} className="w-full h-full object-cover" />
                ) : m.thumbnailUrl ? (
                  <img src={m.thumbnailUrl} alt={m.title || ""} className="w-full h-full object-cover" />
                ) : (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                )}
                {m.type === "video" && <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-full">VIDEO</span>}
                {m.featured && <span className="absolute top-2 left-2 text-[10px] bg-greenBright text-white px-2 py-0.5 rounded-full">Featured</span>}
              </div>
              <div className="p-2.5">
                <div className="text-xs text-gray-500 truncate">{m.title || m.album}</div>
                <div className="flex gap-3 mt-1.5 text-xs font-semibold">
                  <button onClick={() => toggleFeatured(m)} className="text-green">
                    {m.featured ? "Unfeature" : "Feature"}
                  </button>
                  <button onClick={() => remove(m)} className="text-red-600">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
