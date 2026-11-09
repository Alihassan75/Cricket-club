"use client";
import { useEffect, useState } from "react";

type Settings = {
  arenaName: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  currency: string;
  taxPercent: number;
  openingTime: string;
  closingTime: string;
  bookingRules?: string;
  cancellationPolicy?: string;
  advancePaymentPercent: number;
  paymentInstructions?: string;
  holdMinutes?: number;
  socialLinks: { facebook?: string; instagram?: string; twitter?: string };
};

export default function SettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        setForm(d.settings);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setForm(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert(data.error || `Could not save settings (${res.status}).`);
    }
  };

  if (loading || !form) return <div className="p-6 text-sm text-gray-500">Loading settings…</div>;

  const field = (label: string, key: keyof Settings, type = "text") => (
    <label className="text-xs text-gray-500">
      {label}
      <input
        type={type}
        value={(form[key] as string) || ""}
        onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5"
      />
    </label>
  );

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="font-display uppercase text-3xl leading-none mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-5">Arena details, currency, tax, and booking policy.</p>

      <div className="rounded-2xl bg-white border border-line p-6 flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {field("Arena name", "arenaName")}
          {field("Currency", "currency")}
        </div>
        {field("Address", "address")}
        <div className="grid sm:grid-cols-3 gap-3">
          {field("Phone", "phone")}
          {field("WhatsApp", "whatsapp")}
          {field("Email", "email")}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          {field("Opening time", "openingTime", "time")}
          {field("Closing time", "closingTime", "time")}
          {field("Tax %", "taxPercent", "number")}
          {field("Advance payment %", "advancePaymentPercent", "number")}
          {field("Hold unpaid bookings for (minutes)", "holdMinutes", "number")}
        </div>
        <label className="text-xs text-gray-500">
          Payment instructions (shown to customers when they book)
          <textarea
            value={form.paymentInstructions || ""}
            onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })}
            rows={3}
            placeholder={"JazzCash / Easypaisa: 0300-1234567 (Ali Hassan)\nBank: HBL · IBAN PK00 0000 0000 0000"}
            className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5"
          />
        </label>
        <label className="text-xs text-gray-500">
          Booking rules
          <textarea
            value={form.bookingRules || ""}
            onChange={(e) => setForm({ ...form, bookingRules: e.target.value })}
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5"
          />
        </label>
        <label className="text-xs text-gray-500">
          Cancellation policy
          <textarea
            value={form.cancellationPolicy || ""}
            onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })}
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5"
          />
        </label>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-xs text-gray-500">
            Facebook
            <input value={form.socialLinks?.facebook || ""} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, facebook: e.target.value } })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" />
          </label>
          <label className="text-xs text-gray-500">
            Instagram
            <input value={form.socialLinks?.instagram || ""} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, instagram: e.target.value } })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" />
          </label>
          <label className="text-xs text-gray-500">
            Twitter / X
            <input value={form.socialLinks?.twitter || ""} onChange={(e) => setForm({ ...form, socialLinks: { ...form.socialLinks, twitter: e.target.value } })} className="w-full rounded-lg px-3 py-2 text-sm border border-line bg-gray-50 outline-none mt-0.5" />
          </label>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && <span className="text-xs text-green font-semibold">Saved</span>}
        </div>
      </div>
    </div>
  );
}
