"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone, MessageCircle, Mail, Download, Search, Trash2, Users, CalendarDays, Clock, Banknote } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useRole } from "@/components/RoleContext";

type Inquiry = {
  _id: string; name: string; phone: string; email: string; preferredDate?: string; preferredTime: string; players?: number;
  source?: string; message?: string; registrationFee?: number; feePaid?: boolean; paymentProofUrl?: string; paymentMethod?: string; paymentReference?: string; status: "new" | "contacted" | "booked" | "closed"; note?: string; createdAt: string;
};
const TABS = ["all", "new", "contacted", "booked", "closed"] as const;
const STYLE: Record<string, string> = {
  new: "bg-ball text-white", contacted: "bg-amber-100 text-amber-700", booked: "bg-emerald-50 text-emerald-700", closed: "bg-gray-200 text-gray-600",
};
const wa = (phone: string, text: string) => `https://wa.me/${phone.startsWith("+") ? phone.slice(1) : "92" + phone.replace(/^0/, "")}?text=${encodeURIComponent(text)}`;
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

export default function InquiriesPage() {
  const toast = useToast();
  const role = useRole();
  const [list, setList] = useState<Inquiry[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("new");
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/inquiries");
    const data = await res.json().catch(() => ({}));
    setList(res.ok ? data.inquiries || [] : []);
    if (!res.ok) toast(data.error || "Could not load play requests.", "error");
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list?.length || 0, new: 0, contacted: 0, booked: 0, closed: 0 };
    list?.forEach((i) => c[i.status]++);
    return c;
  }, [list]);
  const shown = (list || []).filter((i) => (tab === "all" || i.status === tab) && (!q.trim() || [i.name, i.phone, i.email, i.message || "", i.preferredTime].join(" ").toLowerCase().includes(q.trim().toLowerCase())));

  const patch = async (i: Inquiry, body: object, ok?: string) => {
    const res = await fetch(`/api/inquiries/${i._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error || `Could not update (${res.status}).`, "error");
    if (ok) toast(ok);
    load();
  };
  const remove = async (i: Inquiry) => {
    if (!confirm(`Delete the request from ${i.name}? This can't be undone.`)) return;
    const res = await fetch(`/api/inquiries/${i._id}`, { method: "DELETE" });
    toast(res.ok ? "Request deleted." : "Could not delete.", res.ok ? "info" : "error");
    load();
  };
  const csv = () => {
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Name", "Phone", "Email", "Day", "Time", "Players", "Found us on", "Message", "Registration fee", "Fee paid", "Payment method", "Payment reference", "Screenshot", "Status", "Note", "Received"]].concat(
      (list || []).map((i) => [i.name, i.phone, i.email, i.preferredDate || "", i.preferredTime, String(i.players || ""), i.source || "", i.message || "", String(i.registrationFee ?? 0), i.feePaid ? "Yes" : "No", i.paymentMethod || "", i.paymentReference || "", i.paymentProofUrl ? (i.paymentProofUrl.startsWith("http") ? i.paymentProofUrl : window.location.origin + i.paymentProofUrl) : "", i.status, i.note || "", new Date(i.createdAt).toLocaleString("en-GB")])
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "play-requests.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none">Play requests</h1>
          <p className="text-sm text-gray-500 mt-1">People from Instagram, Facebook and the website who want to play. Call or WhatsApp them to fix a slot.</p>
        </div>
        <button onClick={csv} disabled={!list?.length} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold border border-line bg-white disabled:opacity-50"><Download size={14} /> Download list</button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex bg-white border border-line rounded-full p-1 text-xs font-semibold overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3.5 py-1.5 rounded-full capitalize whitespace-nowrap ${tab === t ? "bg-gradient-to-br from-green to-[#0b4a24] text-white" : "text-gray-500"}`}>{t} {counts[t]}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or email" className="w-full rounded-full pl-9 pr-3 py-2 text-sm border border-line bg-white outline-none" />
        </div>
      </div>

      {list === null ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)}</div>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-10 text-center text-sm text-gray-500">
          <div className="text-4xl mb-2">📭</div>
          {list.length === 0 ? `No play requests yet. Share your play link on Instagram and Facebook: ${typeof window !== "undefined" ? window.location.origin : ""}/play` : "Nothing here — try another tab."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((i) => (
            <div key={i._id} className="bg-white border border-line rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-base">{i.name}</div>
                  <div className="text-[11px] text-gray-400">{ago(i.createdAt)}{i.source ? ` · via ${i.source}` : ""}</div>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${STYLE[i.status]}`}>{i.status}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className="flex items-center gap-1.5 bg-cream rounded-full px-3 py-1.5"><CalendarDays size={13} /> {i.preferredDate || "Saturday"}</span>
                <span className="flex items-center gap-1.5 bg-cream rounded-full px-3 py-1.5"><Clock size={13} /> {i.preferredTime}</span>
                {!!i.registrationFee && (
                  <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${i.feePaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-700"}`}><Banknote size={13} /> Rs {i.registrationFee.toLocaleString()} fee · {i.feePaid ? "paid" : "not paid yet"}</span>
                )}
                {!!i.players && <span className="flex items-center gap-1.5 bg-cream rounded-full px-3 py-1.5"><Users size={13} /> {i.players} players</span>}
              </div>
              {i.paymentProofUrl && (
                <div className="flex items-center gap-3 mt-3 rounded-xl border border-line bg-cream/60 p-2.5">
                  <a href={i.paymentProofUrl} target="_blank" rel="noreferrer" className="shrink-0"><img src={i.paymentProofUrl} alt="Payment screenshot" className="w-16 h-16 rounded-lg object-cover border border-line" /></a>
                  <div className="text-xs">
                    <div className="font-bold text-sm">Payment screenshot</div>
                    <div className="text-gray-600">{i.paymentMethod}{i.paymentReference ? ` · Ref ${i.paymentReference}` : ""}</div>
                    <a href={i.paymentProofUrl} target="_blank" rel="noreferrer" className="text-ball font-semibold">Open full size</a>
                  </div>
                </div>
              )}
              {i.message && <p className="text-sm text-gray-600 mt-3 bg-cream/60 rounded-xl px-3 py-2">“{i.message}”</p>}

              <div className="flex flex-wrap gap-2 mt-3">
                <a href={`tel:${i.phone}`} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white bg-pitch"><Phone size={13} /> {i.phone}</a>
                <a href={wa(i.phone, `Hi ${i.name.split(" ")[0]}, thanks for your interest in playing at Backyard Cricket Club! You asked for ${i.preferredDate ? i.preferredDate + " · " : ""}${i.preferredTime}.${i.registrationFee ? ` The registration fee is Rs ${i.registrationFee}.` : ""} Shall we confirm it?`)} target="_blank" rel="noreferrer" onClick={() => i.status === "new" && patch(i, { status: "contacted" })} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white bg-green"><MessageCircle size={13} /> WhatsApp</a>
                <a href={`mailto:${i.email}`} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold border border-line"><Mail size={13} /> {i.email}</a>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-dashed border-line">
                {!!i.registrationFee && <button onClick={() => patch(i, { feePaid: !i.feePaid }, i.feePaid ? "Fee marked as not paid." : "Fee marked as paid.")} className={`text-xs font-bold px-3.5 py-1.5 rounded-full ${i.feePaid ? "bg-gray-200 text-gray-600" : "bg-gradient-to-br from-green to-[#0b4a24] text-white"}`}>{i.feePaid ? "Undo fee paid" : "Fee received"}</button>}
                {i.status === "new" && <button onClick={() => patch(i, { status: "contacted" }, "Marked as contacted.")} className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-700">Mark contacted</button>}
                {i.status !== "booked" && i.status !== "closed" && <button onClick={() => patch(i, { status: "booked" }, "Marked as booked 🎉")} className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-green text-white">Booked</button>}
                {i.status !== "closed" && <button onClick={() => patch(i, { status: "closed" }, "Closed.")} className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-gray-200 text-gray-600">Close</button>}
                {i.status !== "new" && <button onClick={() => patch(i, { status: "new" }, "Reopened.")} className="text-xs font-semibold text-gray-500 px-2">Reopen</button>}
                <input
                  value={notes[i._id] ?? i.note ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [i._id]: e.target.value }))}
                  onBlur={() => notes[i._id] !== undefined && notes[i._id] !== (i.note ?? "") && patch(i, { note: notes[i._id] })}
                  placeholder="Add a private note…" maxLength={500}
                  className="flex-1 min-w-[160px] rounded-lg px-3 py-1.5 text-xs border border-line bg-gray-50 outline-none"
                />
                {role === "super_admin" && <button onClick={() => remove(i)} aria-label="Delete" className="text-gray-300 hover:text-ball p-1"><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
