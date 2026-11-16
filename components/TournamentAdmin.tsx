"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Phone, MessageCircle, Download, Check, Ban, Trash2, Search } from "lucide-react";
import { useToast } from "@/components/Toast";

export type AdminTournament = {
  _id: string; name: string; startDate: string; endDate: string; numberOfTeams: number; entryFee: number; prizeMoney: number;
  format: string; status: string; rules?: string; coverImage?: string; teamsTaken?: number; entryCount?: number; registeredTeams?: unknown[];
};
type Entry = {
  _id: string; teamName: string; captainName: string; captainPhone: string; viceCaptainName: string; viceCaptainPhone: string;
  members: string[]; notes?: string; status: "pending" | "approved" | "rejected"; adminNote?: string; feePaid: boolean; createdAt: string;
};

const wa = (phone: string) => `https://wa.me/${phone.startsWith("+") ? phone.slice(1) : "92" + phone.replace(/^0/, "")}`;
const STATUS_STYLE: Record<string, string> = { pending: "bg-gold/25 text-[#8a6410]", approved: "bg-green/15 text-green", rejected: "bg-ball/10 text-ball" };

function Shell({ title, sub, onClose, children, wide }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[94vh] overflow-y-auto p-5 sm:p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-lg leading-tight">{title}</h2>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-cream flex items-center justify-center shrink-0"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Edit tournament */
export function EditTournamentModal({ tournament, onClose, onSaved }: { tournament: AdminTournament; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    name: tournament.name, startDate: tournament.startDate, endDate: tournament.endDate, numberOfTeams: tournament.numberOfTeams,
    entryFee: tournament.entryFee, prizeMoney: tournament.prizeMoney, format: tournament.format, status: tournament.status,
    rules: tournament.rules || "", coverImage: tournament.coverImage || "",
  });
  const [bad, setBad] = useState("");
  const removeTournament = async () => {
    if (!confirm(`Delete "${tournament.name}"? Its team entries will be removed too. This can't be undone.`)) return;
    setSaving(true);
    const res = await fetch(`/api/tournaments/${tournament._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast(data.error || `Could not delete (${res.status}).`, "error");
    toast(`"${tournament.name}" was deleted.`);
    onSaved();
    onClose();
  };
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const taken = tournament.teamsTaken ?? tournament.registeredTeams?.length ?? 0;
  const cls = (k: string) => `w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 outline-none mt-0.5 ${bad === k ? "border-red-500 ring-2 ring-red-200" : "border-line"}`;

  const save = async () => {
    setError("");
    setBad("");
    const problem: [string, string] | null =
      f.name.trim().length < 2 ? ["name", "Please enter a tournament name (at least 2 letters)."]
      : !f.startDate ? ["startDate", "Please choose a start date."]
      : !f.endDate ? ["endDate", "Please choose an end date."]
      : f.endDate < f.startDate ? ["endDate", "The end date can't be before the start date."]
      : !Number.isInteger(Number(f.numberOfTeams)) || Number(f.numberOfTeams) < 2 ? ["numberOfTeams", "A tournament needs at least 2 teams."]
      : Number(f.numberOfTeams) < taken ? ["numberOfTeams", `${taken} teams are already entered, so it can't go below ${taken}.`]
      : Number(f.entryFee) < 0 ? ["entryFee", "Entry fee can't be negative."]
      : Number(f.prizeMoney) < 0 ? ["prizeMoney", "Prize money can't be negative."]
      : null;
    if (problem) { setBad(problem[0]); setError(problem[1]); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament._id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, name: f.name.trim(), numberOfTeams: Number(f.numberOfTeams), entryFee: Number(f.entryFee), prizeMoney: Number(f.prizeMoney), coverImage: f.coverImage.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `Could not save (${res.status}).`); toast(data.error || "Could not save.", "error"); return; }
      toast(`"${f.name.trim()}" updated.`);
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Shell title="Edit tournament" sub={tournament.name} onClose={onClose}>
      {error && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
      <div className="flex flex-col gap-3">
        <label className="text-xs text-gray-500">Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={cls("name")} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500">Start date<input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className={cls("startDate")} /></label>
          <label className="text-xs text-gray-500">End date<input type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} className={cls("endDate")} /></label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-gray-500">Teams<input type="number" min={2} value={f.numberOfTeams} onChange={(e) => setF({ ...f, numberOfTeams: Number(e.target.value) })} className={cls("numberOfTeams")} /></label>
          <label className="text-xs text-gray-500">Entry fee<input type="number" min={0} value={f.entryFee} onChange={(e) => setF({ ...f, entryFee: Number(e.target.value) })} className={cls("entryFee")} /></label>
          <label className="text-xs text-gray-500">Prize money<input type="number" min={0} value={f.prizeMoney} onChange={(e) => setF({ ...f, prizeMoney: Number(e.target.value) })} className={cls("prizeMoney")} /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500">Format
            <select value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })} className={cls("format")}><option>League</option><option>Knockout</option><option>Round Robin</option></select>
          </label>
          <label className="text-xs text-gray-500">Status
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={cls("status")}><option>Upcoming</option><option>Registration Open</option><option>Ongoing</option><option>Completed</option></select>
          </label>
        </div>
        <p className="text-[11px] text-gray-500 -mt-1">Teams can only enter while the status is <b>Upcoming</b> or <b>Registration Open</b>.</p>
        <label className="text-xs text-gray-500">Rules (shown to teams)<textarea value={f.rules} onChange={(e) => setF({ ...f, rules: e.target.value })} rows={3} className={cls("rules")} /></label>
        <label className="text-xs text-gray-500">Cover picture link (optional)
          <input value={f.coverImage} onChange={(e) => setF({ ...f, coverImage: e.target.value })} placeholder="https://… or /demo/tournament-cover-1.svg" className={cls("coverImage")} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 mt-5">
        <button onClick={removeTournament} disabled={saving} className="mr-auto px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-60">Delete tournament</button>
        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
        <button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ Registrations */
export function EntriesModal({ tournament, onClose, onChanged }: { tournament: AdminTournament; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournament._id}/entries`);
    const data = await res.json().catch(() => ({}));
    setEntries(res.ok ? data.entries || [] : []);
    if (!res.ok) toast(data.error || "Could not load the entries.", "error");
  }, [tournament._id, toast]);
  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: object, okMsg?: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/tournament-entries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast(data.error || `Could not update (${res.status}).`, "error");
      if (okMsg) toast(okMsg);
      await load();
      onChanged();
    } finally { setBusy(null); }
  };
  const remove = async (e: Entry) => {
    if (!confirm(`Delete the entry from "${e.teamName}"? This can't be undone.`)) return;
    const res = await fetch(`/api/tournament-entries/${e._id}`, { method: "DELETE" });
    toast(res.ok ? "Entry deleted." : "Could not delete.", res.ok ? "info" : "error");
    load(); onChanged();
  };

  const counts = useMemo(() => {
    const c = { all: entries?.length || 0, pending: 0, approved: 0, rejected: 0 };
    entries?.forEach((e) => c[e.status]++);
    return c;
  }, [entries]);
  const shown = (entries || []).filter((e) => (tab === "all" || e.status === tab) && (!q.trim() || [e.teamName, e.captainName, e.viceCaptainName, e.captainPhone, e.viceCaptainPhone, ...e.members].join(" ").toLowerCase().includes(q.trim().toLowerCase())));

  const csv = () => {
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Team", "Captain", "Captain phone", "Vice captain", "Vice captain phone", "Players", "Status", "Entry fee received", "Notes", "Submitted"]]
      .concat((entries || []).map((e) => [e.teamName, e.captainName, e.captainPhone, e.viceCaptainName, e.viceCaptainPhone, e.members.join("; "), e.status, e.feePaid ? "Yes" : "No", e.notes || "", new Date(e.createdAt).toLocaleString("en-GB")]));
    const blob = new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tournament.name.replace(/[^\w]+/g, "-")}-teams.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Shell wide title={`Team entries · ${tournament.name}`} sub={`${counts.approved} approved · ${counts.pending} waiting · ${counts.rejected} rejected — ${tournament.numberOfTeams} places`} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex bg-cream rounded-full p-1 text-xs font-semibold">
          {(["all", "pending", "approved", "rejected"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full capitalize ${tab === t ? "bg-pitch text-white" : "text-gray-500"}`}>{t} {counts[t]}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team, name or phone" className="w-full rounded-full pl-9 pr-3 py-2 text-sm border border-line bg-gray-50 outline-none" />
        </div>
        <button onClick={csv} disabled={!entries?.length} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold border border-line bg-white disabled:opacity-50"><Download size={14} /> Download list</button>
      </div>

      {entries === null ? (
        <div className="flex flex-col gap-3">{[0, 1].map((i) => <div key={i} className="skeleton h-28" />)}</div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">{entries.length === 0 ? "No teams have entered yet." : "No entries match this filter."}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((e) => (
            <div key={e._id} className="rounded-2xl border border-line p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold text-base">{e.teamName}</div>
                  <div className="text-[11px] text-gray-400">Entered {new Date(e.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
                    <input type="checkbox" checked={e.feePaid} disabled={busy === e._id} onChange={(ev) => patch(e._id, { feePaid: ev.target.checked })} className="w-4 h-4 accent-green" /> Fee received
                  </label>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLE[e.status]}`}>{e.status}</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
                {[["Captain", e.captainName, e.captainPhone], ["Vice captain", e.viceCaptainName, e.viceCaptainPhone]].map(([role, name, phone]) => (
                  <div key={role} className="rounded-xl bg-cream/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{role}</div>
                    <div className="font-semibold">{name}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <a href={`tel:${phone}`} className="flex items-center gap-1 font-semibold text-pitch"><Phone size={12} /> {phone}</a>
                      <a href={wa(phone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-green"><MessageCircle size={12} /> WhatsApp</a>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {e.members.map((m, i) => <span key={i} className="text-xs bg-white border border-line rounded-full px-2.5 py-1">{m}</span>)}
              </div>
              {e.notes && <p className="text-xs text-gray-600 mt-2"><b>Team note:</b> {e.notes}</p>}
              {e.adminNote && <p className="text-xs text-gray-600 mt-1"><b>Your note:</b> {e.adminNote}</p>}

              {rejecting === e._id ? (
                <div className="pop-in flex flex-wrap gap-2 mt-3">
                  <input value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={200} placeholder="Reason (the team will see this)" className="flex-1 min-w-[180px] rounded-lg px-3 py-2 text-sm border border-line bg-white outline-none" />
                  <button onClick={async () => { await patch(e._id, { status: "rejected", adminNote: note }, "Entry rejected."); setRejecting(null); setNote(""); }} className="px-4 py-2 text-sm font-semibold text-white bg-ball rounded-lg">Reject</button>
                  <button onClick={() => { setRejecting(null); setNote(""); }} className="px-3 py-2 text-sm text-gray-500">Cancel</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {e.status !== "approved" && <button disabled={busy === e._id} onClick={() => patch(e._id, { status: "approved" }, "Entry approved.")} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60"><Check size={15} /> Approve</button>}
                  {e.status !== "rejected" && <button disabled={busy === e._id} onClick={() => { setRejecting(e._id); setNote(e.adminNote || ""); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 bg-red-50 rounded-lg"><Ban size={15} /> Reject</button>}
                  {e.status === "approved" && <button disabled={busy === e._id} onClick={() => patch(e._id, { status: "pending" }, "Moved back to waiting.")} className="px-3 py-2 text-xs font-semibold text-gray-500">Move back to waiting</button>}
                  <button onClick={() => remove(e)} className="ml-auto flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-ball"><Trash2 size={14} /> Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
