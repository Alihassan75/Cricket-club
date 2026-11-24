"use client";
import { useEffect, useState } from "react";
import { Phone, MessageCircle, Mail, MapPin, User } from "lucide-react";
import CountUp from "@/components/CountUp";
import { useToast } from "@/components/Toast";

type Customer = {
  fullName: string; phone: string; whatsapp?: string; email?: string; address?: string;
  totalBookings: number; totalSpending: number;
};

export default function PortalProfilePage() {
  const toast = useToast();
  const [form, setForm] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/portal/profile");
        const text = await r.text();
        const d = text ? JSON.parse(text) : {};
        if (!r.ok || !d.customer) throw new Error(d.error || `Profile request failed (${r.status})`);
        const c = d.customer as Customer;
        // placeholder phones created for accounts without a number are shown as empty
        setForm({ ...c, phone: /^(unknown|no-phone-)/.test(c.phone) ? "" : c.phone });
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const res = await fetch("/api/portal/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: form.fullName, phone: form.phone, whatsapp: form.whatsapp, email: form.email, address: form.address }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setForm(data.customer);
      toast("Profile saved");
    } else toast(data.error || "Could not save profile", "error");
  };

  if (loading) return <div className="skeleton h-96 max-w-2xl" />;
  if (!form) {
    return (
      <div className="bg-white border border-line rounded-3xl p-6 max-w-xl text-sm">
        <p className="text-ball font-semibold mb-1">Could not load your profile.</p>
        <p className="text-gray-500 mb-4 break-words">{loadError}</p>
        <button onClick={() => window.location.reload()} className="btn-ball">Try again</button>
      </div>
    );
  }

  const initials = form.fullName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const fields: { key: keyof Customer; label: string; icon: any; type?: string }[] = [
    { key: "fullName", label: "Full name", icon: User },
    { key: "phone", label: "Phone", icon: Phone },
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { key: "email", label: "Email", icon: Mail, type: "email" },
    { key: "address", label: "Address", icon: MapPin },
  ];

  return (
    <div className="max-w-2xl">
      <div className="bg-pitch text-white rounded-3xl p-6 flex items-center gap-5 mb-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-ball/70" />
        <div className="w-20 h-20 rounded-full bg-gold text-pitch font-display text-3xl flex items-center justify-center shrink-0 relative">{initials}</div>
        <div className="relative">
          <div className="font-display uppercase text-3xl leading-none">{form.fullName}</div>
          <div className="text-sm text-white/60 mt-1">Club member</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-line rounded-2xl p-5 text-center">
          <div className="font-display text-4xl"><CountUp value={form.totalBookings} /></div>
          <div className="text-xs text-gray-500">Bookings made</div>
        </div>
        <div className="bg-gold rounded-2xl p-5 text-center text-pitch">
          <div className="font-display text-4xl"><CountUp value={form.totalSpending} prefix="Rs " /></div>
          <div className="text-xs opacity-70">Total spent</div>
        </div>
      </div>

      <div className="bg-white border border-line rounded-3xl p-6 flex flex-col gap-4">
        <h2 className="font-display uppercase text-xl">Contact details</h2>
        {fields.map((f) => {
          const Icon = f.icon;
          return (
            <label key={f.key as string} className="block">
              <span className="text-xs font-semibold text-gray-500 mb-1 block">{f.label}</span>
              <div className="relative">
                <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={f.type || "text"} value={(form[f.key] as string) || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="field !pl-10" />
              </div>
            </label>
          );
        })}
        <button onClick={save} disabled={saving} className="btn-ball w-fit">{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </div>
  );
}
