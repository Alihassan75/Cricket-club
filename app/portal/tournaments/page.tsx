"use client";
import { useCallback, useEffect, useState } from "react";
import { Trophy, Users, Calendar, Pencil, Trash2, Phone } from "lucide-react";
import { useToast } from "@/components/Toast";
import TeamEntryForm, { TeamEntry } from "@/components/TeamEntryForm";
import { dateRange, gradientFor, relativeStart } from "@/lib/tournamentLook";

type Tournament = {
  _id: string; name: string; startDate: string; endDate: string; numberOfTeams: number;
  entryFee: number; prizeMoney: number; format: string; status: string; coverImage?: string;
  teamsTaken?: number; registeredTeams?: unknown[]; myEntries?: TeamEntry[];
};

const STATUS: Record<string, string> = {
  "Registration Open": "bg-green text-white",
  Ongoing: "bg-ball text-white",
  Upcoming: "bg-gold text-pitch",
  Completed: "bg-gray-200 text-gray-600",
};
const ENTRY_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};
const ENTRY_LABEL: Record<string, string> = { pending: "Waiting for the club", approved: "Approved", rejected: "Not accepted" };

export default function PortalTournamentsPage() {
  const toast = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ t: Tournament; entry?: TeamEntry } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/tournaments");
    const data = await res.json().catch(() => ({}));
    setTournaments(data.tournaments || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const withdraw = async (id: string) => {
    const res = await fetch(`/api/portal/tournament-entries/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setConfirmDel(null);
    toast(res.ok ? "Entry withdrawn." : data.error || "Could not withdraw.", res.ok ? "info" : "error");
    load();
  };

  return (
    <div>
      <h1 className="font-display uppercase text-3xl leading-none">Tournaments</h1>
      <p className="text-sm text-gray-500 mt-1 mb-5">Enter your team with your captain, vice captain and players. The club reviews every entry.</p>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-5">{[0, 1].map((i) => <div key={i} className="skeleton h-72" />)}</div>
      ) : tournaments.length === 0 ? (
        <div className="bg-white border border-line rounded-3xl p-10 text-center text-sm text-gray-500">
          <div className="text-4xl mb-2">🏆</div>No tournaments announced yet — check back soon.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5 items-start">
          {tournaments.map((t) => {
            const taken = t.teamsTaken ?? t.registeredTeams?.length ?? 0;
            const pct = Math.min(100, Math.round((taken / Math.max(1, t.numberOfTeams)) * 100));
            const full = taken >= t.numberOfTeams;
            const closed = t.status === "Completed" || t.status === "Ongoing";
            const mine = t.myEntries || [];
            return (
              <div key={t._id} className="hover-lift bg-white border border-line rounded-3xl overflow-hidden flex flex-col">
                <div className={`bg-gradient-to-br ${gradientFor(t.format)} text-white p-5 pt-6 relative overflow-hidden min-h-[9.5rem] flex flex-col justify-end`}>
                  {t.coverImage && <><img src={t.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" /><div className="absolute inset-0 bg-gradient-to-t from-pitch/90 to-pitch/20" /></>}
                  {!t.coverImage && <Trophy size={96} className="absolute -right-2 -bottom-3 text-white/15 rotate-12" />}
                  <span className={`absolute top-4 left-4 text-[11px] font-bold px-3 py-1 rounded-full ${STATUS[t.status] || "bg-white/20"}`}>{t.status}</span>
                  <span className={`absolute top-4 right-4 text-[11px] font-bold px-3 py-1 rounded-full ${relativeStart(t.startDate, t.endDate, t.status).live ? "bg-ball text-white" : "bg-white/90 text-pitch"}`}>{relativeStart(t.startDate, t.endDate, t.status).label}</span>
                  <div className="font-display uppercase text-2xl mt-3 leading-tight relative">{t.name}</div>
                  <div className="text-xs text-white/80 mt-1 flex items-center gap-1 relative"><Calendar size={12} /> {dateRange(t.startDate, t.endDate)} · {t.format}</div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-amber-100 rounded-2xl p-3"><div className="text-[11px] text-gray-500">Prize money</div><div className="font-display text-xl">Rs {t.prizeMoney.toLocaleString()}</div></div>
                    <div className="bg-cream rounded-2xl p-3"><div className="text-[11px] text-gray-500">Entry fee</div><div className="font-display text-xl">Rs {t.entryFee.toLocaleString()}</div></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span className="flex items-center gap-1"><Users size={12} /> {taken}/{t.numberOfTeams} teams</span>
                    <span>{full ? "Full" : `${t.numberOfTeams - taken} spots left`}</span>
                  </div>
                  <div className="h-2 bg-cream rounded-full overflow-hidden mb-4"><div className="h-full bg-ball rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>

                  {mine.length > 0 && (
                    <div className="flex flex-col gap-2.5 mb-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Your teams</div>
                      {mine.map((e) => (
                        <div key={e._id} className="rounded-2xl border border-line p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-sm truncate">{e.teamName}</div>
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${ENTRY_STYLE[e.status]}`}>{ENTRY_LABEL[e.status]}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Phone size={11} /> {e.captainName} · {e.captainPhone}</div>
                          <div className="text-xs text-gray-500">{e.members.length + 2} players</div>
                          {e.adminNote && <div className="text-xs mt-1.5 rounded-lg bg-cream px-2.5 py-1.5"><b>Club:</b> {e.adminNote}</div>}
                          {e.status !== "approved" ? (
                            confirmDel === e._id ? (
                              <div className="pop-in flex items-center gap-2 mt-2 text-xs">
                                <span className="text-gray-500">Withdraw this team?</span>
                                <button onClick={() => withdraw(e._id)} className="font-bold text-white bg-ball px-3 py-1.5 rounded-full">Yes</button>
                                <button onClick={() => setConfirmDel(null)} className="font-semibold text-gray-500">No</button>
                              </div>
                            ) : (
                              <div className="flex gap-4 mt-2 text-xs font-semibold">
                                <button onClick={() => setForm({ t, entry: e })} className="text-pitch flex items-center gap-1"><Pencil size={12} /> {e.status === "rejected" ? "Fix & resubmit" : "Edit"}</button>
                                <button onClick={() => setConfirmDel(e._id)} className="text-ball flex items-center gap-1"><Trash2 size={12} /> Withdraw</button>
                              </div>
                            )
                          ) : <div className="text-[11px] text-gray-400 mt-1.5">Approved — contact the club to change anything.</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => setForm({ t })} disabled={full || closed} className="btn-ball w-full mt-auto">
                    {closed ? "Registration closed" : full ? "Tournament full" : mine.length > 0 ? "Register another team" : "Register your team"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && <TeamEntryForm tournament={form.t} entry={form.entry} onClose={() => setForm(null)} onSaved={load} />}
    </div>
  );
}
