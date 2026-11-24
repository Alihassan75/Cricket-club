"use client";
import { useState } from "react";
import { Plus, X, Users } from "lucide-react";
import { normalizePhone } from "@/lib/phone";
import { useToast } from "@/components/Toast";

export type TeamEntry = {
  _id: string;
  teamName: string;
  captainName: string;
  captainPhone: string;
  viceCaptainName: string;
  viceCaptainPhone: string;
  members: string[];
  notes?: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  feePaid?: boolean;
};

/** Customer form: team name, captain & vice captain (with phones) and the other players. Creates or edits an entry. */
export default function TeamEntryForm({
  tournament,
  entry,
  onClose,
  onSaved,
}: {
  tournament: { _id: string; name: string; entryFee?: number };
  entry?: TeamEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState({
    teamName: entry?.teamName || "",
    captainName: entry?.captainName || "",
    captainPhone: entry?.captainPhone || "",
    viceCaptainName: entry?.viceCaptainName || "",
    viceCaptainPhone: entry?.viceCaptainPhone || "",
    notes: entry?.notes || "",
  });
  const [members, setMembers] = useState<string[]>(entry?.members?.length ? entry.members : ["", ""]);
  const [bad, setBad] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => {
    setF((s) => ({ ...s, [k]: v }));
    if (bad === k) { setBad(""); setError(""); } // the field was fixed — drop its red outline
  };

  const check = (): [string, string] | null => {
    const players = members.map((m) => m.trim()).filter(Boolean);
    if (f.teamName.trim().length < 2) return ["teamName", "Please enter your team name (at least 2 letters)."];
    if (f.captainName.trim().length < 2) return ["captainName", "Please enter the captain's name."];
    if (!normalizePhone(f.captainPhone)) return ["captainPhone", "Enter the captain's phone number, like 0300 1234567."];
    if (f.viceCaptainName.trim().length < 2) return ["viceCaptainName", "Please enter the vice captain's name."];
    if (!normalizePhone(f.viceCaptainPhone)) return ["viceCaptainPhone", "Enter the vice captain's phone number, like 0300 1234567."];
    if (normalizePhone(f.captainPhone) === normalizePhone(f.viceCaptainPhone)) return ["viceCaptainPhone", "The captain and vice captain need different phone numbers."];
    if (players.length < 2) return ["members", "Add at least 2 more players besides the captain and vice captain."];
    if (players.some((p) => p.length < 2)) return ["members", "Each player name needs at least 2 letters."];
    return null;
  };

  const submit = async () => {
    setError("");
    setBad("");
    const problem = check();
    if (problem) {
      setBad(problem[0]);
      setError(problem[1]);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(entry ? `/api/portal/tournament-entries/${entry._id}` : `/api/portal/tournaments/${tournament._id}/entries`, {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, members: members.map((m) => m.trim()).filter(Boolean), notes: f.notes.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Could not save (${res.status}).`);
        return;
      }
      toast(entry ? "Team entry updated." : "Team entered! The club will review it shortly.");
      onSaved();
      onClose();
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const input = (k: keyof typeof f, label: string, ph: string, type = "text") => (
    <label className="block">
      <span className="text-xs font-semibold text-gray-500 mb-1 block">{label}</span>
      <input type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} maxLength={k.includes("Phone") ? 20 : 40}
        className={`field !py-2.5 ${bad === k ? "!border-red-500 ring-2 ring-red-200" : ""}`} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[94vh] overflow-y-auto p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ball">{entry ? "Edit your team" : "Register your team"}</div>
            <h2 className="font-display uppercase text-2xl leading-tight">{tournament.name}</h2>
            {!!tournament.entryFee && <p className="text-xs text-gray-500 mt-1">Entry fee Rs {tournament.entryFee.toLocaleString()} — the club will confirm how to pay after reviewing your team.</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-cream flex items-center justify-center shrink-0"><X size={18} /></button>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
        {entry?.status === "rejected" && entry.adminNote && <div className="mb-4 rounded-xl bg-amber-100 px-3 py-2 text-sm"><b>Club note:</b> {entry.adminNote}</div>}

        <div className="flex flex-col gap-3.5">
          {input("teamName", "Team name", "e.g. Lahore Lions")}
          <div className="rounded-2xl bg-cream/70 p-3.5 flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-pitch">Captain</div>
            <div className="grid sm:grid-cols-2 gap-3">{input("captainName", "Name", "Captain's full name")}{input("captainPhone", "Phone number", "0300 1234567", "tel")}</div>
          </div>
          <div className="rounded-2xl bg-cream/70 p-3.5 flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-pitch">Vice captain</div>
            <div className="grid sm:grid-cols-2 gap-3">{input("viceCaptainName", "Name", "Vice captain's full name")}{input("viceCaptainPhone", "Phone number", "0300 1234567", "tel")}</div>
          </div>

          <div className={`rounded-2xl p-3.5 ${bad === "members" ? "bg-red-50 ring-2 ring-red-200" : "bg-cream/70"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-pitch flex items-center gap-1.5"><Users size={14} /> Other players ({members.filter((m) => m.trim()).length})</div>
              {members.length < 15 && (
                <button type="button" onClick={() => setMembers((m) => [...m, ""])} className="text-xs font-semibold text-ball flex items-center gap-1"><Plus size={14} /> Add player</button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {members.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input value={m} maxLength={40} onChange={(e) => { setMembers((arr) => arr.map((x, j) => (j === i ? e.target.value : x))); if (bad === "members") { setBad(""); setError(""); } }} placeholder={`Player ${i + 1} name`} className="field !py-2.5" />
                  {members.length > 2 && (
                    <button type="button" aria-label="Remove player" onClick={() => setMembers((arr) => arr.filter((_, j) => j !== i))} className="w-10 shrink-0 rounded-xl border border-line text-gray-400 hover:text-ball flex items-center justify-center"><X size={16} /></button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Besides the captain and vice captain. At least 2 players.</p>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1 block">Notes for the club (optional)</span>
            <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={300} className="field !py-2.5" placeholder="Anything we should know?" />
          </label>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} type="button" className="px-5 py-3 rounded-full text-sm font-semibold text-gray-500">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-ball flex-1">{busy ? "Saving…" : entry ? "Save changes" : "Submit team"}</button>
        </div>
      </div>
    </div>
  );
}
