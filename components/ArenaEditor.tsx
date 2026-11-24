"use client";
import { useState } from "react";
import { ImagePlus, Check } from "lucide-react";
import { useToast } from "@/components/Toast";
import { compressImage } from "@/lib/compressImage";
import { FACILITIES } from "@/lib/facilities";

type A = any;
const input = "w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5";

/** The form for an arena's public page ("Pasha Arena"): what visitors see when they pick this arena. */
export default function ArenaEditor({ arena, isBackyard, onSaved }: { arena: A; isBackyard: boolean; onSaved?: (a: A) => void }) {
  const toast = useToast();
  const [f, setF] = useState<A>({ ...arena, socialLinks: arena.socialLinks || {}, facilities: arena.facilities || [] });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: string, v: any) => setF((s: A) => ({ ...s, [k]: v }));
  const text = (label: string, k: string, extra: any = {}) => (
    <label className="text-xs text-gray-500 block">{label}
      <input value={f[k] || ""} onChange={(e) => set(k, e.target.value)} className={input} {...extra} /></label>
  );
  const area = (label: string, k: string, rows = 2, ph = "") => (
    <label className="text-xs text-gray-500 block">{label}
      <textarea value={f[k] || ""} onChange={(e) => set(k, e.target.value)} rows={rows} placeholder={ph} className={input} /></label>
  );

  const uploadCover = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const small = await compressImage(file);
      const fd = new FormData();
      fd.append("file", small);
      const res = await fetch("/api/media/upload-local", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast(data.error || "Could not upload the picture.", "error");
      set("coverImage", data.url);
    } finally { setUploading(false); }
  };

  const save = async () => {
    setBusy(true);
    const body: A = {
      name: f.name, tagline: f.tagline || "", description: f.description || "", coverImage: f.coverImage || "", city: f.city || "",
      address: f.address || "", phone: f.phone || "", whatsapp: f.whatsapp || "", email: f.email || "",
      openingTime: f.openingTime || "", closingTime: f.closingTime || "", facilities: f.facilities,
      socialLinks: f.socialLinks, paymentInstructions: f.paymentInstructions || "", bookingRules: f.bookingRules || "", cancellationPolicy: f.cancellationPolicy || "",
    };
    if (isBackyard) { body.status = f.status || "active"; body.slug = f.slug; }
    const res = await fetch(`/api/arenas/${arena._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(data.error || `Could not save (${res.status}).`, "error");
    toast("Saved — your arena page is updated.");
    onSaved?.(data.arena);
  };

  return (
    <div className="rounded-2xl bg-white border border-line p-5 sm:p-6 flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-3">{text("Arena name", "name")}{text("City", "city")}</div>
      {text("Short tagline (one line under the name)", "tagline", { maxLength: 120, placeholder: "Floodlit indoor cricket in the heart of the city" })}
      {area("About this arena (shown on your page)", "description", 4, "Tell players what makes your arena special…")}

      <div>
        <div className="text-xs text-gray-500 mb-1">Cover picture</div>
        <div className="flex flex-wrap items-center gap-3">
          {f.coverImage ? <img src={f.coverImage} alt="" className="w-40 h-24 rounded-xl object-cover border border-line" /> : <div className="w-40 h-24 rounded-xl bg-cream border border-dashed border-line flex items-center justify-center text-xs text-gray-400">No picture</div>}
          <label className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-line bg-white cursor-pointer">
            <ImagePlus size={14} /> {uploading ? "Uploading…" : "Upload picture"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadCover(e.target.files?.[0])} />
          </label>
          {f.coverImage && <button type="button" onClick={() => set("coverImage", "")} className="text-xs text-gray-500">Remove</button>}
        </div>
      </div>

      {text("Address", "address")}
      <div className="grid sm:grid-cols-3 gap-3">{text("Phone", "phone")}{text("WhatsApp", "whatsapp")}{text("Email", "email")}</div>
      <div className="grid sm:grid-cols-2 gap-3">{text("Opens at", "openingTime", { type: "time" })}{text("Closes at", "closingTime", { type: "time" })}</div>

      <div>
        <div className="text-xs text-gray-500 mb-1.5">What your arena offers</div>
        <div className="flex flex-wrap gap-2">
          {FACILITIES.map((x) => {
            const on = f.facilities.includes(x);
            return <button key={x} type="button" onClick={() => set("facilities", on ? f.facilities.filter((y: string) => y !== x) : [...f.facilities, x])} className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1 ${on ? "bg-pitch text-white border-pitch" : "bg-white border-line text-gray-600"}`}>{on && <Check size={12} />}{x}</button>;
          })}
        </div>
      </div>

      {area("How players pay you (shown when they book — JazzCash / Easypaisa / bank)", "paymentInstructions", 3, "JazzCash: 0300-1234567 (Ali Hassan)\nBank: HBL · IBAN PK00 …")}
      {area("Booking rules", "bookingRules")}
      {area("Cancellation policy", "cancellationPolicy")}

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-xs text-gray-500 block">Facebook<input value={f.socialLinks.facebook || ""} onChange={(e) => set("socialLinks", { ...f.socialLinks, facebook: e.target.value })} className={input} /></label>
        <label className="text-xs text-gray-500 block">Instagram<input value={f.socialLinks.instagram || ""} onChange={(e) => set("socialLinks", { ...f.socialLinks, instagram: e.target.value })} className={input} /></label>
        <label className="text-xs text-gray-500 block">Twitter / X<input value={f.socialLinks.twitter || ""} onChange={(e) => set("socialLinks", { ...f.socialLinks, twitter: e.target.value })} className={input} /></label>
      </div>

      {isBackyard && (
        <div className="grid sm:grid-cols-2 gap-3 rounded-xl bg-cream p-3">
          <label className="text-xs text-gray-500 block">Web address (/arenas/…)<input value={f.slug || ""} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className={input} /></label>
          <label className="text-xs text-gray-500 block">Show on the website?
            <select value={f.status || "active"} onChange={(e) => set("status", e.target.value)} className={input}><option value="active">Yes — visible to everyone</option><option value="hidden">No — hidden</option></select></label>
        </div>
      )}

      <div><button onClick={save} disabled={busy} className="px-5 py-2.5 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">{busy ? "Saving…" : "Save arena page"}</button></div>
    </div>
  );
}
