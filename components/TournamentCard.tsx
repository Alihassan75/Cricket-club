import Link from "next/link";
import { Trophy, Calendar, Users, ArrowRight } from "lucide-react";
import { dateRange, gradientFor, relativeStart, STATUS_STYLE } from "@/lib/tournamentLook";

export type CardTournament = {
  _id: string; name: string; startDate: string; endDate: string; status: string; format: string;
  prizeMoney: number; entryFee: number; numberOfTeams: number; teamsTaken?: number; registeredTeams?: unknown[]; coverImage?: string;
};

/** Public tournament card: cover banner, status + countdown, prize/entry boxes and a places-left bar. */
export default function TournamentCard({ t, currency = "PKR" }: { t: CardTournament; currency?: string }) {
  const taken = t.teamsTaken ?? t.registeredTeams?.length ?? 0;
  const pct = Math.min(100, Math.round((taken / Math.max(1, t.numberOfTeams)) * 100));
  const left = t.numberOfTeams - taken;
  const rel = relativeStart(t.startDate, t.endDate, t.status);
  const open = t.status === "Registration Open" && left > 0;

  return (
    <Link href={`/tournaments/${t._id}`} className="group bg-white border border-line rounded-3xl overflow-hidden flex flex-col hover:-translate-y-1.5 hover:shadow-2xl transition duration-300">
      <div className={`relative h-44 bg-gradient-to-br ${gradientFor(t.format)} overflow-hidden`}>
        {t.coverImage ? (
          <img src={t.coverImage} alt="" loading="lazy" className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${rel.past ? "grayscale opacity-80" : ""}`} />
        ) : (
          <>
            <div className="absolute inset-0 opacity-[0.07]" style={{ background: "repeating-linear-gradient(100deg,#fff 0 28px,transparent 28px 56px)" }} />
            <Trophy size={120} className="absolute -right-3 -bottom-4 text-white/15 rotate-12" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <span className={`absolute top-4 left-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${STATUS_STYLE[t.status] || "bg-white/80 text-pitch"}`}>
          {t.status === "Registration Open" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          {t.status}
        </span>
        <span className={`absolute top-4 right-4 text-[11px] font-bold px-3 py-1 rounded-full ${rel.live ? "bg-ball text-white" : "bg-white/90 text-pitch"}`}>{rel.live ? "● LIVE" : rel.label}</span>
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <h3 className="font-display uppercase text-[26px] leading-[1.05] break-words">{t.name}</h3>
          <div className="text-xs text-white/80 mt-1.5 flex items-center gap-1.5"><Calendar size={12} /> {dateRange(t.startDate, t.endDate)}</div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gold/20 px-4 py-3"><div className="text-[10px] font-bold uppercase tracking-wider text-[#8a6410]">Prize money</div><div className="font-display text-xl leading-tight">{currency} {t.prizeMoney.toLocaleString()}</div></div>
          <div className="rounded-2xl bg-cream px-4 py-3"><div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Entry fee</div><div className="font-display text-xl leading-tight">{t.entryFee > 0 ? `${currency} ${t.entryFee.toLocaleString()}` : "Free"}</div></div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span className="flex items-center gap-1.5"><Users size={13} /> <b className="text-pitch">{taken}</b>/{t.numberOfTeams} teams</span>
            <span className={left <= 0 ? "font-semibold text-ball" : left <= 3 ? "font-semibold text-[#8a6410]" : ""}>{left <= 0 ? "Full" : left <= 3 ? `Only ${left} left!` : `${left} spots left`}</span>
          </div>
          <div className="h-2 bg-cream rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct >= 100 ? "bg-gray-400" : "bg-ball"}`} style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="mt-5 pt-4 border-t border-dashed border-line flex items-center justify-between gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-cream text-pitch">{t.format}</span>
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full transition-colors ${open ? "bg-ball text-white group-hover:shadow-lg" : "bg-pitch text-white"}`}>
            {open ? "Register team" : "View details"} <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
