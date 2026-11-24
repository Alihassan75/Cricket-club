"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";

type Settings = {
  arenaName: string; tagline?: string; announcement?: string; announcementOn?: boolean; announcementLink?: string;
  address?: string; phone?: string; whatsapp?: string; email?: string; currency: string;
  arenaMembershipFee?: number; requireArenaMembership?: boolean; playRegistrationFee?: number;
  socialLinks: { facebook?: string; instagram?: string; twitter?: string };
};

const box = "w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5";

/** Backyard Manager: how the whole website looks and how the Backyard earns. (Each arena edits its own page itself.) */
export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json().catch(() => ({}))).then((d) => setForm(d.settings));
  }, []);

  if (!form) return <div className="p-6 text-sm text-gray-500">Loading settings…</div>;
  const set = (k: keyof Settings, v: any) => setForm({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast(data.error || `Could not save settings (${res.status}).`, "error");
    setForm(data.settings);
    toast("Settings saved.");
  };

  const text = (label: string, k: keyof Settings, ph = "") => (
    <label className="text-xs text-gray-500 block">{label}<input value={(form[k] as string) || ""} onChange={(e) => set(k, e.target.value)} placeholder={ph} className={box} /></label>
  );
  const num = (label: string, k: keyof Settings, hint = "") => (
    <label className="text-xs text-gray-500 block">{label}<input type="number" min={0} value={(form[k] as number) ?? ""} onChange={(e) => set(k, e.target.value === "" ? 0 : Number(e.target.value))} className={box} />{hint && <span className="text-[11px] text-gray-400 block mt-1">{hint}</span>}</label>
  );
  const social = (label: string, k: "facebook" | "instagram" | "twitter") => (
    <label className="text-xs text-gray-500 block">{label}<input value={form.socialLinks?.[k] || ""} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, [k]: e.target.value } })} className={box} /></label>
  );
  const card = "rounded-2xl bg-white border border-line p-5 sm:p-6 flex flex-col gap-4";

  return (
    <div className="p-5 max-w-3xl flex flex-col gap-5">
      <div>
        <h1 className="font-display uppercase text-3xl leading-none">Website settings</h1>
        <p className="text-sm text-gray-500 mt-1">How the website looks and how the Backyard earns. Each arena edits its own page under its own login.</p>
      </div>

      <section className={card}>
        <h2 className="font-bold">Website</h2>
        <div className="grid sm:grid-cols-2 gap-3">{text("Website name", "arenaName")}{text("Currency", "currency", "PKR")}</div>
        {text("Home page line (under the big heading)", "tagline", "Book our grounds, enter the next tournament…")}
        <div className="rounded-xl bg-cream p-3 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!form.announcementOn} onChange={(e) => set("announcementOn", e.target.checked)} className="w-4 h-4 accent-black" /> Show an announcement bar at the top of every page</label>
          {text("Announcement", "announcement", "Ramadan Cup registrations are open!")}
          {text("Link when tapped (optional)", "announcementLink", "/tournaments")}
        </div>
      </section>

      <section className={card}>
        <h2 className="font-bold">Money</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {num("Arena membership / month", "arenaMembershipFee", "What an arena pays to be listed")}
          {num("Play request fee", "playRegistrationFee", "Saturday 8 AM game · 0 = free")}
        </div>
        <label className="flex items-start gap-2 text-sm rounded-xl bg-gold/10 border border-amber-300 p-3">
          <input type="checkbox" checked={!!form.requireArenaMembership} onChange={(e) => set("requireArenaMembership", e.target.checked)} className="w-4 h-4 mt-0.5 accent-black" />
          <span><b>Only show arenas that have paid their membership.</b><span className="block text-xs text-gray-600 mt-0.5">When on, an arena disappears from the website — and can't take online bookings — once its paid month ends. Record payments under Clients first, then switch this on.</span></span>
        </label>
      </section>

      <section className={card}>
        <h2 className="font-bold">Contact (shown in the footer)</h2>
        {text("Address", "address")}
        <div className="grid sm:grid-cols-3 gap-3">{text("Phone", "phone")}{text("WhatsApp", "whatsapp")}{text("Email", "email")}</div>
        <div className="grid sm:grid-cols-3 gap-3">{social("Facebook", "facebook")}{social("Instagram", "instagram")}{social("Twitter / X", "twitter")}</div>
      </section>

      <div><button onClick={save} disabled={saving} className="px-6 py-2.5 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button></div>
    </div>
  );
}
