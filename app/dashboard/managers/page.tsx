"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, X, KeyRound, Power } from "lucide-react";
import { useToast } from "@/components/Toast";
import { ROLE_LABEL, ROLE_BLURB } from "@/lib/roles";

type Manager = { _id: string; name: string; email: string; phone?: string; role: string; isActive?: boolean; arena?: { _id: string; name: string } | null };
type ArenaLite = { _id: string; name: string };
type Creds = { name: string; email: string; password: string; promoted?: boolean };

export default function ManagersPage() {
  const toast = useToast();
  const [list, setList] = useState<Manager[] | null>(null);
  const [me, setMe] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "arena_manager", password: "", arenaId: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<Creds | null>(null);
  const [arenas, setArenas] = useState<ArenaLite[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/managers");
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setList(data.managers || []); setMe(String(data.me || "")); }
    else { setList([]); toast(data.error || "Could not load managers.", "error"); }
  }, [toast]);
  useEffect(() => { load(); fetch("/api/arenas").then((r) => r.json().catch(() => ({}))).then((d) => setArenas(d.arenas || [])); }, [load]);

  const add = async () => {
    setError("");
    if (f.name.trim().length < 2) return setError("Please enter the manager's name.");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("Please enter a valid email address.");
    if (f.role !== "super_admin" && !f.arenaId) return setError("Please choose which arena this person works for.");
    if (f.password && f.password.length < 8) return setError("Password must be at least 8 characters (or leave it empty to generate one).");
    setBusy(true);
    try {
      const res = await fetch("/api/managers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined, password: f.password || undefined, arenaId: f.role === "super_admin" ? undefined : f.arenaId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || `Could not save (${res.status}).`);
      setAdding(false);
      setF({ name: "", email: "", phone: "", role: "arena_manager", password: "", arenaId: "" });
      setCreds({ name: data.manager.name, email: data.manager.email, password: data.password || "", promoted: data.promoted });
      load();
    } finally { setBusy(false); }
  };

  const patch = async (m: Manager, body: object, ok: string) => {
    const res = await fetch(`/api/managers/${m._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error || `Could not update (${res.status}).`, "error");
    toast(ok);
    if (data.password) setCreds({ name: m.name, email: m.email, password: data.password });
    load();
  };
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast("Copied.", "info")).catch(() => {});

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none">Managers</h1>
          <p className="text-sm text-gray-500 mt-1">Only the Backyard Manager sees this page. Add people who run the arena and decide what they can do.</p>
        </div>
        <button onClick={() => { setAdding(true); setError(""); }} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-green"><Plus size={16} /> Add manager</button>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {(["customer", "arena_manager", "super_admin"] as const).map((r) => (
          <div key={r} className={`rounded-2xl p-4 border ${r === "super_admin" ? "bg-pitch text-white border-pitch" : "bg-white border-line"}`}>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${r === "super_admin" ? "text-gold" : "text-ball"}`}>{r === "customer" ? "Part 1" : r === "arena_manager" ? "Part 2" : "Part 3"}</div>
            <div className="font-display uppercase text-xl mt-0.5">{ROLE_LABEL[r]}</div>
            <p className={`text-xs mt-1.5 ${r === "super_admin" ? "text-white/70" : "text-gray-500"}`}>{ROLE_BLURB[r]}</p>
          </div>
        ))}
      </div>

      {list === null ? (
        <div className="flex flex-col gap-3">{[0, 1].map((i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : (
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          {list.map((m) => {
            const self = m._id === me;
            const off = m.isActive === false;
            return (
              <div key={m._id} className={`flex flex-wrap items-center gap-3 px-4 py-3.5 border-b border-line last:border-0 ${off ? "bg-gray-50" : ""}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${m.role === "super_admin" ? "bg-ball text-white" : "bg-pitch text-gold"}`}>{m.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}</div>
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold text-sm">{m.name} {self && <span className="text-[10px] font-bold bg-gold/30 text-[#8a6410] rounded-full px-2 py-0.5 ml-1">you</span>} {off && <span className="text-[10px] font-bold bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 ml-1">switched off</span>}</div>
                  <div className="text-xs text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
                  {m.role !== "super_admin" && <div className="text-[11px] font-semibold text-pitch mt-0.5">{m.arena?.name ? `Arena: ${m.arena.name}` : <span className="text-ball">No arena linked yet</span>}</div>}
                </div>
                {(m.role === "arena_manager" || m.role === "staff") && (
                  <select value={m.arena?._id || ""} onChange={(e) => e.target.value && patch(m, { arenaId: e.target.value }, `${m.name} now works for ${arenas.find((a) => a._id === e.target.value)?.name || "that arena"}.`)} className="rounded-lg px-3 py-2 text-xs font-semibold border border-line bg-white">
                    <option value="">Choose arena…</option>
                    {arenas.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                )}
                <select value={m.role} disabled={self} onChange={(e) => patch(m, { role: e.target.value }, `${m.name} is now ${ROLE_LABEL[e.target.value] || e.target.value}.`)} className="rounded-lg px-3 py-2 text-xs font-semibold border border-line bg-white disabled:opacity-60">
                  <option value="arena_manager">Arena Manager</option>
                  <option value="staff">Arena Staff</option>
                  <option value="super_admin">Backyard Manager</option>
                  <option value="customer">Player (remove access)</option>
                </select>
                <button onClick={() => confirm(`Give ${m.name} a new password?`) && patch(m, { resetPassword: true }, "New password created.")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-pitch px-2 py-2"><KeyRound size={14} /> New password</button>
                <button disabled={self} onClick={() => patch(m, { isActive: off }, off ? `${m.name} can sign in again.` : `${m.name} is switched off.`)} className={`flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-40 ${off ? "text-green bg-green/10" : "text-red-700 bg-red-50"}`}><Power size={14} /> {off ? "Switch on" : "Switch off"}</button>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Add a manager</h2><button onClick={() => setAdding(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-cream flex items-center justify-center"><X size={16} /></button></div>
            {error && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
            <div className="flex flex-col gap-3">
              <label className="text-xs text-gray-500">Full name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field !py-2.5 mt-0.5" /></label>
              <label className="text-xs text-gray-500">Email (they sign in with this)<input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} type="email" className="field !py-2.5 mt-0.5" /></label>
              <label className="text-xs text-gray-500">Phone (optional)<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} type="tel" placeholder="0300 1234567" className="field !py-2.5 mt-0.5" /></label>
              <label className="text-xs text-gray-500">Role
                <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className="field !py-2.5 mt-0.5"><option value="arena_manager">Arena Manager — runs the arena</option><option value="staff">Arena Staff — front desk</option><option value="super_admin">Backyard Manager — controls everything</option></select>
              </label>
              {f.role !== "super_admin" && (
                <label className="text-xs text-gray-500">Arena they run
                  <select value={f.arenaId} onChange={(e) => setF({ ...f, arenaId: e.target.value })} className="field !py-2.5 mt-0.5"><option value="">Choose an arena…</option>{arenas.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}</select>
                  {arenas.length === 0 && <span className="text-[11px] text-ball block mt-1">No arenas yet — add one first under “Arenas”.</span>}
                </label>
              )}
              <label className="text-xs text-gray-500">Password (leave empty to generate one)<input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="field !py-2.5 mt-0.5" /></label>
              <p className="text-[11px] text-gray-500">If this email already belongs to a player, that person is promoted to the role you choose.</p>
            </div>
            <div className="flex justify-end gap-2 mt-5"><button onClick={() => setAdding(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button><button onClick={add} disabled={busy} className="px-5 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">{busy ? "Saving…" : "Add manager"}</button></div>
          </div>
        </div>
      )}

      {creds && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg">{creds.promoted ? "Role updated" : "Sign-in details"}</h2>
            <p className="text-sm text-gray-600 mt-1">{creds.password ? <>Give these to <b>{creds.name}</b>. <b className="text-ball">The password is shown only now</b> — they can change it later with “Forgot password”.</> : <><b>{creds.name}</b> keeps their existing password.</>}</p>
            <div className="mt-4 rounded-xl bg-cream p-4 text-sm flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2"><span><span className="text-gray-500 text-xs block">Sign in at</span>{typeof window !== "undefined" ? window.location.origin : ""}/login</span></div>
              <div className="flex items-center justify-between gap-2"><span><span className="text-gray-500 text-xs block">Email</span>{creds.email}</span><button onClick={() => copy(creds.email)} aria-label="Copy email"><Copy size={15} /></button></div>
              {creds.password && <div className="flex items-center justify-between gap-2"><span><span className="text-gray-500 text-xs block">Password</span><b className="font-mono tracking-wide">{creds.password}</b></span><button onClick={() => copy(creds.password)} aria-label="Copy password"><Copy size={15} /></button></div>}
            </div>
            <button onClick={() => setCreds(null)} className="btn-ball w-full mt-5">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
